# Tech spec FINAL — Board view + Archive

**Project:** Tapuy · `/hiring-processes`
**Audit date:** 2026-08-23 (evidence with `file:line` against `main` @ `d6648c3`)
**Design inputs (UX source of truth):** BUILD-spec (board + archived, pasted in conversation), Dashboard v2 screenshots, `documentation/tapuy-theme.css`, `documentation/DESIGN.md`
**Status:** closed. Q1–Q10 from the draft are answered with evidence; the decisions live in §8.

> This document replaces the draft. Where the draft assumed something the code contradicts, this version rules.

---

## 0. Context corrections — the real stack

The draft assumed several things that aren't true. Everything else is built on this table:

| The draft assumed                  | The reality is                                                                                                                         | Evidence                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend **Hono** + `zValidator`    | **Elysia** on Cloudflare Workers; validation passes zod schemas directly to `query`/`body` (standard-schema) and `t.Object` for params | `apps/server/src/index.ts:2`, `apps/server/src/routes/hiring-processes.ts:74,118,143`                                                        |
| A single data path                 | **Two paths**: list reads via TanStack serverFn → **Prisma** (marked TEMP), mutations via Eden Treaty → proxy → Elysia → **Drizzle**   | `apps/web/src/functions/get-hiring-processes.ts:27-28`, `apps/web/src/lib/client-treaty.ts:4`, `apps/web/src/routes/api/v1/$.ts:12-53`       |
| Reversible migrations              | **There are no migrations.** The flow is `bun run db:push` (drizzle-kit push) against Neon. `out: ./src/migrations` has never existed  | `packages/infra-db/drizzle.config.ts:8`, `README.md:107-110`                                                                                 |
| An existing server-side sort       | **No sort parameter exists.** Order is hardcoded `updatedAt DESC`; the table's sort is client-side over the current page               | `packages/infra-db/src/repositories/hiring-process.repository.ts:102`, `hiring-process-table.tsx` (`getSortedRowModel` + `manualPagination`) |
| Filters/sort/page in the URL       | **Nothing is in the URL.** Everything is local `useState`; the app's only `validateSearch` is `$id.tsx:42-44` (`{ live }`)             | `apps/web/src/routes/_authenticated/hiring-processes/index.tsx:72-93`                                                                        |
| `PATCH /processes/:id`             | There is no PATCH anywhere in the codebase; update is a full-body `PUT`                                                                | `apps/server/src/routes/hiring-processes.ts:123-146`                                                                                         |
| Server-side `counts`               | The header fires **3 requests** (list + 2 counts with `limit:1`)                                                                       | `index.tsx:106-118`                                                                                                                          |
| Popover with floating-ui or native | **Base UI** (`@base-ui/react`): `dialog`, `alert-dialog`, `dropdown-menu` (Menu+Positioner), `select` already in `packages/web-ui`     | `packages/web-ui/src/components/*.tsx`                                                                                                       |
| A toast system still to be decided | **Sonner** is already wired up, with precedent for `action`                                                                            | `packages/web-ui/src/components/sonner.tsx`, `apps/web/src/lib/query-client.ts:6-16`                                                         |
| Strings directly in English        | The app is **internationalized (en + es)** with `use-intl`; the parity test fails if a key is missing from either                      | `packages/i18n/messages/{en,es}.json`, `packages/i18n/src/__tests__/parity.test.ts:28-41`                                                    |
| An existing theme toggle           | `data-theme="dark"` is **hardcoded**; light tokens are complete but unreachable                                                        | `apps/web/src/routes/__root.tsx:115`, `packages/web-ui/src/styles.css:94-139`                                                                |
| Integration tests available        | The only package with tests is `packages/i18n` (vitest). There is no root `test` script or turbo task                                  | `packages/i18n/vitest.config.ts`, `package.json:29-51`                                                                                       |

Other hard facts: monorepo **Bun workspaces + Turborepo**, packages built with **tsdown**, lint **oxlint** / format **oxfmt**, the entity is called **HiringProcess** (not "Process"), and **soft-delete** already exists via `deletedAt` — `archived` will be the _third_ orthogonal flag, and every query must keep filtering on `deleted_at IS NULL`.

---

## 1. Q1–Q10 — answered with evidence

