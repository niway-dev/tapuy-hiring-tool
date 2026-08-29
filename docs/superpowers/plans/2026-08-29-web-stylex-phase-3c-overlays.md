# web-stylex Phase 3C — Overlays Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the five remaining `packages/web-ui` components — `Sonner`, `Dialog`, `AlertDialog`, `DropdownMenu`, `Select` — to `packages/web-ui-stylex`, switching every `apps/web-stylex` call site, without changing a rendered pixel.

**Architecture:** Same shape as 3A and 3B: one component family per task, component plus every call site in one commit, `className` replaced by `style?: StyleXStyles`. These five are last because they carry **every remaining hard case**: enter/exit animations, side-aware slide directions, and Base UI open/closed state. `DropdownMenu` (30 hard selectors) and `Select` (21) are the two heaviest files in the migration and go at the very end, once the animation and state conventions are proven on `Dialog`.

**Tech Stack:** Bun 1.3.4, Turbo 2, Vite 7, React 19, TanStack Start, `@base-ui/react` 1.0, `@stylexjs/stylex` 0.19.0, `@interviews-tool/design-tokens`, Playwright.

**Spec:** `docs/tailwind-to-stylex-migration/spec-web-stylex.md` — D4, D5, D6, D7, D8.
**Conventions — read before Task 1:** `docs/tailwind-to-stylex-migration/05-porting-conventions.md`.
**Prerequisites:** Phase 3A and 3B merged. This plan reuses `icon` (`src/lib/icon.ts`). There is no shared `variant()` helper — Phase 3A created one and removed it after finding `@stylexjs/babel-plugin` dead-code-eliminates a `stylex.create()` binding whose only access is through a function call (see `05-porting-conventions.md` §3.3). Index every variant/size namespace directly at the call site: `map[key ?? "default"]`.

## Global Constraints

- Everything committed is in **English**.
- **Never push to `main`.** PRs only (`gh` account `csdev19`, repo `niway-dev/tapuy-hiring-tool` — always pass `--repo`).
- **`apps/web` is never modified.** `git diff main -- apps/web` empty at every task's end.
- `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.20.0` at the start of every shell.
- `@stylexjs/*` pinned to exactly **0.19.0**.
- **No hex literals, no `var(--token)`.** Always `colors.*` from `@interviews-tool/design-tokens/tokens.stylex`.
- **Never edit `packages/design-tokens/src/tokens.stylex.ts`** — generated; edit `tokens.ts` and run `bun run generate:stylex`.
- A ported component exports **no `className` prop**.
- Every task ends with the compare harness at **≤ 0.1%**.

## Read this before Task 1 — these five components have almost no visual gate

The compare harness runs 12 of its 28 screenshots. The missing 16 are the four authenticated routes, which need `COMPARE_EMAIL` / `COMPARE_PASSWORD`.

