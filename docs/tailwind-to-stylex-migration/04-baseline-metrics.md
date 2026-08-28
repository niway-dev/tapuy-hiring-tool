# Baseline metrics — before any StyleX

**Date:** 2026-08-28 · **Commit:** `7f4a6607aa297a187c4db5e20cb36d087be274e1` (branch `feat/web-stylex-clone`)
**Machine:** MacBook Pro, model `Mac16,8`, 24 GB RAM (`hw.memsize` = 25769803776 bytes), macOS 26.5.1 (build 25F80)
**Node:** v24.20.0 (via `nvm use 24.20.0`) · **Bun:** 1.3.4

Both apps were measured with identical commands, run inside each app's own directory
(`cd apps/web` / `cd apps/web-stylex`) rather than through `turbo`, specifically to
avoid Turbo's task cache distorting cold-build numbers. At this commit `apps/web-stylex`
is a verbatim clone of `apps/web/src` (confirmed below), so the pairs are expected to
match — and mostly do.

## Clone-fidelity check

```bash
diff -rq apps/web/src apps/web-stylex/src
```

Output: **empty**. `src/` is byte-identical between the two apps. The only
differences between the two app directories are expected deployment/tooling
config: dev-server port (3001 vs 3002), Wrangler `name`/`routes`, `package.json`
name and the `compare/` Playwright visual-diff harness (only in `web-stylex`),
and `apps/web` alone carries `alchemy.run.ts` / the `alchemy` deploy dependency.

## Results

| Metric                                                 |       web | web-stylex | Command                                                                                                                    |
| ------------------------------------------------------ | --------: | ---------: | -------------------------------------------------------------------------------------------------------------------------- |
| CSS, raw (bytes)                                       |   113,676 |    113,676 | `find dist/client -name '*.css' -exec cat {} + \| wc -c`                                                                   |
| CSS, gzip (bytes)                                      |    21,271 |     21,271 | `find dist/client -name '*.css' -exec cat {} + \| gzip -c \| wc -c`                                                        |
| Client JS, raw (bytes)                                 | 1,355,444 |  1,369,007 | `find dist/client -name '*.js' -exec cat {} + \| wc -c`                                                                    |
| Client JS, gzip (bytes)                                |   399,410 |    402,043 | `find dist/client -name '*.js' -exec cat {} + \| gzip -c \| wc -c`                                                         |
| Cold build, run 1 (s)                                  |      6.19 |       5.48 | `rm -rf dist node_modules/.vite .tanstack && /usr/bin/time -p bun run build`                                               |
| Cold build, run 2 (s)                                  |      5.94 |       5.11 | same, second run                                                                                                           |
| Incremental build, run 1 (s)                           |      6.03 |       5.07 | `touch src/components/hiring-process/process-board-card.tsx && /usr/bin/time -p bun run build`                             |
| Incremental build, run 2 (s)                           |      6.24 |       5.17 | same, second run                                                                                                           |
| Dev cold start, run 1 (ms)                             |     2,368 |      1,811 | `rm -rf node_modules/.vite .tanstack && bun run dev`, Vite's own "ready in" line                                           |
| Dev cold start, run 2 (ms)                             |     1,906 |      1,740 | same, second run                                                                                                           |
| HMR latency, median of 3 (ms)                          |    114.97 |     113.48 | programmatic proxy, see Method notes — **not** the browser-observed number the brief describes                             |
| Duplicated token declarations across packages          |        52 |          — | `01-baseline-analysis.md` §1 script, re-run (see below); monorepo-wide metric, not per-app                                 |
| `cn()` call sites                                      |        83 |         83 | `01-baseline-analysis.md` §4 script, re-run (see below); identical because `src/` is byte-identical                        |
| Runtime style-merge JS (tailwind-merge+clsx+cva), gzip |    8.4 KB |     8.4 KB | carried from `02-plan-review.md` / `spec-web-stylex.md` (commit `ad760c0`) — not re-derived in this task, see Method notes |
| StyleX runtime, gzip (for comparison, not yet present) |         — |          — | carried from `spec-web-stylex.md`: 0.97 KB                                                                                 |

