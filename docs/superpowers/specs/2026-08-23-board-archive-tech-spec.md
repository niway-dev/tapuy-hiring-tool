# Tech spec FINAL — Board view + Archive

**Proyecto:** Tapuy · `/hiring-processes`
**Fecha de auditoría:** 2026-08-23 (evidencia con `archivo:línea` contra `main` @ `d6648c3`)
**Inputs de diseño (fuente de verdad UX):** BUILD-spec (board + archived, pegado en conversación), capturas Dashboard v2, `documentation/tapuy-theme.css`, `documentation/DESIGN.md`
**Estado:** cerrado. Las Q1–Q10 del borrador están respondidas con evidencia; las decisiones viven en §8.

> Este documento reemplaza al borrador. Donde el borrador asumía algo que el código contradice, manda esta versión.

---

## 0. Correcciones de contexto — el stack real

El borrador asumía varias cosas que no son ciertas. Todo lo demás se construye sobre esta tabla:

| Borrador asumía                  | Realidad                                                                                                                                       | Evidencia                                                                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend **Hono** + `zValidator`  | **Elysia** en Cloudflare Workers; validación pasando schemas zod directo a `query`/`body` (standard-schema) y `t.Object` para params           | `apps/server/src/index.ts:2`, `apps/server/src/routes/hiring-processes.ts:74,118,143`                                                        |
| Un solo camino de datos          | **Dos caminos**: lectura de lista vía TanStack serverFn → **Prisma** (marcado TEMP), mutaciones vía Eden Treaty → proxy → Elysia → **Drizzle** | `apps/web/src/functions/get-hiring-processes.ts:27-28`, `apps/web/src/lib/client-treaty.ts:4`, `apps/web/src/routes/api/v1/$.ts:12-53`       |
| Migraciones reversibles          | **No hay migraciones.** El flujo es `bun run db:push` (drizzle-kit push) contra Neon. `out: ./src/migrations` nunca ha existido                | `packages/infra-db/drizzle.config.ts:8`, `README.md:107-110`                                                                                 |
| Sort server-side existente       | **No existe ningún parámetro de sort.** Orden hardcodeado `updatedAt DESC`; el sort de la tabla es client-side sobre la página actual          | `packages/infra-db/src/repositories/hiring-process.repository.ts:102`, `hiring-process-table.tsx` (`getSortedRowModel` + `manualPagination`) |
| Filtros/sort/page en URL         | **Nada está en la URL.** Todo es `useState` local; el único `validateSearch` del app es `$id.tsx:42-44` (`{ live }`)                           | `apps/web/src/routes/_authenticated/hiring-processes/index.tsx:72-93`                                                                        |
| `PATCH /processes/:id`           | No hay ningún PATCH en el codebase; update es `PUT` full-body                                                                                  | `apps/server/src/routes/hiring-processes.ts:123-146`                                                                                         |
| `counts` server-side             | El header dispara **3 requests** (lista + 2 counts con `limit:1`)                                                                              | `index.tsx:106-118`                                                                                                                          |
| Popover con floating-ui o nativo | **Base UI** (`@base-ui/react`): `dialog`, `alert-dialog`, `dropdown-menu` (Menu+Positioner), `select` ya en `packages/web-ui`                  | `packages/web-ui/src/components/*.tsx`                                                                                                       |
| Sistema de toasts a definir      | **Sonner** ya montado, con precedente de `action`                                                                                              | `packages/web-ui/src/components/sonner.tsx`, `apps/web/src/lib/query-client.ts:6-16`                                                         |
| Strings en inglés directo        | App **internacionalizada (en + es)** con `use-intl`; test de paridad falla si falta una key en cualquiera de los dos                           | `packages/i18n/messages/{en,es}.json`, `packages/i18n/src/__tests__/parity.test.ts:28-41`                                                    |
| Toggle de tema existente         | `data-theme="dark"` **hardcodeado**; tokens light completos pero inalcanzables                                                                 | `apps/web/src/routes/__root.tsx:115`, `packages/web-ui/src/styles.css:94-139`                                                                |
| Tests de integración disponibles | El único paquete con tests es `packages/i18n` (vitest). No hay root `test` script ni task en turbo                                             | `packages/i18n/vitest.config.ts`, `package.json:29-51`                                                                                       |

