# web-stylex Phase 0 (spike) + Phase 1 (clone) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove StyleX compiles under `apps/web`'s exact build stack (Phase 0, throwaway), then create `apps/web-stylex` as a verbatim, still-Tailwind copy of `apps/web` with a visual-diff harness and captured baseline metrics (Phase 1).

**Architecture:** Phase 0 lives on a branch that is never merged; its only durable output is `docs/tailwind-to-stylex-migration/03-spike-findings.md`. Phase 1 adds a new workspace app under `apps/web-stylex` that Turbo, CI and `bun install` pick up automatically through the `apps/*` glob; the only change outside the new app is the server CORS allow-list. A Playwright harness inside the new app screenshots `web` (:3001) and `web-stylex` (:3002) on the same routes and reports pixel diff.

**Tech Stack:** Bun 1.3.4, Turbo 2, Vite 7, TanStack Start, `@cloudflare/vite-plugin`, Tailwind 4, `@stylexjs/stylex` 0.19.0, `@stylexjs/babel-plugin` 0.19.0, `@stylexjs/postcss-plugin` 0.19.0, `unplugin-stylex` 0.6.x, Playwright, `pixelmatch` + `pngjs`.

**Spec:** `docs/tailwind-to-stylex-migration/spec-web-stylex.md` (read §2 Decisions, §7 harness, §8 metrics, §9 phases 0–1). Background: `01-baseline-analysis.md`, `02-plan-review.md` in the same folder.

## Global Constraints

- Everything committed is in **English** (commits, code, docs, comments).
- **Never merge or push to `main` locally.** Every phase lands through a PR (`gh` account `csdev19`).
- **`apps/web` is not modified** in Phase 1. Phase 0 modifies it only on the throwaway spike branch.
- The only backend change: `CORS_ORIGIN` / `corsConfig` gain `http://localhost:3002` (spec §6).
- `apps/web-stylex` is **not deployed**: no `deploy`/`destroy`/`alchemy:dev` scripts; worker renamed; no `routes` in its `wrangler.jsonc`.
- Node `>= 22.22.3` or `>= 24.15.0` (repo requirement; use `nvm use 24`).
- All `@stylexjs/*` packages pinned to **0.19.0** (they are released in lockstep; the frozen 0.11.1 webpack/esbuild/nextjs plugins are not used).
- `unstable_moduleResolution.rootDir` for the StyleX Babel plugin is **the monorepo root** in every workspace.
- Baseline metrics (Task 13) are captured **before any StyleX package is added to `apps/web-stylex`**.
- The compare harness threshold is **0.1 %** per screenshot; Phase 1 gate is **0.00 %** on every route.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

## File map

**Phase 0 — spike branch `spike/stylex-under-web-build` (never merged)**

| Path                                                     | Responsibility                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/web/vite.config.ts`                                | add StyleX Babel plugin to `viteReact`, PostCSS plugin                                     |
| `apps/web/postcss.config.cjs`                            | `@stylexjs/postcss-plugin` config (PostCSS route)                                          |
| `apps/web/src/stylex.css`                                | `@stylex;` directive                                                                       |
| `apps/web/src/components/stylex-probe.tsx`               | probe component: `create`, pseudo-class, `@media`, `keyframes`, cross-package `defineVars` |
| `apps/web/src/routes/index.tsx`                          | render the probe on the landing page                                                       |
| `apps/web/vitest.config.ts`                              | StyleX Babel plugin with `test: true`                                                      |
| `apps/web/src/components/stylex-probe.test.tsx`          | proves tests compile StyleX                                                                |
| `packages/design-tokens-probe/`                          | throwaway package with a `probe.stylex.ts` to test cross-package vars                      |
| `docs/tailwind-to-stylex-migration/03-spike-findings.md` | **the durable output**, written on the docs branch                                         |

**Phase 1 — branch `feat/web-stylex-clone`**

| Path                                                       | Responsibility                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| `apps/web-stylex/**`                                       | verbatim copy of `apps/web` (see Task 8 exclusions)         |
| `apps/web-stylex/package.json`                             | name `web-stylex`; deploy scripts removed; `compare` script |
| `apps/web-stylex/vite.config.ts`                           | port 3002                                                   |
| `apps/web-stylex/vitest.config.ts`                         | `name: "web-stylex"`                                        |
| `apps/web-stylex/wrangler.jsonc`                           | `name: hiring-tool-web-stylex`, no `routes`                 |
| `apps/web-stylex/compare/playwright.config.ts`             | Playwright config for the harness                           |
| `apps/web-stylex/compare/routes.ts`                        | route list, viewports, themes                               |
| `apps/web-stylex/compare/auth.setup.ts`                    | logs in on both origins, saves storage state                |
| `apps/web-stylex/compare/compare.spec.ts`                  | screenshots both origins, pixelmatch, writes summary        |
| `apps/web-stylex/compare/report.ts`                        | prints the summary table and exits non-zero above threshold |
| `apps/web-stylex/.gitignore`                               | adds `/compare/output/` and `/compare/.auth/`               |
| `apps/server/src/index.ts:12`                              | CORS origin list                                            |
| `apps/server/.env.example:11`                              | `CORS_ORIGIN` example                                       |
| `package.json` (root)                                      | `dev:web-stylex` script                                     |
| `docs/tailwind-to-stylex-migration/04-baseline-metrics.md` | measured numbers                                            |
| `docs/tailwind-to-stylex-migration/06-tracker.md`          | created here with the origin commit; filled in Phase 2+     |
| `docs/tailwind-to-stylex-migration/README.md`              | index rows                                                  |

---

## Phase 0 — Spike (throwaway)

Everything in Tasks 1–6 happens on `spike/stylex-under-web-build`, branched from the current `main`. Commits are allowed there (they help bisect a failure) but the branch is deleted in Task 7. Keep a scratch log in `/private/tmp/.../scratchpad/spike-log.md` as you go — every exact error message, every config that worked — because Task 7 turns it into the findings document.

### Task 1: PostCSS route — StyleX compiles in `vite dev`

**Files:**

- Modify: `apps/web/vite.config.ts`
- Create: `apps/web/postcss.config.cjs`
- Create: `apps/web/src/stylex.css`
- Create: `apps/web/src/components/stylex-probe.tsx`
- Modify: `apps/web/src/routes/index.tsx`

**Interfaces:**

- Produces: `<StylexProbe />` component exported from `stylex-probe.tsx`, reused by Tasks 2–5.

- [ ] **Step 1: Branch and install**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git checkout main && git pull
git checkout -b spike/stylex-under-web-build
cd apps/web
bun add @stylexjs/stylex@0.19.0
bun add -d @stylexjs/babel-plugin@0.19.0 @stylexjs/postcss-plugin@0.19.0 postcss@^8.5.10
```

- [ ] **Step 2: Register the Babel plugin in `vite.config.ts`**

Replace the whole file with:

```ts
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";

/* Monorepo root. StyleX hashes defineVars by path relative to rootDir, so every
   workspace must use the same value or cross-package variables will not match. */
const monorepoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    viteReact({
      babel: {
        plugins: [
          [
            "@stylexjs/babel-plugin",
            {
              dev: process.env.NODE_ENV !== "production",
              runtimeInjection: false,
              unstable_moduleResolution: { type: "commonJS", rootDir: monorepoRoot },
            },
          ],
        ],
      },
    }),
  ],
  server: {
    port: 3001,
  },
});
```

- [ ] **Step 3: PostCSS config**

Create `apps/web/postcss.config.cjs`:

```js
const path = require("node:path");

module.exports = {
  plugins: {
    "@stylexjs/postcss-plugin": {
      include: ["src/**/*.{ts,tsx}", "../../packages/*/src/**/*.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**"],
      babelConfig: {
        babelrc: false,
        plugins: [
          [
            "@stylexjs/babel-plugin",
            {
              dev: process.env.NODE_ENV !== "production",
              runtimeInjection: false,
              unstable_moduleResolution: {
                type: "commonJS",
                rootDir: path.resolve(__dirname, "../.."),
              },
            },
          ],
        ],
      },
    },
  },
};
```

The Babel config here needs to parse TypeScript. If the plugin errors with "Unexpected token" on a type annotation, add `@babel/preset-typescript` (`bun add -d @babel/preset-typescript`) and `presets: [["@babel/preset-typescript", { isTSX: true, allExtensions: true }]]` inside `babelConfig`. Log which one was needed.

- [ ] **Step 4: Directive file and probe component**

Create `apps/web/src/stylex.css`:

```css
@stylex;
```

Create `apps/web/src/components/stylex-probe.tsx`:

```tsx
import * as stylex from "@stylexjs/stylex";

const pulse = stylex.keyframes({
  "0%": { opacity: 0.4 },
  "100%": { opacity: 1 },
});

const styles = stylex.create({
  box: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: {
      default: "rgb(255, 0, 160)",
      ":hover": "rgb(0, 255, 194)",
      "@media (min-width: 768px)": "rgb(122, 0, 255)",
    },
    color: "#ffffff",
    animationName: pulse,
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationDirection: "alternate",
  },
});

/* Throwaway. Exists only so the spike can see StyleX output in the DOM. */
export function StylexProbe(): React.ReactElement {
  return (
    <div data-testid="stylex-probe" {...stylex.props(styles.box)}>
      stylex probe
    </div>
  );
}
```

- [ ] **Step 5: Render it and import the directive**

In `apps/web/src/routes/index.tsx`, add at the top:

```tsx
import "@/stylex.css";
import { StylexProbe } from "@/components/stylex-probe";
```

and render `<StylexProbe />` as the first child of the page's root element (anywhere visible is fine — it is a spike).

- [ ] **Step 6: Run dev and verify**

```bash
cd apps/web && bun run dev
```

Open `http://localhost:3001`. Expected:

- The probe is visible, magenta (or violet at ≥768 px), pulsing, mint on hover.
- Browser console has **no** `stylex.create should never be called` error.
- In devtools, the probe's `class` is a set of short hashed classes (e.g. `x1a2b3c`), not an empty string.

