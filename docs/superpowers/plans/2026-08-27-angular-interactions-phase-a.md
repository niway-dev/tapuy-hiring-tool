# Angular Interactions (Phase A — detail redesign, timeline, quick capture) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Interactions feature and the detail-page design from `apps/web` (React) to `apps/angular-web` (Angular 22), so the same screen can be compared side by side in both clients.

**Architecture:** A new pure package `@interviews-tool/ui-markdown` holds `normalizeMarkdown`, shared by both clients; `packages/web-ui` keeps a one-line re-export so React is untouched. Angular renders markdown with `marked` through `[innerHTML]` (Angular sanitizes automatically). Interactions are server state in TanStack Query; the detail record stays on `httpResource` from phase 1. The detail page is rewritten to match React's header card + 4-stat row, and gains an Interactions section with a quick-capture composer and a timeline.

**Tech Stack:** Angular 22 (standalone, zoneless, signals), `marked` 18, TanStack Query 5 (`@tanstack/angular-query-experimental`), Zod 4 via `@interviews-tool/domain`, Tailwind 4, Vitest 4 + jsdom, bun workspaces, Node 22.23.2.

**Spec:** `docs/superpowers/specs/2026-08-27-angular-interactions-design.md`

## Global Constraints

- **Node:** the repo pins **22.23.2** in the root `.nvmrc`. Run `source ~/.nvm/nvm.sh && nvm use` (no argument — it reads `.nvmrc`) in the SAME shell command as any `ng`/`bun run` invocation inside `apps/angular-web`. Do not install Node or change the user's default.
- **Package manager:** bun. Never `npm install`, never create a `package-lock.json`. Install from the repo root with `bun install`.
- **Branch:** all work happens on `feat/angular-interactions` (already created from `main` @ `9e08987`). Do not merge, push, or create PRs.
- **Imports rule:** `apps/angular-web` may import only `@interviews-tool/domain/{constants,schemas,types}` and `@interviews-tool/ui-markdown`. Never `@interviews-tool/application`, `@interviews-tool/infra-*`, or `@interviews-tool/web-ui` (it is React).
- **`apps/web`, `apps/server`, `apps/mobile` must end up byte-identical.** The only permitted change outside `apps/angular-web` and the new package is the one-line re-export shim in `packages/web-ui/src/lib/normalize-markdown.ts`, plus the root `CLAUDE.md` import rule.
- **`@interviews-tool/ui-markdown` is pure:** no React, no Angular, no DOM, no framework imports of any kind.
- **API contract (verified against the running server):** `GET|POST /api/v1/hiring-processes/:id/interactions`, `PUT|DELETE /api/v1/hiring-processes/:id/interactions/:interactionId`. The GET returns `{ data: Interaction[], error }` — a **flat array, no pagination**. Every response is the standard `{ data, error, meta? }` envelope.
- **Domain validation:** `content` must be **10–10000 characters**, `title` max 100, `type` is one of the 10 `INTERACTION_TYPES` and defaults to `note`.
- **Copy language:** English UI strings (i18n is out of scope).
- **Formatting:** oxfmt + oxlint run on commit via lint-staged. If a commit reports modifications, `git add` the affected paths and commit again with the same message. Do not add Prettier/ESLint configs.
- **Test runner:** from `apps/angular-web`, `bun run ng test --watch=false --include <path>` runs one spec; `bun run test` runs all. `describe/it/expect/vi/beforeEach/afterEach` are Vitest globals — do not import them.
- **Angular 22 is zoneless by default.** Never add `provideZonelessChangeDetection()`.
- **Baseline:** `apps/angular-web` starts this plan at **58 passing tests**; `packages/domain` at 21.

---

## File map

```
packages/ui-markdown/                                   Task 1 (create)
  package.json
  tsconfig.json
  tsdown.config.ts
  vitest.config.ts
  src/index.ts
  src/normalize-markdown.ts                             moved verbatim from web-ui
  src/__tests__/normalize-markdown.test.ts              new — pins current behaviour
packages/web-ui/src/lib/normalize-markdown.ts           Task 1 (becomes a re-export)
CLAUDE.md                                               Task 2 (import rule)
apps/angular-web/package.json                           Task 2 (marked + ui-markdown)
apps/angular-web/angular.json                           Task 2 (prebundle.exclude)
apps/angular-web/src/styles.css                         Task 3 (markdown css), Task 7 (type badge)
apps/angular-web/src/app/shared/ui/markdown-content.ts       Task 3
apps/angular-web/src/app/shared/ui/markdown-content.spec.ts  Task 3
apps/angular-web/src/app/shared/pipes/absolute-date.pipe.ts      Task 4
apps/angular-web/src/app/shared/pipes/absolute-date.pipe.spec.ts Task 4
apps/angular-web/src/app/core/api/interaction.model.ts       Task 5
apps/angular-web/src/app/core/api/interactions.api.ts        Task 5
apps/angular-web/src/app/core/api/interactions.api.spec.ts   Task 5
apps/angular-web/src/app/features/hiring-processes/interaction.keys.ts     Task 6
apps/angular-web/src/app/features/hiring-processes/interaction.queries.ts  Task 6
apps/angular-web/src/app/features/hiring-processes/detail/interactions/
  interaction-type-badge.ts                             Task 7
  interaction-card.ts                                   Task 8
  interaction-card.spec.ts                              Task 8
  interaction-timeline.ts                               Task 9
  interaction-timeline.spec.ts                          Task 9
  quick-capture.ts                                      Task 10
  quick-capture.spec.ts                                 Task 10
  edit-interaction-dialog.ts                            Task 11
  delete-interaction-dialog.ts                          Task 11
  interaction-section.ts                                Task 12
  interaction-section.spec.ts                           Task 12
apps/angular-web/src/app/features/hiring-processes/detail/process-stats.ts  Task 13
apps/angular-web/src/app/features/hiring-processes/detail/detail-page.ts    Task 13 (rewrite)
apps/angular-web/src/app/features/hiring-processes/detail/detail-page.spec.ts Task 13 (extend)
apps/angular-web/README.md                              Task 14
```

---

### Task 1: Create `@interviews-tool/ui-markdown` and shim `web-ui`

**Files:**

- Create: `packages/ui-markdown/{package.json,tsconfig.json,tsdown.config.ts,vitest.config.ts}`, `packages/ui-markdown/src/index.ts`, `packages/ui-markdown/src/normalize-markdown.ts`, `packages/ui-markdown/src/__tests__/normalize-markdown.test.ts`
- Modify: `packages/web-ui/src/lib/normalize-markdown.ts` (becomes a re-export), `packages/web-ui/package.json` (add the workspace dependency)

**Interfaces:**

- Produces: `@interviews-tool/ui-markdown` exporting `normalizeMarkdown(content: string): string`. Every later Angular task imports it from there; React keeps importing it from `web-ui` exactly as before.

- [ ] **Step 1: Read the file you are about to move**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
cat packages/web-ui/src/lib/normalize-markdown.ts
grep -rn "normalizeMarkdown" packages/web-ui/src apps/web/src
```

Expected: exactly two consumers — `packages/web-ui/src/components/markdown-content.tsx` (a relative import) and `packages/web-ui/src/index.ts` (`export * from "./lib/normalize-markdown"`). Nothing in `apps/web`. If you find more, stop and report NEEDS_CONTEXT.

- [ ] **Step 2: Create the package scaffolding**

`packages/ui-markdown/package.json` — modelled on `packages/domain/package.json`, which is the repo's precedent for a pure source-exporting package:

```json
{
  "name": "@interviews-tool/ui-markdown",
  "version": "1.0.0",
  "description": "Framework-agnostic markdown presentation helpers shared by the web and Angular clients",
  "license": "ISC",
  "files": ["dist", "src"],
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./package.json": "./package.json"
  },
  "publishConfig": {
    "exports": {
      ".": "./dist/index.mjs",
      "./package.json": "./package.json"
    }
  },
  "scripts": {
    "build": "tsdown",
    "clean": "rm -rf dist",
    "check-types": "tsc --noEmit",
    "lint": "oxlint src",
    "test": "vitest run"
  },
  "devDependencies": {
    "tsdown": "^0.18.2",
    "typescript": "^5",
    "vitest": "^2.1.0"
  },
  "packageManager": "bun@1.3.4"
}
```

`packages/ui-markdown/tsconfig.json` — copied from `packages/domain/tsconfig.json`, which is standalone (it extends nothing), minus its `types` entry: this package is framework- and runtime-agnostic, so it must not pull in Bun or Cloudflare Workers globals.

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "verbatimModuleSyntax": true,
    "strict": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`noUncheckedIndexedAccess` and `noUnusedLocals` are on in `domain` and kept here on purpose. If the moved `normalize-markdown.ts` does not compile under them, **do not loosen the config** — report BLOCKED with the exact errors, because the same file compiles today inside `web-ui` and a difference means the move changed something.

`packages/ui-markdown/tsdown.config.ts`:

```ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
});
```

`packages/ui-markdown/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Move the implementation with `git mv` so history follows it**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
mkdir -p packages/ui-markdown/src/__tests__
git mv packages/web-ui/src/lib/normalize-markdown.ts packages/ui-markdown/src/normalize-markdown.ts
```

Then create `packages/ui-markdown/src/index.ts`:

```ts
export { normalizeMarkdown } from "./normalize-markdown";
```

Do NOT edit the moved file's contents. It must keep behaving exactly as it does today — that is what the tests in Step 4 pin down.

- [ ] **Step 4: Write tests that pin the current behaviour**

`packages/ui-markdown/src/__tests__/normalize-markdown.test.ts`. Read `../normalize-markdown.ts` first and write one test per transformation it actually performs — do not invent behaviour it does not have. Start from this skeleton and extend it to cover every `replace` step in the implementation:

```ts
import { describe, expect, it } from "vitest";
import { normalizeMarkdown } from "../normalize-markdown";