### Re-run of the token-duplication script (`01-baseline-analysis.md` §1)

```bash
grep -oE '^\s*--[a-z0-9-]+:' packages/web-ui/src/styles.css | tr -d ' :' | sort -u > a.txt
grep -oE '^\s*--[a-z0-9-]+:' apps/angular-web/src/styles.css | tr -d ' :' | sort -u > b.txt
wc -l a.txt b.txt; comm -12 a.txt b.txt | wc -l
```

Result: 120 tokens in `packages/web-ui`, 52 tokens in `apps/angular-web`, **52** in
both — reproduces the documented figure exactly. This script does not touch
`apps/web` or `apps/web-stylex` at all, so there is only one number, not a pair.

### Re-run of the `cn()` count (`01-baseline-analysis.md` §4)

```bash
grep -roE '\bcn\(' apps/web/src packages/web-ui/src | wc -l
```

Result: **83** (14 in `apps/web/src`, 69 in `packages/web-ui/src`) — reproduces the
documented figure exactly. Since `apps/web-stylex/src` is byte-identical to
`apps/web/src`, the same count applies to `web-stylex`.

## The one metric pair that does NOT match: client JS size

CSS matches to the byte, in both raw and gzip form, confirming the styling layer
really is an untouched clone. Client JS does **not** match:

- raw: web 1,355,444 vs web-stylex 1,369,007 → **+13,563 bytes (+1.0%)**
- gzip: web 399,410 vs web-stylex 402,043 → **+2,633 bytes (+0.7%)**

**Update (2026-08-28, HEAD `39dad38`):** a follow-up elimination experiment
strengthened the evidence for this divergence and closed off most of the candidate
causes. See "Divergence evidence and elimination experiment" immediately below —
and, more importantly, "Comparison methodology for Phase 5" further down, which
changes how this whole document should be used.

### Divergence evidence and elimination experiment

**The divergence is real and exactly reproducible.** Three independent cold builds
were run per app: `rm -rf dist node_modules/.vite .tanstack && NODE_ENV=production
bun run build`, then `find dist/client -name '*.js' -exec cat {} + | wc -c` (and the
`| gzip -c | wc -c` equivalent). Within-app variance across all three runs was
**exactly zero**, raw and gzip, for both apps. The between-app gap was **exactly
+13,563 B on every single run**. This refutes build non-determinism as an
explanation — not merely weakens it — and supersedes this document's earlier
"two consecutive builds" note with a third, independently confirming run.

**The gap is localised to two chunks, and nothing extra is being emitted.** Both
apps emit the same 14 client JS chunks — no extra chunk in either app. Per-file
comparison of `dist/client/assets/*.js` shows every chunk byte-identical in size
between the two apps **except two**: the `external-*.js` vendor chunk (159,576 B in
web vs 169,055 B in web-stylex, **+9,479 B**) and the `main-*.js` entry chunk
(985,803 B vs 989,887 B, **+4,084 B**). Together that accounts for the full
13,563-byte gap, exactly. `grep`-ing both chunks for `pixelmatch`, `pngjs`,
`playwright`, and `alchemy` (the packages that differ between the two
`package.json` files) found no matches in either bundle, so nothing from the
`compare/` harness or the `alchemy` deploy tooling is leaking into the client
bundle directly.

**The `package.json` dependency graph is eliminated as the cause.** A controlled
elimination was run on `apps/web-stylex` only (`apps/web` untouched throughout),
rebuilding after each cumulative change with the same command and byte-count
method as above:

| #        | Change (cumulative)                                                      | Client JS raw (B) |   Gap closed?    |
| -------- | ------------------------------------------------------------------------ | ----------------: | :--------------: |
| Baseline | committed `package.json`                                                 |         1,369,007 |        —         |
| P1       | remove `wrangler` devDependency                                          |         1,369,007 | No — zero change |
| P2       | P1 + add back `alchemy` devDependency                                    |         1,369,007 | No — zero change |
| P3       | P2 + remove `@playwright/test`, `pixelmatch`, `pngjs` (+ their `@types`) |         1,369,007 | No — zero change |

