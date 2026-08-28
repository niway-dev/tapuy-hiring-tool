# Spike findings — StyleX under the `apps/web` build stack

**Date:** 2026-08-28
**Status:** Phase 0 complete; answers the blocking question from `01-baseline-analysis.md` §3
**Spike branch:** `spike/stylex-under-web-build`, HEAD `4afd089` (not merged, not pushed —
kept locally so the working configs can be read directly)
**Versions:** `@stylexjs/stylex` `0.19.0`, `@stylexjs/babel-plugin` `0.19.0`,
`@stylexjs/postcss-plugin` `0.19.0`, `unplugin-stylex` `0.6.3`, Vite `7.3.0`,
`wrangler` `4.58.0`, Node `24.20.0`

The question: **can StyleX replace Tailwind in this monorepo's build — specifically
under `apps/web`'s Vite + TanStack Start + Cloudflare Workers SSR + Tailwind 4 stack —
and which integration route should be used?**

Answer: yes, on the official PostCSS route. Everything below is the evidence.

### How to read the labels

Same convention as `01-baseline-analysis.md`. **measured** = a command was run and its
output is quoted. **inferred** = derived from artefacts or source code, not from a live
run of the thing being claimed. **not tested** = nobody ran it; the reason is stated.

Every task's result was independently re-derived by a second reviewer before it was
accepted. Where a reviewer reproduced a number byte-for-byte, that is noted.

---

## 1. Decision

**Route chosen: the official `@stylexjs/postcss-plugin` + `@stylexjs/babel-plugin`
pair.** The Babel plugin is registered twice — once inside `@vitejs/plugin-react`'s
`babel.plugins` (so the JS pipeline compiles `stylex.create` calls into class names) and
once inside `postcss.config.cjs`'s `babelConfig` (so the PostCSS plugin can scan source
files and generate the stylesheet that `@stylex;` expands into). It is the only route of
the two that gets the generated CSS onto the page in this stack: it survives `vite dev`,
`NODE_ENV=production vite build`, and a real `workerd` request under `wrangler dev`; it
emits `<link rel="stylesheet">` tags in the raw SSR HTML in production, so first paint is
styled without waiting for JS; it coexists with Tailwind 4 without either system
touching the other's output; it compiles `defineVars` from a workspace package with the
same hash on both sides of the package boundary; and it works in vitest. The costs are
known and bounded: an `include` glob that reaches into `packages/*` (§6), and two Babel
packages the StyleX documentation does not mention (§4).

`unplugin-stylex` was disqualified by exactly one defect: its only CSS-injection path is
a `transformIndexHtml` hook, and TanStack Start builds no static `index.html` for that
hook to run against, so the generated stylesheet is emitted to disk and served at a URL
but never referenced by the document the browser receives — in dev or in production
(§5).

This settles spec decision **D9**.

---

## 2. Results matrix

Every check, both routes. `n/a` means the check does not apply to that route; `not tested`
means it was not run and the reason is given below the table.