| Component            | Where it renders                | Covered by the harness?                                                                                                                            |
| -------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Sonner` (`Toaster`) | mounted in `__root.tsx`         | Partly — the mount point is on every page, but a **toast only appears after an action**, and the harness never triggers one                        |
| `Dialog`             | authenticated interaction flows | **No**                                                                                                                                             |
| `AlertDialog`        | 4 files, authenticated          | **No**                                                                                                                                             |
| `DropdownMenu`       | 4 files, incl. `user-menu.tsx`  | **Barely** — the trigger may render in the header on public routes, but the **menu content only exists when open**, and the harness never opens it |
| `Select`             | 7 files, authenticated          | **No**                                                                                                                                             |

**This is the weakest-gated work in the entire migration, and it is also the hardest.** Two consequences, and both are requirements, not suggestions:

1. **Every task in this plan carries a heavier unit-test burden** than 3A or 3B. Where the harness cannot see a rendered state, a test must assert it. Each task below specifies tests for the open state, not just the closed one.
2. **Every PR body must say, per component, that the harness did not cover it.** A reader who sees 12/12 green will otherwise assume five overlay components were visually verified. They were not.

If credentials become available before this plan runs, add them and use the full 28-screenshot run instead — it changes this plan from "weakly gated" to "properly gated", and it is worth waiting for if the choice is available.

---

## File map

| Path                                                      | Responsibility                                          |
| --------------------------------------------------------- | ------------------------------------------------------- |
| `packages/web-ui-stylex/src/lib/motion.ts`                | shared enter/exit keyframes — replaces `tw-animate-css` |
| `packages/web-ui-stylex/src/components/sonner.tsx`        | ported `Toaster`                                        |
| `packages/web-ui-stylex/src/components/dialog.tsx`        | `Dialog` family                                         |
| `packages/web-ui-stylex/src/components/alert-dialog.tsx`  | `AlertDialog` family                                    |
| `packages/web-ui-stylex/src/components/dropdown-menu.tsx` | `DropdownMenu` family                                   |
| `packages/web-ui-stylex/src/components/select.tsx`        | `Select` family                                         |
| `packages/web-ui-stylex/src/index.ts`                     | barrel, extended per task                               |
| `packages/web-ui-stylex/src/components/*.test.tsx`        | one test file per component                             |
| `apps/web-stylex/src/**`                                  | call sites, flipped per task                            |
| `docs/tailwind-to-stylex-migration/06-tracker.md`         | status row per task                                     |

---

## The two rulings that govern this whole plan

### Ruling 1 — animations become explicit keyframes, defined once

Four of these five components use `tw-animate-css` utilities: `animate-in`, `animate-out`, `fade-in-0`, `fade-out-0`, `zoom-in-95`, `zoom-out-95`, and `slide-in-from-{top,right,bottom,left}-2`. StyleX has no utility layer, so each becomes a real `stylex.keyframes`.

**Define them once, in `src/lib/motion.ts`, in Task 1.** Four components need the same fade and zoom; defining them per file would produce four copies that drift.

### Ruling 2 — `data-[side=…]` is Base UI state, not a selector

`DropdownMenu` and `Select` use `data-[side=top]:slide-in-from-bottom-2` and its three siblings so the popup slides in from the direction it opened. Base UI's positioner **knows** the resolved side and exposes it. Read it in JS and pick the keyframe:

```tsx
const slideFrom = { top: motion.slideFromBottom, right: motion.slideFromLeft,
                    bottom: motion.slideFromTop, left: motion.slideFromRight };
```

Do **not** reach for `stylex.when.*`. Spec D7 restricts it to the three sites where state genuinely lives on another element and no prop can carry it; `side` is available in JS, so this is not one of them.

A note on `stylex.when.*`, no longer a caveat: **it has been executed and confirmed working**, in Phase 3A's `Label` (commits `ab60f90`, later `d98d8ef`) — `when.ancestor`/`when.siblingBefore` compiled to real, working selectors in production CSS. That task also found that `stylex.defineMarker()` (not `defaultMarker()`) must be used for any marker beyond the very first one in the app, because `defaultMarker()` compiles to a single literal class name shared by the whole app, and `defineMarker()` requires its return value bound to a named export in its own `*.stylex.ts` file (the same restriction as `defineVars`/`defineConsts`). If this plan's Ruling 2 turns out to be wrong for some case and `when.*` is genuinely needed here, follow that precedent rather than `defaultMarker()`.

---

## Task 1: `motion.ts` and `Sonner`

Batched deliberately: `Sonner` is 45 lines with **zero** hard selectors, so it is the cheapest possible vehicle for landing the shared motion module that the next four tasks depend on.

**Files:**

- Create: `packages/web-ui-stylex/src/lib/motion.ts`
- Create: `packages/web-ui-stylex/src/components/sonner.tsx`, `sonner.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify: call sites found in Step 2 (expect `routes/__root.tsx`)
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Produces: `export const motion` — a module exporting the keyframe names `fadeIn`, `fadeOut`, `zoomIn95`, `zoomOut95`, `slideFromTop`, `slideFromRight`, `slideFromBottom`, `slideFromLeft`. **Tasks 2–5 all consume these exact names.**
- Produces: `Toaster`, `ToasterProps`.

- [ ] **Step 1: Create the motion module**

`packages/web-ui-stylex/src/lib/motion.ts`:

```ts
import * as stylex from "@stylexjs/stylex";

/* Replaces the tw-animate-css utilities the shadcn overlays used. StyleX has
   no utility layer, so each animation is a real keyframe defined once and
   referenced by name from every overlay. The values mirror tw-animate-css:
   zoom-*-95 is scale .95, slide-in-from-*-2 is an 8px offset. */
