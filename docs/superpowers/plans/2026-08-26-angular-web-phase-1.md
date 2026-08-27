# Angular Web Client (Phase 1 — core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `apps/angular-web`, an Angular 22 client that logs in against the existing Better Auth server and lists / shows / creates / edits / archives / restores / deletes hiring processes through `apps/server`.

**Architecture:** A standalone, zoneless Angular 22 app inside the bun monorepo. Server state goes through TanStack Query (`@tanstack/angular-query-experimental`) on top of `HttpClient`; auth goes through the vanilla `better-auth/client` wrapped in a signal-based `AuthService`; the app imports only `@interviews-tool/domain`. A dev proxy forwards `/api` to the Elysia server on port 3000 so the session cookie is same-origin.

**Tech Stack:** Angular 22.1 (standalone, signals, zoneless, `@if/@for`, `input()/output()`, functional guards/interceptors, Signal Forms + Reactive Forms, `httpResource`), TanStack Query 5, Better Auth client 1.4.18, Zod 4 (`@interviews-tool/domain`), Tailwind 4 via `@tailwindcss/postcss`, Vitest 4 + jsdom (Angular's default test builder), bun workspaces, Node 24.

**Spec:** `docs/superpowers/specs/2026-08-26-angular-web-design.md`

## Global Constraints

- **Node version:** Angular 22 requires Node `>= 24.15.0`. The machine's default is 22.14. **Every command that runs `ng` (build, serve, test) must be run after `source ~/.nvm/nvm.sh && nvm use 24`** (Node 24.20.0 is installed via nvm). Commands in this plan already include that prefix.
- **Package manager:** bun. Never run `npm install` or create a `package-lock.json`. Install from the repo root with `bun install`.
- **Git branch:** all work happens on `feat/angular-web` (already created from `main`). Do not merge or push in this plan.
- **Imports rule:** `apps/angular-web` may import only `@interviews-tool/domain/{constants,schemas,types}`. Never `@interviews-tool/application`, `@interviews-tool/infra-*`, `@interviews-tool/web-ui`.
- **Do not modify** `apps/server`, `apps/web`, `apps/mobile`. The only shared-package change is Task 2 (one Zod schema in `packages/domain`).
- **Naming:** Angular v20+ style — no `.component`/`.service` suffixes in class names are required, but file names below are exact; use them verbatim. Selectors use the `app-` prefix.
- **Formatting:** the repo formats on commit with `oxfmt` and lints with `oxlint` (lint-staged). If a commit re-formats files, just `git add` them again and re-commit. Do not add Prettier/ESLint configs.
- **Test runner:** `bun run ng test --watch=false --include <path>` runs one spec file; `bun run ng test --watch=false` runs all. `describe/it/expect/vi` are globals (`vitest/globals` is in `tsconfig.spec.json`).
- **API contract (verified against the running server):** every response is `{ data, error, meta? }`. List query params: `page`, `limit`, `statuses` (**repeat the key** — `statuses=a&statuses=b`), `salaryDeclared`, `salaryMin`, `salaryMax`. The server does **not** accept `scope`, `stale`, `sort`, `dir` on `/api/v1/hiring-processes` (those are Phase 2). `DELETE` returns 204 with an empty body.
- **Ports:** server `3000`, Angular `4200`. The Angular dev server proxies `/api/*` to `http://localhost:3000`.
- **Copy language:** English UI strings (i18n is Phase 2).

---

## File map

```
apps/angular-web/
  .nvmrc                                   Task 1  → "24.20.0"
  .postcssrc.json                          Task 1  → Tailwind 4 PostCSS plugin
  proxy.conf.json                          Task 1  → /api → localhost:3000
  package.json                             Task 1  → name "angular-web", scripts, deps
  angular.json                             Task 1  → generated (bun as packageManager)
  README.md                                Task 12 → how to run
  src/styles.css                           Task 3  → Tailwind import + Tapuy tokens + component classes
  src/main.ts                              Task 1  → generated
  src/app/app.config.ts                    Task 5  → providers (router, http, tanstack, app initializer)
  src/app/app.routes.ts                    Task 8  → routes + guards
  src/app/app.ts / app.html                Task 8  → shell (header, router-outlet)
  src/app/core/http/api-error.ts           Task 4  → ApiError class
  src/app/core/http/api-error.interceptor.ts   Task 4
  src/app/core/http/api-error.interceptor.spec.ts Task 4
  src/app/core/auth/auth-client.ts         Task 5  → AUTH_CLIENT injection token
  src/app/core/auth/auth.service.ts        Task 5
  src/app/core/auth/auth.service.spec.ts   Task 5
  src/app/core/auth/auth.guard.ts          Task 5  → authGuard + guestGuard
  src/app/core/auth/auth.guard.spec.ts     Task 5
  src/app/core/api/hiring-process.model.ts Task 6  → HiringProcess DTO + list params/result types
  src/app/core/api/hiring-processes.api.ts Task 6
  src/app/core/api/hiring-processes.api.spec.ts Task 6
  src/app/features/hiring-processes/hiring-process.keys.ts     Task 7
  src/app/features/hiring-processes/hiring-process.queries.ts  Task 7
  src/app/features/auth/login.ts           Task 8  → Signal Forms
  src/app/features/auth/login.spec.ts      Task 8
  src/app/features/auth/signup.ts          Task 8  → Signal Forms
  src/app/features/hiring-processes/list/list-page.ts          Task 9
  src/app/features/hiring-processes/list/list-page.spec.ts     Task 9
  src/app/features/hiring-processes/list/list-filters.ts       Task 9
  src/app/features/hiring-processes/list/hiring-process-table.ts Task 9
  src/app/features/hiring-processes/form/hiring-process-form.ts      Task 10 → Reactive Forms
  src/app/features/hiring-processes/form/hiring-process-form.spec.ts Task 10
  src/app/features/hiring-processes/form/form-page.ts                Task 10
  src/app/features/hiring-processes/detail/detail-page.ts      Task 11 → httpResource
  src/app/features/hiring-processes/detail/detail-page.spec.ts Task 11
  src/app/features/hiring-processes/detail/archive-dialog.ts   Task 11
  src/app/shared/ui/status-badge.ts        Task 3
  src/app/shared/ui/spinner.ts             Task 3
  src/app/shared/ui/empty-state.ts         Task 3
  src/app/shared/pipes/money.pipe.ts       Task 3
  src/app/shared/pipes/money.pipe.spec.ts  Task 3
  src/app/shared/pipes/relative-date.pipe.ts      Task 3
  src/app/shared/pipes/relative-date.pipe.spec.ts Task 3
packages/domain/src/schemas/pagination.ts            Task 2 (modify)
packages/domain/src/__tests__/pagination-schema.test.ts Task 2 (create)
package.json (root)                                  Task 1 (add dev:angular script)
CLAUDE.md (root)                                     Task 1 (import rule)
docs/superpowers/specs/2026-08-26-angular-web-design.md Task 12 (amend §1)
```

---

### Task 1: Scaffold `apps/angular-web` inside the monorepo

**Files:**

- Create: `apps/angular-web/**` (generated by Angular CLI), `apps/angular-web/.nvmrc`, `apps/angular-web/proxy.conf.json`, `apps/angular-web/.postcssrc.json`
- Modify: `apps/angular-web/package.json`, `apps/angular-web/src/styles.css`, `apps/angular-web/src/app/app.ts`, `apps/angular-web/src/app/app.html`, `apps/angular-web/src/app/app.spec.ts`, root `package.json`, root `CLAUDE.md`

**Interfaces:**

- Produces: a buildable/testable Angular app that resolves `@interviews-tool/domain/*`, Tailwind, and the `/api` proxy. Later tasks assume `bun run ng build` and `bun run ng test --watch=false` pass from `apps/angular-web`.

- [ ] **Step 1: Generate the app with the Angular CLI (no install yet)**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps
source ~/.nvm/nvm.sh && nvm use 24
bunx @angular/cli@22 new angular-web --package-manager bun --style css --ssr false --zoneless --skip-git --skip-install --defaults
```

Expected: a new `apps/angular-web/` directory with `angular.json`, `package.json`, `src/`, `tsconfig*.json`. If the CLI prompts for anything, accept the defaults.

- [ ] **Step 2: Rewrite `apps/angular-web/package.json`**

Replace the whole file with:

```json
{
  "name": "angular-web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24.15.0"
  },
  "scripts": {
    "ng": "ng",
    "dev": "ng serve --proxy-config proxy.conf.json --port 4200",
    "build": "ng build",
    "test": "ng test --watch=false",
    "check-types": "tsc -p tsconfig.app.json --noEmit"
  },
  "dependencies": {
    "@angular/common": "^22.1.0",
    "@angular/compiler": "^22.1.0",
    "@angular/core": "^22.1.0",
    "@angular/forms": "^22.1.0",
    "@angular/platform-browser": "^22.1.0",
    "@angular/router": "^22.1.0",
    "@interviews-tool/domain": "workspace:*",
    "@tanstack/angular-query-experimental": "^5.102.6",
    "better-auth": "catalog:",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@angular/build": "^22.1.6",
    "@angular/cli": "^22.1.6",
    "@angular/compiler-cli": "^22.1.0",
    "@tailwindcss/postcss": "^4.1.18",
    "jsdom": "^28.0.0",
    "postcss": "^8.5.0",
    "tailwindcss": "catalog:",
    "typescript": "~6.0.2",
    "vitest": "^4.0.8"
  }
}
```

Notes: `better-auth`, `zod`, `tailwindcss` use the root `catalog:` so they match the server. `typescript ~6.0` is what Angular 22 requires; bun will nest it under `apps/angular-web/node_modules` because the root catalog pins 5.9 — that is fine.

- [ ] **Step 3: Install from the root**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
bun install
ls apps/angular-web/node_modules/@interviews-tool/domain/package.json
```

Expected: `bun install` completes; the `ls` prints the path (the workspace symlink exists).

- [ ] **Step 4: Add Node pin, proxy and PostCSS config**

`apps/angular-web/.nvmrc`:

```
24.20.0
```

`apps/angular-web/proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": false
  }
}
```

`apps/angular-web/.postcssrc.json`:

```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

- [ ] **Step 5: Minimal Tailwind stylesheet (tokens come in Task 3)**

Replace `apps/angular-web/src/styles.css` with:

```css
@import "tailwindcss";
```

- [ ] **Step 6: Prove the `@interviews-tool/domain` import compiles**

Replace `apps/angular-web/src/app/app.ts` with:

```ts
import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { HIRING_PROCESS_STATUS_ORDER } from "@interviews-tool/domain/constants";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  templateUrl: "./app.html",
})
export class App {
  protected readonly statusCount = HIRING_PROCESS_STATUS_ORDER.length;
}
```

Replace `apps/angular-web/src/app/app.html` with:

```html
<h1 class="p-4 text-xl font-semibold">angular-web · {{ statusCount }} statuses</h1>
<router-outlet />
```

Delete `apps/angular-web/src/app/app.css` if it exists (the component no longer references it).

Replace `apps/angular-web/src/app/app.spec.ts` with:

```ts
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { App } from "./app";

describe("App", () => {
  it("renders the domain status count", async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector("h1")?.textContent).toContain("8 statuses");
  });
});
```

- [ ] **Step 7: Build and test**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use 24
bun run build 2>&1 | tail -20
bun run test 2>&1 | tail -8
```

Expected: build prints `Application bundle generation complete.` (a _warning_ about the initial bundle budget is acceptable); test prints `Tests 1 passed (1)`.

If the build fails with `Cannot find module '@interviews-tool/domain/constants'`, add to `apps/angular-web/tsconfig.json` under `compilerOptions`:

```json
"paths": {
  "@interviews-tool/domain/*": ["../../packages/domain/src/*/index.ts"]
}
```

and rebuild.

- [ ] **Step 8: Wire the root workspace**

In root `package.json` `scripts`, add after `"dev:server"`:

```json
"dev:angular": "turbo run dev -F angular-web",
```

In root `CLAUDE.md`, under `## Package Import Rules`, add a bullet:

```md
- Angular app (`apps/angular-web/`) only imports from `@interviews-tool/domain` — never `application`, `infra-*`, or `web-ui`
```

- [ ] **Step 9: Remove generated files the repo does not use**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
rm -rf .vscode .editorconfig
git status --short | head -30
```

Keep the generated `.gitignore` (it ignores `.angular/cache`).

- [ ] **Step 10: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web package.json bun.lock CLAUDE.md
git commit -m "feat(angular-web): scaffold Angular 22 client inside the monorepo"
```

If lint-staged reformats files, run `git add -A apps/angular-web && git commit -m "feat(angular-web): scaffold Angular 22 client inside the monorepo"` again.

---

### Task 2: Accept a single `statuses` value in the domain query schema

**Files:**

- Modify: `packages/domain/src/schemas/pagination.ts` (the `hiringProcessFilterSchema` block)
- Create: `packages/domain/src/__tests__/pagination-schema.test.ts`

**Interfaces:**

- Produces: `GET /api/v1/hiring-processes?statuses=ongoing` (single value) validates as `["ongoing"]`. Verified today: repeated keys already work; a single key returned 422 because Elysia hands Zod a plain string.

- [ ] **Step 1: Write the failing test**

