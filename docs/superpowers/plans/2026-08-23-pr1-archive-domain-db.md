# PR 1 — Archive fields + domain foundations · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the orthogonal `archived` mark (columns + enum + invariants) and the domain foundations (pipeline order, stale rules, archive reasons, sort/scope contracts) with real test coverage, without touching any UI.

**Architecture:** Domain constants/schemas are the single source of truth; the Drizzle repository gains dedicated `archive`/`restore`/`counts`/`findBoard` methods behind a new capability interface (`IHiringProcessArchiveRepository`) so the frozen Prisma implementation keeps compiling untouched. DB changes ship via `bun run db:push` (no migration files exist in this repo).

**Tech Stack:** Bun workspaces + Turborepo · TypeScript strict · zod v4 · Drizzle ORM 0.45 / drizzle-kit 0.31 (Neon HTTP) · vitest (new here; mirrors `packages/i18n`) · pglite for repo integration tests.

**Spec:** `docs/superpowers/specs/2026-08-23-board-archive-tech-spec.md` (§1 Q1, §2 modelo, §8 decisiones D1–D7). UX source of truth: BUILD-spec (board + archived).

## Global Constraints

- Package manager is **bun**; run everything from repo root unless stated (`bun run check-types`, `bun run lint`).
- `packages/domain` must stay pure and mobile-safe: no Node/server imports, only zod as runtime dep.
- **Never reorder `HIRING_PROCESS_STATUS_VALUES`** (it feeds the pgEnum declaration; reordering triggers enum alters on push). Pipeline order is a NEW constant.
- `archive`/`restore` must not change `status` nor `updatedAt` (spec invariant I2). `$onUpdate` on `updatedAt` (`packages/infra-db/src/utils/timestamps.ts:13-20`) is defeated by explicitly setting `updatedAt: sql\`updated_at\``in`.set()`— an explicit value wins over`$onUpdate`.
- All new queries must keep filtering `deleted_at IS NULL` (soft-delete predates this feature).
- Only new dev-dependencies allowed: `vitest` (domain, infra-db) and `@electric-sql/pglite` (infra-db). Nothing else.
- `packages/infra-prisma-db` is frozen: do not edit it; it must keep compiling (that's why new repo methods live in a separate interface).
- Pre-commit runs oxlint + oxfmt via husky; if a commit fails on formatting, run `bun run format` and re-stage.
- Commit messages: `feat(db): ...` / `test(db): ...`, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Branch: `feat/archive-db-foundations` off `main`.

---

### Task 1: Test infrastructure (turbo task + vitest in domain)

**Files:**

- Modify: `turbo.json` (add `test` task)
- Modify: `package.json` (root; add `test` script)
- Create: `packages/domain/vitest.config.ts`
- Modify: `packages/domain/package.json` (script + devDep)

**Interfaces:**

- Consumes: existing precedent `packages/i18n/vitest.config.ts`.
- Produces: `bun run test` (root, via turbo) and `bun run test` inside `packages/domain` for Tasks 2–4; Task 6 adds the same shape to infra-db.

- [ ] **Step 1: Add the turbo task.** In `turbo.json`, inside `"tasks"`, add:

```json
"test": {
  "cache": false
}
```

- [ ] **Step 2: Add root script.** In root `package.json` scripts, add `"test": "turbo run test"`.

- [ ] **Step 3: Create `packages/domain/vitest.config.ts`:**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    name: "domain",
  },
});
```

- [ ] **Step 4: Wire the domain package.** In `packages/domain/package.json`: add `"test": "vitest run"` to scripts and `"vitest": "^2.1.0"` to `devDependencies` (same version as `packages/i18n/package.json:53`). Run `bun install`.

- [ ] **Step 5: Smoke-run.** Create `packages/domain/src/__tests__/smoke.test.ts` with `expect(true).toBe(true)`, run `bun run test` inside `packages/domain`, expect PASS, then **delete the smoke file** (Task 2 adds real tests).

- [ ] **Step 6: Commit** — `chore: add vitest test task (turbo + domain package)`.

---

### Task 2: Domain constants — archive reasons, scope, sort fields

**Files:**

- Create: `packages/domain/src/constants/archive-reason.ts`
- Create: `packages/domain/src/constants/hiring-process-query.ts`
- Modify: `packages/domain/src/constants/index.ts`
- Test: `packages/domain/src/__tests__/archive-reason.test.ts`

**Interfaces:**

- Consumes: `ObjectProperties` from `../types` (pattern of `currency.ts`).
- Produces: `ARCHIVE_REASONS`, `ARCHIVE_REASON_VALUES`, `ArchiveReason`, `isValidArchiveReason` · `HIRING_PROCESS_SCOPES`, `HIRING_PROCESS_SCOPE_VALUES`, `HiringProcessScope` · `HIRING_PROCESS_SORT_FIELDS`, `HIRING_PROCESS_SORT_FIELD_VALUES`, `HiringProcessSortField` · `SORT_DIRECTIONS`, `SORT_DIRECTION_VALUES`, `SortDirection`. Used by Tasks 3–5 and 7–9.

- [ ] **Step 1: Write the failing test** `packages/domain/src/__tests__/archive-reason.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ARCHIVE_REASON_VALUES,
  isValidArchiveReason,
} from "../constants/archive-reason";