Otros datos duros: monorepo **Bun workspaces + Turborepo**, build de paquetes con **tsdown**, lint **oxlint** / format **oxfmt**, la entidad se llama **HiringProcess** (no "Process"), y ya existe **soft-delete** vía `deletedAt` — `archived` será la _tercera_ marca ortogonal, y toda query debe seguir filtrando `deleted_at IS NULL`.

---

## 1. Q1–Q10 — respondidas con evidencia

| #       | Pregunta                                   | Respuesta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1**  | ¿Auto-update de `updatedAt`?               | **Sí, doble.** (a) `$onUpdate(() => new Date())` en el schema (`packages/infra-db/src/utils/timestamps.ts:13-20`); (b) asignación manual `updatedAt: new Date()` en `repository.update()` (`hiring-process.repository.ts:135-138`). No hay trigger de DB. **Consecuencia:** `archive`/`restore` serán métodos de repo dedicados que pasan `updatedAt: sql\`updated_at\``explícito en el`.set()`— un valor explícito gana sobre`$onUpdate`, así I2 se cumple sin tocar el helper compartido. |
| **Q2**  | ¿Cap del board?                            | **Sin cap.** Herramienta personal, decenas de procesos; el board pide todo activo en una query. El contrato de paginación por columna queda documentado (§3) pero no se implementa ni se defiende con 413.                                                                                                                                                                                                                                                                                  |
| **Q3**  | ¿Undo de move restaura `updatedAt` exacto? | **No.** El undo es otro cambio de status y avanza `updatedAt` (propuesta del borrador aceptada). Simétricamente: undo de restore re-archiva con `archivedAt = now()` nuevo, no el original. Solo el undo de archive (= restore) es revert exacto porque restore no toca `updatedAt`.                                                                                                                                                                                                        |
| **Q4**  | ¿Sistema de toasts?                        | **Sonner ya existe y soporta `action` + `duration`.** Se extiende con el patrón Undo (5000 ms). No se añade librería.                                                                                                                                                                                                                                                                                                                                                                       |
| **Q5**  | ¿Touch/móvil en board?                     | **Sí: móvil = solo menú `⋯`.** DnD HTML5 nativo no dispara en touch y no se agrega librería.                                                                                                                                                                                                                                                                                                                                                                                                |
| **Q6**  | ¿Primitivos popover/dialog?                | **Base UI.** `MoveMenu` = `DropdownMenu` (Base UI Menu + Positioner, ya con roving focus y Escape). `ArchiveDialog` = `AlertDialog` existente (precedente: `delete-confirm-dialog.tsx`). Cero dependencias nuevas.                                                                                                                                                                                                                                                                          |
| **Q7**  | ¿Delete en archivados?                     | **Sí**, mismo flujo actual (`delete-confirm-dialog.tsx` + soft-delete). Un archivado borrado desaparece de Archived (todas las queries filtran `deletedAt IS NULL`).                                                                                                                                                                                                                                                                                                                        |
| **Q8**  | ¿`counts` en el detalle?                   | **No en esta fase** (confirmado; el detalle no los necesita).                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Q9**  | ¿Rate limit en moves?                      | **Ninguno.** Mutaciones baratas, un solo usuario.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Q10** | ¿Multi-currency en min/max?                | **Se filtra sobre el valor crudo como hoy** (`salaryMin/salaryMax` sobre `salary` integer, sin normalizar `/mo` vs `/hr` vs `/yr`). Nota: hoy solo existen `monthly` y `hourly` (`SALARY_RATE_TYPES`); el `/yr` del mock **no existe** en el modelo — la card de Northwind con `$68,000 / yr` es aspiracional del mock, no del dato.                                                                                                                                                        |