describe("normalizeMarkdown", () => {
  it("returns non-string input unchanged", () => {
    expect(normalizeMarkdown("")).toBe("");
    expect(normalizeMarkdown(null as unknown as string)).toBeNull();
  });

  it("normalizes CRLF line endings to LF", () => {
    expect(normalizeMarkdown("a\r\nb")).not.toContain("\r");
  });

  it("leaves an existing markdown heading alone", () => {
    const input = "## Already a heading";
    expect(normalizeMarkdown(input)).toContain("## Already a heading");
  });

  it("leaves a list item alone", () => {
    expect(normalizeMarkdown("- an item")).toContain("- an item");
  });

  it("preserves inline code spans", () => {
    expect(normalizeMarkdown("cost is `$` per month")).toContain("`$`");
  });

  it("preserves GFM task list syntax", () => {
    expect(normalizeMarkdown("- [ ] follow up")).toContain("- [ ]");
  });

  it("is idempotent", () => {
    const once = normalizeMarkdown("Some Title\nbody text");
    expect(normalizeMarkdown(once)).toBe(once);
  });
});
```

**If a test you write fails, that is information, not a bug to fix.** You are pinning existing behaviour: adjust the _test_ to assert what the function actually does, and add a comment noting the surprising behaviour. Never change `normalize-markdown.ts` in this task. If idempotence genuinely fails, delete that test and note it in your report — it is a real property worth knowing about, but fixing it is out of scope.

- [ ] **Step 5: Run the new tests**

```bash
cd packages/ui-markdown && bun run test
```

Expected: all green. If `vitest` is not resolvable, run `bun install` from the repo root first (Step 7 does this anyway) and retry.

- [ ] **Step 6: Replace the old file with a re-export shim**

`packages/web-ui/src/lib/normalize-markdown.ts` (recreate it — `git mv` removed it):

```ts
/* Moved to @interviews-tool/ui-markdown so the Angular client can share it.
   This re-export keeps web-ui's public API and every existing import path
   byte-identical, so apps/web needs no change. */
export { normalizeMarkdown } from "@interviews-tool/ui-markdown";
```

Add the dependency to `packages/web-ui/package.json` under `dependencies`, keeping the existing alphabetical-ish placement of the other `@interviews-tool/*` entries if there are any (if there are none, add it as the first dependency):

```json
"@interviews-tool/ui-markdown": "workspace:*",
```

- [ ] **Step 7: Install and prove React is untouched**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
bun install
git diff --stat apps/web
git status --short apps/web
```

Expected: **both commands print nothing** — `apps/web` has no changes. If anything appears, stop and report BLOCKED.

- [ ] **Step 8: Type-check the touched packages**

```bash
cd packages/ui-markdown && bun run check-types
cd ../web-ui && bun run check-types 2>&1 | tail -5
```

Expected: no errors. If `packages/web-ui` has no `check-types` script, skip its check and say so in your report.

- [ ] **Step 9: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add packages/ui-markdown packages/web-ui bun.lock
git commit -m "refactor(ui-markdown): extract normalizeMarkdown into a shared pure package"
```

---

### Task 2: Wire the Angular app to `marked` and `ui-markdown`

**Files:**

- Modify: `apps/angular-web/package.json`, `apps/angular-web/angular.json`, root `CLAUDE.md`

**Interfaces:**

- Consumes: `@interviews-tool/ui-markdown` (Task 1).
- Produces: `marked` and `@interviews-tool/ui-markdown` resolvable from `apps/angular-web`, and a dev server that still starts. Every later task depends on this.

- [ ] **Step 1: Add the dependencies**

In `apps/angular-web/package.json`, add to `dependencies` (keep the existing alphabetical order):

```json
"@interviews-tool/ui-markdown": "workspace:*",
"marked": "^18.0.11",
```

Then install from the repo root:

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
bun install
```

- [ ] **Step 2: Exclude the new package from dev-server prebundling**

This is not optional and it is not cosmetic. The Angular dev server's Vite/rolldown pre-bundler cannot resolve a workspace package's extensionless TypeScript re-exports; this exact failure broke `bun dev` when `@interviews-tool/domain` was first used. `@interviews-tool/ui-markdown` has the same shape.

In `apps/angular-web/angular.json`, the `serve` target's `options.prebundle.exclude` array currently contains `"@interviews-tool/domain"`. Add the new package so it reads:

```json
"exclude": ["@interviews-tool/domain", "@interviews-tool/ui-markdown"]
```

- [ ] **Step 3: Record the import rule**

In the root `CLAUDE.md`, find the bullet under `## Package Import Rules` that reads:

```
- Angular app (`apps/angular-web/`) only imports from `@interviews-tool/domain` — never `application`, `infra-*`, or `web-ui`
```

Replace it with:

```
- Angular app (`apps/angular-web/`) only imports from `@interviews-tool/domain` and `@interviews-tool/ui-markdown` — never `application`, `infra-*`, or `web-ui`
- `ui-markdown` is pure presentation logic: no React, no Angular, no DOM
```

If the existing bullet's wording differs, match what is actually there rather than this quote.

- [ ] **Step 4: Prove the import resolves and the dev server still starts**

Create a throwaway check — add this line temporarily at the top of `apps/angular-web/src/app/app.ts`, above the `@Component`:

```ts
import { normalizeMarkdown } from "@interviews-tool/ui-markdown";
console.log(normalizeMarkdown("probe"));
```

Then:

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && bun run build 2>&1 | tail -5
```

Expected: `Application bundle generation complete.` Now start the dev server and confirm it serves:

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && (bun run dev > /tmp/ngdev-t2.log 2>&1 &)
sleep 45
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4200/
tail -5 /tmp/ngdev-t2.log
pkill -f "ng serve"
```

Expected: `200`, and the log tail shows the lazy chunks and `Watch mode enabled`. **If you see `UNRESOLVED_IMPORT` or the server dies, Step 2 was not applied correctly** — fix it and retry rather than working around it.

Now REMOVE the two throwaway lines from `app.ts` and rebuild to confirm it is clean:

```bash
source ~/.nvm/nvm.sh && nvm use && bun run build 2>&1 | tail -3
```

- [ ] **Step 5: Confirm the suite is untouched**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && bun run test 2>&1 | tail -4
```

Expected: `Tests 58 passed (58)` — this task adds no tests and must break none.

- [ ] **Step 6: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web/package.json apps/angular-web/angular.json CLAUDE.md bun.lock
git commit -m "build(angular-web): add marked and the shared ui-markdown package"
```

---

### Task 3: `MarkdownContent` component and its stylesheet

**Files:**

- Create: `apps/angular-web/src/app/shared/ui/markdown-content.ts`, `apps/angular-web/src/app/shared/ui/markdown-content.css`, `apps/angular-web/src/app/shared/ui/markdown-content.spec.ts`
- Modify: `apps/angular-web/src/styles.css` (import the markdown stylesheet)

**Interfaces:**

- Consumes: `marked`, `@interviews-tool/ui-markdown` (Task 2).
- Produces: `<app-markdown [content]="..." [variant]="'default' | 'compact'" />`, exported class `MarkdownContent`. Tasks 8 and 11 use it.

- [ ] **Step 1: Write the failing spec**

`apps/angular-web/src/app/shared/ui/markdown-content.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import { MarkdownContent } from "./markdown-content";

function render(content: string): HTMLElement {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(MarkdownContent);
  fixture.componentRef.setInput("content", content);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe("MarkdownContent", () => {
  it("renders bold text as <strong>", () => {
    expect(render("**Base:** 5000").querySelector("strong")?.textContent).toBe("Base:");
  });

  it("renders inline code as <code>", () => {
    expect(render("cost is `$` monthly").querySelector("code")?.textContent).toBe("$");
  });

  it("renders a GFM task list as a checkbox", () => {
    const el = render("- [ ] follow up on Friday");
    expect(el.querySelector("input[type=checkbox]")).not.toBeNull();
  });

  it("renders a paragraph for plain text", () => {
    expect(render("just a note").querySelector("p")?.textContent).toContain("just a note");
  });

  it("strips a script tag rather than executing it", () => {
    const el = render("hello <script>alert(1)</script> world");
    expect(el.querySelector("script")).toBeNull();
    expect(el.textContent).toContain("hello");
  });

  it("renders nothing for empty content", () => {
    expect(render("").textContent?.trim()).toBe("");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include src/app/shared/ui/markdown-content.spec.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './markdown-content'`.

- [ ] **Step 3: Implement the component**

`apps/angular-web/src/app/shared/ui/markdown-content.ts`:

```ts
import { Component, computed, input } from "@angular/core";
import { normalizeMarkdown } from "@interviews-tool/ui-markdown";
import { Marked } from "marked";

/* One parser instance for the whole app: constructing Marked per render is
   wasteful, and the options must not drift between call sites. GFM is on so
   task lists, tables and strikethrough match what react-markdown renders in
   apps/web via remark-gfm. */
const marked = new Marked({ gfm: true, breaks: true });

@Component({
  selector: "app-markdown",
  styleUrl: "./markdown-content.css",
  template: `
    <div class="markdown-content" [class.markdown-content-compact]="variant() === 'compact'">
      <!-- Angular sanitizes [innerHTML] on its own: no bypassSecurityTrust here,
           so a <script> in someone's note is stripped rather than executed. -->
      <div [innerHTML]="html()"></div>
    </div>
  `,
})
export class MarkdownContent {
  readonly content = input.required<string>();
  readonly variant = input<"default" | "compact">("default");
  /** `normalize` mirrors apps/web's MarkdownContent prop; off means render as written. */
  readonly normalize = input(true);

  protected readonly html = computed(() => {
    const raw = this.content();
    if (!raw) return "";
    const source = this.normalize() ? normalizeMarkdown(raw) : raw;
    // parse() is sync unless async:true is set; we never set it.
    return marked.parse(source) as string;
  });
}
```

- [ ] **Step 4: Port the stylesheet**

Copy the React stylesheet verbatim — it is pure CSS with no framework coupling:

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
cp packages/web-ui/src/components/markdown-content.css \
   apps/angular-web/src/app/shared/ui/markdown-content.css
```

