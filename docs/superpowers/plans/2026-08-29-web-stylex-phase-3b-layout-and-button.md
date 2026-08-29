# web-stylex Phase 3B — Layout Components and Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port `Card`, `Table`, `Accordion`, `Alert` and `Button` from `packages/web-ui` to `packages/web-ui-stylex`, switching every `apps/web-stylex` call site, without changing a rendered pixel.

**Architecture:** Same shape as Phase 3A: one component (or one tightly-coupled family) per task, each task ports the component **and every call site** in one commit, and each ported component drops `className` for `style?: StyleXStyles`. `Button` comes last in this plan despite being the most-used component, because it carries the most hard selectors and benefits from the conventions being settled first.

**Tech Stack:** Bun 1.3.4, Turbo 2, Vite 7, React 19, TanStack Start, `@base-ui/react` 1.0, `@stylexjs/stylex` 0.19.0, `@interviews-tool/design-tokens`, Playwright.

**Spec:** `docs/tailwind-to-stylex-migration/spec-web-stylex.md` — decisions D4, D5, D6, D7, D8.
**Conventions — read before Task 1:** `docs/tailwind-to-stylex-migration/05-porting-conventions.md`.
**Prerequisite:** Phase 3A (`2026-08-29-web-stylex-phase-3a-primitives.md`) must be merged. This plan reuses `icon` from `packages/web-ui-stylex/src/lib/icon.ts`, created there.

## Global Constraints

- Everything committed is in **English**.
- **Never push to `main`.** PRs only (`gh` account `csdev19`, repo `niway-dev/tapuy-hiring-tool` — always pass `--repo`).
- **`apps/web` is never modified.** `git diff main -- apps/web` must be empty at every task's end.
- `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.20.0` at the start of every shell.
- `@stylexjs/*` pinned to exactly **0.19.0**.
- **No hex literals, no `var(--token)`** in a component. Always `colors.*` from `@interviews-tool/design-tokens/tokens.stylex`.
- **Never edit `packages/design-tokens/src/tokens.stylex.ts`** — it is generated from `tokens.ts` via `bun run generate:stylex`. CI fails on a stale file.
- A ported component exports **no `className` prop**.
- Every task ends with the compare harness at **≤ 0.1%**.

## Harness coverage for this plan — read before you trust a green run

`COMPARE_ONLY_PUBLIC=1 bun run compare` reaches landing, login and signup only.

| Component   | Call sites      | Covered?                                                                                          |
| ----------- | --------------- | ------------------------------------------------------------------------------------------------- |
| `Button`    | **16 files**    | **Yes** — `sign-in-form.tsx`, `sign-up-form.tsx`, `header.tsx`, `routes/index.tsx` are all public |
| `Card`      | check at Task 1 | Likely partly — `routes/index.tsx`                                                                |
| `Alert`     | check at Task 4 | Likely only on auth forms                                                                         |
| `Table`     | 2 files         | **No** — both authenticated                                                                       |
| `Accordion` | check at Task 3 | **No** if only authenticated                                                                      |

`Table` and `Accordion` get no visual gate. Their evidence is the unit test, the build, and a careful read against the conventions table. State that plainly in the PR.

---

## File map

| Path                                                  | Responsibility                       |
| ----------------------------------------------------- | ------------------------------------ |
| `packages/web-ui-stylex/src/components/card.tsx`      | `Card` and its 6 sub-components      |
| `packages/web-ui-stylex/src/components/table.tsx`     | `Table` and its 7 sub-components     |
| `packages/web-ui-stylex/src/components/accordion.tsx` | `Accordion` and its 3 sub-components |
| `packages/web-ui-stylex/src/components/alert.tsx`     | `Alert` and its 3 sub-components     |
| `packages/web-ui-stylex/src/components/button.tsx`    | `Button`                             |
| `packages/web-ui-stylex/src/index.ts`                 | barrel, extended per task            |
| `packages/web-ui-stylex/src/components/*.test.tsx`    | one test file per component          |
| `apps/web-stylex/src/**`                              | call sites, flipped per task         |
| `docs/tailwind-to-stylex-migration/06-tracker.md`     | status row per task                  |

