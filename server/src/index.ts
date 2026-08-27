import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { registerRoutes } from "./routes";
import logger from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { apiVersion } from "./middleware/apiVersion";

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
  // Use console.error here — logger may not be fully initialised yet
  console.error(
    `[startup] Missing required environment variables: ${missingVars.join(", ")}\n` +
      `Copy server/.env.example to server/.env and fill in the values.`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();
const PORT = parseInt(process.env["PORT"] ?? "3001", 10);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Security headers
app.use(helmet());

// CORS — tighten origins in production via CORS_ORIGIN env var
app.use(
  cors({
    origin: process.env["CORS_ORIGIN"] ?? "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Api-Version"],
  })
);

// Request logging
app.use(morgan(process.env["NODE_ENV"] === "production" ? "combined" : "dev"));

// JSON body parsing
app.use(express.json());

// Inject X-Api-Version header on every response
app.use(apiVersion);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** Health-check — used by load balancers and uptime monitors */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

/** Readiness probe — confirms DB connectivity before accepting traffic */
app.get("/ready", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ready", db: "ok" });
  } catch {
    res.status(503).json({ status: "not ready", db: "error" });
  }
});

// Register all API routes
registerRoutes(app);

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

  // Initialise background job queue (Redis-backed or in-process fallback)
  initJobQueue();
});

export default app;