Then check which CSS custom properties it uses and confirm they all exist in the Angular app's tokens:

```bash
grep -oE "var\(--[a-z0-9-]+\)" apps/angular-web/src/app/shared/ui/markdown-content.css | sort -u
grep -oE "^\s+--[a-z0-9-]+" apps/angular-web/src/styles.css | tr -d ' ' | sort -u
```

For every `var(--x)` in the first list that is missing from the second, add the token to `:root` in `apps/angular-web/src/styles.css`, copying its value from `packages/web-ui/src/styles.css`. **List in your report exactly which tokens you had to add.** If a token has no counterpart in web-ui's stylesheet, use the nearest existing Tapuy token and say which substitution you made and why.

- [ ] **Step 5: Run the spec**

```bash
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include src/app/shared/ui/markdown-content.spec.ts 2>&1 | tail -6
```

Expected: `Tests 6 passed (6)`.

If the task-list test fails because `marked` emits `<input disabled type="checkbox">` and Angular's sanitizer strips the `disabled` attribute, that is fine — the selector `input[type=checkbox]` still matches. If the sanitizer strips the whole input, change the assertion to check for the `contains("follow up")` text and note the difference from React in your report rather than reaching for `bypassSecurityTrustHtml`.

- [ ] **Step 6: Build and run the full suite**

```bash
source ~/.nvm/nvm.sh && nvm use && bun run build 2>&1 | tail -3 && bun run test 2>&1 | tail -4
```

Expected: build completes; `Tests 64 passed (64)`.

- [ ] **Step 7: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): markdown rendering with marked and the shared normalizer"
```

---

### Task 4: `absoluteDate` pipe

**Files:**

- Create: `apps/angular-web/src/app/shared/pipes/absolute-date.pipe.ts`, `absolute-date.pipe.spec.ts`

**Interfaces:**

- Produces: `AbsoluteDatePipe`, used as `iso | absoluteDate` → `"Aug 20, 2026 · 9:20 AM"`, and `iso | absoluteDate: 'date'` → `"Aug 20, 2026"`, `iso | absoluteDate: 'time'` → `"9:20 AM"`. Tasks 8 and 13 use all three forms.

- [ ] **Step 1: Write the failing spec**

`apps/angular-web/src/app/shared/pipes/absolute-date.pipe.spec.ts`:

```ts
import { AbsoluteDatePipe } from "./absolute-date.pipe";

describe("AbsoluteDatePipe", () => {
  const pipe = new AbsoluteDatePipe();
  const iso = "2026-08-20T09:20:00.000Z";

  it("formats date and time together by default", () => {
    expect(pipe.transform(iso)).toBe("Aug 20, 2026 · 9:20 AM");
  });

  it("formats only the date when asked", () => {
    expect(pipe.transform(iso, "date")).toBe("Aug 20, 2026");
  });

  it("formats only the time when asked", () => {
    expect(pipe.transform(iso, "time")).toBe("9:20 AM");
  });

  it("accepts a Date object", () => {
    expect(pipe.transform(new Date(iso), "date")).toBe("Aug 20, 2026");
  });

  it("returns a dash for null or undefined", () => {
    expect(pipe.transform(null)).toBe("—");
    expect(pipe.transform(undefined)).toBe("—");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include src/app/shared/pipes/absolute-date.pipe.spec.ts 2>&1 | tail -8
```

Expected: FAIL — `Cannot find module './absolute-date.pipe'`.

- [ ] **Step 3: Implement**

`apps/angular-web/src/app/shared/pipes/absolute-date.pipe.ts`:

```ts
import { Pipe, PipeTransform } from "@angular/core";

export type AbsoluteDatePart = "full" | "date" | "time";

/* UTC on purpose: the API stores instants and the React client renders the same
   wall-clock string for everyone, so the two apps can be compared without the
   reviewer's timezone changing the screenshot. */
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

@Pipe({ name: "absoluteDate" })
export class AbsoluteDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, part: AbsoluteDatePart = "full"): string {
    if (!value) return "—";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return "—";
    if (part === "date") return DATE_FORMAT.format(date);
    if (part === "time") return TIME_FORMAT.format(date);
    return `${DATE_FORMAT.format(date)} · ${TIME_FORMAT.format(date)}`;
  }
}
```

- [ ] **Step 4: Run the spec**

```bash
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include src/app/shared/pipes/absolute-date.pipe.spec.ts 2>&1 | tail -6
```

Expected: `Tests 5 passed (5)`.

If a time assertion fails by a formatting detail (for example a narrow no-break space before `AM`), fix the **test** to match what `Intl` actually produces in this Node version, and note it in your report. Do not hand-roll the formatting to satisfy the literal string.

- [ ] **Step 5: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web/src/app/shared/pipes
git commit -m "feat(angular-web): absoluteDate pipe for detail and interaction timestamps"
```

---

### Task 5: `InteractionsApi`

**Files:**

- Create: `apps/angular-web/src/app/core/api/interaction.model.ts`, `interactions.api.ts`, `interactions.api.spec.ts`

**Interfaces:**

- Produces:

```ts
export interface Interaction {
  id: string; hiringProcessId: string; title: string | null;
  content: string; type: InteractionType;
  createdAt: string; updatedAt: string; deletedAt?: string | null;
}
class InteractionsApi {
  list(hiringProcessId: string): Promise<Interaction[]>
  create(hiringProcessId: string, body: CreateInteraction): Promise<Interaction>
  update(hiringProcessId: string, interactionId: string, body: UpdateInteraction): Promise<Interaction>
  delete(hiringProcessId: string, interactionId: string): Promise<void>
}
```

- [ ] **Step 1: Write the model**

`apps/angular-web/src/app/core/api/interaction.model.ts`:

```ts
import type { InteractionType } from "@interviews-tool/domain/constants";

/* Wire shape: dates are ISO strings because they come straight from JSON,
   exactly like HiringProcess in hiring-process.model.ts. */
export interface Interaction {
  id: string;
  hiringProcessId: string;
  title: string | null;
  content: string;
  type: InteractionType;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
```

- [ ] **Step 2: Write the failing spec**

`apps/angular-web/src/app/core/api/interactions.api.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { InteractionsApi } from "./interactions.api";
import type { Interaction } from "./interaction.model";

const PROCESS = "11111111-1111-4111-8111-111111111111";
const BASE = `/api/v1/hiring-processes/${PROCESS}/interactions`;

const item: Interaction = {
  id: "22222222-2222-4222-8222-222222222222",
  hiringProcessId: PROCESS,
  title: "Recruiter call",
  content: "Talked about the role for twenty minutes.",
  type: "phone-call",
  createdAt: "2026-08-20T09:20:00.000Z",
  updatedAt: "2026-08-20T09:20:00.000Z",
};

describe("InteractionsApi", () => {
  let api: InteractionsApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(InteractionsApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it("list() GETs the nested collection and unwraps data", async () => {
    const pending = api.list(PROCESS);
    const req = ctrl.expectOne(BASE);
    expect(req.request.method).toBe("GET");
    req.flush({ data: [item], error: null });
    expect(await pending).toEqual([item]);
  });

  it("list() returns an empty array when data is null", async () => {
    const pending = api.list(PROCESS);
    ctrl.expectOne(BASE).flush({ data: null, error: null });
    expect(await pending).toEqual([]);
  });

  it("create() POSTs the body", async () => {
    const pending = api.create(PROCESS, { content: "A note long enough.", type: "note" });
    const req = ctrl.expectOne(BASE);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ content: "A note long enough.", type: "note" });
    req.flush({ data: item, error: null }, { status: 201, statusText: "Created" });
    expect(await pending).toEqual(item);
  });

  it("update() PUTs to the interaction id", async () => {
    const pending = api.update(PROCESS, item.id, { content: "Edited content here." });
    const req = ctrl.expectOne(`${BASE}/${item.id}`);
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual({ content: "Edited content here." });
    req.flush({ data: { ...item, content: "Edited content here." }, error: null });
    expect((await pending).content).toBe("Edited content here.");
  });

  it("delete() sends DELETE and resolves on 204", async () => {
    const pending = api.delete(PROCESS, item.id);
    const req = ctrl.expectOne(`${BASE}/${item.id}`);
    expect(req.request.method).toBe("DELETE");
    req.flush(null, { status: 204, statusText: "No Content" });
    await expect(pending).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include src/app/core/api/interactions.api.spec.ts 2>&1 | tail -8
```

Expected: FAIL — `Cannot find module './interactions.api'`.

- [ ] **Step 4: Implement**

`apps/angular-web/src/app/core/api/interactions.api.ts`. Follow the shape of the existing `hiring-processes.api.ts` — read it first so the two files look like siblings:

```ts
import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import type { CreateInteraction, UpdateInteraction } from "@interviews-tool/domain/schemas";
import type { ApiResponse } from "@interviews-tool/domain/types";
import { firstValueFrom, type Observable } from "rxjs";
import type { Interaction } from "./interaction.model";

/* Interactions are nested under their hiring process, so every call needs the
   process id — there is no top-level /interactions collection. */
function base(hiringProcessId: string): string {
  return `/api/v1/hiring-processes/${hiringProcessId}/interactions`;
}

@Injectable({ providedIn: "root" })
export class InteractionsApi {
  private readonly http = inject(HttpClient);

  async list(hiringProcessId: string): Promise<Interaction[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<Interaction[]>>(base(hiringProcessId)),
    );
    // The endpoint returns a flat array with no pagination envelope.
    return res.data ?? [];
  }

  create(hiringProcessId: string, body: CreateInteraction): Promise<Interaction> {
    return this.unwrap(this.http.post<ApiResponse<Interaction>>(base(hiringProcessId), body));
  }

  update(
    hiringProcessId: string,
    interactionId: string,
    body: UpdateInteraction,
  ): Promise<Interaction> {
    return this.unwrap(
      this.http.put<ApiResponse<Interaction>>(`${base(hiringProcessId)}/${interactionId}`, body),
    );
  }

  async delete(hiringProcessId: string, interactionId: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${base(hiringProcessId)}/${interactionId}`));
  }

  private async unwrap<T>(request: Observable<ApiResponse<T>>): Promise<T> {
    const res = await firstValueFrom(request);
    if (res.data === null || res.data === undefined) {
      throw new Error(res.error?.message ?? "Empty response");
    }
    return res.data;
  }
}
```

- [ ] **Step 5: Run the spec**

```bash
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include src/app/core/api/interactions.api.spec.ts 2>&1 | tail -6
```

Expected: `Tests 5 passed (5)`.

- [ ] **Step 6: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web/src/app/core/api
git commit -m "feat(angular-web): typed InteractionsApi for the nested interactions collection"
```

