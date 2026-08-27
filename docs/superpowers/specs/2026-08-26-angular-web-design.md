# Spec — `apps/angular-web`: cliente Angular en paralelo

**Fecha:** 2026-08-26
**Rama:** `feat/angular-web` (desde `main` @ `82cdf71`)
**Objetivo:** una segunda app cliente, escrita con Angular 22 y sus APIs más recientes, que consuma
el backend existente (`apps/server`, Elysia + Better Auth) sin tocarlo ni reemplazar `apps/web`.
Sirve como práctica de Angular de cara a una entrevista NestJS + Angular y como demostración
del estado del arte del framework.

No se borra nada. `apps/web` sigue siendo la app de producción.

---

## 1. Alcance

### Fase 1 — core (este spec)

| Pantalla                     | Endpoints                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Login / Signup               | `POST /api/auth/sign-in/email`, `POST /api/auth/sign-up/email`, `GET /api/auth/get-session`, `POST /api/auth/sign-out` (vía better-auth client) |
| Lista de hiring processes    | `GET /api/v1/hiring-processes` (page, limit, statuses, salaryDeclared). `scope/stale/sort/dir` no existen en la API hoy → fase 2                |
| Detalle                      | `GET /api/v1/hiring-processes/:id`                                                                                                              |
| Crear / Editar               | `POST /api/v1/hiring-processes`, `PUT /api/v1/hiring-processes/:id`                                                                             |
| Acciones desde detalle/lista | `PATCH /:id/status`, `POST /:id/archive`, `POST /:id/restore`, `DELETE /:id`                                                                    |

### Fase 2 — fuera de este spec

Board (`GET /hiring-processes/board`), company-details e interactions dentro del detalle, i18n,
theme toggle. Cada una tendrá su propio spec corto.

### Fuera de alcance (permanente)

SSR/hydration, deploy a Cloudflare, PWA, Angular Material. Reutilizar `packages/web-ui` (es React).

---

## 2. Stack y decisiones

| Decisión           | Elección                                                                                                          | Por qué                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Angular            | **22.1.x** (`latest` en npm al 2026-08-26), standalone, **zoneless**, sin SSR                                     | Estado del arte; zoneless obliga a signals en todo el árbol.                                                    |
| Package manager    | **bun** (`ng new --package-manager bun`, `cli.packageManager: "bun"`)                                             | El monorepo ya es bun workspaces; `bun run ng` ejecuta el CLI con Node, así que el compilador corre donde debe. |
| Server state       | **`@tanstack/angular-query-experimental`** 5.x (`injectQuery`/`injectMutation`)                                   | Mismo modelo mental y mismas `queryKeys` que `apps/web`; signals-first, sin RxJS.                               |
| Comparación nativa | Un único `httpResource()` en el detalle (`GET /:id`)                                                              | Para poder contrastar TanStack vs `resource` en la entrevista. No se usa en ningún otro sitio.                  |
| HTTP               | `HttpClient` + `provideHttpClient(withInterceptors([...]), withFetch())`                                          | Interceptors funcionales son pregunta típica; `withFetch` es el default moderno.                                |
| Auth               | `better-auth/client` (vanilla) envuelto en `AuthService` con signals                                              | Reutiliza `/api/auth/*` tal cual. Versión del catalog raíz (1.4.18) para coincidir con el server.               |
| Forms              | **Reactive Forms** (`nonNullable` FormBuilder) en crear/editar; **Signal Forms** (experimental) en login          | C: lo clásico donde importa, lo nuevo donde el riesgo es bajo.                                                  |
| Validación         | Schemas Zod de `@interviews-tool/domain` (`createHiringProcessSchema`) en submit + validators sincronos por campo | Una única fuente de verdad con el server.                                                                       |
| Estilos            | Tailwind 4 (`@tailwindcss/postcss`) + componentes propios                                                         | Reutilizamos los tokens de color/tipografía de `packages/web-ui/src/styles.css` copiados a `src/styles.css`.    |
| Tests              | **Vitest** (runner por defecto de Angular 22) con `TestBed`                                                       | Coherente con el resto del repo (`apps/web`, `packages/*` usan vitest).                                         |
| Lint/format        | oxlint + oxfmt desde la raíz (lint-staged ya cubre `apps/*`)                                                      | No añadimos ESLint de Angular; el CLI no lo instala por defecto.                                                |
| Dev proxy          | `proxy.conf.json`: `/api` → `http://localhost:3000`                                                               | El CORS del server solo admite orígenes mobile; con proxy la cookie de sesión es same-origin.                   |
| Puerto             | 4200                                                                                                              | Default de Angular; `apps/web` usa 3001 y `server` 3000.                                                        |