export const motion = {
  fadeIn: stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } }),
  fadeOut: stylex.keyframes({ from: { opacity: 1 }, to: { opacity: 0 } }),
  zoomIn95: stylex.keyframes({ from: { transform: "scale(0.95)" }, to: { transform: "scale(1)" } }),
  zoomOut95: stylex.keyframes({ from: { transform: "scale(1)" }, to: { transform: "scale(0.95)" } }),
  slideFromTop: stylex.keyframes({ from: { transform: "translateY(-8px)" }, to: { transform: "translateY(0)" } }),
  slideFromRight: stylex.keyframes({ from: { transform: "translateX(8px)" }, to: { transform: "translateX(0)" } }),
  slideFromBottom: stylex.keyframes({ from: { transform: "translateY(8px)" }, to: { transform: "translateY(0)" } }),
  slideFromLeft: stylex.keyframes({ from: { transform: "translateX(-8px)" }, to: { transform: "translateX(0)" } }),
} as const;
```

**Verify the offsets against the real `tw-animate-css` output before accepting them.** `slide-in-from-top-2` uses Tailwind's spacing scale where `2` is `0.5rem` = 8px, and `zoom-in-95` is `scale(.95)` — but check, because a wrong offset is a subtle visual change no test will catch.

Fading and sliding must run **together**, so a component applies both names: `animationName: \`${motion.fadeIn}, ${motion.slideFromBottom}\``.

- [ ] **Step 2: Read `Sonner` and find its call sites**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.20.0
cat packages/web-ui/src/components/sonner.tsx
grep -rln 'Toaster' apps/web-stylex/src --include='*.tsx'
```

`sonner.tsx` wraps the third-party `sonner` library's `<Toaster>` and passes it theme and style options. It has **no hard selectors** and one `animate-spin`. Its styling is largely handed to `sonner` through props, so read carefully what actually needs translating — it may be less than the line count suggests.

- [ ] **Step 3: Write the failing test**

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toaster } from "./sonner";

describe("Toaster", () => {
  it("mounts without throwing", () => {
    const { container } = render(<Toaster />);
    expect(container).toBeTruthy();
  });

  it("does not emit Tailwind class strings", () => {
    const { container } = render(<Toaster />);
    expect(container.innerHTML).not.toMatch(/animate-spin|bg-surface|text-text\b/);
  });
});
```

- [ ] **Step 4: Run it — expect FAIL** (module not found).

```bash
cd packages/web-ui-stylex && bunx vitest run src/components/sonner.test.tsx
```

- [ ] **Step 5: Write the component.** `animate-spin` becomes a `stylex.keyframes` rotating `0deg → 360deg`, applied to whatever element used it. If `sonner`'s own API takes class names rather than style objects, note that in your report — a third-party surface that only accepts strings is a genuine constraint, and the honest answer may be a small plain-CSS block per spec D8 rather than forcing StyleX through it.

- [ ] **Step 6: Run the test — expect PASS.**

- [ ] **Step 7: Export `motion`, `Toaster`, flip the call sites, verify**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
bun run build --filter=web-stylex && bun run test --filter=web-stylex
bun run check-types --filter=@interviews-tool/web-ui-stylex
git diff main -- apps/web
```

- [ ] **Step 8: Visual gate**

```bash
# terminal 1 — FIRST, or apps/web's Cloudflare plugin dies on EADDRINUSE:9229
bun run dev:web
# terminal 2
bun run dev:web-stylex
cd apps/web-stylex && COMPARE_ONLY_PUBLIC=1 bun run compare
```

≤ 0.1% on all 12. `Toaster` mounts on every page, so its **mount** is covered — but no toast is ever shown, so toast styling is not. Say both.

- [ ] **Step 9: Tracker, then commit**

```bash
git commit -m "feat(web-ui-stylex): add shared motion keyframes and port Toaster

