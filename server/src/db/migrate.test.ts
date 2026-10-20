import fs from "fs";
import path from "path";
import os from "os";
import { runMigrations, rollbackLastMigration, ensureMigrationTable } from "./migrate";
import logger from "../utils/logger";

describe("Database Migrations CLI (migrate.ts)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "stellar-raide-stellar-raide-airflex-migrate-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it("creates schema_migrations table if not exists", async () => {
    const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    const mockClient = {
      query: mockQuery,
      release: jest.fn(),
    };
    await ensureMigrationTable(mockClient as any);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS schema_migrations")
    );
  });

  it("executes and records a new migration file when not previously applied", async () => {
    const migrationFile = "001_test_migration.sql";
    const migrationSql = "CREATE TABLE test_table (id INT);";
    fs.writeFileSync(path.join(tempDir, migrationFile), migrationSql);

    const queryLog: Array<{ text: string; params?: unknown[] }> = [];
    const mockClient = {
      query: jest.fn().mockImplementation(async (text: string, params?: unknown[]) => {
        queryLog.push({ text, params });
        if (text.includes("SELECT filename FROM schema_migrations")) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    const mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    const result = await runMigrations({
      pool: mockPool as any,
      migrationsDir: tempDir,
    });

    expect(result.applied).toEqual([migrationFile]);
    expect(result.skipped).toEqual([]);

    // Verify transaction and insertion
    expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
    expect(mockClient.query).toHaveBeenCalledWith(migrationSql);
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO schema_migrations"),
      [migrationFile]
    );
    expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("skips previously applied migration file and reports no pending migrations", async () => {
    const migrationFile = "001_test_migration.sql";
    fs.writeFileSync(path.join(tempDir, migrationFile), "SELECT 1;");

    const infoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});

    const mockClient = {
      query: jest.fn().mockImplementation(async (text: string) => {
        if (text.includes("SELECT filename FROM schema_migrations")) {
          return { rows: [{ filename: migrationFile }] };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    const mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    const result = await runMigrations({
      pool: mockPool as any,
      migrationsDir: tempDir,
    });

    expect(result.applied).toEqual([]);
    expect(result.skipped).toEqual([migrationFile]);
    expect(infoSpy).toHaveBeenCalledWith("[migrate] No pending migrations");
    expect(mockClient.query).not.toHaveBeenCalledWith("BEGIN");
  });

  it("rolls back the last migration by removing it from schema_migrations", async () => {
    const infoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});

    const mockClient = {
      query: jest.fn().mockImplementation(async (text: string) => {
        if (text.includes("SELECT id, filename FROM schema_migrations")) {
          return { rows: [{ id: 42, filename: "002_kyc.sql" }] };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    const mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    const rolledBackFile = await rollbackLastMigration({
      pool: mockPool as any,
    });

    expect(rolledBackFile).toBe("002_kyc.sql");
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM schema_migrations WHERE id = $1"),
      [42]
    );
    expect(infoSpy).toHaveBeenCalledWith("[migrate] Rolled back migration record: 002_kyc.sql");
  });

  it("logs Applying and Applied lines for a successful migration run", async () => {
    const migrationFile = "001_referrals.sql";
    fs.writeFileSync(path.join(tempDir, migrationFile), "CREATE TABLE referrals (id INT);");

    const infoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});
    const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => {});

    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    const mockPool = { connect: jest.fn().mockResolvedValue(mockClient) };

    const result = await runMigrations({
      pool: mockPool as any,
      migrationsDir: tempDir,
    });

    expect(result.applied).toEqual([migrationFile]);
    expect(errorSpy).not.toHaveBeenCalled();

    expect(infoSpy).toHaveBeenCalledWith(`[migrate] Applying: ${migrationFile}`);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[migrate\] Applied: 001_referrals\.sql \(\d+ms\)$/)
    );

    // "Applying" must be emitted before "Applied".
    const applyingCall = infoSpy.mock.calls.findIndex(
      ([message]) => String(message) === `[migrate] Applying: ${migrationFile}`
    );
    const appliedCall = infoSpy.mock.calls.findIndex(([message]) =>
      String(message).startsWith("[migrate] Applied: ")
    );
    expect(applyingCall).toBeGreaterThanOrEqual(0);
    expect(appliedCall).toBeGreaterThan(applyingCall);
  });

  it("logs a FAILED line at error level and rethrows when a migration fails", async () => {
    const migrationFile = "002_kyc.sql";
    fs.writeFileSync(path.join(tempDir, migrationFile), "CREATE TABLE kyc (id INT);");

    const failure = new Error("syntax error at or near \"KY\"");
    const infoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});
    const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => {});

    const mockClient = {
      query: jest.fn().mockImplementation(async (text: string) => {
        if (text === "CREATE TABLE kyc (id INT);") {
          throw failure;
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    const mockPool = { connect: jest.fn().mockResolvedValue(mockClient) };

    await expect(
      runMigrations({ pool: mockPool as any, migrationsDir: tempDir })
    ).rejects.toThrow(failure);

    expect(infoSpy).toHaveBeenCalledWith(`[migrate] Applying: ${migrationFile}`);
    expect(errorSpy).toHaveBeenCalledWith(
      { err: failure, file: migrationFile },
      `[migrate] FAILED: ${migrationFile} — ${failure.message}`
    );
    // The partial transaction must be rolled back before the error propagates.
    expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mockClient.query).not.toHaveBeenCalledWith("COMMIT");
  });

  it("keeps the audit trail of earlier files when a later migration fails", async () => {
    const first = "001_referrals.sql";
    const second = "002_kyc.sql";
    fs.writeFileSync(path.join(tempDir, first), "CREATE TABLE referrals (id INT);");
    fs.writeFileSync(path.join(tempDir, second), "CREATE TABLE kyc (id INT);");

    const failure = new Error("boom");
    const infoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});
    const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => {});

    const mockClient = {
      query: jest.fn().mockImplementation(async (text: string) => {
        if (text === "CREATE TABLE kyc (id INT);") {
          throw failure;
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    const mockPool = { connect: jest.fn().mockResolvedValue(mockClient) };

    await expect(
      runMigrations({ pool: mockPool as any, migrationsDir: tempDir })
    ).rejects.toThrow(failure);

    // The first file completed and is logged, so the operator can tell exactly
    // which migrations landed before the failure.
    expect(infoSpy).toHaveBeenCalledWith(`[migrate] Applying: ${first}`);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[migrate\] Applied: 001_referrals\.sql \(\d+ms\)$/)
    );
    expect(infoSpy).toHaveBeenCalledWith(`[migrate] Applying: ${second}`);
    expect(errorSpy).toHaveBeenCalledWith(
      { err: failure, file: second },
      `[migrate] FAILED: ${second} — boom`
    );
  });
  describe("rollback with down/ scripts (issue #543)", () => {
    function mockPoolFor(filename: string, failOn?: string) {
      const client = {
        query: jest.fn().mockImplementation(async (text: string) => {
          if (failOn && text.includes(failOn)) throw new Error("down failed");
          if (text.includes("SELECT id, filename FROM schema_migrations")) {
            return { rows: [{ id: 7, filename }] };
          }
          return { rows: [] };
        }),
        release: jest.fn(),
      };
      return { client, pool: { connect: jest.fn().mockResolvedValue(client) } };
    }

    it("runs down/<filename> and removes the record in one transaction", async () => {
      jest.spyOn(logger, "info").mockImplementation(() => {});
      fs.mkdirSync(path.join(tempDir, "down"));
      const downSql = "DROP INDEX IF EXISTS idx_trade_offers_status_created_at;";
      fs.writeFileSync(path.join(tempDir, "down", "012_index.sql"), downSql);
      const { client, pool } = mockPoolFor("012_index.sql");

      const rolledBack = await rollbackLastMigration({ pool: pool as any, migrationsDir: tempDir });

      expect(rolledBack).toBe("012_index.sql");
      const statements = client.query.mock.calls.map(([text]) => String(text).trim());
      const begin = statements.indexOf("BEGIN");
      expect(begin).toBeGreaterThan(-1);
      expect(statements.slice(begin)).toEqual([
        "BEGIN",
        downSql,
        "DELETE FROM schema_migrations WHERE id = $1;",
        "COMMIT",
      ]);
    });

    it("rolls back and keeps the record when the down script fails", async () => {
      jest.spyOn(logger, "error").mockImplementation(() => {});
      fs.mkdirSync(path.join(tempDir, "down"));
      fs.writeFileSync(path.join(tempDir, "down", "011_table.sql"), "DROP TABLE fraud_flags;");
      const { client, pool } = mockPoolFor("011_table.sql", "DROP TABLE");

      await expect(
        rollbackLastMigration({ pool: pool as any, migrationsDir: tempDir })
      ).rejects.toThrow("down failed");

      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
      expect(client.query).not.toHaveBeenCalledWith("COMMIT");
      expect(client.release).toHaveBeenCalled();
    });

    it("only removes the record when no down script exists", async () => {
      jest.spyOn(logger, "info").mockImplementation(() => {});
      const { client, pool } = mockPoolFor("001_no_down.sql");

      await rollbackLastMigration({ pool: pool as any, migrationsDir: tempDir });

      expect(client.query).not.toHaveBeenCalledWith("BEGIN");
      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM schema_migrations WHERE id = $1"),
        [7]
      );
    });

    it("ships a down script for every migration added from 011 onwards", () => {
      const dir = path.resolve(__dirname, "migrations");
      const forward = fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(".sql") && file >= "011");
      for (const file of forward) {
        expect(fs.existsSync(path.join(dir, "down", file))).toBe(true);
      }
      expect(forward).toEqual(
        expect.arrayContaining(["011_fraud_flags.sql", "012_trade_offers_status_created_at_index.sql"])
      );
    });

    it("012 creates the (status, created_at DESC) index on trade_offers and its down drops it", () => {
      const dir = path.resolve(__dirname, "migrations");
      const up = fs.readFileSync(path.join(dir, "012_trade_offers_status_created_at_index.sql"), "utf-8");
      const down = fs.readFileSync(path.join(dir, "down", "012_trade_offers_status_created_at_index.sql"), "utf-8");

      expect(up).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_trade_offers_status_created_at\s+ON trade_offers \(status, created_at DESC\);/
      );
      expect(up).not.toMatch(/CONCURRENTLY/);
      expect(down).toMatch(/DROP INDEX IF EXISTS idx_trade_offers_status_created_at;/);
    });
  });
});
