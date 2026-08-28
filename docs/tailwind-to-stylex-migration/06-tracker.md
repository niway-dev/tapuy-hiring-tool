# Migration tracker

**Clone origin:** `apps/web-stylex` was copied from `apps/web` at commit
`11890ed013a7f18e8fb3180ce7f9baa6eac8bf47`.
Features added to `apps/web` after that commit are **not** in `web-stylex` unless
listed here.

## Components (`packages/web-ui-stylex`) — filled in Phase 3

| Component        | Hard selectors | Owner | PR  | Status |
| ---------------- | -------------: | ----- | --- | ------ |
| label            |              2 |       |     | todo   |
| skeleton         |              0 |       |     | todo   |
| badge            |              2 |       |     | todo   |
| status-badge     |              0 |       |     | todo   |
| input            |              0 |       |     | todo   |
| textarea         |              0 |       |     | todo   |
| checkbox         |              0 |       |     | todo   |
| card             |              7 |       |     | todo   |
| alert            |             10 |       |     | todo   |
| table            |              4 |       |     | todo   |
| accordion        |              7 |       |     | todo   |
| button           |             10 |       |     | todo   |
| dialog           |              0 |       |     | todo   |
| alert-dialog     |              6 |       |     | todo   |
| sonner           |              0 |       |     | todo   |
| dropdown-menu    |             30 |       |     | todo   |
| select           |             20 |       |     | todo   |
| tapuy-mark       |              0 |       |     | todo   |
| markdown-content |      plain CSS |       |     | todo   |

## App files (`apps/web-stylex/src`) — filled in Phase 4

| Route group | Files                                                                             | Owner | PR  | Status |
| ----------- | --------------------------------------------------------------------------------- | ----- | --- | ------ |
| landing     | `routes/index.tsx`                                                                |       |     | todo   |
| auth        | `routes/auth/*`                                                                   |       |     | todo   |
| board/list  | `routes/_authenticated/hiring-processes/index.tsx`, `components/hiring-process/*` |       |     | todo   |
| detail      | `routes/_authenticated/hiring-processes/$id.tsx`, `components/interaction/*`      |       |     | todo   |
| new/edit    | `routes/_authenticated/hiring-processes/new.tsx`, `$id_.edit.tsx`                 |       |     | todo   |
