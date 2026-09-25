import { cloneRepository } from "../git/git.service.js";
import {
  buildDockerImage,
  runDockerContainer
} from "../docker/docker.service.js";
import { checkHealth } from "../health/health.service.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

export interface DeploymentConfig {
  repositoryUrl: string;
  branch?: string;
  projectName: string;
  port: number;
}

export async function deploy(
  config: DeploymentConfig
): Promise<void> {
  const deploymentDirectory = path.join(
    os.tmpdir(),
    `deployforge-${config.projectName}-${Date.now()}`
  );

  const imageName = `deployforge-${config.projectName}`;
  const containerName = `deployforge-${config.projectName}`;

  try {
    console.log("================================");
    console.log("Starting deployment");
    console.log("================================");

    await cloneRepository(
      config.repositoryUrl,
      deploymentDirectory,
      config.branch ?? "main"
    );

    await buildDockerImage(
      deploymentDirectory,
      imageName
    );

    await runDockerContainer(
      imageName,
      containerName,
      config.port
    );

    const healthy = await checkHealth(
      `http://localhost:${config.port}/health`
    );

    if (!healthy) {
      throw new Error("Deployment health check failed.");
    }

    console.log("================================");
    console.log("DEPLOYMENT SUCCESSFUL");
    console.log("================================");
  } finally {
    await fs.rm(deploymentDirectory, {
      recursive: true,
      force: true
    });
  }
}