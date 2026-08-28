# Spec — `apps/angular-web`: parallel Angular client

**Date:** 2026-08-26
**Branch:** `feat/angular-web` (from `main` @ `82cdf71`)
**Goal:** a second client app, written with Angular 22 and its latest APIs, that consumes
the existing backend (`apps/server`, Elysia + Better Auth) without touching it or replacing `apps/web`.
It serves as Angular practice for a NestJS + Angular interview and as a demonstration
of the framework's state of the art.

Nothing is deleted. `apps/web` remains the production app.

---

## 1. Scope

### Phase 1 — core (this spec)

| Screen                   | Endpoints                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Login / Signup           | `POST /api/auth/sign-in/email`, `POST /api/auth/sign-up/email`, `GET /api/auth/get-session`, `POST /api/auth/sign-out` (via better-auth client) |
| Hiring processes list    | `GET /api/v1/hiring-processes` (page, limit, statuses, salaryDeclared). `scope/stale/sort/dir` don't exist in the API today → phase 2           |
| Detail                   | `GET /api/v1/hiring-processes/:id`                                                                                                              |
| Create / Edit            | `POST /api/v1/hiring-processes`, `PUT /api/v1/hiring-processes/:id`                                                                             |
| Actions from detail/list | `PATCH /:id/status`, `POST /:id/archive`, `POST /:id/restore`, `DELETE /:id`                                                                    |

### Phase 2 — out of this spec

Board (`GET /hiring-processes/board`), company-details and interactions within the detail view, i18n,
theme toggle. Each will get its own short spec.

### Out of scope (permanent)

