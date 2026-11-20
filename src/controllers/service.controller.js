import {
  addServices,
  getAllServices,
  getServiceDetails,
} from "../services/service.service.js";

// Add New Service
export const createService = async (req, res) => {
  try {
    const serviceData = req.body;
    const result = await addServices(serviceData);

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create service",
    });
  }
};

// All Services
export const getServices = async (req, res) => {
  try {
    const services = await getAllServices();

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

// Service Details
export const getServiceDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getServiceDetails(id);

    if (!result) {
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