If the plugin ordering matters (Tailwind's `@import` swallowing `@stylex;`), try moving `stylex.css` import to `__root.tsx` and, separately, moving `viteReact` before `tanstackStart`. Log every combination and its result.

- [ ] **Step 7: Commit the working state**

```bash
git add -A && git commit -m "spike: stylex via postcss plugin under vite dev

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 2: PostCSS route — production build + Cloudflare SSR

**Files:**

- No new files. Uses Task 1 output.

- [ ] **Step 1: Production build**

```bash
cd apps/web && rm -rf dist && NODE_ENV=production bun run build
```

Expected: build succeeds. Then:

```bash
grep -rl "stylex-probe\|x[0-9a-z]\{6,\}" dist/client/assets/*.css | head
grep -c "animation" dist/client/assets/*.css
```

Expected: at least one CSS file contains the probe's hashed rules and the keyframes. Record the CSS file size.

- [ ] **Step 2: SSR under the Workers runtime**

```bash
cd apps/web && bun run wrangler:dev
```

Open `http://localhost:3001` and **view page source** (not devtools DOM). Expected: the SSR HTML already contains the probe `<div>` with hashed classes, and the stylesheet link is present, so first paint is styled. Record whether the server bundle (`dist/server` or `.wrangler` output) errors on `@stylexjs/stylex` import (it should not — the runtime is 1.7 KB of pure JS).

- [ ] **Step 3: Log**

Append to the scratch log: build time, CSS size, SSR result, any warnings.

### Task 3: Cross-package `defineVars`

**Files:**

- Create: `packages/design-tokens-probe/package.json`
- Create: `packages/design-tokens-probe/src/probe.stylex.ts`
- Modify: `apps/web/src/components/stylex-probe.tsx`
- Modify: `apps/web/package.json` (add the workspace dep)

- [ ] **Step 1: Throwaway package**

`packages/design-tokens-probe/package.json`:

```json
{
  "name": "@interviews-tool/design-tokens-probe",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./probe.stylex": "./src/probe.stylex.ts"
  },
  "dependencies": {
    "@stylexjs/stylex": "0.19.0"
  }
}
```

`packages/design-tokens-probe/src/probe.stylex.ts`:

```ts
import * as stylex from "@stylexjs/stylex";

export const probeVars = stylex.defineVars({
  accent: "rgb(0, 255, 194)",
  ink: "rgb(4, 38, 29)",
});

export const probeLight = stylex.createTheme(probeVars, {
  accent: "rgb(0, 166, 126)",
  ink: "rgb(228, 255, 246)",
});
```

- [ ] **Step 2: Consume it**

```bash
cd apps/web && bun add @interviews-tool/design-tokens-probe@workspace:*
```

In `stylex-probe.tsx`, import and use:

```tsx
import { probeVars, probeLight } from "@interviews-tool/design-tokens-probe/probe.stylex";
// in styles.box: replace color: "#ffffff" with
//   color: probeVars.ink,
// and add a second element:
export function StylexProbe(): React.ReactElement {
  return (
    <>
      <div data-testid="stylex-probe" {...stylex.props(styles.box)}>stylex probe</div>
      <div {...stylex.props(probeLight, styles.box)}>stylex probe (light theme)</div>
    </>
  );
}
```

- [ ] **Step 3: Verify in dev and build**

Run `bun run dev` and `bun run build` again. Expected:

- Both probes render; the second has the light `ink` colour.
- In the built CSS, the `:root` (or `:root, .x…`) rule declares the two variables **once** and the theme class overrides them. If instead you see two different variable names for `accent`, `rootDir` is inconsistent — fix and re-log.
- Verify Vite actually transformed the package source: temporarily break `probe.stylex.ts` (e.g. `defineVars(` → `defineVarsX(`) and confirm the build fails from that file. Revert.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "spike: cross-package defineVars through a workspace package

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 4: Vitest compiles StyleX

**Files:**

- Modify: `apps/web/vitest.config.ts`
- Create: `apps/web/src/components/stylex-probe.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StylexProbe } from "./stylex-probe";

describe("StylexProbe", () => {
  it("renders with compiled class names", () => {
    render(<StylexProbe />);
    const el = screen.getByTestId("stylex-probe");
    expect(el.className.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it — expect failure**

```bash
cd apps/web && bunx vitest run src/components/stylex-probe.test.tsx
```

Expected: FAIL with `stylex.create should never be called. It should be compiled away.` (this is the proof the Babel plugin is missing from the test pipeline).

- [ ] **Step 3: Add the plugin to `vitest.config.ts`**

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";

const monorepoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    react({
      babel: {
        plugins: [
          [
            "@stylexjs/babel-plugin",
            {
              dev: true,
              test: true,
              runtimeInjection: false,
              unstable_moduleResolution: { type: "commonJS", rootDir: monorepoRoot },
            },
          ],
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    name: "web",
  },
});
```

- [ ] **Step 4: Run again — expect pass, and the whole suite still green**

```bash
bunx vitest run src/components/stylex-probe.test.tsx && bun run test
```

Expected: PASS; the existing 6 test files still pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "spike: stylex babel plugin in vitest

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 5: `unplugin-stylex` route (comparison)

**Files:**

- Modify: `apps/web/vite.config.ts`
- Delete (temporarily): `apps/web/postcss.config.cjs`, `apps/web/src/stylex.css`

- [ ] **Step 1: Swap the integration**

```bash
cd apps/web && git stash push postcss.config.cjs src/stylex.css -m "postcss route" && bun add -d unplugin-stylex
```

Remove the `import "@/stylex.css"` line from `routes/index.tsx`. In `vite.config.ts`, remove the `babel` option from `viteReact(...)` (unplugin runs its own transform) and add:

```ts
import stylex from "unplugin-stylex/vite";
// in plugins, before viteReact():
stylex({
  dev: process.env.NODE_ENV !== "production",
  unstable_moduleResolution: { type: "commonJS", rootDir: monorepoRoot },
}),
```

Consult `node_modules/unplugin-stylex/README.md` for the exact option names of the installed version and adjust; log any difference.

- [ ] **Step 2: Repeat the checks from Tasks 1–3**

Dev render, production build, `wrangler:dev` SSR view-source, cross-package vars. Record each as pass/fail with the exact error text. Also record: does it need the `include` globs? Does HMR on `stylex-probe.tsx` update the CSS without a full reload?

- [ ] **Step 3: Restore the PostCSS route**

```bash
git checkout -- vite.config.ts src/routes/index.tsx && git stash pop && bun remove unplugin-stylex
```

- [ ] **Step 4: Commit the log only (no code change to commit)**

No commit needed; the comparison lives in the scratch log.

### Task 6: shadcn-cssinjs registry works outside Next.js

**Files:**

- Create (throwaway): `packages/web-ui-stylex-probe/`

- [ ] **Step 1: Install one component from the registry into a scratch package**

```bash
mkdir -p packages/web-ui-stylex-probe && cd packages/web-ui-stylex-probe
printf '{"name":"@interviews-tool/web-ui-stylex-probe","private":true,"type":"module"}\n' > package.json
bunx shadcn@latest add https://shadcn-cssinjs.com/r/stylex-tokens.json
bunx shadcn@latest add https://shadcn-cssinjs.com/r/button.json
```

The CLI may ask to create `components.json`; accept defaults, framework "vite" or "manual" if offered. Record every prompt and answer.

- [ ] **Step 2: Inspect what landed**

```bash
find . -type f -not -path './node_modules/*' | sort
sed -n '1,60p' "$(find . -name 'button.tsx' | head -1)"
```

Record: which files, the `style`-prop convention used, whether it imports `@base-ui/react` (expected) and which tokens file it expects. This tells Phase 2 how much re-theming each component needs.

- [ ] **Step 3: Compile it**

Copy the installed `button.tsx` into `apps/web/src/components/` (adjusting the tokens import to the installed `stylex-tokens` file, also copied) and render it once inside `StylexProbe`. `bun run dev` → renders and is styled. Log result. Then delete both copies from `apps/web/src`.

### Task 7: Write the findings and delete the spike

**Files:**

- Create: `docs/tailwind-to-stylex-migration/03-spike-findings.md`
- Modify: `docs/tailwind-to-stylex-migration/README.md`

- [ ] **Step 1: Switch to a docs branch from `main`**

```bash
git stash -u   # keep anything uncommitted on the spike, just in case
git checkout main && git checkout -b docs/stylex-spike-findings
```

- [ ] **Step 2: Write `03-spike-findings.md`**

Structure (fill every row from the scratch log — no "see log"):

```markdown
# Spike findings — StyleX under the `apps/web` build stack

**Date:** YYYY-MM-DD · **Branch:** `spike/stylex-under-web-build` (deleted) · **StyleX:** 0.19.0

## Decision
Route chosen: <PostCSS | unplugin-stylex>. One paragraph on why.

## Results matrix
| Check | PostCSS route | unplugin-stylex |
| --- | --- | --- |
| `vite dev` renders styled probe | pass/fail + note | … |
| `vite build` extracts CSS | pass/fail, CSS bytes | … |
| `wrangler dev` SSR HTML carries classes + stylesheet | … | … |
| Cross-package `defineVars` (one var set, theme overrides) | … | … |
| Vite transforms workspace package source | … | … |
| Vitest with `test: true` | … | n/a |
| Tailwind coexistence (`@stylex;` vs `@import "tailwindcss"`) | … | … |
| HMR on a style edit updates CSS without reload | … | … |
| Needs `include` globs reaching into `packages/*` | yes/no | yes/no |
| `@babel/preset-typescript` required | yes/no | … |

## Exact working configuration
(the `vite.config.ts`, `postcss.config.cjs` / plugin block, `vitest.config.ts` that worked — verbatim)

## shadcn-cssinjs registry
Files installed, prop convention, tokens expected, compiled under Vite: yes/no.

## Blockers for Phase 2
Bullet list, or "none".
```

- [ ] **Step 3: Index it**

In `README.md`'s table add: `| [`03-spike-findings.md`](./03-spike-findings.md) | Phase 0: which StyleX build route works under Vite + TanStack Start + Cloudflare SSR | Done |`

- [ ] **Step 4: Commit, PR, delete spike branch**

```bash
git add docs/tailwind-to-stylex-migration && git commit -m "docs: record StyleX build-integration spike findings

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push -u origin docs/stylex-spike-findings
gh pr create --title "docs: StyleX spike findings (phase 0)" --body "$(cat <<'EOF'
Durable output of the phase-0 spike for `apps/web-stylex`: which StyleX build route works under Vite + TanStack Start + Cloudflare SSR, the exact configuration, and blockers for phase 2.

Spec: docs/tailwind-to-stylex-migration/spec-web-stylex.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
git branch -D spike/stylex-under-web-build
git stash drop
```

If `gh` fails with "Could not resolve to a Repository": `gh auth switch --user csdev19` and retry.

---

## Phase 1 — Clone

Branch `feat/web-stylex-clone` from `main` **after** the Phase 0 PR merges (the findings are referenced by the tracker). Nothing in Phase 1 installs StyleX.

### Task 8: Copy `apps/web` to `apps/web-stylex`

**Files:**

- Create: `apps/web-stylex/**`
- Modify: `apps/web-stylex/package.json`, `vite.config.ts`, `vitest.config.ts`, `wrangler.jsonc`, `alchemy.run.ts`

- [ ] **Step 1: Copy, excluding generated and local files**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
git checkout main && git pull && git checkout -b feat/web-stylex-clone
rsync -a --exclude node_modules --exclude dist --exclude .wrangler --exclude .turbo \
  --exclude tsconfig.tsbuildinfo --exclude .alchemy --exclude '.env' \
  apps/web/ apps/web-stylex/
cp apps/web/.env apps/web-stylex/.env
git -C . rev-parse HEAD > /tmp/origin-commit.txt
```

`.env` is git-ignored and copied only for local dev; `.env.example` came with the rsync.

- [ ] **Step 2: `package.json`**

Edit `apps/web-stylex/package.json`:

- `"name": "web"` → `"name": "web-stylex"`
- delete the `alchemy:dev`, `deploy`, `destroy` script lines
- `"wrangler:dev": "wrangler dev --port 3001 --inspector-port 9230"` → `"wrangler dev --port 3002 --inspector-port 9232"`
- remove `"alchemy": "^0.81.2"` from `devDependencies`

Leave every other dependency identical to `apps/web` — this is the control group.

- [ ] **Step 3: Vite port and Vitest name**

`apps/web-stylex/vite.config.ts`: `port: 3001` → `port: 3002`.
`apps/web-stylex/vitest.config.ts`: `name: "web"` → `name: "web-stylex"`.

- [ ] **Step 4: Worker identity, no deploy target**

`apps/web-stylex/wrangler.jsonc`: `"name": "hiring-tool-web"` → `"hiring-tool-web-stylex"`; delete the whole `"routes": [...]` array. Keep `services` (the Vite plugin reads bindings at build).

Delete `apps/web-stylex/alchemy.run.ts` — the scripts that call it are gone, and the file would import a dependency that no longer exists in this package. Restoring deploy later means copying it back from `apps/web` (one file).

- [ ] **Step 5: Install and type-check**

```bash
bun install
bun run check-types --filter=web-stylex
```

Expected: lockfile gains a `web-stylex` workspace entry; type-check passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web-stylex bun.lock
git commit -m "feat(web-stylex): clone apps/web as the StyleX migration target

Verbatim copy of apps/web at $(cat /tmp/origin-commit.txt), still on Tailwind. Port 3002,
worker renamed, deploy scripts removed — only apps/web deploys.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 9: Wire the monorepo and the server

**Files:**

- Modify: `package.json` (root) scripts
- Modify: `apps/server/src/index.ts:12`
- Modify: `apps/server/.env.example:11`
- Modify: `apps/server/.env` (local, git-ignored)

- [ ] **Step 1: Root script**

In root `package.json` scripts, after `"dev:web": "turbo run dev -F web",` add:

```json
"dev:web-stylex": "turbo run dev -F web-stylex",
```

- [ ] **Step 2: Server CORS**

`apps/server/src/index.ts` line 12:

```ts
  origin: ["exp://", "mobile://", "exp://*", "http://localhost:3002"],
```

and update the comment above it to:

```ts
// CORS for mobile apps and for local clients that call the API directly.
// The deployed web Worker proxies via Service Bindings (same-origin, no CORS).
```

`apps/server/.env.example` line 11:

```
CORS_ORIGIN=http://localhost:3001,http://localhost:4200,http://localhost:3002
```

Apply the same to your local `apps/server/.env`.

- [ ] **Step 3: Run both apps and log in on :3002**

Terminal 1: `bun run dev:server`. Terminal 2: `bun run dev:web-stylex`.
Open `http://localhost:3002`, log in with an existing account, open `/hiring-processes` and one process detail. Expected: identical to `:3001`; no CORS errors in the network tab; the auth cookie is set for `localhost:3002`.

- [ ] **Step 4: Full verification**

```bash
bun run build --filter=web-stylex
bun run test --filter=web-stylex
bun run lint
```

Expected: build succeeds, 6 test files pass, lint clean.

- [ ] **Step 5: Commit**

```bash
git add package.json apps/server/src/index.ts apps/server/.env.example
git commit -m "feat: register web-stylex dev script and allow its origin in server CORS

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 10: Compare harness — config, routes, auth

**Files:**

- Modify: `apps/web-stylex/package.json`, `apps/web-stylex/.gitignore`
- Create: `apps/web-stylex/compare/playwright.config.ts`
- Create: `apps/web-stylex/compare/routes.ts`
- Create: `apps/web-stylex/compare/auth.setup.ts`

**Interfaces:**

- Produces: `ROUTES: RouteSpec[]`, `VIEWPORTS`, `THEMES`, `ORIGINS`, `resolveRoute(page, spec)` from `routes.ts`; storage states at `compare/.auth/{baseline,candidate}.json`.

- [ ] **Step 1: Dependencies and scripts**

```bash
cd apps/web-stylex
bun add -d @playwright/test pixelmatch pngjs @types/pixelmatch @types/pngjs
bunx playwright install chromium
```

`package.json` scripts, add:

```json
"compare": "playwright test -c compare/playwright.config.ts && bun run compare/report.ts",
"compare:update-auth": "playwright test -c compare/playwright.config.ts --project=auth"
```

`.gitignore`, append:

```
# visual-diff harness
/compare/output/
/compare/.auth/
```

- [ ] **Step 2: `compare/routes.ts`**

```ts
import type { Page } from "@playwright/test";

export const ORIGINS = {
  baseline: process.env.COMPARE_BASELINE ?? "http://localhost:3001",
  candidate: process.env.COMPARE_CANDIDATE ?? "http://localhost:3002",
} as const;

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
] as const;

export type RouteSpec = {
  name: string;
  /** Static path, or a resolver that derives the path from the app's data. */
  path: string | ((page: Page, origin: string) => Promise<string>);
  auth: boolean;
};

