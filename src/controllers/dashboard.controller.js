import {
  getDashboardHistory,
  getDashboardOverview,
} from "../services/dashboard.service.js";

export const getDashboardOverviewController = async (req, res) => {
  try {
    const data = await getDashboardOverview(req.user.role, req.user.id);
    return res.json({
      success: true,
      message: "Dashboard overview fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard overview:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard overview",
    });
  }
};

export const getDashboardHistoryController = async (req, res) => {
  try {
    const data = await getDashboardHistory(req.user.role, req.user.id);
    return res.json({
      success: true,
      message: "Dashboard history fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard history",
    });
  }
};