describe("archive reasons", () => {
  it("exposes the four reasons in dialog order", () => {
    expect(ARCHIVE_REASON_VALUES).toEqual([
      "no-reply",
      "they-passed",
      "i-withdrew",
      "role-closed",
    ]);
  });

  it("validates values", () => {
    expect(isValidArchiveReason("no-reply")).toBe(true);
    expect(isValidArchiveReason("ghosted")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it** — `bun run test` in `packages/domain`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement.** `packages/domain/src/constants/archive-reason.ts`:

```ts
import type { ObjectProperties } from "../types";

/**
 * Archive Reason Constants
 * Why a process left the active radar. Orthogonal to status:
 * archiving records WHERE it stopped (status stays) and WHY (this enum).
 */
export const ARCHIVE_REASONS = {
  NO_REPLY: "no-reply",
  THEY_PASSED: "they-passed",
  I_WITHDREW: "i-withdrew",
  ROLE_CLOSED: "role-closed",
} as const;

export type ArchiveReason = ObjectProperties<typeof ARCHIVE_REASONS>;

export const ARCHIVE_REASON_VALUES = [
  ARCHIVE_REASONS.NO_REPLY,
  ARCHIVE_REASONS.THEY_PASSED,
  ARCHIVE_REASONS.I_WITHDREW,
  ARCHIVE_REASONS.ROLE_CLOSED,
] as const;

export function isValidArchiveReason(value: string): value is ArchiveReason {
  return ARCHIVE_REASON_VALUES.includes(value as ArchiveReason);
}
```

`packages/domain/src/constants/hiring-process-query.ts`:

```ts
import type { ObjectProperties } from "../types";

/**
 * Query vocabulary for hiring process list/board reads:
 * scope (active vs archived), sortable fields, sort direction.
 */
export const HIRING_PROCESS_SCOPES = {
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const;

export type HiringProcessScope = ObjectProperties<typeof HIRING_PROCESS_SCOPES>;

export const HIRING_PROCESS_SCOPE_VALUES = [
  HIRING_PROCESS_SCOPES.ACTIVE,
  HIRING_PROCESS_SCOPES.ARCHIVED,
] as const;

export const HIRING_PROCESS_SORT_FIELDS = {
  UPDATED_AT: "updatedAt",
  COMPANY_NAME: "companyName",
  JOB_TITLE: "jobTitle",
  STATUS: "status",
  SALARY: "salary",
  ARCHIVED_AT: "archivedAt",
} as const;

export type HiringProcessSortField = ObjectProperties<typeof HIRING_PROCESS_SORT_FIELDS>;

export const HIRING_PROCESS_SORT_FIELD_VALUES = [
  HIRING_PROCESS_SORT_FIELDS.UPDATED_AT,
  HIRING_PROCESS_SORT_FIELDS.COMPANY_NAME,
  HIRING_PROCESS_SORT_FIELDS.JOB_TITLE,
  HIRING_PROCESS_SORT_FIELDS.STATUS,
  HIRING_PROCESS_SORT_FIELDS.SALARY,
  HIRING_PROCESS_SORT_FIELDS.ARCHIVED_AT,
] as const;

export const SORT_DIRECTIONS = {
  ASC: "asc",
  DESC: "desc",
} as const;

export type SortDirection = ObjectProperties<typeof SORT_DIRECTIONS>;

export const SORT_DIRECTION_VALUES = [SORT_DIRECTIONS.ASC, SORT_DIRECTIONS.DESC] as const;
```

Append to `packages/domain/src/constants/index.ts`:

```ts
export * from "./archive-reason";
export * from "./hiring-process-query";
```

- [ ] **Step 4: Run tests** — expect PASS. Also `bun run check-types` at root — expect clean.

- [ ] **Step 5: Commit** — `feat(domain): archive reason, scope and sort constants`.

---

### Task 3: Domain constants — pipeline order + STATUS_TRANSITIONS fix

**Files:**

- Modify: `packages/domain/src/constants/hiring-process-status.ts`
- Test: `packages/domain/src/__tests__/hiring-process-status.test.ts`

**Interfaces:**

- Consumes: existing `HIRING_PROCESS_STATUSES`, `HIRING_PROCESS_STATUS_INFO`.
- Produces: `HIRING_PROCESS_STATUS_ORDER` (8-tuple, pipeline order), `OPEN_STATUSES`, `CLOSED_STATUSES`, `statusPipelineIndex(status): number`. Used by Tasks 4, 7–9 and by the board (PR 2/4). **Do NOT touch `HIRING_PROCESS_STATUS_VALUES` or `INFO.order`.**

- [ ] **Step 1: Write the failing test** `packages/domain/src/__tests__/hiring-process-status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  CLOSED_STATUSES,
  HIRING_PROCESS_STATUS_INFO,
  HIRING_PROCESS_STATUS_ORDER,
  HIRING_PROCESS_STATUS_VALUES,
  OPEN_STATUSES,
  STATUS_TRANSITIONS,
  statusPipelineIndex,
} from "../constants/hiring-process-status";

describe("pipeline order", () => {
  it("orders the 8 statuses open-first, then terminal", () => {
    expect(HIRING_PROCESS_STATUS_ORDER).toEqual([
      "first-contact",
      "ongoing",
      "on-hold",
      "offer-made",
      "offer-accepted",
      "hired",
      "rejected",
      "dropped-out",
    ]);
  });

  it("covers exactly the same set as the enum values", () => {
    expect([...HIRING_PROCESS_STATUS_ORDER].sort()).toEqual(
      [...HIRING_PROCESS_STATUS_VALUES].sort(),
    );
  });

  it("OPEN/CLOSED match the existing category metadata", () => {
    for (const status of OPEN_STATUSES) {
      expect(HIRING_PROCESS_STATUS_INFO[status].category).toBe("active");
    }
    for (const status of CLOSED_STATUSES) {
      expect(HIRING_PROCESS_STATUS_INFO[status].category).toBe("terminal");
    }
    expect(OPEN_STATUSES).toHaveLength(4);
    expect(CLOSED_STATUSES).toHaveLength(4);
  });

  it("statusPipelineIndex is the sort comparator for the Status column", () => {
    expect(statusPipelineIndex("first-contact")).toBe(0);
    expect(statusPipelineIndex("dropped-out")).toBe(7);
    expect(statusPipelineIndex("offer-made")).toBeLessThan(statusPipelineIndex("hired"));
  });

  it("offer-made is no longer a dead end (transitions bug fix)", () => {
    expect(STATUS_TRANSITIONS["offer-made"]).toContain("offer-accepted");
    expect(STATUS_TRANSITIONS["offer-made"]).toContain("rejected");
  });
});
```

- [ ] **Step 2: Run it** — expect FAIL (`HIRING_PROCESS_STATUS_ORDER` not exported).

- [ ] **Step 3: Implement.** In `hiring-process-status.ts`, after `HIRING_PROCESS_STATUS_VALUES` (line 32), add:

```ts
/**
 * Pipeline order — board columns, status <select> order, and the sort
 * criterion for the Status column. This is DISPLAY order and is intentionally
 * different from HIRING_PROCESS_STATUS_VALUES (which feeds the pgEnum and
 * must never be reordered) and from HIRING_PROCESS_STATUS_INFO[x].order.
 */
export const HIRING_PROCESS_STATUS_ORDER = [
  HIRING_PROCESS_STATUSES.FIRST_CONTACT,
  HIRING_PROCESS_STATUSES.ONGOING,
  HIRING_PROCESS_STATUSES.ON_HOLD,
  HIRING_PROCESS_STATUSES.OFFER_MADE,
  HIRING_PROCESS_STATUSES.OFFER_ACCEPTED,
  HIRING_PROCESS_STATUSES.HIRED,
  HIRING_PROCESS_STATUSES.REJECTED,
  HIRING_PROCESS_STATUSES.DROPPED_OUT,
] as const satisfies readonly HiringProcessStatus[];

/** First 4 of the pipeline: statuses that keep a process "open" */
export const OPEN_STATUSES: readonly HiringProcessStatus[] = HIRING_PROCESS_STATUS_ORDER.slice(0, 4);

/** Last 4 of the pipeline: terminal statuses */
export const CLOSED_STATUSES: readonly HiringProcessStatus[] = HIRING_PROCESS_STATUS_ORDER.slice(4);

/** Index of a status within the pipeline; sort comparator for the Status column */
export function statusPipelineIndex(status: HiringProcessStatus): number {
  return HIRING_PROCESS_STATUS_ORDER.indexOf(status);
}
```

Then fix the transitions table (lines 129-134): replace the `OFFER_MADE` entry with

```ts
  [HIRING_PROCESS_STATUSES.OFFER_MADE]: [
    HIRING_PROCESS_STATUSES.OFFER_ACCEPTED,
    HIRING_PROCESS_STATUSES.REJECTED,
    HIRING_PROCESS_STATUSES.DROPPED_OUT,
    HIRING_PROCESS_STATUSES.ON_HOLD,
  ],
```

(the `// Terminal status` comment on that line goes away; `OFFER_ACCEPTED: []` stays).

- [ ] **Step 4: Run tests** — expect PASS. `bun run check-types` at root — clean (nothing consumes `STATUS_TRANSITIONS["offer-made"]`'s emptiness).

- [ ] **Step 5: Commit** — `feat(domain): pipeline status order + fix offer-made transitions`.

---

### Task 4: Domain — stale rules and age formatting

**Files:**

- Create: `packages/domain/src/constants/stale.ts`
- Modify: `packages/domain/src/constants/index.ts`
- Test: `packages/domain/src/__tests__/stale.test.ts`

**Interfaces:**

- Consumes: `OPEN_STATUSES`, `HiringProcessStatus` (Task 3).
- Produces: `STALE_DAYS = 45`, `staleCutoff(now): Date`, `isStaleProcess(process, now): boolean`, `formatAge(date, now): string` (returns the literal `"today"` or `"4d"`/`"2mo"`/`"1y"`; the UI translates only `"today"`). Used by the Drizzle repo (Tasks 7, 9) and by the web (PR 3/4).

- [ ] **Step 1: Write the failing test** `packages/domain/src/__tests__/stale.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatAge, isStaleProcess, STALE_DAYS, staleCutoff } from "../constants/stale";

const NOW = new Date("2026-08-23T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe("formatAge", () => {
  it("same day is 'today'", () => {
    expect(formatAge(new Date("2026-08-23T01:00:00Z"), NOW)).toBe("today");
  });
  it("days under a month", () => {
    expect(formatAge(daysAgo(4), NOW)).toBe("4d");
    expect(formatAge(daysAgo(29), NOW)).toBe("29d");
  });
  it("months under a year", () => {
    expect(formatAge(daysAgo(30), NOW)).toBe("1mo");
    expect(formatAge(daysAgo(65), NOW)).toBe("2mo");
    expect(formatAge(daysAgo(359), NOW)).toBe("11mo");
  });
  it("a year and beyond never renders '0y'", () => {
    expect(formatAge(daysAgo(360), NOW)).toBe("1y");
    expect(formatAge(daysAgo(800), NOW)).toBe("2y");
  });
  it("future dates clamp to 'today'", () => {
    expect(formatAge(daysAgo(-3), NOW)).toBe("today");
  });
});

describe("isStaleProcess", () => {
  it("open status older than 45 days is stale", () => {
    expect(isStaleProcess({ status: "ongoing", updatedAt: daysAgo(46) }, NOW)).toBe(true);
  });
  it("exactly 45 days is NOT stale (strict >)", () => {
    expect(isStaleProcess({ status: "ongoing", updatedAt: daysAgo(45) }, NOW)).toBe(false);
  });
  it("terminal statuses are never stale", () => {
    expect(isStaleProcess({ status: "hired", updatedAt: daysAgo(400) }, NOW)).toBe(false);
    expect(isStaleProcess({ status: "rejected", updatedAt: daysAgo(400) }, NOW)).toBe(false);
  });
  it("archived processes are never stale", () => {
    expect(
      isStaleProcess({ status: "ongoing", updatedAt: daysAgo(90), archivedAt: daysAgo(10) }, NOW),
    ).toBe(false);
  });
});

describe("staleCutoff", () => {
  it("is exactly STALE_DAYS before now", () => {
    expect(staleCutoff(NOW).getTime()).toBe(NOW.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);
  });
});
```

- [ ] **Step 2: Run it** — expect FAIL (module not found).

- [ ] **Step 3: Implement** `packages/domain/src/constants/stale.ts`:

```ts
import { OPEN_STATUSES } from "./hiring-process-status";
import type { HiringProcessStatus } from "./hiring-process-status";

/**
 * A process is stale when it is active (not archived), in an OPEN status,
 * and its updatedAt is strictly older than STALE_DAYS.
 * Single source for the threshold — DB queries and UI both derive from here.
 */
export const STALE_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The updatedAt cutoff: anything strictly older than this is stale. */
export function staleCutoff(now: Date): Date {
  return new Date(now.getTime() - STALE_DAYS * DAY_MS);
}

export function isStaleProcess(
  process: { status: HiringProcessStatus; updatedAt: Date; archivedAt?: Date | null },
  now: Date,
): boolean {
  if (process.archivedAt) return false;
  if (!OPEN_STATUSES.includes(process.status)) return false;
  return now.getTime() - process.updatedAt.getTime() > STALE_DAYS * DAY_MS;
}

/**
 * Relative age for cards and stale rows: "today" | "4d" | "2mo" | "1y".
 * The UI translates only the "today" literal; suffixed forms render as-is in mono.
 */
export function formatAge(date: Date, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
  if (days < 1) return "today";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.max(1, Math.floor(days / 365))}y`;
}
```

Append `export * from "./stale";` to `packages/domain/src/constants/index.ts`.

- [ ] **Step 4: Run tests** — expect PASS.

- [ ] **Step 5: Commit** — `feat(domain): stale threshold, isStaleProcess and formatAge`.

---

### Task 5: Domain — schemas, types and repository capability interface

**Files:**

- Modify: `packages/domain/src/schemas/hiring-process.ts` (base schema + type re-exports untouched)
- Modify: `packages/domain/src/schemas/pagination.ts`
- Modify: `packages/domain/src/schemas/index.ts` (barrel: add new named exports)
- Modify: `packages/domain/src/types/api-response.ts`
- Modify: `packages/domain/src/repositories/hiring-process.repository.ts`

**Interfaces:**

- Consumes: Task 2 constants.
- Produces (relied on by Tasks 7–9 and PR 2):
  - `HiringProcessBase` gains `archivedAt?: Date | null`, `archiveReason?: ArchiveReason | null`.
  - `hiringProcessListQuerySchema` / `HiringProcessListQuery` (list endpoint contract for PR 2).
  - `HiringProcessFilterParams` gains `scope?`, `stale?`; new `HiringProcessSortParams { sort?, dir? }`, `HiringProcessCounts { active, archived, open, closed, stale }`; `ApiResponse.meta` gains `counts?`.
  - `IHiringProcessArchiveRepository { archive(id, userId, reason): Promise<HiringProcessBase | null>; restore(id, userId): Promise<HiringProcessBase | null>; counts(userId): Promise<HiringProcessCounts>; findBoard(userId, filters?): Promise<HiringProcessBase[]> }` — **separate interface** so `infra-prisma-db` keeps compiling (spec D1).
  - `IHiringProcessRepository.findPaginated` gains optional 4th param `sort?: HiringProcessSortParams` (implementations with fewer params remain assignable — Prisma untouched).

- [ ] **Step 1: Base schema.** In `packages/domain/src/schemas/hiring-process.ts`, extend the import on line 2 to include `ARCHIVE_REASON_VALUES`, and inside `hiringProcessBaseSchema` after `deletedAt` (line 20) add:

```ts
  archivedAt: z.coerce.date().nullable().optional(), // null = active; orthogonal to status
  archiveReason: z.enum(ARCHIVE_REASON_VALUES).nullable().optional(), // set iff archivedAt is set
```

(`createHiringProcessSchema` uses `.pick` — creation is unaffected.)

- [ ] **Step 2: List query schema.** In `packages/domain/src/schemas/pagination.ts`, import from `../constants/hiring-process-query` and append:

```ts
import {
  HIRING_PROCESS_SCOPE_VALUES,
  HIRING_PROCESS_SORT_FIELD_VALUES,
  SORT_DIRECTION_VALUES,
} from "../constants/hiring-process-query";

/**
 * Full list query for the dashboard: pagination + filters + scope/stale/sort.
 * Defaults reproduce today's behavior (scope active, updatedAt desc).
 */
export const hiringProcessListQuerySchema = hiringProcessQuerySchema.extend({
  scope: z.enum(HIRING_PROCESS_SCOPE_VALUES).default("active").optional(),
  stale: z
    .union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")])
    .optional(),
  sort: z.enum(HIRING_PROCESS_SORT_FIELD_VALUES).optional(),
  dir: z.enum(SORT_DIRECTION_VALUES).optional(),
});

export type HiringProcessListQuery = z.infer<typeof hiringProcessListQuerySchema>;
```

Add `hiringProcessListQuerySchema` and `HiringProcessListQuery` to the explicit named re-exports in `packages/domain/src/schemas/index.ts` (this barrel re-exports by name, not `*`).

- [ ] **Step 3: Types.** In `packages/domain/src/types/api-response.ts`: extend the line-1 import to `import type { ArchiveReason, HiringProcessScope, HiringProcessSortField, HiringProcessStatus, SortDirection } from "../constants";` (drop `ArchiveReason` if the compiler flags it unused). Extend `HiringProcessFilterParams` (lines 36-41) with:

```ts
  /** default "active" — the repository applies archived_at IS NULL unless "archived" */
  scope?: HiringProcessScope;
  /** active scope only: OPEN status + updated_at older than STALE_DAYS */
  stale?: boolean;
```

Append:

```ts
/**
 * Sort parameters for hiring process lists
 */
export interface HiringProcessSortParams {
  sort?: HiringProcessSortField;
  dir?: SortDirection;
}

/**
 * Global per-user counters, independent of active filters
 */
export interface HiringProcessCounts {
  active: number;
  archived: number;
  open: number;
  closed: number;
  stale: number;
}
```

And in `ApiResponse.meta` (lines 10-12) add `counts?: HiringProcessCounts;` next to `pagination?`.

- [ ] **Step 4: Repository interfaces.** In `packages/domain/src/repositories/hiring-process.repository.ts`: add `sort?: HiringProcessSortParams` as 4th param of `findPaginated` (import the type), and append:

```ts
import type { ArchiveReason } from "../constants";
import type {
  HiringProcessCounts,
  HiringProcessSortParams,
} from "../types/api-response";

/**
 * Archive/board capabilities — a SEPARATE interface so the frozen Prisma
 * implementation keeps satisfying IHiringProcessRepository untouched.
 * The Drizzle repository implements both.
 */
export interface IHiringProcessArchiveRepository {
  /**
   * Set archivedAt + archiveReason. MUST NOT modify status or updatedAt.
   * @returns the updated process, or null if not found / already archived / soft-deleted
   */
  archive(id: string, userId: string, reason: ArchiveReason): Promise<HiringProcessBase | null>;

  /**
   * Clear archivedAt + archiveReason. MUST NOT modify status or updatedAt.
   * @returns the updated process, or null if not found / not archived / soft-deleted
   */
  restore(id: string, userId: string): Promise<HiringProcessBase | null>;

  /** Global per-user counters (active, archived, open, closed, stale) in ONE query */
  counts(userId: string): Promise<HiringProcessCounts>;

  /** All active processes for the board, updatedAt desc, optional salary filters */
  findBoard(
    userId: string,
    filters?: Pick<HiringProcessFilterParams, "salaryDeclared" | "salaryMin" | "salaryMax">,
  ): Promise<HiringProcessBase[]>;
}
```

- [ ] **Step 5: Verify** — `bun run check-types` at root must pass **including `infra-prisma-db`** (proves the optional param + separate interface strategy). `bun run test` in domain still green.

- [ ] **Step 6: Commit** — `feat(domain): archive fields, list query contract and archive repository interface`.

---

### Task 6: infra-db — pglite test harness

**Files:**

- Modify: `packages/infra-db/package.json` (devDeps + test script)
- Create: `packages/infra-db/vitest.config.ts`
- Create: `packages/infra-db/src/__tests__/helpers/test-db.ts`

**Interfaces:**

- Consumes: `packages/infra-db/src/schema` barrel, `drizzle-kit/api` (drizzle-kit ^0.31.8 already a devDep).
- Produces: `createTestDb(): Promise<{ db, close }>` (schema pushed into an in-memory Postgres, users `user-1`/`user-2` seeded) and `makeProcess(overrides)` insert-row factory. Used by Tasks 7–9. **Real Neon is never touched by tests.**

- [ ] **Step 1: Dependencies.** In `packages/infra-db/package.json` add to `devDependencies`: `"@electric-sql/pglite": "^0.3.0"`, `"vitest": "^2.1.0"`; add script `"test": "vitest run"`. Run `bun install`.

- [ ] **Step 2: Vitest config** `packages/infra-db/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    name: "infra-db",
    testTimeout: 20000, // pglite schema push on first run
  },
});
```

- [ ] **Step 3: Harness** `packages/infra-db/src/__tests__/helpers/test-db.ts`:

```ts
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { apply } = await pushSchema(schema, db as any);
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
```

> If `pushSchema` from `drizzle-kit/api` fails at runtime (it is a semi-public API), fall back to executing the DDL from a one-off `bunx drizzle-kit generate` output as a raw string in the helper — do not silently skip tests.

- [ ] **Step 4: Smoke test the harness** — temporary test inserting one `makeProcess()` row and reading it back via `db.query.hiringProcessTable.findFirst()`; run `bun run test` in `packages/infra-db`, expect PASS; fold this file into Task 7's test file (delete the standalone smoke).

- [ ] **Step 5: Commit** — `test(db): pglite harness for repository integration tests`.

---

### Task 7: infra-db — enum, columns, index, CHECK, mapper

**Files:**

- Create: `packages/infra-db/src/enums/archive-reason.ts`
- Modify: `packages/infra-db/src/enums/index.ts`
- Modify: `packages/infra-db/src/schema/hiring-process.ts`
- Modify: `packages/infra-db/src/mappers/hiring-process.mapper.ts`
- Test: `packages/infra-db/src/__tests__/hiring-process-schema.test.ts`

**Interfaces:**

- Consumes: `ARCHIVE_REASON_VALUES` (Task 2), harness (Task 6).
- Produces: `archiveReasonEnum`; `hiringProcessTable.archivedAt` / `.archiveReason` columns; CHECK `hiring_process_archive_consistency`; index `hiring_process_user_archived_idx`; mapper passes both fields through. Tasks 8–9 build on these columns.

- [ ] **Step 1: Write the failing test** `packages/infra-db/src/__tests__/hiring-process-schema.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
      where: (t, { eq }) => eq(t.id, row.id),
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
        .where((await import("drizzle-orm")).eq(hiringProcessTable.id, row.id)),
    ).rejects.toThrow();
  });

  it("mapper round-trips archive fields", () => {
    const archivedAt = new Date("2026-08-01T00:00:00Z");
    const domain = HiringProcessMapper.toDomain({
      id: "x", userId: "user-1", companyName: "A", jobTitle: null,
      status: "ongoing", salary: null, currency: "USD", salaryRateType: "monthly",
      createdAt: archivedAt, updatedAt: archivedAt, deletedAt: null,
      archivedAt, archiveReason: "no-reply",
    });
    expect(domain.archivedAt).toEqual(archivedAt);
    expect(domain.archiveReason).toBe("no-reply");
    expect(HiringProcessMapper.toPersistence(domain).archiveReason).toBe("no-reply");
  });
});
```

(Use a top-level `import { eq } from "drizzle-orm"` instead of the inline dynamic import — written inline above only for brevity; the file should import normally.)

- [ ] **Step 2: Run it** — expect FAIL (columns don't exist).

- [ ] **Step 3: Implement.**

`packages/infra-db/src/enums/archive-reason.ts` (mirror `enums/hiring-process-status.ts`):

```ts
import { pgEnum } from "drizzle-orm/pg-core";
import { ARCHIVE_REASON_VALUES } from "@interviews-tool/domain/constants";

