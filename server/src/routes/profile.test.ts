/**
 * profile.test.ts
 *
 * Tests for GET /api/v1/profile endpoint including referralCode verification.
 */

import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = "test-secret-key-1234567890";
process.env["JWT_SECRET"] = JWT_SECRET;

// Mock database pool
const mockQuery = jest.fn();
jest.mock("../db", () => ({
  __esModule: true,
  default: {
    query: (...args: any[]) => mockQuery(...args),
    connect: jest.fn(),
  },
}));

import profileRouter from "./profile";

const app = express();
app.use(express.json());
app.use("/api/v1/profile", profileRouter);

describe("GET /api/v1/profile", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const token = jwt.sign({ sub: userId, role: "user" }, JWT_SECRET, { expiresIn: "1h" });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/v1/profile");
    expect(res.status).toBe(401);
  });

  it("returns 200 with profile data and non-empty referralCode", async () => {
    // 0th query: authenticate's token-revocation check (token_version lookup).
    mockQuery.mockResolvedValueOnce({ rows: [{ token_version: 1 }] });

    // 1st query: users
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: userId,
          phone: "+2348012345678",
          created_at: "2026-01-01T00:00:00.000Z",
          stellar_public_key: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
          kyc_status: "verified",
          referral_code: "AIR77REF",
        },
      ],
    });

    // 2nd query: trade counts
    mockQuery.mockResolvedValueOnce({
      rows: [{ count: "12" }],
    });

    const res = await request(app)
      .get("/api/v1/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(userId);
    expect(res.body.data.referralCode).toBe("AIR77REF");
    expect(typeof res.body.data.referralCode).toBe("string");
    expect(res.body.data.referralCode.length).toBeGreaterThan(0);
    expect(res.body.data.totalTradesCompleted).toBe(12);
  });

  it("returns 404 when user is not found in database", async () => {
    // 0th query: authenticate's token-revocation check (token_version lookup).
    mockQuery.mockResolvedValueOnce({ rows: [{ token_version: 1 }] });

    // 1st query: users (not found)
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/v1/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });
});

describe("PATCH /api/v1/profile", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const token = jwt.sign({ sub: userId, role: "user" }, JWT_SECRET, { expiresIn: "1h" });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).patch("/api/v1/profile").send({ alias: "Alice" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when fields fail type or format constraints", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token_version: 1 }] });

    const res = await request(app)
      .patch("/api/v1/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ alias: "not valid!" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toContain("alias");
  });

  it("returns 400 when unknown or extra fields are included (strict schema)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token_version: 1 }] });

    const res = await request(app)
      .patch("/api/v1/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ alias: "validAlias", unexpectedField: "hacked", role: "admin" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toContain("unexpectedField");
    expect(fields).toContain("role");
  });

  it("returns 400 when empty body is sent with no updatable fields", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token_version: 1 }] });

    const res = await request(app)
      .patch("/api/v1/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("At least one profile field is required");
  });

  it("returns 200 and updates only supplied profile fields", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token_version: 1 }] });
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: userId,
          phone: "+2348012345678",
          display_handle: "@stellar-raide-stellar-raide-airflex_trader",
          stellar_public_key: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
          opt_out_notifications: false,
          virtual_account_number: "0123456789",
          virtual_bank_name: "Wema Bank",
          updated_at: "2026-10-20T12:00:00.000Z",
        },
      ],
    });

    const res = await request(app)
      .patch("/api/v1/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        displayHandle: "@stellar-raide-stellar-raide-airflex_trader",
        notificationsEnabled: true,
        stellarPublicKey: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(userId);
    expect(res.body.data.displayHandle).toBe("@stellar-raide-stellar-raide-airflex_trader");
    expect(res.body.data.stellarPublicKey).toBe(
      "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H"
    );
    expect(res.body.data.notificationsEnabled).toBe(true);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE users"),
      ["@stellar-raide-stellar-raide-airflex_trader", false, "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H", userId]
    );
  });

  it("returns 404 when user not found in database during update", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token_version: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch("/api/v1/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ alias: "ghost" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });
});

describe("PUT /api/v1/profile", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const token = jwt.sign({ sub: userId, role: "user" }, JWT_SECRET, { expiresIn: "1h" });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("also supports profile updates via PUT", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token_version: 1 }] });
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: userId,
          phone: "+2348012345678",
          display_handle: "@trader_one",
          stellar_public_key: null,
          opt_out_notifications: true,
          virtual_account_number: null,
          virtual_bank_name: null,
          updated_at: "2026-10-20T12:00:00.000Z",
        },
      ],
    });

    const res = await request(app)
      .put("/api/v1/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ alias: "trader_one", notificationsEnabled: false });

    expect(res.status).toBe(200);
    expect(res.body.data.displayHandle).toBe("@trader_one");
    expect(res.body.data.notificationsEnabled).toBe(false);
  });
});
