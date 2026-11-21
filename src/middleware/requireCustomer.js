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

export const requireCustomer = async (req, res, next) => {
  try {
    const session = await getAuth().api.getSession({
      headers: getRequestHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to access bookings",
      });
    }

    if (session.user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can access bookings",
      });
    }

    req.user = {
      id: session.user.id,
      role: session.user.role,
      name: session.user.name,
      email: session.user.email,
    };

    next();
  } catch (error) {
    console.error("Booking Authentication Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify your sign-in",
    });
  }
};