### Hallazgos extra que el borrador no vio

1. **El orden de estados en dominio no es el del pipeline.** `HIRING_PROCESS_STATUS_VALUES` (que alimenta el pgEnum — no se debe reordenar) y `HIRING_PROCESS_STATUS_INFO[x].order` ponen `rejected=4 … offer-made=7, offer-accepted=8`. Se añade una constante nueva `HIRING_PROCESS_STATUS_ORDER` con el orden de pipeline del spec; `order` de INFO queda intacto para no romper consumidores.
2. **Las categorías ya coinciden con el spec.** `category: "active"` = exactamente OPEN (`first-contact, ongoing, on-hold, offer-made`) y `"terminal"` = CLOSED. No hay que migrar categorías.
3. **Bug en `STATUS_TRANSITIONS`**: `offer-made → []` ("Terminal status") y nada transiciona a `offer-accepted` (`hiring-process-status.ts:129-134`). El board permite mover a cualquier estado, así que el endpoint de move **no** valida transiciones; la tabla se corrige de paso para que deje de mentir.
4. **`PUT /hiring-processes/:id` puede anular `salary`/`jobTitle` sin querer**: `updateHiringProcessSchema === createHiringProcessSchema` y el repo Drizzle esparce keys `undefined` (`update-hiring-process.ts:14-30`). Conocido, fuera de alcance; el nuevo `PATCH :id/status` no pasa por ahí.
5. **`repository.update()` no filtra `deletedAt IS NULL`** (`hiring-process.repository.ts:143`), a diferencia de `findById`/`delete`. Se corrige en PR 1 (una línea) porque los métodos nuevos sí lo filtran y la inconsistencia se volvería visible.
6. **`hiringProcessKeys` no está exportado** de `use-hiring-processes.ts:40-46` — el board necesita cirugía de caché; se exporta.
7. **No existe ninguna mutación optimista en el repo** — `useReversibleMutation` introduce el primer patrón `onMutate/cancelQueries/onSettled`.
8. **i18n:** cada string nuevo del BUILD-spec (diálogos, tira de estancados, empty states, leyenda, toasts, "today") entra en `en.json` **y** `es.json` + `bun run generate:types` en `packages/i18n`, o el test de paridad rompe.

---

## 2. Modelo de datos final

### 2.1 Dominio (`packages/domain`) — fuente única

```ts
// constants/hiring-process-status.ts (se AÑADE; no se toca HIRING_PROCESS_STATUS_VALUES)
export const HIRING_PROCESS_STATUS_ORDER = [
  "first-contact", "ongoing", "on-hold", "offer-made",
  "offer-accepted", "hired", "rejected", "dropped-out",
] as const satisfies readonly HiringProcessStatus[];
export const OPEN_STATUSES = HIRING_PROCESS_STATUS_ORDER.slice(0, 4);   // === category "active"
export const CLOSED_STATUSES = HIRING_PROCESS_STATUS_ORDER.slice(4);    // === category "terminal"
export function statusPipelineIndex(s: HiringProcessStatus): number;    // criterio de sort de la columna Status

// constants/archive-reason.ts (nuevo)
export const ARCHIVE_REASONS = { NO_REPLY: "no-reply", THEY_PASSED: "they-passed",
  I_WITHDREW: "i-withdrew", ROLE_CLOSED: "role-closed" } as const;

// constants/stale.ts (nuevo)
export const STALE_DAYS = 45;
export function isStaleProcess(p: { status; updatedAt; archivedAt? }, now: Date): boolean; // OPEN + !archived + >45d
export function formatAge(date: Date, now: Date): string;  // "today" | "4d" | "2mo" | "1y" — la UI traduce solo "today"
```

`hiringProcessBaseSchema` gana `archivedAt: z.coerce.date().nullable().optional()` y `archiveReason: z.enum(ARCHIVE_REASON_VALUES).nullable().optional()` (mismo patrón que `deletedAt`).