/* First process id, read from the list page. Both origins share a DB, so the
   id resolved on the baseline is valid on the candidate too. */
async function firstProcessPath(page: Page, origin: string): Promise<string> {
  await page.goto(`${origin}/hiring-processes`);
  const href = await page.locator('a[href^="/hiring-processes/"]').first().getAttribute("href");
  if (!href) throw new Error("compare: no hiring process found — seed one before running");
  return href.split("/edit")[0];
}

export const ROUTES: RouteSpec[] = [
  { name: "landing", path: "/", auth: false },
  { name: "login", path: "/auth/login", auth: false },
  { name: "signup", path: "/auth/signup", auth: false },
  { name: "processes", path: "/hiring-processes", auth: true },
  { name: "process-new", path: "/hiring-processes/new", auth: true },
  { name: "process-detail", path: firstProcessPath, auth: true },
  {
    name: "process-edit",
    path: async (page, origin) => `${await firstProcessPath(page, origin)}/edit`,
    auth: true,
  },
];

export async function resolveRoute(page: Page, spec: RouteSpec, origin: string): Promise<string> {
  return typeof spec.path === "string" ? spec.path : spec.path(page, origin);
}

/* The app stores the theme in a cookie read on the server (functions/theme.ts). */
export function themeCookie(origin: string, theme: Theme) {
  const url = new URL(origin);
  return { name: "tapuy:theme", value: theme, domain: url.hostname, path: "/" };
}
```

- [ ] **Step 3: `compare/auth.setup.ts`**

```ts
import { test as setup, expect } from "@playwright/test";
import { ORIGINS } from "./routes";

