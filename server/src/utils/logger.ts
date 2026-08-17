import pino from "pino";

/**
 * Structured logger — JSON output in production, pretty-printed in development.
 *
 * Usage:
 *   import logger from "../utils/logger";
 *   logger.info("server started");
 *   logger.error({ err }, "something went wrong");
 */
const logger = pino(
  process.env["NODE_ENV"] === "production"
    ? {
        level: "info",
      }
    : {
        level: "debug",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
);

export default logger;
