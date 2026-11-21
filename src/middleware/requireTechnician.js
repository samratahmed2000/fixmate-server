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

export const requireTechnician = async (req, res, next) => {
  try {
    const session = await getAuth().api.getSession({
      headers: getRequestHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to manage services",
      });
    }

    if (session.user.role !== "technician") {
      return res.status(403).json({
        success: false,
        message: "Only technicians can manage services",
      });
    }

    req.user = {
      id: session.user.id,
      role: session.user.role,
      name: session.user.name,
    };

    next();
  } catch (error) {
    console.error("Technician Authentication Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify your sign-in",
    });
  }
};