const email = process.env.COMPARE_EMAIL;
const password = process.env.COMPARE_PASSWORD;

for (const [key, origin] of Object.entries(ORIGINS)) {
  setup(`log in on ${key}`, async ({ page }) => {
    if (!email || !password) {
      throw new Error("compare: set COMPARE_EMAIL and COMPARE_PASSWORD to an existing account");
    }
    await page.goto(`${origin}/auth/login`);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(new RegExp(`^${origin}/hiring-processes`));
    await page.context().storageState({ path: `compare/.auth/${key}.json` });
  });
}
```

Check the actual label and button text in `apps/web-stylex/src/routes/auth/login.tsx` and adjust the regexes to match.

- [ ] **Step 4: `compare/playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  outputDir: "output/traces",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    headless: true,
    reducedMotion: "reduce",
    colorScheme: "dark",
  },
  projects: [
    { name: "auth", testMatch: /auth\.setup\.ts/ },
    { name: "compare", testMatch: /compare\.spec\.ts/, dependencies: ["auth"] },
  ],
});
```

- [ ] **Step 5: Run the auth project alone**

With both apps and the server running:

```bash
COMPARE_EMAIL=<you> COMPARE_PASSWORD=<pw> bun run compare:update-auth
```

Expected: two tests pass; `compare/.auth/baseline.json` and `candidate.json` exist.

- [ ] **Step 6: Commit**

```bash
git add apps/web-stylex/package.json apps/web-stylex/.gitignore apps/web-stylex/compare bun.lock
git commit -m "feat(web-stylex): add visual-diff harness scaffolding (routes, auth, config)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 11: Compare harness — screenshot, diff, report