tw-animate-css's fade/zoom/slide utilities become real stylex.keyframes,
defined once in lib/motion.ts because four overlay components need the same
ones and per-file copies would drift."
```

---

## Task 2: `Dialog`

**Files:**

- Create: `packages/web-ui-stylex/src/components/dialog.tsx`, `dialog.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify: call sites found in Step 1
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Consumes: `motion` from `../lib/motion`; `icon` from `../lib/icon`.
- Produces: the `Dialog` family — read the source for the exact export list (expect `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`) plus their `*Props`.

141 lines. Only **1** measured hard selector (`data-[size=default]:sm…`) but the **full** animation set: `animate-in`, `animate-out`, `fade-in-0`, `fade-out-0`, `zoom-in-95`, `zoom-out-95`. This is where the open/closed animation convention gets proven, so do it carefully — Tasks 3–5 copy it.

- [ ] **Step 1: Read the source and find call sites**

```bash
cat packages/web-ui/src/components/dialog.tsx
grep -rln '<Dialog' apps/web-stylex/src --include='*.tsx' | grep -v alert-dialog
grep -rn 'DialogContent\|DialogTitle\|DialogHeader' apps/web-stylex/src --include='*.tsx' | head
```

- [ ] **Step 2: Determine how Base UI exposes open state**

The overlay and content animate on open and close. In Tailwind that was `data-[state=open]:animate-in data-[state=closed]:animate-out`. Read what Base UI's dialog gives you — a render prop, a `state` object, or a `data-state` attribute you can read from a hook. Write the finding into your report **before** writing code; Tasks 3–5 depend on this answer being right.

Then apply the animation conditionally in JS:

```tsx
const styles = stylex.create({
  content: {
    /* …layout… */
    animationDuration: "150ms",
    animationFillMode: "forwards",
  },
  open: { animationName: `${motion.fadeIn}, ${motion.zoomIn95}` },
  closed: { animationName: `${motion.fadeOut}, ${motion.zoomOut95}` },
});
```

and select with `open ? styles.open : styles.closed`.

- [ ] **Step 3: Write the failing test — including the open state**

The harness cannot open a dialog, so the test must.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

describe("Dialog", () => {
  it("renders nothing when closed", () => {
    render(
      <Dialog open={false}>
        <DialogContent><DialogTitle>Edit</DialogTitle></DialogContent>
      </Dialog>,
    );
    expect(screen.queryByText("Edit")).toBeNull();
  });

  it("renders its content when open", () => {
    render(
      <Dialog open>
        <DialogContent><DialogTitle>Edit</DialogTitle></DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("Edit")).toBeTruthy();
  });

  it("compiles the open content to StyleX classes, not Tailwind strings", () => {
    render(
      <Dialog open>
        <DialogContent><DialogTitle>Edit</DialogTitle></DialogContent>
      </Dialog>,
    );
    const el = document.querySelector('[data-slot="dialog-content"]') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.className.length).toBeGreaterThan(0);
    expect(el.className).not.toMatch(/animate-in|zoom-in|fade-in|bg-popover/);
  });
});
```

Adjust the props to the real Base UI dialog API — read the source first. The third test is the important one: **it is the only automated check that the open state is styled at all**, since the harness never opens it.

- [ ] **Step 4: Run it — expect FAIL.**

- [ ] **Step 5: Write the component.** Keep `data-slot` attributes on the DOM.

- [ ] **Step 6: Run the test — expect PASS (3 tests).**

- [ ] **Step 7: Export, flip call sites, verify** — build, test, check-types, `git diff main -- apps/web` empty.

- [ ] **Step 8: Visual gate, and state plainly what it did not cover**

Run the harness; ≤ 0.1%. Then write, in the report and the PR: **no public route opens a dialog, so the harness verified nothing about this component.** The evidence is the three unit tests and the build.

- [ ] **Step 9: Manual check — do this one, it is cheap and it is the only real verification**

```bash
bun run dev:web        # :3001, Tailwind
bun run dev:web-stylex # :3002, StyleX
```

Log in on both, open the same dialog on each, and compare side by side: size, padding, the overlay tint, the enter animation, and the close animation. Record what you compared. If you cannot log in, say so explicitly rather than skipping the step silently.

- [ ] **Step 10: Tracker, then commit.**

---

## Task 3: `AlertDialog`

**Files:**

- Create: `packages/web-ui-stylex/src/components/alert-dialog.tsx`, `alert-dialog.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify (4 call sites, found in Step 1)
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Consumes: `motion`, `icon`.
- Produces: `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`, plus `*Props`.

