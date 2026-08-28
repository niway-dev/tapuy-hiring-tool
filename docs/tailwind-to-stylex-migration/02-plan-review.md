# Plan review — gaps found and the revised phase plan

**Date:** 2026-08-28
**Status:** analysis; supersedes the phase plan sketched in chat before it
**Inputs:** `01-baseline-analysis.md`, the repo as of this commit, StyleX 0.19.0
package contents, and the external checks listed at the end.

This document does three things: corrects two claims made earlier, fills the gaps
the first plan left open, and lays out the phase plan the spec will be written from.

---

## 1. Corrections to earlier claims

### 1.1 "angular-web will import `defineVars` and delete its 52 duplicated tokens" — wrong

`stylex.defineVars` only works through the StyleX Babel plugin. `apps/angular-web`
builds with the Angular CLI, which has no StyleX integration. Angular **cannot**
consume a `.stylex.ts` file.

What Angular _can_ consume is plain CSS. So the monorepo win for tokens is not
"everyone imports `defineVars`"; it is **one source of truth that emits both
shapes**:

```
packages/design-tokens/
  src/tokens.ts          raw values, plain TS object, no StyleX import
  src/tokens.stylex.ts   defineVars(raw) + createTheme(light)   → StyleX consumers
  dist/tokens.css        generated :root{} + [data-theme=light]{} → CSS consumers
  scripts/emit-css.ts    ~40 lines
```

Consumers: `apps/web-stylex` (StyleX), `packages/web-ui` and `apps/angular-web`
(CSS, later and optional — see §5). This is a stronger monorepo story than the one
claimed before, and it is what actually removes the duplication.

### 1.2 "Keep tokens in CSS strings until the end to avoid drift" — unnecessary

The codegen above costs ~40 lines and removes drift entirely, so the trade-off that
motivated the CSS-string bridge no longer exists. **`packages/design-tokens` is
created in Phase 2, not at the end.** StyleX code uses typed tokens from day one.

---

## 2. Gaps found

### 2.1 Selectors StyleX does not support — measured surface

`stylex.create` supports pseudo-classes, pseudo-elements and `@media`. It does
**not** support arbitrary attribute selectors on the element itself or descendant
combinators. This repo uses both, heavily:

```bash
# over apps/web/src/**/*.tsx + packages/web-ui/src/**/*.tsx
```