export const archiveReasonEnum = pgEnum("archive_reason", ARCHIVE_REASON_VALUES);
```

Add `export * from "./archive-reason";` to `packages/infra-db/src/enums/index.ts`.

`packages/infra-db/src/schema/hiring-process.ts`: change the pg-core import to `import { text, integer, index, timestamp, check } from "drizzle-orm/pg-core";`, change line 1 to `import { relations, sql } from "drizzle-orm";`, import `archiveReasonEnum` from `../enums`, then after `salaryRateType` (line 19) add:

```ts
    archivedAt: timestamp("archived_at"), // null = active; orthogonal to status AND deletedAt
    archiveReason: archiveReasonEnum("archive_reason"), // set iff archivedAt is set (CHECK below)
```

and extend the extras array (lines 25-29) with:

```ts
    index("hiring_process_user_archived_idx").on(table.userId, table.archivedAt),
    check(
      "hiring_process_archive_consistency",
      sql`(${table.archivedAt} IS NULL) = (${table.archiveReason} IS NULL)`,
    ),
```

`packages/infra-db/src/mappers/hiring-process.mapper.ts`: add to `toDomain` (after `deletedAt: row.deletedAt,`):

```ts
      archivedAt: row.archivedAt,
      archiveReason: row.archiveReason,