`packages/domain/src/__tests__/pagination-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hiringProcessQuerySchema } from "../schemas/pagination";

describe("hiringProcessQuerySchema.statuses", () => {
  it("accepts an array", () => {
    const result = hiringProcessQuerySchema.parse({ statuses: ["ongoing", "hired"] });
    expect(result.statuses).toEqual(["ongoing", "hired"]);
  });

  it("wraps a single string into an array", () => {
    const result = hiringProcessQuerySchema.parse({ statuses: "ongoing" });
    expect(result.statuses).toEqual(["ongoing"]);
  });

  it("rejects an unknown status", () => {
    expect(() => hiringProcessQuerySchema.parse({ statuses: "bogus" })).toThrow();
  });

  it("leaves statuses undefined when absent", () => {
    expect(hiringProcessQuerySchema.parse({}).statuses).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/packages/domain
bun run test -- src/__tests__/pagination-schema.test.ts
```

Expected: `wraps a single string into an array` FAILS (ZodError: expected array).

- [ ] **Step 3: Implement**

In `packages/domain/src/schemas/pagination.ts`, replace the `statuses` line inside `hiringProcessFilterSchema`:

```ts
export const hiringProcessFilterSchema = z.object({
  // Query strings arrive as a bare string when only one value is sent
  // (`?statuses=ongoing`) and as an array when repeated. Normalize to an array.
  statuses: z
    .union([
      z.array(z.enum(HIRING_PROCESS_STATUS_VALUES)),
      z.enum(HIRING_PROCESS_STATUS_VALUES).transform((value) => [value]),
    ])
    .optional(),
  salaryDeclared: z
    .union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")])
    .optional(),
  salaryMin: z.coerce.number().int().min(0).optional(),
  salaryMax: z.coerce.number().int().min(0).optional(),
});
```

- [ ] **Step 4: Run the domain tests and type-check**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/packages/domain
bun run test
bun run check-types
```

Expected: all domain tests pass; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add packages/domain
git commit -m "fix(domain): accept a single statuses value in the hiring process query schema"
```

---

### Task 3: Design tokens, shared UI components and pipes

**Files:**

- Modify: `apps/angular-web/src/styles.css`
- Create: `apps/angular-web/src/app/shared/ui/status-badge.ts`, `spinner.ts`, `empty-state.ts`
- Create: `apps/angular-web/src/app/shared/pipes/money.pipe.ts`, `money.pipe.spec.ts`, `relative-date.pipe.ts`, `relative-date.pipe.spec.ts`

**Interfaces:**

- Produces: CSS classes `btn`, `btn-primary`, `btn-secondary`, `btn-danger`, `input`, `label`, `card`, `field-error`, `badge`; components `<app-status-badge [status]>`, `<app-spinner />`, `<app-empty-state [title] [message]>` (with projected content for actions); pipes `money` (`salary | money: currency : rateType`) and `relativeDate`.

- [ ] **Step 1: Write the pipe tests**

`apps/angular-web/src/app/shared/pipes/money.pipe.spec.ts`:

```ts
import { MoneyPipe } from "./money.pipe";

describe("MoneyPipe", () => {
  const pipe = new MoneyPipe();

  it("returns a dash when salary is null or undefined", () => {
    expect(pipe.transform(null, "USD", "monthly")).toBe("—");
    expect(pipe.transform(undefined, "USD", "monthly")).toBe("—");
  });

  it("formats USD monthly", () => {
    expect(pipe.transform(3500, "USD", "monthly")).toBe("$3,500 / mo");
  });

  it("formats PEN hourly", () => {
    expect(pipe.transform(45, "PEN", "hourly")).toBe("S/ 45 / hr");
  });

  it("omits the rate suffix when rate type is missing", () => {
    expect(pipe.transform(100, "USD", undefined)).toBe("$100");
  });
});
```

`apps/angular-web/src/app/shared/pipes/relative-date.pipe.spec.ts`:

```ts
import { RelativeDatePipe } from "./relative-date.pipe";

describe("RelativeDatePipe", () => {
  const pipe = new RelativeDatePipe();
  pipe.now = () => new Date("2026-08-26T12:00:00Z");

  it("says today for the same day", () => {
    expect(pipe.transform("2026-08-26T08:00:00Z")).toBe("today");
  });

  it("says yesterday", () => {
    expect(pipe.transform("2026-08-25T12:00:00Z")).toBe("yesterday");
  });

  it("counts days within a month", () => {
    expect(pipe.transform("2026-08-20T12:00:00Z")).toBe("6 days ago");
  });

  it("falls back to a short date after 30 days", () => {
    expect(pipe.transform("2026-06-01T12:00:00Z")).toBe("Jun 1, 2026");
  });

  it("accepts Date objects", () => {
    expect(pipe.transform(new Date("2026-08-25T12:00:00Z"))).toBe("yesterday");
  });
});
```

- [ ] **Step 2: Run them to see them fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use 24
bun run ng test --watch=false --include "src/app/shared/pipes/*.spec.ts" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module './money.pipe'` (and the same for relative-date).

- [ ] **Step 3: Implement the pipes**

`apps/angular-web/src/app/shared/pipes/money.pipe.ts`:

```ts
import { Pipe, PipeTransform } from "@angular/core";
import type { Currency, SalaryRateType } from "@interviews-tool/domain/constants";

const CURRENCY_SYMBOL: Record<Currency, string> = { USD: "$", PEN: "S/ " };
const RATE_SUFFIX: Record<SalaryRateType, string> = { monthly: " / mo", hourly: " / hr" };

@Pipe({ name: "money" })
export class MoneyPipe implements PipeTransform {
  transform(
    salary: number | null | undefined,
    currency: Currency | null | undefined,
    rateType?: SalaryRateType | null,
  ): string {
    if (salary === null || salary === undefined) return "—";
    const symbol = CURRENCY_SYMBOL[currency ?? "USD"];
    const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(salary);
    const suffix = rateType ? RATE_SUFFIX[rateType] : "";
    return `${symbol}${amount}${suffix}`;
  }
}
```

`apps/angular-web/src/app/shared/pipes/relative-date.pipe.ts`:

```ts
import { Pipe, PipeTransform } from "@angular/core";

const DAY_MS = 24 * 60 * 60 * 1000;

@Pipe({ name: "relativeDate" })
export class RelativeDatePipe implements PipeTransform {
  /** Overridable clock so tests can pin "today". Not a constructor param: Angular DI cannot inject functions. */
  now: () => Date = () => new Date();

  transform(value: string | Date | null | undefined): string {
    if (!value) return "—";
    const date = typeof value === "string" ? new Date(value) : value;
    const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const days = Math.round((startOfDay(this.now()) - startOfDay(date)) / DAY_MS);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days <= 30) return `${days} days ago`;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
}
```

- [ ] **Step 4: Run the pipe tests**

```bash
bun run ng test --watch=false --include "src/app/shared/pipes/*.spec.ts" 2>&1 | tail -8
```

Expected: `Tests 9 passed (9)`.

- [ ] **Step 5: Write the stylesheet with the Tapuy tokens**

Replace `apps/angular-web/src/styles.css` with:

```css
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap");
@import "tailwindcss";

/* Tapuy tokens (dark is the default) — copied from packages/web-ui/src/styles.css */
:root {
  --mint: #00ffc2;
  --mint-hover: #33ffd0;
  --mint-on: #04261d;
  --bg: #0a0f14;
  --surface: #0f161d;
  --surface-2: #141c25;
  --selected: #0f1a1a;
  --border: #1c232b;
  --border-strong: #2a3440;
  --text: #e6ebf0;
  --text-secondary: #a7b1bc;
  --text-muted: #6b7785;
  --danger: #e05252;
  --focus-ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--mint);

  --st-first-contact-bg: #1b0f33;
  --st-first-contact-text: #c9a6ff;
  --st-first-contact-border: #4a1f8a;
  --st-ongoing-bg: #0e1f38;
  --st-ongoing-text: #8fc1f5;
  --st-ongoing-border: #1f4b82;
  --st-on-hold-bg: #2a1e08;
  --st-on-hold-text: #f0c061;
  --st-on-hold-border: #7a5a18;
  --st-offer-made-bg: #2e0a22;
  --st-offer-made-text: #ff6bc6;
  --st-offer-made-border: #8a0a5a;
  --st-offer-accepted-bg: #2fa155;
  --st-offer-accepted-text: #04200d;
  --st-hired-bg: #1e7a3e;
  --st-hired-text: #e6f7ec;
  --st-rejected-bg: #c73a3a;
  --st-rejected-text: #fdecec;
  --st-dropped-out-bg: #4a5562;
  --st-dropped-out-text: #eef2f5;

  color-scheme: dark;
}

/* Expose tokens as Tailwind utilities: bg-surface, text-text-muted, border-border, ... */
@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-selected: var(--selected);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-text: var(--text);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-mint: var(--mint);
  --color-mint-hover: var(--mint-hover);
  --color-mint-on: var(--mint-on);
  --color-danger: var(--danger);
  --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;
}

@layer base {
  body {
    background-color: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  a {
    color: inherit;
  }
}

@layer components {
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 0.375rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid transparent;
    transition: background-color 120ms ease, border-color 120ms ease;
    cursor: pointer;
  }
  .btn:disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  .btn:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .btn-primary {
    background: var(--mint);
    color: var(--mint-on);
  }
  .btn-primary:hover {
    background: var(--mint-hover);
  }
  .btn-secondary {
    background: var(--surface-2);
    color: var(--text);
    border-color: var(--border);
  }
  .btn-secondary:hover {
    border-color: var(--border-strong);
  }
  .btn-danger {
    background: var(--danger);
    color: #fff;
  }

  .input {
    width: 100%;
    border-radius: 0.375rem;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }
  .input::placeholder {
    color: var(--text-muted);
  }
  .input:focus {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .input[aria-invalid="true"] {
    border-color: var(--danger);
  }

  .label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
  }
  .field-error {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: var(--danger);
  }
  .card {
    border-radius: 0.75rem;
    border: 1px solid var(--border);
    background: var(--surface);
    padding: 1rem;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    border-radius: 9999px;
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid transparent;
    white-space: nowrap;
  }
  .badge[data-status="first-contact"] {
    background: var(--st-first-contact-bg);
    color: var(--st-first-contact-text);
    border-color: var(--st-first-contact-border);
  }
  .badge[data-status="ongoing"] {
    background: var(--st-ongoing-bg);
    color: var(--st-ongoing-text);
    border-color: var(--st-ongoing-border);
  }
  .badge[data-status="on-hold"] {
    background: var(--st-on-hold-bg);
    color: var(--st-on-hold-text);
    border-color: var(--st-on-hold-border);
  }
  .badge[data-status="offer-made"] {
    background: var(--st-offer-made-bg);
    color: var(--st-offer-made-text);
    border-color: var(--st-offer-made-border);
  }
  .badge[data-status="offer-accepted"] {
    background: var(--st-offer-accepted-bg);
    color: var(--st-offer-accepted-text);
  }
  .badge[data-status="hired"] {
    background: var(--st-hired-bg);
    color: var(--st-hired-text);
  }
  .badge[data-status="rejected"] {
    background: var(--st-rejected-bg);
    color: var(--st-rejected-text);
  }
  .badge[data-status="dropped-out"] {
    background: var(--st-dropped-out-bg);
    color: var(--st-dropped-out-text);
  }
}
```

- [ ] **Step 6: Create the three UI components**

`apps/angular-web/src/app/shared/ui/status-badge.ts`:

```ts
import { Component, computed, input } from "@angular/core";
import {
  HIRING_PROCESS_STATUS_INFO,
  type HiringProcessStatus,
} from "@interviews-tool/domain/constants";

