# Visual-diff harness

Playwright-based pixel comparison between `apps/web` (Tailwind, the deployed
product) and `apps/web-stylex` (its clone, migrating to StyleX). It's the
safety net for that migration: every future StyleX PR runs this to prove the
page it touched still renders the same pixels as `apps/web`, before/after
comparison across apps rather than within one.

- **baseline** = `apps/web`, expected at `http://localhost:3001`
- **candidate** = `apps/web-stylex`, expected at `http://localhost:3002`

For each route × viewport × theme it screenshots both origins, pixel-diffs
them (`pixelmatch`), and writes `compare/output/{baseline,candidate,diff}/*.png`
plus `compare/output/summary.json`.

## Running it

From `apps/web-stylex`:

```bash
bun run compare                    # full 28-screenshot matrix (7 routes × 2 viewports × 2 themes)
COMPARE_ONLY_PUBLIC=1 bun run compare   # 12 screenshots: the 3 unauthenticated routes only
```

Both dev servers must already be running — the harness doesn't start them.
**Start `dev:web` before `dev:web-stylex`, always in that order.** Starting
`web-stylex` first crashes `apps/web`'s Cloudflare plugin with
`EADDRINUSE:9229` on the inspector port, which has no fallback:

```bash
bun run dev:web          # from repo root, wait for it to be ready
bun run dev:web-stylex   # from repo root, then this
```

The full run also needs a logged-in session for the 4 authenticated routes
(`processes`, `process-new`, `process-detail`, `process-edit`); run
`bun run compare:update-auth` once beforehand (needs `COMPARE_EMAIL` /
`COMPARE_PASSWORD`, see below) to seed `compare/.auth/{baseline,candidate}.json`.
`COMPARE_ONLY_PUBLIC=1` skips all of this — no login, no auth project
dependency.

## Environment variables

| Variable              | Default                 | Purpose                                                                                                                                     |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `COMPARE_BASELINE`    | `http://localhost:3001` | Origin for `apps/web`.                                                                                                                      |
| `COMPARE_CANDIDATE`   | `http://localhost:3002` | Origin for `apps/web-stylex`.                                                                                                               |
| `COMPARE_ONLY_PUBLIC` | unset                   | Set to `1` to restrict the run to the 3 unauthenticated routes; drops the `auth` project dependency entirely, so no credentials are needed. |
| `COMPARE_EMAIL`       | —                       | Login email for the `auth` setup project. Required unless `COMPARE_ONLY_PUBLIC=1`.                                                          |
| `COMPARE_PASSWORD`    | —                       | Login password for the `auth` setup project. Required unless `COMPARE_ONLY_PUBLIC=1`.                                                       |

If you change `CORS_ORIGIN` in `apps/server/.env` to add an origin (e.g. a
non-default candidate port), **restart the `:3000` API server** —
better-auth reads trusted origins at process startup, so a server left
running from before the change will reject `:3002` logins with
`403 INVALID_ORIGIN` even though the env var is now correct on disk.

## Threshold

`report.ts` fails (`process.exit(1)`) any screenshot whose diff exceeds
**0.1%**. If a diff crosses that line: investigate it (open
`compare/output/diff/<id>.png` next to the `baseline`/`candidate` pair for
that id) — never raise the threshold to make it pass. A real visual
regression is exactly what this harness exists to catch.

## Current coverage

12 of the 28 defined screenshots have actually been run (all under
`COMPARE_ONLY_PUBLIC=1`): the 3 public routes (`landing`, `login`, `signup`) ×
2 viewports × 2 themes, all passing at 0.000%. The 4 authenticated routes (16
screenshots) have never run — they need a seeded account's
`COMPARE_EMAIL`/`COMPARE_PASSWORD`, which hasn't been available yet. Anyone
citing this harness's result should say what it covers, not just quote the
percentage.