| Tailwind construct                     |  Count | StyleX translation                                                                                                                                                                                                          |
| -------------------------------------- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-[state=open]:…` (self attribute) | **69** | Conditional style in JS. Base UI exposes component state via render/`className`-as-function props; use it. For ancestor state, `stylex.when.ancestor('[data-state="open"]')` — attribute selectors **are** supported there. |
| `[&_svg]:…` (descendant)               | **39** | The descendant applies its own style. Icons are lucide components that accept `style`; the parent passes an `iconStyle`, or the icon uses `stylex.when.ancestor(...)`.                                                      |
| `aria-*:`                              |     14 | Same as `data-[…]`: JS conditional.                                                                                                                                                                                         |
| `group-*/peer-*`                       |      3 | `stylex.when.ancestor` / `when.siblingBefore` + `stylex.defaultMarker()` on the observed element.                                                                                                                           |
| `animate-*` (tw-animate-css)           |     19 | `stylex.keyframes` + explicit `animationName`.                                                                                                                                                                              |
| `sm:/md:/lg:`                          |     47 | `@media` conditions — supported directly.                                                                                                                                                                                   |
| `hover:/focus:/disabled:`              |    114 | Pseudo-classes — supported directly.                                                                                                                                                                                        |
| `dark:`                                |      5 | Disappears: tokens flip per theme via `createTheme`.                                                                                                                                                                        |

`stylex.when.*` (`ancestor`, `descendant`, `anySibling`, `siblingBefore`,
`siblingAfter`) and `defaultMarker`/`defineMarker` are **present in
`@stylexjs/stylex@0.19.0`** — verified by inspecting the package's `.d.ts` files.

Where the hard cases live (`data-[…]` + `[&…]` per file):

| File                                               |  Count |
| -------------------------------------------------- | -----: |
| `packages/web-ui/src/components/dropdown-menu.tsx` |     30 |
| `packages/web-ui/src/components/select.tsx`        |     20 |
| `packages/web-ui/src/components/button.tsx`        |     10 |
| `packages/web-ui/src/components/alert.tsx`         |     10 |
| `card.tsx`, `accordion.tsx`                        | 7 each |
| `alert-dialog.tsx`, `apps/web/.../live-note.tsx`   | 6 each |

**Consequence:** 60% of the hard selector work is in four files, all in `web-ui`.
`dropdown-menu` and `select` are the two components to port **last**, after the
conventions have been proven on simpler ones.

### 2.2 Component API changes shape at the package boundary

shadcn components take `className?: string` and merge it with `cn()`. The StyleX
convention is `style?: StyleXStyles` merged with `stylex.props(styles.base, style)`.
These are incompatible: a caller passing a Tailwind string to a StyleX component
does nothing.

**Consequence for the strangler:** a component cannot be flipped in isolation.
**The unit of work is "one component + every call site that passes it a
`className`"**, in one PR. Mixed files (a StyleX `Button` next to Tailwind divs)
are fine, because both compile in the same file during coexistence.

Only **4 `cva()`** definitions exist, so the variant machinery to reproduce is
small: a `variants` object of `stylex.create` namespaces selected by key.

### 2.3 Build integration — two viable routes, both need the spike

Verified facts (npm, 2026-08-28):

- `@stylexjs/postcss-plugin` **0.19.0** — in lockstep with the core. Peer-depends
  on `@stylexjs/babel-plugin@0.19.0`. The Babel plugin **must also** be registered
  in the JS pipeline (for Vite: `@vitejs/plugin-react`'s `babel.plugins`). It
  takes `include` globs and uses a `@stylex;` directive in a CSS file.
- `unplugin-stylex` **0.6.3** — community (29 stars, 10 open issues, pushed
  2026-08-25). Module-graph based, no globs. Peer `@stylexjs/stylex: 0.x`.
- `vite-plugin-stylex` — **abandoned** (last publish 2024-11).
- `@stylexjs/{webpack,esbuild,nextjs}-plugin` are frozen at 0.11.1 — StyleX has
  consolidated on Babel + PostCSS + Rollup. Not a concern for us.

An honest note: the PostCSS route **reintroduces `include` globs that reach into
`packages/*`** — the same shape as Tailwind's `@source`. The evaluation document's
"no consumer configuration" claim holds for the Babel/rollup path, not for the
PostCSS path. Report this as-is in the results.

Required Babel option for cross-package tokens:
`unstable_moduleResolution: { type: "commonJS", rootDir: <monorepo root> }` —
the same `rootDir` in every workspace, or variable hashes will not match across
packages.

`defineVars` must live in a file named `*.stylex.ts`.

**Unverified until the spike:** SSR under `@cloudflare/vite-plugin`; whether
`@tailwindcss/vite` and the StyleX PostCSS plugin coexist in the same CSS pipeline
(shadcn-cssinjs documents "StyleX PostCSS must run before Tailwind"); whether Vite
applies the Babel plugin to workspace packages resolved through the `development`
export condition; TanStack Start's route plugin vs the StyleX Babel plugin.

### 2.4 Tests need the Babel plugin too

`apps/web/vitest.config.ts` is deliberately separate from `vite.config.ts` (the
Cloudflare/Start plugins cannot run in jsdom). It uses `@vitejs/plugin-react` with
no Babel options today. Without the StyleX Babel plugin, any test importing a
StyleX component throws `stylex.create should never be called`.

Fix: register the Babel plugin in `vitest.config.ts` as well, with `test: true`.
Two existing tests assert on class names
(`process-board-card.test.tsx`, `hiring-process-table.test.tsx`, 3 assertions);
they will need adjusting when those components flip.

### 2.5 Theme application has to change shape

Today: the server reads a cookie (`functions/theme.ts`), `__root.tsx` renders
`<html data-theme={theme}>`, and Tailwind's `dark` variant keys off it. No flash.

StyleX themes are **classes** produced by `createTheme`, applied with
`stylex.props(lightTheme)`. Plan: `__root.tsx` keeps `data-theme` (CSS consumers)
**and** spreads the StyleX theme class onto `<html>` (StyleX consumers). Both come
from the same server-read value, so the no-flash property is preserved. The client
toggle in `__root.tsx:123-126` updates both.

### 2.6 shadcn-cssinjs is the same stack as this repo — use it as the seed

`shadcn-labs/shadcn-cssinjs` is shadcn/ui on **StyleX + Base UI**, installed
through the standard shadcn CLI (`shadcn add https://shadcn-cssinjs.com/r/<name>.json`).
This repo already uses `@base-ui/react` 1.0 and `shadcn` 3.6. Measured health
(GitHub API, 2026-08-28):

|                       |                                                                    |
| --------------------- | ------------------------------------------------------------------ |
| Stars                 | 96                                                                 |
| Created               | 2026-06-11 (11 weeks old)                                          |
| Pushed                | 2026-08-28 (today)                                                 |
| Commits, last 30 days | 9                                                                  |
| Open issues           | 6                                                                  |
| License               | MIT                                                                |
| Documented build      | Next.js + Babel only; "vite" appears in the repo but no Vite guide |

**Recommendation:** use it as the **starting point** for each component in
`packages/web-ui-stylex` — install into the package, then re-theme on Tapuy tokens
and match the current `web-ui` API. It is copy-paste, so its youth is a bounded
risk: once installed, the code is ours. Do **not** depend on it at runtime. The
spike should install one component (`button`) to confirm the registry works
outside Next.js.

### 2.7 Deploy and CI surface of the clone

- `.github/workflows/deploy-production.yml` deploys with `working-directory:
apps/web` — the clone is **not** deployed by construction. Keep it that way.
- `.github/workflows/pr-validation.yml` runs root `bun run build` — the clone
  **enters CI automatically** through Turbo's `apps/*` glob. Good: every phase gate
  is enforced by CI for free.
- Strip `deploy`, `destroy`, `alchemy:dev` scripts from the clone's `package.json`
  and rename the worker in `wrangler.jsonc` (the Cloudflare Vite plugin needs the
  file to exist). Keep `alchemy.run.ts` unwired — restoring deploy is a one-line
  change if v2 becomes official.
- Server: `CORS_ORIGIN` env array + `corsConfig` in `apps/server/src/index.ts`
  gain `http://localhost:3002`. This is the only backend change in the whole plan.

### 2.8 There is no way to prove "nothing broke" — build one

"Everything keeps working" was the user's hard requirement, and nothing in the
first plan could demonstrate it. Add a **visual-diff harness** in Phase 1, while
the two apps are pixel-identical:

- Playwright, one spec per route, same seeded account, both themes
- screenshots of `:3001` (web) are the baseline, `:3002` (web-stylex) the candidate
- `bun run compare` → per-route diff percentage
- run at the end of every porting PR; a diff above a small threshold blocks the
  merge unless the PR says why

This is also the artefact that makes the public write-up credible.

### 2.9 Global CSS that StyleX will not own

Keep a small `global.css` in `web-stylex` for what StyleX is not for: font
`@import`, `::selection`, `::placeholder`, the global `:focus-visible` ring,
`color-scheme`, and `markdown-content.css` (rendered markdown needs descendant
selectors by nature). This is expected, not a failure of the migration.

### 2.10 Lint

The repo uses oxlint. `@stylexjs/eslint-plugin` needs ESLint. Skip it; the Babel
plugin already fails the build on invalid styles.

---

## 3. Revised phase plan

Each phase ends in a gate that CI and the compare harness enforce. Nothing in
`apps/web` changes in any phase.

| Phase                     | Deliverable                                                                                                                                                                                                                                 | Gate                                                                         | Parallel?             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------- |
| **0 · Spike** (throwaway) | StyleX compiling under `apps/web`'s exact plugin stack: PostCSS route and `unplugin-stylex` route; SSR on Cloudflare; vitest; cross-package `defineVars`; one shadcn-cssinjs component installed; Tailwind coexistence                      | `03-spike-findings.md` picks the route and lists blockers                    | No                    |
| **1 · Clone**             | `apps/web-stylex` — exact copy, still Tailwind, port 3002, CORS, deploy scripts stripped; baseline metrics captured; compare harness                                                                                                        | CI green; `compare` reports 0% diff on every route; `04-baseline-metrics.md` | No                    |
| **2 · Foundations**       | StyleX installed in `web-stylex`; `packages/design-tokens` (raw → `defineVars` + emitted CSS); empty `packages/web-ui-stylex` that builds; theme class on `<html>`; `05-porting-conventions.md`; `06-tracker.md`                            | CI green; 0% diff (no component ported yet)                                  | No                    |
| **3 · Primitives**        | `web-ui-stylex` components, bottom-up: `label, skeleton, badge, status-badge, input, textarea, checkbox, card, alert, table, accordion, button, dialog, alert-dialog, sonner, dropdown-menu, select` — each PR = component + its call sites | per PR: CI green, diff ≤ threshold, tracker updated                          | **Yes**, by component |
| **4 · App files**         | Remaining `className` in `apps/web-stylex/src` (routes + feature components), by route                                                                                                                                                      | per PR: same                                                                 | **Yes**, by route     |
| **5 · Removal**           | Tailwind, `web-ui`, `tw-animate-css`, `tailwind-merge`, `clsx`, `cva` out of `web-stylex`; globals in `global.css`; re-measure                                                                                                              | `07-results.md` with before/after on the same metrics                        | No                    |
| **5b · Optional**         | `web-ui` and `angular-web` import `design-tokens/tokens.css`; duplicated tokens → 0                                                                                                                                                         | Touches v1 — separate decision                                               | —                     |

Why bottom-up in Phase 3: `button` is consumed by nearly everything, and
`dropdown-menu`/`select` carry 50 of the hard selectors — they go last, once the
conventions have survived the simple components.

### Baseline metrics captured in Phase 1 (before any StyleX)

- CSS output, raw and gzip, per app
- JS bundle, raw and gzip
- `bun run build` cold and incremental
- dev server cold start; HMR latency on one component edit
- token declarations duplicated across packages (today: 52)
- `cn()` call sites (today: 83) — tracked as its own category, because these are
  the runtime-merge sites where StyleX should genuinely win rather than tie

---

## 4. Documents this folder will contain

| File                        | Phase                                                               |
| --------------------------- | ------------------------------------------------------------------- |
| `01-baseline-analysis.md`   | done                                                                |
| `02-plan-review.md`         | this file                                                           |
| `03-spike-findings.md`      | 0                                                                   |
| `04-baseline-metrics.md`    | 1                                                                   |
| `05-porting-conventions.md` | 2 — the Tailwind→StyleX translation table every contributor follows |
| `06-tracker.md`             | 2 — per-file / per-component checklist with owner and PR            |
| `07-results.md`             | 5                                                                   |
| `spec-web-stylex.md`        | written next, from this review                                      |

---

## 5. Decisions the spec will take as settled

1. App name `apps/web-stylex`, port 3002. Only `apps/web` deploys.
2. Full copy, shared nothing at the app layer; backend untouched except CORS.
3. `packages/design-tokens` from Phase 2, with CSS codegen.
4. `packages/web-ui-stylex` seeded from shadcn-cssinjs, re-themed, API-matched.
5. Component prop is `style?: StyleXStyles`; `className` is removed from ported
   components.
6. Compare harness is a merge gate from Phase 1 on.
7. Build route chosen by the spike, not by preference.

## External checks used

- `npm view` for every `@stylexjs/*` package and the community Vite plugins
- `@stylexjs/stylex@0.19.0` installed and its `.d.ts` grepped for the API surface
- GitHub API for `shadcn-labs/shadcn-cssinjs` and `eryue0220/unplugin-stylex`
- stylexjs.com: defining styles, using styles, `stylex.when` reference
- `@stylexjs/postcss-plugin` README (facebook/stylex main)
- shadcn-cssinjs.com installation page