@Component({
  selector: "app-status-badge",
  template: `<span class="badge" [attr.data-status]="status()">{{ label() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<HiringProcessStatus>();
  protected readonly label = computed(() => HIRING_PROCESS_STATUS_INFO[this.status()].label);
}
```

`apps/angular-web/src/app/shared/ui/spinner.ts`:

```ts
import { Component } from "@angular/core";

@Component({
  selector: "app-spinner",
  template: `
    <span
      role="status"
      aria-label="Loading"
      class="inline-block size-5 animate-spin rounded-full border-2 border-border-strong border-t-mint"
    ></span>
  `,
})
export class Spinner {}
```

`apps/angular-web/src/app/shared/ui/empty-state.ts`:

```ts
import { Component, input } from "@angular/core";

@Component({
  selector: "app-empty-state",
  template: `
    <div class="card flex flex-col items-center gap-2 py-10 text-center">
      <p class="text-base font-medium">{{ title() }}</p>
      @if (message()) {
        <p class="text-sm text-text-muted">{{ message() }}</p>
      }
      <div class="mt-2 flex gap-2"><ng-content /></div>
    </div>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>();
}
```

- [ ] **Step 7: Build and run all tests**

```bash
bun run build 2>&1 | tail -5
bun run test 2>&1 | tail -6
```

Expected: build completes; `Tests 10 passed (10)`.

- [ ] **Step 8: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): design tokens, shared UI components and pipes"
```

---

### Task 4: `ApiError` and the HTTP error interceptor

**Files:**

- Create: `apps/angular-web/src/app/core/http/api-error.ts`, `api-error.interceptor.ts`, `api-error.interceptor.spec.ts`

**Interfaces:**

- Produces: `class ApiError extends Error { status: number; message: string }`; `apiErrorInterceptor: HttpInterceptorFn` that converts every `HttpErrorResponse` into an `ApiError` (message taken from the server body `{ error: { message } }` when present) and, on 401, calls `AuthService.clear()` and navigates to `/auth/login`.
- Consumes: `AuthService.clear()` from Task 5. **Task 4 is built before Task 5, so the interceptor injects a small token instead of `AuthService` directly** — see `UNAUTHORIZED_HANDLER` below. Task 5 provides it.

- [ ] **Step 1: Write `api-error.ts`**

```ts
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}
```

- [ ] **Step 2: Write the failing interceptor test**

`apps/angular-web/src/app/core/http/api-error.interceptor.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import { HttpClient, provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { firstValueFrom } from "rxjs";
import { ApiError } from "./api-error";
import { UNAUTHORIZED_HANDLER, apiErrorInterceptor } from "./api-error.interceptor";

describe("apiErrorInterceptor", () => {
  const onUnauthorized = vi.fn();

  beforeEach(() => {
    onUnauthorized.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: UNAUTHORIZED_HANDLER, useValue: onUnauthorized },
      ],
    });
  });

  it("maps a server error body to ApiError", async () => {
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    const pending = firstValueFrom(http.get("/api/v1/x"));
    ctrl
      .expectOne("/api/v1/x")
      .flush({ data: null, error: { message: "Boom" } }, { status: 500, statusText: "Server" });
    const err = await pending.catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toBe("Boom");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("calls the unauthorized handler on 401", async () => {
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    const pending = firstValueFrom(http.get("/api/v1/x"));
    ctrl.expectOne("/api/v1/x").flush("Unauthorized", { status: 401, statusText: "Unauthorized" });
    const err = await pending.catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("falls back to the HTTP message when the body has no error field", async () => {
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    const pending = firstValueFrom(http.get("/api/v1/x"));
    ctrl.expectOne("/api/v1/x").flush(null, { status: 404, statusText: "Not Found" });
    const err = await pending.catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.isNotFound).toBe(true);
    expect(typeof err.message).toBe("string");
  });
});
```

- [ ] **Step 3: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use 24
bun run ng test --watch=false --include src/app/core/http/api-error.interceptor.spec.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './api-error.interceptor'`.

- [ ] **Step 4: Implement the interceptor**

`apps/angular-web/src/app/core/http/api-error.interceptor.ts`:

```ts
import { HttpErrorResponse, type HttpInterceptorFn } from "@angular/common/http";
import { InjectionToken, inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { ApiError } from "./api-error";

/**
 * Called when any request comes back 401. Provided by app.config.ts so the
 * interceptor does not depend on AuthService (which would create a cycle:
 * AuthService → HttpClient → interceptor → AuthService).
 */
export const UNAUTHORIZED_HANDLER = new InjectionToken<() => void>("UNAUTHORIZED_HANDLER", {
  providedIn: "root",
  factory: () => () => {},
});

type ErrorBody = { error?: { message?: string } | null } | null | undefined;

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const onUnauthorized = inject(UNAUTHORIZED_HANDLER);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
      const body = err.error as ErrorBody;
      const message =
        (typeof body === "object" && body?.error?.message) || err.message || "Request failed";
      if (err.status === 401) onUnauthorized();
      return throwError(() => new ApiError(err.status, message));
    }),
  );
};
```

- [ ] **Step 5: Run the test**

```bash
bun run ng test --watch=false --include src/app/core/http/api-error.interceptor.spec.ts 2>&1 | tail -6
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 6: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web/src/app/core/http
git commit -m "feat(angular-web): ApiError and functional HTTP error interceptor"
```

---

### Task 5: `AuthService`, guards and `app.config.ts`

**Files:**

- Create: `apps/angular-web/src/app/core/auth/auth-client.ts`, `auth.service.ts`, `auth.service.spec.ts`, `auth.guard.ts`, `auth.guard.spec.ts`
- Modify: `apps/angular-web/src/app/app.config.ts`

**Interfaces:**

- Produces:
  - `AUTH_CLIENT: InjectionToken<AuthClient>` (default = `createAuthClient({ fetchOptions: { credentials: "include" } })`)
  - `AuthService` with `user: Signal<SessionUser | null>`, `status: Signal<"loading" | "authed" | "anon">`, `isAuthenticated: Signal<boolean>`, `refresh(): Promise<void>`, `signIn(email, password): Promise<void>`, `signUp(name, email, password): Promise<void>`, `signOut(): Promise<void>`, `clear(): void`
  - `SessionUser = { id: string; email: string; name: string }`
  - `authGuard`, `guestGuard: CanActivateFn`
  - `appConfig` providing router (`withComponentInputBinding`), `HttpClient` (`withFetch`, interceptor), TanStack Query, `UNAUTHORIZED_HANDLER`, and an app initializer that calls `AuthService.refresh()`.

- [ ] **Step 1: Write `auth-client.ts`**

```ts
import { InjectionToken } from "@angular/core";
import { createAuthClient } from "better-auth/client";

export type AuthClient = ReturnType<typeof createAuthClient>;

/** Real Better Auth client in the app; tests override it with a fake. */
export const AUTH_CLIENT = new InjectionToken<AuthClient>("AUTH_CLIENT", {
  providedIn: "root",
  factory: () => createAuthClient({ fetchOptions: { credentials: "include" } }),
});
```

- [ ] **Step 2: Write the failing service test**

`apps/angular-web/src/app/core/auth/auth.service.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import { AUTH_CLIENT, type AuthClient } from "./auth-client";
import { AuthService } from "./auth.service";

const user = { id: "u1", email: "a@b.co", name: "Ana" };

function makeFakeClient() {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    signIn: { email: vi.fn().mockResolvedValue({ data: {}, error: null }) },
    signUp: { email: vi.fn().mockResolvedValue({ data: {}, error: null }) },
    signOut: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
}

describe("AuthService", () => {
  let fake: ReturnType<typeof makeFakeClient>;
  let service: AuthService;

  beforeEach(() => {
    fake = makeFakeClient();
    TestBed.configureTestingModule({
      providers: [{ provide: AUTH_CLIENT, useValue: fake as unknown as AuthClient }],
    });
    service = TestBed.inject(AuthService);
  });

  it("starts in loading state", () => {
    expect(service.status()).toBe("loading");
    expect(service.isAuthenticated()).toBe(false);
  });

  it("refresh() sets the user and authed status", async () => {
    await service.refresh();
    expect(service.user()).toEqual(user);
    expect(service.status()).toBe("authed");
    expect(service.isAuthenticated()).toBe(true);
  });

  it("refresh() with no session sets anon", async () => {
    fake.getSession.mockResolvedValueOnce({ data: null, error: null });
    await service.refresh();
    expect(service.user()).toBeNull();
    expect(service.status()).toBe("anon");
  });

  it("signIn() calls the client and refreshes", async () => {
    await service.signIn("a@b.co", "secret123");
    expect(fake.signIn.email).toHaveBeenCalledWith({ email: "a@b.co", password: "secret123" });
    expect(service.status()).toBe("authed");
  });

  it("signIn() throws the server message on error", async () => {
    fake.signIn.email.mockResolvedValueOnce({ data: null, error: { message: "Invalid credentials" } });
    await expect(service.signIn("a@b.co", "bad")).rejects.toThrow("Invalid credentials");
    expect(service.status()).toBe("loading");
  });

  it("signUp() calls the client with name and refreshes", async () => {
    await service.signUp("Ana", "a@b.co", "secret123");
    expect(fake.signUp.email).toHaveBeenCalledWith({ name: "Ana", email: "a@b.co", password: "secret123" });
    expect(service.status()).toBe("authed");
  });

  it("signOut() clears the user", async () => {
    await service.refresh();
    await service.signOut();
    expect(fake.signOut).toHaveBeenCalled();
    expect(service.user()).toBeNull();
    expect(service.status()).toBe("anon");
  });
});
```

- [ ] **Step 3: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use 24
bun run ng test --watch=false --include src/app/core/auth/auth.service.spec.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './auth.service'`.

- [ ] **Step 4: Implement `auth.service.ts`**

```ts
import { Injectable, computed, inject, signal } from "@angular/core";
import { AUTH_CLIENT } from "./auth-client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export type AuthStatus = "loading" | "authed" | "anon";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly client = inject(AUTH_CLIENT);

  readonly user = signal<SessionUser | null>(null);
  readonly status = signal<AuthStatus>("loading");
  readonly isAuthenticated = computed(() => this.status() === "authed");

  /** Re-reads the session cookie. Safe to call many times. */
  async refresh(): Promise<void> {
    try {
      const { data } = await this.client.getSession();
      const sessionUser = data?.user;
      if (sessionUser) {
        this.user.set({ id: sessionUser.id, email: sessionUser.email, name: sessionUser.name });
        this.status.set("authed");
      } else {
        this.clear();
      }
    } catch {
      this.clear();
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client.signIn.email({ email, password });
    if (error) throw new Error(error.message ?? "Sign in failed");
    await this.refresh();
  }

  async signUp(name: string, email: string, password: string): Promise<void> {
    const { error } = await this.client.signUp.email({ name, email, password });
    if (error) throw new Error(error.message ?? "Sign up failed");
    await this.refresh();
  }

  async signOut(): Promise<void> {
    await this.client.signOut();
    this.clear();
  }

  /** Forget the session locally (used by the 401 interceptor and signOut). */
  clear(): void {
    this.user.set(null);
    this.status.set("anon");
  }
}
```

- [ ] **Step 5: Run the service test**

```bash
bun run ng test --watch=false --include src/app/core/auth/auth.service.spec.ts 2>&1 | tail -6
```

Expected: `Tests 7 passed (7)`.

- [ ] **Step 6: Write the failing guard test**

`apps/angular-web/src/app/core/auth/auth.guard.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import { Router, UrlTree, provideRouter, type ActivatedRouteSnapshot, type RouterStateSnapshot } from "@angular/router";
import { AUTH_CLIENT, type AuthClient } from "./auth-client";
import { AuthService } from "./auth.service";
import { authGuard, guestGuard } from "./auth.guard";

const user = { id: "u1", email: "a@b.co", name: "Ana" };
const route = {} as ActivatedRouteSnapshot;
const state = { url: "/hiring-processes/new" } as RouterStateSnapshot;

function setup(sessionUser: typeof user | null) {
  const fake = {
    getSession: vi.fn().mockResolvedValue({ data: sessionUser ? { user: sessionUser } : null, error: null }),
  };
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AUTH_CLIENT, useValue: fake as unknown as AuthClient }],
  });
  return { router: TestBed.inject(Router), auth: TestBed.inject(AuthService) };
}

describe("authGuard", () => {
  it("allows an authenticated user", async () => {
    setup(user);
    const result = await TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBe(true);
  });

  it("redirects an anonymous user to login with the redirect param", async () => {
    const { router } = setup(null);
    const result = await TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe("/auth/login?redirect=%2Fhiring-processes%2Fnew");
  });
});

describe("guestGuard", () => {
  it("allows an anonymous user", async () => {
    setup(null);
    const result = await TestBed.runInInjectionContext(() => guestGuard(route, state));
    expect(result).toBe(true);
  });

  it("sends an authenticated user to the list", async () => {
    const { router } = setup(user);
    const result = await TestBed.runInInjectionContext(() => guestGuard(route, state));
    expect(router.serializeUrl(result as UrlTree)).toBe("/hiring-processes");
  });
});
```

- [ ] **Step 7: Run it to see it fail**

```bash
bun run ng test --watch=false --include src/app/core/auth/auth.guard.spec.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './auth.guard'`.

- [ ] **Step 8: Implement `auth.guard.ts`**

```ts
import { inject } from "@angular/core";
import { Router, type CanActivateFn } from "@angular/router";
import { AuthService } from "./auth.service";

async function ensureSessionLoaded(auth: AuthService): Promise<void> {
  if (auth.status() === "loading") await auth.refresh();
}

/** Protects app routes: anonymous users go to /auth/login?redirect=<url>. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await ensureSessionLoaded(auth);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(["/auth/login"], { queryParams: { redirect: state.url } });
};

/** Protects /auth/* pages: authenticated users go straight to the list. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await ensureSessionLoaded(auth);
  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree(["/hiring-processes"]);
};
```

- [ ] **Step 9: Run the guard test**

```bash
bun run ng test --watch=false --include src/app/core/auth/auth.guard.spec.ts 2>&1 | tail -6
```

Expected: `Tests 4 passed (4)`.

- [ ] **Step 10: Write `app.config.ts`**

Replace `apps/angular-web/src/app/app.config.ts` with:

```ts
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideHttpClient, withFetch, withInterceptors } from "@angular/common/http";
import { Router, provideRouter, withComponentInputBinding } from "@angular/router";
import { QueryClient, provideTanStackQuery } from "@tanstack/angular-query-experimental";
import { routes } from "./app.routes";
import { AuthService } from "./core/auth/auth.service";
import { UNAUTHORIZED_HANDLER, apiErrorInterceptor } from "./core/http/api-error.interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([apiErrorInterceptor])),
    provideTanStackQuery(
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
    ),
    {
      provide: UNAUTHORIZED_HANDLER,
      useFactory: () => {
        const auth = inject(AuthService);
        const router = inject(Router);
        return () => {
          auth.clear();
          void router.navigate(["/auth/login"], { queryParams: { redirect: router.url } });
        };
      },
    },
    // Load the session before the first route resolves, so guards never see "loading".
    provideAppInitializer(() => inject(AuthService).refresh()),
  ],
};
```