All three permutations reproduced **exactly** 1,369,007 B — byte for byte identical
to the unmodified clone. (P1 in isolation doesn't fully remove `wrangler` from the
resolved dependency tree — `@cloudflare/vite-plugin` pulls it in as a peer
dependency, still satisfied via `apps/web`'s own direct dependency on the shared
`bun.lock` — but P2 and P3 layer further, different changes onto the same
dependency surface and still reproduce the identical byte count, so this doesn't
weaken the conclusion.) `wrangler`/`alchemy`/test-tooling presence or absence in
`package.json` has no effect on `@cloudflare/vite-plugin`'s client output for this
build.

**What remains untested, and why it stays that way here:** the only structural
difference between the two apps' build-relevant config that was never eliminated is
`wrangler.jsonc`: `apps/web`'s has `name: hiring-tool-web` and a production
`routes` block pointing at the real `tapuy.dev` / `www.tapuy.dev` zones;
`apps/web-stylex`'s has `name: hiring-tool-web-stylex` and no `routes` block at
all, and the `routes` array and the `name` field have not been isolated from each
other. A prior attempt to mirror `web`'s `routes` block into `web-stylex`'s
`wrangler.jsonc` and rebuild was blocked by the harness's safety classifier (it
treats edits that add real production routing config as sensitive) and was
reverted before completing (`git diff -- apps/web-stylex/wrangler.jsonc` empty).
Editing `wrangler.jsonc` is out of scope for this task too. **The `routes`/`name`
attribution therefore remains unproven — but with the entire `package.json`
dependency graph now eliminated, it is the leading remaining candidate rather than
one guess among several.**

**Rejected fix, on purpose:** copying `apps/web`'s `routes` array into
`apps/web-stylex`'s `wrangler.jsonc` would probably make the byte counts agree.
This was deliberately not done. `apps/web-stylex` is not a deployed app; giving it
a `routes` block pointing at `tapuy.dev` / `www.tapuy.dev` would make a
non-deployed app capable of claiming real production traffic on those zones. That
risk is not worth taking for tidier baseline numbers — especially now that the
methodology change below means the two apps' byte counts no longer need to agree
for Phase 5 to proceed correctly.

The same divergence also shows up in build **time** (see below), which is
consistent with — but again does not prove — the same root cause: `web-stylex`'s
routeless config is consistently faster to build than `web`'s.

This divergence pre-dates any StyleX work (`web-stylex` at this commit is a plain
clone) and is unrelated to Tailwind vs. StyleX; it should not be attributed to the
migration in any future write-up. Per "Comparison methodology for Phase 5" below,
it also should not be _subtracted_ from a future cross-app comparison — the
correct fix is not to make cross-app byte comparisons at all.

## Comparison methodology for Phase 5 — read this before measuring any StyleX delta