| #       | Question                                        | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1**  | Auto-update of `updatedAt`?                     | **Yes, doubly so.** (a) `$onUpdate(() => new Date())` in the schema (`packages/infra-db/src/utils/timestamps.ts:13-20`); (b) manual assignment `updatedAt: new Date()` in `repository.update()` (`hiring-process.repository.ts:135-138`). There's no DB trigger. **Consequence:** `archive`/`restore` will be dedicated repo methods that pass an explicit `updatedAt: sql\`updated_at\``in the`.set()`— an explicit value beats`$onUpdate`, so I2 holds without touching the shared helper. |
| **Q2**  | A cap on the board?                             | **No cap.** Personal tool, dozens of processes; the board requests everything active in one query. The per-column pagination contract is documented (§3) but not implemented and not enforced with a 413.                                                                                                                                                                                                                                                                                    |
| **Q3**  | Does move's undo restore the exact `updatedAt`? | **No.** The undo is another status change and advances `updatedAt` (the draft's proposal, accepted). Symmetrically: restore's undo re-archives with a new `archivedAt = now()`, not the original. Only archive's undo (= restore) is an exact revert, because restore doesn't touch `updatedAt`.                                                                                                                                                                                             |
| **Q4**  | A toast system?                                 | **Sonner already exists and supports `action` + `duration`.** It's extended with the Undo pattern (5000 ms). No library is added.                                                                                                                                                                                                                                                                                                                                                            |
| **Q5**  | Touch/mobile on the board?                      | **Yes: mobile = `⋯` menu only.** Native HTML5 DnD doesn't fire on touch, and no library is added.                                                                                                                                                                                                                                                                                                                                                                                            |
| **Q6**  | Popover/dialog primitives?                      | **Base UI.** `MoveMenu` = `DropdownMenu` (Base UI Menu + Positioner, already with roving focus and Escape). `ArchiveDialog` = the existing `AlertDialog` (precedent: `delete-confirm-dialog.tsx`). Zero new dependencies.                                                                                                                                                                                                                                                                    |
| **Q7**  | Delete on archived items?                       | **Yes**, same flow as today (`delete-confirm-dialog.tsx` + soft-delete). A deleted archived item disappears from Archived (every query filters on `deletedAt IS NULL`).                                                                                                                                                                                                                                                                                                                      |
| **Q8**  | `counts` in the detail view?                    | **Not in this phase** (confirmed; the detail view doesn't need them).                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Q9**  | Rate limit on moves?                            | **None.** Cheap mutations, a single user.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Q10** | Multi-currency in min/max?                      | **Filters on the raw value as it does today** (`salaryMin/salaryMax` over the `salary` integer, with no normalization of `/mo` vs `/hr` vs `/yr`). Note: today only `monthly` and `hourly` exist (`SALARY_RATE_TYPES`); the mock's `/yr` **doesn't exist** in the model — the Northwind card showing `$68,000 / yr` is aspirational in the mock, not in the data.                                                                                                                            |

### Extra findings the draft didn't see

1. **The domain's status order isn't the pipeline's.** `HIRING_PROCESS_STATUS_VALUES` (which feeds the pgEnum — must not be reordered) and `HIRING_PROCESS_STATUS_INFO[x].order` put `rejected=4 … offer-made=7, offer-accepted=8`. A new constant `HIRING_PROCESS_STATUS_ORDER` is added with the spec's pipeline order; INFO's `order` stays intact so as not to break consumers.
2. **The categories already match the spec.** `category: "active"` = exactly OPEN (`first-contact, ongoing, on-hold, offer-made`) and `"terminal"` = CLOSED. No categories need migrating.
3. **Bug in `STATUS_TRANSITIONS`**: `offer-made → []` ("Terminal status") and nothing transitions to `offer-accepted` (`hiring-process-status.ts:129-134`). The board allows moving to any status, so the move endpoint does **not** validate transitions; the table is fixed along the way so it stops lying.
4. **`PUT /hiring-processes/:id` can unintentionally null out `salary`/`jobTitle`**: `updateHiringProcessSchema === createHiringProcessSchema` and the Drizzle repo spreads `undefined` keys (`update-hiring-process.ts:14-30`). Known, out of scope; the new `PATCH :id/status` doesn't go through there.
5. **`repository.update()` doesn't filter `deletedAt IS NULL`** (`hiring-process.repository.ts:143`), unlike `findById`/`delete`. Fixed in PR 1 (one line) because the new methods do filter it and the inconsistency would become visible.
6. **`hiringProcessKeys` isn't exported** from `use-hiring-processes.ts:40-46` — the board needs cache surgery; it gets exported.
7. **No optimistic mutation exists anywhere in the repo** — `useReversibleMutation` introduces the first `onMutate/cancelQueries/onSettled` pattern.
8. **i18n:** every new string from the BUILD-spec (dialogs, stale strip, empty states, legend, toasts, "today") goes into `en.json` **and** `es.json` + `bun run generate:types` in `packages/i18n`, or the parity test breaks.

---

## 2. Final data model

### 2.1 Domain (`packages/domain`) — single source of truth

```ts
// constants/hiring-process-status.ts (ADDED; HIRING_PROCESS_STATUS_VALUES is untouched)
export const HIRING_PROCESS_STATUS_ORDER = [
  "first-contact", "ongoing", "on-hold", "offer-made",
  "offer-accepted", "hired", "rejected", "dropped-out",
] as const satisfies readonly HiringProcessStatus[];
export const OPEN_STATUSES = HIRING_PROCESS_STATUS_ORDER.slice(0, 4);   // === category "active"
export const CLOSED_STATUSES = HIRING_PROCESS_STATUS_ORDER.slice(4);    // === category "terminal"
export function statusPipelineIndex(s: HiringProcessStatus): number;    // sort criterion for the Status column

// constants/archive-reason.ts (new)
export const ARCHIVE_REASONS = { NO_REPLY: "no-reply", THEY_PASSED: "they-passed",
  I_WITHDREW: "i-withdrew", ROLE_CLOSED: "role-closed" } as const;

// constants/stale.ts (new)
export const STALE_DAYS = 45;
export function isStaleProcess(p: { status; updatedAt; archivedAt? }, now: Date): boolean; // OPEN + !archived + >45d
export function formatAge(date: Date, now: Date): string;  // "today" | "4d" | "2mo" | "1y" — the UI only translates "today"
```

`hiringProcessBaseSchema` gains `archivedAt: z.coerce.date().nullable().optional()` and `archiveReason: z.enum(ARCHIVE_REASON_VALUES).nullable().optional()` (same pattern as `deletedAt`).

### 2.2 DB (`packages/infra-db`, table `interviews_tool_hiring_process`)

```ts
archivedAt: timestamp("archived_at"),                 // null = active
archiveReason: archiveReasonEnum("archive_reason"),   // pgEnum "archive_reason", null unless archived
```

- New index: `hiring_process_user_archived_idx` on `(user_id, archived_at)`. With volumes of dozens of rows, the draft's partial indexes aren't added (YAGNI).
- **CHECK** `(archived_at IS NULL) = (archive_reason IS NULL)` via drizzle's `check()` (the repo's first CHECK; drizzle-kit 0.31 supports it on push). If `db:push` doesn't apply it cleanly, the invariant is still guaranteed by the repo methods (the only write path).
- **No migration**: applied with `bun run db:push` (additive: two nullable columns + enum + index). Rollback = revert the schema and push again.
- `packages/infra-prisma-db/prisma/schema.prisma` stays out of date until a `db:pull`; see decision D1.