---

### Task 6: Interaction query keys and factories

**Files:**

- Create: `apps/angular-web/src/app/features/hiring-processes/interaction.keys.ts`, `interaction.queries.ts`

**Interfaces:**

- Consumes: `InteractionsApi` (Task 5).
- Produces (called from component field initializers):

```ts
interactionKeys.all / lists() / list(hiringProcessId)
injectInteractionList(hiringProcessId: () => string)
injectCreateInteraction()  // mutate({ hiringProcessId, body })
injectUpdateInteraction()  // mutate({ hiringProcessId, interactionId, body })
injectDeleteInteraction()  // mutate({ hiringProcessId, interactionId })
```

Every mutation invalidates `interactionKeys.list(hiringProcessId)` on success.

- [ ] **Step 1: Write the keys**

`apps/angular-web/src/app/features/hiring-processes/interaction.keys.ts`:

```ts
/* Mirrors the hiringProcessKeys shape so both resources read the same way.
   Interactions are always scoped to one hiring process — there is no
   "all interactions" list in the API, so list() takes the id, not a filter. */
export const interactionKeys = {
  all: ["interactions"] as const,
  lists: () => [...interactionKeys.all, "list"] as const,
  list: (hiringProcessId: string) => [...interactionKeys.lists(), hiringProcessId] as const,
};
```

- [ ] **Step 2: Write the factories**

`apps/angular-web/src/app/features/hiring-processes/interaction.queries.ts`. Read `hiring-process.queries.ts` first and match its structure and naming:

```ts
import { inject } from "@angular/core";
import type { CreateInteraction, UpdateInteraction } from "@interviews-tool/domain/schemas";
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from "@tanstack/angular-query-experimental";
import { InteractionsApi } from "../../core/api/interactions.api";
import { interactionKeys } from "./interaction.keys";

export function injectInteractionList(hiringProcessId: () => string) {
  const api = inject(InteractionsApi);
  return injectQuery(() => {
    const id = hiringProcessId();
    return {
      queryKey: interactionKeys.list(id),
      queryFn: () => api.list(id),
      enabled: !!id,
    };
  });
}

function injectInvalidateList() {
  const queryClient = injectQueryClient();
  return (hiringProcessId: string) =>
    queryClient.invalidateQueries({ queryKey: interactionKeys.list(hiringProcessId) });
}

export function injectCreateInteraction() {
  const api = inject(InteractionsApi);
  const invalidate = injectInvalidateList();
  return injectMutation(() => ({
    mutationFn: (input: { hiringProcessId: string; body: CreateInteraction }) =>
      api.create(input.hiringProcessId, input.body),
    onSuccess: (_data, input) => invalidate(input.hiringProcessId),
  }));
}

export function injectUpdateInteraction() {
  const api = inject(InteractionsApi);
  const invalidate = injectInvalidateList();
  return injectMutation(() => ({
    mutationFn: (input: {
      hiringProcessId: string;
      interactionId: string;
      body: UpdateInteraction;
    }) => api.update(input.hiringProcessId, input.interactionId, input.body),
    onSuccess: (_data, input) => invalidate(input.hiringProcessId),
  }));
}

export function injectDeleteInteraction() {
  const api = inject(InteractionsApi);
  const invalidate = injectInvalidateList();
  return injectMutation(() => ({
    mutationFn: (input: { hiringProcessId: string; interactionId: string }) =>
      api.delete(input.hiringProcessId, input.interactionId),
    onSuccess: (_data, input) => invalidate(input.hiringProcessId),
  }));
}
```

- [ ] **Step 3: Type-check and confirm nothing broke**

This task has no tests of its own by design — the factories are thin wrappers with no branching, and Tasks 9, 10 and 12 drive them for real through mocked `InteractionsApi`. Do NOT invent a spec file here.

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && bun run check-types && bun run test 2>&1 | tail -4
```

Expected: no type errors; `Tests 74 passed (74)`.

- [ ] **Step 4: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web/src/app/features/hiring-processes
git commit -m "feat(angular-web): TanStack keys and inject* factories for interactions"
```

---

### Task 7: `InteractionTypeBadge` and its tokens

**Files:**

- Create: `apps/angular-web/src/app/features/hiring-processes/detail/interactions/interaction-type-badge.ts`
- Modify: `apps/angular-web/src/styles.css`

**Interfaces:**

- Produces: `<app-interaction-type-badge [type]="..." />`, exported class `InteractionTypeBadge`. Renders nothing when `type` is null. Task 8 uses it.

- [ ] **Step 1: Add the badge CSS**

The React badge reuses the status palette: only `offer` and `rejection` carry colour, everything else is neutral. In `apps/angular-web/src/styles.css`, inside the existing `@layer components` block and directly after the `.badge[data-status=...]` rules, add:

```css
  /* Interaction type badges speak the same language as status badges:
     12px/500, 2x8 padding, radius 5, sentence case, never an icon inside.
     Only `offer` and `rejection` get colour; the rest stay neutral. */
  .badge-type {
    display: inline-flex;
    align-items: center;
    border-radius: 5px;
    padding: 2px 8px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text-secondary);
  }
  .badge-type[data-type="offer"] {
    background: var(--st-offer-made-bg);
    color: var(--st-offer-made-text);
    border-color: var(--st-offer-made-border);
  }
  .badge-type[data-type="rejection"] {
    background: var(--st-rejected-bg);
    color: var(--st-rejected-text);
    border-color: transparent;
  }
```

**Also add the fuchsia token.** Task 9's timeline marks `offer` nodes with `bg-fuchsia`, and this app's stylesheet has no fuchsia at all — it was not among the tokens copied in phase 1. Verified: `@theme inline` currently exposes only bg, surface, surface-2, selected, border, border-strong, text, text-secondary, text-muted, mint, mint-hover, mint-on and danger.

In `:root`, next to the other neon values, add:

```css
  --fuchsia: #ff00a0;
```

and in the `@theme inline` block, next to `--color-mint`, add:

```css
  --color-fuchsia: var(--fuchsia);
```

The hex is the Tapuy dark-theme fuchsia from `packages/web-ui/src/styles.css`. Without this, `bg-fuchsia` silently renders as no background.

- [ ] **Step 2: Write the component**

```ts
import { Component, computed, input } from "@angular/core";
import {
  INTERACTION_TYPE_LABELS,
  type InteractionType,
} from "@interviews-tool/domain/constants";

@Component({
  selector: "app-interaction-type-badge",
  template: `
    @if (type(); as value) {
      <span class="badge-type" [attr.data-type]="value">{{ label() }}</span>
    }
  `,
})
export class InteractionTypeBadge {
  readonly type = input.required<InteractionType | null>();
  protected readonly label = computed(() => {
    const value = this.type();
    return value ? INTERACTION_TYPE_LABELS[value] : "";
  });
}
```

This component has no spec of its own — it is a declarative wrapper with one branch, exercised through `interaction-card.spec.ts` in Task 8. Do not add a speculative spec.

- [ ] **Step 3: Verify it compiles and the suite is unchanged**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && bun run check-types && bun run test 2>&1 | tail -4
```

Expected: no type errors; `Tests 74 passed (74)`.

- [ ] **Step 4: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): interaction type badge"
```

---

### Task 8: `InteractionCard`

**Files:**

- Create: `apps/angular-web/src/app/features/hiring-processes/detail/interactions/interaction-card.ts`, `interaction-card.spec.ts`

**Interfaces:**

- Consumes: `InteractionTypeBadge` (Task 7), `MarkdownContent` (Task 3), `AbsoluteDatePipe` (Task 4), `Interaction` (Task 5).
- Produces: `<app-interaction-card [interaction]="..." (edit)="..." (remove)="..." />`, exported class `InteractionCard`. Outputs are named `edit` and `remove` (not `delete` — that is a reserved word in a template context and reads badly as a method name).

- [ ] **Step 1: Write the failing spec**