---

## A rule that governs four of the five tasks

`Card`, `Table`, `Accordion` and `Alert` are **compound components**: one file exporting a parent plus several children (`Card` + `CardHeader` + `CardTitle` + …). Their Tailwind versions coordinate through two mechanisms StyleX does not have:

1. **`data-[slot=…]` selectors**, where a parent styles itself based on which children are present — e.g. `card.tsx`'s `data-[slot=card-action]:grid-cols-…`, `alert.tsx`'s `data-[slot=alert-action]:pr-18`, `accordion.tsx`'s `data-[slot=accordion-trigger-icon]:size-4`.
2. **`[&_a]:underline` descendant selectors**, styling arbitrary links inside rendered content.

**The ruling for both, and it applies to every task in this plan:**

- A `data-[slot=…]` selector that reflects a **prop** (`data-[size=sm]`, `data-[variant=destructive]`) becomes a **real prop plus a variant namespace**. This is shadcn passing props through CSS; make them props again.
- A `data-[slot=…]` selector where a **parent reacts to a child's presence** becomes an explicit prop on the parent. The caller already knows whether it is rendering a `CardAction`; make it say so — e.g. `<CardHeader hasAction>`. Do not reach for `stylex.when.descendant`: spec D7 restricts `when.*` to the three sites where the state genuinely lives on another element and no prop can carry it, and this is not one of them.
- A `[&_a]:underline` selector inside **rendered markdown or user content** stays in plain CSS (spec D8). `markdown-content.css` already exists for exactly this. If the links are in component-authored JSX instead, style the anchor directly.

Keep `data-slot` attributes on the DOM. They are query hooks for tests and other code, not styling hooks, once the styling moves to StyleX.

---

## Task 1: `Card`

**Files:**

- Create: `packages/web-ui-stylex/src/components/card.tsx`, `card.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify: every call site (find them in Step 1)
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Consumes: `style?: StyleXStyles` prop shape from Phase 3A.
- Produces: `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`, `CardDescription`, `CardContent`, and their `*Props` types.

89 lines, 7 exports, 0 `cva`, 6 hard selectors — all of them `data-[slot=…]` or `data-[size=sm]`.

- [ ] **Step 1: Read the source and find the call sites**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.20.0
cat packages/web-ui/src/components/card.tsx
grep -rln '<Card' apps/web-stylex/src --include='*.tsx'
grep -rn '<Card[A-Za-z]*[^>]*className=' apps/web-stylex/src --include='*.tsx'
```

Write the call-site list into your report. The second grep tells you which ones need a `style` conversion rather than just an import swap.

- [ ] **Step 2: Classify the six hard selectors**

The source contains, per measurement:

| Selector                                                                   | Classification                                              |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `data-[size=sm]:gap-2`, `data-[size=sm]:py-3`, `data-[size=sm]:has-data-…` | a **prop** — `size?: "default" \| "sm"` → variant namespace |
| `data-[slot=card-action]:grid-cols-…`                                      | parent reacts to a child → explicit prop on `CardHeader`    |
| `data-[slot=card-description]:grid-rows-…`                                 | same                                                        |
| `data-[slot=card-footer]:pb-0`                                             | same                                                        |

Write the classification into your report before writing code. If the real source disagrees with this table, follow the source and say so.

- [ ] **Step 3: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, CardHeader, CardTitle, CardContent } from "./card";

describe("Card", () => {
  it("renders its parts and keeps the data-slot hooks", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );
    expect(screen.getByText("Title")).toBeTruthy();
    expect(screen.getByText("Body")).toBeTruthy();
    expect(document.querySelector('[data-slot="card"]')).not.toBeNull();
  });

  it("compiles to StyleX classes, not Tailwind strings", () => {
    const { container } = render(<Card>x</Card>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className.length).toBeGreaterThan(0);
    expect(el.className).not.toMatch(/rounded-xl|bg-card|border-/);
  });

  it("gives size=sm a different compiled class than the default", () => {
    const a = render(<Card>x</Card>);
    const b = render(<Card size="sm">y</Card>);
    expect(a.container.firstElementChild!.className).not.toBe(
      b.container.firstElementChild!.className,
    );
  });
});
```

- [ ] **Step 4: Run it — expect FAIL** (module not found).

```bash
cd packages/web-ui-stylex && bunx vitest run src/components/card.test.tsx
```

- [ ] **Step 5: Write the component**

Follow this shape for every compound component in this plan:

```tsx
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import * as React from "react";