160 lines, 6 hard selectors, same animation set as `Dialog`. Reuse Task 2's convention rather than inventing a second one.

**`AlertDialogMedia` is intentionally left unported in this pass.** The source
also exports `AlertDialogMedia` (and `AlertDialogOverlay`/`AlertDialogPortal`,
internal wiring not worth re-exporting). `AlertDialogMedia` has zero call sites
in `apps/web-stylex` today, and its icon is `*:[svg:...]:size-6` — 24px, which
does not exist in `icon.ts`'s current xs/sm/md (12/14/16px) scale. Port it in a
later pass, once there is a real call site to measure against: add an
`icon.lg` (24px) to `packages/web-ui-stylex/src/lib/icon.ts` at that time,
following the same "measured from real source" rule as the rest of the scale.

- [ ] **Step 1: Read the source and find call sites**

```bash
cat packages/web-ui/src/components/alert-dialog.tsx
grep -rln 'AlertDialog' apps/web-stylex/src --include='*.tsx'
```

Expect 4 files. All are authenticated.

- [ ] **Step 2: The six hard selectors**

| Selector                                                                             | Ruling                                                                                                                              |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `data-[slot=alert-dialog-media]:grid-rows-…` ×2, `:gap-x-4`                          | Parent reacts to a child. Explicit prop on the header — e.g. `hasMedia?: boolean` — exactly as Phase 3B did for `Card` and `Alert`. |
| `data-[size=sm]:max-w-xs`, `data-[size=default]:max-w-xs`, `data-[size=default]:sm…` | A **prop**: `size?: "default" \| "sm"` → variant namespace.                                                                         |

- [ ] **Step 3: Write the failing test** — same three-test shape as Task 2 (closed renders nothing, open renders content, open content has compiled classes), plus one asserting `size="sm"` produces a different class than the default.

- [ ] **Step 4: Run it — expect FAIL.**

- [ ] **Step 5: Write the component**, reusing Task 2's open/closed animation pattern verbatim.

- [ ] **Step 6: Run the test — expect PASS.**

- [ ] **Step 7: Export all 9, flip the 4 call sites, verify.**

- [ ] **Step 8: Visual gate — not covered.** Run the harness (≤ 0.1%) and state that no public route opens an alert dialog.

- [ ] **Step 9: Manual side-by-side check** as in Task 2 Step 9. `AlertDialog` guards destructive actions, so a broken confirm dialog is worse than a cosmetic bug — this check earns its cost here more than anywhere else in the plan.

- [ ] **Step 10: Tracker, then commit.**

---

## Task 4: `DropdownMenu` — the heaviest file in the migration

**Files:**

- Create: `packages/web-ui-stylex/src/components/dropdown-menu.tsx`, `dropdown-menu.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify (4 call sites, incl. `components/user-menu.tsx`)
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Consumes: `motion`, `icon`.
- Produces: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuGroup`, plus whatever else the source exports, and their `*Props`.

**241 lines, 30 hard selectors** — the largest single translation in the migration. Everything in Tasks 1–3 exists so this one can be done with settled conventions.

- [ ] **Step 1: Read the source and inventory every selector**

```bash
cat packages/web-ui/src/components/dropdown-menu.tsx
grep -oE 'data-\[[^]]+\]:[a-z0-9-]+|\[&[^]]*\]:[a-z0-9-]+|aria-[a-z]+:[a-z0-9-]+' \
  packages/web-ui/src/components/dropdown-menu.tsx | sort | uniq -c | sort -rn
grep -rln 'DropdownMenu' apps/web-stylex/src --include='*.tsx'
```

