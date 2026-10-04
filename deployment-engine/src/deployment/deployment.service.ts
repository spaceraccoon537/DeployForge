import { cloneRepository } from "../git/git.service.js";
import {
  buildDockerImage,
  runDockerContainer,
  removeContainer
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
  deploymentNumber: number;
}

export async function deploy(
  config: DeploymentConfig
): Promise<void> {
  const deploymentDirectory = path.join(
    os.tmpdir(),
    `deployforge-${config.projectName}-${Date.now()}`
  );

  const projectSlug = config.projectName
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "") || "deployforge-app";
  const imageName = `deployforge-${projectSlug}:deploy-${config.deploymentNumber}`;
  const containerName = `deployforge-${projectSlug}-deploy-${config.deploymentNumber}`;
  let containerStarted = false;

  try {
    console.log("STAGE:CLONING");
    console.log("================================");
    console.log("Starting deployment");
    console.log("================================");

    await cloneRepository(
      config.repositoryUrl,
      deploymentDirectory,
      config.branch ?? "main"
    );

    console.log("STAGE:BUILDING");
    await buildDockerImage(
      deploymentDirectory,
      imageName
    );

    console.log("STAGE:DEPLOYING");
    await runDockerContainer(
      imageName,
      containerName,
      config.port
    );

    containerStarted = true;
    console.log("STAGE:HEALTH_CHECK");
    const healthy = await checkHealth(
      `http://localhost:${config.port}/health`
    );

    if (!healthy) {
      throw new Error("Deployment health check failed.");
    }

    console.log("================================");
    console.log("DEPLOYMENT SUCCESSFUL");
    console.log("================================");
  } catch (error) {
    if (containerStarted) {
      await removeContainer(containerName).catch((cleanupError) => {
        console.error("Failed deployment container cleanup:", cleanupError);
      });
    }
    throw error;
  } finally {
    await fs.rm(deploymentDirectory, {
      recursive: true,
      force: true
    });
  }
}