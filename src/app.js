import express from "express";
import cors from "cors";
import categoryRoutes from "./routes/category.routes.js";
import serviceRoutes from "./routes/service.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the FixMate Server",
  });
});

app.use("/api/categories", categoryRoutes);
app.use("/api/services", serviceRoutes);

export default app;
