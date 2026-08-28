# angular-web

Angular 22 client for the hiring tool. Runs next to `apps/web` (the production React client)
and talks to the same `apps/server` API through a dev proxy.

## Run

**One-time setup:** add this client's origin to the API's `CORS_ORIGIN`, or every
sign-in from the browser fails with `Invalid origin` (HTTP 403). Better Auth
validates the `Origin` header against that list, so `:4200` has to be in it:

```
# apps/server/.env
CORS_ORIGIN=http://localhost:3001,http://localhost:4200
```

Note this only bites in a real browser — `curl` sends neither a cookie nor the
`Sec-Fetch-*` headers that trigger the check, so the endpoint answers 200 from a
terminal while the app cannot log in.

```bash
# Node: the repo pins 22.23.2 in the root .nvmrc, which satisfies the Angular CLI
source ~/.nvm/nvm.sh && nvm use

# terminal 1 — API on :3000
bun run dev:server

# terminal 2 — Angular on :4200 (proxies /api → :3000)
bun run dev:angular
```

## Test / build

```bash
cd apps/angular-web
bun run test          # vitest (jsdom) through `ng test`
bun run build
bun run check-types
```

## Where things are

- `src/app/core/auth` — Better Auth client wrapped in a signal-based `AuthService` + functional guards
- `src/app/core/http` — `ApiError` + functional interceptor (401 → login)
- `src/app/core/api` — `HiringProcessesApi` (HttpClient, typed with `@interviews-tool/domain`)
- `src/app/features/hiring-processes` — TanStack Query factories, list / form / detail pages
- `src/app/features/auth` — login & signup with Signal Forms
- The detail page uses `httpResource` on purpose, to compare it with TanStack Query.
- `src/app/features/hiring-processes/detail/interactions` — timeline, quick capture, edit/delete dialogs
- Markdown is rendered with `marked` through `[innerHTML]`; Angular sanitizes it, and the normalizer is shared with the React client via `@interviews-tool/ui-markdown`.

Rule: this app imports only `@interviews-tool/domain` and `@interviews-tool/ui-markdown`.