Paste the full inventory into your report and classify **every** line before writing code. Measured shape:

| Selector                                            |           Count | Ruling                                                                                                                                                                    |
| --------------------------------------------------- | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-[variant=destructive]:focus…`                 |               5 | A **prop**: `DropdownMenuItem` gains `variant?: "default" \| "destructive"` → variant namespace, with `:focus` as a normal pseudo-class inside it.                        |
| `[&_svg]:shrink-0`, `[&_svg]:pointer-events-none`   |          4 each | Gone — icons style themselves with `{...stylex.props(icon.md)}` (`size-4` = 16px, per Phase 3A's measured `icon.ts` scale, `e4704f7` — **not** `icon.sm`, which is 14px). |
| `data-[inset]:pl-8`                                 |               3 | A **prop**: `inset?: boolean`.                                                                                                                                            |
| `data-[side=…]:slide-in-from-*`                     | 8 (4 sides × 2) | **Ruling 2** — read the resolved side from Base UI and pick the keyframe in JS.                                                                                           |
| `data-[disabled]:pointer-events-none`, `:opacity-*` |              2+ | Base UI exposes item disabled state; read it in JS. Do **not** use `when.*`.                                                                                              |
| remaining `data-[state=open\|closed]`               |            rest | Same open/closed convention as Task 2.                                                                                                                                    |

- [ ] **Step 2: Write the failing test — the open menu is the whole point**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "./dropdown-menu";

describe("DropdownMenu", () => {
  it("renders only the trigger when closed", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent><DropdownMenuItem>Sign out</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByText("Open")).toBeTruthy();
    expect(screen.queryByText("Sign out")).toBeNull();
  });

  it("renders items when open, with compiled classes", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent><DropdownMenuItem>Sign out</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>,
    );
    const item = screen.getByText("Sign out");
    expect(item.className.length).toBeGreaterThan(0);
    expect(item.className).not.toMatch(/data-\[|focus:bg-|px-2/);
  });

  it("styles a destructive item differently from a default one", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>t</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Normal</DropdownMenuItem>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByText("Normal").className).not.toBe(screen.getByText("Delete").className);
  });

  it("indents an inset item", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>t</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Flush</DropdownMenuItem>
          <DropdownMenuItem inset>Indented</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByText("Flush").className).not.toBe(screen.getByText("Indented").className);
  });
});
```

Adjust props to the real Base UI API. These four tests are, with the manual check in Step 7, **the entire verification** for this component — the harness never opens the menu.

- [ ] **Step 3: Run it — expect FAIL.**

- [ ] **Step 4: Write the component.** Work sub-component by sub-component, running `bunx vitest run src/components/dropdown-menu.test.tsx` after each. 241 lines translated in one pass without feedback is how subtle mistakes get in.

- [ ] **Step 5: Run the tests — expect PASS (4 tests).**

- [ ] **Step 6: Export, flip the 4 call sites, verify** — build, test, check-types, `git diff main -- apps/web` empty.

- [ ] **Step 7: Manual side-by-side check — mandatory for this component**

Run both apps, log in, and open the same menu on `:3001` and `:3002`. Compare: item height and padding, hover and focus background, the destructive item's colour, separator and label styling, the icon size, the shadow and radius of the panel, and the slide direction when the menu opens **upward** (near the bottom of the viewport) versus downward. That last one is the specific thing Ruling 2 changes, and it is invisible to every other check in this plan.

Record what you compared and what you found. If you cannot log in, say so — do not let the step pass silently.

- [ ] **Step 8: Visual gate** — run the harness (≤ 0.1%) and state that it did not exercise the open menu.

- [ ] **Step 9: Tracker, then commit**

```bash
git commit -m "feat(web-ui-stylex): port DropdownMenu and its 4 call sites

30 hard selectors translated: data-[variant] and data-[inset] were props all
along, [&_svg]:* becomes icons styling themselves, and data-[side=...] slide
directions now come from Base UI's resolved side in JS rather than a CSS
attribute selector."
```