import { colors } from "@interviews-tool/design-tokens/tokens.stylex";

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: colors.card,
    color: colors.cardForeground,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: 12,
  },
  // one namespace per sub-component
});

/* data-[size=sm]:* in Tailwind was a prop smuggled through CSS. It is a real
   prop again. */
const cardSize = stylex.create({
  default: { gap: 24, paddingBlock: 24 },
  sm: { gap: 8, paddingBlock: 12 },
});

export type CardProps = Omit<React.ComponentProps<"div">, "className" | "style"> & {
  style?: StyleXStyles;
  size?: keyof typeof cardSize;
};

export function Card({ style, size, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      {...stylex.props(styles.card, cardSize[size ?? "default"], style)}
      {...props}
    />
  );
}
```

Transcribe every value from the real source. **Do not invent spacing** — look each Tailwind class up in the scale table in `05-porting-conventions.md`.

- [ ] **Step 6: Run the test — expect PASS.**

- [ ] **Step 7: Export all 7 symbols** in `src/index.ts`.

- [ ] **Step 8: Flip the call sites.** Remove each `Card*` symbol from the `@interviews-tool/web-ui` import and add it to a `@interviews-tool/web-ui-stylex` import. Convert every `className` to a local `stylex.create` plus `style`. Where a call site relied on a `data-slot` selector implicitly — e.g. it rendered a `CardAction` and expected the header to reflow — pass the new explicit prop.

Verify:

```bash
grep -rn 'Card' apps/web-stylex/src --include='*.tsx' | grep 'from "@interviews-tool/web-ui"'
grep -rn '<Card[A-Za-z]*[^>]*className' apps/web-stylex/src --include='*.tsx'
```

Both must return nothing.

- [ ] **Step 9: Verify the app**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
bun run build --filter=web-stylex
bun run test --filter=web-stylex
bun run check-types --filter=@interviews-tool/web-ui-stylex
git diff main -- apps/web
```

- [ ] **Step 10: Visual gate**

```bash
# terminal 1 — FIRST, or apps/web's Cloudflare plugin dies on EADDRINUSE:9229
bun run dev:web
# terminal 2
bun run dev:web-stylex
cd apps/web-stylex && COMPARE_ONLY_PUBLIC=1 bun run compare
```

≤ 0.1% on all 12. State in your report which of `Card`'s call sites are on a public route, so the coverage claim is precise.

- [ ] **Step 11: Tracker row, then commit**

```bash
git commit -m "feat(web-ui-stylex): port Card and its call sites

data-[size=sm] and the data-[slot=...] parent-reacts-to-child selectors became
real props: shadcn was passing props through CSS, and StyleX has no selector
for either."
```

---

## Task 2: `Table`

**Files:**

- Create: `packages/web-ui-stylex/src/components/table.tsx`, `table.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify (2 call sites): `components/hiring-process/hiring-process-table.tsx`, and the second found in Step 1
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Produces: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`, and their `*Props`.

90 lines, 8 exports, 4 hard selectors. **No public route renders a table** — the harness cannot verify this one.

- [ ] **Step 1: Read the source and find call sites**

```bash
cat packages/web-ui/src/components/table.tsx
grep -rln '<Table' apps/web-stylex/src --include='*.tsx'
```

- [ ] **Step 2: The four hard selectors, and their rulings**

