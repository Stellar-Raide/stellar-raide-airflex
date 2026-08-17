import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import tradesRouter from "./routes/trades";
import authRouter from "./routes/auth";
import walletRouter from "./routes/wallet";
import profileRouter from "./routes/profile";
import eventsRouter from "./routes/events";
import logger from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

const REQUIRED_ENV_VARS = [
  "JWT_SECRET",
  "DATABASE_URL",
  "ESCROW_CONTRACT_ADDRESS",
  "ENCRYPTION_KEY",
  "STELLAR_SERVER_SECRET",
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
  })
);

// Request logging
app.use(morgan(process.env["NODE_ENV"] === "production" ? "combined" : "dev"));

// JSON body parsing
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** Health-check — used by load balancers and uptime monitors */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes (OTP signup + verification)
app.use("/api/auth", authRouter);

// Trade marketplace routes
app.use("/api/trades", tradesRouter);

// Wallet routes (Stellar public key + balance)
app.use("/api/wallet", walletRouter);

// Profile routes (user metadata + trade history)
app.use("/api/profile", profileRouter);

// SSE real-time event stream
app.use("/api/events", eventsRouter);

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
});

export default app;
