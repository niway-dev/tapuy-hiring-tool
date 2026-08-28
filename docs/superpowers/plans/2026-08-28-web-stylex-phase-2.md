# web-stylex Phase 2 (foundations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put StyleX into `apps/web-stylex` alongside Tailwind, create `packages/design-tokens` as the single source of truth for the Tapuy palette, create an empty-but-building `packages/web-ui-stylex`, and wire the StyleX theme onto `<html>` — all without porting a single component and without changing one rendered pixel.

**Architecture:** Phase 2 is pure scaffolding. At its end `apps/web-stylex` still renders exactly as `apps/web` does (the compare harness must still report 0.000%), but every piece the component migration needs is in place: the build compiles StyleX, tests compile StyleX, design tokens are typed and importable across a package boundary, the theme flips both the CSS-variable and the StyleX-class mechanisms from one server-read cookie, and a written conventions document tells every future contributor how to translate a Tailwind class.

**Tech Stack:** Bun 1.3.4, Turbo 2, Vite 7, TanStack Start, `@cloudflare/vite-plugin`, Tailwind 4 (still present), `@stylexjs/stylex` 0.19.0, `@stylexjs/babel-plugin` 0.19.0, `@stylexjs/postcss-plugin` 0.19.0, `@babel/preset-typescript` + `@babel/plugin-syntax-jsx`, Playwright.

**Spec:** `docs/tailwind-to-stylex-migration/spec-web-stylex.md` — decisions D3, D4, D5, D7, D8, D9, D12, D13; structure §3; conventions §5; Phase 2 row of §9.
**Proven configuration:** `docs/tailwind-to-stylex-migration/03-spike-findings.md` §3 reproduces the exact `vite.config.ts`, `postcss.config.cjs` and `vitest.config.ts` that work under this stack. **Copy them; do not re-derive them.**

## Global Constraints

- Everything committed is in **English**.
- **Never push to `main`.** This phase lands through a PR (`gh` account `csdev19`, repo `niway-dev/tapuy-hiring-tool` — pass `--repo`, the local remote name is stale).
- **`apps/web` is not modified.** Verify `git diff main -- apps/web` is empty at every task's end.
- **No component is ported in this phase.** `apps/web-stylex/src` must stay byte-identical to `apps/web/src` except for the one file Task 5 touches (`routes/__root.tsx`). Any other divergence is out of scope.
- **The compare harness must report 0.000% at the end of every task.** Phase 2 changes no pixels. Run `COMPARE_ONLY_PUBLIC=1 bun run compare` from `apps/web-stylex`; start `dev:web` **before** `dev:web-stylex` (`EADDRINUSE:9229` otherwise); reuse any API server already on `:3000`.
- Node `>= 22.22.3` or `>= 24.15.0`: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.20.0`.
- All `@stylexjs/*` packages pinned to exactly **0.19.0**.
- `unstable_moduleResolution.rootDir` is the **monorepo root** in every config that has it. Three configs must agree or variable hashes diverge between build and test.
- Files declaring `defineVars` must be named `*.stylex.ts`.
- Commit messages carry an attribution trailer.

---

## File map

| Path                                                          | Responsibility                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/design-tokens/package.json`                         | new workspace package, no React, no DOM                             |
| `packages/design-tokens/src/tokens.ts`                        | raw palette: `dark` and `light` objects, plain TS, no StyleX import |
| `packages/design-tokens/src/fonts.ts`                         | font stacks as plain strings                                        |
| `packages/design-tokens/src/tokens.stylex.ts`                 | `defineVars(dark)` + `createTheme(colors, light)`                   |
| `packages/design-tokens/src/index.ts`                         | barrel for the non-StyleX exports                                   |
| `packages/design-tokens/scripts/emit-css.ts`                  | writes `dist/tokens.css` from `tokens.ts`                           |
| `packages/design-tokens/src/tokens.test.ts`                   | parity test against `packages/web-ui/src/styles.css`                |
| `packages/web-ui-stylex/package.json`                         | new workspace package, React peer                                   |
| `packages/web-ui-stylex/src/index.ts`                         | empty barrel                                                        |
| `packages/web-ui-stylex/src/lib/variants.ts`                  | `cva`-shaped variant selector helper                                |
| `apps/web-stylex/postcss.config.cjs`                          | StyleX PostCSS plugin                                               |
| `apps/web-stylex/src/stylex.css`                              | the `@stylex;` directive                                            |
| `apps/web-stylex/vite.config.ts`                              | Babel plugin inside `viteReact`                                     |
| `apps/web-stylex/vitest.config.ts`                            | Babel plugin with `test: true`                                      |
| `apps/web-stylex/src/routes/__root.tsx`                       | import the directive; apply the StyleX theme class                  |
| `docs/tailwind-to-stylex-migration/05-porting-conventions.md` | the translation table every Phase 3/4 PR follows                    |

---

### Task 1: Install StyleX into `apps/web-stylex`

**Files:**

- Modify: `apps/web-stylex/package.json`, `apps/web-stylex/vite.config.ts`, `apps/web-stylex/vitest.config.ts`
- Create: `apps/web-stylex/postcss.config.cjs`, `apps/web-stylex/src/stylex.css`

**Interfaces:**

- Produces: a build that compiles `stylex.create` anywhere under `apps/web-stylex/src` or `packages/*/src`, and a test runner that does the same.

- [ ] **Step 1: Install the exact pinned set**

```bash
cd apps/web-stylex
bun add @stylexjs/stylex@0.19.0
bun add -d @stylexjs/babel-plugin@0.19.0 @stylexjs/postcss-plugin@0.19.0 postcss@^8.5.10 \
           @babel/preset-typescript@^8.0.1 @babel/plugin-syntax-jsx@^8.0.1