**Files:**

- Create: `apps/web-stylex/compare/compare.spec.ts`
- Create: `apps/web-stylex/compare/report.ts`

**Interfaces:**

- Consumes: everything exported by `routes.ts`.
- Produces: `compare/output/summary.json` — `Array<{ id: string; diffPercent: number; width: number; height: number }>`; PNGs under `compare/output/{baseline,candidate,diff}/<id>.png`.

- [ ] **Step 1: `compare/compare.spec.ts`**

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { test, type Page } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { ORIGINS, ROUTES, THEMES, VIEWPORTS, resolveRoute, themeCookie, type Theme } from "./routes";

type Result = { id: string; diffPercent: number; width: number; height: number };
const results: Result[] = [];
const OUT = "compare/output";

for (const dir of ["baseline", "candidate", "diff"]) mkdirSync(`${OUT}/${dir}`, { recursive: true });

async function shoot(page: Page, origin: string, path: string, theme: Theme): Promise<Buffer> {
  await page.context().addCookies([themeCookie(origin, theme)]);
  await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
}

for (const route of ROUTES) {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const id = `${route.name}--${viewport.name}--${theme}`;

      test(id, async ({ browser }) => {
        const contexts = {
          baseline: await browser.newContext({
            viewport,
            storageState: route.auth ? "compare/.auth/baseline.json" : undefined,
          }),
          candidate: await browser.newContext({
            viewport,
            storageState: route.auth ? "compare/.auth/candidate.json" : undefined,
          }),
        };
        const pages = { baseline: await contexts.baseline.newPage(), candidate: await contexts.candidate.newPage() };

        const path = await resolveRoute(pages.baseline, route, ORIGINS.baseline);
        const a = PNG.sync.read(await shoot(pages.baseline, ORIGINS.baseline, path, theme));
        const b = PNG.sync.read(await shoot(pages.candidate, ORIGINS.candidate, path, theme));

        const width = Math.max(a.width, b.width);
        const height = Math.max(a.height, b.height);
        const pad = (png: PNG) => {
          if (png.width === width && png.height === height) return png;
          const out = new PNG({ width, height });
          PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
          return out;
        };
        const pa = pad(a);
        const pb = pad(b);
        const diff = new PNG({ width, height });
        const changed = pixelmatch(pa.data, pb.data, diff.data, width, height, { threshold: 0.1 });
        const diffPercent = (changed / (width * height)) * 100;

        writeFileSync(`${OUT}/baseline/${id}.png`, PNG.sync.write(pa));
        writeFileSync(`${OUT}/candidate/${id}.png`, PNG.sync.write(pb));
        writeFileSync(`${OUT}/diff/${id}.png`, PNG.sync.write(diff));
        results.push({ id, diffPercent, width, height });

        await contexts.baseline.close();
        await contexts.candidate.close();
      });
    }
  }
}

