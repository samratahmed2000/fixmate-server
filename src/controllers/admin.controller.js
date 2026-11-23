import { ObjectId } from "mongodb";
import {
  approveTechnicianApplication,
  getAdminServices,
  getAdminUsers,
  normalizeApprovalStatus,
  updateAdminServiceApproval,
} from "../services/admin.service.js";

const approvalStatuses = new Set(["all", "pending", "approved", "rejected"]);

const toIsoString = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const serializeTechnicianApplication = (application) => {
  if (!application || typeof application !== "object") return null;
  return {
    category:
      typeof application.category === "string" ? application.category : "",
    serviceArea:
      typeof application.serviceArea === "string" ? application.serviceArea : "",
    bio: typeof application.bio === "string" ? application.bio : "",
    status: application.status === "approved" ? "approved" : "pending",
    submittedAt: toIsoString(application.submittedAt),
  };
};

export const getAdminServicesController = async (req, res) => {
  const requestedStatus = req.query.status || "pending";
  if (
    typeof requestedStatus !== "string" ||
    !approvalStatuses.has(requestedStatus)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid service approval status filter",
    });
  }

  try {
    const services = await getAdminServices(requestedStatus);
    return res.json({
      success: true,
      message: "Admin services fetched successfully",
      data: services.map((service) => ({
        ...service,
        _id: service._id.toString(),
        approvalStatus: normalizeApprovalStatus(service.approvalStatus),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch admin services:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch services",
    });
  }
};

export const updateAdminServiceController = async (req, res) => {
  const { id, approvalStatus } = req.body || {};
  if (
    typeof id !== "string" ||
    !ObjectId.isValid(id) ||
    !["Approved", "Rejected"].includes(approvalStatus)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid approval request",
    });
  }

  try {
    const result = await updateAdminServiceApproval(id, approvalStatus);
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    return res.json({
      success: true,
      message: `Service ${approvalStatus.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error("Failed to update admin service approval:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update service approval",
    });
  }
};

export const getAdminUsersController = async (_req, res) => {
  try {
    const users = await getAdminUsers();
    return res.json({
      success: true,
      message: "Users fetched successfully",
      data: users.map((user) => ({
        id: user._id.toString(),
        name: typeof user.name === "string" ? user.name : null,
        email: typeof user.email === "string" ? user.email : "",
        image: typeof user.image === "string" ? user.image : null,
        role:
          user.role === "technician" || user.role === "admin"
            ? user.role
            : "customer",
        createdAt: toIsoString(user.createdAt),
        technicianApplication: serializeTechnicianApplication(
          user.technicianApplication,
        ),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch admin users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

export const approveTechnicianApplicationController = async (req, res) => {
  const { id } = req.body || {};
  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  try {
    const result = await approveTechnicianApplication(id);
    if (result.matchedCount === 0) {
      return res.status(409).json({
        success: false,
        message: "No pending technician application found for this customer",
      });
    }

    return res.json({
      success: true,
      message: "Customer approved as a technician",
    });
  } catch (error) {
    console.error("Failed to approve technician application:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve technician application",
    });
  }
};