```

`@babel/preset-typescript` 8.x removed the `isTSX`/`allExtensions` options the StyleX docs still show, and `@babel/plugin-syntax-jsx` must be registered explicitly for `.tsx` to parse. Both facts are established in `03-spike-findings.md` §4 — this is why they are in the install list.

- [ ] **Step 2: Copy the three proven configs**

Take `vite.config.ts`, `postcss.config.cjs` and `vitest.config.ts` verbatim from `docs/tailwind-to-stylex-migration/03-spike-findings.md` §3, then apply exactly two adjustments:

- `vite.config.ts` keeps `port: 3002` (the findings show `3001` — that file came from `apps/web`).
- `vitest.config.ts` keeps `name: "web-stylex"`.

Everything else — plugin order, `monorepoRoot`, `dev`/`runtimeInjection`/`test` flags, the `include`/`exclude` globs, the `babelConfig` block with its preset and syntax plugin — is copied unchanged.

- [ ] **Step 3: The directive file**

Create `apps/web-stylex/src/stylex.css` containing exactly:

```css
@stylex;
```

Do not import it yet — Task 5 does that, together with the theme wiring.

- [ ] **Step 4: Verify the build is unchanged**

```bash
cd apps/web-stylex && rm -rf dist && NODE_ENV=production bun run build
find dist/client -name '*.js' -exec cat {} + | wc -c
```

Expected: exit 0, and **1,369,007 bytes** — the Phase 1 baseline from `04-baseline-metrics.md`. No StyleX is used yet, so the output must not move. If it does, record the new number and investigate before continuing; a changed baseline silently invalidates Phase 5's comparison.

- [ ] **Step 5: Verify tests still pass**

```bash
cd apps/web-stylex && bun run test
```

Expected: 6 files, 35 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web-stylex bun.lock
git commit -m "feat(web-stylex): install StyleX alongside Tailwind

Uses the exact configuration proven in the phase-0 spike, including the two
undocumented Babel requirements: @babel/preset-typescript 8.x (which dropped
isTSX/allExtensions) and an explicit @babel/plugin-syntax-jsx for .tsx parsing.
No component uses StyleX yet; the built bundle is unchanged."
```

---

### Task 2: `packages/design-tokens` — the raw palette

**Files:**

- Create: `packages/design-tokens/package.json`, `src/tokens.ts`, `src/fonts.ts`, `src/index.ts`, `tsconfig.json`