```

and to `toPersistence` (after `deletedAt: hiringProcess.deletedAt,`):

```ts
      archivedAt: hiringProcess.archivedAt,
      archiveReason: hiringProcess.archiveReason,
```

- [ ] **Step 4: Run tests** — expect PASS (pushSchema picks the new columns + CHECK automatically). `bun run check-types` at root — clean.

- [ ] **Step 5: Commit** — `feat(db): archived_at + archive_reason columns, CHECK and index`.

---

### Task 8: infra-db — archive / restore repository methods (invariants I1–I2)

**Files:**

- Modify: `packages/infra-db/src/repositories/hiring-process.repository.ts`
- Test: `packages/infra-db/src/__tests__/hiring-process-archive.test.ts`

**Interfaces:**

- Consumes: `IHiringProcessArchiveRepository` (Task 5), columns (Task 7), harness (Task 6).
- Produces: `HiringProcessRepository.archive/restore` exactly as the domain interface declares. Also fixes `update()` to exclude soft-deleted rows (spec hallazgo 5).

- [ ] **Step 1: Write the failing test** `packages/infra-db/src/__tests__/hiring-process-archive.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
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

async function insertProcess(overrides = {}) {
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
```

- [ ] **Step 2: Run it** — expect FAIL (`archive` is not a function).

- [ ] **Step 3: Implement.** In `packages/infra-db/src/repositories/hiring-process.repository.ts`:

Declare the class as `implements IHiringProcessRepository, IHiringProcessArchiveRepository` (import the new interface and `ArchiveReason` type from domain). Add `isNull(hiringProcessTable.deletedAt)` to the `where` of `update()` (line 143). Then add:

```ts
  /**
   * Archive: sets archivedAt + archiveReason and NOTHING else.
   * updatedAt is pinned to itself to defeat the schema-level $onUpdate (invariant I2).
   * Returns null if not found, not owned, soft-deleted, or already archived.
   */
  async archive(
    id: string,
    userId: string,
    reason: ArchiveReason,
  ): Promise<HiringProcessBase | null> {
    const [updated] = await this.db
      .update(hiringProcessTable)
      .set({
        archivedAt: new Date(),
        archiveReason: reason,
        updatedAt: sql`${hiringProcessTable.updatedAt}`,
      })
      .where(
        and(
          eq(hiringProcessTable.id, id),
          eq(hiringProcessTable.userId, userId),
          isNull(hiringProcessTable.deletedAt),
          isNull(hiringProcessTable.archivedAt),
        ),
      )
      .returning();

    return updated ? HiringProcessMapper.toDomain(updated) : null;
  }

  /**
   * Restore: clears archivedAt + archiveReason, preserves updatedAt (invariant I2)
   * so the process returns to its previous position in updatedAt ordering.
   */
  async restore(id: string, userId: string): Promise<HiringProcessBase | null> {
    const [updated] = await this.db
      .update(hiringProcessTable)
      .set({
        archivedAt: null,
        archiveReason: null,
        updatedAt: sql`${hiringProcessTable.updatedAt}`,
      })
      .where(
        and(
          eq(hiringProcessTable.id, id),
          eq(hiringProcessTable.userId, userId),
          isNull(hiringProcessTable.deletedAt),
          isNotNull(hiringProcessTable.archivedAt),
        ),
      )
      .returning();

    return updated ? HiringProcessMapper.toDomain(updated) : null;
  }
```

- [ ] **Step 4: Run tests** — expect PASS. The `updatedAt.getTime()` equality assertions are the proof that the `$onUpdate` defeat works; if they fail, the `updatedAt: sql\`...\`` line is being dropped — do not "fix" the test by loosening it.

- [ ] **Step 5: Commit** — `feat(db): archive/restore repository methods preserving status and updatedAt`.

---

### Task 9: infra-db — scope/stale/sort in findPaginated + counts + findBoard (I4, I5)

**Files:**

- Modify: `packages/infra-db/src/repositories/hiring-process.repository.ts`
- Test: `packages/infra-db/src/__tests__/hiring-process-query.test.ts`

**Interfaces:**

- Consumes: Tasks 3–5 constants/types, Task 7 columns.
- Produces: `findPaginated(userId, params, filters?, sort?)` honoring `scope` (default active), `stale`, `sort`/`dir` (status by pipeline order via `array_position`); `counts(userId)` (one aggregated query); `findBoard(userId, filters?)`. PR 2's use cases call these verbatim.

- [ ] **Step 1: Write the failing test** `packages/infra-db/src/__tests__/hiring-process-query.test.ts`:

```ts
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
    makeProcess({ companyName: "Stale FirstContact", status: "first-contact", updatedAt: daysAgo(60) }),
    makeProcess({ companyName: "Old Hired", status: "hired", updatedAt: daysAgo(200) }), // terminal: never stale
    makeProcess({ companyName: "Dropped", status: "dropped-out", updatedAt: daysAgo(5) }),
    makeProcess({ companyName: "Archived NoReply", status: "ongoing", updatedAt: daysAgo(90),
      archivedAt: daysAgo(10), archiveReason: "no-reply" }),
    makeProcess({ companyName: "Archived Rejected", status: "rejected", updatedAt: daysAgo(120),
      archivedAt: daysAgo(3), archiveReason: "they-passed" }),
    makeProcess({ companyName: "Foreign", userId: "user-2", status: "ongoing" }),
    makeProcess({ companyName: "Soft Deleted", status: "ongoing", deletedAt: new Date(),
      archivedAt: daysAgo(1), archiveReason: "role-closed" }),
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
    const result = await repo.findPaginated("user-1", { page: 1, limit: 50 }, { scope: "archived" });
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
    const result = await repo.findPaginated(
      "user-1",
      { page: 1, limit: 50 },
      undefined,
      { sort: "status", dir: "asc" },
    );
    // pipeline: first-contact < ongoing < hired < dropped-out
    expect(result.data.map((p) => p.status)).toEqual([
      "first-contact",
      "ongoing",
      "hired",
      "dropped-out",
    ]);
  });

  it("companyName asc", async () => {
    const result = await repo.findPaginated(
      "user-1",
      { page: 1, limit: 50 },
      undefined,
      { sort: "companyName", dir: "asc" },
    );
    const names = result.data.map((p) => p.companyName);
    expect(names).toEqual([...names].sort());
  });
});

describe("counts", () => {
  it("one call returns all five global counters", async () => {
    expect(await repo.counts("user-1")).toEqual({
      active: 4,   // Fresh Ongoing, Stale FirstContact, Old Hired, Dropped
      archived: 2,
      open: 2,     // Fresh Ongoing, Stale FirstContact
      closed: 2,   // Old Hired, Dropped
      stale: 1,    // Stale FirstContact (Old Hired is terminal — never stale)
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
```

- [ ] **Step 2: Run it** — expect FAIL (scope ignored, `counts` missing).

- [ ] **Step 3: Implement.** In the repository:

Imports from domain constants: `HIRING_PROCESS_STATUS_ORDER, OPEN_STATUSES, staleCutoff` and types `HiringProcessSortField, HiringProcessSortParams, HiringProcessCounts`. Add drizzle imports `asc, lt`.

Split the salary logic out of `buildFilterConditions` and add scope/stale handling:

```ts
  private buildSalaryConditions(
    filters?: Pick<HiringProcessFilterParams, "salaryDeclared" | "salaryMin" | "salaryMax">,
  ): SQL[] {
    const conditions: SQL[] = [];
    if (filters?.salaryDeclared === true) {
      conditions.push(isNotNull(hiringProcessTable.salary));
      // Also exclude zero since it effectively means "not declared"
      conditions.push(sql`${hiringProcessTable.salary} > 0`);
    } else if (filters?.salaryDeclared === false) {
      conditions.push(or(isNull(hiringProcessTable.salary), eq(hiringProcessTable.salary, 0))!);
    }
    if (filters?.salaryMin != null) {
      conditions.push(gte(hiringProcessTable.salary, filters.salaryMin));
    }
    if (filters?.salaryMax != null) {
      conditions.push(lte(hiringProcessTable.salary, filters.salaryMax));
    }
    return conditions;
  }

  private buildFilterConditions(filters?: HiringProcessFilterParams): SQL[] {
    const conditions: SQL[] = [];

    // Scope is not opt-in: active (the default) must always exclude archived (I4)
    if (filters?.scope === "archived") {
      conditions.push(isNotNull(hiringProcessTable.archivedAt));
    } else {
      conditions.push(isNull(hiringProcessTable.archivedAt));

      if (filters?.stale) {
        conditions.push(inArray(hiringProcessTable.status, [...OPEN_STATUSES]));
        conditions.push(lt(hiringProcessTable.updatedAt, staleCutoff(new Date())));
      }
    }

    if (filters?.statuses && filters.statuses.length > 0) {
      conditions.push(inArray(hiringProcessTable.status, filters.statuses));
    }

    conditions.push(...this.buildSalaryConditions(filters));
    return conditions;
  }
```

Sort resolution (status sorts by pipeline position — I5):

```ts
  private sortExpression(field: HiringProcessSortField): SQL | typeof hiringProcessTable.updatedAt {
    switch (field) {
      case "companyName":
        return sql`${hiringProcessTable.companyName}`;
      case "jobTitle":
        return sql`${hiringProcessTable.jobTitle}`;
      case "salary":
        return sql`${hiringProcessTable.salary}`;
      case "archivedAt":
        return sql`${hiringProcessTable.archivedAt}`;
      case "status":
        return sql`array_position(ARRAY[${sql.join(
          HIRING_PROCESS_STATUS_ORDER.map((s) => sql`${s}`),
          sql`, `,
        )}]::text[], ${hiringProcessTable.status}::text)`;
      case "updatedAt":
        return hiringProcessTable.updatedAt;
    }
  }
```

In `findPaginated`, add the 4th param `sort?: HiringProcessSortParams` and replace the hardcoded `.orderBy(desc(hiringProcessTable.updatedAt))` with:

```ts
    const sortField: HiringProcessSortField =
      sort?.sort ?? (filters?.scope === "archived" ? "archivedAt" : "updatedAt");
    const sortDir =
      sort?.dir ?? (sortField === "updatedAt" || sortField === "archivedAt" ? "desc" : "asc");
    const orderExpr = this.sortExpression(sortField);
```

and `.orderBy(sortDir === "asc" ? asc(orderExpr) : desc(orderExpr))`.

New methods:

```ts
  /** Global per-user counters in ONE aggregated query (COUNT FILTER) */
  async counts(userId: string): Promise<HiringProcessCounts> {
    const openList = sql.join(
      OPEN_STATUSES.map((s) => sql`${s}`),
      sql`, `,
    );
    const cutoff = staleCutoff(new Date());

    const [row] = await this.db
      .select({
        active: sql<number>`count(*) filter (where ${hiringProcessTable.archivedAt} is null)`,
        archived: sql<number>`count(*) filter (where ${hiringProcessTable.archivedAt} is not null)`,
        open: sql<number>`count(*) filter (where ${hiringProcessTable.archivedAt} is null and ${hiringProcessTable.status}::text in (${openList}))`,
        closed: sql<number>`count(*) filter (where ${hiringProcessTable.archivedAt} is null and ${hiringProcessTable.status}::text not in (${openList}))`,
        stale: sql<number>`count(*) filter (where ${hiringProcessTable.archivedAt} is null and ${hiringProcessTable.status}::text in (${openList}) and ${hiringProcessTable.updatedAt} < ${cutoff})`,
      })
      .from(hiringProcessTable)
      .where(and(eq(hiringProcessTable.userId, userId), isNull(hiringProcessTable.deletedAt)));

    return {
      active: Number(row?.active ?? 0),
      archived: Number(row?.archived ?? 0),
      open: Number(row?.open ?? 0),
      closed: Number(row?.closed ?? 0),
      stale: Number(row?.stale ?? 0),
    };
  }

  /** All active processes for the board (grouping into columns happens in the use case) */
  async findBoard(
    userId: string,
    filters?: Pick<HiringProcessFilterParams, "salaryDeclared" | "salaryMin" | "salaryMax">,
  ): Promise<HiringProcessBase[]> {
    const rows = await this.db
      .select()
      .from(hiringProcessTable)
      .where(
        and(
          eq(hiringProcessTable.userId, userId),
          isNull(hiringProcessTable.deletedAt),
          isNull(hiringProcessTable.archivedAt),
          ...this.buildSalaryConditions(filters),
        ),
      )
      .orderBy(desc(hiringProcessTable.updatedAt));

    return rows.map((row) => HiringProcessMapper.toDomain(row));
  }
```

- [ ] **Step 4: Run tests** — expect PASS (whole infra-db suite: schema + archive + query). Then root `bun run check-types` and `bun run lint` — clean. **Note:** existing callers pass no `filters`, and the new default (`archived_at IS NULL`) matches today's data (all rows have `archivedAt = null` until the UI ships) — behavior is unchanged for the live app.

- [ ] **Step 5: Commit** — `feat(db): scope/stale/sort in findPaginated, counts and findBoard`.

---

### Task 10: Apply to Neon + full verification

**Files:**

- No source changes. Runs `db:push` against the real database.

**Interfaces:**

- Consumes: everything above.
- Produces: live DB with the new columns; the branch ready for PR.

- [ ] **Step 1: Push the schema.** From repo root: `bun run db:push` (dotenvx loads `apps/server/.env`). This is **additive** (2 nullable columns, 1 enum, 1 index, 1 CHECK) — review the statements drizzle prints; there must be NO drops. If drizzle-kit reports it cannot create the CHECK, apply it manually via `db:studio`/SQL and note it in the PR description; the repo methods already guarantee I1 regardless.
- [ ] **Step 2: Verify against Neon.** Run `bun run dev:server` briefly and hit `GET /api/v1/hiring-processes` (or run the existing app) to confirm the list still returns rows (mapper + new columns round-trip on the neon-http driver, not just pglite).
- [ ] **Step 3: Full suite.** Root: `bun run test`, `bun run check-types`, `bun run lint`, `bun run build`. All green — including `infra-prisma-db` compiling untouched.
- [ ] **Step 4: Commit anything pending and stop.** Do NOT push or open the PR without the user's go-ahead (their `gh` multi-account setup: this repo uses `github-personal` → `csdev19`).

---

## Self-Review Notes

- Spec coverage: I1 (Task 7 CHECK + Task 8), I2 (Task 8 timestamps assertions), I3 (Task 8 update regression), I4 (Task 9 scope), I5 (Task 9 status sort), I6 (Task 8 soft-delete fix + fixtures excluding `Soft Deleted` everywhere). Counts/stale/board contracts for PR 2: Task 9. Domain vocabulary for PRs 2–4: Tasks 2–5.
- Deliberately out of PR 1 (spec §6): use cases, Elysia routes, serverFns, anything web/i18n.
- Type-consistency check: `archive(id, userId, reason)` / `restore(id, userId)` / `counts(userId)` / `findBoard(userId, filters?)` match between Task 5 (interface) and Tasks 8–9 (implementation); `findPaginated` 4th param `sort?: HiringProcessSortParams` matches Task 9's usage `{ sort, dir }`.