- [ ] **Step 11: Build and run all tests**

```bash
bun run build 2>&1 | tail -5
bun run test 2>&1 | tail -6
```

Expected: build completes; all tests pass (`Tests 24 passed (24)`).

- [ ] **Step 12: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): signal-based AuthService, route guards and app providers"
```

---

### Task 6: `HiringProcessesApi` (HttpClient)

**Files:**

- Create: `apps/angular-web/src/app/core/api/hiring-process.model.ts`, `hiring-processes.api.ts`, `hiring-processes.api.spec.ts`

**Interfaces:**

- Produces:

```ts
export interface HiringProcess { id; companyName; jobTitle?: string|null; status: HiringProcessStatus; salary: number|null; currency: Currency; salaryRateType: SalaryRateType; userId; createdAt: string; updatedAt: string; archivedAt?: string|null; archiveReason?: ArchiveReason|null }
export interface HiringProcessListParams { page: number; limit: number; statuses?: HiringProcessStatus[]; salaryDeclared?: boolean }
export interface HiringProcessListResult { items: HiringProcess[]; pagination: PaginationMeta }
class HiringProcessesApi {
  list(params): Promise<HiringProcessListResult>
  get(id): Promise<HiringProcess>
  create(body: CreateHiringProcess): Promise<HiringProcess>
  update(id, body: UpdateHiringProcess): Promise<HiringProcess>
  changeStatus(id, status: HiringProcessStatus): Promise<HiringProcess>
  archive(id, reason: ArchiveReason): Promise<HiringProcess>
  restore(id): Promise<HiringProcess>
  delete(id): Promise<void>
}
```

- [ ] **Step 1: Write `hiring-process.model.ts`**

```ts
import type {
  ArchiveReason,
  Currency,
  HiringProcessStatus,
  SalaryRateType,
} from "@interviews-tool/domain/constants";
import type { PaginationMeta } from "@interviews-tool/domain/types";

/**
 * Wire shape of a hiring process. Dates are ISO strings because they come
 * straight from JSON (domain's HiringProcessBase types them as Date).
 */
export interface HiringProcess {
  id: string;
  companyName: string;
  jobTitle?: string | null;
  status: HiringProcessStatus;
  salary: number | null;
  currency: Currency;
  salaryRateType: SalaryRateType;
  userId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  archiveReason?: ArchiveReason | null;
}

export interface HiringProcessListParams {
  page: number;
  limit: number;
  statuses?: HiringProcessStatus[];
  salaryDeclared?: boolean;
}

export interface HiringProcessListResult {
  items: HiringProcess[];
  pagination: PaginationMeta;
}
```

- [ ] **Step 2: Write the failing API test**

`apps/angular-web/src/app/core/api/hiring-processes.api.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { HiringProcessesApi } from "./hiring-processes.api";
import type { HiringProcess } from "./hiring-process.model";

const item: HiringProcess = {
  id: "11111111-1111-4111-8111-111111111111",
  companyName: "Acme",
  jobTitle: "Frontend",
  status: "ongoing",
  salary: 3000,
  currency: "USD",
  salaryRateType: "monthly",
  userId: "u1",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
};