test.afterAll(() => {
  writeFileSync(`${OUT}/summary.json`, JSON.stringify(results, null, 2));
});
```

- [ ] **Step 2: `compare/report.ts`**

```ts
import { readFileSync } from "node:fs";

const THRESHOLD = 0.1;
type Result = { id: string; diffPercent: number; width: number; height: number };

const results: Result[] = JSON.parse(readFileSync("compare/output/summary.json", "utf8"));
const rows = results.map((r) => ({
  screenshot: r.id,
  size: `${r.width}×${r.height}`,
  "diff %": r.diffPercent.toFixed(3),
  status: r.diffPercent <= THRESHOLD ? "ok" : "ABOVE THRESHOLD",
}));
console.table(rows);

const failing = results.filter((r) => r.diffPercent > THRESHOLD);
console.log(`\n${results.length} screenshots · ${failing.length} above ${THRESHOLD}% · diffs in compare/output/diff/`);
process.exit(failing.length ? 1 : 0);
```

- [ ] **Step 3: Run the full harness**

```bash
COMPARE_EMAIL=<you> COMPARE_PASSWORD=<pw> bun run compare
```

Expected: 28 screenshots (7 routes × 2 viewports × 2 themes), every row `0.000` and `ok`, exit 0. If a row is non-zero, open `compare/output/diff/<id>.png`: the usual culprits are a relative timestamp ("2 minutes ago"), a blinking caret, or fonts not yet loaded. Fix by masking (`page.screenshot({ mask: [locator] })`) only when the difference is provably non-deterministic content — and note it in the spec file with a comment.

- [ ] **Step 4: Commit**

```bash
git add apps/web-stylex/compare
git commit -m "feat(web-stylex): screenshot both apps per route and report pixel diff

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 12: Sanity-check the harness catches a change

**Files:**

- Temporary edit only.

- [ ] **Step 1: Break something visible on the candidate**

In `apps/web-stylex/src/routes/index.tsx`, change one visible Tailwind class (e.g. add `bg-fuchsia` to the page root). Run `bun run compare`. Expected: `landing--*` rows are non-zero and the script exits 1.

- [ ] **Step 2: Revert and re-run**

```bash
git checkout -- apps/web-stylex/src/routes/index.tsx && bun run compare
```

Expected: all `0.000`, exit 0. Nothing to commit.

### Task 13: Baseline metrics

**Files:**

- Create: `docs/tailwind-to-stylex-migration/04-baseline-metrics.md`

- [ ] **Step 1: Measure both apps with the same commands**

Run each block for `APP=web` and `APP=web-stylex`; both numbers go in the doc (they should match — that is itself a check that the clone is faithful).

```bash
cd apps/$APP
# cold build
rm -rf dist node_modules/.vite .tanstack && /usr/bin/time -p bun run build 2>&1 | tail -3
# output sizes
find dist/client -name '*.css' -exec cat {} + | wc -c
find dist/client -name '*.css' -exec cat {} + | gzip -c | wc -c
find dist/client -name '*.js'  -exec cat {} + | wc -c
find dist/client -name '*.js'  -exec cat {} + | gzip -c | wc -c
# incremental build: touch one component, rebuild
touch src/components/hiring-process/process-board-card.tsx && /usr/bin/time -p bun run build 2>&1 | tail -3
# dev cold start: time from command to "ready in"
bun run dev 2>&1 | grep -m1 -E 'ready in'
```

HMR latency: with `bun run dev` running and the browser open on `/hiring-processes`, edit a class in `process-board-card.tsx`, save, and read the `[vite] hot updated` timestamp in the browser console relative to the save (repeat 3 times, record the median).

Duplicated tokens and `cn()` counts: re-run the two scripts from `01-baseline-analysis.md` §1 and §4 and paste the numbers (expected 52 and 83).

- [ ] **Step 2: Write the document**

```markdown
# Baseline metrics — before any StyleX

**Date:** YYYY-MM-DD · **Commit:** <sha> · **Machine:** <model, RAM> · **Node:** <version> · **Bun:** 1.3.4

Both apps measured with identical commands; `web-stylex` is a verbatim clone at this point, so the pairs must match.

| Metric | web | web-stylex | Command |
| --- | ---: | ---: | --- |
| CSS, raw | | | `find dist/client -name '*.css' -exec cat {} + \| wc -c` |
| CSS, gzip | | | … `\| gzip -c \| wc -c` |
| Client JS, raw | | | |
| Client JS, gzip | | | |
| Cold build (s) | | | `rm -rf dist node_modules/.vite .tanstack && time bun run build` |
| Incremental build (s) | | | `touch <component> && time bun run build` |
| Dev cold start (ms) | | | `bun run dev` → "ready in" |
| HMR latency, median of 3 (ms) | | | manual, see method |
| Duplicated token declarations across packages | 52 | — | `01-baseline-analysis.md` §1 |
| `cn()` call sites | 83 | 83 | `01-baseline-analysis.md` §4 |
| Runtime style-merge JS (tailwind-merge+clsx+cva), gzip | 8.4 KB | 8.4 KB | `02-plan-review.md` |

## Method notes
(anything that affected a number: caching, background processes, warm fonts…)
```

