import { addServices, getAllServices } from "../services/service.service.js";

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