**Interfaces:**

- Produces: `export const dark: TokenSet`, `export const light: TokenSet`, `export type TokenName = keyof TokenSet`, and `export const fonts` — all consumed by Tasks 3 and 4.

- [ ] **Step 1: The package manifest**

`packages/design-tokens/package.json`:

```json
{
  "name": "@interviews-tool/design-tokens",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./tokens.stylex": "./src/tokens.stylex.ts",
    "./tokens.css": "./dist/tokens.css"
  },
  "scripts": {
    "build": "bun run scripts/emit-css.ts",
    "test": "bun test",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@stylexjs/stylex": "0.19.0"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

- [ ] **Step 2: Write `src/tokens.ts` from the real source**

The source of truth is `packages/web-ui/src/styles.css`. Its `:root` block declares **56** custom properties and its `[data-theme="light"]` block declares **94** — read both and transcribe every one. Names become camelCase without the `--` prefix (`--surface-2` → `surface2`, `--st-ongoing-bg` → `stOngoingBg`).

Structure:

```ts
/** Raw Tapuy palette. No StyleX import here on purpose: this file is the one
    source both the StyleX variables and the emitted CSS are derived from, and
    it must stay consumable by anything, including a plain Node script. */
export const dark = {
  // Neons — the 1%
  mint: "#00ffc2",
  mintHover: "#33ffd0",
  mintOn: "#04261d",
  // ... every token from the :root block
} as const;

export type TokenName = keyof typeof dark;
export type TokenSet = Record<TokenName, string>;

export const light: TokenSet = {
  // ... every token, same keys
};
```

**`light` is annotated `TokenSet`, not `as const`.** That makes a missing or misspelled key a compile error rather than a silent gap — the two themes cannot drift apart.

Where `:root` composes a value from another token (e.g. `--background: var(--bg)`, `--primary: var(--mint)`), resolve it to the concrete value in `tokens.ts` and note the shadcn alias it corresponds to in a comment. The emitted CSS in Task 4 re-creates the alias layer.

- [ ] **Step 3: `src/fonts.ts`**

Transcribe the three stacks from the `@theme inline` block of `styles.css`:

```ts
export const fonts = {
  sans: '"Geist", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
  display: '"Instrument Serif", Georgia, serif',
} as const;
```

- [ ] **Step 4: `src/index.ts`**

```ts
export { dark, light, type TokenName, type TokenSet } from "./tokens";
export { fonts } from "./fonts";
```

**Do not re-export `tokens.stylex.ts` from here.** It calls `defineVars`, which throws at runtime unless the Babel plugin compiled it — re-exporting it would drag that requirement into every consumer of the plain palette, including plain Node scripts. It has its own export path.

- [ ] **Step 5: `tsconfig.json`**

Copy the shape used by `packages/domain/tsconfig.json` (read it first) so the package type-checks like its siblings.

- [ ] **Step 6: Install and type-check**

```bash
bun install
bun run check-types --filter=@interviews-tool/design-tokens
```

- [ ] **Step 7: Commit**

```bash
git add packages/design-tokens bun.lock
git commit -m "feat(design-tokens): add the raw Tapuy palette as typed data"
```

---

### Task 3: The parity test — prove the palette matches `web-ui`

**Files:**

- Create: `packages/design-tokens/src/tokens.test.ts`

**Interfaces:**

- Consumes: `dark`, `light`, `TokenName` from Task 2.

This task exists because Tailwind and StyleX will coexist for the whole migration, reading the same values from two different files. Without an automated check they drift, and a drifted palette produces a visual diff nobody can explain.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dark, light } from "./tokens";

const css = readFileSync(
  new URL("../../web-ui/src/styles.css", import.meta.url),
  "utf8",
);

/** Pull one `--name: value;` block out of styles.css. */
function declarationsIn(selector: string): Map<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  const out = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)) {
    out.set(name, value.trim());
  }
  return out;
}

const camel = (kebab: string) => kebab.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

describe("palette parity with web-ui/styles.css", () => {
  it("declares every token the dark :root block declares", () => {
    const missing = [...declarationsIn(":root {").keys()]
      .map(camel)
      .filter((name) => !(name in dark));
    expect(missing).toEqual([]);
  });

  it("declares every token the light block declares", () => {
    const missing = [...declarationsIn('[data-theme="light"]').keys()]
      .map(camel)
      .filter((name) => !(name in light));
    expect(missing).toEqual([]);
  });

  it("gives dark and light exactly the same key set", () => {
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort());
  });
});
```

