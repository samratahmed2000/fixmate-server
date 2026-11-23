import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { getAuth } from "./config/auth.js";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import technicianApplicationRoutes from "./routes/technician-application.routes.js";

const app = express();

const handleBetterAuthRequest = (req, res, next) => {
  try {
    return toNodeHandler(getAuth())(req, res).catch(next);
  } catch (error) {
    return next(error);
  }
};

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use("/api/auth", authRoutes);
app.all("/api/auth/{*path}", handleBetterAuthRequest);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the FixMate Server",
  });
});

app.use("/api/categories", categoryRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/technician-applications", technicianApplicationRoutes);

export default app;
