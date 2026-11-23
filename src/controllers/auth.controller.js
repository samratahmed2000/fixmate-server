import { fromNodeHeaders } from "better-auth/node";
import { getAuth } from "../config/auth.js";

const jwtCookieName = "fixmate.jwt";
const jwtMaxAgeSeconds = 15 * 60;
const jwtCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: jwtMaxAgeSeconds * 1000,
};

const clientOrigin = () =>
  (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/+$/, "");

const getSafeRedirect = (value) => {
  if (typeof value !== "string" || !value.trim()) return "/";

  try {
    const url = new URL(value.trim(), "http://fixmate.internal");
    if (url.origin !== "http://fixmate.internal") return "/";
    if (
      ["/sign-in", "/sign-up"].some(
        (route) =>
          url.pathname === route || url.pathname.startsWith(`${route}/`),
      )
    ) {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
};

const getPostAuthDestination = (role, requestedRedirect) => {
  if (role === "technician") return "/dashboard/technician";
  if (role === "admin") return "/dashboard/admin";
  const redirect = getSafeRedirect(requestedRedirect);
  if (redirect === "/dashboard") return "/dashboard/customer";
  return redirect.startsWith("/dashboard/") ? "/" : redirect;
};

const getSessionAndHeaders = async (req) => {
  const headers = fromNodeHeaders(req.headers);
  const session = await getAuth().api.getSession({ headers });
  return { headers, session };
};

const setJwtCookie = (res, token) => {
  res.cookie(jwtCookieName, token, jwtCookieOptions);
};

const clearJwtCookie = (res) => {
  res.clearCookie(jwtCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
};

const issueJwtCookie = async (req, res) => {
  const { headers, session } = await getSessionAndHeaders(req);
  if (!session?.user) {
    return res.status(410).json({
      success: false,
      message: "Un Authorized",
    });
  }

  const { token } = await getAuth().api.getToken({ headers });
  const { payload } = await getAuth().api.verifyJWT({
    body: { token },
  });
  if (
    payload?.sub !== session.user.id ||
    payload.role !== session.user.role ||
    payload.iss !== "fixmate" ||
    payload.aud !== "fixmate-api"
  ) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }

  setJwtCookie(res, token);
  return { session };
};

export const getAuthSessionController = async (req, res) => {
  try {
    const result = await issueJwtCookie(req, res);
    if (res.headersSent) return;
    return res.json({
      success: true,
      data: { session: result.session },
    });
  } catch (error) {
    console.error("Failed to load authentication session:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load authentication session",
    });
  }
};

export const createAuthTokenController = async (req, res) => {
  try {
    await issueJwtCookie(req, res);
    if (res.headersSent) return;
    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to issue authentication token:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to issue authentication token",
    });
  }
};

export const clearAuthTokenController = (_req, res) => {
  clearJwtCookie(res);
  return res.json({ success: true });
};

export const completeAuthController = async (req, res) => {
  try {
    const { session } = await getSessionAndHeaders(req);
    const requestedRedirect = getSafeRedirect(req.query.redirect);
    if (!session?.user) {
      const signInPath =
        requestedRedirect === "/"
          ? "/sign-in"
          : `/sign-in?redirect=${encodeURIComponent(requestedRedirect)}`;
      return res.redirect(302, `${clientOrigin()}${signInPath}`);
    }

    await issueJwtCookie(req, res);
    if (res.headersSent) return;

    const destination = getPostAuthDestination(
      session.user.role,
      requestedRedirect,
    );
    return res.redirect(302, `${clientOrigin()}${destination}`);
  } catch (error) {
    console.error("Failed to complete authentication:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to complete authentication",
    });
  }
};