`.../interactions/interaction-card.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import { InteractionCard } from "./interaction-card";
import type { Interaction } from "../../../../core/api/interaction.model";

const item: Interaction = {
  id: "22222222-2222-4222-8222-222222222222",
  hiringProcessId: "11111111-1111-4111-8111-111111111111",
  title: null,
  content: "**Base:** 5000\n\n- [ ] follow up",
  type: "phone-call",
  createdAt: "2026-08-20T09:20:00.000Z",
  updatedAt: "2026-08-20T09:20:00.000Z",
};

function render(interaction: Interaction) {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(InteractionCard);
  fixture.componentRef.setInput("interaction", interaction);
  fixture.detectChanges();
  return fixture;
}

describe("InteractionCard", () => {
  it("shows the type badge and the absolute timestamp", () => {
    const el = render(item).nativeElement as HTMLElement;
    expect(el.querySelector(".badge-type")?.textContent?.trim()).toBe("Phone Call");
    expect(el.textContent).toContain("Aug 20, 2026");
    expect(el.textContent).toContain("9:20 AM");
  });

  it("renders the content as markdown", () => {
    const el = render(item).nativeElement as HTMLElement;
    expect(el.querySelector("strong")?.textContent).toBe("Base:");
    expect(el.querySelector("input[type=checkbox]")).not.toBeNull();
  });

  it("omits the title element when there is no title", () => {
    const el = render(item).nativeElement as HTMLElement;
    expect(el.querySelector("h4")).toBeNull();
  });

  it("shows the title when present", () => {
    const el = render({ ...item, title: "Recruiter call" }).nativeElement as HTMLElement;
    expect(el.querySelector("h4")?.textContent).toContain("Recruiter call");
  });

  it("emits edit and remove with the interaction", () => {
    const fixture = render(item);
    const edited: Interaction[] = [];
    const removed: Interaction[] = [];
    fixture.componentInstance.edit.subscribe((v) => edited.push(v));
    fixture.componentInstance.remove.subscribe((v) => removed.push(v));
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll("button");
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
    expect(edited).toEqual([item]);
    expect(removed).toEqual([item]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include "src/app/features/hiring-processes/detail/interactions/interaction-card.spec.ts" 2>&1 | tail -8
```

Expected: FAIL — `Cannot find module './interaction-card'`.

- [ ] **Step 3: Implement**

```ts
import { Component, input, output } from "@angular/core";
import type { Interaction } from "../../../../core/api/interaction.model";
import { AbsoluteDatePipe } from "../../../../shared/pipes/absolute-date.pipe";
import { MarkdownContent } from "../../../../shared/ui/markdown-content";
import { InteractionTypeBadge } from "./interaction-type-badge";

/* Content renders in full — the timeline is the product, not a teaser. */
@Component({
  selector: "app-interaction-card",
  imports: [InteractionTypeBadge, MarkdownContent, AbsoluteDatePipe],
  template: `
    <div class="rounded-xl border border-border bg-surface px-5 py-[18px]">
      <div class="mb-2 flex items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2.5">
          <app-interaction-type-badge [type]="interaction().type" />
          <span class="font-mono text-xs text-text-muted">
            {{ interaction().createdAt | absoluteDate }}
          </span>
        </div>
        <div class="flex shrink-0 gap-0.5">
          <button
            type="button"
            class="btn-icon"
            aria-label="Edit interaction"
            (click)="edit.emit(interaction())"
          >
            ✎
          </button>
          <button
            type="button"
            class="btn-icon"
            aria-label="Delete interaction"
            (click)="remove.emit(interaction())"
          >
            🗑
          </button>
        </div>
      </div>

      @if (interaction().title; as title) {
        <h4 class="mb-2.5 text-sm font-medium text-text">{{ title }}</h4>
      }

      <app-markdown [content]="interaction().content" />
    </div>
  `,
})
export class InteractionCard {
  readonly interaction = input.required<Interaction>();
  readonly edit = output<Interaction>();
  readonly remove = output<Interaction>();
}
```

- [ ] **Step 4: Add the `.btn-icon` class**

The app has no icon-button style yet. In `apps/angular-web/src/styles.css`, inside `@layer components`, add:

```css
  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 0.375rem;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.75rem;
    line-height: 1;
    cursor: pointer;
  }
  .btn-icon:hover {
    color: var(--text);
    background: var(--surface-2);
  }
  .btn-icon:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
```

- [ ] **Step 5: Run the spec**

```bash
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include "src/app/features/hiring-processes/detail/interactions/interaction-card.spec.ts" 2>&1 | tail -6
```

Expected: `Tests 5 passed (5)`.

- [ ] **Step 6: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): interaction card with markdown content"
```

---

### Task 9: `InteractionTimeline`

**Files:**

- Create: `.../interactions/interaction-timeline.ts`, `interaction-timeline.spec.ts`

**Interfaces:**

- Consumes: `injectInteractionList` (Task 6), `InteractionCard` (Task 8), `EmptyState`, `Spinner`.
- Produces: `<app-interaction-timeline [hiringProcessId]="..." (edit)="..." (remove)="..." />`, exported class `InteractionTimeline`. It owns the query, so the section above it does not have to thread data down.

- [ ] **Step 1: Write the failing spec**

`.../interactions/interaction-timeline.spec.ts`:

```ts
import { TestBed } from "@angular/core/testing";
import { QueryClient, provideTanStackQuery } from "@tanstack/angular-query-experimental";
import { InteractionsApi } from "../../../../core/api/interactions.api";
import type { Interaction } from "../../../../core/api/interaction.model";
import { InteractionTimeline } from "./interaction-timeline";

const PROCESS = "11111111-1111-4111-8111-111111111111";

function make(id: string, createdAt: string, content = "A note with enough text."): Interaction {
  return {
    id,
    hiringProcessId: PROCESS,
    title: null,
    content,
    type: "note",
    createdAt,
    updatedAt: createdAt,
  };
}

function setup(list: () => Promise<Interaction[]>) {
  const api = { list: vi.fn().mockImplementation(list) };
  TestBed.configureTestingModule({
    providers: [
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: InteractionsApi, useValue: api },
    ],
  });
  const fixture = TestBed.createComponent(InteractionTimeline);
  fixture.componentRef.setInput("hiringProcessId", PROCESS);
  fixture.detectChanges();
  return { api, fixture };
}

describe("InteractionTimeline", () => {
  it("renders one card per interaction, newest first", async () => {
    const { fixture } = setup(async () => [
      make("old", "2026-08-01T10:00:00.000Z", "The older note here."),
      make("new", "2026-08-20T10:00:00.000Z", "The newer note here."),
    ]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll("app-interaction-card").length).toBe(2);
    });
    const text = fixture.nativeElement.textContent as string;
    expect(text.indexOf("newer note")).toBeLessThan(text.indexOf("older note"));
  });

  it("shows the empty state when there are none", async () => {
    const { fixture } = setup(async () => []);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("No interactions logged yet");
    });
  });

  it("shows an error with a retry that refetches", async () => {
    const { api, fixture } = setup(async () => {
      throw new Error("Boom");
    });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Boom");
    });
    const before = api.list.mock.calls.length;
    const retry = [...fixture.nativeElement.querySelectorAll("button")].find((b) =>
      (b as HTMLButtonElement).textContent?.includes("Retry"),
    ) as HTMLButtonElement;
    retry.click();
    await vi.waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(before));
  });

  it("forwards edit and remove from a card", async () => {
    const { fixture } = setup(async () => [make("one", "2026-08-20T10:00:00.000Z")]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("app-interaction-card")).not.toBeNull();
    });
    const edited: Interaction[] = [];
    fixture.componentInstance.edit.subscribe((v) => edited.push(v));
    const editButton = fixture.nativeElement.querySelector(
      "button[aria-label='Edit interaction']",
    ) as HTMLButtonElement;
    editButton.click();
    expect(edited).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include "src/app/features/hiring-processes/detail/interactions/interaction-timeline.spec.ts" 2>&1 | tail -8
```

Expected: FAIL — `Cannot find module './interaction-timeline'`.

- [ ] **Step 3: Implement**

```ts
import { Component, computed, input, output } from "@angular/core";
import type { Interaction } from "../../../../core/api/interaction.model";
import { EmptyState } from "../../../../shared/ui/empty-state";
import { injectInteractionList } from "../../interaction.queries";
import { InteractionCard } from "./interaction-card";

/* Only `offer` and `rejection` nodes carry colour; every other node is muted —
   the same rule the React timeline uses. */
function nodeClass(type: Interaction["type"]): string {
  if (type === "offer") return "bg-fuchsia";
  if (type === "rejection") return "bg-danger";
  return "bg-text-muted";
}

@Component({
  selector: "app-interaction-timeline",
  imports: [InteractionCard, EmptyState],
  template: `
    @if (query.isPending()) {
      <div class="relative pl-8">
        <div class="absolute bottom-2 left-[7px] top-2 w-px bg-border-strong"></div>
        @for (row of skeletonRows; track row) {
          <article class="relative mb-5">
            <div class="absolute -left-[28px] top-4 size-2 rounded-full bg-surface-2"></div>
            <div class="rounded-xl border border-border bg-surface px-5 py-[18px]">
              <div class="mb-3 flex items-center gap-2.5">
                <div class="h-[22px] w-16 animate-pulse rounded bg-surface-2"></div>
                <div class="h-3 w-36 animate-pulse rounded bg-surface-2"></div>
              </div>
              <div class="mb-2 h-4 w-48 animate-pulse rounded bg-surface-2"></div>
              <div class="h-16 w-full animate-pulse rounded bg-surface-2"></div>
            </div>
          </article>
        }
      </div>
    } @else if (query.isError()) {
      <app-empty-state title="Could not load interactions" [message]="query.error().message">
        <button type="button" class="btn btn-secondary" (click)="query.refetch()">Retry</button>
      </app-empty-state>
    } @else if (interactions().length === 0) {
      <app-empty-state
        title="No interactions logged yet"
        message="Log what just happened and it will show up here."
      />
    } @else {
      <div class="relative pl-8">
        <div class="absolute bottom-2 left-[7px] top-2 w-px bg-border-strong"></div>
        @for (interaction of interactions(); track interaction.id) {
          <article class="relative mb-5">
            <div
              class="absolute -left-[28px] top-4 size-2 rounded-full"
              [class]="nodeClass(interaction.type)"
            ></div>
            <app-interaction-card
              [interaction]="interaction"
              (edit)="edit.emit($event)"
              (remove)="remove.emit($event)"
            />
          </article>
        }
      </div>
    }
  `,
})
export class InteractionTimeline {
  readonly hiringProcessId = input.required<string>();
  readonly edit = output<Interaction>();
  readonly remove = output<Interaction>();

  protected readonly skeletonRows = [0, 1, 2];
  protected readonly nodeClass = nodeClass;

  protected readonly query = injectInteractionList(() => this.hiringProcessId());