### 2.2 DB (`packages/infra-db`, tabla `interviews_tool_hiring_process`)

```ts
archivedAt: timestamp("archived_at"),                 // null = activo
archiveReason: archiveReasonEnum("archive_reason"),   // pgEnum "archive_reason", null salvo archivado
```

- Índice nuevo: `hiring_process_user_archived_idx` on `(user_id, archived_at)`. Con volúmenes de decenas de filas no se añaden los índices parciales del borrador (YAGNI).
- **CHECK** `(archived_at IS NULL) = (archive_reason IS NULL)` vía `check()` de drizzle (primer CHECK del repo; drizzle-kit 0.31 lo soporta en push). Si `db:push` no lo aplicara limpio, el invariante queda garantizado igualmente por los métodos de repo (única vía de escritura).
- **Sin migración**: se aplica con `bun run db:push` (aditivo: dos columnas nullable + enum + índice). Rollback = revertir el schema y push de nuevo.
- `packages/infra-prisma-db/prisma/schema.prisma` queda desactualizado hasta un `db:pull`; ver decisión D1.

### 2.3 Invariantes (con su mecanismo real)

| #   | Regla                                               | Mecanismo                                                                                                                 |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| I1  | `archivedAt IS NULL ⇔ archiveReason IS NULL`        | CHECK en DB + los métodos `archive`/`restore` escriben siempre ambos                                                      |
| I2  | Archivar/restaurar no tocan `status` ni `updatedAt` | Métodos dedicados con `updatedAt: sql\`updated_at\``explícito (derrota`$onUpdate`); jamás pasan por `repository.update()` |
| I3  | Cambiar status sí actualiza `updatedAt`             | El move usa `repository.update()` existente (manual + `$onUpdate`)                                                        |
| I4  | Scope Active nunca devuelve archivados              | `buildFilterConditions` añade `archived_at IS NULL` por defecto (scope es parte de los filtros, no opt-in del caller)     |
| I5  | Sort por status = índice de pipeline                | `array_position(ARRAY[...orden]::text[], status::text)` en SQL; `statusPipelineIndex` en cliente                          |
| I6  | Nada resucita soft-deleted                          | Todos los métodos nuevos incluyen `deleted_at IS NULL`; se corrige `update()` que hoy no lo hace                          |

---

## 3. API final

Reparto por camino (respeta la arquitectura actual, no la pelea):

- **Lecturas del dashboard** → TanStack **serverFns** (SSR-friendly; `clientTreaty` usa `window` y no sirve en loaders). Los serverFns llaman use cases con el repo **Drizzle** (decisión D1: se retira el camino Prisma TEMP).
- **Mutaciones** → **Elysia** vía Eden Treaty (tipado end-to-end ya montado). También quedan disponibles para mobile.
- La lógica vive en **use cases** (`packages/application/src/hiring/`), compartida por ambos caminos: `changeHiringProcessStatus`, `archiveHiringProcess`, `restoreHiringProcess`, `getHiringProcessBoard`, `listHiringProcesses` (extendido con scope/stale/sort), `getHiringProcessCounts`.

### 3.1 Lectura de lista — `GET /api/v1/hiring-processes` + serverFn `getHiringProcesses`

Se **extiende** el contrato existente (nombres actuales `page`/`limit`/`statuses`/`salaryDeclared`/`salaryMin`/`salaryMax`; nada de renombrar a `perPage`):

```
scope=active|archived   (default active)
stale=true              (solo tiene efecto en active: OPEN + updated_at < now()-45d)
sort=updatedAt|companyName|jobTitle|status|salary|archivedAt
dir=asc|desc            (defaults: active → updatedAt desc · archived → archivedAt desc)
```

- `sort=archivedAt` con `scope=active` → 400 (`BadRequestError`).
- Respuesta: `ApiResponse` actual + `meta.counts: { active, archived, open, closed, stale }` — una query agregada con `COUNT(*) FILTER`, conteos globales del usuario (no del resultado filtrado), en la misma respuesta: los segmentados pintan número al primer render y hoy desaparecen las 2 queries extra de `index.tsx:106-118`.

