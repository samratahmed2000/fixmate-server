import { ObjectId } from "mongodb";
import { getDatabase } from "../config/db.js";

// Add New Service
export const addServices = async (serviceData) => {
  const serviceCollection = getDatabase().collection("services");
  const result = await serviceCollection.insertOne(serviceData);
  return result;
};

// Get All Services
export const getAllServices = async () => {
  const serviceCollection = getDatabase().collection("services");
  const services = await serviceCollection.find().toArray();
  return services;
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
  delete safeUpdateData.isActive;

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
    $set: { isActive, availability },
  });

  return { ...service, isActive, availability };
};
