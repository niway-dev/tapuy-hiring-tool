# Spec — Interactions en `apps/angular-web`: paridad con el detalle de React

**Fecha:** 2026-08-27
**Rama:** `feat/angular-interactions` (desde `main` @ `9e08987`, con el PR #63 ya mergeado)
**Objetivo:** llevar la feature de Interactions —y el diseño de la página de detalle que la
contiene— del cliente React (`apps/web`) al cliente Angular (`apps/angular-web`), de forma que las
dos apps se puedan comparar lado a lado sobre la misma pantalla.

`apps/web` sigue siendo la app de producción. No se borra nada, y su comportamiento no cambia.

---

## 0. Por qué existe este documento

El cliente Angular de la fase 1 funciona, pero su página de detalle no se parece a la de React, y
eso hace que comparar los dos enfoques (signals vs hooks, `httpResource` vs TanStack, Reactive Forms
vs react-hook-form) sea un ejercicio teórico. Con la misma pantalla delante, la comparación es real.

La feature completa en React son **~1.780 líneas repartidas en 11 archivos** más un spec previo
(`documentation/CAPTURE-V2.md`). Este documento diseña **la feature entera** para que la arquitectura
sea coherente de principio a fin, y marca qué se construye ahora y qué después.

---

## 1. Alcance

### Fase A — este spec y el plan que lo acompaña

| Bloque                      | Contenido                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **A. Rediseño del detalle** | Card de cabecera (título, job title, badge de estado, acciones) y fila de stats: Salary · Interactions · Created · Last updated     |
| **B. Timeline**             | Lista de interacciones con badge de tipo, fecha absoluta, título opcional, contenido markdown renderizado, y acciones editar/borrar |
| **C. Composer rápido**      | Campo "What just happened?" + botón Log; Enter envía; crea una interacción de tipo `note`                                           |

### Fases posteriores — diseñadas aquí, construidas después

| Bloque                | Contenido                                                                                                               | Por qué se aplaza                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **D. "Log it after"** | Drafts con autosave y restore, tabs Write/Preview, toolbar markdown, slash-menu `/`, plantillas por tipo de interacción | ~600 líneas en React; depende de B para tener dónde escribir                                  |
| **E. Live note**      | Modo pantalla completa, reloj corriendo, panel de preguntas, hotkey `L`, autosave continuo                              | ~470 líneas; la pieza más compleja, y la que más se beneficia de que B y C ya estén asentados |

### Fuera de alcance (permanente en este spec)

i18n (la app Angular es monolingüe por ahora), theme toggle, board, company-details.

---

## 2. Realidad del backend (verificada contra el servidor en marcha)

```
GET    /api/v1/hiring-processes/:id/interactions
POST   /api/v1/hiring-processes/:id/interactions
PUT    /api/v1/hiring-processes/:id/interactions/:interactionId
DELETE /api/v1/hiring-processes/:id/interactions/:interactionId
```

- El GET devuelve `successBody(data)` con un **array plano, sin paginación**. El contador
  "N logged" de la cabecera es por tanto `interactions.length`, no un `meta.count`.
- El schema del dominio (`packages/domain/src/schemas/interaction.ts`) exige
  **`content` de 10 a 10.000 caracteres** y `title` de máximo 100. `type` por defecto es `note`.
- Hay **10 tipos** de interacción (`INTERACTION_TYPES`) con etiquetas ya definidas en
  `INTERACTION_TYPE_LABELS`.

**Consecuencia de diseño:** el mínimo de 10 caracteres es una trampa real en el composer rápido —
escribir "llamé" produciría un 422. Se valida en cliente y se muestra el motivo, en vez de dejar que
el servidor rechace en silencio.

---

## 3. Decisiones

| Decisión                       | Elección                                         | Por qué                                                                                                                                                                                                                                                                               |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renderizado de markdown        | **`marked`** + `[innerHTML]`                     | Soporta GFM nativo (task lists, tablas, tachado), que es lo que iguala a `remark-gfm` en React. Angular sanea automáticamente al bindear `[innerHTML]`, sin `bypassSecurityTrust`.                                                                                                    |
| `normalizeMarkdown` compartido | Paquete nuevo **`@interviews-tool/ui-markdown`** | Duplicar ~200 líneas de lógica de parsing es justo lo que se desincroniza. El nombre acota: es solo la parte de UI.                                                                                                                                                                   |
| Compatibilidad con React       | **Shim de re-export** en `web-ui`                | `packages/web-ui/src/lib/normalize-markdown.ts` pasa a ser `export { normalizeMarkdown } from "@interviews-tool/ui-markdown"`. El import relativo de `markdown-content.tsx` y el `export *` del index siguen igual → **el API público de web-ui no cambia, y `apps/web` no se toca**. |
| Estado servidor                | **TanStack Query**                               | Coherente con el resto de la app Angular. El detalle sigue con `httpResource` (contraste deliberado de la fase 1); las mutaciones de interacciones invalidan **la lista y el detalle**, porque el contador vive en la cabecera.                                                       |
| Editar / borrar                | **`<dialog>` nativo**                            | Ya es el patrón de la app (`ArchiveDialog`). Sin librerías de overlay.                                                                                                                                                                                                                |
| Layout en fase A               | **Una sola columna**                             | La columna izquierda de la captura es D + E. Un placeholder de "próximamente" es UI muerta; pasar a dos columnas cuando lleguen D/E es CSS, no reestructuración.                                                                                                                      |
| Fechas                         | **Pipe nuevo `absoluteDate`**                    | La cabecera y las cards muestran `Aug 20, 2026 · 9:20 AM`. El `relativeDate` existente no sirve aquí, y se conserva para la lista.                                                                                                                                                    |

### Regla de imports (actualiza `CLAUDE.md`)

`apps/angular-web` puede importar **`@interviews-tool/domain`** y **`@interviews-tool/ui-markdown`**.
Nunca `application`, `infra-*` ni `web-ui`.

`@interviews-tool/ui-markdown` es **puro**: sin React, sin Angular, sin DOM. Mismo contrato que
`domain`.

---

## 4. Estructura

```
packages/ui-markdown/                      NUEVO — puro, sin framework
  package.json                             exports "." -> src/index.ts (+ publishConfig -> dist)
  src/index.ts                             export { normalizeMarkdown }
  src/normalize-markdown.ts                movido tal cual desde web-ui
  src/__tests__/normalize-markdown.test.ts NUEVO — el original no tenía tests

packages/web-ui/
  src/lib/normalize-markdown.ts            pasa a ser un re-export de una línea

apps/angular-web/
  angular.json                             prebundle.exclude += "@interviews-tool/ui-markdown"
  package.json                             + marked, + @interviews-tool/ui-markdown
  src/styles.css                           + tokens de badge de tipo (offer / rejection)
  src/app/
    shared/
      ui/markdown-content.ts               <app-markdown [content] [variant]>
      ui/markdown-content.css              portado de web-ui (268 líneas de CSS puro)
      pipes/absolute-date.pipe.ts          "Aug 20, 2026 · 9:20 AM"
    core/api/
      interaction.model.ts                 Interaction (fechas ISO string)
      interactions.api.ts                  list / create / update / delete
    features/hiring-processes/
      interaction.keys.ts                  claves TanStack
      interaction.queries.ts               inject* factories
      detail/
        detail-page.ts                     REESCRITO: cabecera + stats + sección interactions
        process-stats.ts                   fila de 4 stats
        interactions/
          interaction-section.ts           cabecera de sección + composer + timeline
          quick-capture.ts                 input + Log
          interaction-timeline.ts          lista, skeleton, empty state
          interaction-card.ts              una card
          interaction-type-badge.ts        badge de tipo
          edit-interaction-dialog.ts       <dialog> con title / type / content
          delete-interaction-dialog.ts     <dialog> de confirmación
```

---

## 5. Flujo de datos

```
DetailPage
 ├─ httpResource  GET /hiring-processes/:id        (sin caché compartida, se recarga a mano)
 └─ InteractionSection
     ├─ injectInteractionList(id)   TanStack  GET .../interactions
     ├─ injectCreateInteraction()   ─┐
     ├─ injectUpdateInteraction()   ─┼─ onSuccess: invalida interactionKeys.list(id)
     └─ injectDeleteInteraction()   ─┘              + llama a process.reload()
```

El `reload()` del detalle es necesario porque el contador "N logged" se muestra en la cabecera, que
vive en el `httpResource`, y `httpResource` no comparte caché con TanStack. Es el mismo compromiso
que ya asumió la fase 1, y aquí se hace explícito: **el contador se deriva de la lista de TanStack,
no del detalle**, así que en realidad no hace falta recargar el detalle por el contador — solo por
`updatedAt`, que sí cambia al añadir una interacción.

**Decisión:** el contador lo aporta la query de interacciones (`list().length`), y las mutaciones
recargan el detalle únicamente para refrescar `Last updated`.

---

## 6. Errores

| Situación                                | Comportamiento                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| Contenido < 10 caracteres en el composer | Mensaje inline bajo el input; no se envía la petición                         |
| Fallo al crear / editar / borrar         | Mensaje en el `role="alert"` de la sección; el texto escrito **no se pierde** |
| Fallo al cargar la lista                 | Empty state con "Retry" que llama a `refetch()`                               |
| Lista vacía                              | Empty state: "No interactions logged yet"                                     |
| 401 en cualquier petición                | Ya lo gestiona el interceptor de la fase 1 → login                            |

---

## 7. Testing

Vitest + `TestBed`, siguiendo lo que ya hace la app:

- `packages/ui-markdown`: tests de `normalizeMarkdown` — **el original no tiene ninguno**, así que se
  escriben al moverla, fijando el comportamiento actual antes de que dependan de él dos apps.
- `markdown-content`: renderiza negrita, `código`, task list GFM y escapa HTML peligroso.
- `absolute-date.pipe`: formato exacto, y ausencia de valor.
- `interactions.api`: URL, verbo y cuerpo de los cuatro métodos; desempaquetado de `data`.
- `quick-capture`: Enter envía; contenido corto muestra error y **no** llama a la API.
- `interaction-timeline`: skeleton → cards; empty state; error con retry.
- `interaction-card`: badge, fecha, título opcional, markdown renderizado, emisión de editar/borrar.
- `detail-page`: la fila de stats muestra el contador de interacciones.

---

## 8. Riesgos conocidos

1. **El dev-server de Angular no resuelve re-exports `.ts` sin extensión de paquetes del workspace.**
   Es exactamente lo que rompió `bun dev` en la fase 1. `@interviews-tool/ui-markdown` tendrá el
   mismo problema → hay que añadirlo a `prebundle.exclude` en `angular.json` **en la misma tarea**
   que crea el paquete, y verificar `bun run dev`, no solo `build` y `test`.
2. **`marked` es síncrono pero su tipado devuelve `string | Promise<string>`** según la
   configuración. Se usa la API síncrona explícita para que el pipe/componente no tenga que
   gestionar promesas.
3. **El CSS de markdown está acoplado a los tokens de Tapuy.** Al portarlo hay que comprobar que
   todas las variables CSS que usa existen en el `styles.css` de Angular; las que falten se añaden.
4. **`normalizeMarkdown` no tiene tests hoy.** Moverla sin fijar su comportamiento haría que un
   cambio futuro rompiera las dos apps a la vez. Por eso los tests son parte de la tarea de mover.
