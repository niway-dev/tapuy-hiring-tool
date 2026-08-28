# Baseline analysis — styling in this repo before StyleX

**Date:** 2026-08-28
**Status:** measured, no change made
**Purpose:** establish the Tailwind numbers that the `apps/web-v2` StyleX experiment
will be compared against. Written before any migration work, deliberately.

Every figure below is **measured** on the commit this document was written from.
The command that produced it is included so it can be re-run.

---

## Summary

Three findings shape the experiment.

1. **The monorepo cost of Tailwind is already real here, not hypothetical.**
   `apps/angular-web` re-declares 52 design tokens that `packages/web-ui` already
   owns — a 100% duplication of its token set, with a comment in the file admitting
   it. This is the single strongest thing the experiment can attack.
2. **The token layer is unusually well-suited to StyleX.**
   `packages/web-ui/src/styles.css` is a clean, flat, semantic token set. It maps
   almost 1:1 onto `stylex.defineVars` + `stylex.createTheme`.
3. **The build integration is the real risk, and it is unresolved.**
   `apps/web` is TanStack Start + Cloudflare + SSR on Vite. StyleX ships no official
   Vite plugin. This must be proven before committing to a full migration plan.

---

## 1. Token duplication across packages

This is the Tailwind monorepo problem in its concrete local form.

`apps/angular-web/src/styles.css` opens with:

```css
/* Tapuy tokens (dark is the default) — copied from packages/web-ui/src/styles.css */
```

### Measured

```bash
grep -oE '^\s*--[a-z0-9-]+:' packages/web-ui/src/styles.css | tr -d ' :' | sort -u > a.txt
grep -oE '^\s*--[a-z0-9-]+:' apps/angular-web/src/styles.css | tr -d ' :' | sort -u > b.txt
wc -l a.txt b.txt; comm -12 a.txt b.txt | wc -l
```

|                                                     | Value    |
| --------------------------------------------------- | -------- |
| Distinct tokens declared in `packages/web-ui`       | **120**  |
| Distinct tokens declared in `apps/angular-web`      | **52**   |
| Declared in **both**                                | **52**   |
| Share of `angular-web`'s tokens that are duplicates | **100%** |

A third copy exists at `documentation/tapuy-theme.css` (435 lines, 90 custom
properties), described in `web-ui` as the canonical reference — so the canonical
source of truth is itself a fourth file that neither app imports.

### Why Tailwind causes this

Tailwind tokens are CSS custom properties resolved by the consuming app's stylesheet.
For a second app to use them, it must either import the first package's CSS (which
drags in that package's `@source` globs and shadcn layer), share a config file, or
copy the declarations. This repo chose copy. That is the normal outcome, not a
mistake by whoever wrote it.

### What StyleX would change

`defineVars` exports tokens as a typed JavaScript module. A second app imports it:

```ts
import { colors } from "@interviews-tool/design-tokens/tokens.stylex";
```

No consumer-side configuration, no glob, no copy. Renaming a token becomes a type
error instead of a silently dead class.

**This is the experiment's primary hypothesis, and it is falsifiable:** after the
migration, the count of duplicated token declarations should be **0**.

---

## 2. The token layer is a clean migration target

### Measured

```bash
wc -l packages/web-ui/src/styles.css
grep -c '^\s*--[a-z]' packages/web-ui/src/styles.css
```

`packages/web-ui/src/styles.css` — **260 lines**, **158 custom property
declarations**, organised as:

- **Neons** (the 1%) — mint, fuchsia, violet, each with an `-on` pair
- **Neutrals** (the 90%) — bg, surface, surface-2, selected, borders, three text levels
- **Status colours** (the 9%) — 9 hiring states x bg/text/border
- **Focus ring** — one shared `box-shadow` token
- **shadcn semantic aliases** — `--background`, `--primary`, … mapped onto the above
- **Radii and typography** — under Tailwind 4's `@theme inline`

Theming is a single signal: dark is the default on `:root`, light overrides under
`[data-theme="light"]`.

### Why this matters

StyleX's `createTheme` works exactly this way: one `defineVars` call declares the
variable set, one `createTheme` per theme overrides values. A flat token set with a
single theming signal is the easy case. A token set built on nested selectors,
`@apply` chains or computed Tailwind plugins would not be.

**Caveat, unverified:** the `@theme inline` block, the `@layer base` rules (global
`::selection`, `::placeholder`, the global focus-visible ring) and the two custom
utilities (`.mono`/`.tabular`, `.display`) are Tailwind-specific constructs with no
direct StyleX equivalent. They need a decision, not a translation. Global element
styles in StyleX are a known rough edge.

---

## 3. Build integration is the unresolved risk

`apps/web` runs, per `apps/web/vite.config.ts`:

```ts
plugins: [
  tailwindcss(),
  tsconfigPaths(),
  tanstackStart(),
  cloudflare({ viteEnvironment: { name: "ssr" } }),
  viteReact(),
]
```

That is **Vite + TanStack Start (SSR) + Cloudflare Workers**.

StyleX publishes official integrations for Babel, webpack, rollup, esbuild, PostCSS
and Next.js. **There is no official Vite plugin.** The available paths are:

| Path                                                    | Concern                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `@stylexjs/postcss-plugin` via Vite's PostCSS pipeline  | Official. Needs verification that it sees files across workspace packages and survives SSR. |
| A community `vite-plugin-stylex`                        | Unofficial; must check maintenance before depending on it.                                  |
| `@stylexjs/rollup-plugin` through Vite's rollup options | Vite's dev server does not use rollup, so dev and build would diverge.                      |

Additional unknowns, all **unverified**:

- Does the StyleX transform run correctly inside the **Cloudflare Workers SSR
  environment** that `@cloudflare/vite-plugin` creates?
- Does StyleX compile source inside `node_modules` for a **workspace package**
  consumed via the `development` export condition (`packages/web-ui` uses one)?
- Do StyleX's Babel transform and TanStack Start's route-generation plugin conflict?

**Recommendation:** resolve this with a throwaway spike before writing an
implementation plan. If StyleX cannot run under this exact plugin stack, the shape
of `apps/web-v2` changes — and that is much cheaper to learn in an afternoon than
halfway through porting 46 components.

---

## 4. Migration surface

How much hand-written Tailwind there is to port. StyleX has no automatic migration,
so every one of these is manual.

### Measured

```bash
grep -roE 'className=' apps/web/src --include='*.tsx' | wc -l
grep -roE 'className=' packages/web-ui/src --include='*.tsx' | wc -l
grep -roE '\bcn\(' apps/web/src packages/web-ui/src | wc -l
grep -roE '\bcva\(' apps/web/src packages/web-ui/src | wc -l
grep -roE '\[[a-z-]+:[^]]+\]' apps/web/src packages/web-ui/src --include='*.tsx' | wc -l
```

| Surface                                       | Count   |
| --------------------------------------------- | ------- |
| `.tsx` files in `apps/web/src`                | **46**  |
| `.ts` files in `apps/web/src`                 | **34**  |
| `.tsx` files in `packages/web-ui/src`         | **20**  |
| `className=` occurrences in `apps/web`        | **563** |
| `className=` occurrences in `packages/web-ui` | **94**  |
| `cn()` merge-helper calls                     | **83**  |
| `cva()` variant definitions                   | **4**   |
| Arbitrary-value escapes `[...]`               | **9**   |

### Reading these numbers

- **657 `className` sites** is the honest size of the port. It is large but bounded,
  and it splits cleanly by file — which is what makes parallel work possible.
- **83 `cn()` calls** are the interesting ones. Every `cn()` is a place where class
  merge order is being resolved by `tailwind-merge` at runtime. These are precisely
  the sites where StyleX's "last style applied wins" rule should be a genuine
  improvement, not a lateral move. **They are the strongest evidence the experiment
  can produce, and should be tracked as a category.**
- **Only 4 `cva()` definitions and 9 arbitrary values** — the variant surface is
  small, so the port is not blocked on reproducing complex variant machinery.

### Config surface Tailwind imposes today

```bash
grep -rn '@source' --include='*.css' packages apps
find apps packages -maxdepth 3 -name 'tailwind.config.*' -not -path '*/node_modules/*'
```

- **2** `@source` globs (`packages/web-ui/src/styles.css`, lines 14–15)
- **1** `tailwind.config.ts` (`packages/web-ui/`)

This is small — smaller than the StyleX evaluation document's monorepo argument
assumes. **Deleting config is therefore a weak headline for this repo.** The token
duplication in section 1 is the strong one. Say that instead.

---

## 5. Not yet measured

These are part of the baseline and must be captured **before** `apps/web-v2` exists,
or the comparison is lost:

- [ ] CSS output size for `apps/web`, raw and gzipped, from `bun run build`
- [ ] Cold build time and incremental rebuild time for `apps/web`
- [ ] Dev-server cold start and HMR latency
- [ ] Total JS bundle size (StyleX adds ~0.9 KB gzip of runtime; Tailwind adds none)

---

## Open questions carried into the spec

1. Can StyleX compile under Vite + TanStack Start + Cloudflare SSR? (section 3 —
   blocking)
2. What replaces the `@layer base` globals and the `.mono` / `.display` utilities?
3. Does `apps/web-v2` share `packages/web-ui` or get its own StyleX component
   package? The two cannot share a component file, because a StyleX component and a
   Tailwind component are different source files.
4. What is the shared-backend boundary — do both apps import the same server-function
   package, or does `web-v2` call `apps/server` over HTTP?