- [ ] **Step 2: Run it**

```bash
cd packages/design-tokens && bun test
```

If Task 2 transcribed the palette completely, this passes immediately. **If it fails, the test is right and Task 2 is incomplete** — add the missing tokens to `tokens.ts` rather than relaxing the test. Record which tokens were missing.

Some declarations in `:root` are aliases whose value is `var(--something)`; those resolve to a concrete value in `tokens.ts` and their names must still be present. If a name legitimately should not exist as a raw token, add it to an explicit, commented allow-list in the test rather than deleting the assertion.

- [ ] **Step 3: Commit**

```bash
git add packages/design-tokens/src/tokens.test.ts
git commit -m "test(design-tokens): fail if the palette drifts from web-ui"
```

---

### Task 4: StyleX variables and the CSS emitter

**Files:**

- Create: `packages/design-tokens/src/tokens.stylex.ts`, `packages/design-tokens/scripts/emit-css.ts`
- Modify: `packages/design-tokens/.gitignore` (create if absent) to ignore `dist/`

**Interfaces:**

- Produces: `export const colors` (a `defineVars` handle) and `export const lightTheme` (a `createTheme` class), both consumed by Task 5 and by every Phase 3 component.

- [ ] **Step 1: `src/tokens.stylex.ts`**

```ts
import * as stylex from "@stylexjs/stylex";
import { dark, light } from "./tokens";
import { fonts } from "./fonts";

/** The variable set. Dark is the default, matching web-ui/styles.css. */
export const colors = stylex.defineVars(dark);

export const typography = stylex.defineVars(fonts);

/** Applied as a class on <html> when the theme cookie says "light". */
export const lightTheme = stylex.createTheme(colors, light);
```

The filename must end in `.stylex.ts` — StyleX requires it for files declaring variables.

- [ ] **Step 2: `scripts/emit-css.ts`**

```ts
/** Emits dist/tokens.css from the same raw palette the StyleX variables use,
    so CSS-only consumers (packages/web-ui, apps/angular-web) can share one
    source of truth. Run by `bun run build` in this package. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dark, light, type TokenSet } from "../src/tokens";
import { fonts } from "../src/fonts";

const kebab = (camel: string) => camel.replace(/[A-Z0-9]+/g, (m) => `-${m.toLowerCase()}`);

function block(selector: string, tokens: TokenSet, extra = ""): string {
  const lines = Object.entries(tokens).map(([k, v]) => `  --${kebab(k)}: ${v};`);
  return `${selector} {\n${lines.join("\n")}\n${extra}}\n`;
}

const css = [
  "/* Generated by packages/design-tokens/scripts/emit-css.ts — do not edit. */",
  block(":root", dark, `  --font-sans: ${fonts.sans};\n  --font-mono: ${fonts.mono};\n  --font-display: ${fonts.display};\n  color-scheme: dark;\n`),
  block('[data-theme="light"]', light, "  color-scheme: light;\n"),
].join("\n");

mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("../dist/tokens.css", import.meta.url), css);
console.log(`design-tokens: wrote dist/tokens.css (${css.length} bytes)`);
```

- [ ] **Step 3: Run it and eyeball the output**

```bash
cd packages/design-tokens && bun run build && head -20 dist/tokens.css
```

Confirm the kebab-case round-trip is exact for the awkward names: `surface2` must emit `--surface-2`, `stOnHoldBg` must emit `--st-on-hold-bg`. **If any name does not round-trip, fix `kebab()` and add the failing name to Task 3's test as a regression case.** A silent name mismatch here would make the emitted CSS useless to `web-ui` in Phase 5b.

