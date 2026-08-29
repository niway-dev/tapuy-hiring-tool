# Migration tracker

**Clone origin:** `apps/web-stylex` was copied from `apps/web` at commit
`11890ed013a7f18e8fb3180ce7f9baa6eac8bf47`.
Features added to `apps/web` after that commit are **not** in `web-stylex` unless
listed here.

## Components (`packages/web-ui-stylex`) — filled in Phase 3

| Component        | Hard selectors | Owner | PR  | Status                                                      |
| ---------------- | -------------: | ----- | --- | ----------------------------------------------------------- |
| label            |              2 |       |     | done                                                        |
| skeleton         |              0 |       |     | todo                                                        |
| badge            |              2 |       |     | todo                                                        |
| status-badge     |              0 |       |     | todo                                                        |
| input            |              0 |       |     | todo                                                        |
| textarea         |              0 |       |     | todo                                                        |
| checkbox         |              0 |       |     | todo                                                        |
| card             |              7 |       |     | todo                                                        |
| alert            |             10 |       |     | todo                                                        |
| table            |              4 |       |     | todo                                                        |
| accordion        |              7 |       |     | todo                                                        |
| button           |             10 |       |     | todo                                                        |
| dialog           |              0 |       |     | todo                                                        |
| alert-dialog     |              6 |       |     | todo                                                        |
| sonner           |              0 |       |     | todo                                                        |
| dropdown-menu    |             30 |       |     | todo                                                        |
| select           |             20 |       |     | todo                                                        |
| tapuy-mark       |              0 |       |     | todo                                                        |
| markdown-content |      plain CSS |       |     | todo                                                        |
| test-component   |              — |       |     | retire — dead scaffold (Tailwind classes), not to be ported |

## App files (`apps/web-stylex/src`) — filled in Phase 4

| Route group    | Files                                                                                                                               | Owner | PR  | Status |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----- | --- | ------ |
| landing        | `routes/index.tsx`                                                                                                                  |       |     | todo   |
| auth           | `routes/auth/*`, `components/sign-in-form.tsx`, `components/sign-up-form.tsx`                                                       |       |     | todo   |
| board/list     | `routes/_authenticated/hiring-processes/index.tsx`, `components/hiring-process/*`                                                   |       |     | todo   |
| detail         | `routes/_authenticated/hiring-processes/$id.tsx`, `components/interaction/*`                                                        |       |     | todo   |
| new/edit       | `routes/_authenticated/hiring-processes/new.tsx`, `$id_.edit.tsx`                                                                   |       |     | todo   |
| shell / chrome | `routes/__root.tsx`, `components/header.tsx`, `components/user-menu.tsx`, `components/locale-switcher.tsx`, `components/loader.tsx` |       |     | todo   |

`shell / chrome` covers the app-wide files not owned by any single route group —
`header.tsx` and `user-menu.tsx` render on every authenticated page, `__root.tsx`
is the document shell (incl. the dark/light critical CSS), and `locale-switcher.tsx`
/ `loader.tsx` are shared chrome. The auth row's route files
(`routes/auth/login.tsx`, `routes/auth/signup.tsx`) are themselves thin pages —
the actual styled forms live in `components/sign-in-form.tsx` /
`components/sign-up-form.tsx`, now named explicitly above. Together, these 7
files carry 36 `className`-bearing lines (verified via
`grep -c className` under `apps/web-stylex/src`), previously not accounted for
by any row in this table.
