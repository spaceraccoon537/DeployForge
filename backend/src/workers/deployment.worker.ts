import { pool } from "../config/database.js";
import { updateDeployment } from "../services/deployment-log.service.js";
import { execFile } from "node:child_process";
import path from "node:path";
import { stopContainer } from "../services/docker.service.js";

let isProcessing = false;

function runDeploymentEngine(
  repositoryUrl: string,
  branch: string,
  projectName: string,
  port: number,
  deploymentNumber: number,
  deploymentId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const deploymentEnginePath = path.resolve(
      process.cwd(),
      "../deployment-engine"
    );

    const tsxCliPath = path.join(
      deploymentEnginePath,
      "node_modules",
      "tsx",
      "dist",
      "cli.mjs"
    );
    let stageUpdates = Promise.resolve();
    let outputBuffer = "";

    const processOutputLine = (line: string) => {
      const normalizedLine = line.trim();
      if (!normalizedLine) return;

      const commitHash = normalizedLine.match(/^COMMIT:([a-f0-9]{40,64})$/i)?.[1];
      if (commitHash) {
        stageUpdates = stageUpdates.then(() =>
          pool.query(
            `UPDATE deployments SET commit_hash = $1 WHERE id = $2`,
            [commitHash, deploymentId]
          ).then(() => undefined)
        );
        return;
      }

      const stage = normalizedLine.match(/^STAGE:(CLONING|BUILDING|DEPLOYING|HEALTH_CHECK)$/)?.[1];
      if (stage) {
        const statusByStage: Record<string, [string, string]> = {
          CLONING: ["CLONING", "CLONE"],
          BUILDING: ["BUILDING", "BUILD"],
          DEPLOYING: ["DEPLOYING", "DEPLOY"],
          HEALTH_CHECK: ["HEALTH_CHECK", "HEALTH_CHECK"]
        };
        const [status, stageName] = statusByStage[stage];
        stageUpdates = stageUpdates.then(() =>
          updateDeployment(deploymentId, status, stageName)
        );
        return;
      }

      const timestamp = new Date().toISOString().slice(11, 19);
      stageUpdates = stageUpdates.then(() =>
        updateDeployment(deploymentId, "", "", `[${timestamp}] ${normalizedLine}`)
      );
    };

    const child = execFile(process.execPath, [
      tsxCliPath,
      "src/index.ts",
      repositoryUrl,
      branch,
      projectName,
      String(port),
      String(deploymentNumber)
    ], {
      cwd: deploymentEnginePath,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024
    });

    const onOutput = (data: Buffer | string) => {
      const output = data.toString();
      console.log(`[ENGINE] ${output.trim()}`);

      outputBuffer += output;
      const lines = outputBuffer.split(/\r?\n/);
      outputBuffer = lines.pop() ?? "";
      for (const line of lines) {
        processOutputLine(line);
      }
    };

    child.stdout?.on("data", onOutput);
    child.stderr?.on("data", onOutput);

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (outputBuffer.trim()) processOutputLine(outputBuffer);
      stageUpdates.then(() => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Deployment engine exited with code ${code}`));
        }
      }, reject);
    });
  });
}

async function processNextDeployment() {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    const result = await pool.query(`
      SELECT
        d.*,
        p.name AS project_name,
        p.repository_url,
        p.branch
      FROM deployments d
      JOIN projects p
        ON d.project_id = p.id
      WHERE d.status = 'QUEUED'
      ORDER BY d.created_at ASC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return;
    }

    const deployment = result.rows[0];
    const deploymentNumber = Number(deployment.deployment_number);
    const port = Number(deployment.port ?? 3000 + deploymentNumber);
    const containerName = containerNameFor(deployment.project_name, deploymentNumber);

    await pool.query(
      `
      UPDATE deployments
      SET port = $1, container_name = $2
      WHERE id = $3
      `,
      [port, containerName, deployment.id]
    );
    deployment.port = port;
    deployment.container_name = containerName;
    deployment.deployment_number = deploymentNumber;

    console.log(`Processing deployment ${deployment.id}`);

    await processDeployment(deployment);
  } catch (error) {
    console.error("Deployment worker error:", error);
  } finally {
    isProcessing = false;
  }
}

async function processDeployment(deployment: any) {
  const deploymentNumber = Number(deployment.deployment_number);
  const port = Number(deployment.port);
  const containerName = containerNameFor(deployment.project_name, deploymentNumber);
  try {
    await updateDeployment(
      deployment.id,
      "CLONING",
      "CLONE",
      "Starting repository clone..."
    );

    console.log("Cloning repository...");

    await runDeploymentEngine(
      deployment.repository_url,
      deployment.branch || "main",
      deployment.project_name || "deployforge-app",
      port,
      deploymentNumber,
      deployment.id
    );

    await promoteDeployment(deployment);

    console.log(`Deployment ${deployment.id} successful.`);
  } catch (error) {
    console.error(error);
    await stopContainer(containerName).catch(() => undefined);

    await updateDeployment(
      deployment.id,
      "FAILED",
      "ERROR",
      `Deployment failed: ${error instanceof Error ? error.message : String(error)}`
    );

    await pool.query(
      `
      UPDATE deployments
      SET completed_at = CURRENT_TIMESTAMP,
          duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER
      WHERE id = $1
      `,
      [deployment.id]
    );
  }
}

function containerNameFor(projectName: string, deploymentNumber: number): string {
  const projectSlug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "") || "deployforge-app";
  return `deployforge-${projectSlug}-deploy-${deploymentNumber}`;
}

async function promoteDeployment(deployment: any): Promise<void> {
  const client = await pool.connect();
  let previousContainerName: string | undefined;
  let previousDeploymentId: string | undefined;

  try {
    await client.query("BEGIN");
    const projectResult = await client.query(
      `SELECT active_deployment_id FROM projects WHERE id = $1 FOR UPDATE`,
      [deployment.project_id]
    );
    previousDeploymentId = projectResult.rows[0]?.active_deployment_id;

    if (previousDeploymentId && previousDeploymentId !== deployment.id) {
      const previousResult = await client.query(
        `SELECT container_name FROM deployments WHERE id = $1`,
        [previousDeploymentId]
      );
      previousContainerName = previousResult.rows[0]?.container_name;
    }

    await client.query(
      `
      UPDATE projects
      SET active_deployment_id = $1, status = 'LIVE', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [deployment.id, deployment.project_id]
    );
    await client.query(
      `
      UPDATE deployments
      SET status = 'SUCCESS', stage = 'LIVE',
          logs = COALESCE(logs, '') || 'Deployment passed health check and is live.\n',
          completed_at = CURRENT_TIMESTAMP,
          duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER
      WHERE id = $1
      `,
      [deployment.id]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (previousContainerName) {
    try {
      await stopContainer(previousContainerName);
      await pool.query(
        `UPDATE deployments SET status = 'STOPPED', stage = 'STOPPED' WHERE id = $1`,
        [previousDeploymentId]
      );
    } catch (error) {
      console.error(`Could not stop previous container ${previousContainerName}:`, error);
    }
  }
}

setInterval(processNextDeployment, 3000);

console.log("DeployForge deployment worker started.");