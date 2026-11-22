import {
  addServices,
  getAllServices,
  getServiceDetails,
  getFeaturedServices as getFeaturedServicesFromDatabase,
  updateServiceById,
  deleteServiceById,
  toggleServiceById,
} from "../services/service.service.js";

const isValidServiceId = (id) => /^[a-f\d]{24}$/i.test(id);

// Add New Service
export const createService = async (req, res) => {
  try {
    const serviceData = {
      ...(req.body || {}),
      technicianId: req.user.id,
      technicianName: req.user.name,
      isActive: true,
      createdAt: new Date(),
    };
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
    const services = await getAllServices({
      search: req.query.search,
      category: req.query.category,
      mode: req.query.mode,
      sort: req.query.sort,
      limit: req.query.limit,
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
    if (!isValidServiceId(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid service ID is required",
      });
    }

    const updateData = req.body || {};
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
