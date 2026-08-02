import { Pool } from "pg";

/**
 * Shared PostgreSQL connection pool.
 * DATABASE_URL is validated at startup in index.ts before this module loads.
 */
const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  // Keep idle connections alive but don't hold too many open
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected client error", err.message);
});

export default pool;
