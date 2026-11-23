import {
  addServices,
  getAllServices,
  getServiceDetails,
  getFeaturedServices as getFeaturedServicesFromDatabase,
  updateServiceById,
  deleteServiceById,
  toggleServiceById,
  updateServiceApprovalById,
} from "../services/service.service.js";
import { categoryExists } from "../services/category.service.js";

const isValidServiceId = (id) => /^[a-f\d]{24}$/i.test(id);

const serviceModes = new Set(["Home Visit", "Shop Drop Off"]);
const durationPattern = /^([1-9]\d*)\s+(minutes?|hours?|days?)$/i;

const readString = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Validates and whitelists technician-editable service fields.
 * Identity, approval and availability fields are decided by the server.
 * `partial` is used for updates so a client can send only changed fields.
 */
const validateServiceInput = (body, { partial = false } = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Please provide valid service details" };
  }

  const data = {};
  const invalidFields = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
  const shouldValidate = (key) => !partial || has(key);

  if (shouldValidate("title")) {
    const title = readString(body.title);
    if (title.length < 5 || title.length > 40) invalidFields.push("title");
    else data.title = title;
  }

  if (shouldValidate("category")) {
    const category = readString(body.category);
    if (!category || category.length > 60) invalidFields.push("category");
    else data.category = category;
  }

  if (shouldValidate("description")) {
    const description = readString(body.description);
    if (description.length < 20 || description.length > 2000) {
      invalidFields.push("description");
    } else {
      data.description = description;
    }
  }

  if (shouldValidate("basePrice")) {
    const rawPrice = body.basePrice;
    const price =
      typeof rawPrice === "number" ? rawPrice : Number(readString(rawPrice));
    if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) {
      invalidFields.push("basePrice");
    } else {
      data.basePrice = String(price);
    }
  }

  if (shouldValidate("estimatedDuration")) {
    const estimatedDuration = readString(body.estimatedDuration);
    const match = estimatedDuration.match(durationPattern);
    if (!match) invalidFields.push("estimatedDuration");
    else data.estimatedDuration = `${Number(match[1])} ${match[2].toLowerCase()}`;
  }

  if (shouldValidate("serviceMode")) {
    const serviceMode = readString(body.serviceMode);
    if (!serviceModes.has(serviceMode)) invalidFields.push("serviceMode");
    else data.serviceMode = serviceMode;
  }

  if (shouldValidate("serviceArea")) {
    const serviceArea = readString(body.serviceArea);
    if (!serviceArea || serviceArea.length > 40) {
      invalidFields.push("serviceArea");
    } else {
      data.serviceArea = serviceArea;
    }
  }

  if (shouldValidate("serviceImage")) {
    const serviceImage = readString(body.serviceImage);
    if (serviceImage.length > 2048 || !/^https?:\/\/\S+$/.test(serviceImage)) {
      invalidFields.push("serviceImage");
    } else {
      data.serviceImage = serviceImage;
    }
  }

  if (invalidFields.length > 0) {
    return { error: `Invalid service fields: ${invalidFields.join(", ")}` };
  }

  if (partial && Object.keys(data).length === 0) {
    return { error: "No valid service fields to update" };
  }

  return { data };
};

const rejectInvalidCategory = async (category, res) => {
  if (await categoryExists(category)) return false;

  res.status(400).json({
    success: false,
    message: "Choose a valid service category",
  });
  return true;
};

// Add New Service
export const createService = async (req, res) => {
  try {
    const { data, error } = validateServiceInput(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    if (await rejectInvalidCategory(data.category, res)) return;

    const serviceData = {
      ...data,
      technicianId: req.user.id,
      technicianName: req.user.name,
      technicianEmail: req.user.email,
      isActive: true,
      availability: "Active",
      approvalStatus: "Pending",
      createdAt: new Date(),
    };
    const result = await addServices(serviceData);

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Create Service Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create service",
    });
  }
};

// All Services
export const getServices = async (req, res) => {
  try {
    const services = await getAllServices({
      search: req.query.search,
      category: req.query.category,
      mode: req.query.mode,
      sort: req.query.sort,
      limit: req.query.limit,
      includePending: req.query.includePending,
      technicianId:
        req.query.includePending === "true" ? req.user.id : undefined,
    });

    res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      data: services,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch services",
    });
  }
};

export const getFeaturedServices = async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit || "6", 10);
    const services = await getFeaturedServicesFromDatabase(
      Number.isInteger(limit) ? limit : 6,
    );

    res.status(200).json({
      success: true,
      message: "Featured services fetched successfully",
      data: services,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured services",
    });
  }
};

// Service Details
export const getServiceDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getServiceDetails(id);

    if (
      !result ||
      result.isActive === false ||
      result.availability === "Not-Active" ||
      !["Approved", "approved"].includes(result.approvalStatus)
    ) {
      return res.status(404).send({ message: "Service not found" });
    }

    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch service details",
      error: error.message,
    });
  }
};

// Update Service
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidServiceId(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid service ID is required",
      });
    }

    const { data, error } = validateServiceInput(req.body, { partial: true });
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    if (data.category && (await rejectInvalidCategory(data.category, res))) {
      return;
    }

    const updateData = {
      ...data,
      approvalStatus: "Pending",
      updatedAt: new Date(),
    };
    const result = await updateServiceById(id, req.user.id, updateData);

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Update Service Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update service",
    });
  }
};

// Delete Service
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidServiceId(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid service ID is required",
      });
    }

    const result = await deleteServiceById(id, req.user.id);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete service",
      error: error.message,
    });
  }
};

export const updateServiceApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const status =
      req.body?.approvalStatus === "Rejected" ? "Rejected" : "Approved";

    if (!isValidServiceId(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid service ID is required",
      });
    }

    const result = await updateServiceApprovalById(id, status);
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Service ${status.toLowerCase()} successfully`,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update service approval",
    });
  }
};

export const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidServiceId(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid service ID is required",
      });
    }

    const service = await toggleServiceById(id, req.user.id);

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Service turned ${service.isActive ? "on" : "off"} successfully`,
      data: service,
    });
  } catch (error) {
    console.error("Toggle Service Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle service status",
    });
  }
};
