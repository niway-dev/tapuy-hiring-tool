import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { pushSchema } from "drizzle-kit/api";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "../../schema";

export type TestDb = NeonHttpDatabase<typeof schema>;

/**
 * In-memory Postgres with the real Drizzle schema pushed into it.
 * The repository is typed against NeonHttpDatabase; the pglite database is
 * query-builder-compatible at runtime, so we cast at this single seam.
 */
export async function createTestDb(): Promise<{ db: TestDb; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  // biome-ignore lint: pushSchema expects a generic drizzle instance
  const { apply } = await pushSchema(schema, db as never);
  await apply();

  await db.insert(schema.userTable).values([
    { id: "user-1", name: "User One", email: "one@test.dev" },
    { id: "user-2", name: "User Two", email: "two@test.dev" },
  ]);

  return { db: db as unknown as TestDb, close: () => client.close() };
}

type ProcessInsert = typeof schema.hiringProcessTable.$inferInsert;

let seq = 0;

/** Insert-row factory; override any column (updatedAt included — no $onUpdate on INSERT defaults). */
export function makeProcess(overrides: Partial<ProcessInsert> = {}): ProcessInsert {
  seq += 1;
  return {
    id: crypto.randomUUID(),
    companyName: `Company ${seq}`,
    status: "ongoing",
    userId: "user-1",
    ...overrides,
  };
}