- [ ] **Step 3: Index, tracker seed, commit**

Create `docs/tailwind-to-stylex-migration/06-tracker.md`:

```markdown
# Migration tracker

**Clone origin:** `apps/web-stylex` was copied from `apps/web` at commit `<sha from Task 8>`.
Features added to `apps/web` after that commit are **not** in `web-stylex` unless listed here.

## Components (`packages/web-ui-stylex`) — filled in Phase 3
| Component | Hard selectors | Owner | PR | Status |
| --- | ---: | --- | --- | --- |
| label | 2 | | | todo |
| skeleton | 0 | | | todo |
| badge | 2 | | | todo |
| status-badge | 0 | | | todo |
| input | 0 | | | todo |
| textarea | 0 | | | todo |
| checkbox | 0 | | | todo |
| card | 7 | | | todo |
| alert | 10 | | | todo |
| table | 4 | | | todo |
| accordion | 7 | | | todo |
| button | 10 | | | todo |
| dialog | 0 | | | todo |
| alert-dialog | 6 | | | todo |
| sonner | 0 | | | todo |
| dropdown-menu | 30 | | | todo |
| select | 20 | | | todo |
| tapuy-mark | 0 | | | todo |
| markdown-content | plain CSS | | | todo |

## App files (`apps/web-stylex/src`) — filled in Phase 4
| Route group | Files | Owner | PR | Status |
| --- | --- | --- | --- | --- |
| landing | `routes/index.tsx` | | | todo |
| auth | `routes/auth/*` | | | todo |
| board/list | `routes/_authenticated/hiring-processes/index.tsx`, `components/hiring-process/*` | | | todo |
| detail | `routes/_authenticated/hiring-processes/$id.tsx`, `components/interaction/*` | | | todo |
| new/edit | `routes/_authenticated/hiring-processes/new.tsx`, `$id_.edit.tsx` | | | todo |
```

Add both rows to `README.md`'s table (`04-baseline-metrics.md` — Done; `06-tracker.md` — Living).

```bash
git add docs/tailwind-to-stylex-migration
git commit -m "docs: capture pre-StyleX baseline metrics and seed the migration tracker

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 14: PR

- [ ] **Step 1: Final verification from a clean state**

```bash
git status            # clean
bun run build         # whole monorepo, includes web-stylex via turbo
bun run test --filter=web-stylex
bun run lint && bunx oxfmt --check .
```

Expected: all green. `apps/web` diff against `main` is empty: `git diff main -- apps/web` prints nothing.

- [ ] **Step 2: Open the PR**

```bash
git push -u origin feat/web-stylex-clone
gh pr create --title "feat: add apps/web-stylex clone with visual-diff harness (phase 1)" --body "$(cat <<'EOF'
## Summary
- `apps/web-stylex`: verbatim copy of `apps/web` (still Tailwind), port 3002, not deployed
- Playwright visual-diff harness comparing :3001 vs :3002 on 7 routes × 2 viewports × 2 themes — currently 0.00 % everywhere
- Baseline metrics captured before any StyleX (`docs/tailwind-to-stylex-migration/04-baseline-metrics.md`)
- Only change outside the new app: `http://localhost:3002` in server CORS

Spec: `docs/tailwind-to-stylex-migration/spec-web-stylex.md` · Phase 0 findings: `03-spike-findings.md`

## Test plan
- [ ] `bun run build` green (CI)
- [ ] `bun run test --filter=web-stylex` green
- [ ] `bun run compare` → 28 screenshots at 0.000 %
- [ ] `git diff main -- apps/web` is empty

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

**Spec coverage (phases 0–1):** D1 name/port → T8; D2 full copy → T8; D9 build route by spike → T1–T5, T7; D10 harness → T10–T12; D11 metrics before StyleX → T13 (ordered before any Phase 2 work, and Phase 1 installs no StyleX); §6 CORS → T9; §7 routes/viewports/themes/threshold/reduced-motion → T10–T11; §9 Phase 0 deliverables incl. shadcn-cssinjs registry check → T6; Phase 1 deploy-stripping and worker rename → T8; tracker origin commit (§11 risk) → T13. D3–D8, D12 are Phase 2+ and intentionally absent.

**Placeholders:** the `<you>`/`<pw>`/`<sha>`/`YYYY-MM-DD` tokens are runtime values the executor fills from their environment, not design gaps. The findings and metrics documents have their full structure given; every row is to be filled from measurements, never left blank.

**Type consistency:** `ORIGINS`, `ROUTES`, `THEMES`, `VIEWPORTS`, `resolveRoute`, `themeCookie`, `Theme` are defined in T10 `routes.ts` and consumed by T10 `auth.setup.ts` and T11 `compare.spec.ts` with the same names and signatures; `summary.json` shape `{ id, diffPercent, width, height }` matches between `compare.spec.ts` and `report.ts`.