---

## Task 5: `Select`

**Files:**

- Create: `packages/web-ui-stylex/src/components/select.tsx`, `select.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify (**7 call sites** — the most of any component in this plan)
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Consumes: `motion`, `icon`.
- Produces: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, plus whatever else the source exports, and their `*Props`.

187 lines, **21 hard selectors**, 7 call sites. Last task of the phase.

- [ ] **Step 1: Read the source, inventory selectors, find call sites**

```bash
cat packages/web-ui/src/components/select.tsx
grep -oE 'data-\[[^]]+\]:[a-z0-9-]+|\[&[^]]*\]:[a-z0-9-]+|aria-[a-z]+:[a-z0-9-]+' \
  packages/web-ui/src/components/select.tsx | sort | uniq -c | sort -rn
grep -rln '<Select' apps/web-stylex/src --include='*.tsx'
```

Measured shape:

| Selector                                                                    |  Count | Ruling                                                                                                                |
| --------------------------------------------------------------------------- | -----: | --------------------------------------------------------------------------------------------------------------------- |
| `data-[slot=select-value]:flex`, `:line-clamp-1`, `:items-center`, `:gap-1` |      5 | These style `SelectValue`, which **is its own component**. Move the properties onto it directly — no selector needed. |
| `[&_svg]:shrink-0`, `[&_svg]:pointer-events-none`                           | 2 each | Icons style themselves via `icon`.                                                                                    |
| `data-[variant=destructive]:focus…`                                         |      1 | A prop on `SelectItem`, as in Task 4.                                                                                 |
| `data-[size=sm]:h-8`, `:rounded-md`                                         |      2 | A prop: `size?: "default" \| "sm"` on `SelectTrigger`.                                                                |
| `data-[side=…]:slide-in-from-*`                                             |     4+ | **Ruling 2** — resolved side from Base UI, keyframe picked in JS.                                                     |
| remaining `data-[state=open\|closed]`, `data-[disabled]`                    |   rest | Base UI state read in JS; same convention as Tasks 2 and 4.                                                           |

The `data-[slot=select-value]` group is the pleasant surprise here: five selectors vanish entirely because the thing being styled is already a component.

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./select";

describe("Select", () => {
  it("renders a trigger with its value", () => {
    render(
      <Select>
        <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
        <SelectContent><SelectItem value="a">A</SelectItem></SelectContent>
      </Select>,
    );
    expect(screen.getByText("Pick one")).toBeTruthy();
  });

  it("renders items when open, with compiled classes", () => {
    render(
      <Select open>
        <SelectTrigger><SelectValue placeholder="p" /></SelectTrigger>
        <SelectContent><SelectItem value="a">Option A</SelectItem></SelectContent>
      </Select>,
    );
    const item = screen.getByText("Option A");
    expect(item.className.length).toBeGreaterThan(0);
    expect(item.className).not.toMatch(/data-\[|focus:bg-|py-1\.5/);
  });

  it("gives size=sm a different trigger class", () => {
    const a = render(
      <Select><SelectTrigger><SelectValue placeholder="x" /></SelectTrigger></Select>,
    );
    const b = render(
      <Select><SelectTrigger size="sm"><SelectValue placeholder="y" /></SelectTrigger></Select>,
    );
    const ta = a.container.querySelector('[data-slot="select-trigger"]')!;
    const tb = b.container.querySelector('[data-slot="select-trigger"]')!;
    expect(ta.className).not.toBe(tb.className);
  });
});
```

- [ ] **Step 3: Run it — expect FAIL.**

- [ ] **Step 4: Write the component**, sub-component by sub-component, re-running the tests after each.

- [ ] **Step 5: Run the tests — expect PASS (3 tests).**

- [ ] **Step 6: Export, flip all 7 call sites, verify.**

Build after each file rather than at the end. Verify no stragglers:

```bash
grep -rn 'Select' apps/web-stylex/src --include='*.tsx' | grep 'from "@interviews-tool/web-ui"'
```

Must return nothing.

