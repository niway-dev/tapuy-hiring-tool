import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, makeProcess, type TestDb } from "./helpers/test-db";
import { hiringProcessTable } from "../schema";
import { HiringProcessMapper } from "../mappers/hiring-process.mapper";

let db: TestDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(async () => {
  await close();
});

describe("archive columns", () => {
  it("default to null (existing rows stay active)", async () => {
    const row = makeProcess();
    await db.insert(hiringProcessTable).values(row);
    const found = await db.query.hiringProcessTable.findFirst({
      where: (t, ops) => ops.eq(t.id, row.id),
    });
    expect(found?.archivedAt).toBeNull();
    expect(found?.archiveReason).toBeNull();
  });

  it("CHECK rejects archivedAt without archiveReason (I1)", async () => {
    const row = makeProcess();
    await db.insert(hiringProcessTable).values(row);
    await expect(
      db
        .update(hiringProcessTable)
        .set({ archivedAt: new Date() })
        .where(eq(hiringProcessTable.id, row.id)),
    ).rejects.toThrow();
  });

  it("mapper round-trips archive fields", () => {
    const archivedAt = new Date("2026-08-01T00:00:00Z");
    const domain = HiringProcessMapper.toDomain({
      id: "x",
      userId: "user-1",
      companyName: "A",
      jobTitle: null,
      status: "ongoing",
      salary: null,
      currency: "USD",
      salaryRateType: "monthly",
      createdAt: archivedAt,
      updatedAt: archivedAt,
      deletedAt: null,
      archivedAt,
      archiveReason: "no-reply",
    });
    expect(domain.archivedAt).toEqual(archivedAt);
    expect(domain.archiveReason).toBe("no-reply");
    expect(HiringProcessMapper.toPersistence(domain).archiveReason).toBe("no-reply");
  });
});
