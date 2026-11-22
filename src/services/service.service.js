import { ObjectId } from "mongodb";
import { getDatabase } from "../config/db.js";

// Add New Service
export const addServices = async (serviceData) => {
  const serviceCollection = getDatabase().collection("services");
  const result = await serviceCollection.insertOne(serviceData);
  return result;
};

// Get All Services
export const getAllServices = async (filters = {}) => {
  const database = getDatabase();
  const serviceCollection = database.collection("services");
  const match = {};

  if (filters.includePending !== "true") {
    match.isActive = { $ne: false };
    match.availability = { $ne: "Not-Active" };
    match.approvalStatus = { $in: ["Approved", "approved"] };
  }

  const search = typeof filters.search === "string" ? filters.search.trim() : "";
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    match.$or = [
      { title: { $regex: escapedSearch, $options: "i" } },
      { category: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const categoryValues =
    typeof filters.category === "string"
      ? filters.category
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

  if (categoryValues.length > 0) {
    const categoryCollection = database.collection("categories");
    const categoryDocuments = await categoryCollection
      .find({
        $or: [
          { slug: { $in: categoryValues } },
          { title: { $in: categoryValues } },
        ],
      })
      .toArray();

    const categoryTitles = [
      ...categoryDocuments.map((category) => category.title),
      ...categoryValues,
    ].filter(Boolean);
    match.category = { $in: categoryTitles };
  }

  const modeValues =
    typeof filters.mode === "string"
      ? filters.mode
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
  if (modeValues.length > 0) {
    match.serviceMode = { $in: modeValues };
  }

  const pipeline = [{ $match: match }];

  if (filters.sort === "price-asc" || filters.sort === "price-desc") {
    pipeline.push({
      $addFields: {
        numericPrice: {
          $convert: {
            input: "$basePrice",
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    });
    pipeline.push({
      $sort: {
        numericPrice: filters.sort === "price-asc" ? 1 : -1,
        _id: -1,
      },
    });
  } else if (filters.sort === "newest") {
    pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
  } else {
    pipeline.push({ $sort: { _id: -1 } });
  }

  const limit =
    typeof filters.limit === "string" ? Number.parseInt(filters.limit, 10) : 0;
  if (Number.isInteger(limit) && limit > 0) {
    pipeline.push({ $limit: Math.min(limit, 50) });
  }

  return serviceCollection.aggregate(pipeline).toArray();
};

// Service Details
export const getServiceDetails = async (id) => {
  const serviceCollection = getDatabase().collection("services");

  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid Service ID format");
  }
  const query = { _id: new ObjectId(id) };
  const result = await serviceCollection.findOne(query);
  return result;
};

export const getFeaturedServices = async (limit = 6) => {
  const serviceCollection = getDatabase().collection("services");
  return serviceCollection
    .aggregate([
      {
        $match: {
          isActive: { $ne: false },
          availability: { $ne: "Not-Active" },
          approvalStatus: { $in: ["Approved", "approved"] },
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: Math.min(Math.max(limit, 1), 50) },
    ])
    .toArray();
};

// Update Service
export const updateServiceById = async (id, technicianId, updateData) => {
  const serviceCollection = getDatabase().collection("services");

  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid Service ID format");
  }

  const safeUpdateData = { ...updateData };
  delete safeUpdateData._id;
  delete safeUpdateData.technicianId;
  delete safeUpdateData.technicianName;

  const query = { _id: new ObjectId(id), technicianId };
  const updateDoc = { $set: safeUpdateData };
  const result = await serviceCollection.updateOne(query, updateDoc);
  return result;
};

// Delete Service
export const deleteServiceById = async (id, technicianId) => {
  const serviceCollection = getDatabase().collection("services");

  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid Service ID format");
  }

  const query = { _id: new ObjectId(id), technicianId };
  const result = await serviceCollection.deleteOne(query);
  return result;
};

export const toggleServiceById = async (id, technicianId) => {
  const serviceCollection = getDatabase().collection("services");
  const query = { _id: new ObjectId(id), technicianId };
  const service = await serviceCollection.findOne(query);

  if (!service) {
    return null;
  }

  const isActive = service.isActive === false;
  const availability = isActive ? "Active" : "Not-Active";
  await serviceCollection.updateOne(query, {
    $set: {
      isActive,
      availability,
      availabilityManuallySet: true,
    },
  });

  return {
    ...service,
    isActive,
    availability,
    availabilityManuallySet: true,
  };
};

export const updateServiceApprovalById = async (id, approvalStatus) => {
  const serviceCollection = getDatabase().collection("services");
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid Service ID format");
  }

  const query = { _id: new ObjectId(id) };
  const isApproved = approvalStatus === "Approved";
  const result = await serviceCollection.updateOne(query, {
    $set: {
      approvalStatus,
      approvedAt: isApproved ? new Date() : null,
      rejectedAt: isApproved ? null : new Date(),
    },
  });
  if (isApproved && result.matchedCount > 0) {
    await serviceCollection.updateOne(
      { ...query, availabilityManuallySet: { $ne: true } },
      { $set: { isActive: true, availability: "Active" } },
    );
  }

  return result;
};