- [ ] **Step 4: Ignore the build output**

`packages/design-tokens/.gitignore`:

```
dist/
```

- [ ] **Step 5: Verify StyleX compiles it across the package boundary**

Temporarily add to `apps/web-stylex/src/routes/index.tsx`:

```tsx
import * as stylex from "@stylexjs/stylex";
import { colors } from "@interviews-tool/design-tokens/tokens.stylex";
const probe = stylex.create({ x: { color: colors.mint } });
```

and render `<span {...stylex.props(probe.x)} />`. Add the workspace dependency first:
`cd apps/web-stylex && bun add '@interviews-tool/design-tokens@workspace:*'` (**quote it** — zsh globs the `*`).

Build, and confirm the built StyleX CSS contains a single hashed variable for `mint`. Then **remove the probe** from `index.tsx` and confirm `diff -rq apps/web/src apps/web-stylex/src` is empty again. Keep the workspace dependency.

- [ ] **Step 6: Commit**

```bash
git add packages/design-tokens apps/web-stylex/package.json bun.lock
git commit -m "feat(design-tokens): expose StyleX variables and emit tokens.css"
```

---

### Task 5: Wire the theme onto `<html>`

**Files:**

- Modify: `apps/web-stylex/src/routes/__root.tsx`

**Interfaces:**

- Consumes: `lightTheme` from Task 4.

This is the only file in `apps/web-stylex/src` that Phase 2 changes.

- [ ] **Step 1: Read what is there**

`apps/web-stylex/src/routes/__root.tsx` renders `<html lang={locale} data-theme={theme} suppressHydrationWarning>` (around line 132) and toggles `document.documentElement.dataset.theme` in `handleToggleTheme` (around line 126). The theme value comes from a server-read cookie, which is what keeps the first paint flash-free — preserve that property exactly.

- [ ] **Step 2: Apply the StyleX theme class alongside the attribute**

Import the directive and the theme:

```tsx
import "@/stylex.css";
import * as stylex from "@stylexjs/stylex";
import { lightTheme } from "@interviews-tool/design-tokens/tokens.stylex";
```

Then spread the theme onto the same `<html>` element that already carries `data-theme`, keeping the attribute:

```tsx
<html
  lang={locale}
  data-theme={theme}
  suppressHydrationWarning
  {...stylex.props(theme === "light" && lightTheme)}
>
```

`stylex.props` ignores falsy arguments, so dark needs no class — it is the `defineVars` default.

- [ ] **Step 3: Keep the client-side toggle in sync**

`handleToggleTheme` currently sets `document.documentElement.dataset.theme = next` before the server round-trip. The StyleX class must flip with it, otherwise the two mechanisms disagree until the router invalidates. Add the class toggle immediately after the attribute assignment, deriving the class name from `lightTheme` via `stylex.props(lightTheme).className`, and add or remove it according to `next`. Write a short comment explaining why both mechanisms are updated together.

- [ ] **Step 4: Verify nothing renders differently**

```bash
cd apps/web-stylex && rm -rf dist && NODE_ENV=production bun run build && bun run test
```

Then the harness, which is the real gate:

```bash
# terminal 1: bun run dev:web      (start this FIRST)
# terminal 2: bun run dev:web-stylex
cd apps/web-stylex && COMPARE_ONLY_PUBLIC=1 bun run compare
```

Expected: **12/12 at 0.000%**. Phase 2 changes no pixels. A non-zero diff here means the theme wiring altered rendering and must be fixed, not accepted.

Also confirm both themes still work: the harness covers `dark` and `light`, so a broken light theme shows up as a diff on the light screenshots specifically.

- [ ] **Step 5: Commit**

```bash
git add apps/web-stylex/src/routes/__root.tsx
git commit -m "feat(web-stylex): apply the StyleX theme class alongside data-theme

Both mechanisms are driven by the same server-read cookie, so the no-flash
first paint is preserved while StyleX components gain a themed variable set."
```

---

### Task 6: `packages/web-ui-stylex` — empty but building

**Files:**

- Create: `packages/web-ui-stylex/package.json`, `src/index.ts`, `src/lib/variants.ts`, `tsconfig.json`

