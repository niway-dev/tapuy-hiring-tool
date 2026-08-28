# Spec — `apps/web-stylex`: a StyleX twin of `apps/web`

**Date:** 2026-08-28
**Status:** approved design, pending implementation plans
**Builds on:** `01-baseline-analysis.md`, `02-plan-review.md`

---

## 1. Goal

Run two web clients of the same product side by side inside this monorepo:

- `apps/web` — the current app: React 19, TanStack Start, Tailwind 4, shadcn on
  Base UI. **Unchanged, and the only one deployed.**
- `apps/web-stylex` — an exact functional copy whose styling layer is migrated,
  incrementally, from Tailwind to StyleX.

The migration follows a strangler pattern: at every commit both apps work, every
route renders, and a visual-diff harness reports how far `web-stylex` has drifted
from `web`. The deliverable is not only the app; it is the **evidence** — measured
before/after numbers on the same routes — that makes the comparison public-worthy.

If StyleX wins, `web-stylex` becomes the official app. It must therefore stay
complete: no feature is dropped or mocked.

### Non-goals

- Changing anything in `apps/web`, `apps/server`, or any package `apps/web` uses,
  except the CORS allow-list (§6).
- Sharing app-layer code between the two apps. Duplication is deliberate.
- Publishing `web-ui-stylex` to third parties (StyleX cannot ship a library that
  works without the consumer adopting StyleX — see the evaluation document).
- Deploying `web-stylex`. Restoring deploy is a one-line change if it is promoted.
- Migrating `apps/angular-web` or `apps/mobile`.

---

## 2. Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                   | Why                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | App is `apps/web-stylex`, dev port **3002**, package name `web-stylex`                                                                                                                                                                                                                                                                     | Names the variable under test; `web`/`web-stylex` read side by side                                                                                                                                                                                 |
| D2  | Full copy of `apps/web/src`, `serverFns`, hooks, auth, env — nothing shared                                                                                                                                                                                                                                                                | Isolates the styling variable; keeps v2 promotable                                                                                                                                                                                                  |
| D3  | Design tokens live in **`packages/design-tokens`** as a raw TS object that emits both `defineVars` (StyleX) and a generated `tokens.css` (CSS consumers)                                                                                                                                                                                   | One source of truth; Angular cannot consume `defineVars` (no Babel) but can consume CSS                                                                                                                                                             |
| D4  | Ported components live in **`packages/web-ui-stylex`**, seeded from `shadcn-labs/shadcn-cssinjs` (StyleX + Base UI, same stack), re-themed on Tapuy tokens, API-matched to `web-ui`                                                                                                                                                        | Same primitives library as today; copy-paste model bounds the risk of a 3-month-old project                                                                                                                                                         |
| D5  | Ported components take **`style?: StyleXStyles`** and drop `className`                                                                                                                                                                                                                                                                     | StyleX convention; a Tailwind string passed to a StyleX component is a silent no-op, so the API break must be visible                                                                                                                               |
| D6  | Unit of porting work is **one component + every call site that styles it**, in one PR                                                                                                                                                                                                                                                      | Follows from D5; mixed Tailwind/StyleX inside one file is fine during coexistence                                                                                                                                                                   |
| D7  | `stylex.when.*` is allowed only where state genuinely lives on another element (3 sites today). Everything else is a JS conditional from Base UI state or an explicit style on the child                                                                                                                                                   | Keeps styles local and typed; avoids selector magic                                                                                                                                                                                                 |
| D8  | Plain CSS stays for: font `@import`, `::selection`, `::placeholder`, global `:focus-visible` ring, `color-scheme`, `markdown-content.css`                                                                                                                                                                                                  | These need global or descendant selectors by nature                                                                                                                                                                                                 |
| D9  | Build route is the official **`@stylexjs/postcss-plugin` + `@stylexjs/babel-plugin`** pair, the Babel plugin registered in both `@vitejs/plugin-react`'s `babel.plugins` and `postcss.config.cjs`. Chosen by the Phase 0 spike — see [`03-spike-findings.md`](./03-spike-findings.md) for the matrix, the verbatim config, and the caveats | Only route that gets the CSS onto the page here: `unplugin-stylex` injects CSS solely via `transformIndexHtml`, and TanStack Start builds no `index.html`. Costs: an `include` glob reaching into `packages/*`, and two undocumented Babel packages |
| D10 | A Playwright visual-diff harness (`web` = baseline, `web-stylex` = candidate) is a merge gate from Phase 1 on                                                                                                                                                                                                                              | The only way to demonstrate "nothing broke"                                                                                                                                                                                                         |
| D11 | Baseline metrics are captured in Phase 1, before StyleX is installed                                                                                                                                                                                                                                                                       | Otherwise the comparison is lost                                                                                                                                                                                                                    |
| D12 | Theme keeps `<html data-theme>` (CSS consumers) and adds the StyleX theme class from `createTheme` on the same element, both from the server-read cookie                                                                                                                                                                                   | Preserves the no-flash SSR property                                                                                                                                                                                                                 |
| D13 | No `@stylexjs/eslint-plugin` (repo uses oxlint); the Babel plugin already fails the build on invalid styles                                                                                                                                                                                                                                | —                                                                                                                                                                                                                                                   |