### 3.2 Board — serverFn `getHiringBoard` (+ `GET /api/v1/hiring-processes/board`)

```
query:    { salaryDeclared?, salaryMin?, salaryMax? }        // scope siempre active, sin statuses, sin page
response: { columns: [{ status, count, cards: HiringProcessBase[] }] × 8 en STATUS_ORDER, counts }
```

Una query plana (activos ordenados `updatedAt desc`), agrupación en memoria en el use case. Columnas vacías van con `cards: []`. Las cards son la fila base (no hay proyección aparte: la entidad no arrastra notas). Futuro contrato de paginación por columna: `?status=&page=` — documentado, no implementado (Q2).

### 3.3 Mutaciones (Elysia)

| Método  | Ruta                                   | Body         | Reglas                                                                                                           | Respuesta                                                                    |
| ------- | -------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `PATCH` | `/api/v1/hiring-processes/:id/status`  | `{ status }` | 400 si mismo status · 409 (`ConflictError`) si archivado · bump `updatedAt` · **no** valida `STATUS_TRANSITIONS` | `{ data: { process, previous: { status, updatedAt } } }`                     |
| `POST`  | `/api/v1/hiring-processes/:id/archive` | `{ reason }` | 409 si ya archivado · no toca `status`/`updatedAt`                                                               | `{ data: { process, previous: { archivedAt: null, archiveReason: null } } }` |
| `POST`  | `/api/v1/hiring-processes/:id/restore` | —            | 409 si no archivado · no toca `updatedAt`                                                                        | `{ data: { process, previous: { archivedAt, archiveReason } } }`             |

- 404 si no existe o no es del usuario (patrón actual: ownership en el WHERE, nunca 403). `ConflictError` existe en `apps/server/src/utils/errors.ts:19` pero hay que **registrarlo** en el error handler (`error-handler-plugin.ts:29-35` no lo mapea hoy).
- `previous` alimenta el Undo; el undo llama el endpoint inverso (move inverso / restore / archive), no un `/undo` genérico.

---

## 4. Frontend

### 4.1 Estado — todo greenfield en la ruta index

| Estado                                                                                       | Dónde                                                                                    | Nota                                                                        |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `scope, view, statuses, salaryDeclared, salaryMin, salaryMax, stale, sort, dir, page, limit` | `validateSearch` con zod (primer uso real; precedente hand-rolled en `$id.tsx`)          | Helper único `setSearch(partial)` que borra `page` salvo override explícito |
| `view` último usado                                                                          | `localStorage` `tapuy:dashboard-view` (convención `tapuy:` de `interaction-draft.ts:28`) | Se lee solo si no viene `?view=`; el forzado de "Show them" **no** lo pisa  |
| `scope`                                                                                      | URL, sin persistir                                                                       | Cada visita sin param entra en Active                                       |
| Stale strip dismissed                                                                        | `sessionStorage` `tapuy:stale-dismissed` (primer uso de sessionStorage)                  |                                                                             |
| `dragId`, menú abierto, diálogo                                                              | `useState` local                                                                         |                                                                             |

### 4.2 Datos y mutaciones

- **Exportar `hiringProcessKeys`** y añadir `board: (params) => [...all, "board", params]`. `staleTime` 30s para lista y board (hoy la lista usa 10min — se baja: con mutaciones optimistas el caché ya no puede ser tan perezoso). Loader hace `ensureQueryData` solo de la vista activa.
- **`useReversibleMutation`** (primera mutación optimista del repo): `onMutate` cancela + snapshot de lista y board + patch optimista → `onError` restaura + toast de error del spec → `onSuccess` toast Sonner con `action: Undo`, `duration: 5000` → Undo dispara la mutación inversa (optimista, sin segundo toast) → `onSettled` invalida `hiringProcessKeys.all`. Cola de Sonner tal cual (un Undo nuevo no cancela el anterior).
- Patch optimista en board: mover card entre `columns[]` respetando `updatedAt desc` (va primera) y ajustar ambos `count`. En lista: si el ítem deja de cumplir el scope, sale de `rows` y `total--`; la refetch rellena.

