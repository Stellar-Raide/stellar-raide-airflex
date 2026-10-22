/**
 * Correlation ID propagation (issue #481): the X-Request-Id response header
 * and every log line written while handling the request share one ID.
 */
import express from "express";
import request from "supertest";
import { requestId } from "./requestId";
import logger from "../utils/logger";
import { getRequestId } from "../utils/requestContext";

/** Simulates a service called from the route, after an async hop. */
async function someService(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1));
  logger.info({ step: "service" }, "service work done");
}

function buildApp(): express.Express {
  const app = express();
  app.use(requestId);
  app.get("/work", async (_req, res) => {
    logger.info({ step: "route" }, "handling request");
    await someService();
    res.json({ requestId: getRequestId() });
  });
  return app;
}

describe("requestId correlation", () => {
  const originalNodeEnv = process.env["NODE_ENV"];
  let lines: string[];

  beforeEach(() => {
    process.env["NODE_ENV"] = "production"; // JSON log output
    lines = [];
    jest.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      lines.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env["NODE_ENV"] = originalNodeEnv;
  });

  function entries(): Array<Record<string, unknown>> {
    return lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  it("uses the same ID in the response header, request context and every log entry", async () => {
    const res = await request(buildApp()).get("/work");
    const id = res.headers["x-request-id"];

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body).toEqual({ requestId: id });

    const logged = entries();
    expect(logged.map((e) => e["step"])).toEqual(["route", "service"]);
    for (const entry of logged) {
      expect(entry).toMatchObject({ level: "info", requestId: id });
      expect(typeof entry["message"]).toBe("string");
      expect(Date.parse(entry["timestamp"] as string)).not.toBeNaN();
    }
  });

  it("keeps concurrent requests' IDs separate", async () => {
    const app = buildApp();
    const [a, b] = await Promise.all([request(app).get("/work"), request(app).get("/work")]);

    expect(a.headers["x-request-id"]).not.toBe(b.headers["x-request-id"]);
    const ids = new Set(entries().map((e) => e["requestId"]));
    expect(ids).toEqual(new Set([a.headers["x-request-id"], b.headers["x-request-id"]]));
  });

  it("reuses a safe inbound X-Request-Id", async () => {
    const res = await request(buildApp()).get("/work").set("X-Request-Id", "gateway-abc123");

    expect(res.headers["x-request-id"]).toBe("gateway-abc123");
    expect(entries().every((e) => e["requestId"] === "gateway-abc123")).toBe(true);
  });

  it.each(["short", "has spaces in it", "x".repeat(200), "bad\nnewline-id"])(
    "replaces an unsafe inbound X-Request-Id (%p)",
    async (incoming) => {
      const res = await request(buildApp()).get("/work").set("X-Request-Id", incoming.replace("\n", ""));

      expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    }
  );

  it("omits requestId from logs written outside a request", () => {
    logger.info("startup");

    expect(entries()[0]).not.toHaveProperty("requestId");
  });
});