**Interfaces:**

- Produces: `export function variant<T>(map: T, key: keyof T)` — the `cva` replacement Phase 3 components use.

- [ ] **Step 1: The manifest**

```json
{
  "name": "@interviews-tool/web-ui-stylex",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "check-types": "tsc --noEmit" },
  "dependencies": {
    "@base-ui/react": "^1.0.0",
    "@interviews-tool/design-tokens": "workspace:*",
    "@stylexjs/stylex": "0.19.0",
    "lucide-react": "^0.525.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.7",
    "typescript": "catalog:"
  },
  "peerDependencies": { "react": "^19" }
}
```

These mirror `packages/web-ui`'s primitive dependencies minus everything Tailwind-specific (`clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css`, `shadcn`). That subtraction is the point of the package.

- [ ] **Step 2: `src/lib/variants.ts`**

`packages/web-ui` uses `cva` in 4 places. StyleX needs no runtime class merging — a variant is just a lookup into a `stylex.create` namespace:

```ts
/** Selects one style namespace from a variant map.
    Replaces class-variance-authority: with StyleX the "merge" is done by
    stylex.props at the call site, so this only needs to pick. */
export function variant<M extends Record<string, unknown>>(
  map: M,
  key: keyof M | undefined,
  fallback: keyof M,
): M[keyof M] {
  return map[key ?? fallback];
}
```

- [ ] **Step 3: `src/index.ts`**

```ts
/* Components arrive in phase 3, one PR each. */
export { variant } from "./lib/variants";
```

- [ ] **Step 4: `tsconfig.json`**

Copy the shape from `packages/web-ui/tsconfig.json`.

- [ ] **Step 5: Verify it builds and does not poison anything**

```bash
bun install
bun run check-types --filter=@interviews-tool/web-ui-stylex
cd apps/web-stylex && NODE_ENV=production bun run build
```

The second command matters more than it looks: the PostCSS `include` glob reaches `packages/*/src/**`, so **any un-compilable StyleX file in a workspace package breaks every consuming app's build** (`03-spike-findings.md` §6). An empty package that builds proves the new package is not poisoning `apps/web-stylex`.

- [ ] **Step 6: Commit**

```bash
git add packages/web-ui-stylex bun.lock
git commit -m "feat(web-ui-stylex): scaffold the StyleX component package"
```

---

### Task 7: The porting conventions document

**Files:**

- Create: `docs/tailwind-to-stylex-migration/05-porting-conventions.md`
- Modify: `docs/tailwind-to-stylex-migration/README.md` (add the index row)

This is what makes Phases 3 and 4 parallelisable across contributors. Without it, twelve components get twelve different interpretations of the same Tailwind class.

- [ ] **Step 1: Write it**

Base it on `spec-web-stylex.md` §5, expanded with what the earlier analysis measured. It must contain:

- **The full translation table** from spec §5, every row, with a real before/after code example for each — not just a description.
- **The spacing scale.** Tailwind's `p-4` is 16px; give the complete `0/0.5/1/1.5/2/2.5/3/3.5/4/5/6/8/10/12/16/20/24` → px table so nobody guesses.
- **Longhand rule.** StyleX rejects a shorthand and a longhand in the same object. `p-4` becomes `padding: 16`, but the moment one side is overridden every side is written longhand. Show the failure and the fix.
- **The `style` prop contract (D5).** Ported components take `style?: StyleXStyles` and drop `className`. Show the component signature and a call site. State plainly that a Tailwind string passed to a ported component is a silent no-op — which is why the prop is renamed rather than kept.
- **Variants.** How the 4 `cva` definitions become `stylex.create` namespaces plus `variant()` from `web-ui-stylex`.
- **The unsupported-selector playbook**, with counts from `02-plan-review.md` §2.1 so contributors know how common each case is:
  - `data-[state=open]:` (~55 sites) → Base UI exposes the state in JS; use a conditional. Show it.
  - `data-[variant=x]:`, `data-[icon=…]:` (~14) → these are shadcn passing props through CSS; make them real props again.
  - `[&_svg]:size-4` (39) → the icon styles itself; `web-ui-stylex` exports an `icon` style set.
  - `aria-invalid:`, `aria-expanded:` (14) → the component already knows; conditional.
  - `group-hover:`, `peer-disabled:` (3 sites, listed by file) → the **only** sanctioned `stylex.when.*` uses, per D7. Name the three files.
  - `animate-*` (19) → `stylex.keyframes` + explicit `animationName`.
