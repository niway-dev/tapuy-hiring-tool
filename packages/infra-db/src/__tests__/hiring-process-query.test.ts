import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, makeProcess, type TestDb } from "./helpers/test-db";
import { hiringProcessTable } from "../schema";
import { HiringProcessRepository } from "../repositories/hiring-process.repository";

let db: TestDb;
let close: () => Promise<void>;
let repo: HiringProcessRepository;

const NOW = Date.now();
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000);

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  repo = new HiringProcessRepository(db);

  // Fixture: 6 rows for user-1 + 1 foreign + 1 soft-deleted
  await db.insert(hiringProcessTable).values([
    makeProcess({ companyName: "Fresh Ongoing", status: "ongoing", updatedAt: daysAgo(2) }),
    makeProcess({
      companyName: "Stale FirstContact",
      status: "first-contact",
      updatedAt: daysAgo(60),
    }),
    makeProcess({ companyName: "Old Hired", status: "hired", updatedAt: daysAgo(200) }), // terminal: never stale
    makeProcess({ companyName: "Dropped", status: "dropped-out", updatedAt: daysAgo(5) }),
    makeProcess({
      companyName: "Archived NoReply",
      status: "ongoing",
      updatedAt: daysAgo(90),
      archivedAt: daysAgo(10),
      archiveReason: "no-reply",
    }),
    makeProcess({
      companyName: "Archived Rejected",
      status: "rejected",
      updatedAt: daysAgo(120),
      archivedAt: daysAgo(3),
      archiveReason: "they-passed",
    }),
    makeProcess({ companyName: "Foreign", userId: "user-2", status: "ongoing" }),
    makeProcess({
      companyName: "Soft Deleted",
      status: "ongoing",
      deletedAt: new Date(),
      archivedAt: daysAgo(1),
      archiveReason: "role-closed",
    }),
  ]);
});
afterAll(async () => {
  await close();
});

describe("scope (I4)", () => {
  it("default scope excludes archived rows", async () => {
    const result = await repo.findPaginated("user-1", { page: 1, limit: 50 });
    const names = result.data.map((p) => p.companyName);
    expect(names).toHaveLength(4);
    expect(names).not.toContain("Archived NoReply");
    expect(names).not.toContain("Soft Deleted");
  });

  it("scope archived returns only archived, newest archive first by default", async () => {
    const result = await repo.findPaginated(
      "user-1",
      { page: 1, limit: 50 },
      { scope: "archived" },
    );
    expect(result.data.map((p) => p.companyName)).toEqual([
      "Archived Rejected",
      "Archived NoReply",
    ]);
  });
});

describe("stale filter", () => {
  it("returns only OPEN statuses older than 45 days", async () => {
    const result = await repo.findPaginated(
      "user-1",
      { page: 1, limit: 50 },
      { stale: true },
      { sort: "updatedAt", dir: "asc" },
    );
    expect(result.data.map((p) => p.companyName)).toEqual(["Stale FirstContact"]);
  });
});

describe("sort (I5)", () => {
  it("status sorts by pipeline index, not alphabetically", async () => {
    const result = await repo.findPaginated("user-1", { page: 1, limit: 50 }, undefined, {
      sort: "status",
      dir: "asc",
    });
    // pipeline: first-contact < ongoing < hired < dropped-out
    expect(result.data.map((p) => p.status)).toEqual([
      "first-contact",
      "ongoing",
      "hired",
      "dropped-out",
    ]);
  });

  it("companyName asc", async () => {
    const result = await repo.findPaginated("user-1", { page: 1, limit: 50 }, undefined, {
      sort: "companyName",
      dir: "asc",
    });
    const names = result.data.map((p) => p.companyName);
    expect(names).toEqual([...names].sort());
  });
});

describe("counts", () => {
  it("one call returns all five global counters", async () => {
    expect(await repo.counts("user-1")).toEqual({
      active: 4, // Fresh Ongoing, Stale FirstContact, Old Hired, Dropped
      archived: 2,
      open: 2, // Fresh Ongoing, Stale FirstContact
      closed: 2, // Old Hired, Dropped
      stale: 1, // Stale FirstContact (Old Hired is terminal — never stale)
    });
  });
});

describe("findBoard", () => {
  it("returns active rows only, updatedAt desc", async () => {
    const rows = await repo.findBoard("user-1");
    expect(rows.map((p) => p.companyName)).toEqual([
      "Fresh Ongoing",
      "Dropped",
      "Stale FirstContact",
      "Old Hired",
    ]);
  });
});