| Selector                            | Ruling                                                                                                                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[&_tr]:border-b`                   | The descendant styles itself. `TableRow` already exists as a component — move `borderBottom` onto it.                                                                            |
| `[&_tr:last-child]:border-0`        | `":last-child"` is a **pseudo-class**, which StyleX supports directly on `TableRow`: `borderBottomWidth: { default: 1, ":last-child": 0 }`.                                      |
| `[&>tr]:last…`                      | Same — read the real class and express it as a pseudo-class on the child component.                                                                                              |
| `data-[state=selected]:bg-selected` | A **prop**. `TableRow` gains `selected?: boolean` and applies a `selected` namespace. Keep emitting `data-state="selected"` on the DOM so existing queries and tests still work. |

This is the cleanest case in the whole migration: every one of the four becomes something StyleX supports natively, because the "descendant" is already a component.

- [ ] **Step 3: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TableBody, TableCell, TableRow } from "./table";

describe("Table", () => {
  it("renders rows and cells", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Acme</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText("Acme")).toBeTruthy();
  });

  it("marks a selected row differently and keeps its data-state hook", () => {
    const plain = render(
      <Table><TableBody><TableRow><TableCell>a</TableCell></TableRow></TableBody></Table>,
    );
    const picked = render(
      <Table><TableBody><TableRow selected><TableCell>b</TableCell></TableRow></TableBody></Table>,
    );
    const rowA = plain.container.querySelector("tr")!;
    const rowB = picked.container.querySelector("tr")!;
    expect(rowA.className).not.toBe(rowB.className);
    expect(rowB.getAttribute("data-state")).toBe("selected");
  });

  it("compiles to StyleX classes, not Tailwind strings", () => {
    const { container } = render(<Table><TableBody /></Table>);
    const el = container.querySelector("table") as HTMLElement;
    expect(el.className).not.toMatch(/w-full|text-sm|caption-/);
  });
});
```

- [ ] **Step 4: Run it — expect FAIL.**

- [ ] **Step 5: Write the component.** Each of the 8 sub-components gets its own `stylex.create` namespace and its own `Omit<…, "className"> & { style?: StyleXStyles }` props type. `TableRow` additionally takes `selected?: boolean`.

- [ ] **Step 6: Run the test — expect PASS.**

- [ ] **Step 7: Export all 8, flip the 2 call sites.** `hiring-process-table.tsx` is the heavy one — read how it drives row selection today and pass the new `selected` prop instead of whatever attribute it was setting.

- [ ] **Step 8: Verify** — build, test, check-types, `git diff main -- apps/web` empty.

- [ ] **Step 9: Visual gate — and be explicit that it proves nothing here.** Run the harness; it must stay ≤ 0.1%, but **no public route renders a `Table`**, so a regression would not show. Your real evidence is the unit test and the build. Say exactly that in the report and the PR.

- [ ] **Step 10: Tracker, then commit.**

---

## Task 3: `Accordion`

**Files:**

- Create: `packages/web-ui-stylex/src/components/accordion.tsx`, `accordion.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify: call sites found in Step 1
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Consumes: `icon` from `packages/web-ui-stylex/src/lib/icon.ts` (Phase 3A, Task 4).
- Produces: `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`, and their `*Props`.

70 lines, 7 hard selectors, split between an icon selector and markdown-link styling.

- [ ] **Step 1: Read the source and find call sites**

```bash
cat packages/web-ui/src/components/accordion.tsx
grep -rln '<Accordion' apps/web-stylex/src --include='*.tsx'
```

- [ ] **Step 2: The seven hard selectors**

| Selector                                                                          | Ruling                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-[slot=accordion-trigger-icon]:size-4`, `:ml-auto`, `:text-muted-foreground` | The icon styles itself. `size-4` is 16px = `icon.md` after Phase 3A's correction (`e4704f7`) — **not** `icon.sm` (14px). Render it as `<ChevronIcon {...stylex.props(icon.md, styles.triggerIcon)} />` where `triggerIcon` carries `marginInlineStart: "auto"` and `color: colors.mutedForeground`. |
| `[&_a]:underline`, `:underline-offset-3`, `[&_a]:hover…`                          | Links inside **content the caller passes in**. Per spec D8 this stays in plain CSS — check whether `markdown-content.css` already covers this context. If the content is component-authored JSX instead, style the anchor directly. Decide, and record which you chose and why.                     |
| `[&_p:not(:last-child)]:mb-4`                                                     | Same category: paragraph spacing inside caller content. Plain CSS.                                                                                                                                                                                                                                  |

