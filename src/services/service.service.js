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