describe("HiringProcessesApi", () => {
  let api: HiringProcessesApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(HiringProcessesApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it("list() sends page/limit, repeats statuses and unwraps data + pagination", async () => {
    const pending = api.list({ page: 2, limit: 10, statuses: ["ongoing", "hired"], salaryDeclared: true });
    const req = ctrl.expectOne((r) => r.url === "/api/v1/hiring-processes");
    expect(req.request.method).toBe("GET");
    expect(req.request.params.get("page")).toBe("2");
    expect(req.request.params.get("limit")).toBe("10");
    expect(req.request.params.getAll("statuses")).toEqual(["ongoing", "hired"]);
    expect(req.request.params.get("salaryDeclared")).toBe("true");
    req.flush({
      data: [item],
      error: null,
      meta: { pagination: { page: 2, limit: 10, total: 11, totalPages: 2 } },
    });
    const result = await pending;
    expect(result.items).toEqual([item]);
    expect(result.pagination.totalPages).toBe(2);
  });

  it("list() omits optional params when not given", async () => {
    const pending = api.list({ page: 1, limit: 10 });
    const req = ctrl.expectOne((r) => r.url === "/api/v1/hiring-processes");
    expect(req.request.params.has("statuses")).toBe(false);
    expect(req.request.params.has("salaryDeclared")).toBe(false);
    req.flush({ data: [], error: null, meta: { pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } } });
    expect((await pending).items).toEqual([]);
  });

  it("get() unwraps data", async () => {
    const pending = api.get(item.id);
    ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null });
    expect(await pending).toEqual(item);
  });

  it("create() POSTs the body", async () => {
    const pending = api.create({ companyName: "Acme", status: "first-contact" });
    const req = ctrl.expectOne("/api/v1/hiring-processes");
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ companyName: "Acme", status: "first-contact" });
    req.flush({ data: item, error: null }, { status: 201, statusText: "Created" });
    expect(await pending).toEqual(item);
  });

  it("update() PUTs the body", async () => {
    const pending = api.update(item.id, { companyName: "Acme 2", status: "ongoing" });
    const req = ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`);
    expect(req.request.method).toBe("PUT");
    req.flush({ data: { ...item, companyName: "Acme 2" }, error: null });
    expect((await pending).companyName).toBe("Acme 2");
  });

  it("changeStatus() PATCHes /status", async () => {
    const pending = api.changeStatus(item.id, "hired");
    const req = ctrl.expectOne(`/api/v1/hiring-processes/${item.id}/status`);
    expect(req.request.method).toBe("PATCH");
    expect(req.request.body).toEqual({ status: "hired" });
    req.flush({ data: { ...item, status: "hired" }, error: null });
    expect((await pending).status).toBe("hired");
  });

  it("archive() POSTs /archive with a reason", async () => {
    const pending = api.archive(item.id, "no-reply");
    const req = ctrl.expectOne(`/api/v1/hiring-processes/${item.id}/archive`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ reason: "no-reply" });
    req.flush({ data: { ...item, archivedAt: "2026-08-26T00:00:00.000Z", archiveReason: "no-reply" }, error: null });
    expect((await pending).archiveReason).toBe("no-reply");
  });

  it("restore() POSTs /restore", async () => {
    const pending = api.restore(item.id);
    const req = ctrl.expectOne(`/api/v1/hiring-processes/${item.id}/restore`);
    expect(req.request.method).toBe("POST");
    req.flush({ data: item, error: null });
    expect(await pending).toEqual(item);
  });

  it("delete() sends DELETE and resolves on 204", async () => {
    const pending = api.delete(item.id);
    const req = ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`);
    expect(req.request.method).toBe("DELETE");
    req.flush(null, { status: 204, statusText: "No Content" });
    await expect(pending).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use 24
bun run ng test --watch=false --include src/app/core/api/hiring-processes.api.spec.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './hiring-processes.api'`.

- [ ] **Step 4: Implement `hiring-processes.api.ts`**

```ts
import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import type { ArchiveReason, HiringProcessStatus } from "@interviews-tool/domain/constants";
import type { CreateHiringProcess, UpdateHiringProcess } from "@interviews-tool/domain/schemas";
import type { ApiResponse } from "@interviews-tool/domain/types";
import { firstValueFrom } from "rxjs";
import type { HiringProcess, HiringProcessListParams, HiringProcessListResult } from "./hiring-process.model";

const BASE = "/api/v1/hiring-processes";

@Injectable({ providedIn: "root" })
export class HiringProcessesApi {
  private readonly http = inject(HttpClient);

  async list(params: HiringProcessListParams): Promise<HiringProcessListResult> {
    let query = new HttpParams().set("page", params.page).set("limit", params.limit);
    // Elysia + zod expect the key repeated for arrays: statuses=a&statuses=b
    for (const status of params.statuses ?? []) query = query.append("statuses", status);
    if (params.salaryDeclared !== undefined) {
      query = query.set("salaryDeclared", String(params.salaryDeclared));
    }
    const res = await firstValueFrom(
      this.http.get<ApiResponse<HiringProcess[]>>(BASE, { params: query }),
    );
    return {
      items: res.data ?? [],
      pagination: res.meta?.pagination ?? {
        page: params.page,
        limit: params.limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  get(id: string): Promise<HiringProcess> {
    return this.unwrap(this.http.get<ApiResponse<HiringProcess>>(`${BASE}/${id}`));
  }

  create(body: CreateHiringProcess): Promise<HiringProcess> {
    return this.unwrap(this.http.post<ApiResponse<HiringProcess>>(BASE, body));
  }

  update(id: string, body: UpdateHiringProcess): Promise<HiringProcess> {
    return this.unwrap(this.http.put<ApiResponse<HiringProcess>>(`${BASE}/${id}`, body));
  }

  changeStatus(id: string, status: HiringProcessStatus): Promise<HiringProcess> {
    return this.unwrap(
      this.http.patch<ApiResponse<HiringProcess>>(`${BASE}/${id}/status`, { status }),
    );
  }

  archive(id: string, reason: ArchiveReason): Promise<HiringProcess> {
    return this.unwrap(
      this.http.post<ApiResponse<HiringProcess>>(`${BASE}/${id}/archive`, { reason }),
    );
  }

  restore(id: string): Promise<HiringProcess> {
    return this.unwrap(this.http.post<ApiResponse<HiringProcess>>(`${BASE}/${id}/restore`, {}));
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${BASE}/${id}`));
  }

  private async unwrap<T>(request: import("rxjs").Observable<ApiResponse<T>>): Promise<T> {
    const res = await firstValueFrom(request);
    if (res.data === null || res.data === undefined) {
      throw new Error(res.error?.message ?? "Empty response");
    }
    return res.data;
  }
}
```

- [ ] **Step 5: Run the test**

```bash
bun run ng test --watch=false --include src/app/core/api/hiring-processes.api.spec.ts 2>&1 | tail -6
```

Expected: `Tests 9 passed (9)`.

- [ ] **Step 6: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web/src/app/core/api
git commit -m "feat(angular-web): typed HiringProcessesApi over HttpClient"
```

---

### Task 7: Query keys and TanStack Query factories

**Files:**

- Create: `apps/angular-web/src/app/features/hiring-processes/hiring-process.keys.ts`, `hiring-process.queries.ts`

**Interfaces:**

- Consumes: `HiringProcessesApi` (Task 6).
- Produces (all must be called inside an injection context, i.e. as class field initializers of a component):

```ts
hiringProcessKeys.all / lists() / list(params) / details() / detail(id)
injectHiringProcessList(params: () => HiringProcessListParams)      // query
injectHiringProcess(id: () => string | undefined)                   // query, disabled when id is undefined
injectCreateHiringProcess()      // mutation: (body: CreateHiringProcess) => HiringProcess
injectUpdateHiringProcess()      // mutation: ({ id, body }) => HiringProcess
injectChangeHiringProcessStatus()// mutation: ({ id, status }) => HiringProcess
injectArchiveHiringProcess()     // mutation: ({ id, reason }) => HiringProcess
injectRestoreHiringProcess()     // mutation: (id) => HiringProcess
injectDeleteHiringProcess()      // mutation: (id) => void
```

Every mutation invalidates `hiringProcessKeys.all` on success.

- [ ] **Step 1: Write `hiring-process.keys.ts`**

```ts
import type { HiringProcessListParams } from "../../core/api/hiring-process.model";

/** Same shape as apps/web/src/hooks/hiring-process-keys.ts so both clients stay aligned. */
export const hiringProcessKeys = {
  all: ["hiringProcesses"] as const,
  lists: () => [...hiringProcessKeys.all, "list"] as const,
  list: (params: HiringProcessListParams) => [...hiringProcessKeys.lists(), params] as const,
  details: () => [...hiringProcessKeys.all, "detail"] as const,
  detail: (id: string) => [...hiringProcessKeys.details(), id] as const,
};
```

- [ ] **Step 2: Write `hiring-process.queries.ts`**

```ts
import { inject } from "@angular/core";
import type { ArchiveReason, HiringProcessStatus } from "@interviews-tool/domain/constants";
import type { CreateHiringProcess, UpdateHiringProcess } from "@interviews-tool/domain/schemas";
import { injectMutation, injectQuery, injectQueryClient } from "@tanstack/angular-query-experimental";
import type { HiringProcessListParams } from "../../core/api/hiring-process.model";
import { HiringProcessesApi } from "../../core/api/hiring-processes.api";
import { hiringProcessKeys } from "./hiring-process.keys";

export function injectHiringProcessList(params: () => HiringProcessListParams) {
  const api = inject(HiringProcessesApi);
  return injectQuery(() => ({
    queryKey: hiringProcessKeys.list(params()),
    queryFn: () => api.list(params()),
  }));
}

export function injectHiringProcess(id: () => string | undefined) {
  const api = inject(HiringProcessesApi);
  return injectQuery(() => {
    const value = id();
    return {
      queryKey: hiringProcessKeys.detail(value ?? ""),
      queryFn: () => api.get(value as string),
      enabled: value !== undefined && value !== "",
    };
  });
}

function useInvalidateAll() {
  const queryClient = injectQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: hiringProcessKeys.all });
}

export function injectCreateHiringProcess() {
  const api = inject(HiringProcessesApi);
  const invalidate = useInvalidateAll();
  return injectMutation(() => ({
    mutationFn: (body: CreateHiringProcess) => api.create(body),
    onSuccess: invalidate,
  }));
}

export function injectUpdateHiringProcess() {
  const api = inject(HiringProcessesApi);
  const invalidate = useInvalidateAll();
  return injectMutation(() => ({
    mutationFn: (input: { id: string; body: UpdateHiringProcess }) => api.update(input.id, input.body),
    onSuccess: invalidate,
  }));
}

export function injectChangeHiringProcessStatus() {
  const api = inject(HiringProcessesApi);
  const invalidate = useInvalidateAll();
  return injectMutation(() => ({
    mutationFn: (input: { id: string; status: HiringProcessStatus }) =>
      api.changeStatus(input.id, input.status),
    onSuccess: invalidate,
  }));
}

export function injectArchiveHiringProcess() {
  const api = inject(HiringProcessesApi);
  const invalidate = useInvalidateAll();
  return injectMutation(() => ({
    mutationFn: (input: { id: string; reason: ArchiveReason }) => api.archive(input.id, input.reason),
    onSuccess: invalidate,
  }));
}

export function injectRestoreHiringProcess() {
  const api = inject(HiringProcessesApi);
  const invalidate = useInvalidateAll();
  return injectMutation(() => ({
    mutationFn: (id: string) => api.restore(id),
    onSuccess: invalidate,
  }));
}

export function injectDeleteHiringProcess() {
  const api = inject(HiringProcessesApi);
  const invalidate = useInvalidateAll();
  return injectMutation(() => ({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: invalidate,
  }));
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use 24
bun run check-types
```

Expected: no output (no errors). These factories are exercised by the page tests in Tasks 9–11.

- [ ] **Step 4: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web/src/app/features/hiring-processes
git commit -m "feat(angular-web): TanStack Query keys and inject* factories for hiring processes"
```

---

### Task 8: App shell, routes, Login and Signup (Signal Forms)

**Files:**

- Modify: `apps/angular-web/src/app/app.routes.ts`, `app.ts`, `app.html`, `app.spec.ts`
- Create: `apps/angular-web/src/app/features/auth/login.ts`, `login.spec.ts`, `signup.ts`
- Create placeholder pages so lazy routes compile: `features/hiring-processes/list/list-page.ts`, `form/form-page.ts`, `detail/detail-page.ts` (replaced in Tasks 9–11)

**Interfaces:**

- Consumes: `AuthService`, `authGuard`, `guestGuard` (Task 5).
- Produces: routes `/auth/login`, `/auth/signup`, `/hiring-processes`, `/hiring-processes/new`, `/hiring-processes/:id`, `/hiring-processes/:id/edit`; exported classes `Login`, `Signup`, `ListPage`, `FormPage`, `DetailPage`.

- [ ] **Step 1: Create placeholder pages (temporary, replaced later)**

`apps/angular-web/src/app/features/hiring-processes/list/list-page.ts`:

```ts
import { Component } from "@angular/core";

@Component({ selector: "app-list-page", template: `<p>List page</p>` })
export class ListPage {}
```

`apps/angular-web/src/app/features/hiring-processes/form/form-page.ts`:

```ts
import { Component, input } from "@angular/core";

@Component({ selector: "app-form-page", template: `<p>Form page {{ id() ?? "new" }}</p>` })
export class FormPage {
  readonly id = input<string>();
}
```

`apps/angular-web/src/app/features/hiring-processes/detail/detail-page.ts`:

```ts
import { Component, input } from "@angular/core";

@Component({ selector: "app-detail-page", template: `<p>Detail page {{ id() }}</p>` })
export class DetailPage {
  readonly id = input.required<string>();
}
```

- [ ] **Step 2: Write `app.routes.ts`**

```ts
import type { Routes } from "@angular/router";
import { authGuard, guestGuard } from "./core/auth/auth.guard";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "hiring-processes" },
  {
    path: "auth/login",
    canActivate: [guestGuard],
    loadComponent: () => import("./features/auth/login").then((m) => m.Login),
  },
  {
    path: "auth/signup",
    canActivate: [guestGuard],
    loadComponent: () => import("./features/auth/signup").then((m) => m.Signup),
  },
  {
    path: "hiring-processes",
    canActivate: [authGuard],
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./features/hiring-processes/list/list-page").then((m) => m.ListPage),
      },
      {
        path: "new",
        loadComponent: () =>
          import("./features/hiring-processes/form/form-page").then((m) => m.FormPage),
      },
      {
        path: ":id/edit",
        loadComponent: () =>
          import("./features/hiring-processes/form/form-page").then((m) => m.FormPage),
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./features/hiring-processes/detail/detail-page").then((m) => m.DetailPage),
      },
    ],
  },
  { path: "**", redirectTo: "hiring-processes" },
];
```

- [ ] **Step 3: Write the shell**

`apps/angular-web/src/app/app.ts`:

```ts
import { Component, inject } from "@angular/core";
import { Router, RouterLink, RouterOutlet } from "@angular/router";
import { AuthService } from "./core/auth/auth.service";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink],
  templateUrl: "./app.html",
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(["/auth/login"]);
  }
}
```

`apps/angular-web/src/app/app.html`:

```html
<header class="border-b border-border bg-surface">
  <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
    <a routerLink="/hiring-processes" class="text-sm font-semibold tracking-tight">
      Tapuy <span class="text-text-muted">· angular</span>
    </a>
    @if (auth.isAuthenticated()) {
      <div class="flex items-center gap-3 text-sm">
        <span class="text-text-secondary">{{ auth.user()?.email }}</span>
        <button type="button" class="btn btn-secondary" (click)="signOut()">Sign out</button>
      </div>
    }
  </div>
</header>
<main class="mx-auto max-w-5xl px-4 py-6">
  <router-outlet />
</main>
```

Replace `apps/angular-web/src/app/app.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { App } from "./app";
import { AuthService } from "./core/auth/auth.service";

describe("App", () => {
  it("shows the user email and sign out when authenticated", async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const auth = TestBed.inject(AuthService);
    auth.user.set({ id: "u1", email: "a@b.co", name: "Ana" });
    auth.status.set("authed");
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain("a@b.co");
    expect(text).toContain("Sign out");
  });

  it("hides the user area when anonymous", async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(AuthService).status.set("anon");
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain("Sign out");
  });
});
```

- [ ] **Step 4: Write the failing Login test**

`apps/angular-web/src/app/features/auth/login.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import { Router, provideRouter } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { Login } from "./login";

function setup() {
  const auth = { signIn: vi.fn().mockResolvedValue(undefined) };
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, "navigateByUrl").mockResolvedValue(true);
  const fixture = TestBed.createComponent(Login);
  return { auth, fixture, navigate };
}

function fill(fixture: ReturnType<typeof TestBed.createComponent>, selector: string, value: string) {
  const el = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  el.value = value;
  el.dispatchEvent(new Event("input"));
}

describe("Login", () => {
  it("shows validation errors when submitted empty", async () => {
    const { auth, fixture } = setup();
    await fixture.whenStable();
    (fixture.nativeElement.querySelector("form") as HTMLFormElement).requestSubmit();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain("Email is required");
    expect(fixture.nativeElement.textContent).toContain("Password is required");
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it("signs in and navigates to the redirect target", async () => {
    const { auth, fixture, navigate } = setup();
    fixture.componentRef.setInput("redirect", "/hiring-processes/new");
    await fixture.whenStable();
    fill(fixture, "input[type=email]", "a@b.co");
    fill(fixture, "input[type=password]", "secret123");
    await fixture.whenStable();
    (fixture.nativeElement.querySelector("form") as HTMLFormElement).requestSubmit();
    await vi.waitFor(() => expect(auth.signIn).toHaveBeenCalledWith("a@b.co", "secret123"));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/hiring-processes/new"));
  });

  it("shows the server error message", async () => {
    const { auth, fixture } = setup();
    auth.signIn.mockRejectedValueOnce(new Error("Invalid credentials"));
    await fixture.whenStable();
    fill(fixture, "input[type=email]", "a@b.co");
    fill(fixture, "input[type=password]", "secret123");
    await fixture.whenStable();
    (fixture.nativeElement.querySelector("form") as HTMLFormElement).requestSubmit();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Invalid credentials");
    });
  });
});
```

- [ ] **Step 5: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use 24
bun run ng test --watch=false --include src/app/features/auth/login.spec.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './login'`.

- [ ] **Step 6: Implement `login.ts` with Signal Forms**

```ts
import { Component, inject, input, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { FormField, form, required, email, submit } from "@angular/forms/signals";
import { AuthService } from "../../core/auth/auth.service";

@Component({
  selector: "app-login",
  imports: [FormField, RouterLink],
  template: `
    <div class="mx-auto max-w-sm">
      <h1 class="mb-4 text-xl font-semibold">Sign in</h1>
      <form class="card flex flex-col gap-4" (submit)="onSubmit($event)" novalidate>
        <div>
          <label class="label" for="email">Email</label>
          <input
            id="email"
            type="email"
            class="input"
            autocomplete="email"
            [formField]="loginForm.email"
            [attr.aria-invalid]="showError(loginForm.email())"
          />
          @if (showError(loginForm.email())) {
            <p class="field-error">{{ loginForm.email().errors()[0]?.message }}</p>
          }
        </div>
        <div>
          <label class="label" for="password">Password</label>
          <input
            id="password"
            type="password"
            class="input"
            autocomplete="current-password"
            [formField]="loginForm.password"
            [attr.aria-invalid]="showError(loginForm.password())"
          />
          @if (showError(loginForm.password())) {
            <p class="field-error">{{ loginForm.password().errors()[0]?.message }}</p>
          }
        </div>
        @if (serverError()) {
          <p class="field-error" role="alert">{{ serverError() }}</p>
        }
        <button type="submit" class="btn btn-primary" [disabled]="loginForm().submitting()">
          {{ loginForm().submitting() ? "Signing in…" : "Sign in" }}
        </button>
        <p class="text-center text-xs text-text-muted">
          No account? <a routerLink="/auth/signup" class="underline">Sign up</a>
        </p>
      </form>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Bound from ?redirect= by withComponentInputBinding. */
  readonly redirect = input<string>();

  protected readonly serverError = signal<string | null>(null);
  protected readonly model = signal({ email: "", password: "" });

  protected readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: "Email is required" });
    email(path.email, { message: "Enter a valid email" });
    required(path.password, { message: "Password is required" });
  });

  /** Errors are shown once the field was touched or the form was submitted. */
  protected showError(field: { touched: () => boolean; invalid: () => boolean }): boolean {
    return field.invalid() && (field.touched() || this.loginForm().submitting());
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);
    void submit(this.loginForm, async () => {
      const { email, password } = this.model();
      try {
        await this.auth.signIn(email, password);
        await this.router.navigateByUrl(this.redirect() || "/hiring-processes");
      } catch (err) {
        this.serverError.set((err as Error).message);
      }
    });
  }
}
```

Note for the implementer: `submit()` marks every field as touched before running the callback and only runs it when the form is valid, so the first test passes without extra code. If the errors do not show after an empty submit, change `showError` to `return field.invalid() && (field.touched() || this.submitted())` with a `submitted = signal(false)` set to `true` at the top of `onSubmit`.

- [ ] **Step 7: Run the Login test**

```bash
bun run ng test --watch=false --include src/app/features/auth/login.spec.ts 2>&1 | tail -8
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 8: Implement `signup.ts` (same pattern, no test — covered by the manual check)**

```ts
import { Component, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { FormField, form, required, email, minLength, submit } from "@angular/forms/signals";
import { AuthService } from "../../core/auth/auth.service";

@Component({
  selector: "app-signup",
  imports: [FormField, RouterLink],
  template: `
    <div class="mx-auto max-w-sm">
      <h1 class="mb-4 text-xl font-semibold">Create account</h1>
      <form class="card flex flex-col gap-4" (submit)="onSubmit($event)" novalidate>
        <div>
          <label class="label" for="name">Name</label>
          <input id="name" type="text" class="input" autocomplete="name" [formField]="signupForm.name" />
          @if (showError(signupForm.name())) {
            <p class="field-error">{{ signupForm.name().errors()[0]?.message }}</p>
          }
        </div>
        <div>
          <label class="label" for="email">Email</label>
          <input id="email" type="email" class="input" autocomplete="email" [formField]="signupForm.email" />
          @if (showError(signupForm.email())) {
            <p class="field-error">{{ signupForm.email().errors()[0]?.message }}</p>
          }
        </div>
        <div>
          <label class="label" for="password">Password</label>
          <input
            id="password"
            type="password"
            class="input"
            autocomplete="new-password"
            [formField]="signupForm.password"
          />
          @if (showError(signupForm.password())) {
            <p class="field-error">{{ signupForm.password().errors()[0]?.message }}</p>
          }
        </div>
        @if (serverError()) {
          <p class="field-error" role="alert">{{ serverError() }}</p>
        }
        <button type="submit" class="btn btn-primary" [disabled]="signupForm().submitting()">
          {{ signupForm().submitting() ? "Creating…" : "Create account" }}
        </button>
        <p class="text-center text-xs text-text-muted">
          Already have an account? <a routerLink="/auth/login" class="underline">Sign in</a>
        </p>
      </form>
    </div>
  `,
})
export class Signup {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly serverError = signal<string | null>(null);
  protected readonly model = signal({ name: "", email: "", password: "" });

  protected readonly signupForm = form(this.model, (path) => {
    required(path.name, { message: "Name is required" });
    required(path.email, { message: "Email is required" });
    email(path.email, { message: "Enter a valid email" });
    required(path.password, { message: "Password is required" });
    minLength(path.password, 8, { message: "Use at least 8 characters" });
  });

  protected showError(field: { touched: () => boolean; invalid: () => boolean }): boolean {
    return field.invalid() && (field.touched() || this.signupForm().submitting());
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);
    void submit(this.signupForm, async () => {
      const { name, email, password } = this.model();
      try {
        await this.auth.signUp(name, email, password);
        await this.router.navigateByUrl("/hiring-processes");
      } catch (err) {
        this.serverError.set((err as Error).message);
      }
    });
  }
}
```

- [ ] **Step 9: Build, run all tests, and smoke-test in the browser**

```bash
bun run build 2>&1 | tail -5
bun run test 2>&1 | tail -6
```

Expected: build completes (lazy chunks for login/signup/list/form/detail listed); all tests pass.

Then, with the API running on port 3000 (`bun run dev:server` from the repo root in another terminal — if it fails with "Address already in use" the server is already running, which is fine):

```bash
bun run dev
```

Open `http://localhost:4200`. Expected: redirected to `/auth/login?redirect=%2Fhiring-processes`; submitting empty shows the two errors; signing in with a real account lands on "List page" and the header shows the email; "Sign out" returns to login. Stop the dev server with Ctrl+C.

- [ ] **Step 10: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): app shell, guarded routes, and Signal Forms login/signup"
```

---

### Task 9: List page (filters in the URL, table, pagination)

**Files:**

- Replace: `apps/angular-web/src/app/features/hiring-processes/list/list-page.ts`
- Create: `list-filters.ts`, `hiring-process-table.ts`, `list-page.spec.ts` (same folder)

**Interfaces:**

- Consumes: `injectHiringProcessList` (Task 7), `StatusBadge`, `EmptyState`, `Spinner`, `MoneyPipe`, `RelativeDatePipe` (Task 3), `HiringProcess` (Task 6).
- Produces: `ListPage` with route-bound inputs `page`, `status`, `salaryDeclared` (all strings from the query string); `ListFilters` with inputs `status`, `salaryDeclared` and output `filtersChange: { status: HiringProcessStatus | null; salaryDeclared: boolean }`; `HiringProcessTable` with input `items: HiringProcess[]`.

- [ ] **Step 1: Write the failing page test**

`apps/angular-web/src/app/features/hiring-processes/list/list-page.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import { Router, provideRouter } from "@angular/router";
import { QueryClient, provideTanStackQuery } from "@tanstack/angular-query-experimental";
import { HiringProcessesApi } from "../../../core/api/hiring-processes.api";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
import { ListPage } from "./list-page";

const item: HiringProcess = {
  id: "11111111-1111-4111-8111-111111111111",
  companyName: "Acme",
  jobTitle: "Frontend",
  status: "ongoing",
  salary: 3000,
  currency: "USD",
  salaryRateType: "monthly",
  userId: "u1",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
};

function setup(items: HiringProcess[]) {
  const api = {
    list: vi.fn().mockResolvedValue({
      items,
      pagination: { page: 1, limit: 10, total: items.length, totalPages: items.length ? 1 : 0 },
    }),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: HiringProcessesApi, useValue: api },
    ],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, "navigate").mockResolvedValue(true);
  const fixture = TestBed.createComponent(ListPage);
  return { api, fixture, navigate };
}

describe("ListPage", () => {
  it("renders the rows returned by the API", async () => {
    const { api, fixture } = setup([item]);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Acme");
    });
    expect(api.list).toHaveBeenCalledWith({ page: 1, limit: 10, statuses: undefined, salaryDeclared: undefined });
    expect(fixture.nativeElement.textContent).toContain("$3,000 / mo");
    expect(fixture.nativeElement.querySelector(".badge")?.textContent).toContain("Ongoing");
  });

  it("maps route inputs to API params", async () => {
    const { api, fixture } = setup([item]);
    fixture.componentRef.setInput("page", "2");
    fixture.componentRef.setInput("status", "hired");
    fixture.componentRef.setInput("salaryDeclared", "true");
    fixture.detectChanges();
    await vi.waitFor(() =>
      expect(api.list).toHaveBeenCalledWith({ page: 2, limit: 10, statuses: ["hired"], salaryDeclared: true }),
    );
  });

  it("shows the empty state when there are no rows", async () => {
    const { fixture } = setup([]);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("No hiring processes yet");
    });
  });

  it("writes filter changes to the URL and resets the page", async () => {
    const { fixture, navigate } = setup([item]);
    fixture.detectChanges();
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector("select#status") as HTMLSelectElement;
    select.value = "hired";
    select.dispatchEvent(new Event("change"));
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: { status: "hired", salaryDeclared: null, page: null },
      queryParamsHandling: "merge",
    }));
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use 24
bun run ng test --watch=false --include src/app/features/hiring-processes/list/list-page.spec.ts 2>&1 | tail -12
```

Expected: FAIL (the placeholder page renders "List page" and never calls the API).

- [ ] **Step 3: Write `list-filters.ts`**

```ts
import { Component, input, output } from "@angular/core";
import {
  HIRING_PROCESS_STATUS_INFO,
  HIRING_PROCESS_STATUS_ORDER,
  type HiringProcessStatus,
} from "@interviews-tool/domain/constants";

export interface ListFilterValues {
  status: HiringProcessStatus | null;
  salaryDeclared: boolean;
}

@Component({
  selector: "app-list-filters",
  template: `
    <div class="flex flex-wrap items-end gap-4">
      <div>
        <label class="label" for="status">Status</label>
        <select id="status" class="input min-w-44" [value]="status() ?? ''" (change)="onStatus($event)">
          <option value="">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ info[s].label }}</option>
          }
        </select>
      </div>
      <label class="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" [checked]="salaryDeclared()" (change)="onSalary($event)" />
        Only with salary
      </label>
    </div>
  `,
})
export class ListFilters {
  readonly status = input<HiringProcessStatus | null>(null);
  readonly salaryDeclared = input(false);
  readonly filtersChange = output<ListFilterValues>();

  protected readonly statuses = HIRING_PROCESS_STATUS_ORDER;
  protected readonly info = HIRING_PROCESS_STATUS_INFO;

  protected onStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filtersChange.emit({
      status: value ? (value as HiringProcessStatus) : null,
      salaryDeclared: this.salaryDeclared(),
    });
  }

  protected onSalary(event: Event): void {
    this.filtersChange.emit({
      status: this.status(),
      salaryDeclared: (event.target as HTMLInputElement).checked,
    });
  }
}
```

- [ ] **Step 4: Write `hiring-process-table.ts`**

```ts
import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
import { MoneyPipe } from "../../../shared/pipes/money.pipe";
import { RelativeDatePipe } from "../../../shared/pipes/relative-date.pipe";
import { StatusBadge } from "../../../shared/ui/status-badge";

@Component({
  selector: "app-hiring-process-table",
  imports: [RouterLink, StatusBadge, MoneyPipe, RelativeDatePipe],
  template: `
    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="text-left text-xs text-text-muted">
          <tr class="border-b border-border">
            <th class="px-4 py-2 font-medium">Company</th>
            <th class="px-4 py-2 font-medium">Role</th>
            <th class="px-4 py-2 font-medium">Status</th>
            <th class="px-4 py-2 font-medium">Salary</th>
            <th class="px-4 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.id) {
            <tr class="border-b border-border last:border-0 hover:bg-selected">
              <td class="px-4 py-2 font-medium">
                <a [routerLink]="['/hiring-processes', item.id]" class="hover:underline">
                  {{ item.companyName }}
                </a>
              </td>
              <td class="px-4 py-2 text-text-secondary">{{ item.jobTitle || "—" }}</td>
              <td class="px-4 py-2"><app-status-badge [status]="item.status" /></td>
              <td class="px-4 py-2 font-mono">{{ item.salary | money: item.currency : item.salaryRateType }}</td>
              <td class="px-4 py-2 text-text-muted">{{ item.updatedAt | relativeDate }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class HiringProcessTable {
  readonly items = input.required<HiringProcess[]>();
}
```

- [ ] **Step 5: Write `list-page.ts`**

```ts
import { Component, computed, inject, input } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { isValidHiringProcessStatus, type HiringProcessStatus } from "@interviews-tool/domain/constants";
import type { HiringProcessListParams } from "../../../core/api/hiring-process.model";
import { EmptyState } from "../../../shared/ui/empty-state";
import { Spinner } from "../../../shared/ui/spinner";
import { injectHiringProcessList } from "../hiring-process.queries";
import { HiringProcessTable } from "./hiring-process-table";
import { ListFilters, type ListFilterValues } from "./list-filters";

const PAGE_SIZE = 10;

@Component({
  selector: "app-list-page",
  imports: [RouterLink, ListFilters, HiringProcessTable, EmptyState, Spinner],
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold">Hiring processes</h1>
      <a routerLink="/hiring-processes/new" class="btn btn-primary">New process</a>
    </div>

    <div class="mb-4">
      <app-list-filters
        [status]="statusFilter()"
        [salaryDeclared]="salaryDeclaredFilter()"
        (filtersChange)="applyFilters($event)"
      />
    </div>

    @if (query.isPending()) {
      <div class="flex justify-center py-10"><app-spinner /></div>
    } @else if (query.isError()) {
      <app-empty-state title="Could not load hiring processes" [message]="query.error().message">
        <button type="button" class="btn btn-secondary" (click)="query.refetch()">Retry</button>
      </app-empty-state>
    } @else if (query.data()!.items.length === 0) {
      <app-empty-state title="No hiring processes yet" message="Create your first one to start tracking.">
        <a routerLink="/hiring-processes/new" class="btn btn-primary">New process</a>
      </app-empty-state>
    } @else {
      <app-hiring-process-table [items]="query.data()!.items" />
      <div class="mt-4 flex items-center justify-between text-sm text-text-muted">
        <span>Page {{ pagination().page }} of {{ pagination().totalPages }} · {{ pagination().total }} total</span>
        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary" [disabled]="pagination().page <= 1" (click)="goToPage(pagination().page - 1)">
            Previous
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            [disabled]="pagination().page >= pagination().totalPages"
            (click)="goToPage(pagination().page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    }
  `,
})
export class ListPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Bound from the query string by withComponentInputBinding — always strings.
  readonly page = input<string>();
  readonly status = input<string>();
  readonly salaryDeclared = input<string>();

  protected readonly statusFilter = computed<HiringProcessStatus | null>(() => {
    const value = this.status();
    return value && isValidHiringProcessStatus(value) ? value : null;
  });
  protected readonly salaryDeclaredFilter = computed(() => this.salaryDeclared() === "true");
  private readonly pageNumber = computed(() => Math.max(1, Number(this.page()) || 1));

  private readonly params = computed<HiringProcessListParams>(() => {
    const status = this.statusFilter();
    return {
      page: this.pageNumber(),
      limit: PAGE_SIZE,
      statuses: status ? [status] : undefined,
      salaryDeclared: this.salaryDeclaredFilter() ? true : undefined,
    };
  });

  protected readonly query = injectHiringProcessList(() => this.params());
  protected readonly pagination = computed(
    () => this.query.data()?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 },
  );

  protected applyFilters(values: ListFilterValues): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: values.status,
        salaryDeclared: values.salaryDeclared ? "true" : null,
        page: null,
      },
      queryParamsHandling: "merge",
    });
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? String(page) : null },
      queryParamsHandling: "merge",
    });
  }
}
```

- [ ] **Step 6: Run the page test**

```bash
bun run ng test --watch=false --include src/app/features/hiring-processes/list/list-page.spec.ts 2>&1 | tail -8
```

Expected: `Tests 4 passed (4)`.

- [ ] **Step 7: Build, run all tests, smoke-test**

```bash
bun run build 2>&1 | tail -5
bun run test 2>&1 | tail -6
bun run dev
```

In the browser: the list shows real rows; changing the status select updates the URL (`?status=hired`) and the rows; Next/Previous change `?page=`; browser Back restores the previous filter. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): hiring process list with URL-driven filters and pagination"
```

