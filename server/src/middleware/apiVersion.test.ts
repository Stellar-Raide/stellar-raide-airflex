/**
 * apiVersion.test.ts
 *
 * Unit tests for the apiVersion middleware.
 */

import express, { Request, Response } from "express";
import request from "supertest";
import { apiVersion } from "./apiVersion";

function makeApp() {
  const app = express();
  app.use(apiVersion);
  app.get("/test", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe("apiVersion middleware", () => {
  it("sets X-Api-Version: 1 header on every response", async () => {
    const app = makeApp();
    const res = await request(app).get("/test");
    expect(res.status).toBe(200);
    expect(res.headers["x-api-version"]).toBe("1");
  });

  it("does not block the request — next() is called", async () => {
    const app = makeApp();
    const res = await request(app).get("/test");
    expect(res.body.ok).toBe(true);
  });

  it("sets the header even on 404 responses", async () => {
    const app = makeApp();
    const res = await request(app).get("/nonexistent");
    expect(res.headers["x-api-version"]).toBe("1");
  });
});
