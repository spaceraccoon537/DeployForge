import { pool } from "./database.js";

const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      repository_url TEXT NOT NULL,
      branch VARCHAR(100) DEFAULT 'main',
      status VARCHAR(30) DEFAULT 'IDLE',
      active_deployment_id UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS deployments (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      deployment_number INTEGER,
      commit_hash VARCHAR(100),
      status VARCHAR(30) NOT NULL,
      container_name VARCHAR(150),
      port INTEGER,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      duration INTEGER,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS deployments_project_number_idx
    ON deployments (project_id, deployment_number)
    WHERE deployment_number IS NOT NULL
  `);

  console.log("Database tables initialized.");

  await pool.end();
};

createTables().catch((error) => {
  console.error(error);
  process.exit(1);
});