### 4.3 Componentes (primitivos reales)

```
routes/_authenticated/hiring-processes/index.tsx   validateSearch + loader por vista
  ├ ControlBar: ScopeSegment (Active N | Archived N, mono) · filtros condicionales · ViewSegment
  ├ StaleStrip (counts.stale > 0 && !dismissed && scope=active)
  ├ InterviewTable (existente) + RowActions hover + columnas por scope + edad ámbar si stale
  ├ ProcessBoard → BoardColumn ×8 (STATUS_ORDER) → ProcessCard → MoveMenu (DropdownMenu Base UI)
  ├ ArchiveDialog (AlertDialog Base UI; chips WHY; preselección: isStale ? no-reply : they-passed)
  └ EmptyState ×3 (los dos primeros ya existen en index.tsx:143-154,294-301; se añade "Nothing archived")
```

- DnD HTML5 según BUILD-spec (con `preventDefault` en `dragOver`, `relatedTarget` en `dragLeave`, no-op misma columna). Accesibilidad y touch: el menú `⋯` es el camino completo.
- "Start live note" en card = patrón existente `navigate({ to: "/hiring-processes/$id", search: { live: true } })` (`hiring-process-table.tsx:179-189`).
- Tabla scope Archived: `Status when archived` (badge intacto) · `Archived` = `fecha · motivo` (labels vía i18n, no un mapa nuevo en dominio) · acción `Restore` + Delete.
- Sort de tabla pasa a **server-side** (los headers escriben `sort`/`dir` en la URL); se retira `getSortedRowModel`.
- **Toggle de tema**: hoy no existe (dark hardcodeado). Entra en PR 4 como tarea pequeña (botón en header, `localStorage` `tapuy:theme`, script anti-FOUC, `data-theme` en `<html>`) porque el checklist exige "verificado en light" y el mock lo muestra.

---

## 5. Tests — estrategia realista (no hay infra previa)

| Capa                   | Qué                                                                                                                                                                           | Infra                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Dominio (unit)         | `formatAge` (bordes today/30d/12mo), `isStaleProcess` (terminal ≠ stale, archivado ≠ stale, borde 45d), `STATUS_ORDER`/OPEN/CLOSED coherentes con `category`, archive reasons | vitest nuevo en `packages/domain` (patrón i18n)                                                                                           |
| infra-db (integración) | I1–I6, counts con mezcla, stale excluye terminales, 409 doble archive (retorno null), cross-user, sort pipeline                                                               | **pglite** (`@electric-sql/pglite` + `drizzle-orm/pglite` + `pushSchema` de `drizzle-kit/api`) — Postgres real en memoria, sin tocar Neon |
| application (unit)     | use cases nuevos con repos fake in-memory (interfaces ya lo permiten)                                                                                                         | vitest en `packages/application`                                                                                                          |
| Web                    | Sin RTL/Playwright en esta fase (infra inexistente; coste > valor para un solo usuario). Verificación manual guiada por el checklist del BUILD-spec + smoke en light          | manual                                                                                                                                    |

Se añade task `test` a `turbo.json` y script root `test`.

## 6. Plan de entrega — 4 PRs (el borrador decía 8; se colapsa)

