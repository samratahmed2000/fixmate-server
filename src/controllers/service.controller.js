import {
  addServices,
  getAllServices,
  getServiceDetails,
  updateServiceById,
  deleteServiceById,
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

// Update Service
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const result = await updateServiceById(id, updateData);

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update service",
      error: error.message,
    });
  }
};

// Delete Service
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteServiceById(id);

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