---

### Task 10: Create/edit form (Reactive Forms + Zod)

**Files:**

- Create: `apps/angular-web/src/app/features/hiring-processes/form/hiring-process-form.ts`, `hiring-process-form.spec.ts`
- Replace: `apps/angular-web/src/app/features/hiring-processes/form/form-page.ts`

**Interfaces:**

- Consumes: `injectHiringProcess`, `injectCreateHiringProcess`, `injectUpdateHiringProcess` (Task 7), `ApiError` (Task 4), `HiringProcess` (Task 6).
- Produces: `HiringProcessForm` with inputs `initial: HiringProcess | null`, `submitting: boolean`, `serverError: string | null`, `submitLabel: string` and output `save: CreateHiringProcess`; `FormPage` with route input `id?: string` (edit when present).

- [ ] **Step 1: Write the failing form test**

`apps/angular-web/src/app/features/hiring-processes/form/hiring-process-form.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
import { HiringProcessForm } from "./hiring-process-form";

function setup(initial: HiringProcess | null = null) {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(HiringProcessForm);
  fixture.componentRef.setInput("initial", initial);
  const saved: unknown[] = [];
  fixture.componentInstance.save.subscribe((v) => saved.push(v));
  fixture.detectChanges();
  return { fixture, saved };
}

function set(fixture: ReturnType<typeof TestBed.createComponent>, id: string, value: string) {
  const el = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
  el.value = value;
  el.dispatchEvent(new Event("input"));
  el.dispatchEvent(new Event("change"));
}

function submitForm(fixture: ReturnType<typeof TestBed.createComponent>) {
  (fixture.nativeElement.querySelector("form") as HTMLFormElement).requestSubmit();
  fixture.detectChanges();
}

describe("HiringProcessForm", () => {
  it("requires a company name", () => {
    const { fixture, saved } = setup();
    submitForm(fixture);
    expect(fixture.nativeElement.textContent).toContain("Company name is required");
    expect(saved).toHaveLength(0);
  });

  it("emits a create payload with salary fields only when a salary is given", () => {
    const { fixture, saved } = setup();
    set(fixture, "companyName", "Acme");
    set(fixture, "jobTitle", "Frontend");
    set(fixture, "status", "ongoing");
    submitForm(fixture);
    expect(saved).toEqual([{ companyName: "Acme", jobTitle: "Frontend", status: "ongoing" }]);
  });

  it("includes currency and rate type when salary is set", () => {
    const { fixture, saved } = setup();
    set(fixture, "companyName", "Acme");
    set(fixture, "salary", "4500");
    set(fixture, "currency", "PEN");
    set(fixture, "salaryRateType", "hourly");
    submitForm(fixture);
    expect(saved[0]).toEqual({
      companyName: "Acme",
      status: "first-contact",
      salary: 4500,
      currency: "PEN",
      salaryRateType: "hourly",
    });
  });

  it("blocks a negative salary with the Zod message", () => {
    const { fixture, saved } = setup();
    set(fixture, "companyName", "Acme");
    set(fixture, "salary", "-5");
    submitForm(fixture);
    expect(fixture.nativeElement.textContent).toContain("Salary must be positive");
    expect(saved).toHaveLength(0);
  });

  it("prefills from initial", () => {
    const { fixture } = setup({
      id: "11111111-1111-4111-8111-111111111111",
      companyName: "Globex",
      jobTitle: "Backend",
      status: "on-hold",
      salary: 2000,
      currency: "USD",
      salaryRateType: "monthly",
      userId: "u1",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
    });
    expect((fixture.nativeElement.querySelector("#companyName") as HTMLInputElement).value).toBe("Globex");
    expect((fixture.nativeElement.querySelector("#status") as HTMLSelectElement).value).toBe("on-hold");
    expect((fixture.nativeElement.querySelector("#salary") as HTMLInputElement).value).toBe("2000");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use 24
bun run ng test --watch=false --include src/app/features/hiring-processes/form/hiring-process-form.spec.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './hiring-process-form'`.