---

## 3. Structure

```
apps/
  web/                         unchanged
  web-stylex/                  copy of web + StyleX (this spec)
    src/
      global.css               D8 globals; imports design-tokens/tokens.css until Phase 5
      stylex.css               "@stylex;" directive (PostCSS route, per D9); imported from the root route
      ...                      identical tree to apps/web/src
    compare/                   Playwright visual-diff harness (D10)
      routes.ts                list of routes + auth fixture
      compare.spec.ts
    vite.config.ts             web's plugins + StyleX; port 3002
    vitest.config.ts           web's + StyleX Babel plugin (test: true)
    wrangler.jsonc             worker renamed; deploy scripts removed
packages/
  design-tokens/               D3
    src/tokens.ts              raw values (dark + light), no StyleX import
    src/tokens.stylex.ts       defineVars(dark) + createTheme(light)
    src/fonts.ts               font stacks (plain strings)
    scripts/emit-css.ts        writes dist/tokens.css (:root + [data-theme="light"])
    dist/tokens.css            build output, git-ignored; emitted by the package build
  web-ui-stylex/               D4
    src/components/*.tsx       one file per ported component, same names as web-ui
    src/index.ts               barrel, same export names as web-ui
    src/lib/variants.ts        tiny helper for cva-style variant maps
  web-ui/                      unchanged
```

`design-tokens` has **no React and no DOM**. `web-ui-stylex` depends on
`design-tokens`, `@stylexjs/stylex`, `@base-ui/react`, `lucide-react`, React.

### Import rules added to `CLAUDE.md`

- `design-tokens` imports nothing from the workspace.
- `web-ui-stylex` imports only `design-tokens` and `ui-markdown`.
- `web-stylex` may import `web-ui` **and** `web-ui-stylex` during Phases 2–4;
  Phase 5 removes `web-ui`.

---

## 4. Tokens (`packages/design-tokens`)

Source of truth is `packages/web-ui/src/styles.css` as it exists today. The raw
object mirrors its groups exactly — neons, neutrals, danger, 9 status colours ×
bg/text/border, focus ring, radii, fonts — with the same names minus the `--`
prefix, in camelCase.

```ts
// tokens.ts (excerpt)
export const dark = {
  mint: "#00ffc2", mintHover: "#33ffd0", mintOn: "#04261d",
  bg: "#0a0f14", surface: "#0f161d", surface2: "#141c25",
  text: "#e6ebf0", textSecondary: "#a7b1bc", textMuted: "#6b7785",
  border: "#1c232b", borderStrong: "#2a3440",
  stOngoingBg: "#0e1f38", stOngoingText: "#8fc1f5", stOngoingBorder: "#1f4b82",
  // ...
} as const;
export const light: typeof dark = { /* same keys */ };
```

```ts
// tokens.stylex.ts
export const colors = stylex.defineVars(dark);
export const lightTheme = stylex.createTheme(colors, light);
```

`emit-css.ts` writes `:root { --mint: … }` and `[data-theme="light"] { … }` from
the same two objects. The shadcn semantic aliases (`--primary`, `--card`, …) are
emitted too, so `web-ui/styles.css` can later replace its `:root` block with one
`@import` (Phase 5b, optional, touches v1 — separate decision).

Rule: **a token name that exists in `styles.css` and not in `tokens.ts` is a
Phase 2 bug.** The emitted CSS is diffed against the current `:root` block as the
Phase 2 gate.

---

## 5. Porting conventions (summary — full table in `05-porting-conventions.md`)

