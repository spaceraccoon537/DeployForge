import { pool } from "../config/database.js";

export async function updateDeployment(
  deploymentId: string,
  status: string,
  stage: string,
  log?: string
) {
  await pool.query(
    `
    UPDATE deployments
    SET
      status = COALESCE(NULLIF($1, ''), status),
      stage = COALESCE(NULLIF($2, ''), stage),
      logs = COALESCE(logs, '') || $3
    WHERE id = $4
    `,
    [
      status,
      stage,
      log ? `${log}\n` : "",
      deploymentId
    ]
  );
}