- [ ] **Step 3: Implement `hiring-process-form.ts`**

```ts
import { Component, effect, inject, input, output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import {
  CURRENCY_VALUES,
  DEFAULT_HIRING_PROCESS_STATUS,
  HIRING_PROCESS_STATUS_INFO,
  HIRING_PROCESS_STATUS_ORDER,
  SALARY_RATE_TYPE_VALUES,
  type Currency,
  type HiringProcessStatus,
  type SalaryRateType,
} from "@interviews-tool/domain/constants";
import { createHiringProcessSchema, type CreateHiringProcess } from "@interviews-tool/domain/schemas";
import type { HiringProcess } from "../../../core/api/hiring-process.model";

@Component({
  selector: "app-hiring-process-form",
  imports: [ReactiveFormsModule],
  template: `
    <form class="card flex flex-col gap-4" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
      <div>
        <label class="label" for="companyName">Company name</label>
        <input id="companyName" class="input" formControlName="companyName" [attr.aria-invalid]="invalid('companyName')" />
        @if (errorOf('companyName'); as message) {
          <p class="field-error">{{ message }}</p>
        }
      </div>

      <div>
        <label class="label" for="jobTitle">Job title</label>
        <input id="jobTitle" class="input" formControlName="jobTitle" placeholder="Frontend Developer" />
      </div>

      <div>
        <label class="label" for="status">Status</label>
        <select id="status" class="input" formControlName="status">
          @for (s of statuses; track s) {
            <option [value]="s">{{ statusInfo[s].label }}</option>
          }
        </select>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="label" for="salary">Salary</label>
          <input id="salary" type="number" class="input" formControlName="salary" [attr.aria-invalid]="invalid('salary')" />
          @if (errorOf('salary'); as message) {
            <p class="field-error">{{ message }}</p>
          }
        </div>
        <div>
          <label class="label" for="currency">Currency</label>
          <select id="currency" class="input" formControlName="currency">
            @for (c of currencies; track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </div>
        <div>
          <label class="label" for="salaryRateType">Rate</label>
          <select id="salaryRateType" class="input" formControlName="salaryRateType">
            @for (r of rateTypes; track r) {
              <option [value]="r">{{ r }}</option>
            }
          </select>
        </div>
      </div>

      @if (serverError()) {
        <p class="field-error" role="alert">{{ serverError() }}</p>
      }

      <div class="flex justify-end gap-2">
        <ng-content select="[cancel]" />
        <button type="submit" class="btn btn-primary" [disabled]="submitting()">
          {{ submitting() ? "Saving…" : submitLabel() }}
        </button>
      </div>
    </form>
  `,
})
export class HiringProcessForm {
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly initial = input<HiringProcess | null>(null);
  readonly submitting = input(false);
  readonly serverError = input<string | null>(null);
  readonly submitLabel = input("Save");
  readonly save = output<CreateHiringProcess>();

  protected readonly statuses = HIRING_PROCESS_STATUS_ORDER;
  protected readonly statusInfo = HIRING_PROCESS_STATUS_INFO;
  protected readonly currencies = CURRENCY_VALUES;
  protected readonly rateTypes = SALARY_RATE_TYPE_VALUES;

  protected readonly form = this.fb.group({
    companyName: ["", [Validators.required]],
    jobTitle: [""],
    status: [DEFAULT_HIRING_PROCESS_STATUS as HiringProcessStatus, [Validators.required]],
    salary: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
    currency: ["USD" as Currency],
    salaryRateType: ["monthly" as SalaryRateType],
  });

  constructor() {
    // Prefill when editing. Runs again if `initial` changes (e.g. query resolves later).
    effect(() => {
      const value = this.initial();
      if (!value) return;
      this.form.reset({
        companyName: value.companyName,
        jobTitle: value.jobTitle ?? "",
        status: value.status,
        salary: value.salary,
        currency: value.currency,
        salaryRateType: value.salaryRateType,
      });
    });
  }

  protected invalid(name: "companyName" | "salary"): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected errorOf(name: "companyName" | "salary"): string | null {
    const control = this.form.controls[name];
    if (!this.invalid(name)) return null;
    if (control.hasError("required")) return "Company name is required";
    if (control.hasError("min")) return "Salary must be positive";
    if (control.hasError("zod")) return control.getError("zod") as string;
    return "Invalid value";
  }

  protected onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const salary = raw.salary === null || Number.isNaN(raw.salary) ? undefined : Number(raw.salary);
    const candidate: CreateHiringProcess = {
      companyName: raw.companyName.trim(),
      status: raw.status,
      ...(raw.jobTitle.trim() ? { jobTitle: raw.jobTitle.trim() } : {}),
      ...(salary !== undefined
        ? { salary, currency: raw.currency, salaryRateType: raw.salaryRateType }
        : {}),
    };

    // Same schema the server validates with — errors land on the matching control.
    const parsed = createHiringProcessSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof this.form.controls | undefined;
        if (key && key in this.form.controls) {
          this.form.controls[key].setErrors({ zod: issue.message });
          this.form.controls[key].markAsTouched();
        }
      }
      return;
    }
    this.save.emit(parsed.data);
  }
}
```

- [ ] **Step 4: Run the form test**

```bash
bun run ng test --watch=false --include src/app/features/hiring-processes/form/hiring-process-form.spec.ts 2>&1 | tail -8
```

Expected: `Tests 5 passed (5)`. If the `#salary` test sees the value as a string (`"-5"`), Angular's number input already coerces it; do not change the assertion.

- [ ] **Step 5: Replace `form-page.ts`**

```ts
import { Component, computed, inject, input } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import type { CreateHiringProcess } from "@interviews-tool/domain/schemas";
import { Spinner } from "../../../shared/ui/spinner";
import { EmptyState } from "../../../shared/ui/empty-state";
import {
  injectCreateHiringProcess,
  injectHiringProcess,
  injectUpdateHiringProcess,
} from "../hiring-process.queries";
import { HiringProcessForm } from "./hiring-process-form";

@Component({
  selector: "app-form-page",
  imports: [RouterLink, HiringProcessForm, Spinner, EmptyState],
  template: `
    <h1 class="mb-4 text-xl font-semibold">{{ isEdit() ? "Edit hiring process" : "New hiring process" }}</h1>

    @if (isEdit() && existing.isPending()) {
      <div class="flex justify-center py-10"><app-spinner /></div>
    } @else if (isEdit() && existing.isError()) {
      <app-empty-state title="Could not load this process" [message]="existing.error().message">
        <a routerLink="/hiring-processes" class="btn btn-secondary">Back to list</a>
      </app-empty-state>
    } @else {
      <app-hiring-process-form
        [initial]="existing.data() ?? null"
        [submitting]="create.isPending() || update.isPending()"
        [serverError]="serverError()"
        [submitLabel]="isEdit() ? 'Save changes' : 'Create'"
        (save)="onSave($event)"
      >
        <a cancel [routerLink]="cancelLink()" class="btn btn-secondary">Cancel</a>
      </app-hiring-process-form>
    }
  `,
})
export class FormPage {
  private readonly router = inject(Router);

  /** Present on /hiring-processes/:id/edit, absent on /hiring-processes/new. */
  readonly id = input<string>();
  protected readonly isEdit = computed(() => !!this.id());
  protected readonly cancelLink = computed(() =>
    this.id() ? ["/hiring-processes", this.id()] : ["/hiring-processes"],
  );

  protected readonly existing = injectHiringProcess(() => this.id());
  protected readonly create = injectCreateHiringProcess();
  protected readonly update = injectUpdateHiringProcess();

  protected readonly serverError = computed(
    () => this.create.error()?.message ?? this.update.error()?.message ?? null,
  );

  protected onSave(body: CreateHiringProcess): void {
    const id = this.id();
    if (id) {
      this.update.mutate(
        { id, body },
        { onSuccess: () => void this.router.navigate(["/hiring-processes", id]) },
      );
    } else {
      this.create.mutate(body, {
        onSuccess: (created) => void this.router.navigate(["/hiring-processes", created.id]),
      });
    }
  }
}
```

- [ ] **Step 6: Build, run all tests, smoke-test**

```bash
bun run build 2>&1 | tail -5
bun run test 2>&1 | tail -6
bun run dev
```

In the browser: "New process" → empty submit shows the required error → fill Company + salary → Create → you land on `/hiring-processes/<id>` (placeholder "Detail page <id>" until Task 11) and the row is in the list. `/hiring-processes/<id>/edit` prefills and saves. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): create/edit hiring process with Reactive Forms and Zod validation"
```

---

### Task 11: Detail page (`httpResource`), status change, archive/restore, delete

**Files:**

- Replace: `apps/angular-web/src/app/features/hiring-processes/detail/detail-page.ts`
- Create: `detail-page.spec.ts`, `archive-dialog.ts` (same folder)

**Interfaces:**

- Consumes: `injectChangeHiringProcessStatus`, `injectArchiveHiringProcess`, `injectRestoreHiringProcess`, `injectDeleteHiringProcess` (Task 7), `ApiError` (Task 4), `StatusBadge`, `EmptyState`, `Spinner`, pipes (Task 3).
- Produces: `DetailPage` with required route input `id`; `ArchiveDialog` with output `confirm: ArchiveReason` and method `open()`.

- [ ] **Step 1: Write the failing detail test**

`apps/angular-web/src/app/features/hiring-processes/detail/detail-page.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { QueryClient, provideTanStackQuery } from "@tanstack/angular-query-experimental";
import { apiErrorInterceptor } from "../../../core/http/api-error.interceptor";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
import { DetailPage } from "./detail-page";

const item: HiringProcess = {
  id: "11111111-1111-4111-8111-111111111111",
  companyName: "Acme",
  jobTitle: "Frontend",
  status: "ongoing",
  salary: 3000,
  currency: "USD",
  salaryRateType: "monthly",
  userId: "u1",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
};

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([apiErrorInterceptor])),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
    ],
  });
  const ctrl = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(DetailPage);
  fixture.componentRef.setInput("id", item.id);
  fixture.detectChanges();
  return { ctrl, fixture };
}