- [ ] **Step 7: Manual side-by-side check — mandatory.** Open the same select on both apps: closed trigger height and border, the open panel's position and shadow, item hover and selected states, the check indicator, and the slide direction when the panel opens upward.

- [ ] **Step 8: Visual gate** — harness ≤ 0.1%, and state that it did not exercise the open select.

- [ ] **Step 9: Tracker, then commit.**

---

## Task 6: Close out Phase 3 and open the PR

- [ ] **Step 1: Full verification from a clean tree**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.20.0
git status --porcelain                 # clean
bun install
bun run build
bun run test
bun run lint
git diff main -- apps/web              # empty
```

- [ ] **Step 2: Confirm Phase 3 is actually complete**

```bash
grep -rn 'from "@interviews-tool/web-ui"' apps/web-stylex/src --include='*.tsx' --include='*.ts'
```

This should now return **only** `MarkdownContent` and `TapuyMark` — the two components Phase 3 deliberately does not port (`markdown-content` is plain CSS by D8; `tapuy-mark` is an SVG with no styling to migrate). If anything else appears, a call site was missed. Record the exact output.

- [ ] **Step 3: Confirm no Tailwind survives in the ported components**

```bash
grep -rn 'className=' packages/web-ui-stylex/src
```

Must return nothing.

- [ ] **Step 4: Final harness run** — 12/12 at ≤ 0.1%.

- [ ] **Step 5: Update the tracker's component table** — every row `done` except `markdown-content` and `tapuy-mark` (deferred by design) and `badge` and `test-component` (retired as unused).

- [ ] **Step 6: Open the PR**

```bash
git push -u origin feat/web-stylex-phase-3c
gh pr create --repo niway-dev/tapuy-hiring-tool --base main \
  --title "feat: port the five overlay components to StyleX (phase 3c)"
```

The body must lead with the coverage caveat, not bury it: **none of these five components is exercised by the compare harness in an open state.** The verification was unit tests asserting the open state, plus manual side-by-side comparison. Name which manual checks were actually performed and which were not possible. A PR that claims a green harness verified five overlay components would be false.

---

## Self-review

**Spec coverage:** D4 → Tasks 1–5. D5 (`style?: StyleXStyles`, no `className`) → every component; Task 6 Step 3 asserts it repo-wide. D6 (component + call sites in one PR) → every task flips its call sites before committing. D7 (`when.*` restricted to the three sanctioned sites) → this plan uses **none**, and says why at each candidate: `side`, `open`, `disabled`, `variant`, `inset` and `size` are all readable in JS from Base UI or from props. D8 (plain CSS survivors) → Task 1 Step 5 allows a plain-CSS block if `sonner`'s API only accepts class names, and Task 6 Step 2 confirms `markdown-content` stays.

**Placeholders:** `motion.ts` is complete and is the module Tasks 2–5 depend on. The per-component `stylex.create` blocks show the open/closed animation pattern in full and instruct transcription of layout values from the source, because those must come from the file being ported. Every test file is complete. Every verification command is exact.

**Type consistency:** `motion`'s eight keyframe names are defined in Task 1 and consumed by name in Tasks 2–5. `icon` (`xs`/`sm`/`md` = 12/14/16px) comes from Phase 3A — every component actually ported in this plan fits that scale. The one known exception is `AlertDialogMedia`'s 24px icon (see Task 3), which is why that element is left unported here rather than forcing it into `icon.md`. Variant/size namespaces are indexed directly at each call site (`map[key ?? "default"]`) — there is no shared `variant()` helper; see the note at the top of this plan. `Omit<…, "className" | "style"> & { style?: StyleXStyles }` matches 3A and 3B.

**The honest weakness of this plan:** five components, roughly 60 hard selectors, and **no automated visual verification of any open state**. Every task compensates with tests that render the open state and a mandatory manual side-by-side check, and every task is required to say so in its report. If `COMPARE_EMAIL` / `COMPARE_PASSWORD` become available before this plan runs, use the full 28-screenshot harness instead — it would turn the weakest-gated phase of the migration into a properly gated one, and it is worth waiting for.
