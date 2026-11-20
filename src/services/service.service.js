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