### 2.3 Invariants (with their real mechanism)

| #   | Rule                                                | Mechanism                                                                                                                          |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| I1  | `archivedAt IS NULL ⇔ archiveReason IS NULL`        | CHECK in the DB + the `archive`/`restore` methods always write both                                                                |
| I2  | Archive/restore don't touch `status` or `updatedAt` | Dedicated methods with an explicit `updatedAt: sql\`updated_at\``(defeats`$onUpdate`); they never go through `repository.update()` |
| I3  | Changing status does update `updatedAt`             | Move uses the existing `repository.update()` (manual + `$onUpdate`)                                                                |
| I4  | The Active scope never returns archived items       | `buildFilterConditions` adds `archived_at IS NULL` by default (scope is part of the filters, not a caller opt-in)                  |
| I5  | Sort by status = pipeline index                     | `array_position(ARRAY[...order]::text[], status::text)` in SQL; `statusPipelineIndex` on the client                                |
| I6  | Nothing resurrects soft-deleted rows                | Every new method includes `deleted_at IS NULL`; `update()` is fixed since it doesn't do this today                                 |

---

## 3. Final API

Split by path (respects the current architecture rather than fighting it):

- **Dashboard reads** → TanStack **serverFns** (SSR-friendly; `clientTreaty` uses `window` and doesn't work in loaders). The serverFns call use cases with the **Drizzle** repo (decision D1: the Prisma TEMP path is retired).
- **Mutations** → **Elysia** via Eden Treaty (end-to-end typing already wired up). Also available to mobile.
- The logic lives in **use cases** (`packages/application/src/hiring/`), shared by both paths: `changeHiringProcessStatus`, `archiveHiringProcess`, `restoreHiringProcess`, `getHiringProcessBoard`, `listHiringProcesses` (extended with scope/stale/sort), `getHiringProcessCounts`.

### 3.1 List read — `GET /api/v1/hiring-processes` + serverFn `getHiringProcesses`

The existing contract is **extended** (current names `page`/`limit`/`statuses`/`salaryDeclared`/`salaryMin`/`salaryMax`; no renaming to `perPage`):

```
scope=active|archived   (default active)
stale=true              (only has an effect on active: OPEN + updated_at < now()-45d)
sort=updatedAt|companyName|jobTitle|status|salary|archivedAt
dir=asc|desc            (defaults: active → updatedAt desc · archived → archivedAt desc)
```

- `sort=archivedAt` with `scope=active` → 400 (`BadRequestError`).
- Response: the current `ApiResponse` + `meta.counts: { active, archived, open, closed, stale }` — one aggregated query with `COUNT(*) FILTER`, global counts for the user (not the filtered result), in the same response: the segmented control paints its number on first render, and the 2 extra queries from `index.tsx:106-118` go away.

### 3.2 Board — serverFn `getHiringBoard` (+ `GET /api/v1/hiring-processes/board`)

```
query:    { salaryDeclared?, salaryMin?, salaryMax? }        // scope always active, no statuses, no page
response: { columns: [{ status, count, cards: HiringProcessBase[] }] × 8 in STATUS_ORDER, counts }
```

One flat query (active items ordered `updatedAt desc`), grouped in memory in the use case. Empty columns get `cards: []`. The cards are the base row (no separate projection: the entity doesn't carry notes). Future per-column pagination contract: `?status=&page=` — documented, not implemented (Q2).

### 3.3 Mutations (Elysia)

| Method  | Route                                  | Body         | Rules                                                                                                                   | Response                                                                     |
| ------- | -------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `PATCH` | `/api/v1/hiring-processes/:id/status`  | `{ status }` | 400 if same status · 409 (`ConflictError`) if archived · bumps `updatedAt` · does **not** validate `STATUS_TRANSITIONS` | `{ data: { process, previous: { status, updatedAt } } }`                     |
| `POST`  | `/api/v1/hiring-processes/:id/archive` | `{ reason }` | 409 if already archived · doesn't touch `status`/`updatedAt`                                                            | `{ data: { process, previous: { archivedAt: null, archiveReason: null } } }` |
| `POST`  | `/api/v1/hiring-processes/:id/restore` | —            | 409 if not archived · doesn't touch `updatedAt`                                                                         | `{ data: { process, previous: { archivedAt, archiveReason } } }`             |

- 404 if it doesn't exist or isn't the user's (current pattern: ownership in the WHERE, never 403). `ConflictError` exists in `apps/server/src/utils/errors.ts:19` but it needs to be **registered** in the error handler (`error-handler-plugin.ts:29-35` doesn't map it today).
- `previous` feeds the Undo; the undo calls the inverse endpoint (inverse move / restore / archive), not a generic `/undo`.

---

## 4. Frontend

### 4.1 State — all greenfield on the index route

| State                                                                                        | Where                                                                                          | Note                                                                                       |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `scope, view, statuses, salaryDeclared, salaryMin, salaryMax, stale, sort, dir, page, limit` | `validateSearch` with zod (first real use; hand-rolled precedent in `$id.tsx`)                 | A single `setSearch(partial)` helper that clears `page` unless explicitly overridden       |
| last-used `view`                                                                             | `localStorage` `tapuy:dashboard-view` (the `tapuy:` convention from `interaction-draft.ts:28`) | Only read when `?view=` isn't present; "Show them"'s forced value does **not** override it |
| `scope`                                                                                      | URL, not persisted                                                                             | Every visit without the param lands on Active                                              |
| Stale strip dismissed                                                                        | `sessionStorage` `tapuy:stale-dismissed` (first use of sessionStorage)                         |                                                                                            |
| `dragId`, open menu, dialog                                                                  | local `useState`                                                                               |                                                                                            |

### 4.2 Data and mutations

- **Export `hiringProcessKeys`** and add `board: (params) => [...all, "board", params]`. `staleTime` of 30s for list and board (the list currently uses 10min — it's lowered: with optimistic mutations the cache can no longer be that lazy). The loader does `ensureQueryData` only for the active view.
- **`useReversibleMutation`** (the repo's first optimistic mutation): `onMutate` cancels + snapshots list and board + applies the optimistic patch → `onError` restores + shows the spec's error toast → `onSuccess` shows a Sonner toast with `action: Undo`, `duration: 5000` → Undo fires the inverse mutation (optimistic, no second toast) → `onSettled` invalidates `hiringProcessKeys.all`. Sonner's queue as-is (a new Undo doesn't cancel the previous one).
- Optimistic patch on the board: move the card between `columns[]` respecting `updatedAt desc` (it goes first) and adjust both `count`s. In the list: if the item stops matching the scope, it leaves `rows` and `total--`; the refetch fills it back in.

### 4.3 Components (real primitives)

```
routes/_authenticated/hiring-processes/index.tsx   validateSearch + loader per view
  ├ ControlBar: ScopeSegment (Active N | Archived N, mono) · conditional filters · ViewSegment
  ├ StaleStrip (counts.stale > 0 && !dismissed && scope=active)
  ├ InterviewTable (existing) + RowActions hover + columns per scope + amber age if stale
  ├ ProcessBoard → BoardColumn ×8 (STATUS_ORDER) → ProcessCard → MoveMenu (DropdownMenu Base UI)
  ├ ArchiveDialog (AlertDialog Base UI; WHY chips; preselection: isStale ? no-reply : they-passed)
  └ EmptyState ×3 (the first two already exist at index.tsx:143-154,294-301; "Nothing archived" is added)
```

- HTML5 DnD per the BUILD-spec (with `preventDefault` on `dragOver`, `relatedTarget` on `dragLeave`, no-op for the same column). Accessibility and touch: the `⋯` menu is the full path.
- "Start live note" on the card = the existing pattern `navigate({ to: "/hiring-processes/$id", search: { live: true } })` (`hiring-process-table.tsx:179-189`).
- Archived-scope table: `Status when archived` (badge intact) · `Archived` = `date · reason` (labels via i18n, not a new map in domain) · `Restore` + Delete action.
- Table sort moves to **server-side** (the headers write `sort`/`dir` to the URL); `getSortedRowModel` is removed.
- **Theme toggle**: doesn't exist today (dark hardcoded). Added in PR 4 as a small task (header button, `localStorage` `tapuy:theme`, anti-FOUC script, `data-theme` on `<html>`) because the checklist requires "verified in light" and the mock shows it.

---

## 5. Tests — realistic strategy (no prior infra)

| Layer                  | What                                                                                                                                                                        | Infra                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain (unit)          | `formatAge` (today/30d/12mo edges), `isStaleProcess` (terminal ≠ stale, archived ≠ stale, 45d edge), `STATUS_ORDER`/OPEN/CLOSED consistent with `category`, archive reasons | new vitest in `packages/domain` (i18n pattern)                                                                                                    |
| infra-db (integration) | I1–I6, mixed counts, stale excludes terminal statuses, 409 on double archive (null return), cross-user, pipeline sort                                                       | **pglite** (`@electric-sql/pglite` + `drizzle-orm/pglite` + `pushSchema` from `drizzle-kit/api`) — real in-memory Postgres, without touching Neon |
| application (unit)     | new use cases with fake in-memory repos (interfaces already allow it)                                                                                                       | vitest in `packages/application`                                                                                                                  |
| Web                    | No RTL/Playwright in this phase (infra doesn't exist; cost > value for a single user). Manual verification guided by the BUILD-spec checklist + a smoke check in light      | manual                                                                                                                                            |

A `test` task is added to `turbo.json` and a root `test` script.

## 6. Delivery plan — 4 PRs (the draft said 8; it's collapsed)

1. **`feat(db): archive fields + domain foundations`** — constants (STATUS_ORDER, ARCHIVE_REASONS, STALE_DAYS, formatAge/isStale), schemas, pgEnum + columns + index + CHECK, `IHiringProcessArchiveRepository` interface, Drizzle methods (`archive`, `restore`, `counts`, `findBoard`, scope/stale/sort in `findPaginated`), fix `update()` missing `deletedAt`, vitest domain + pglite infra-db, `db:push`. No UI. → detailed plan: `docs/superpowers/plans/2026-08-23-pr1-archive-domain-db.md`
2. **`feat(api): scope, counts, board + move/archive/restore`** — use cases, Elysia routes (extend GET, board, PATCH status, archive, restore, register ConflictError), serverFns (list→Drizzle+counts, new board). Defaults = today's behavior: the current UI stays the same.
3. **`feat(web): URL state + control bar + archive flow`** — validateSearch, scope/view segmented controls, conditional filters, server-side table sort, RowActions, ArchiveDialog, Archived scope, `useReversibleMutation` + Undo, Archived empty state, i18n en+es.
4. **`feat(web): board + stale strip + polish`** — full board (DnD, `⋯`, legend), ages, stale strip, theme toggle + light pass, final BUILD-spec checklist.

Each PR is mergeable on its own; the feature is visible starting at PR 3.

## 7. Merge checklist (from the BUILD-spec, with an owner)

- [ ] Archive/restore doesn't alter `status` or `updatedAt` → pglite test I2 (PR 1)
- [ ] No Active query returns archived items → pglite test I4 (PR 1)
- [ ] The Status column sorts by pipeline, not alphabetically → pglite test I5 (PR 1)
- [ ] `dragOver` calls `preventDefault` → code review PR 4
- [ ] Every status reachable without dragging (`⋯` menu) → manual PR 4
- [ ] Move/archive/restore with a 5s Undo → manual PR 3/4
- [ ] Stale strip ignores terminal statuses → counts test (PR 1) + manual
- [ ] Changing view/scope/filter/sort resets to page 1 → `setSearch` helper + manual PR 3
- [ ] Verified in light → PR 4

## 8. Decision log

| #   | Decision                                                                                                                                                                                                                                                                                                                            | Alternative discarded                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| D1  | **Consolidate reads on Drizzle**: the list serverFn (Prisma, marked TEMP) switches to using infra-db's `HiringProcessRepository`. `infra-prisma-db` stays frozen as a demo: it doesn't implement archive (the new capabilities go into a separate `IHiringProcessArchiveRepository` interface, so Prisma keeps compiling untouched) | Implement everything twice (double maintenance) or delete the package (a separate decision, not urgent) |
| D2  | New `HIRING_PROCESS_STATUS_ORDER`; `HIRING_PROCESS_STATUS_VALUES` (feeds the pgEnum) and `INFO.order` are **not** reordered                                                                                                                                                                                                         | Reorder the enum → an unnecessary ALTER TYPE and risk on push                                           |
| D3  | Move does **not** validate `STATUS_TRANSITIONS` (the board allows any destination); the transitions table is fixed to reflect reality                                                                                                                                                                                               | Validate transitions → contradicts the board spec                                                       |
| D4  | No board cap, no rate limit, no currency normalization (Q2/Q9/Q10)                                                                                                                                                                                                                                                                  | —                                                                                                       |
| D5  | Existing param names (`page`, `limit`, `statuses`, `salaryDeclared`…); new sort as `sort`/`dir` with real field names (`companyName`, `jobTitle`)                                                                                                                                                                                   | Rename to `perPage`/`company` → churn with no value                                                     |
| D6  | Tests: vitest domain/application + pglite infra-db; no Playwright/RTL in this phase                                                                                                                                                                                                                                                 | Set up E2E from scratch for one user                                                                    |
| D7  | Semantic undo (Q3): move-undo advances `updatedAt`; restore-undo re-archives with a new `archivedAt`                                                                                                                                                                                                                                | Undo tokens with exact timestamps                                                                       |
| D8  | Theme toggle goes into PR 4 (small, required by "verified in light" and the mock)                                                                                                                                                                                                                                                   | Leave it out → checklist can't be satisfied                                                             |
