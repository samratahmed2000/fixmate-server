import {
  getTechnicianApplication,
  getUserRole,
  submitTechnicianApplication,
} from "../services/technician-application.service.js";

export const getTechnicianApplicationController = async (req, res) => {
  try {
    const user = await getTechnicianApplication(req.user.id);
    return res.json({
      success: true,
      data: user?.technicianApplication ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch technician application:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch application status",
    });
  }
};

export const submitTechnicianApplicationController = async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: "Invalid application details",
    });
  }

  const category =
    typeof body.category === "string" ? body.category.trim() : "";
  const serviceArea =
    typeof body.serviceArea === "string" ? body.serviceArea.trim() : "";
  const bio = typeof body.bio === "string" ? body.bio.trim() : "";
  if (
    !category ||
    category.length > 100 ||
    !serviceArea ||
    serviceArea.length > 150 ||
    !bio ||
    bio.length > 1000
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Choose a category and provide a service area and bio within the allowed lengths",
    });
  }

  try {
    const { result, submittedAt } = await submitTechnicianApplication(
      req.user.id,
      { category, serviceArea, bio },
    );
    if (result.matchedCount === 0) {
      const currentRole = await getUserRole(req.user.id);
      if (!currentRole) {
        return res.status(404).json({
          success: false,
          message: "User account not found",
        });
      }
      if (currentRole !== "customer") {
        return res.status(403).json({
          success: false,
          message: "Only customers can apply as technicians",
        });
      }
      return res.status(409).json({
        success: false,
        message: "A technician application has already been submitted",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Technician application submitted for review",
      data: {
        category,
        serviceArea,
        bio,
        status: "pending",
        submittedAt: submittedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to submit technician application:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit technician application",
    });
  }
};
