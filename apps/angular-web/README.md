# angular-web

Angular 22 client for the hiring tool. Runs next to `apps/web` (the production React client)
and talks to the same `apps/server` API through a dev proxy.

## Run

```bash
# once: Angular 22 needs Node >= 24.15
source ~/.nvm/nvm.sh && nvm use 24

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

Rule: this app imports only `@interviews-tool/domain`.