  /* Newest first. The API returns insertion order, and the timeline reads
     top-down as "most recent thing that happened". */
  protected readonly interactions = computed(() =>
    [...(this.query.data() ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );
}
```

- [ ] **Step 4: Run the spec**

```bash
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include "src/app/features/hiring-processes/detail/interactions/interaction-timeline.spec.ts" 2>&1 | tail -6
```

Expected: `Tests 4 passed (4)`.

`bg-fuchsia` and `bg-danger` must both resolve. `--color-danger` already exists; `--color-fuchsia` was added in Task 7. If either utility renders with no background, Task 7's token step was skipped — go back and apply it rather than hard-coding a hex here.

- [ ] **Step 5: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): interaction timeline with skeleton, empty and error states"
```

---

### Task 10: `QuickCapture`

**Files:**

- Create: `.../interactions/quick-capture.ts`, `quick-capture.spec.ts`

**Interfaces:**

- Produces: `<app-quick-capture [pending]="..." [serverError]="..." (log)="..." />`, exported class `QuickCapture`, emitting `log` with the trimmed content string. It does NOT own a mutation — Task 12 wires it — so it stays a pure input/output component and is trivially testable.

**The 10-character rule:** `createInteractionSchema` requires `content` of at least 10 characters. Typing "called" would 422. This component refuses to emit and explains why.

- [ ] **Step 1: Write the failing spec**

```ts
import { TestBed } from "@angular/core/testing";
import { QuickCapture } from "./quick-capture";

function setup() {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(QuickCapture);
  fixture.detectChanges();
  const logged: string[] = [];
  fixture.componentInstance.log.subscribe((v) => logged.push(v));
  const input = fixture.nativeElement.querySelector("input") as HTMLInputElement;
  return { fixture, logged, input };
}

function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input"));
}

describe("QuickCapture", () => {
  it("emits the trimmed content when Enter is pressed", () => {
    const { fixture, logged, input } = setup();
    type(input, "  Recruiter called about the role  ");
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    fixture.detectChanges();
    expect(logged).toEqual(["Recruiter called about the role"]);
  });

  it("emits when the Log button is clicked", () => {
    const { fixture, logged, input } = setup();
    type(input, "Recruiter called about the role");
    fixture.detectChanges();
    (fixture.nativeElement.querySelector("button") as HTMLButtonElement).click();
    expect(logged).toHaveLength(1);
  });

  it("refuses content shorter than 10 characters and says why", () => {
    const { fixture, logged, input } = setup();
    type(input, "called");
    fixture.detectChanges();
    (fixture.nativeElement.querySelector("button") as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(logged).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain("at least 10 characters");
  });

  it("does nothing when the field is empty", () => {
    const { fixture, logged } = setup();
    (fixture.nativeElement.querySelector("button") as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(logged).toHaveLength(0);
  });

  it("clears the field after a successful emit", () => {
    const { fixture, input } = setup();
    type(input, "Recruiter called about the role");
    fixture.detectChanges();
    (fixture.nativeElement.querySelector("button") as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector("input") as HTMLInputElement).value).toBe("");
  });

  it("shows a server error passed in from the parent", () => {
    const { fixture } = setup();
    fixture.componentRef.setInput("serverError", "Could not log that");
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Could not log that");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include "src/app/features/hiring-processes/detail/interactions/quick-capture.spec.ts" 2>&1 | tail -8
```

Expected: FAIL — `Cannot find module './quick-capture'`.

- [ ] **Step 3: Implement**

```ts
import { Component, input, output, signal } from "@angular/core";

/* The domain schema requires 10..10000 characters, so a two-word note would be
   rejected by the server. Catch it here and say why, instead of surfacing a 422. */
const CONTENT_MIN = 10;

@Component({
  selector: "app-quick-capture",
  template: `
    <div class="mb-6 flex gap-2">
      <input
        type="text"
        class="input h-10 flex-1"
        placeholder="What just happened? Enter logs a note"
        aria-label="Log an interaction"
        [value]="text()"
        [attr.aria-invalid]="!!tooShort() || null"
        (input)="onInput($event)"
        (keydown.enter)="submit($event)"
      />
      <button
        type="button"
        class="btn btn-secondary h-10"
        [disabled]="pending()"
        (click)="submit()"
      >
        {{ pending() ? "Logging…" : "Log" }}
      </button>
    </div>
    @if (tooShort()) {
      <p class="field-error -mt-4 mb-6" role="alert">
        A note needs at least {{ min }} characters.
      </p>
    }
    @if (serverError(); as message) {
      <p class="field-error -mt-4 mb-6" role="alert">{{ message }}</p>
    }
  `,
})
export class QuickCapture {
  readonly pending = input(false);
  readonly serverError = input<string | null>(null);
  readonly log = output<string>();

  protected readonly min = CONTENT_MIN;
  protected readonly text = signal("");
  protected readonly tooShort = signal(false);

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLInputElement).value);
    this.tooShort.set(false);
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    const content = this.text().trim();
    if (!content) return;
    if (content.length < CONTENT_MIN) {
      this.tooShort.set(true);
      return;
    }
    this.log.emit(content);
    this.text.set("");
    this.tooShort.set(false);
  }
}
```

- [ ] **Step 4: Run the spec**

```bash
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include "src/app/features/hiring-processes/detail/interactions/quick-capture.spec.ts" 2>&1 | tail -6
```

Expected: `Tests 6 passed (6)`.

Note the component clears the field optimistically on emit. If the parent's mutation then fails, the text is gone — that is a real trade-off. The React version behaves the same way, so keep it, but mention it in your report.

- [ ] **Step 5: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): quick capture composer with the 10-character rule"
```

---

### Task 11: Edit and delete dialogs

**Files:**

- Create: `.../interactions/edit-interaction-dialog.ts`, `.../interactions/delete-interaction-dialog.ts`

**Interfaces:**

- Produces:
  - `EditInteractionDialog` — `<app-edit-interaction-dialog (save)="..." />` with public `open(interaction: Interaction)` and `close()`. Emits `save` with `{ interactionId, body: UpdateInteraction }`.
  - `DeleteInteractionDialog` — `<app-delete-interaction-dialog (confirm)="..." />` with public `open(interaction: Interaction)` and `close()`. Emits `confirm` with the interaction id.
- Both follow the existing `ArchiveDialog` pattern: a native `<dialog>` reached through `viewChild.required`, opened with `showModal()`.

Read `apps/angular-web/src/app/features/hiring-processes/detail/archive-dialog.ts` before writing these so they look like siblings.

- [ ] **Step 1: Write `edit-interaction-dialog.ts`**

```ts
import { Component, ElementRef, output, signal, viewChild } from "@angular/core";
import {
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPE_VALUES,
  type InteractionType,
} from "@interviews-tool/domain/constants";
import type { UpdateInteraction } from "@interviews-tool/domain/schemas";
import type { Interaction } from "../../../../core/api/interaction.model";

const CONTENT_MIN = 10;
const TITLE_MAX = 100;

@Component({
  selector: "app-edit-interaction-dialog",
  template: `
    <dialog #dialog class="card w-full max-w-lg backdrop:bg-black/60">
      <h2 class="mb-4 text-base font-semibold">Edit interaction</h2>

      <label class="label" for="edit-title">Title</label>
      <input
        id="edit-title"
        class="input mb-4"
        [maxLength]="titleMax"
        [value]="title()"
        (input)="title.set($any($event.target).value)"
      />

      <label class="label" for="edit-type">Type</label>
      <select
        id="edit-type"
        class="input mb-4"
        (change)="type.set($any($event.target).value)"
      >
        @for (t of types; track t) {
          <option [value]="t" [selected]="t === type()">{{ labels[t] }}</option>
        }
      </select>

      <label class="label" for="edit-content">Content</label>
      <textarea
        id="edit-content"
        class="input mb-1 min-h-40 font-mono text-sm"
        [value]="content()"
        (input)="onContent($event)"
      ></textarea>
      @if (tooShort()) {
        <p class="field-error mb-3" role="alert">
          Content needs at least {{ contentMin }} characters.
        </p>
      }

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="close()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="onSave()">Save changes</button>
      </div>
    </dialog>
  `,
})
export class EditInteractionDialog {
  readonly save = output<{ interactionId: string; body: UpdateInteraction }>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>("dialog");

  protected readonly types = INTERACTION_TYPE_VALUES;
  protected readonly labels = INTERACTION_TYPE_LABELS;
  protected readonly contentMin = CONTENT_MIN;
  protected readonly titleMax = TITLE_MAX;

  protected readonly title = signal("");
  protected readonly content = signal("");
  protected readonly type = signal<InteractionType>("note");
  protected readonly tooShort = signal(false);
  private interactionId = "";

  open(interaction: Interaction): void {
    this.interactionId = interaction.id;
    this.title.set(interaction.title ?? "");
    this.content.set(interaction.content);
    this.type.set(interaction.type);
    this.tooShort.set(false);
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected onContent(event: Event): void {
    this.content.set((event.target as HTMLTextAreaElement).value);
    this.tooShort.set(false);
  }

  protected onSave(): void {
    const content = this.content().trim();
    if (content.length < CONTENT_MIN) {
      this.tooShort.set(true);
      return;
    }
    const title = this.title().trim();
    this.save.emit({
      interactionId: this.interactionId,
      // title is optional in the schema; send it only when there is one.
      body: { content, type: this.type(), ...(title ? { title } : {}) },
    });
    this.close();
  }
}
```

- [ ] **Step 2: Write `delete-interaction-dialog.ts`**

```ts
import { Component, ElementRef, output, signal, viewChild } from "@angular/core";
import type { Interaction } from "../../../../core/api/interaction.model";

@Component({
  selector: "app-delete-interaction-dialog",
  template: `
    <dialog #dialog class="card w-full max-w-sm backdrop:bg-black/60">
      <h2 class="mb-2 text-base font-semibold">Delete this interaction?</h2>
      <p class="mb-4 text-sm text-text-muted">
        This removes it from the timeline permanently.
      </p>
      @if (preview(); as text) {
        <p class="mb-4 line-clamp-3 rounded-md bg-surface-2 p-3 font-mono text-xs text-text-secondary">
          {{ text }}
        </p>
      }
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="close()">Cancel</button>
        <button type="button" class="btn btn-danger" (click)="onConfirm()">Delete</button>
      </div>
    </dialog>
  `,
})
export class DeleteInteractionDialog {
  readonly confirm = output<string>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>("dialog");

