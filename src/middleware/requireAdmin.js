import { getAuth } from "../config/auth.js";

const getRequestHeaders = (requestHeaders) => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(requestHeaders)) {
    if (typeof value === "string") {
      headers.set(name, value);
    } else if (Array.isArray(value)) {
      headers.set(name, value.join(", "));
    }
  }
  return headers;
};

export const requireAdmin = async (req, res, next) => {
  try {
    const session = await getAuth().api.getSession({
      headers: getRequestHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Please sign in as an admin",
      });
    }

    if (session.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can approve services",
      });
    }

    next();
  } catch (error) {
    console.error("Admin Authentication Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify your sign-in",
    });
  }
};
