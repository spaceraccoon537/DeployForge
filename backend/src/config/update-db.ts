import { pool } from "./database.js";

const updateDatabase = async () => {
  await pool.query(`
    ALTER TABLE deployments
    ADD COLUMN IF NOT EXISTS deployment_number INTEGER
  `);

  await pool.query(`
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS active_deployment_id UUID
  `);

  await pool.query(`
    UPDATE deployments AS deployment
    SET deployment_number = numbered.number
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY project_id
               ORDER BY created_at ASC, id ASC
             ) AS number
      FROM deployments
      WHERE deployment_number IS NULL
    ) AS numbered
    WHERE deployment.id = numbered.id
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS deployments_project_number_idx
    ON deployments (project_id, deployment_number)
    WHERE deployment_number IS NOT NULL
  `);

  await pool.query(`
    ALTER TABLE deployments
    ADD COLUMN IF NOT EXISTS stage VARCHAR(50)
  `);

  await pool.query(`
    ALTER TABLE deployments
    ADD COLUMN IF NOT EXISTS logs TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE deployments
    ADD COLUMN IF NOT EXISTS container_name VARCHAR(150)
  `);

  await pool.query(`
    ALTER TABLE deployments
    ADD COLUMN IF NOT EXISTS port INTEGER
  `);

  console.log("Database updated successfully.");

  await pool.end();
};

updateDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});