  protected readonly preview = signal("");
  private interactionId = "";

  open(interaction: Interaction): void {
    this.interactionId = interaction.id;
    // A short excerpt so the user can tell which note they are about to lose.
    this.preview.set(interaction.content.slice(0, 160));
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected onConfirm(): void {
    this.confirm.emit(this.interactionId);
    this.close();
  }
}
```

- [ ] **Step 3: Type-check**

These two are exercised end-to-end through `interaction-section.spec.ts` in Task 12; they get no spec of their own. Do not add one.

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && bun run check-types && bun run test 2>&1 | tail -4
```

Expected: no type errors; `Tests 89 passed (89)`.

If `$any(...)` in the template is rejected under `strictTemplates`, replace those handlers with a typed method on the class (`onTitle(event: Event)`) in the same shape as `onContent`, and say so in your report.

- [ ] **Step 4: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): edit and delete dialogs for interactions"
```

---

### Task 12: `InteractionSection`

**Files:**

- Create: `.../interactions/interaction-section.ts`, `interaction-section.spec.ts`

**Interfaces:**

- Consumes: Tasks 6, 9, 10, 11.
- Produces: `<app-interaction-section [hiringProcessId]="..." />`, exported class `InteractionSection`. It owns the three mutations and the two dialogs, and renders the section heading with the live count.
  (Dropped during execution: a `changed` output and a `(changed)="process.reload()"` binding on the detail page — the server never writes the `hiring_processes` row on an interaction create/update/delete, so there is nothing on the header for a reload to refresh.)

- [ ] **Step 1: Write the failing spec**

```ts
import { TestBed } from "@angular/core/testing";
import { QueryClient, provideTanStackQuery } from "@tanstack/angular-query-experimental";
import { InteractionsApi } from "../../../../core/api/interactions.api";
import type { Interaction } from "../../../../core/api/interaction.model";
import { InteractionSection } from "./interaction-section";

const PROCESS = "11111111-1111-4111-8111-111111111111";

const item: Interaction = {
  id: "22222222-2222-4222-8222-222222222222",
  hiringProcessId: PROCESS,
  title: null,
  content: "A note with plenty of characters.",
  type: "note",
  createdAt: "2026-08-20T09:20:00.000Z",
  updatedAt: "2026-08-20T09:20:00.000Z",
};

function setup(items: Interaction[] = [item]) {
  const api = {
    list: vi.fn().mockResolvedValue(items),
    create: vi.fn().mockResolvedValue(item),
    update: vi.fn().mockResolvedValue(item),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: InteractionsApi, useValue: api },
    ],
  });
  const fixture = TestBed.createComponent(InteractionSection);
  fixture.componentRef.setInput("hiringProcessId", PROCESS);
  fixture.detectChanges();
  return { api, fixture };
}

describe("InteractionSection", () => {
  it("shows the heading and the logged count", async () => {
    const { fixture } = setup([item, { ...item, id: "other" }]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Interactions");
      expect(fixture.nativeElement.textContent).toContain("2 logged");
    });
  });

  it("creates a note from the quick composer", async () => {
    const { api, fixture } = setup();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("input")).not.toBeNull();
    });
    const input = fixture.nativeElement.querySelector("input") as HTMLInputElement;
    input.value = "Recruiter called about the role";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await vi.waitFor(() =>
      expect(api.create).toHaveBeenCalledWith(PROCESS, {
        content: "Recruiter called about the role",
        type: "note",
      }),
    );
  });

  it("surfaces a create failure without losing the section", async () => {
    const { api, fixture } = setup();
    api.create.mockRejectedValueOnce(new Error("Server said no"));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("input")).not.toBeNull();
    });
    const input = fixture.nativeElement.querySelector("input") as HTMLInputElement;
    input.value = "Recruiter called about the role";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Server said no");
    });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include "src/app/features/hiring-processes/detail/interactions/interaction-section.spec.ts" 2>&1 | tail -8
```

Expected: FAIL — `Cannot find module './interaction-section'`.

- [ ] **Step 3: Implement**

```ts
import { Component, computed, input, viewChild } from "@angular/core";
import type { UpdateInteraction } from "@interviews-tool/domain/schemas";
import type { Interaction } from "../../../../core/api/interaction.model";
import {
  injectCreateInteraction,
  injectDeleteInteraction,
  injectInteractionList,
  injectUpdateInteraction,
} from "../../interaction.queries";
import { DeleteInteractionDialog } from "./delete-interaction-dialog";
import { EditInteractionDialog } from "./edit-interaction-dialog";
import { InteractionTimeline } from "./interaction-timeline";
import { QuickCapture } from "./quick-capture";

@Component({
  selector: "app-interaction-section",
  imports: [QuickCapture, InteractionTimeline, EditInteractionDialog, DeleteInteractionDialog],
  template: `
    <div class="mb-5 mt-11 flex items-baseline justify-between gap-4">
      <h2 class="text-2xl font-medium text-text">Interactions</h2>
      <span class="font-mono text-[13px] text-text-muted">{{ count() }} logged</span>
    </div>

    <app-quick-capture
      [pending]="create.isPending()"
      [serverError]="actionError()"
      (log)="onLog($event)"
    />

    <app-interaction-timeline
      [hiringProcessId]="hiringProcessId()"
      (edit)="editDialog().open($event)"
      (remove)="deleteDialog().open($event)"
    />

    <app-edit-interaction-dialog (save)="onSave($event)" />
    <app-delete-interaction-dialog (confirm)="onDelete($event)" />
  `,
})
export class InteractionSection {
  readonly hiringProcessId = input.required<string>();

  protected readonly editDialog = viewChild.required(EditInteractionDialog);
  protected readonly deleteDialog = viewChild.required(DeleteInteractionDialog);

  /* The count comes from the interactions query, not from the detail record:
     the list is the source of truth and updates the moment a mutation settles. */
  private readonly list = injectInteractionList(() => this.hiringProcessId());
  protected readonly count = computed(() => this.list.data()?.length ?? 0);

  protected readonly create = injectCreateInteraction();
  protected readonly update = injectUpdateInteraction();
  protected readonly remove = injectDeleteInteraction();

  protected readonly actionError = computed(
    () =>
      this.create.error()?.message ??
      this.update.error()?.message ??
      this.remove.error()?.message ??
      null,
  );

  /* Only the action just taken may show an error, and a mutation that is still
     in flight keeps its observer so its onSuccess still fires. Same rule as the
     detail page's resetActionErrors. */
  private resetActionErrors(): void {
    if (!this.create.isPending()) this.create.reset();
    if (!this.update.isPending()) this.update.reset();
    if (!this.remove.isPending()) this.remove.reset();
  }

  protected onLog(content: string): void {
    this.resetActionErrors();
    this.create.mutate({ hiringProcessId: this.hiringProcessId(), body: { content, type: "note" } });
  }

  protected onSave(event: { interactionId: string; body: UpdateInteraction }): void {
    this.resetActionErrors();
    this.update.mutate({
      hiringProcessId: this.hiringProcessId(),
      interactionId: event.interactionId,
      body: event.body,
    });
  }

  protected onDelete(interactionId: string): void {
    this.resetActionErrors();
    this.remove.mutate({ hiringProcessId: this.hiringProcessId(), interactionId });
  }
}
```

Note: `injectInteractionList` is called here AND inside `InteractionTimeline`. That is deliberate and costs nothing — TanStack dedupes by query key, so both read the same cache entry and only one request is made. It keeps the timeline self-contained while letting the section show the count.

Unused import check: `Interaction` is imported for the dialog output types; if TypeScript reports it unused after you finish, delete the import rather than leaving it.

- [ ] **Step 4: Run the spec**

```bash
source ~/.nvm/nvm.sh && nvm use && bun run ng test --watch=false --include "src/app/features/hiring-processes/detail/interactions/interaction-section.spec.ts" 2>&1 | tail -6
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 5: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): interaction section wiring composer, timeline and dialogs"
```

---

### Task 13: Detail page redesign

**Files:**

- Create: `.../detail/process-stats.ts`
- Modify: `.../detail/detail-page.ts` (rewrite the template), `.../detail/detail-page.spec.ts` (add two cases)

**Interfaces:**

- Consumes: `InteractionSection` (Task 12), `AbsoluteDatePipe` (Task 4).
- Produces: a detail page whose header card and 4-stat row match `apps/web`'s, with the interactions section below it.

**Do not change** the page's existing behaviour: the `httpResource` fetch, the four mutations, `resetActionErrors`, the status `<select>`, the archive dialog, the 404 branch and the `isLoading() && !hasValue()` guard all stay exactly as they are. This task is a template rewrite plus one new child component — the class logic gains only an `interactionCount`.

- [ ] **Step 1: Read the current page**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
cat apps/angular-web/src/app/features/hiring-processes/detail/detail-page.ts
```

Note every signal, mutation and handler it already has. You are keeping all of them.

- [ ] **Step 2: Write `process-stats.ts`**

