import { Router } from "express";
import { pool } from "../config/database.js";
import { randomUUID } from "crypto";
import { startContainer, stopContainer } from "../services/docker.service.js";

const router = Router();

async function waitForHealth(port: number, retries = 10): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`http://localhost:${port}/health`, {
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) return true;
    } catch {
      // The container may need time to start.
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return false;
}

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT d.*, p.name AS project_name, p.active_deployment_id
      FROM deployments d
      JOIN projects p ON p.id = d.project_id
      ORDER BY d.created_at DESC
      LIMIT 100
      `
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch deployments" });
  }
});

router.post("/:projectId/deploy", async (req, res) => {
  const client = await pool.connect();

  try {
    const { projectId } = req.params;

    await client.query("BEGIN");

    const projectResult = await client.query(
      `
      SELECT *
      FROM projects
      WHERE id = $1
      FOR UPDATE
      `,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Project not found"
      });
    }

    const project = projectResult.rows[0];

    const deploymentId = randomUUID();

    const numberResult = await client.query(
      `
      SELECT COALESCE(MAX(deployment_number), 0) + 1 AS next_number
      FROM deployments
      WHERE project_id = $1
      `,
      [projectId]
    );

    const deploymentNumber = Number(numberResult.rows[0].next_number);
    const port = 3000 + deploymentNumber;

    await client.query(
      `
      INSERT INTO deployments (
        id,
        project_id,
        deployment_number,
        port,
        status,
        started_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `,
      [
        deploymentId,
        projectId,
        deploymentNumber,
        port,
        "QUEUED"
      ]
    );

    await client.query("COMMIT");

    return res.status(202).json({
      message: "Deployment queued",
      deploymentId,
      deploymentNumber,
      port,
      project: project.name
    });

  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error(error);

    return res.status(500).json({
      message: "Failed to create deployment"
    });
  } finally {
    client.release();
  }
});

router.post("/:deploymentId/rollback", async (req, res) => {
  const client = await pool.connect();
  let transactionOpen = false;
  let rollbackContainer: string | undefined;

  try {
    const { deploymentId } = req.params;
    const deploymentResult = await client.query(
      `SELECT project_id, deployment_number FROM deployments WHERE id = $1`,
      [deploymentId]
    );

    if (deploymentResult.rows.length === 0) {
      return res.status(404).json({ message: "Deployment not found" });
    }

    const projectId = deploymentResult.rows[0].project_id;
    await client.query("BEGIN");
    transactionOpen = true;
    const projectResult = await client.query(
      `SELECT active_deployment_id FROM projects WHERE id = $1 FOR UPDATE`,
      [projectId]
    );
    const currentResult = await client.query(
      `SELECT * FROM deployments WHERE id = $1 FOR UPDATE`,
      [deploymentId]
    );

    if (projectResult.rows[0]?.active_deployment_id !== deploymentId) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(409).json({ message: "Only the live deployment can be rolled back" });
    }

    const current = currentResult.rows[0];
    if (current.status !== "SUCCESS") {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(409).json({ message: "The live deployment is not in a rollbackable state" });
    }

    const targetResult = await client.query(
      `
      SELECT *
      FROM deployments
      WHERE project_id = $1
        AND deployment_number < $2
        AND status = 'STOPPED'
        AND container_name IS NOT NULL
        AND port IS NOT NULL
      ORDER BY deployment_number DESC
      LIMIT 1
      FOR UPDATE
      `,
      [projectId, current.deployment_number]
    );
    const target = targetResult.rows[0];

    if (!target) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(409).json({ message: "No previous successful deployment is available" });
    }

    rollbackContainer = target.container_name;
    await startContainer(target.container_name);
    if (!(await waitForHealth(Number(target.port)))) {
      await stopContainer(target.container_name).catch(() => undefined);
      rollbackContainer = undefined;
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(503).json({ message: "Previous deployment failed its health check" });
    }

    await client.query(
      `UPDATE projects SET active_deployment_id = $1, status = 'LIVE', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [target.id, projectId]
    );
    await client.query(
      `UPDATE deployments SET status = 'SUCCESS', stage = 'LIVE', logs = COALESCE(logs, '') || 'Restored by rollback and is now live.\n' WHERE id = $1`,
      [target.id]
    );
    await client.query(
      `UPDATE deployments SET status = 'STOPPING', stage = 'STOPPING' WHERE id = $1`,
      [deploymentId]
    );
    await client.query("COMMIT");
    transactionOpen = false;
    rollbackContainer = undefined;

    try {
      await stopContainer(current.container_name);
      await pool.query(
        `UPDATE deployments SET status = 'STOPPED', stage = 'STOPPED' WHERE id = $1`,
        [deploymentId]
      );
    } catch (error) {
      console.error(`Could not stop rolled-back container ${current.container_name}:`, error);
    }

    return res.json({
      message: "Rollback completed",
      deploymentId: target.id,
      deploymentNumber: target.deployment_number,
      status: "LIVE"
    });
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => undefined);
    if (rollbackContainer) await stopContainer(rollbackContainer).catch(() => undefined);
    console.error(error);
    return res.status(500).json({ message: "Rollback failed" });
  } finally {
    client.release();
  }
});

router.get("/:deploymentId", async (req, res) => {
  try {
    const { deploymentId } = req.params;

    const result = await pool.query(
      `
      SELECT
        d.*,
        p.name AS project_name,
        p.active_deployment_id
      FROM deployments d
      JOIN projects p
        ON d.project_id = p.id
      WHERE d.id = $1
      `,
      [deploymentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Deployment not found"
      });
    }

    return res.json(result.rows[0]);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch deployment"
    });
  }
});

export default router;