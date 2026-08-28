import "dotenv/config";
import "express-async-errors";
import express, { Request, Response } from "express";
import { applyMiddleware } from "./middleware";
import { registerRoutes } from "./routes";
import logger from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { pool, query } from "./db/pool";
import { initJobQueue } from "./jobs";

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

const REQUIRED_ENV_VARS = [
  "JWT_SECRET",
  "DATABASE_URL",
  "ESCROW_CONTRACT_ADDRESS",
  "ENCRYPTION_KEY",
  "STELLAR_SERVER_SECRET",
  "PLATFORM_TREASURY_USER_ID",
] as const;

const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.error(
    `[startup] Missing required environment variables: ${missingVars.join(", ")}\n` +
      `Copy server/.env.example to server/.env and fill in the values.`
  );
  if (process.env["NODE_ENV"] !== "test") {
    process.exit(1);
  }
}

const encryptionKey = process.env["ENCRYPTION_KEY"];
if (encryptionKey && !/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
  console.error(
    "[startup] ENCRYPTION_KEY must be a 64-character hex string"
  );
  if (process.env["NODE_ENV"] !== "test") {
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Database connection test on startup
// ---------------------------------------------------------------------------

const testQueryText = "SELECT 1";
pool.query(testQueryText)
  .then(() => {
    logger.info({ query: testQueryText }, "Database connection validated");
  })
  .catch((err) => {
    console.error(
      `[startup] Database connection failed: ${err.message}\n` +
        "Verify DATABASE_URL is correct and PostgreSQL is reachable.\n" +
        "Server exiting."
    );
    if (process.env["NODE_ENV"] !== "test") {
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();
const PORT = parseInt(process.env["PORT"] ?? "3001", 10);

applyMiddleware(app);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/ready", async (_req: Request, res: Response) => {
  try {
    await query("SELECT 1");
    res.status(200).json({ status: "ready", db: "ok" });
  } catch {
    res.status(503).json({ status: "not ready", db: "error" });
  }
});

registerRoutes(app);

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ---------------------------------------------------------------------------
// Global error handler  (must be last)
// ---------------------------------------------------------------------------

app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  logger.info(
    { port: PORT, env: process.env["NODE_ENV"] ?? "development" },
    "AirFlex API started"
  );

  initJobQueue();
});

export default app;