```ts
import { Component, input } from "@angular/core";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
import { AbsoluteDatePipe } from "../../../shared/pipes/absolute-date.pipe";
import { MoneyPipe } from "../../../shared/pipes/money.pipe";

/* The four-stat row under the header, matching apps/web: two columns on small
   screens, four from lg. Mono type throughout — these are figures, not prose. */
@Component({
  selector: "app-process-stats",
  imports: [MoneyPipe, AbsoluteDatePipe],
  template: `
    <div class="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-6 lg:grid-cols-4">
      <div>
        <p class="mb-1.5 text-[11px] font-medium tracking-[0.04em] text-text-muted">Salary</p>
        @if (process().salary !== null) {
          <p class="font-mono text-2xl text-text">
            {{ process().salary | money: process().currency }}
          </p>
          <p class="mt-0.5 font-mono text-xs text-text-secondary">
            {{ process().salaryRateType }} · {{ process().currency }}
          </p>
        } @else {
          <p class="font-mono text-2xl text-text-muted">—</p>
        }
      </div>

      <div>
        <p class="mb-1.5 text-[11px] font-medium tracking-[0.04em] text-text-muted">Interactions</p>
        <p class="font-mono text-2xl text-text">{{ interactionCount() }}</p>
        <p class="mt-0.5 font-mono text-xs text-text-secondary">logged</p>
      </div>

      <div>
        <p class="mb-1.5 text-[11px] font-medium tracking-[0.04em] text-text-muted">Created</p>
        <p class="font-mono text-[13px] leading-relaxed text-text-secondary">
          {{ process().createdAt | absoluteDate: "date" }}<br />
          {{ process().createdAt | absoluteDate: "time" }}
        </p>
      </div>

      <div>
        <p class="mb-1.5 text-[11px] font-medium tracking-[0.04em] text-text-muted">Last updated</p>
        <p class="font-mono text-[13px] leading-relaxed text-text-secondary">
          {{ process().updatedAt | absoluteDate: "date" }}<br />
          {{ process().updatedAt | absoluteDate: "time" }}
        </p>
      </div>
    </div>
  `,
})
export class ProcessStats {
  readonly process = input.required<HiringProcess>();
  readonly interactionCount = input.required<number>();
}
```

`MoneyPipe.transform` takes `(salary, currency, rateType?)`. Passing only two arguments omits the rate suffix, which is right here because the rate is shown on its own line. Confirm the pipe's signature in `shared/pipes/money.pipe.ts` before relying on it.

- [ ] **Step 3: Rewrite the detail page's header block**

In `detail-page.ts`, replace the current header `<div class="mb-4 flex items-start justify-between gap-4">…</div>` **and** the `<div class="grid gap-4 md:grid-cols-2">…</div>` sections with the structure below. Keep the surrounding `@if` branches (`isLoading() && !hasValue()`, `error()`, `hasValue()`) exactly as they are.

```html
<a routerLink="/hiring-processes" class="text-xs text-text-muted hover:underline">
  ← Back to processes
</a>

<section class="mt-4 rounded-xl border border-border bg-surface p-6">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h1 class="text-[32px] font-medium leading-tight tracking-[-0.01em] text-text">
        {{ process.value().companyName }}
      </h1>
      @if (process.value().jobTitle; as jobTitle) {
        <p class="mt-1 text-sm text-text-secondary">{{ jobTitle }}</p>
      }
      <div class="mt-3">
        <app-status-badge [status]="process.value().status" />
      </div>
    </div>
    <div class="flex shrink-0 gap-1">
      <a [routerLink]="['/hiring-processes', id(), 'edit']" class="btn btn-secondary h-8">Edit</a>
      @if (process.value().archivedAt) {
        <button type="button" class="btn btn-secondary h-8" [disabled]="restore.isPending()" (click)="onRestore()">
          Restore
        </button>
      } @else {
        <button type="button" class="btn btn-secondary h-8" (click)="archiveDialog().open()">
          Archive
        </button>
      }
      <button type="button" class="btn btn-danger h-8" [disabled]="remove.isPending()" (click)="onDelete()">
        Delete
      </button>
    </div>
  </div>

  <app-process-stats [process]="process.value()" [interactionCount]="interactionCount()" />

  <div class="mt-6 flex items-center gap-3 border-t border-border pt-6">
    @if (nextStatuses().length > 0) {
      <select
        id="next-status"
        class="input max-w-48"
        aria-label="Move this process to another status"
        [disabled]="changeStatus.isPending()"
        (change)="onStatusChange($event)"
      >
        <option value="">Move to…</option>
        @for (s of nextStatuses(); track s) {
          <option [value]="s" [selected]="false">{{ statusInfo[s].label }}</option>
        }
      </select>
    }
    @if (process.value().archivedAt; as archivedAt) {
      <p class="text-xs text-text-muted">
        Archived {{ archivedAt | absoluteDate: "date" }} · {{ process.value().archiveReason }}
      </p>
    }
  </div>

  @if (actionError(); as message) {
    <p class="field-error mt-3" role="alert">{{ message }}</p>
  }
</section>

<app-interaction-section [hiringProcessId]="id()" />

<app-archive-dialog (confirm)="onArchive($event)" />
```

(Dropped during execution: the `(changed)="process.reload()"` binding shown in earlier drafts of this
task — the server never writes the `hiring_processes` row on an interaction create/update/delete, so
there is nothing on the header for a reload to refresh.)

- [ ] **Step 4: Update the class**

Add to the component's `imports`: `ProcessStats`, `InteractionSection`, `AbsoluteDatePipe`. Remove `MoneyPipe`, `RelativeDatePipe` and `EmptyState`/`Spinner` **only if** they are genuinely no longer referenced by the template — check before deleting an import.

Add one field so the stats row can show the count. The section already owns the query, and TanStack dedupes by key, so reading it here costs no extra request:

```ts
/* The stats row shows the same count the section's heading does; both read the
   one cached interactions query, so this is a second reader, not a second fetch. */
private readonly interactions = injectInteractionList(() => this.id());
protected readonly interactionCount = computed(() => this.interactions.data()?.length ?? 0);
```

importing `injectInteractionList` from `../interaction.queries`.

- [ ] **Step 5: Extend the spec**

Add two cases to `detail-page.spec.ts`. The existing tests must keep passing untouched. The page now issues an interactions request too, so the setup must tolerate it — use `ctrl.match()` rather than `expectOne` where a second request would otherwise fail `verify()`, or provide a stub `InteractionsApi`. Prefer the stub, it is less brittle:

```ts
// add to the existing setup()'s providers:
{ provide: InteractionsApi, useValue: { list: vi.fn().mockResolvedValue([]) } },
```

Then:

```ts
it("renders the four-stat row with the interaction count", async () => {
  const { ctrl, fixture } = setup();
  await vi.waitFor(() =>
    ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null }),
  );
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Interactions");
    expect(fixture.nativeElement.textContent).toContain("logged");
    expect(fixture.nativeElement.textContent).toContain("Last updated");
  });
});

it("shows the back link and the company name in the header card", async () => {
  const { ctrl, fixture } = setup();
  await vi.waitFor(() =>
    ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null }),
  );
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Back to processes");
    expect(fixture.nativeElement.querySelector("h1")?.textContent).toContain("Acme");
  });
});
```

- [ ] **Step 6: Run the detail spec, then the full suite and build**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use
bun run ng test --watch=false --include "src/app/features/hiring-processes/detail/detail-page.spec.ts" 2>&1 | tail -6
bun run test 2>&1 | tail -4
bun run check-types
bun run build 2>&1 | tail -3
```

Expected: the detail spec passes with 9 cases (7 existing + 2 new); the full suite reports `Tests 94 passed (94)`; type-check and build clean.

- [ ] **Step 7: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web
git commit -m "feat(angular-web): detail page redesign with stats row and interactions section"
```

---

### Task 14: Docs and final verification

**Files:**

- Modify: `apps/angular-web/README.md`

- [ ] **Step 1: Update the README**

In `apps/angular-web/README.md`, under the "Where things are" list, add two bullets matching the existing style:

```md
- `src/app/features/hiring-processes/detail/interactions` — timeline, quick capture, edit/delete dialogs
- Markdown is rendered with `marked` through `[innerHTML]`; Angular sanitizes it, and the normalizer is shared with the React client via `@interviews-tool/ui-markdown`.
```

Then update the imports rule line at the bottom so it reads:

```md
Rule: this app imports only `@interviews-tool/domain` and `@interviews-tool/ui-markdown`.
```

- [ ] **Step 2: Run every check**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
bun run lint 2>&1 | tail -5
cd apps/angular-web && source ~/.nvm/nvm.sh && nvm use && bun run check-types && bun run test 2>&1 | tail -4 && bun run build 2>&1 | tail -3
cd ../../packages/domain && bun run test 2>&1 | tail -3
cd ../ui-markdown && bun run test 2>&1 | tail -3
```

Expected: lint reports no new findings (two pre-existing warnings in `apps/mobile` are expected); Angular 94/94; domain 21/21; ui-markdown green.

- [ ] **Step 3: Prove React is still untouched**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git diff --stat main -- apps/web apps/server apps/mobile
```

Expected: **no output at all.** If anything appears, stop and report it — the plan's central promise is that the React client does not change.

- [ ] **Step 4: Verify the dev server serves the new page**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool/apps/angular-web
source ~/.nvm/nvm.sh && nvm use && (bun run dev > /tmp/ngdev-final.log 2>&1 &)
sleep 45
curl -s -o /dev/null -w "shell %{http_code}\n" http://localhost:4200/
curl -s -o /dev/null -w "detail route %{http_code}\n" http://localhost:4200/hiring-processes/any-id
grep -iE "UNRESOLVED_IMPORT|ERROR|Watch mode" /tmp/ngdev-final.log | head -3
pkill -f "ng serve"
```

Expected: both `200`, and `Watch mode enabled` in the log with no `UNRESOLVED_IMPORT`. A failure here almost certainly means Task 2's `prebundle.exclude` entry is missing.

- [ ] **Step 5: Commit**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git add apps/angular-web/README.md
git commit -m "docs(angular-web): document the interactions feature and the shared markdown package"
```

Phase A is complete. D ("Log it after" with drafts and the markdown editor) and E (live note) get their own spec and plan.
