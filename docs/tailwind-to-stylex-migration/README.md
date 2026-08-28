# Tailwind → StyleX migration

Working folder for the `apps/web-v2` experiment: a second web client that renders
the same product as `apps/web` but with StyleX instead of Tailwind, so the two can
be compared side by side inside the same monorepo.

Everything produced during this effort lives here — analysis, specs, measurements,
decisions, notes.

## Documents

| File                                                                                                                 | What it is                                                            | Status   |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------- |
| [`01-baseline-analysis.md`](./01-baseline-analysis.md)                                                               | Measured state of styling in this repo today, before any change       | Done     |
| [`02-plan-review.md`](./02-plan-review.md)                                                                           | Gaps found, two corrections, and the revised 6-phase plan             | Done     |
| [`spec-web-stylex.md`](./spec-web-stylex.md)                                                                         | The approved design: decisions, structure, conventions, phases, gates | Approved |
| [`../superpowers/plans/2026-08-28-web-stylex-phase-0-1.md`](../superpowers/plans/2026-08-28-web-stylex-phase-0-1.md) | Implementation plan: phase 0 spike + phase 1 clone and harness        | Ready    |

## Ground rules for this folder

- **Every number is labelled** `measured`, `quoted` or `unverified`, with the command
  used, so it can be re-run and challenged.
- **Baseline before change.** No claim about StyleX being better ships without the
  Tailwind number it is being compared against.
- **Report what the numbers support**, not what the experiment hoped to find. A
  negative result is a result.