- **What stays in plain CSS (D8)** and why: font `@import`, `::selection`, `::placeholder`, the global `:focus-visible` ring, `color-scheme`, `markdown-content.css`.
- **Tokens.** Always `colors.surface` from `@interviews-tool/design-tokens/tokens.stylex`; never a hex literal, never `var(--surface)`.
- **The PR checklist** for a Phase 3/4 change: component + all its call sites in one PR (D6); `bun run compare` at or below 0.1%; tracker row updated; no `className` left on the ported component.

- [ ] **Step 2: Index it**

Add the row to `README.md`'s table, matching the existing format. Also add the rows for `04-baseline-metrics.md` and `06-tracker.md`, which were deliberately deferred in Phase 1 to avoid a merge conflict.

- [ ] **Step 3: Commit**

```bash
git add docs/tailwind-to-stylex-migration
git commit -m "docs: write the Tailwind to StyleX porting conventions"
```

---

### Task 8: Phase gate and PR

- [ ] **Step 1: Full verification from a clean state**

```bash
git status                       # clean
bun install
bun run build                    # whole monorepo
bun run test
bun run lint && bunx oxfmt --check .
git diff main -- apps/web        # empty
diff -rq apps/web/src apps/web-stylex/src   # only routes/__root.tsx may differ
```

- [ ] **Step 2: The real gate — no pixels moved**

Start `dev:web`, then `dev:web-stylex`, then from `apps/web-stylex`:

```bash
COMPARE_ONLY_PUBLIC=1 bun run compare
```

Expected: 12/12 at 0.000%. Phase 2 ports nothing, so anything else is a regression.

- [ ] **Step 3: Open the PR**

```bash
git push -u origin feat/web-stylex-phase-2
gh pr create --repo niway-dev/tapuy-hiring-tool --base main --title "feat: StyleX foundations for web-stylex (phase 2)" --body "..."
```

The body must state: StyleX now compiles in build and test; `design-tokens` is the single palette source with an automated parity test against `web-ui`; the theme drives both mechanisms from one cookie; `web-ui-stylex` is scaffolded and empty; conventions are written; **no component is ported and the harness still reports 0.000%**.

---

## Self-review

**Spec coverage:** D3 → Tasks 2–4; D4 → Task 6; D5, D7, D8 → Task 7 (documented, applied in Phase 3); D9 → Task 1 (uses the spike's chosen route); D12 → Task 5; D13 → no eslint plugin anywhere in this plan. Spec §3's structure is realised by Tasks 2, 4 and 6. Spec §9's Phase 2 row (StyleX installed, design-tokens with emitted CSS diffed against `styles.css`, empty `web-ui-stylex` that builds, theme class on `<html>`, conventions, tracker) is covered by Tasks 1–7; the tracker already exists from Phase 1.

**Placeholders:** the PR body in Task 8 is described by required content rather than written out, because it must report numbers only known at that point. Every code step contains real code.

**Type consistency:** `dark`/`light`/`TokenSet`/`TokenName` are defined in Task 2 and consumed with those names in Tasks 3 and 4. `colors`/`typography`/`lightTheme` are defined in Task 4 and consumed in Task 5. `variant()` is defined in Task 6 and referenced in Task 7's conventions.

**Known risk carried in:** the compare harness covers 12 of 28 screenshots — the four authenticated routes need credentials. Phase 2 touches no authenticated-only rendering, so the public subset is an adequate gate here. **Phase 3 is different**: components like `dropdown-menu`, `select` and `table` render mainly on authenticated routes, so the credentials must be supplied before those components are ported, or their PRs merge with no visual gate at all.