| Tailwind                                            | StyleX                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `className="p-4 rounded-xl bg-surface"`             | `stylex.create({ card: { padding: 16, borderRadius: 12, backgroundColor: colors.surface } })`                            |
| `cn(base, className)`                               | `stylex.props(styles.base, style)` — caller's `style` last                                                               |
| `cva(base, { variants })`                           | `const variants = stylex.create({ default: {...}, destructive: {...} })`; `stylex.props(styles.base, variants[variant])` |
| `hover:` `focus-visible:` `disabled:`               | `{ color: { default: a, ":hover": b } }`                                                                                 |
| `md:`                                               | `{ padding: { default: 8, "@media (min-width: 768px)": 16 } }`                                                           |
| `dark:`                                             | disappears — token flips via `lightTheme`                                                                                |
| `data-[state=open]:` `aria-expanded:`               | Base UI state → `stylex.props(s.x, state.open && s.open)`                                                                |
| `data-[variant=x]:` `data-[icon=…]:` (shadcn's own) | a real prop → variant map                                                                                                |
| `[&_svg]:size-4`                                    | icon styles itself: `<Icon {...stylex.props(icon.sm)} />`; `web-ui-stylex` exports `icon`                                |
| `group-hover:` `peer-disabled:`                     | `stylex.when.ancestor(":hover")` / `when.siblingBefore(":disabled")` + `defaultMarker()` — the only sanctioned uses      |
| `animate-in fade-in slide-in-from-top-2`            | `stylex.keyframes` + `animationName`, side chosen in JS from Base UI `side`                                              |
| `.mono` / `.display` utilities                      | exported styles `typography.mono`, `typography.display` from `design-tokens`                                             |

Numeric shorthands: StyleX prefers longhands (`paddingTop`, …) — a shorthand and a
longhand in the same object is a lint error. The conventions doc lists the
Tailwind spacing scale → px table.

---

## 6. The one backend change

`apps/server/src/index.ts` `corsConfig.origin` and the `CORS_ORIGIN` env array
(consumed by `apps/server/src/lib/auth.ts` `trustedOrigins`) gain
`http://localhost:3002`. Nothing else in `apps/server` or `packages/*` that `web`
uses is touched.

---

## 7. Visual-diff harness (D10)

- Playwright in `apps/web-stylex/compare/`, driven by `bun run compare` at the
  app root.
- Routes: `/`, `/auth/login`, `/auth/signup`, `/hiring-processes`,
  `/hiring-processes/new`, `/hiring-processes/:id`, `/hiring-processes/:id/edit`,
  each in `dark` and `light`, at 1280×800 and 390×844.
- Same seeded account on both apps (both hit the same DB; auth cookie is set per
  origin by logging in once per app in a fixture).
- Baseline = `:3001`, candidate = `:3002`. Output: per-screenshot diff %, summary
  table, and diff images under `compare/output/` (git-ignored).
- Threshold: **0.1%** per screenshot. A PR above threshold must state the reason
  in its description (e.g. intentional sub-pixel change from a keyframe port).
- Runs locally before merge. CI integration is optional and out of scope for the
  first plan; the harness must at least run green on a laptop.

Animated states (dialog open, dropdown open) are captured with animations disabled
(`page.emulateMedia({ reducedMotion: "reduce" })`) so timing does not create
false diffs.

---

## 8. Metrics (D11)

Captured in `04-baseline-metrics.md` before Phase 2, and again in `07-results.md`
after Phase 5, with the exact commands:

| Metric                                        | How                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| CSS output, raw + gzip                        | `bun run build` → sum of `dist/**/*.css`                                    |
| JS output, raw + gzip, client                 | same, `dist/client/**/*.js`                                                 |
| Cold build time                               | `time bun run build` after `rm -rf dist node_modules/.vite`                 |
| Incremental build                             | edit one component, `time bun run build`                                    |
| Dev cold start                                | `vite dev` to "ready"                                                       |
| HMR latency                                   | timestamp on save → console `[vite] hot updated`                            |
| Duplicated token declarations across packages | script from `01-baseline-analysis.md` §1 (today: 52)                        |
| Runtime style-merge sites                     | `cn(` calls (today: 83) vs `stylex.props(` with a caller `style`            |
| Runtime style JS                              | `tailwind-merge`+`clsx`+`cva` = 8.4 KB gzip today vs StyleX runtime 0.97 KB |

Expected honest headline, stated up front so the write-up cannot be accused of
moving the goalposts: _"−7 KB JS, CSS similar or slightly smaller, HMR somewhat
slower, tokens type-checked and duplication gone."_ Report whatever the numbers
say.

---

## 9. Phases and gates

| Phase                            | Deliverable                                                                                                                                                                                                                                                                                     | Gate                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **0 · Spike** (throwaway branch) | StyleX compiling under `web`'s exact plugin stack (TanStack Start + Cloudflare SSR + `@tailwindcss/vite`), PostCSS route and `unplugin-stylex` route; `defineVars` across a workspace package; vitest; one shadcn-cssinjs component installed from the registry                                 | `03-spike-findings.md` names the route, config, and blockers         |
| **1 · Clone**                    | `apps/web-stylex` verbatim (still Tailwind), port 3002, CORS, deploy scripts stripped, worker renamed; compare harness; baseline metrics                                                                                                                                                        | CI green; `compare` = 0.00% on every route; `04-baseline-metrics.md` |
| **2 · Foundations**              | StyleX wired per spike; `packages/design-tokens` + emitted CSS diffed against `styles.css`; empty `packages/web-ui-stylex` that builds; theme class on `<html>`; `05-porting-conventions.md`; `06-tracker.md`                                                                                   | CI green; compare = 0.00%                                            |
| **3 · Primitives**               | `web-ui-stylex` bottom-up, one PR each, with call sites: `label → skeleton → badge → status-badge → input → textarea → checkbox → card → alert → table → accordion → button → dialog → alert-dialog → sonner → dropdown-menu → select`; `tapuy-mark`, `markdown-content` last (SVG + plain CSS) | per PR: CI green, compare ≤ 0.1%, tracker row done                   |
| **4 · App files**                | remaining `className` in `apps/web-stylex/src`, one PR per route group: landing, auth, board/list, detail, new/edit                                                                                                                                                                             | same                                                                 |
| **5 · Removal**                  | remove `tailwindcss`, `@tailwindcss/vite`, `web-ui`, `tw-animate-css`, `tailwind-merge`, `clsx`, `class-variance-authority`, `shadcn` from `web-stylex`; globals in `global.css`; re-measure                                                                                                    | `07-results.md`; compare ≤ 0.1%                                      |
| **5b · Optional**                | `web-ui/styles.css` and `angular-web/styles.css` import `design-tokens/tokens.css`                                                                                                                                                                                                              | separate approval — touches v1                                       |

Phases 3 and 4 are parallelisable across contributors by component / route; the
tracker assigns ownership. `button` sits mid-list on purpose: it is consumed
everywhere, so it goes after the conventions have survived the simple components
but before the composites that embed it. `dropdown-menu` and `select` carry 50 of
the hard selectors and go last.

---

## 10. Testing

- **Existing unit tests** are copied with the app and must stay green. The two
  that assert on Tailwind class names (`process-board-card.test.tsx`,
  `hiring-process-table.test.tsx`) are rewritten to assert on behaviour or on
  `data-*`/roles when their components flip.
- **`design-tokens`**: a test that `emit-css` output contains every custom
  property name present in `web-ui/styles.css` `:root` and `[data-theme="light"]`
  blocks (Phase 2 gate, automated).
- **`web-ui-stylex`**: one render test per component (renders, variants apply,
  `style` prop merges last). No snapshot tests of class strings — StyleX class
  names are hashed.
- **Visual**: the compare harness (§7) is the integration test.

---

## 11. Risks

| Risk                                                                          | Mitigation                                                                                      |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| StyleX cannot compile under Cloudflare SSR / TanStack Start                   | Phase 0 exists for this. If both routes fail, stop and re-plan; nothing else has been built yet |
| `@tailwindcss/vite` and the StyleX PostCSS plugin fight over the CSS pipeline | Spike tests coexistence explicitly; `@stylex;` lives in its own file, not the Tailwind entry    |
| shadcn-cssinjs is 11 weeks old                                                | Copy-paste, never a dependency; every installed component is reviewed and re-themed             |
| HMR regresses noticeably                                                      | Measured, reported, not hidden                                                                  |
| Parallel PRs in Phase 3 conflict on shared app files                          | Tracker assigns components; call-site edits are mechanical; rebase early                        |
| Drift between `tokens.ts` and `styles.css` during coexistence                 | Automated diff test in Phase 2; v1 stays on its own CSS until 5b                                |
| `web-stylex` silently rots while `web` evolves                                | Out of scope to sync features; the tracker records the `web` commit the clone was taken from    |

---

## 12. Documents produced by this effort

All under `docs/tailwind-to-stylex-migration/`: `01`–`02` (done), `03` spike
findings, `04` baseline metrics, `05` porting conventions, `06` tracker, `07`
results, and this spec. Implementation plans go to `docs/superpowers/plans/` per
repo convention, one per phase.
