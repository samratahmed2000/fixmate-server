import { addServices } from "../services/service.service.js";

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