### Imports permitidos

`apps/angular-web` importa **solo** `@interviews-tool/domain` (constants, schemas, types), igual
que `apps/mobile`. Nunca `application` ni `infra-*`. Se añade esta regla al `CLAUDE.md` raíz.

---

## 3. Estructura

```
apps/angular-web/
  angular.json                 # builder @angular/build:application, packageManager bun
  package.json                 # name: "angular-web"; scripts dev/build/test/check-types
  proxy.conf.json
  tsconfig.json                # strict, paths → ../../packages/domain/src si el symlink no basta
  src/
    styles.css                 # @import "tailwindcss" + tokens copiados de web-ui
    main.ts
    app/
      app.config.ts            # provideZonelessChangeDetection, provideRouter(withComponentInputBinding),
                               # provideHttpClient(withFetch, withInterceptors), provideTanStackQuery
      app.routes.ts            # lazy loadComponent + authGuard
      app.ts                   # shell: header con user + sign-out, <router-outlet>
      core/
        auth/
          auth.service.ts      # createAuthClient; signals: user, status ('loading'|'authed'|'anon');
                               # signIn/signUp/signOut; refresh() al arrancar
          auth.guard.ts        # CanActivateFn: espera status != loading, redirige a /auth/login?redirect=
          guest.guard.ts       # inverso, para /auth/*
        http/
          api-error.ts         # class ApiError { status, message }
          api-error.interceptor.ts  # HttpErrorResponse → ApiError; 401 → authService.clear() + navigate login
        api/
          hiring-processes.api.ts   # HttpClient tipado con domain; devuelve ApiResponse<T>.data
      features/
        auth/
          login.component.ts   # Signal Forms
          signup.component.ts  # Signal Forms (mismo patrón)
        hiring-processes/
          hiring-process.keys.ts   # copia de apps/web/src/hooks/hiring-process-keys.ts
          hiring-process.queries.ts # injectHiringProcessList(params: Signal), injectHiringProcess(id),
                                    # injectCreate/Update/ChangeStatus/Archive/Restore/Delete mutations
          list/
            list.page.ts       # filtros (status, scope active|archived, stale) en signals + URL query params;
                               # paginación; tabla
            list-filters.component.ts
            hiring-process-table.component.ts
          detail/
            detail.page.ts     # input() id; httpResource para el GET; acciones (status/archive/restore/delete)
            status-menu.component.ts
            archive-dialog.component.ts   # <dialog> nativo
          form/
            form.page.ts       # modo create|edit según ruta; carga con injectHiringProcess en edit
            hiring-process-form.component.ts  # Reactive Forms; output() submit con CreateHiringProcessInput
      shared/
        ui/                    # button, input, select, badge, card, empty-state, spinner, page-header
        pipes/                 # money.pipe (salary + currency + rate), relative-date.pipe
```

Rutas:

```
/                          → redirect /hiring-processes
/auth/login, /auth/signup  → guestGuard
/hiring-processes          → authGuard, list.page
/hiring-processes/new      → authGuard, form.page (create)
/hiring-processes/:id      → authGuard, detail.page
/hiring-processes/:id/edit → authGuard, form.page (edit)
```

---

## 4. Flujo de datos

```
component ──signals──▶ injectQuery/injectMutation ──▶ HiringProcessesApi (HttpClient)
                                                            │  interceptor: error→ApiError, 401→login
                                                            ▼
                                             proxy /api → Elysia /api/v1 (cookie de sesión)
```