SSR/hydration, deploying to Cloudflare, PWA, Angular Material. Reusing `packages/web-ui` (it's React).

---

## 2. Stack and decisions

| Decision          | Choice                                                                                                                | Why                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Angular           | **22.1.x** (`latest` on npm as of 2026-08-26), standalone, **zoneless**, no SSR                                       | State of the art; zoneless forces signals throughout the tree.                                                     |
| Package manager   | **bun** (`ng new --package-manager bun`, `cli.packageManager: "bun"`)                                                 | The monorepo is already bun workspaces; `bun run ng` runs the CLI with Node, so the compiler runs where it should. |
| Server state      | **`@tanstack/angular-query-experimental`** 5.x (`injectQuery`/`injectMutation`)                                       | Same mental model and same `queryKeys` as `apps/web`; signals-first, no RxJS.                                      |
| Native comparison | A single `httpResource()` in the detail view (`GET /:id`)                                                             | So we can contrast TanStack vs `resource` in the interview. Not used anywhere else.                                |
| HTTP              | `HttpClient` + `provideHttpClient(withInterceptors([...]), withFetch())`                                              | Functional interceptors are a typical interview question; `withFetch` is the modern default.                       |
| Auth              | `better-auth/client` (vanilla) wrapped in `AuthService` with signals                                                  | Reuses `/api/auth/*` as-is. Version from the root catalog (1.4.18) to match the server.                            |
| Forms             | **Reactive Forms** (`nonNullable` FormBuilder) in create/edit; **Signal Forms** (experimental) in login               | The classic approach where it matters, the new one where the risk is low.                                          |
| Validation        | Zod schemas from `@interviews-tool/domain` (`createHiringProcessSchema`) on submit + synchronous per-field validators | A single source of truth with the server.                                                                          |
| Styles            | Tailwind 4 (`@tailwindcss/postcss`) + custom components                                                               | We reuse the color/typography tokens from `packages/web-ui/src/styles.css` copied into `src/styles.css`.           |
| Tests             | **Vitest** (Angular 22's default runner) with `TestBed`                                                               | Consistent with the rest of the repo (`apps/web`, `packages/*` use vitest).                                        |
| Lint/format       | oxlint + oxfmt from the root (lint-staged already covers `apps/*`)                                                    | We don't add Angular ESLint; the CLI doesn't install it by default.                                                |
| Dev proxy         | `proxy.conf.json`: `/api` → `http://localhost:3000`                                                                   | The server's CORS only allows mobile origins; with the proxy, the session cookie is same-origin.                   |
| Port              | 4200                                                                                                                  | Angular's default; `apps/web` uses 3001 and `server` 3000.                                                         |

### Allowed imports

`apps/angular-web` imports **only** `@interviews-tool/domain` (constants, schemas, types), the same
as `apps/mobile`. Never `application` or `infra-*`. This rule is added to the root `CLAUDE.md`.

---

## 3. Structure

```
apps/angular-web/
  angular.json                 # builder @angular/build:application, packageManager bun
  package.json                 # name: "angular-web"; scripts dev/build/test/check-types
  proxy.conf.json
  tsconfig.json                # strict, paths → ../../packages/domain/src if the symlink isn't enough
  src/
    styles.css                 # @import "tailwindcss" + tokens copied from web-ui
    main.ts
    app/
      app.config.ts            # provideZonelessChangeDetection, provideRouter(withComponentInputBinding),
                               # provideHttpClient(withFetch, withInterceptors), provideTanStackQuery
      app.routes.ts            # lazy loadComponent + authGuard
      app.ts                   # shell: header with user + sign-out, <router-outlet>
      core/
        auth/
          auth.service.ts      # createAuthClient; signals: user, status ('loading'|'authed'|'anon');
                               # signIn/signUp/signOut; refresh() on startup
          auth.guard.ts        # CanActivateFn: waits for status != loading, redirects to /auth/login?redirect=
          guest.guard.ts       # inverse, for /auth/*
        http/
          api-error.ts         # class ApiError { status, message }
          api-error.interceptor.ts  # HttpErrorResponse → ApiError; 401 → authService.clear() + navigate login
        api/
          hiring-processes.api.ts   # HttpClient typed with domain; returns ApiResponse<T>.data
      features/
        auth/
          login.component.ts   # Signal Forms
          signup.component.ts  # Signal Forms (same pattern)
        hiring-processes/
          hiring-process.keys.ts   # copy of apps/web/src/hooks/hiring-process-keys.ts
          hiring-process.queries.ts # injectHiringProcessList(params: Signal), injectHiringProcess(id),
                                    # injectCreate/Update/ChangeStatus/Archive/Restore/Delete mutations
          list/
            list.page.ts       # filters (status, salaryDeclared) as signals + URL query params;
                                # pagination; table
            list-filters.component.ts
            hiring-process-table.component.ts
          detail/
            detail.page.ts     # input() id; httpResource for the GET; actions (status/archive/restore/delete)
            status-menu.component.ts
            archive-dialog.component.ts   # native <dialog>
          form/
            form.page.ts       # create|edit mode based on route; loads with injectHiringProcess in edit
            hiring-process-form.component.ts  # Reactive Forms; output() submit with CreateHiringProcessInput
      shared/
        ui/                    # button, input, select, badge, card, empty-state, spinner, page-header
        pipes/                 # money.pipe (salary + currency + rate), relative-date.pipe
```

Routes:

```
/                          → redirect /hiring-processes
/auth/login, /auth/signup  → guestGuard
/hiring-processes          → authGuard, list.page
/hiring-processes/new      → authGuard, form.page (create)
/hiring-processes/:id      → authGuard, detail.page
/hiring-processes/:id/edit → authGuard, form.page (edit)
```

---

## 4. Data flow

```
component ──signals──▶ injectQuery/injectMutation ──▶ HiringProcessesApi (HttpClient)
                                                            │  interceptor: error→ApiError, 401→login
                                                            ▼
                                             proxy /api → Elysia /api/v1 (session cookie)
```

- The list reads filters/page from the URL (`ActivatedRoute.queryParamMap` → `toSignal`) and writes
  them with `router.navigate({ queryParams })`. The `queryKey` includes the params, so the browser's
  back/forward changes the query automatically.
- Mutations: `onSuccess` → `queryClient.invalidateQueries({ queryKey: hiringProcessKeys.all })` and
  navigation. No optimistic updates in phase 1 (YAGNI; they can be added to archive if there's time left over).
- `AuthService.refresh()` runs in the `APP_INITIALIZER`-equivalent (`provideAppInitializer`) so that
  the guard never sees `loading` on internal navigations.

---

## 5. Errors

| Situation                       | Behavior                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| 401 on any `/api/v1`            | Interceptor clears the session and navigates to `/auth/login?redirect=<url>`.          |
| 404 in detail                   | `detail.page` shows an empty-state "Not found" with a link to the list.                |
| 400/409/422 on the form         | `form.page` shows `ApiError.message` above the submit button; fields keep their value. |
| Failed Zod validation on submit | Controls are marked with `setErrors` from Zod's `issues`; the request is not sent.     |
| Network error                   | Generic banner + "Retry" button that calls `query.refetch()`.                          |

Messages are in English (i18n is phase 2).

---

## 6. Testing

Vitest with `TestBed` and `provideHttpClientTesting`:

- `auth.service.spec.ts` — `refresh()` sets `status`; `signOut` clears `user`.
- `auth.guard.spec.ts` — anon → `UrlTree` to login with `redirect`; authed → `true`.
- `api-error.interceptor.spec.ts` — 401 clears the session and navigates; 500 maps to `ApiError`.
- `hiring-processes.api.spec.ts` — builds correct query params and unwraps `data`.
- `hiring-process-form.component.spec.ts` — required on `companyName`; emits a valid
  `CreateHiringProcessInput`; negative salary blocks submit.
- `list.page.spec.ts` — changing a filter updates the URL's query params.

No e2e in phase 1. Manual verification: `bun run dev:server` + `bun run dev:angular` and walk through
login → list → create → detail → edit → archive → restore.

---

## 7. Monorepo integration

- Root `package.json`: script `dev:angular: turbo run dev -F angular-web`.
- `turbo.json`: no changes (the `dev`, `build`, `test`, `check-types` tasks are already generic).
  The app's build `outputs` is `dist/**`, already covered.
- Root `CLAUDE.md`: add `angular-web` to the imports rule (only `domain`).
- `oxlint`/`oxfmt`: run from the root; if Angular's formatting (decorators with inline templates)
  clashes with oxfmt, `apps/angular-web` is added to the `.oxfmtrc` ignore list, only for the `*.ts`
  files with inline templates — a decision made during the scaffold task with evidence, not before.
- `apps/server` and `apps/web` are not touched.

---

## 8. Known risks

1. **Resolving `@interviews-tool/domain`** with Angular's builder: the plan's first task is
   scaffold + import `HIRING_PROCESS_STATUSES` + `bun run build`. If it fails, fallback: `paths` in
   `tsconfig.json` pointing to `../../packages/domain/src`.
2. **Signal Forms** is experimental; if the 22.1 API doesn't cover what login needs (or breaks in
   zoneless), login falls back to Reactive Forms and it's noted in the spec. It doesn't block anything else.
3. **Session cookie with the proxy**: Better Auth sets the cookie for the host that responds; with
   Angular's proxy, the response arrives from `localhost:4200`, the same origin as the app, so
   `credentials: "include"` is enough. If the server's `BETTER_AUTH_URL` points to another host and
   the cookie comes out with a `Domain`, the local `.env` is adjusted, not code.
