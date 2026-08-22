import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, makeProcess, type TestDb } from "./helpers/test-db";
import { hiringProcessTable } from "../schema";
import { HiringProcessRepository } from "../repositories/hiring-process.repository";

let db: TestDb;
let close: () => Promise<void>;
let repo: HiringProcessRepository;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  repo = new HiringProcessRepository(db);
});
afterAll(async () => {
  await close();
});

const OLD = new Date("2026-05-01T10:00:00Z");

async function insertProcess(overrides: Record<string, unknown> = {}) {
  const row = makeProcess({ updatedAt: OLD, ...overrides });
  await db.insert(hiringProcessTable).values(row);
  return row;
}

describe("archive (I1, I2)", () => {
  it("sets archivedAt + reason and preserves status and updatedAt exactly", async () => {
    const row = await insertProcess({ status: "on-hold" });
    const archived = await repo.archive(row.id, "user-1", "no-reply");
    expect(archived).not.toBeNull();
    expect(archived?.archivedAt).toBeInstanceOf(Date);
    expect(archived?.archiveReason).toBe("no-reply");
    expect(archived?.status).toBe("on-hold");
    expect(archived?.updatedAt.getTime()).toBe(OLD.getTime()); // $onUpdate defeated
  });

  it("returns null when already archived (409 path)", async () => {
    const row = await insertProcess();
    await repo.archive(row.id, "user-1", "they-passed");
    expect(await repo.archive(row.id, "user-1", "they-passed")).toBeNull();
  });

  it("returns null cross-user and for soft-deleted rows", async () => {
    const row = await insertProcess();
    expect(await repo.archive(row.id, "user-2", "no-reply")).toBeNull();
    const deleted = await insertProcess({ deletedAt: new Date() });
    expect(await repo.archive(deleted.id, "user-1", "no-reply")).toBeNull();
  });
});

describe("restore (I1, I2)", () => {
  it("clears both fields and preserves updatedAt", async () => {
    const row = await insertProcess({ status: "ongoing" });
    await repo.archive(row.id, "user-1", "i-withdrew");
    const restored = await repo.restore(row.id, "user-1");
    expect(restored?.archivedAt).toBeNull();
    expect(restored?.archiveReason).toBeNull();
    expect(restored?.status).toBe("ongoing");
    expect(restored?.updatedAt.getTime()).toBe(OLD.getTime());
  });

  it("returns null when not archived", async () => {
    const row = await insertProcess();
    expect(await repo.restore(row.id, "user-1")).toBeNull();
  });
});

describe("update regressions", () => {
  it("still bumps updatedAt on status change (I3)", async () => {
    const row = await insertProcess();
    const updated = await repo.update(row.id, "user-1", { status: "offer-made" });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(OLD.getTime());
  });

  it("no longer updates soft-deleted rows (I6 fix)", async () => {
    const row = await insertProcess({ deletedAt: new Date() });
    await expect(repo.update(row.id, "user-1", { status: "hired" })).rejects.toThrow(
      "Hiring process not found or unauthorized",
    );
  });
});