Base UI drives the open/closed state. Read what the primitive exposes and use it in JS rather than reaching for an attribute selector.

- [ ] **Step 3: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./accordion";

describe("Accordion", () => {
  it("renders a trigger and its content", () => {
    render(
      <Accordion>
        <AccordionItem value="one">
          <AccordionTrigger>Details</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(screen.getByText("Details")).toBeTruthy();
  });

  it("compiles to StyleX classes, not Tailwind strings", () => {
    const { container } = render(
      <Accordion><AccordionItem value="one"><AccordionTrigger>t</AccordionTrigger></AccordionItem></Accordion>,
    );
    const el = container.querySelector('[data-slot="accordion-trigger"]') as HTMLElement;
    expect(el?.className).not.toMatch(/border-b|py-4|font-medium/);
  });
});
```

Adjust the prop names to whatever the real Base UI accordion takes — read the source first.

- [ ] **Step 4: Run it — expect FAIL.**

- [ ] **Step 5: Write the component.**

- [ ] **Step 6: Run the test — expect PASS.**

- [ ] **Step 7: Export, flip call sites, verify.**

- [ ] **Step 8: Visual gate.** Check whether any call site is on a public route; if none is, say so plainly rather than implying the harness covered it.

- [ ] **Step 9: Tracker, then commit.**

---

## Task 4: `Alert`

**Files:**

- Create: `packages/web-ui-stylex/src/components/alert.tsx`, `alert.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify: call sites found in Step 1
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Consumes: `icon` from `../lib/icon`.
- Produces: `Alert`, `AlertTitle`, `AlertDescription`, `AlertAction`, and their `*Props`.

76 lines, **1 `cva`**, 10 hard selectors.

- [ ] **Step 1: Read the source and find call sites**

```bash
cat packages/web-ui/src/components/alert.tsx
grep -rln '<Alert' apps/web-stylex/src --include='*.tsx' | grep -v alert-dialog
```

Note the `grep -v`: `AlertDialog` is a **different component**, ported in Phase 3C. Do not touch it here.

- [ ] **Step 2: The ten hard selectors**

| Selector                                                         | Ruling                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cva` variants (`default`, `destructive`, …)                     | A `stylex.create` namespace, indexed directly: `alertVariant[v ?? "default"]`. Never through a shared helper function — see `05-porting-conventions.md` §3.3 for why (`@stylexjs/babel-plugin` dead-code-eliminates a `stylex.create()` binding whose only access is through a function call, producing a `ReferenceError` at runtime; found and fixed in Phase 3A, `status-badge.tsx`). |
| `data-[slot=alert-description]:text-destructive`                 | The parent's variant reaching into a child. Pass the variant down: `AlertDescription` takes its own `variant` prop, or `Alert` renders it via context. **Prefer the explicit prop** — it is one line at each call site and needs no context plumbing.                                                                                                                                    |
| `data-[slot=alert-action]:pr-18`, `:relative`                    | Parent reacts to a child. Explicit prop on `Alert`: `hasAction?: boolean`.                                                                                                                                                                                                                                                                                                               |
| `[&_a]:underline` ×2, `:underline-offset-3` ×2, `[&_a]:hover` ×2 | Links in caller content → plain CSS per D8, same ruling as Task 3.                                                                                                                                                                                                                                                                                                                       |
| `[&_p:not(:last-child)]:mb-2`                                    | Same.                                                                                                                                                                                                                                                                                                                                                                                    |

- [ ] **Step 3: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert, AlertTitle, AlertDescription } from "./alert";

describe("Alert", () => {
  it("renders title and description", () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Something happened</AlertDescription>
      </Alert>,
    );
    expect(screen.getByText("Heads up")).toBeTruthy();
    expect(screen.getByText("Something happened")).toBeTruthy();
  });

  it("gives the destructive variant a different compiled class", () => {
    const a = render(<Alert>x</Alert>);
    const b = render(<Alert variant="destructive">y</Alert>);
    expect(a.container.firstElementChild!.className).not.toBe(
      b.container.firstElementChild!.className,
    );
  });

  it("compiles to StyleX classes, not Tailwind strings", () => {
    const { container } = render(<Alert>x</Alert>);
    expect((container.firstElementChild as HTMLElement).className).not.toMatch(
      /rounded-lg|border-|px-4/,
    );
  });
});
```

- [ ] **Step 4: Run it — expect FAIL.**

- [ ] **Step 5: Write the component.**

- [ ] **Step 6: Run the test — expect PASS.**

- [ ] **Step 7: Export all 4, flip call sites, verify.**

- [ ] **Step 8: Visual gate.** If `Alert` appears on the auth forms it is genuinely covered; check and state which routes.

- [ ] **Step 9: Tracker, then commit.**

---

## Task 5: `Button` — the most-used component, and the hardest in this plan

**Files:**

- Create: `packages/web-ui-stylex/src/components/button.tsx`, `button.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify (**16 call sites** under `apps/web-stylex/src/`):
  `components/user-menu.tsx`, `components/sign-in-form.tsx`, `components/header.tsx`, `components/sign-up-form.tsx`,
  `components/hiring-process/stale-strip.tsx`, `components/hiring-process/hiring-process-table.tsx`,
  `components/hiring-process/hiring-process-form.tsx`, `components/interaction/interaction-timeline.tsx`,
  `components/interaction/interaction-card.tsx`, `components/interaction/questions-panel.tsx`,
  `components/interaction/live-note.tsx`, `components/interaction/interaction-form.tsx`,
  `components/interaction/edit-interaction-dialog.tsx`, `routes/index.tsx`,
  `routes/_authenticated/hiring-processes/index.tsx`, `routes/_authenticated/hiring-processes/$id.tsx`
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Consumes: `icon` from `../lib/icon`.
- Produces: `Button`, `ButtonProps`.

Only 56 lines, but **15 hard selectors**, **1 `cva`**, and **16 call sites** — the largest blast radius in the migration. It goes last in this plan on purpose.

- [ ] **Step 1: Read the source**

```bash
cat packages/web-ui/src/components/button.tsx
grep -rn '<Button[^>]*className=' apps/web-stylex/src --include='*.tsx' | wc -l
grep -rn '<Button' apps/web-stylex/src --include='*.tsx' | wc -l
```

Record both counts — they size the call-site work and belong in the PR body.

- [ ] **Step 2: Classify the fifteen hard selectors**

| Selector                                          | Count | Ruling                                                                                                                                                                                 |
| ------------------------------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-[icon=inline-start]:pl-{1,2,3,4}`           |     4 | A **prop**, not a selector. `Button` gains `icon?: "inline-start" \| "inline-end"`, and padding comes from a namespace keyed on `size` × `icon`. Keep emitting `data-icon` on the DOM. |
| `data-[icon=inline-end]:pr-{1,2,3,4}`             |     4 | Same.                                                                                                                                                                                  |
| `aria-expanded:bg-surface-2`                      |     3 | The component receives `aria-expanded` as a prop. Read it in JS: `props["aria-expanded"] && styles.expanded`. **Not** a `when.*` case.                                                 |
| `aria-expanded:text-text`                         |     1 | Same namespace as above.                                                                                                                                                               |
| `aria-invalid:border-danger`                      |     1 | Same pattern as `Input` in Phase 3A.                                                                                                                                                   |
| `[&_svg]:pointer-events-none`, `[&_svg]:shrink-0` |     2 | The icon styles itself — callers pass `{...stylex.props(icon.xs\|sm\|md)}` to the icon they render inside the button. `icon` already carries both properties.                          |

**`icon.ts`'s scale was corrected during Phase 3A** (`e4704f7`) to the sizes this component library actually uses: `xs` 12px, `sm` 14px, `md` 16px — measured from `button.tsx`'s own size variants (`size-3` at `xs`, `size-3.5` at `sm`, `size-4` at the default/`sm` button size) and cross-checked against `dropdown-menu`/`select`, which are consistently 16px. **`Button` is the one component where the icon size genuinely depends on the button's own `size` prop** — read `button.tsx`'s real variant table (`xs`/`sm`/default) before writing this, and either document in the component's own comments that callers must pick `icon.xs`/`sm`/`md` to match the button `size` they are using, or have `Button` itself expose the matching icon size so callers do not have to remember the mapping. Do not default to a single `icon.*` size and call it done — verify against every size variant `button.tsx` defines.

The four `pl-*`/`pr-*` values differ **by size**, so the padding namespace is two-dimensional. Build it explicitly rather than composing at runtime:

```ts
const iconPadding = stylex.create({
  smStart: { paddingInlineStart: 4 },
  smEnd: { paddingInlineEnd: 4 },
  // …one per size × side, values read from the source
});
```

- [ ] **Step 3: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import * as stylex from "@stylexjs/stylex";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

const extra = stylex.create({ wide: { width: 240 } });

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("compiles to StyleX classes, not Tailwind strings", () => {
    render(<Button>Save</Button>);
    const el = screen.getByRole("button", { name: "Save" });
    expect(el.className.length).toBeGreaterThan(0);
    expect(el.className).not.toMatch(/bg-primary|rounded-md|h-9|inline-flex/);
  });

  it("gives each variant a distinct compiled class", () => {
    render(<Button>a</Button>);
    render(<Button variant="destructive">b</Button>);
    render(<Button variant="ghost">c</Button>);
    const [a, b, c] = ["a", "b", "c"].map((n) => screen.getByRole("button", { name: n }));
    expect(new Set([a.className, b.className, c.className]).size).toBe(3);
  });

  it("styles differently when aria-expanded is set", () => {
    render(<Button>plain</Button>);
    render(<Button aria-expanded>open</Button>);
    expect(screen.getByRole("button", { name: "plain" }).className).not.toBe(
      screen.getByRole("button", { name: "open" }).className,
    );
  });

  it("lets a caller's style win", () => {
    render(<Button style={extra.wide}>wide</Button>);
    render(<Button>narrow</Button>);
    expect(screen.getByRole("button", { name: "wide" }).className).not.toBe(
      screen.getByRole("button", { name: "narrow" }).className,
    );
  });
});
```

- [ ] **Step 4: Run it — expect FAIL.**

```bash
cd packages/web-ui-stylex && bunx vitest run src/components/button.test.tsx
```

- [ ] **Step 5: Write the component.** Read the `cva` block and transcribe every variant and size. **Index every namespace directly — never through a shared helper function** (see `05-porting-conventions.md` §3.3: `@stylexjs/babel-plugin` dead-code-eliminates a `stylex.create()` binding whose only access is through a function call, since its static analysis can't see the member expression hidden inside the call — this produces a `ReferenceError` at runtime, not a build error, and it is exactly what happened in Phase 3A's `StatusBadge` task before the fix). Destructure the component's own `variant` prop as `v` so it doesn't collide with anything else in scope. The composition order in `stylex.props` matters and must be:

```tsx
{...stylex.props(
  styles.base,
  byVariant[v ?? "default"],
  bySize[size ?? "default"],
  iconSide && iconPadding[`${size ?? "default"}${iconSide === "inline-start" ? "Start" : "End"}`],
  props["aria-expanded"] ? styles.expanded : null,
  props["aria-invalid"] ? styles.invalid : null,
  style,
)}
```

`style` is **last** so the caller wins. That is the deterministic merge this migration exists to get.

- [ ] **Step 6: Run the test — expect PASS (5 tests).**

- [ ] **Step 7: Export, then flip all 16 call sites.**

This is the long part. Work file by file, and after each one run `bun run build --filter=web-stylex` — a type error caught immediately is far cheaper than sixteen files of accumulated drift. Every `className` on a `<Button>` becomes a local `stylex.create` plus `style`.

Verify no stragglers:

```bash
grep -rn 'Button' apps/web-stylex/src --include='*.tsx' | grep 'from "@interviews-tool/web-ui"'
grep -rn '<Button[^>]*className' apps/web-stylex/src --include='*.tsx'
```

Both must return nothing.

- [ ] **Step 8: Verify the app** — build, test, check-types, `git diff main -- apps/web` empty.

- [ ] **Step 9: Visual gate — this one is genuinely well covered**

`Button` renders on `routes/index.tsx` (landing), `header.tsx` (every page), `sign-in-form.tsx` and `sign-up-form.tsx`. **All four are on public routes**, so the harness exercises this change harder than any other component in the plan. Expect 12/12 at ≤ 0.1%.

If a diff appears here, take it seriously — with this much coverage a real regression will surface, and a nonzero diff on a button is far more likely to be a genuine mistake than harness noise.

- [ ] **Step 10: Tracker, then commit**

```bash
git commit -m "feat(web-ui-stylex): port Button and its 16 call sites