| Check                                                        | PostCSS route (`@stylexjs/postcss-plugin`)                                                                                                                                         | `unplugin-stylex@0.6.3`                                                                                                                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vite dev` renders styled probe                              | **pass** — HTTP 200; probe carries 10 hashed atomic classes + the dev debug prefix `stylex-probe__styles.box`; CSS served at `/src/stylex.css` with keyframes, `:hover`, `@media`  | **fail in effect** — same hashed classes in the HTML, but no `<link>` and no injected stylesheet ever points at the CSS, so a browser renders it unstyled                           |
| `vite build` extracts CSS                                    | **pass** — exit 0 in ~8 s; StyleX rules land in the route CSS chunk, `48,188 B` at `a602bd3`, `48,367 B` at `8f35e61` after the token package was added                            | **pass (emission only)** — `dist/client/assets/stylex.css` = `880 B`, its own asset; Tailwind chunk `47,530 B` separate. Emitted, never referenced                                  |
| `wrangler dev` SSR HTML carries classes + stylesheet         | **pass** — `workerd` 4.58.0, HTTP 200; probe `<div>` with clean hashed class in the raw response; both `<link rel="stylesheet">` tags present; served CSS byte-identical to `dist` | **fail (inferred)** — not run live; `stylex.css` is absent from `dist/server/.vite/manifest.json` and from the router bundle, the two files Start reads                             |
| Cross-package `defineVars` (one var set, theme overrides)    | **pass** — `accent` → `--xq54dgo`, `ink` → `--x1xxcfaj`, one hashed name each; `createTheme` class `x18ovhp6` overrides both; dev and prod agree                                   | **pass** — byte-identical hashes to the PostCSS route (`--xq54dgo`, `--x1xxcfaj`, `x18ovhp6`), confirming StyleX hashing is toolchain-independent at equal `rootDir`                |
| Vite transforms workspace package source                     | **pass** — corruption test: renaming `defineVars` → `defineVarsX` in the package failed the build (exit `1`) naming `packages/design-tokens-probe/src/probe.stylex.ts`             | **pass** — picked up through Vite's own module graph with no configuration at all                                                                                                   |
| Vitest with `test: true`                                     | **pass** — 7 test files, 36 tests, no regressions; failure-first proved the plugin was the cause                                                                                   | **n/a** — `vitest.config.ts` uses `@vitejs/plugin-react`'s Babel hook, not a Vite CSS plugin; Task 5 never touched it                                                               |
| Tailwind coexistence (`@stylex;` vs `@import "tailwindcss"`) | **pass** — both stylesheets emitted and linked; `220` / `448` `--tw-*` occurrences intact; no StyleX `x<hash>` class leaked into Tailwind's file                                   | **pass** — Tailwind's chunk is present _and_ linked in both dev and prod; that contrast is precisely what proves the StyleX gap is unplugin's, not the stack's                      |
| HMR on a style edit updates CSS without reload               | **not tested** — see §10                                                                                                                                                           | **no** — `padding: 16 → 24` produced `[vite] (ssr) page reload`, a full reload. New hash `xggk2y7` and `padding:24px` were correct after it. Moot: nothing was linked to hot-update |
| Needs `include` globs reaching into `packages/*`             | **yes** — `"../../packages/*/src/**/*.{ts,tsx}"`. Two-sided consequence in §6                                                                                                      | **no** — no `include` option exists; module-graph driven. Its clearest genuine advantage                                                                                            |
| `@babel/preset-typescript` required                          | **yes**, plus an explicit `@babel/plugin-syntax-jsx` — neither documented (§4)                                                                                                     | **no** — bundles `@babel/plugin-syntax-typescript` and `@babel/plugin-syntax-jsx` internally, keyed off file extension                                                              |
| CSS actually reaches the browser                             | **yes** — dev via Vite's `updateStyle()` JS wrapper; production via real `<link>` tags in SSR HTML                                                                                 | **no** — this is the disqualifier (§5)                                                                                                                                              |
| shadcn-cssinjs registry component compiles                   | **yes** — after rewriting two `@/lib` alias imports to relative paths (§8)                                                                                                         | **not tested** — Task 6 ran only against the chosen route                                                                                                                           |

### Numbers, and the commands that produced them