**Cross-app byte comparison (`apps/web` vs `apps/web-stylex`) is confounded and
must not be used to judge whether StyleX changed the bundle.** The 13,563 B raw /
2,633 B gzip client-JS gap documented above is real, exactly reproducible across
three independent runs, and not caused by build non-determinism or the
`package.json` dependency graph — but its root cause is still unproven (leading
candidate: `wrangler.jsonc`'s `routes` array and/or `name` field, see above). Any
comparison that puts `apps/web`'s numbers on one side and `apps/web-stylex`'s on
the other carries this confound, whether or not anyone remembers to subtract it —
and subtracting an unproven offset is not a substitute for eliminating it.

**The correct comparison is within `apps/web-stylex`, not across apps:**
`apps/web-stylex` with Tailwind (this document's baseline — client JS
**1,369,007 B raw / 402,043 B gzip**, both `measured` above) vs. `apps/web-stylex`
with StyleX (to be `measured` in Phase 5, after the migration lands on this same
app). A within-app comparison holds the build configuration — `wrangler.jsonc`,
`package.json`, port, everything — constant by construction, so the 13,563 B
confound cannot enter it. No root cause needs to be found for this comparison to
be valid.

**Consequence: `apps/web-stylex`'s own baseline row is the one that matters** for
the eventual "did StyleX shrink the bundle" claim — specifically the Client JS raw
and gzip figures in the Results table above. `apps/web`'s numbers remain useful
context (they're the reference implementation the clone was made from, and they're
what confirmed the CSS/styling layer is untouched) but they are **not** the
comparison baseline for any StyleX delta.

**The visual-diff harness (`apps/web-stylex/compare/`) is unaffected by any of
this.** It compares rendered pixels between the two apps' live pages, not build
output bytes, and its result today is a **0.00% diff**. That result shows the two
apps render identically regardless of how their JS is chunked or packaged — it is
a separate, orthogonal instrument from the byte-count metrics in this document,
and Phase 5 should keep using it to confirm nothing visually broke, independent of
which bundle-size comparison is used.

## Build-time gap between the two apps

Every cold-build and incremental-build run measured `web-stylex` at roughly
0.6–1.1 s faster than `web` (cold: 6.19/5.94 s vs 5.48/5.11 s; incremental:
6.03/6.24 s vs 5.07/5.17 s). This is consistent across every run and lines up with
the same `wrangler.jsonc` `routes`/`name` divergence discussed above (extra
route-pattern handling in `@cloudflare/vite-plugin`'s SSR build step is a
plausible explanation), but — as with the JS-size gap — this is an observed
correlation, not a confirmed cause. It is not a StyleX effect since no StyleX code
exists at this commit.

## Known measurement hazard: SSR bundle chunk hashes are not reproducible

Verified directly: two consecutive cold builds of `apps/web` (and, separately, of
`apps/web-stylex`) produced **identical byte sizes** for every CSS/JS output but
**different content hashes in every asset filename** (e.g.
`dist/server/assets/router-3x-nTUs0.js` in build 1 became
`dist/server/assets/router-CBNU7JnW.js` in build 2, same 1,380.71 kB size; the
client chunk hashes changed the same way). This confirms the finding from earlier
work in this project: **compare output sizes, never filenames/hashes**, when
diffing builds of this repo — a hash difference alone is not evidence of a content
change.

## HMR latency — method and limitations

The brief's method (open the app in a browser, edit a class in
`process-board-card.tsx`, save, and read the `[vite] hot updated` console
timestamp relative to the save, 3 times, take the median) requires a human or a
driven browser session and was **not performed** that way — I did not open a
real browser against either dev server.

Instead I used a defensible programmatic proxy for the **server-side half** of
HMR latency: with `bun run dev` running, I opened a raw WebSocket to Vite's HMR
endpoint (`ws://localhost:<port>/?token=<wsToken>`, subprotocol `vite-hmr`,
token scraped from `GET /@vite/client`), first "warmed" the target module into
Vite's module graph with `GET /src/components/hiring-process/process-board-card.tsx`
(a real browser visiting a page that imports the component would do this
implicitly), then measured wall-clock time from `writeFileSync` on the component
file (prepending a harmless comment marker, then restoring the original content
immediately after each sample) to receipt of the corresponding `update` message
over the WebSocket. Repeated 3 times per app, as the brief specifies, and took the
median. Script: `hmr-probe.ts`, not committed (scratchpad only).

Results — web: `[142.76, 114.97, 13.20]` ms, median **114.97 ms**. web-stylex:
`[123.05, 113.48, 12.41]` ms, median **113.48 ms**. Both apps show the same
shape (first sample slowest, third fastest by an order of magnitude), most likely
transform/plugin warm-up on the first invalidation after the module was freshly
registered in the graph — this is itself a caveat on the "median of 3" method for
a cold module.

**What this number is not:** it excludes the WebSocket→browser message delivery,
the browser executing the accepted module update, and React Fast Refresh's actual
re-render — i.e., everything a human watching `[vite] hot updated` in the console
would perceive after the number reported here. It should be read as a **lower
bound** on real HMR latency, useful for comparing the two apps against each other
(which it does show as near-identical, as expected for two Tailwind clones) but
**not** as the number a developer would experience. A human capturing the real
number would: open both dev servers in a browser tab each, open devtools console,
edit a class in `process-board-card.tsx`, save, and diff the save timestamp
against the `[vite] hot updated` console line, repeated 3x per app.

