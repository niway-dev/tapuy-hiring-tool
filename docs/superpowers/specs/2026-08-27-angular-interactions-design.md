# Spec — Interactions in `apps/angular-web`: parity with the React detail page

**Date:** 2026-08-27
**Branch:** `feat/angular-interactions` (from `main` @ `9e08987`, with PR #63 already merged)
**Goal:** bring the Interactions feature — and the design of the detail page that
contains it — from the React client (`apps/web`) to the Angular client (`apps/angular-web`), so that
the two apps can be compared side by side on the same screen.

`apps/web` remains the production app. Nothing gets deleted, and its behavior doesn't change.

---

## 0. Why this document exists

The phase 1 Angular client works, but its detail page doesn't look like React's, and
that makes comparing the two approaches (signals vs hooks, `httpResource` vs TanStack, Reactive Forms
vs react-hook-form) a theoretical exercise. With the same screen in front of us, the comparison is real.

The full feature in React is **~1,780 lines spread across 11 files** plus a prior spec
(`documentation/CAPTURE-V2.md`). This document designs **the entire feature** so the architecture
is coherent end to end, and marks what gets built now and what later.

---

## 1. Scope

### Phase A — this spec and the plan that accompanies it

| Block                  | Content                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **A. Detail redesign** | Header card (title, job title, status badge, actions) and a stats row: Salary · Interactions · Created · Last updated     |
| **B. Timeline**        | List of interactions with a type badge, absolute date, optional title, rendered markdown content, and edit/delete actions |
| **C. Quick composer**  | "What just happened?" field + Log button; Enter submits; creates an interaction of type `note`                            |

### Later phases — designed here, built later

| Block                 | Content                                                                                                                | Why it's deferred                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **D. "Log it after"** | Drafts with autosave and restore, Write/Preview tabs, markdown toolbar, `/` slash-menu, templates per interaction type | ~600 lines in React; depends on B to have somewhere to write                                    |
| **E. Live note**      | Full-screen mode, running clock, questions panel, `L` hotkey, continuous autosave                                      | ~470 lines; the most complex piece, and the one that benefits most from B and C already settled |

### Out of scope (permanently, for this spec)

i18n (the Angular app is monolingual for now), theme toggle, board, company-details.

---

## 2. Backend reality (verified against the running server)

```
GET    /api/v1/hiring-processes/:id/interactions
POST   /api/v1/hiring-processes/:id/interactions
PUT    /api/v1/hiring-processes/:id/interactions/:interactionId
DELETE /api/v1/hiring-processes/:id/interactions/:interactionId
```

- The GET returns `successBody(data)` with a **flat array, no pagination**. The header's
  "N logged" count is therefore `interactions.length`, not a `meta.count`.
- The domain schema (`packages/domain/src/schemas/interaction.ts`) requires
  **`content` between 10 and 10,000 characters** and `title` up to 100. `type` defaults to `note`.
- There are **10 interaction types** (`INTERACTION_TYPES`) with labels already defined in
  `INTERACTION_TYPE_LABELS`.

**Design consequence:** the 10-character minimum is a real trap in the quick composer —
typing "called them" could produce a 422. It's validated on the client and the reason is shown,
instead of letting the server reject it silently.

---

## 3. Decisions

| Decision                   | Choice                                         | Why                                                                                                                                                                                                                                                                                             |
| -------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markdown rendering         | **`marked`** + `[innerHTML]`                   | Supports GFM natively (task lists, tables, strikethrough), which is what matches `remark-gfm` in React. Angular sanitizes automatically when binding `[innerHTML]`, without `bypassSecurityTrust`.                                                                                              |
| Shared `normalizeMarkdown` | New package **`@interviews-tool/ui-markdown`** | Duplicating ~200 lines of parsing logic is exactly what goes out of sync. The name scopes it: it's only the UI part.                                                                                                                                                                            |
| Compatibility with React   | **Re-export shim** in `web-ui`                 | `packages/web-ui/src/lib/normalize-markdown.ts` becomes `export { normalizeMarkdown } from "@interviews-tool/ui-markdown"`. The relative import in `markdown-content.tsx` and the `export *` in the index stay the same → **web-ui's public API doesn't change, and `apps/web` isn't touched**. |
| Server state               | **TanStack Query**                             | Consistent with the rest of the Angular app. The detail page stays on `httpResource` (a deliberate contrast with phase 1); interaction mutations invalidate **the list and the detail**, because the count lives in the header.                                                                 |
| Edit / delete              | Native **`<dialog>`**                          | Already the app's pattern (`ArchiveDialog`). No overlay libraries.                                                                                                                                                                                                                              |
| Phase A layout             | **Single column**                              | The capture's left column is D + E. A "coming soon" placeholder is dead UI; moving to two columns once D/E land is CSS, not a restructuring.                                                                                                                                                    |
| Dates                      | New **`absoluteDate`** pipe                    | The header and cards show `Aug 20, 2026 · 9:20 AM`. The existing `relativeDate` doesn't fit here, and is kept for the list.                                                                                                                                                                     |

### Import rule (updates `CLAUDE.md`)

`apps/angular-web` may import **`@interviews-tool/domain`** and **`@interviews-tool/ui-markdown`**.
Never `application`, `infra-*`, or `web-ui`.

`@interviews-tool/ui-markdown` is **pure**: no React, no Angular, no DOM. Same contract as
`domain`.

---

## 4. Structure

```
packages/ui-markdown/                      NEW — pure, no framework
  package.json                             exports "." -> src/index.ts (+ publishConfig -> dist)
  src/index.ts                             export { normalizeMarkdown }
  src/normalize-markdown.ts                moved as-is from web-ui
  src/__tests__/normalize-markdown.test.ts NEW — the original had no tests

packages/web-ui/
  src/lib/normalize-markdown.ts            becomes a one-line re-export

apps/angular-web/
  angular.json                             prebundle.exclude += "@interviews-tool/ui-markdown"
  package.json                             + marked, + @interviews-tool/ui-markdown
  src/styles.css                           + type badge tokens (offer / rejection)
  src/app/
    shared/
      ui/markdown-content.ts               <app-markdown [content] [variant]>
      ui/markdown-content.css              ported from web-ui (268 lines of plain CSS)
      pipes/absolute-date.pipe.ts          "Aug 20, 2026 · 9:20 AM"
    core/api/
      interaction.model.ts                 Interaction (ISO string dates)
      interactions.api.ts                  list / create / update / delete
    features/hiring-processes/
      interaction.keys.ts                  TanStack keys
      interaction.queries.ts               inject* factories
      detail/
        detail-page.ts                     REWRITTEN: header + stats + interactions section
        process-stats.ts                   4-stat row
        interactions/
          interaction-section.ts           section header + composer + timeline
          quick-capture.ts                 input + Log
          interaction-timeline.ts          list, skeleton, empty state
          interaction-card.ts              one card
          interaction-type-badge.ts        type badge
          edit-interaction-dialog.ts       <dialog> with title / type / content
          delete-interaction-dialog.ts     confirmation <dialog>
```

---

## 5. Data flow

```
DetailPage
 ├─ httpResource  GET /hiring-processes/:id        (no shared cache, reloaded manually)
 └─ InteractionSection
     ├─ injectInteractionList(id)   TanStack  GET .../interactions
     ├─ injectCreateInteraction()   ─┐
     ├─ injectUpdateInteraction()   ─┼─ onSuccess: invalidates interactionKeys.list(id)
     └─ injectDeleteInteraction()   ─┘
```

The server never writes the `hiring_processes` row when an interaction is created, edited, or deleted,
so `updatedAt` doesn't change and the detail header doesn't need to refresh after those mutations.
The "N logged" count doesn't depend on the `httpResource` either: it's derived from the TanStack list
(`list().length`), which invalidates itself on every successful mutation.

**Decision:** the count is supplied by the interactions query; the detail's `httpResource` is not
reloaded as a result of an interaction mutation.

---

## 6. Errors

| Situation                               | Behavior                                                                |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Content < 10 characters in the composer | Inline message under the input; the request is not sent                 |
| Failure creating / editing / deleting   | Message in the section's `role="alert"`; the typed text **is not lost** |
| Failure loading the list                | Empty state with "Retry" that calls `refetch()`                         |
| Empty list                              | Empty state: "No interactions logged yet"                               |
| 401 on any request                      | Already handled by the phase 1 interceptor → login                      |

---

## 7. Testing

Vitest + `TestBed`, following what the app already does:

- `packages/ui-markdown`: tests for `normalizeMarkdown` — **the original has none**, so they're
  written while moving it, pinning down current behavior before two apps depend on it.
- `markdown-content`: renders bold, `code`, GFM task list, and escapes dangerous HTML.
- `absolute-date.pipe`: exact format, and absence of a value.
- `interactions.api`: URL, verb, and body of the four methods; unwrapping of `data`.
- `quick-capture`: Enter submits; short content shows an error and does **not** call the API.
- `interaction-timeline`: skeleton → cards; empty state; error with retry.
- `interaction-card`: badge, date, optional title, rendered markdown, edit/delete emission.
- `detail-page`: the stats row shows the interaction count.

---

## 8. Known risks

1. **Angular's dev server doesn't resolve extensionless `.ts` re-exports from workspace packages.**
   This is exactly what broke `bun dev` in phase 1. `@interviews-tool/ui-markdown` will have the
   same problem → it must be added to `prebundle.exclude` in `angular.json` **in the same task**
   that creates the package, and `bun run dev` must be verified, not just `build` and `test`.
2. **`marked` is synchronous, but its types return `string | Promise<string>`** depending on
   configuration. The explicit synchronous API is used so the pipe/component doesn't have to
   handle promises.
3. **The markdown CSS is coupled to Tapuy's tokens.** When porting it, check that
   every CSS variable it uses exists in Angular's `styles.css`; add any that are missing.
4. **`normalizeMarkdown` has no tests today.** Moving it without pinning down its behavior would let a
   future change break both apps at once. That's why the tests are part of the move task.