describe("DetailPage", () => {
  it("loads the process through httpResource and renders it", async () => {
    const { ctrl, fixture } = setup();
    await vi.waitFor(() => ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Acme");
    });
    expect(fixture.nativeElement.textContent).toContain("$3,000 / mo");
    expect(fixture.nativeElement.querySelector("select#next-status")).not.toBeNull();
  });

  it("shows a not-found state on 404", async () => {
    const { ctrl, fixture } = setup();
    await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush(null, { status: 404, statusText: "Not Found" }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Hiring process not found");
    });
  });

  it("PATCHes the status and reloads", async () => {
    const { ctrl, fixture } = setup();
    await vi.waitFor(() => ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("select#next-status")).not.toBeNull();
    });
    const select = fixture.nativeElement.querySelector("select#next-status") as HTMLSelectElement;
    select.value = "hired";
    select.dispatchEvent(new Event("change"));
    const patch = await vi.waitFor(() => ctrl.expectOne(`/api/v1/hiring-processes/${item.id}/status`));
    expect(patch.request.method).toBe("PATCH");
    expect(patch.request.body).toEqual({ status: "hired" });
    patch.flush({ data: { ...item, status: "hired" }, error: null });
    // reload() re-fetches the detail
    await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: { ...item, status: "hired" }, error: null }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(".badge")?.textContent).toContain("Hired");
    });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use 24
bun run ng test --watch=false --include src/app/features/hiring-processes/detail/detail-page.spec.ts 2>&1 | tail -12
```

Expected: FAIL (placeholder renders "Detail page", no request is made).

- [ ] **Step 3: Write `archive-dialog.ts`**

```ts
import { Component, ElementRef, output, signal, viewChild } from "@angular/core";
import { ARCHIVE_REASON_VALUES, type ArchiveReason } from "@interviews-tool/domain/constants";

const REASON_LABEL: Record<ArchiveReason, string> = {
  "no-reply": "No reply",
  "they-passed": "They passed",
  "i-withdrew": "I withdrew",
  "role-closed": "Role closed",
};

@Component({
  selector: "app-archive-dialog",
  template: `
    <dialog #dialog class="card w-full max-w-sm backdrop:bg-black/60" (close)="reason.set('no-reply')">
      <h2 class="mb-2 text-base font-semibold">Archive this process?</h2>
      <p class="mb-4 text-sm text-text-muted">It leaves the active list but keeps its status and history.</p>
      <label class="label" for="archive-reason">Reason</label>
      <select id="archive-reason" class="input mb-4" [value]="reason()" (change)="onReason($event)">
        @for (r of reasons; track r) {
          <option [value]="r">{{ labels[r] }}</option>
        }
      </select>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="close()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="onConfirm()">Archive</button>
      </div>
    </dialog>
  `,
})
export class ArchiveDialog {
  readonly confirm = output<ArchiveReason>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>("dialog");

  protected readonly reasons = ARCHIVE_REASON_VALUES;
  protected readonly labels = REASON_LABEL;
  protected readonly reason = signal<ArchiveReason>("no-reply");

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected onReason(event: Event): void {
    this.reason.set((event.target as HTMLSelectElement).value as ArchiveReason);
  }

  protected onConfirm(): void {
    this.confirm.emit(this.reason());
    this.close();
  }
}
```

- [ ] **Step 4: Replace `detail-page.ts`**

```ts
import { Component, computed, inject, input, viewChild } from "@angular/core";
import { httpResource } from "@angular/common/http";
import { Router, RouterLink } from "@angular/router";
import {
  HIRING_PROCESS_STATUS_INFO,
  STATUS_TRANSITIONS,
  type ArchiveReason,
  type HiringProcessStatus,
} from "@interviews-tool/domain/constants";
import type { ApiResponse } from "@interviews-tool/domain/types";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
import { ApiError } from "../../../core/http/api-error";
import { MoneyPipe } from "../../../shared/pipes/money.pipe";
import { RelativeDatePipe } from "../../../shared/pipes/relative-date.pipe";
import { EmptyState } from "../../../shared/ui/empty-state";
import { Spinner } from "../../../shared/ui/spinner";
import { StatusBadge } from "../../../shared/ui/status-badge";
import {
  injectArchiveHiringProcess,
  injectChangeHiringProcessStatus,
  injectDeleteHiringProcess,
  injectRestoreHiringProcess,
} from "../hiring-process.queries";
import { ArchiveDialog } from "./archive-dialog";

@Component({
  selector: "app-detail-page",
  imports: [RouterLink, StatusBadge, EmptyState, Spinner, MoneyPipe, RelativeDatePipe, ArchiveDialog],
  template: `
    @if (process.isLoading()) {
      <div class="flex justify-center py-10"><app-spinner /></div>
    } @else if (process.error(); as error) {
      <app-empty-state
        [title]="isNotFound(error) ? 'Hiring process not found' : 'Could not load this process'"
        [message]="isNotFound(error) ? 'It may have been deleted.' : errorMessage(error)"
      >
        <a routerLink="/hiring-processes" class="btn btn-secondary">Back to list</a>
        @if (!isNotFound(error)) {
          <button type="button" class="btn btn-primary" (click)="process.reload()">Retry</button>
        }
      </app-empty-state>
    } @else if (process.hasValue()) {
      <div class="mb-4 flex items-start justify-between gap-4">
        <div>
          <a routerLink="/hiring-processes" class="text-xs text-text-muted hover:underline">← All processes</a>
          <h1 class="mt-1 text-2xl font-semibold">{{ process.value().companyName }}</h1>
          <p class="text-text-secondary">{{ process.value().jobTitle || "No job title" }}</p>
        </div>
        <div class="flex gap-2">
          <a [routerLink]="['/hiring-processes', id(), 'edit']" class="btn btn-secondary">Edit</a>
          @if (process.value().archivedAt) {
            <button type="button" class="btn btn-primary" [disabled]="restore.isPending()" (click)="onRestore()">
              Restore
            </button>
          } @else {
            <button type="button" class="btn btn-secondary" (click)="archiveDialog().open()">Archive</button>
          }
          <button type="button" class="btn btn-danger" [disabled]="remove.isPending()" (click)="onDelete()">
            Delete
          </button>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <section class="card">
          <h2 class="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">Status</h2>
          <div class="flex items-center gap-3">
            <app-status-badge [status]="process.value().status" />
            @if (nextStatuses().length > 0) {
              <select
                id="next-status"
                class="input max-w-48"
                [disabled]="changeStatus.isPending()"
                (change)="onStatusChange($event)"
              >
                <option value="">Move to…</option>
                @for (s of nextStatuses(); track s) {
                  <option [value]="s">{{ statusInfo[s].label }}</option>
                }
              </select>
            }
          </div>
          @if (process.value().archivedAt) {
            <p class="mt-3 text-xs text-text-muted">
              Archived {{ process.value().archivedAt | relativeDate }} · {{ process.value().archiveReason }}
            </p>
          }
          @if (actionError(); as message) {
            <p class="field-error" role="alert">{{ message }}</p>
          }
        </section>

        <section class="card">
          <h2 class="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">Compensation</h2>
          <p class="font-mono text-lg">
            {{ process.value().salary | money: process.value().currency : process.value().salaryRateType }}
          </p>
          <p class="mt-3 text-xs text-text-muted">
            Created {{ process.value().createdAt | relativeDate }} · Updated {{ process.value().updatedAt | relativeDate }}
          </p>
        </section>
      </div>

      <app-archive-dialog (confirm)="onArchive($event)" />
    }
  `,
})
export class DetailPage {
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  /**
   * Angular-native alternative to TanStack Query, kept here on purpose so the two
   * can be compared: no shared cache, so mutations call `reload()` explicitly.
   */
  protected readonly process = httpResource<HiringProcess>(() => `/api/v1/hiring-processes/${this.id()}`, {
    parse: (raw) => (raw as ApiResponse<HiringProcess>).data as HiringProcess,
  });

  protected readonly archiveDialog = viewChild.required(ArchiveDialog);
  protected readonly statusInfo = HIRING_PROCESS_STATUS_INFO;

  protected readonly changeStatus = injectChangeHiringProcessStatus();
  protected readonly archive = injectArchiveHiringProcess();
  protected readonly restore = injectRestoreHiringProcess();
  protected readonly remove = injectDeleteHiringProcess();

  protected readonly nextStatuses = computed<readonly HiringProcessStatus[]>(() =>
    this.process.hasValue() ? STATUS_TRANSITIONS[this.process.value().status] : [],
  );

  protected readonly actionError = computed(
    () =>
      this.changeStatus.error()?.message ??
      this.archive.error()?.message ??
      this.restore.error()?.message ??
      this.remove.error()?.message ??
      null,
  );

  protected isNotFound(error: unknown): boolean {
    return error instanceof ApiError && error.isNotFound;
  }

  protected errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }

  protected onStatusChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const status = select.value as HiringProcessStatus | "";
    if (!status) return;
    this.changeStatus.mutate(
      { id: this.id(), status },
      { onSettled: () => { select.value = ""; this.process.reload(); } },
    );
  }

  protected onArchive(reason: ArchiveReason): void {
    this.archive.mutate({ id: this.id(), reason }, { onSuccess: () => this.process.reload() });
  }

  protected onRestore(): void {
    this.restore.mutate(this.id(), { onSuccess: () => this.process.reload() });
  }

  protected onDelete(): void {
    if (!window.confirm("Delete this hiring process? This cannot be undone.")) return;
    this.remove.mutate(this.id(), { onSuccess: () => void this.router.navigate(["/hiring-processes"]) });
  }
}
```

- [ ] **Step 5: Run the detail test**

```bash
bun run ng test --watch=false --include src/app/features/hiring-processes/detail/detail-page.spec.ts 2>&1 | tail -8
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 6: Build, run all tests, smoke-test the whole flow**

```bash
bun run build 2>&1 | tail -5
bun run test 2>&1 | tail -6
bun run dev
```

In the browser, with the server running: login → list → New → detail → "Move to…" changes the badge → Edit → save → Archive (choose a reason) → the header shows "Restore" and the process disappears from the list (the API's default scope is active) → Restore → Delete (confirm) → back on the list. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): detail page with httpResource, status change, archive/restore and delete"
```

---

### Task 12: Docs, spec amendment and final verification

**Files:**

- Create: `apps/angular-web/README.md`
- Modify: `docs/superpowers/specs/2026-08-26-angular-web-design.md` (§1 table)

- [ ] **Step 1: Write `apps/angular-web/README.md`**

````md
# angular-web

Angular 22 client for the hiring tool. Runs next to `apps/web` (the production React client)
and talks to the same `apps/server` API through a dev proxy.

## Run

```bash
# once: Angular 22 needs Node >= 24.15
source ~/.nvm/nvm.sh && nvm use 24

# terminal 1 — API on :3000
bun run dev:server

# terminal 2 — Angular on :4200 (proxies /api → :3000)
bun run dev:angular
```

## Test / build

```bash
cd apps/angular-web
bun run test          # vitest (jsdom) through `ng test`
bun run build
bun run check-types
```

## Where things are

- `src/app/core/auth` — Better Auth client wrapped in a signal-based `AuthService` + functional guards
- `src/app/core/http` — `ApiError` + functional interceptor (401 → login)
- `src/app/core/api` — `HiringProcessesApi` (HttpClient, typed with `@interviews-tool/domain`)
- `src/app/features/hiring-processes` — TanStack Query factories, list / form / detail pages
- `src/app/features/auth` — login & signup with Signal Forms
- The detail page uses `httpResource` on purpose, to compare it with TanStack Query.

Rule: this app imports only `@interviews-tool/domain`.
````

- [ ] **Step 2: Amend the spec's Phase 1 table**

In `docs/superpowers/specs/2026-08-26-angular-web-design.md`, replace the "Lista de hiring processes" row of the §1 table with:

```md
| Lista de hiring processes    | `GET /api/v1/hiring-processes` (page, limit, statuses, salaryDeclared). `scope/stale/sort/dir` no existen en la API hoy → fase 2 |
```

- [ ] **Step 3: Run the repo-wide checks**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
bun run lint 2>&1 | tail -5
cd apps/angular-web && source ~/.nvm/nvm.sh && nvm use 24 && bun run check-types && bun run test 2>&1 | tail -6 && bun run build 2>&1 | tail -3
cd ../../packages/domain && bun run test 2>&1 | tail -4
```

Expected: oxlint reports no errors for `apps/angular-web` (warnings are acceptable but fix any that are trivial); type-check clean; all Angular tests pass; build completes; domain tests pass.

- [ ] **Step 4: Final manual acceptance (record the result in the commit message)**

With `bun run dev:server` and `bun run dev:angular` running, walk through: signup (new email) → sign out → login with `?redirect=` → list filters via URL → create → detail → change status → edit → archive → restore → delete → sign out → visiting `/hiring-processes` redirects to login.

- [ ] **Step 5: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web/README.md docs/superpowers/specs/2026-08-26-angular-web-design.md
git commit -m "docs(angular-web): README and spec amendment for the Phase 1 API surface"
```

Phase 1 is complete. Phase 2 (board, company details, interactions, i18n, theme) gets its own spec.