1. **`feat(db): archive fields + domain foundations`** — constantes (STATUS_ORDER, ARCHIVE_REASONS, STALE_DAYS, formatAge/isStale), schemas, pgEnum + columnas + índice + CHECK, interfaz `IHiringProcessArchiveRepository`, métodos Drizzle (`archive`, `restore`, `counts`, `findBoard`, scope/stale/sort en `findPaginated`), fix `update()` sin `deletedAt`, vitest domain + pglite infra-db, `db:push`. Sin UI. → plan detallado: `docs/superpowers/plans/2026-08-23-pr1-archive-domain-db.md`
2. **`feat(api): scope, counts, board + move/archive/restore`** — use cases, rutas Elysia (extender GET, board, PATCH status, archive, restore, registrar ConflictError), serverFns (lista→Drizzle+counts, board nuevo). Defaults = comportamiento de hoy: la UI actual sigue igual.
3. **`feat(web): URL state + control bar + archive flow`** — validateSearch, segmentados scope/vista, filtros condicionales, sort server-side en tabla, RowActions, ArchiveDialog, scope Archived, `useReversibleMutation` + Undo, empty state Archived, i18n en+es.
4. **`feat(web): board + stale strip + polish`** — board completo (DnD, `⋯`, leyenda), edades, tira de estancados, toggle de tema + pase light, checklist final del BUILD-spec.

Cada PR mergeable solo; feature visible desde el PR 3.

## 7. Checklist de merge (del BUILD-spec, con dueño)

- [ ] Archivar/restaurar no altera `status` ni `updatedAt` → test pglite I2 (PR 1)
- [ ] Ninguna consulta Active devuelve archivados → test pglite I4 (PR 1)
- [ ] Columna Status ordena por pipeline, no alfabético → test pglite I5 (PR 1)
- [ ] `dragOver` hace `preventDefault` → code review PR 4
- [ ] Todo estado alcanzable sin arrastrar (menú `⋯`) → manual PR 4
- [ ] Mover/archivar/restaurar con Undo 5s → manual PR 3/4
- [ ] Stale strip ignora terminales → test counts (PR 1) + manual
- [ ] Cambiar vista/scope/filtro/sort resetea page 1 → helper `setSearch` + manual PR 3
- [ ] Verificado en light → PR 4

## 8. Registro de decisiones

| #   | Decisión                                                                                                                                                                                                                                                                                                                             | Alternativa descartada                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| D1  | **Consolidar lecturas en Drizzle**: el serverFn de lista (Prisma, marcado TEMP) pasa a usar `HiringProcessRepository` de infra-db. `infra-prisma-db` queda congelado como demo: no implementa archive (las capacidades nuevas van en una interfaz aparte `IHiringProcessArchiveRepository`, así Prisma sigue compilando sin tocarse) | Implementar todo ×2 (doble mantenimiento) o borrar el paquete (decisión aparte, no urgente) |
| D2  | `HIRING_PROCESS_STATUS_ORDER` nuevo; **no** se reordena `HIRING_PROCESS_STATUS_VALUES` (alimenta el pgEnum) ni `INFO.order`                                                                                                                                                                                                          | Reordenar el enum → ALTER TYPE innecesario y riesgo en push                                 |
| D3  | Move **no** valida `STATUS_TRANSITIONS` (el board permite cualquier destino); se corrige la tabla de transiciones para que refleje la realidad                                                                                                                                                                                       | Validar transiciones → contradice el spec del board                                         |
| D4  | Sin cap del board, sin rate limit, sin normalización de moneda (Q2/Q9/Q10)                                                                                                                                                                                                                                                           | —                                                                                           |
| D5  | Nombres de params existentes (`page`, `limit`, `statuses`, `salaryDeclared`…); sort nuevo como `sort`/`dir` con nombres de campo reales (`companyName`, `jobTitle`)                                                                                                                                                                  | Renombrar a `perPage`/`company` → churn sin valor                                           |
| D6  | Tests: vitest domain/application + pglite infra-db; sin Playwright/RTL en esta fase                                                                                                                                                                                                                                                  | Montar E2E desde cero para un usuario                                                       |
| D7  | Undo semántico (Q3): move-undo avanza `updatedAt`; restore-undo re-archiva con `archivedAt` nuevo                                                                                                                                                                                                                                    | Tokens de undo con timestamps exactos                                                       |
| D8  | Toggle de tema entra en PR 4 (pequeño, requerido por "verificado en light" y el mock)                                                                                                                                                                                                                                                | Dejarlo fuera → checklist incumplible                                                       |