All from `apps/web`, Node `24.20.0`:

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.20.0
cd apps/web && rm -rf dist && NODE_ENV=production bun run build
find dist -type f -name '*.css' -exec ls -la {} \;
```

| Measurement                                                 | Value                                                     | Where                |
| ----------------------------------------------------------- | --------------------------------------------------------- | -------------------- |
| Production build, exit code                                 | `0`                                                       | `a602bd3`            |
| Production build, wall clock                                | ~8 s (client `3.06 s` + SSR `2.86 s` as reported by Vite) | `a602bd3`            |
| Route CSS chunk carrying the StyleX rules, probe only       | `48,188 B`                                                | `a602bd3`            |
| Same chunk after adding the cross-package token file        | `48,367 B`                                                | `8f35e61`            |
| Same chunk after adding the registry `button`               | `54.58 kB`                                                | `16b1078`            |
| Tailwind entry CSS, unchanged throughout                    | `66,146 B`                                                | `a602bd3`            |
| `unplugin-stylex` StyleX-only asset                         | `880 B`                                                   | Task 5, at `2e40d3c` |
| `unplugin-stylex` Tailwind/route chunk (no StyleX mixed in) | `47,530 B`                                                | Task 5, at `2e40d3c` |

**Read those CSS numbers carefully.** Under the PostCSS route the StyleX rules are merged
into the route's existing CSS chunk, so `48,367 B` is _not_ "StyleX's CSS size" — it is a
pre-existing chunk that now also contains the probe's rules. `unplugin-stylex` splits them
out, which is why its `880 B + 47,530 B = 48,410 B` lands within ~0.1 % of the PostCSS
route's `48,367 B` single file. **Total CSS mass is equivalent between the two routes**;
the difference is file layout, not output size. Neither number says anything yet about
Tailwind-vs-StyleX CSS size — that comparison belongs to Phase 1's baseline metrics, on
real components rather than a probe.

---

## 3. The exact working configuration

Verbatim from the spike branch. This section exists so the setup can be reproduced from
this document alone, with the spike branch gone.

```bash
git show spike/stylex-under-web-build:apps/web/vite.config.ts
git show spike/stylex-under-web-build:apps/web/postcss.config.cjs
git show spike/stylex-under-web-build:apps/web/vitest.config.ts
```

### Dependencies (`apps/web/package.json`)

```json
"dependencies": {
  "@stylexjs/stylex": "0.19.0"
},
"devDependencies": {
  "@babel/plugin-syntax-jsx": "^8.0.1",
  "@babel/preset-typescript": "^8.0.1",
  "@stylexjs/babel-plugin": "0.19.0",
  "@stylexjs/postcss-plugin": "0.19.0",
  "postcss": "^8.5.10"
}
```

The three `@stylexjs/*` packages are pinned exactly; they must move in lockstep
(`@stylexjs/postcss-plugin` peer-depends on `@stylexjs/babel-plugin` at the same version).
The two `@babel/*` entries are **not** pinned in the spike, and that is a mistake worth
correcting in Phase 2 — see §4 and §9.

### `apps/web/vite.config.ts`

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

**Plugin order was never changed.** The five-plugin order above is `apps/web`'s
pre-existing order; the only edit is the `babel` option on `viteReact()`. No ordering
experiment was needed, because every failure encountered was a Babel parse error inside
the PostCSS pass, never a Vite pipeline conflict. The feared "`@tailwindcss/vite`
swallows `@stylex;`" failure (`02-plan-review.md` §2.3, `spec-web-stylex.md` §11) **never
materialised**, and the reason is structural: `@stylex;` lives in its own file, loaded by
a JS side-effect import, and never enters Tailwind's `@import "tailwindcss"` chain in
`index.css`. There is no shared file in which one directive could eat the other.

### `apps/web/postcss.config.cjs`

```js
const path = require("node:path");

module.exports = {
  plugins: {
    "@stylexjs/postcss-plugin": {
      include: ["src/**/*.{ts,tsx}", "../../packages/*/src/**/*.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**"],
      babelConfig: {
        babelrc: false,
        presets: [["@babel/preset-typescript"]],
        plugins: [
          "@babel/plugin-syntax-jsx",
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

### `apps/web/vitest.config.ts`

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

### `apps/web/src/stylex.css`

```css
@stylex;
```

One line. Imported for its side effect from a route module:

```tsx
// apps/web/src/routes/index.tsx — first line
import "@/stylex.css";
```

In the real app this import belongs in the root route, not in `index.tsx`; the spike put
it there because that is where the probe rendered.

### The three `rootDir` values must agree

`vite.config.ts`, `postcss.config.cjs` and `vitest.config.ts` each compute
`path.resolve(__dirname, "../..")` — the monorepo root — independently. If any one of
them disagrees, StyleX mints a second, differently-hashed CSS custom property for the same
logical token and cross-package variables silently stop matching. The spike verified
agreement empirically rather than by inspection: the same `--xq54dgo` / `--x1xxcfaj` names
appear from the package's `defineVars` call, from the app's `probeVars.ink` read, and from
`createTheme`'s override, in dev and in production alike.

```bash
grep -oE '(--xq54dgo|--x1xxcfaj):[^;}]*' dist/client/assets/main-*.css
# --xq54dgo:rgb(0, 255, 194)     <- defineVars default
# --x1xxcfaj:rgb(4, 38, 29)      <- defineVars default
# --xq54dgo:rgb(0, 166, 126)     <- createTheme override
# --x1xxcfaj:rgb(228, 255, 246)  <- createTheme override
```

Exactly two declarations per name — the default and the override — and no second hash
carrying the same source value. That absence is the `rootDir`-mismatch check.

### Dev and production deliver the CSS by different mechanisms

This surprised the spike and is worth knowing before someone debugs a phantom bug.

- **`vite dev`:** the raw SSR HTML contains **no** `<link>` for `stylex.css`. Vite serves
  a CSS module reached only through a JS side-effect import as a JS module that calls
  `__vite__updateStyle()` after hydration. The rules are correct and present — fetch
  `http://localhost:3001/src/stylex.css` to see them — but they are invisible in
  `curl` output of the page itself. This is standard Vite dev behaviour, not a StyleX
  quirk.
- **Production:** `dist/server/.vite/manifest.json` records the route chunk's CSS
  dependency (`_router-*.js` → `["assets/router-*.css"]`), TanStack Start's document
  renderer reads it, and real `<link rel="stylesheet">` tags appear in the SSR HTML:

  ```html
  <link rel="stylesheet" href="/assets/index-BoReVuJT.css"/>
  <link rel="stylesheet" href="/assets/main-DEjApsq5.css" type="text/css"/>
  ```

  Verified through `workerd`, not just from `dist`: the CSS fetched from the running
  worker diffed byte-identical against the file on disk.

---

## 4. Undocumented requirements

Three things the spike had to discover. None of them is in StyleX's documentation.

**1. `@babel/preset-typescript@8.0.1` removed the options the official docs still assume.**
The documented fix for "PostCSS can't parse my `.tsx`" is
`presets: [["@babel/preset-typescript", { isTSX: true, allExtensions: true }]]`. That is
`7.x` API. An unpinned `bun add -d @babel/preset-typescript` resolves to `8.0.1`, which
errors outright:

```
Error: [postcss] [BABEL] .../stylex-probe.tsx: @babel/preset-typescript:
The .allExtensions and .isTSX options have been removed.
```

**2. `@babel/plugin-syntax-jsx` must be registered explicitly for `.tsx`.** Dropping the
removed options gets past the type annotation and then fails one line later on the JSX
itself:

```
SyntaxError: [postcss] .../stylex-probe.tsx: Unexpected token, expected "," (28:9)
  28 |     <div data-testid="stylex-probe" {...stylex.props(styles.box)}>
```

In `7.x`, `isTSX: true` did double duty — it marked the file as TSX _and_ implicitly
enabled JSX parsing. `8.x` kept the `.tsx` detection (`test: filename =>
filename?.endsWith(".tsx")`) but dropped the implicit parser enabling, and its own error
text names the replacement. Adding `"@babel/plugin-syntax-jsx"` before the StyleX plugin
in `postcss.config.cjs`'s `plugins` array is what finally worked. Four dev-server attempts
were needed to get there; the first three all returned HTTP 500.

**3. The test pipeline needs neither of them — and that asymmetry is a trap.**
`vitest.config.ts` registers `@stylexjs/babel-plugin` through `@vitejs/plugin-react`,
which parses TS and JSX itself before handing the AST on. No `@babel/preset-typescript`,
no `@babel/plugin-syntax-jsx`, no failure. So the two extra Babel packages are a
**PostCSS-pipeline requirement only**. State it plainly: someone who wires vitest first,
sees it work, and assumes the same minimal config suffices for `postcss.config.cjs` will
hit three consecutive parse errors with no obvious link back to this asymmetry.

**Recommendation for Phase 2:** pin `@babel/preset-typescript` and
`@babel/plugin-syntax-jsx` explicitly rather than letting them float on `^8.0.1`, since a
future major can move this ground again — and the failure mode is a build-breaking parse
error, not a deprecation warning. Pinning `@babel/preset-typescript@^7` would also work
and would restore the documented option shape; the spike did not test that path.

### One more failure signature worth recording

The vitest failure, before the plugin was added, was:

```
Error: Unexpected 'stylex.defineVars' call at runtime. Styles must be compiled by
'@stylexjs/babel-plugin'.
 ❯ ../../packages/design-tokens-probe/src/probe.stylex.ts:3:33
 ❯ src/components/stylex-probe.tsx:2:1
```

Note **which file it names**: the workspace package's token file, not the component under
test. The first uncompiled StyleX call in the import chain is what throws, and in a
token-package architecture that is almost always `*.stylex.ts` in another package. The
error text also differs from the one `02-plan-review.md` §2.4 predicted
(`stylex.create should never be called`) — same guard family in StyleX's `errorForFn`,
different function name. Expect either string.

---

## 5. `unplugin-stylex`: better on several axes, disqualified on one

The comparison was run by swapping it in for the full PostCSS setup at `2e40d3c`, then
reverting; nothing was committed. Its real advantages first, because they are real.

**Where it is genuinely better than the official route:**

- **No `include` glob.** It has no `include` option at all. It hooks Vite's
  `transform`/`transformInclude` and runs on whatever Vite's own module graph loads. The
  `design-tokens-probe` package was picked up with _zero_ configuration — no glob reaching
  into `packages/*`, nothing to keep in sync as packages are added, nothing that can go
  stale. For a monorepo this is architecturally the nicer answer (and it removes the
  poisoning hazard described in §6 entirely).
- **No `@babel/preset-typescript` trap.** It never uses that preset. Reading
  `node_modules/unplugin-stylex/dist/chunk-45JWH4GZ.cjs`, it injects
  `@babel/plugin-syntax-typescript` and `@babel/plugin-syntax-jsx` itself, keyed off the
  file extension, and leaves actual TS stripping to Vite's esbuild pass. The entire §4
  rabbit hole simply does not exist on this route: dev and build both worked on the first
  attempt with the `.tsx` probe.
- **Identical cross-package hashes.** `accent` → `--xq54dgo`, `ink` → `--x1xxcfaj`, theme
  class `x18ovhp6` — byte-for-byte the same names the PostCSS route produced, given the
  same `rootDir`. Nothing is lost in token fidelity by choosing either one.
- **Cleaner output layout.** StyleX rules go to their own `stylex.css` asset (`880 B`)
  instead of being merged into a route chunk.

**The one thing that disqualifies it.** Its only mechanism for getting that CSS into the
document is a `transformIndexHtml` hook, and that hook returns early unless `ctx.bundle`
is populated:

```js
transformIndexHtml(html, ctx) {
  const css = ctx.bundle?.[fileName];
  if (!css) return html;   // dev: ctx.bundle is always undefined here
  return [{ tag: "link", attrs: { rel: "stylesheet", href: publicPath }, injectTo: "head" }];
}
```

Vite populates `ctx.bundle` only when building against a real `index.html` entry.
**TanStack Start builds no static `index.html`** — it generates the document
programmatically — so the hook's dev branch returns early and its build branch never
fires. The plugin declares no `resolveId`/`load` hooks either, so there is no virtual
module id anything could import; the CSS reaches disk purely through
`this.emitFile({ type: "asset" })` and therefore never enters the JS module graph that
Start's document renderer reads.

The consequence, measured:

```bash
grep -c "stylex.css" dist/server/.vite/manifest.json dist/server/assets/router-*.js
# 0  0
```

Tailwind's chunk **is** in both files. That contrast is the proof: the stack can link a
stylesheet fine, and this plugin's CSS is the thing that never gets linked. The reviewer
corroborated it structurally by confirming that **no `index.html` exists anywhere in this
stack's build output**.

Net effect: classes are hashed correctly, the file exists and is reachable at
`/assets/stylex.css`, and a real browser renders every StyleX-styled element completely
unstyled — in dev and in production. Working around it would mean hardcoding a `<link>`
into the root document component (a manual step neither route's documentation asks for)
or patching the plugin. For a 29-star community package with 10 open issues, against an
official route that already works end to end, that is not where scarce budget goes.

---

## 6. The `packages/*` wildcard cuts both ways

This may be the spike's most valuable finding. Both halves are the same mechanism, and
the second half is not a footnote to the first.

The `include` glob in `postcss.config.cjs` is:

```js
include: ["src/**/*.{ts,tsx}", "../../packages/*/src/**/*.{ts,tsx}"]
```

**The win.** A brand-new workspace package (`@interviews-tool/design-tokens-probe`) was
created, added as an ordinary `workspace:*` dependency, and consumed by `apps/web` —
and **`vite.config.ts` and `postcss.config.cjs` were not edited at all**. The generic
`packages/*` wildcard, written once in Task 1, already covered it. That is the win the
whole monorepo argument in `01-baseline-analysis.md` §1 rests on: adding
`packages/design-tokens` in Phase 2 requires **zero incremental configuration** in any
consuming app.

Say it that way. Not "no configuration is needed" — configuration _is_ needed, exactly
once, as a wildcard, and it already exists. The looser phrasing would be self-flattering
and false, and a reviewer called it out specifically.

**The cost, same glob.** Because that wildcard matches every file under every
`packages/*/src`, **any un-adapted StyleX file anywhere under `packages/*/src` breaks
every consuming app's build — even when nothing imports it.** This was not reasoned
about; it was demonstrated. In Task 6 the throwaway `packages/web-ui-stylex-probe`
committed a registry `button.tsx` that nothing in `apps/web` imported, and its unmodified
Next-style `@/lib/...` imports failed `apps/web`'s production build on their own:

```
[vite:css] [postcss] .../button.tsx: Could not resolve the path to the imported file.
Please ensure that the theme file has a .stylex.js or .stylex.ts extension...
   7 | import { colors, radius } from "@/lib/stylex-probe-tokens.stylex";
```

This was a _second, independent_ failure from the copy under `apps/web/src` that also had
to be fixed. The wildcard gives no isolation: there is no import graph filtering what the
PostCSS pass sees, only a path pattern.

**What Phase 2 and 3 must do about it:** every file landing under `packages/*/src` must be
StyleX-valid _at commit time_. A raw drop-in from the shadcn-cssinjs registry, parked in a
package "to adapt later", breaks CI for everyone immediately. Note also that
`unplugin-stylex` does not have this hazard at all — it is module-graph driven — which is
the strongest thing that can be said for the route that lost.

---

## 7. What the spike proved about the risks the plan named

`spec-web-stylex.md` §11 and `02-plan-review.md` §2.3 listed the unknowns. Their status:

| Risk / unknown named before the spike                                               | Outcome                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| StyleX cannot compile under Cloudflare SSR / TanStack Start                         | **Resolved.** Compiles and ships styled HTML under real `workerd`, verified with `wrangler dev` 4.58.0                                                                                                         |
| `@tailwindcss/vite` and the StyleX PostCSS plugin fight over the CSS pipeline       | **Did not occur.** Separate files, separate outputs; `--tw-*` counts intact; no cross-contamination                                                                                                            |
| shadcn-cssinjs documents "StyleX PostCSS must run before Tailwind"                  | **Not needed here.** Plugin order was never touched and never caused a failure                                                                                                                                 |
| Vite applies the Babel plugin to workspace packages via the `development` condition | **Confirmed transformed**, via the corruption test. The probe package exported raw TS source, not a `dist` build — the `development`-condition case specifically (`packages/web-ui`'s shape) was not exercised |
| TanStack Start's route plugin vs the StyleX Babel plugin                            | **No conflict observed** in dev, build, or SSR                                                                                                                                                                 |
| Tests throw without the Babel plugin                                                | **Confirmed**, and fixed with `test: true`. The thrown error names the token package, not the component                                                                                                        |

---

## 8. shadcn-cssinjs registry

Fetched directly as registry JSON (`curl`), not through `bunx shadcn@latest add`, and
compiled inside a throwaway workspace package.

**It works outside Next.js.** Three files land — `button` (`registry:ui`) plus its two
`registry:lib` dependencies `stylex-tokens` and `stylex-utils` (note: `button.json` names
_both_; `02-plan-review.md` §2.6 named only `stylex-tokens`). Declared runtime deps are
`@base-ui/react` and `@stylexjs/stylex`, both already in `apps/web`. Exactly one Next.js
artefact exists across the three files: an inert `"use client";` on line 1 of
`button.tsx`. No `next/*` imports, no Babel or Turbopack config assumptions, no
`cssVars`/`tailwind`/`registries` keys.

**One required change: bundler aliases.** The registry's `@/lib/...` imports must be
rewritten to relative paths. `@stylexjs/babel-plugin` resolves `defineVars` imports with
its own static resolver (`unstable_moduleResolution`), independent of Vite and tsconfig
paths, so it cannot follow an alias. This is a path-only fix, and it is the only change
that alters semantics — the committed file also picked up four formatting-only diffs from
this repo's `oxfmt` pre-commit hook. After it, `NODE_ENV=production bun run build`
succeeds and button-specific rules are traceable in the compiled CSS:

```css
.x3nfvp2:not(#\#):not(#\#):not(#\#){display:inline-flex}
.x1s07b3s:disabled:not(#\#):not(#\#):not(#\#){cursor:not-allowed}
.xfn6mz6:hover:not(#\#):not(#\#):not(#\#){background-color:color-mix(in oklab,var(--x497ofa) 90%,transparent)}
```

**The prop API does not match this repo's spec, and that is the real Phase 3 cost.**
Quoted from the fetched `button.tsx`:

```ts
export interface ButtonProps extends Omit<React.ComponentProps<"button">, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  render?: useRender.RenderProp;
}
```

`className` is `Omit`-ted and then re-declared, so the component really does take a
`className` string; `stylex-utils`'s `customClassName` wraps it into a fake StyleX style
object (`{ [className]: className, $$css: true }`) so `stylex.props()` can merge it.
`style` is never declared on `ButtonProps` at all — it is inherited with its native
`React.CSSProperties` type and then force-cast at the call site:

```ts
...stylex.props(styles.base, /* … */, customClassName(className), style as StyleXStyles)
```

That cast is unchecked. TypeScript would happily accept `style={{ color: "red" }}` and
pass a raw CSS-properties object into `stylex.props()`, which expects a `$$css`-tagged
StyleX object. It is silently wrong at the type level, not merely non-conforming.

Spec **D5** commits to `style?: StyleXStyles` with `className` removed. The registry's
convention is the opposite: a deliberate hybrid `className` + loosely-typed `style` API.

**Conclusion to plan from: seeding from the registry saves the styling work, not the API
work.** Every seeded component needs its `className`/`style` handling redesigned, and the
`customClassName` shim probably gets dropped entirely. D4's "API-matched to `web-ui`"
should be read as real per-component effort, not a copy-paste plus a rename.

**Token shape, for sizing the Phase 3 re-theme.** `tokens.stylex.ts` holds **30 tokens**
across two `defineVars` blocks — `colors` (26) and `radius` (4) — and **zero
`createTheme`**. The tokens do not carry literal values; each wraps an existing CSS custom
property (`accent: "var(--accent)"`, `md: "calc(var(--radius) - 2px)"`), so the 30 tokens
reference **27 distinct custom-property names** (26 colours + `--radius`, which all four
radii derive from).

Checked against this repo's 158 declarations in `packages/web-ui/src/styles.css`:

```bash
for n in accent accent-foreground background border card card-foreground destructive \
         foreground input muted muted-foreground popover popover-foreground primary \
         primary-foreground ring secondary secondary-foreground radius \
         sidebar sidebar-accent sidebar-accent-foreground sidebar-border \
         sidebar-foreground sidebar-primary sidebar-primary-foreground sidebar-ring; do
  grep -qE "^\s*--$n:" packages/web-ui/src/styles.css && echo "HIT $n" || echo "MISS $n"
done
```

| Registry token names                      | Count  | Already in `web-ui/src/styles.css` |
| ----------------------------------------- | ------ | ---------------------------------- |
| Distinct custom properties referenced     | **27** | **19**                             |
| Non-`sidebar-*` (18 colours + `--radius`) | 19     | **19 — all present verbatim**      |
| `sidebar-*`                               | 8      | **0** — this repo has no sidebar   |

Every token `button` actually uses (`primary`, `primaryForeground`, `destructive`,
`accent`, `accentForeground`, `background`, `foreground`, `border`, `ring`, `secondary`,
`secondaryForeground`, `radius.md`) already exists. **Re-theming cost for `button` is
effectively zero**; the 8 `sidebar-*` names only matter if a sidebar is ever ported.
Confirmed in the compiled output — `:root,.x1dojp1h{--x1emsbec:var(--accent);…
--x497ofa:var(--destructive);…}` points straight at this repo's own tokens.

Note this shape does **not** match spec §4, which has `design-tokens` holding raw literal
values and generating `tokens.css`. The registry's tokens are a thin StyleX veneer over
CSS variables someone else declares. Phase 2 owns that reconciliation; the registry file
is a naming reference, not a drop-in `tokens.stylex.ts`.

**Two operational notes.** `@base-ui/react` is not version-pinned by the registry item;
today's match with this repo's `^1.0.0` is luck, not a guarantee. And this machine's
default resolver returns `SERVFAIL` for `shadcn-cssinjs.com` — `curl --resolve
www.shadcn-cssinjs.com:443:216.150.1.193` was needed. A live `bunx shadcn@latest add`
against this registry would fail with "could not resolve host" until local DNS is fixed.

---

## 9. Blockers for Phase 2

**None.** No finding in this spike blocks Phase 2 or requires re-planning. Everything the
spec's Phase 0 gate asked for was answered, and it was answered in favour of proceeding.

Carry-overs — none blocking, all cheap, and all worth doing while the reason is fresh:

- **Pin the two Babel packages.** `@babel/preset-typescript` and
  `@babel/plugin-syntax-jsx` are on `^8.0.1` while the `@stylexjs/*` trio is pinned
  exactly. A future major moving the same ground breaks the build with a parse error
  (§4).
- **Enforce "StyleX-valid at commit time" for anything under `packages/*/src`.** The
  include-glob wildcard poisons every consuming app's build otherwise (§6). Cheapest
  enforcement is that `packages/web-ui-stylex` never receives an un-adapted registry file.
- **Move the `@stylex;` import to the root route.** The spike imported `@/stylex.css` from
  `routes/index.tsx` because that is where the probe lived. Every route needs the
  stylesheet.
- **`apps/web`'s `wrangler:dev` script is broken, and it is pre-existing.**
  `wrangler: command not found` — `apps/web` declares no direct `wrangler` dependency
  (only `apps/server` does, at `4.42.1`); it resolves `wrangler` only transitively through
  `@cloudflare/vite-plugin@1.20.1`. Reproduces on `main` with no StyleX present. Phase 1
  copies this script into the clone, so the clone inherits the break. Decide there:
  fix it in the clone, strip it, or leave `apps/web` untouched.
- **`bun add '<pkg>@workspace:*'` needs quoting under zsh.** Unquoted, zsh glob-expands
  the `*` before bun sees it. Trivial, but it cost a cycle; worth a line in the runbook.
- **Registry prop-API redesign is Phase 3 work, and it is per-component** (§8). Not a
  blocker; a sizing correction.

---

## 10. What was NOT tested

Silence here would read as success. It is not.

- **SSR was verified for the PostCSS route only.** `unplugin-stylex` was never run under
  `wrangler dev`/`workerd`; its SSR failure is **inferred** from static manifest analysis
  and from reading the plugin's own source. The inference is strong — the CSS is absent
  from both files TanStack Start reads, and the reviewer independently confirmed no
  `index.html` exists in the build output — but no live workerd request was made against
  it. Deliberate: it was already disqualified, and a workerd run is expensive.
- **The throwaway token package skipped every piece of real package machinery.**
  `packages/design-tokens-probe` had a `package.json` with an `exports` map pointing at
  raw `.ts` source, and nothing else — no `tsconfig.json`, no build step, no
  `check-types`, no `dist`. The real `packages/design-tokens` will carry all of that
  (see `packages/ui-markdown` for this repo's established pattern). The raw cross-package
  `defineVars` mechanism is proven; the packaging around it is not.
- **HMR was only informally observed, and only on the losing route.** The single
  observation is Task 5's `padding: 16 → 24` edit under `unplugin-stylex`, which produced
  a full `[vite] (ssr) page reload` rather than a scoped update. That is standard TanStack
  Start behaviour for an SSR-route component edit and is very likely identical on the
  PostCSS route — but that comparison was **not run**, and no HMR latency was measured on
  either route. It stays on the Phase 1 baseline-metrics list.
- **`packages/web-ui`'s `development` export condition was never exercised.** The spike's
  probe package exported raw TS source directly. `02-plan-review.md` §2.3 asked
  specifically whether the Babel plugin reaches a workspace package consumed through a
  `development` condition; the spike proved transformation for a raw-source package, which
  is the shape `design-tokens` will have, but not that one.
- **No browser was used, anywhere.** Every verification was `curl` + `grep` against SSR
  HTML, built CSS, and manifests (controller ruling R8). This is stronger and reproducible
  for "does it compile and ship CSS", and it is blind to "does it look right". No visual
  regression could have been caught. That is what Phase 1's Playwright compare harness is
  for.
- **`unplugin-stylex` was never tested in vitest**, never tested against the registry
  component, and its plugin ordering was never varied.
- **Plugin ordering was never varied on either route.** The pre-existing five-plugin order
  worked; no ordering experiment was run, so nothing is known about whether other orders
  also work.
- **No performance number was taken.** Build times are recorded (~8 s) but were never
  compared against a Tailwind-only baseline on the same machine, and CSS/JS size deltas
  are meaningless on a probe. All of it belongs to Phase 1 (`04-baseline-metrics.md`),
  by design.
- **One component, not 46.** The registry check compiled `button`. Nothing says the
  remaining 16 primitives in the Phase 3 list — `dropdown-menu` and `select` above all,
  which carry 50 of the hard selectors per `02-plan-review.md` §2.1 — port as cleanly.

---

## 11. Evidence index

The spike branch `spike/stylex-under-web-build` (HEAD `4afd089`) is unmerged and
deliberately kept. Its commits:

| Commit    | What it carries                                                                        |
| --------- | -------------------------------------------------------------------------------------- |
| `a602bd3` | PostCSS route wired: `vite.config.ts`, `postcss.config.cjs`, `stylex.css`, probe       |
| `8f35e61` | `packages/design-tokens-probe` + cross-package `defineVars` consumption                |
| `2e40d3c` | `vitest.config.ts` with `test: true`                                                   |
| `16b1078` | `packages/web-ui-stylex-probe` — shadcn-cssinjs `button` + its two `registry:lib` deps |
| `4afd089` | docs correction to the probe README (change-scope claim)                               |

Tasks 2 and 5 produced no commits — their deliverable is evidence, not code. Full per-task
logs, including every command and its verbatim output, live in
`.superpowers/sdd/2026-08-28-web-stylex-phase-0-1/task-{1..6}-report.md` with the
controller's ledger in `progress.md` alongside them.