data-[icon=inline-start|end] and the aria-expanded/aria-invalid variants were
props all along — shadcn routed them through CSS because Tailwind had no other
way. They are props again. [&_svg]:* is gone: icons style themselves via the
shared icon namespace."
```

---

## Task 6: Open the PR

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

- [ ] **Step 2: Confirm the five components are fully migrated**

```bash
grep -rn 'Card\|Table\|Accordion\|Alert\|Button' apps/web-stylex/src --include='*.tsx' \
  | grep 'from "@interviews-tool/web-ui"' | grep -v AlertDialog
```

Must return nothing. The `grep -v AlertDialog` is deliberate: that component is Phase 3C's and still comes from `web-ui`.

- [ ] **Step 3: Final harness run** — 12/12 at ≤ 0.1%.

- [ ] **Step 4: Open the PR**

```bash
git push -u origin feat/web-stylex-phase-3b
gh pr create --repo niway-dev/tapuy-hiring-tool --base main \
  --title "feat: port Card, Table, Accordion, Alert and Button to StyleX (phase 3b)"
```

The body must state, per component: call sites moved, how each hard-selector category was translated, and **whether the harness actually covered it**. `Button`, `Card` and `Alert` are covered on public routes; `Table` and `Accordion` are not. Be explicit — a green harness does not mean five components were verified.

---

## Self-review

**Spec coverage:** D4 → Tasks 1–5. D5 (`style?: StyleXStyles`, no `className`) → every task's props type. D6 (component + call sites in one PR) → each task flips its call sites before committing. D7 (`when.*` restricted) → this plan uses **no** `when.*` at all, and says why at each candidate: `aria-expanded`, `aria-invalid`, `data-[size]`, `data-[icon]` and `data-[variant]` are all props the component owns, and the parent-reacts-to-child cases become explicit props rather than `when.descendant`. D8 (plain CSS survivors) → the `[&_a]:*` and `[&_p]:*` rulings in Tasks 3 and 4.

**Placeholders:** the `stylex.create` blocks in Tasks 1 and 5 show their shape with one or two real entries and instruct transcription of the rest from the source. That is deliberate: the values must come from the file being ported, and writing them here from memory would inject errors into a plan whose whole purpose is fidelity. Every test file is complete. Every verification command is exact.

**Type consistency:** `Omit<React.ComponentProps<…>, "className" | "style"> & { style?: StyleXStyles }` is identical across all five components and matches Phase 3A. Every variant/size namespace is indexed directly at the call site (`map[key ?? "default"]`) — no shared `variant()` helper exists; Phase 3A created one and then removed it after finding it causes `@stylexjs/babel-plugin` to dead-code-eliminate the indexed `stylex.create()` binding (see `05-porting-conventions.md` §3.3). `icon` is consumed from `../lib/icon` with the `xs`/`sm`/`md` keys Phase 3A creates (12/14/16px, corrected from an initial 12/16/20 guess — see the `icon.ts` note above).

**Ordering rationale:** `Button` has the most call sites and the most hard selectors but goes last, so the compound-component and variant conventions are settled on four smaller components first. `Table` and `Accordion` go early despite having no visual gate, because their translations are the most mechanical — pseudo-classes and self-styling children — and therefore the least risky to do without one.