## Method notes

- **Turbo caching avoided by design.** All timing commands were run with
  `cd apps/<app>` and `bun run build` / `bun run dev` directly — never through
  `turbo run build`/`turbo run dev` — specifically so Turbo's remote/local task
  cache could not shortcut a "cold" build. This is the "measure inside the app
  directory directly" option from the brief, not `--force`.
- **Cold build definition.** `rm -rf dist node_modules/.vite .tanstack` was run
  immediately before every cold-build timing, for both apps, both runs.
- **Incremental build definition.** Ran directly after the preceding cold/
  incremental build with `dist` and caches left in place, after
  `touch src/components/hiring-process/process-board-card.tsx`. Per the task's
  safety constraint, `apps/web` was only ever `touch`ed (mtime-only), never
  edited; `git diff main -- apps/web` is empty at the end of this task (see
  below). Note `bun run build` (a Vite **production** build, not `vite dev`) does
  not appear to use a meaningfully different code path for a touched-but-
  content-unchanged file vs. a cold build in this setup — incremental times were
  close to but not always faster than cold-build times, which is expected since
  Rollup's production build largely re-does its whole graph regardless of what
  changed on disk.
- **Dev cold start definition.** `rm -rf node_modules/.vite .tanstack`, then
  `bun run dev` backgrounded, polling the log for Vite's own `ready in <n> ms`
  line (which is Vite's self-reported number, more precise than wall-clock
  polling at 250 ms granularity, and is what's reported in the table).
- **Server dependency.** No API server (`apps/server`, normally on port 3000) was
  running at any point during this task (`lsof -ti:3000` returned nothing
  throughout) and none was started — build, cold-start, and the HMR proxy above
  do not require it. Per the task constraints, if one had already been running it
  would have been reused and never killed.
- **Dev-server order.** Per the task's known hazard, `web`'s dev server was
  always started, measured, and killed before `web-stylex`'s dev server was ever
  started, to avoid the previously-observed `EADDRINUSE:9229` crash from starting
  them in the reverse order. The two dev servers were never run concurrently in
  this task.
- **Ports.** `web`'s `vite dev` binds :3001, `web-stylex`'s binds :3002 (both
  apps' own `vite.config.ts`, pre-existing, unrelated to this task).
- **The `wrangler.jsonc` experiment.** Documented in full above (JS-size section).
  The file was restored to its committed state
  (`git diff -- apps/web-stylex/wrangler.jsonc` empty) before any further
  measurement was taken; none of the numbers in this document's table were
  produced with the modified file in place.
- **Runtime style-merge JS (8.4 KB gzip) and StyleX runtime (0.97 KB gzip)**
  were **not** independently re-derived in this task — the brief explicitly
  lists these as already-established figures to carry into the table, sourced
  from `spec-web-stylex.md` / `02-plan-review.md` (commit `ad760c0`, not on this
  branch's history under that path — retrieved via `git show`). As a rough
  sanity check only (not a substitute measurement — unminified, un-tree-shaken,
  un-bundled source, not what actually ships), gzipping the three packages'
  published `dist` entry files directly gives `tailwind-merge` 16.7 KB,
  `class-variance-authority` 1.0 KB, `clsx` 0.2 KB — much larger than 8.4 KB,
  as expected, since minification and tree-shaking inside the real app bundle
  are not reflected in that check.
- **Machine load.** No other build/dev processes were intentionally left running
  during any timed measurement; each dev server started for a measurement was
  killed immediately after its measurement completed and before the next one
  started, and cold-start ports (3001, 3002) were confirmed free before each
  start.
- **`apps/web` untouched.** Verified at the end of this task:
  `git diff main -- apps/web` produces no output, and `git status --porcelain`
  for the whole repo is clean.
