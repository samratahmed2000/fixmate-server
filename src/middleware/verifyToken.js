import { getAuth } from "../config/auth.js";

const roles = new Set(["customer", "technician", "admin"]);

const sendUnauthorized = (res) =>
  res.status(410).json({
    success: false,
    message: "Un Authorized",
  });

const sendForbidden = (res) =>
  res.status(403).json({
    success: false,
    message: "Forbidden",
  });

const verifyRequestToken = async (req, res) => {
  const authorization = req.get("authorization");
  if (!authorization) {
    sendUnauthorized(res);
    return null;
  }

  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    sendForbidden(res);
    return null;
  }

  const { payload } = await getAuth().api.verifyJWT({
    body: { token: match[1] },
  });

  if (!payload?.sub || !roles.has(payload.role)) {
    sendForbidden(res);
    return null;
  }

  return {
    id: payload.sub,
    role: payload.role,
    name: typeof payload.name === "string" ? payload.name : "",
    email: typeof payload.email === "string" ? payload.email : "",
  };
};

export const verifyToken = async (req, res, next) => {
  try {
    const user = await verifyRequestToken(req, res);
    if (!user) return;

    req.user = user;
    return next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify authorization",
    });
  }
};

const verifyRole = (requiredRole) => async (req, res, next) => {
  try {
    const user = await verifyRequestToken(req, res);
    if (!user) return;
    if (user.role !== requiredRole) return sendForbidden(res);

    req.user = user;
    return next();
  } catch (error) {
    console.error("JWT role verification failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify authorization",
    });
  }
};

export const verifyCustomer = verifyRole("customer");
export const verifyTechnician = verifyRole("technician");
export const verifyAdmin = verifyRole("admin");