- La lista lee filtros/página de la URL (`ActivatedRoute.queryParamMap` → `toSignal`) y los escribe
  con `router.navigate({ queryParams })`. La `queryKey` incluye los params, así el back/forward del
  browser cambia la query automáticamente.
- Mutations: `onSuccess` → `queryClient.invalidateQueries({ queryKey: hiringProcessKeys.all })` y
  navegación. Sin optimistic updates en fase 1 (YAGNI; se pueden añadir en archive si sobra tiempo).
- `AuthService.refresh()` corre en `APP_INITIALIZER`-equivalente (`provideAppInitializer`) para que
  el guard nunca vea `loading` en navegaciones internas.

---

## 5. Errores

| Situación                        | Comportamiento                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| 401 en cualquier `/api/v1`       | Interceptor limpia sesión y navega a `/auth/login?redirect=<url>`.                              |
| 404 en detalle                   | `detail.page` muestra empty-state "No encontrado" con link a la lista.                          |
| 400/409/422 en formulario        | `form.page` muestra `ApiError.message` sobre el botón de submit; los campos mantienen su valor. |
| Validación Zod fallida en submit | Se marcan los controles con `setErrors` desde los `issues` de Zod; no se envía la request.      |
| Error de red                     | Banner genérico + botón "Reintentar" que llama `query.refetch()`.                               |

Los mensajes están en inglés (i18n es fase 2).

---

## 6. Testing

Vitest con `TestBed` y `provideHttpClientTesting`:

- `auth.service.spec.ts` — `refresh()` fija `status`; `signOut` limpia `user`.
- `auth.guard.spec.ts` — anon → `UrlTree` a login con `redirect`; authed → `true`.
- `api-error.interceptor.spec.ts` — 401 limpia sesión y navega; 500 mapea a `ApiError`.
- `hiring-processes.api.spec.ts` — construye query params correctos y desempaqueta `data`.
- `hiring-process-form.component.spec.ts` — required en `companyName`; emite `CreateHiringProcessInput`
  válido; salary negativo bloquea submit.
- `list.page.spec.ts` — cambiar filtro actualiza query params de la URL.

Sin e2e en fase 1. Verificación manual: `bun run dev:server` + `bun run dev:angular` y recorrer
login → lista → crear → detalle → editar → archivar → restaurar.

---

## 7. Integración con el monorepo

- `package.json` raíz: script `dev:angular: turbo run dev -F angular-web`.
- `turbo.json`: sin cambios (las tasks `dev`, `build`, `test`, `check-types` ya son genéricas).
  `outputs` de build para la app es `dist/**`, ya cubierto.
- `CLAUDE.md` raíz: añadir `angular-web` a la regla de imports (solo `domain`).
- `oxlint`/`oxfmt`: correr desde raíz; si el formato de Angular (decorators con templates inline)
  choca con oxfmt, se añade `apps/angular-web` a `.oxfmtrc` ignore solo para los `*.ts` con
  templates inline — decisión que se toma en la tarea de scaffold con evidencia, no antes.
- No se toca `apps/server` ni `apps/web`.

---

## 8. Riesgos conocidos

1. **Resolución de `@interviews-tool/domain`** con el builder de Angular: primera tarea del plan es
   scaffold + importar `HIRING_PROCESS_STATUSES` + `bun run build`. Si falla, fallback: `paths` en
   `tsconfig.json` apuntando a `../../packages/domain/src`.
2. **Signal Forms** es experimental; si la API de 22.1 no cubre lo que necesita login (o rompe en
   zoneless), login pasa a Reactive Forms y se anota en el spec. No bloquea nada más.
3. **Cookie de sesión con proxy**: Better Auth fija la cookie para el host que responde; con el
   proxy de Angular la respuesta llega desde `localhost:4200`, mismo origen que la app, así que
   `credentials: "include"` basta. Si `BETTER_AUTH_URL` del server apunta a otro host y la cookie
   sale con `Domain`, se ajusta `.env` local, no código.
