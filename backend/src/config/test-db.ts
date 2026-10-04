import { pool } from "./database.js";

try {
  const result = await pool.query("SELECT NOW()");

  console.log("Database connected successfully.");
  console.log(result.rows[0]);

  await pool.end();
} catch (error) {
  console.error("Database connection failed.");
  console.error(error);

  process.exit(1);
}