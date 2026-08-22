import { afterAll, beforeAll, expect, it } from "vitest";
import { createTestDb, makeProcess, type TestDb } from "./helpers/test-db";
import { hiringProcessTable } from "../schema";

let db: TestDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(async () => {
  await close();
});

it("pushes the schema and round-trips a row", async () => {
  const row = makeProcess({ companyName: "Harness Co" });
  await db.insert(hiringProcessTable).values(row);
  const found = await db.query.hiringProcessTable.findFirst({
    where: (t, { eq }) => eq(t.id, row.id),
  });
  expect(found?.companyName).toBe("Harness Co");
});
