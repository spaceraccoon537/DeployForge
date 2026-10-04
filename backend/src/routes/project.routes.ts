import { Router } from "express";
import { pool } from "../config/database.js";
import { randomUUID } from "crypto";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const {
      name,
      repositoryUrl,
      branch = "main"
    } = req.body;

    if (!name || !repositoryUrl) {
      return res.status(400).json({
        message: "name and repositoryUrl are required"
      });
    }

    const id = randomUUID();

    const result = await pool.query(
      `
      INSERT INTO projects (
        id,
        name,
        repository_url,
        branch
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        id,
        name,
        repositoryUrl,
        branch
      ]
    );

    return res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to create project"
    });
  }
});

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM projects
      ORDER BY created_at DESC
      `
    );

    return res.json(result.rows);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch projects"
    });
  }
});

router.get("/:projectId/deployments", async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectResult = await pool.query(
      `SELECT id FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM deployments
      WHERE project_id = $1
      ORDER BY deployment_number DESC NULLS LAST, created_at DESC
      `,
      [projectId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch deployments" });
  }
});

router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      `SELECT * FROM projects WHERE id = $1`,
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch project" });
  }
});

export default router;