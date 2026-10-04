import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

import projectRoutes from "./routes/project.routes.js";
import deploymentRoutes from "./routes/deployment.routes.js";

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "deployforge-api"
  });
});

app.use("/api/projects", projectRoutes);
app.use("/api/deployments", deploymentRoutes);

app.listen(PORT, () => {
  console.log(`DeployForge API running on port ${PORT}`);
});