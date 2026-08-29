# web-stylex Phase 3A — Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the six simplest `packages/web-ui` components to StyleX in `packages/web-ui-stylex`, and switch every `apps/web-stylex` call site over to them, without changing a single rendered pixel.

**Architecture:** Each task ports one component and every file that uses it, in one commit. The ported component moves from `className?: string` (merged with `cn()`) to `style?: StyleXStyles` (merged with `stylex.props`), because a Tailwind string passed to a StyleX component is a **silent no-op** — the prop must be renamed so the break is visible at compile time. `apps/web-stylex` imports from **both** `@interviews-tool/web-ui` and `@interviews-tool/web-ui-stylex` during the migration; each task flips one import.

**Tech Stack:** Bun 1.3.4, Turbo 2, Vite 7, React 19, TanStack Start, `@base-ui/react` 1.0, `@stylexjs/stylex` 0.19.0, `@interviews-tool/design-tokens`, Playwright.

**Spec:** `docs/tailwind-to-stylex-migration/spec-web-stylex.md` — decisions D4, D5, D6, D7, D8.
**Conventions — READ THIS BEFORE TASK 1, IT IS NOT OPTIONAL:** `docs/tailwind-to-stylex-migration/05-porting-conventions.md`. It contains the full Tailwind→StyleX translation table, the spacing scale, the longhand rule, and the playbook for every unsupported-selector category. This plan gives you the per-component specifics; that document gives you the rules.

## Global Constraints

- Everything committed is in **English** — code, comments, commit messages.
- **Never push to `main`.** This phase lands through PRs (`gh` account `csdev19`, repo `niway-dev/tapuy-hiring-tool` — always pass `--repo`, the local remote name is stale).
- **`apps/web` is never modified.** Verify `git diff main -- apps/web` is empty at the end of every task.
- Node: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.20.0` at the start of every shell. The default v22.14.0 is below the repo floor and fails confusingly.
- `@stylexjs/*` stays pinned to exactly **0.19.0**.
- **Never write a hex literal or `var(--token)` in a component.** Always `colors.surface` etc. from `@interviews-tool/design-tokens/tokens.stylex`.
- **Never edit `packages/design-tokens/src/tokens.stylex.ts`** — it is generated. Edit `src/tokens.ts` and run `bun run generate:stylex` in that package. CI fails if the committed file is stale.
- **Never add a `.stylex.const` suffix to an import to "make it work".** It does not error; it silently compiles to a variable group with no variables. See that file's header.
- A ported component exports **no `className` prop**. If a call site needs to adjust it, it passes `style`.
- Every task ends with the compare harness at **≤ 0.1%** on the routes it can reach.
- Commit messages carry an attribution trailer.

## The harness covers 12 of 28 screenshots — know what that means for this plan

`COMPARE_ONLY_PUBLIC=1 bun run compare` screenshots landing, login and signup only. The four authenticated routes need `COMPARE_EMAIL` / `COMPARE_PASSWORD`, which are not available.

Coverage for the components in **this** plan:

| Component     | Call sites | Reachable by the harness?                                                                   |
| ------------- | ---------- | ------------------------------------------------------------------------------------------- |
| `Label`       | 8 files    | **Partly** — `sign-in-form.tsx`, `sign-up-form.tsx` are on `/auth/login` and `/auth/signup` |
| `Input`       | 9 files    | **Partly** — same two auth forms                                                            |
| `StatusBadge` | 6 files    | **Partly** — `routes/index.tsx` is the landing page                                         |
| `Skeleton`    | 5 files    | **No** — all authenticated                                                                  |
| `Textarea`    | 1 file     | **No** — authenticated                                                                      |
| `Checkbox`    | 1 file     | **No** — authenticated                                                                      |

So `Label`, `Input` and `StatusBadge` get real visual verification on at least one route. `Skeleton`, `Textarea` and `Checkbox` do not. For those three, the verification is: the unit test you write, `bun run build`, and a **careful manual read of the diff against the conventions table**. Say so honestly in the PR rather than implying a green harness covered them.

---

## File map

| Path                                                     | Responsibility                                      |
| -------------------------------------------------------- | --------------------------------------------------- |
| `packages/web-ui-stylex/src/lib/icon.ts`                 | shared icon size styles — replaces `[&_svg]:size-*` |
| `packages/web-ui-stylex/src/components/label.tsx`        | ported `Label`                                      |
| `packages/web-ui-stylex/src/components/skeleton.tsx`     | ported `Skeleton`                                   |
| `packages/web-ui-stylex/src/components/input.tsx`        | ported `Input`                                      |
| `packages/web-ui-stylex/src/components/textarea.tsx`     | ported `Textarea`                                   |
| `packages/web-ui-stylex/src/components/checkbox.tsx`     | ported `Checkbox`                                   |
| `packages/web-ui-stylex/src/components/status-badge.tsx` | ported `StatusBadge`                                |
| `packages/web-ui-stylex/src/index.ts`                    | barrel — one export line added per task             |
| `packages/web-ui-stylex/src/components/*.test.tsx`       | one render test per component                       |
| `apps/web-stylex/src/**`                                 | call sites, flipped one component at a time         |
| `docs/tailwind-to-stylex-migration/06-tracker.md`        | status row updated per task                         |

---

## Task 1: `Label` — the worked example

Do this task first even though `Skeleton` is simpler. `Label` is the smallest component that exercises **every** mechanic this phase needs: the `style` prop contract, a token import, a pseudo-class, and two unsupported-selector categories. Later tasks refer back to it.

**Files:**

- Create: `packages/web-ui-stylex/src/components/label.tsx`
- Create: `packages/web-ui-stylex/src/components/label.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify (call sites, 8 files under `apps/web-stylex/src/`):
  `components/sign-in-form.tsx`, `components/sign-up-form.tsx`,
  `components/hiring-process/status-field.tsx`, `components/hiring-process/salary-field.tsx`,
  `components/hiring-process/company-details-fields.tsx`, `components/hiring-process/hiring-process-form.tsx`,
  `components/interaction/edit-interaction-dialog.tsx`, `components/interaction/interaction-form.tsx`
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Produces: `export function Label(props: LabelProps)` where
  `type LabelProps = Omit<React.ComponentProps<"label">, "className" | "style"> & { style?: StyleXStyles }`.
  Every later task in this plan uses this exact prop shape.

### The source you are porting

`packages/web-ui/src/components/label.tsx`:

```tsx
"use client";

import * as React from "react";

import { cn } from "../lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "gap-2 text-[13px] text-text-secondary leading-none group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
```

### The four hard parts, and their rulings

| Tailwind                                                           | Ruling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `group-data-[disabled=true]:opacity-50` and `:pointer-events-none` | An **ancestor** carries `data-disabled`. This is one of the four sanctioned `stylex.when.*` uses (spec D7). Use `stylex.when.ancestor('[data-disabled="true"]')`. The ancestor must carry a marker — see Step 4. **(As executed: `stylex.defaultMarker()` turned out to compile to one literal class shared app-wide, a collision risk once a second `when.*` consumer exists; the task switched to `stylex.defineMarker()` in its own `*.stylex.ts` file instead — see `label.stylex.ts` and §7.5.)** |
| `peer-disabled:opacity-50` and `:cursor-not-allowed`               | A **preceding sibling** input is disabled. Sanctioned use: `stylex.when.siblingBefore(":disabled")`.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `text-[13px]`                                                      | An arbitrary value, so no scale lookup: `fontSize: 13`.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `data-slot="label"`                                                | Keep it. It is a DOM attribute other code and tests may query, not a styling hook.                                                                                                                                                                                                                                                                                                                                                                                                                     |

- [ ] **Step 1: Write the failing test**

Create `packages/web-ui-stylex/src/components/label.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import * as stylex from "@stylexjs/stylex";
import { describe, expect, it } from "vitest";
import { Label } from "./label";

const extra = stylex.create({ red: { color: "rgb(255, 0, 0)" } });

describe("Label", () => {
  it("renders its children and keeps the data-slot hook", () => {
    render(<Label>Email</Label>);
    const el = screen.getByText("Email");
    expect(el.getAttribute("data-slot")).toBe("label");
  });

  it("compiles to StyleX classes rather than Tailwind strings", () => {
    render(<Label>Email</Label>);
    const el = screen.getByText("Email");
    expect(el.className.length).toBeGreaterThan(0);
    expect(el.className).not.toMatch(/text-text-secondary|flex|items-center/);
  });

  it("merges a caller's style after its own", () => {
    render(<Label style={extra.red}>Email</Label>);
    const el = screen.getByText("Email");
    const own = render(<Label>Other</Label>);
    expect(el.className).not.toBe(own.container.firstElementChild?.className);
  });
});
```

The second assertion is the one that matters: it fails loudly if someone reintroduces a Tailwind class string.

- [ ] **Step 2: Run it and watch it fail**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.20.0
cd packages/web-ui-stylex && bunx vitest run src/components/label.test.tsx
```

Expected: FAIL — the module `./label` does not exist yet.

If `vitest` is not configured in this package, add it now: `bun add -d vitest @testing-library/react @testing-library/dom jsdom @vitejs/plugin-react`, and create `packages/web-ui-stylex/vitest.config.ts` copied from `apps/web-stylex/vitest.config.ts`, changing `name` to `"web-ui-stylex"`, dropping `setupFiles` (this package has no `src/test/setup.ts`), and keeping the **StyleX Babel plugin block exactly as it is** — without it every test throws `Unexpected 'stylex.defineVars' call at runtime`. Add `"test": "vitest run"` to the package's scripts.

- [ ] **Step 3: Write the component**

Create `packages/web-ui-stylex/src/components/label.tsx`:

```tsx
"use client";

import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import * as React from "react";

import { colors } from "@interviews-tool/design-tokens/tokens.stylex";

/* group-data-[disabled=true]:* in Tailwind became when.ancestor here, and
   peer-disabled:* became when.siblingBefore. These are two of the three
   sanctioned stylex.when.* uses in this migration (spec D7): the state lives
   on another element, so it genuinely cannot be a JS conditional. */
const styles = stylex.create({
  root: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    lineHeight: 1,
    color: colors.textSecondary,
    userSelect: "none",
    opacity: {
      default: 1,
      [stylex.when.ancestor('[data-disabled="true"]')]: 0.5,
      [stylex.when.siblingBefore(":disabled")]: 0.5,
    },
    pointerEvents: {
      default: null,
      [stylex.when.ancestor('[data-disabled="true"]')]: "none",
    },
    cursor: {
      default: null,
      [stylex.when.siblingBefore(":disabled")]: "not-allowed",
    },
  },
});

export type LabelProps = Omit<React.ComponentProps<"label">, "className" | "style"> & {
  style?: StyleXStyles;
};

export function Label({ style, ...props }: LabelProps) {
  return <label data-slot="label" {...stylex.props(styles.root, style)} {...props} />;
}
```

Note the argument order in `stylex.props(styles.root, style)`: **the caller's style comes last, so it wins.** That is the deterministic-merge property this whole migration is for.

- [ ] **Step 4: Mark the ancestor that `when.ancestor` observes**

`stylex.when.ancestor` only matches an ancestor carrying a StyleX marker. Find the elements that currently provide the `group` class alongside `data-disabled` for a label — search the call sites:

```bash
grep -rn 'data-disabled\|group' apps/web-stylex/src --include='*.tsx' | grep -i 'label\|field' | head
```

For each ancestor found, spread `stylex.props(<marker>)` onto it, keeping its existing props — as executed, `<marker>` is a `stylex.defineMarker()` result from its own `*.stylex.ts` file, not `stylex.defaultMarker()` (see the correction above). If a call site turns out to have no such ancestor, the `when.ancestor` branch is simply inert there — that is correct, not a bug. Record in your report which files you marked.

- [ ] **Step 5: Run the test — it must pass**

```bash
cd packages/web-ui-stylex && bunx vitest run src/components/label.test.tsx
```

Expected: 3 passing.

- [ ] **Step 6: Export it**

In `packages/web-ui-stylex/src/index.ts`, add above the `variant` export:

```ts
export { Label, type LabelProps } from "./components/label";
```

- [ ] **Step 7: Flip all 8 call sites**

In each of the 8 files listed under **Files** above:

1. Remove `Label` from the `@interviews-tool/web-ui` import list. If that leaves the import empty, delete the whole line.
2. Add `import { Label } from "@interviews-tool/web-ui-stylex";` — or extend an existing import from that package.
3. If the call site passed `className` to `<Label>`, convert it: create a local `stylex.create` block in that file and pass `style={…}` instead. Translate the classes using `05-porting-conventions.md`.

Check for stragglers before moving on:

```bash
grep -rn '<Label' apps/web-stylex/src --include='*.tsx' | grep -i 'classname'
grep -rn 'Label' apps/web-stylex/src --include='*.tsx' | grep 'web-ui"'
```

Both must return nothing.

- [ ] **Step 8: Verify the app**

```bash
cd /Users/cristiansotomayor/Documents/Workspace/Personal/hiring-tool
bun run build --filter=web-stylex
bun run test --filter=web-stylex
bun run check-types --filter=@interviews-tool/web-ui-stylex
git diff main -- apps/web        # must be empty
```

- [ ] **Step 9: The visual gate**

```bash
# terminal 1 — start FIRST, or apps/web's Cloudflare plugin dies on EADDRINUSE:9229
bun run dev:web
# terminal 2
bun run dev:web-stylex
# then
cd apps/web-stylex && COMPARE_ONLY_PUBLIC=1 bun run compare
```

Expected: **12/12 at or below 0.1%.** `Label` renders on `/auth/login` and `/auth/signup`, so those screenshots genuinely exercise this change.

If a diff exceeds the threshold, open `compare/output/diff/<id>.png` and fix the style. **Never raise the threshold.**

- [ ] **Step 10: Update the tracker**

In `docs/tailwind-to-stylex-migration/06-tracker.md`, set the `label` row's Status to `done` and fill in the PR column once you open it.

- [ ] **Step 11: Commit**

```bash
git add packages/web-ui-stylex apps/web-stylex/src docs/tailwind-to-stylex-migration/06-tracker.md
git commit -m "feat(web-ui-stylex): port Label and its 8 call sites

group-data-[disabled] became stylex.when.ancestor and peer-disabled became
stylex.when.siblingBefore — two of the four sanctioned when.* uses (D7).
The className prop is gone: a Tailwind string passed to a StyleX component
is a silent no-op, so the break is made visible at compile time."
```

---

## Task 2: `Skeleton`

**Files:**

- Create: `packages/web-ui-stylex/src/components/skeleton.tsx`, `skeleton.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify (5 call sites): `components/hiring-process/hiring-process-table-skeleton.tsx`, `components/interaction/interaction-timeline.tsx`, `routes/_authenticated/hiring-processes/index.tsx`, `routes/_authenticated/hiring-processes/$id.tsx`, `routes/_authenticated/hiring-processes/$id_.edit.tsx`
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Consumes: the `style?: StyleXStyles` prop shape established in Task 1.
- Produces: `export function Skeleton(props: SkeletonProps)`.

**Zero hard selectors** — 15 lines, the simplest component in the set. Its only interesting part is the pulse animation.

- [ ] **Step 1: Read the source**

```bash
cat packages/web-ui/src/components/skeleton.tsx
```

It applies a background and Tailwind's `animate-pulse`.

- [ ] **Step 2: Write the failing test**

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders with compiled StyleX classes", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className.length).toBeGreaterThan(0);
    expect(el.className).not.toMatch(/animate-pulse|bg-/);
  });

  it("keeps its data-slot hook", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.getAttribute("data-slot")).toBe("skeleton");
  });
});
```

- [ ] **Step 3: Run it — expect FAIL** (module not found).

```bash
cd packages/web-ui-stylex && bunx vitest run src/components/skeleton.test.tsx
```

- [ ] **Step 4: Write the component**

`animate-pulse` has no StyleX equivalent, so define the keyframes explicitly. Tailwind's `animate-pulse` is `opacity: 1 → .5 → 1` over 2s with `cubic-bezier(0.4, 0, 0.6, 1)`, infinite.

```tsx
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import * as React from "react";

import { colors } from "@interviews-tool/design-tokens/tokens.stylex";

/* Tailwind's animate-pulse, written out: StyleX has no utility layer, so the
   keyframes are declared here and referenced by name. */
const pulse = stylex.keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.5 },
});

const styles = stylex.create({
  root: {
    backgroundColor: colors.surface2,
    borderRadius: 6,
    animationName: pulse,
    animationDuration: "2s",
    animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
    animationIterationCount: "infinite",
  },
});

export type SkeletonProps = Omit<React.ComponentProps<"div">, "className" | "style"> & {
  style?: StyleXStyles;
};

export function Skeleton({ style, ...props }: SkeletonProps) {
  return <div data-slot="skeleton" {...stylex.props(styles.root, style)} {...props} />;
}
```

**Check the real source before accepting these values** — if `packages/web-ui/src/components/skeleton.tsx` uses a different token or radius, use what it actually uses. The token here must match, or the pixels change.

- [ ] **Step 5: Run the test — expect PASS.**

- [ ] **Step 6: Export it** in `src/index.ts`:

```ts
export { Skeleton, type SkeletonProps } from "./components/skeleton";
```

- [ ] **Step 7: Flip the 5 call sites.** Every one passes sizing classes (`h-4 w-32` and similar), so each needs a local `stylex.create` block and a `style` prop. Use the spacing scale in `05-porting-conventions.md`: `h-4` is `height: 16`, `w-32` is `width: 128`.

Verify no stragglers:

```bash
grep -rn '<Skeleton' apps/web-stylex/src --include='*.tsx' | grep -i classname
```

- [ ] **Step 8: Verify**

```bash
bun run build --filter=web-stylex && bun run test --filter=web-stylex
git diff main -- apps/web
```

- [ ] **Step 9: Visual gate — and be honest about it**

Run the harness as in Task 1 Step 9. It must stay at or below 0.1%, **but note in your report that `Skeleton` appears on no public route**, so the harness does not actually exercise this change. Your evidence is the unit test, the build, and a careful read of the diff.

- [ ] **Step 10: Update the tracker row, then commit**

```bash
git commit -m "feat(web-ui-stylex): port Skeleton and its 5 call sites

animate-pulse is written out as explicit stylex.keyframes. No public route
renders Skeleton, so the compare harness does not cover this change."
```

---

## Task 3: `Input` and `Textarea`

These two are batched deliberately: `Textarea` is `Input` with a different element and one extra property, they share the same single hard selector, and splitting them would mean two PRs with near-identical review surface.

**Files:**

- Create: `packages/web-ui-stylex/src/components/input.tsx`, `input.test.tsx`, `textarea.tsx`, `textarea.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify (`Input`, 9 files): `components/sign-in-form.tsx`, `components/sign-up-form.tsx`, `components/hiring-process/company-details-fields.tsx`, `components/hiring-process/hiring-process-form.tsx`, `components/interaction/edit-interaction-dialog.tsx`, `components/interaction/questions-panel.tsx`, `components/interaction/interaction-form.tsx`, `routes/_authenticated/hiring-processes/index.tsx`, `routes/_authenticated/hiring-processes/$id.tsx`
- Modify (`Textarea`, 1 file): `components/hiring-process/company-details-fields.tsx`
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Consumes: the `style?: StyleXStyles` shape from Task 1.
- Produces: `Input`, `InputProps`, `Textarea`, `TextareaProps`.

### The source

`packages/web-ui/src/components/input.tsx` (full text):

```tsx
import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";

import { cn } from "../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "border-border bg-surface-2 hover:border-border-strong aria-invalid:border-danger h-9 rounded-md border px-3 py-1 text-sm transition-colors file:h-6 file:text-sm file:font-medium file:text-foreground placeholder:text-text-muted w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
```

### The rulings for this task

| Tailwind                      | Ruling                                                                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aria-invalid:border-danger`  | **Not** a `when.*` case. The component receives `aria-invalid` as its own prop, so read it in JS: `stylex.props(styles.root, props["aria-invalid"] && styles.invalid, style)`.                       |
| `file:*` (5 classes)          | `::file-selector-button` is a pseudo-element. StyleX supports pseudo-elements as top-level keys: `"::file-selector-button": { … }`.                                                                  |
| `placeholder:text-text-muted` | `"::placeholder": { color: colors.textMuted }`.                                                                                                                                                      |
| `hover:` / `disabled:`        | Plain pseudo-classes — supported directly as conditional values.                                                                                                                                     |
| `h-9` / `px-3` / `py-1`       | Scale lookups: 36 / 12 / 4. Because `py` and `px` differ, write **longhands** — `paddingBlock` and `paddingInline`, or all four. Mixing `padding` with `paddingTop` in one object is a StyleX error. |

- [ ] **Step 1: Write both failing tests**

`input.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./input";

describe("Input", () => {
  it("renders with compiled classes and no Tailwind strings", () => {
    render(<Input placeholder="Email" />);
    const el = screen.getByPlaceholderText("Email");
    expect(el.className.length).toBeGreaterThan(0);
    expect(el.className).not.toMatch(/bg-surface-2|rounded-md|border-border/);
  });

  it("applies an invalid style when aria-invalid is set", () => {
    render(<Input placeholder="A" />);
    render(<Input placeholder="B" aria-invalid />);
    const plain = screen.getByPlaceholderText("A");
    const invalid = screen.getByPlaceholderText("B");
    expect(invalid.className).not.toBe(plain.className);
  });
});
```

`textarea.test.tsx`: the same two tests, rendering `<Textarea placeholder="…" />` and asserting the element is a `TEXTAREA`.

- [ ] **Step 2: Run both — expect FAIL** (modules not found).

- [ ] **Step 3: Write `input.tsx`**

```tsx
import { Input as InputPrimitive } from "@base-ui/react/input";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import * as React from "react";

import { colors } from "@interviews-tool/design-tokens/tokens.stylex";

const styles = stylex.create({
  root: {
    width: "100%",
    minWidth: 0,
    height: 36,
    paddingInline: 12,
    paddingBlock: 4,
    fontSize: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.border, ":hover": colors.borderStrong },
    backgroundColor: colors.surface2,
    outline: "none",
    transitionProperty: "color, background-color, border-color",
    transitionDuration: "150ms",
    pointerEvents: { default: null, ":disabled": "none" },
    cursor: { default: null, ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": 0.45 },
    "::placeholder": { color: colors.textMuted },
    "::file-selector-button": {
      display: "inline-flex",
      height: 24,
      borderWidth: 0,
      backgroundColor: "transparent",
      fontSize: 14,
      fontWeight: 500,
      color: colors.foreground,
    },
  },
  invalid: { borderColor: colors.danger },
});

export type InputProps = Omit<React.ComponentProps<"input">, "className" | "style"> & {
  style?: StyleXStyles;
};

export function Input({ style, type, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      {...stylex.props(styles.root, props["aria-invalid"] ? styles.invalid : null, style)}
      {...props}
    />
  );
}
```

**Check every token name against `packages/design-tokens/src/tokens.ts` before running.** If `foreground` is not a key there, use the one the CSS alias resolves to. A wrong token name is a type error, which is the point.

- [ ] **Step 4: Write `textarea.tsx`** the same way. Read `packages/web-ui/src/components/textarea.tsx` first and match its real values — it differs from `Input` in element, `minHeight`, and `resize`.

- [ ] **Step 5: Run both tests — expect PASS.**

- [ ] **Step 6: Export both** in `src/index.ts`.

- [ ] **Step 7: Flip the call sites** — 9 for `Input`, 1 for `Textarea`. Several pass `className` for width or spacing; convert each to a local `stylex.create` and a `style` prop.

- [ ] **Step 8: Verify** — build, test, `git diff main -- apps/web` empty.

- [ ] **Step 9: Visual gate.** `Input` renders on `/auth/login` and `/auth/signup`, so this one **is** genuinely covered on two routes. Expect 12/12 at or below 0.1%.

- [ ] **Step 10: Tracker rows for `input` and `textarea`, then commit.**

---

## Task 4: `Checkbox`

**Files:**

- Create: `packages/web-ui-stylex/src/components/checkbox.tsx`, `checkbox.test.tsx`
- Create: `packages/web-ui-stylex/src/lib/icon.ts`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify (1 call site): `components/interaction/questions-panel.tsx`
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Produces: `Checkbox`, `CheckboxProps`, and `export const icon` from `src/lib/icon.ts` — a `stylex.create` namespace with `xs` (12px), `sm` (16px) and `md` (20px) sizes. **Tasks in later plans reuse `icon`; create it here.**

Only 26 lines, but it carries five `aria-invalid:` classes and one `[&>svg]:size-3`, so it is where the icon convention gets established.

- [ ] **Step 1: Create the shared icon styles**

`packages/web-ui-stylex/src/lib/icon.ts`:

```ts
import * as stylex from "@stylexjs/stylex";

/* Replaces Tailwind's [&_svg]:size-* descendant selectors, which StyleX does
   not support. The icon styles itself instead of being styled by its parent:
   <Check {...stylex.props(icon.xs)} />. */
export const icon = stylex.create({
  xs: { width: 12, height: 12, flexShrink: 0, pointerEvents: "none" },
  sm: { width: 16, height: 16, flexShrink: 0, pointerEvents: "none" },
  md: { width: 20, height: 20, flexShrink: 0, pointerEvents: "none" },
});
```

Export it from `src/index.ts`: `export { icon } from "./lib/icon";`

- [ ] **Step 2: Read the source and write the failing test**

```bash
cat packages/web-ui/src/components/checkbox.tsx
```

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("renders with compiled classes and no Tailwind strings", () => {
    const { container } = render(<Checkbox />);
    const el = container.querySelector('[data-slot="checkbox"]') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.className.length).toBeGreaterThan(0);
    expect(el.className).not.toMatch(/border-|size-|ring-/);
  });

  it("applies an invalid style when aria-invalid is set", () => {
    const a = render(<Checkbox />);
    const b = render(<Checkbox aria-invalid />);
    const elA = a.container.querySelector('[data-slot="checkbox"]')!;
    const elB = b.container.querySelector('[data-slot="checkbox"]')!;
    expect(elB.className).not.toBe(elA.className);
  });
});
```

- [ ] **Step 3: Run it — expect FAIL.**

- [ ] **Step 4: Write the component.** Rulings:
  - All five `aria-invalid:*` classes collapse into **one** `invalid` namespace applied conditionally from the `aria-invalid` prop, exactly as in Task 3. Do not reach for `when.*` — the component owns this attribute.
  - `[&>svg]:size-3` disappears: the check icon inside renders as `<CheckIcon {...stylex.props(icon.xs)} />`.
  - `data-[state=checked]` styling, if present, comes from Base UI's checkbox state, which the primitive exposes — read the real source and use the state it gives you rather than an attribute selector.

- [ ] **Step 5: Run the test — expect PASS.**

- [ ] **Step 6: Export, flip the single call site, verify** — build, test, `git diff main -- apps/web` empty.

- [ ] **Step 7: Visual gate — honest note.** `Checkbox` appears only in `questions-panel.tsx`, which is authenticated. The harness does not cover it. Say so.

- [ ] **Step 8: Tracker, then commit.**

---

## Task 5: `StatusBadge`, and retire `Badge`

**Files:**

- Create: `packages/web-ui-stylex/src/components/status-badge.tsx`, `status-badge.test.tsx`
- Modify: `packages/web-ui-stylex/src/index.ts`
- Modify (6 call sites): `components/hiring-process/status-field.tsx`, `components/hiring-process/hiring-process-table.tsx`, `components/hiring-process/process-board.tsx`, `components/interaction/live-note.tsx`, `routes/index.tsx`, `routes/_authenticated/hiring-processes/$id.tsx`
- Modify: `docs/tailwind-to-stylex-migration/06-tracker.md`

**Interfaces:**

- Produces: nothing shared beyond the component itself. (An earlier draft of this task planned a shared `variant()` helper in `packages/web-ui-stylex/src/lib/variants.ts`; it does not work — see the note at Step 4 — and was removed after this task's own execution found the bug.)
- Produces: `StatusBadge`, `StatusBadgeProps`, `statusLabels`.

**`Badge` is not ported.** Verify first, then record the finding:

```bash
grep -rn '<Badge' apps/web-stylex/src --include='*.tsx'
```

This returns **nothing** — `Badge` is exported by `web-ui` but used nowhere in the app. Do not port it. Mark its tracker row `retire — unused` alongside `test-component`. If the grep unexpectedly returns hits, stop and report: the plan's premise is wrong and the component needs porting after all.

`StatusBadge` is the interesting one: it has a `cva` block mapping nine hiring statuses to nine `bg`/`text`/`border` token triples, and **zero** hard selectors.

- [ ] **Step 1: Read the source**

```bash
cat packages/web-ui/src/components/status-badge.tsx
```

Note its exports: `StatusBadge`, `statusBadgeVariants`, `statusLabels`. `statusLabels` is plain data — copy it across unchanged. `statusBadgeVariants` was the `cva` handle; it does not survive, and nothing outside the component should import it (verify with `grep -rn statusBadgeVariants apps/web-stylex/src`).

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the label for a status", () => {
    render(<StatusBadge status="ongoing" />);
    expect(screen.getByText(/ongoing/i)).toBeTruthy();
  });

  it("gives different statuses different compiled classes", () => {
    const a = render(<StatusBadge status="ongoing" />);
    const b = render(<StatusBadge status="rejected" />);
    const elA = a.container.firstElementChild!;
    const elB = b.container.firstElementChild!;
    expect(elA.className).not.toBe(elB.className);
    expect(elA.className).not.toMatch(/bg-status-/);
  });
});
```

Adjust `status` values and the label assertion to whatever the real component accepts — read it first.

- [ ] **Step 3: Run it — expect FAIL.**

- [ ] **Step 4: Write the component.** The `cva` block becomes a `stylex.create` namespace with one entry per status, indexed **directly** at the call site — `byStatus[known ?? "unknown"]` — never through a shared helper function. A prior version of this task routed the selection through a `variant(map, key, fallback)` helper; `@stylexjs/babel-plugin@0.19.0` dead-code-eliminates a `stylex.create()` binding whose only access is hidden inside a function call, which produces `ReferenceError: byStatus is not defined` at runtime (not a build error). See `05-porting-conventions.md` §3.3.

```tsx
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";

import { colors } from "@interviews-tool/design-tokens/tokens.stylex";

const base = stylex.create({
  root: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    flexShrink: 0,
    whiteSpace: "nowrap",
    gap: 4,
    paddingInline: 8,
    paddingBlock: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: "solid",
    fontSize: 12,
    fontWeight: 500,
  },
});

/* One namespace per hiring status. The token triples come straight from
   status-badge.tsx's cva block — terminal states are solid with no border,
   active states are tinted with a border. */
const byStatus = stylex.create({
  ongoing: {
    backgroundColor: colors.stOngoingBg,
    color: colors.stOngoingText,
    borderColor: colors.stOngoingBorder,
  },
  // …one entry per status, transcribed from the source
});
```

Transcribe **every** status from the real `cva` block. Terminal states (`offerAccepted`, `hired`, `rejected`, `droppedOut`) have no border token — give them `borderColor: "transparent"` so the border width does not shift the layout.

- [ ] **Step 5: Run the test — expect PASS.**

- [ ] **Step 6: Export, flip the 6 call sites, verify.**

- [ ] **Step 7: Visual gate.** `routes/index.tsx` is the **landing page**, so `StatusBadge` is genuinely covered by the harness on a public route. Expect 12/12 at or below 0.1%. This is the best-covered component in this plan — a status colour that drifts will show up.

- [ ] **Step 8: Tracker — `status-badge` done, `badge` retire — then commit.**

---

## Task 6: Open the PR

- [ ] **Step 1: Full verification from a clean tree**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.20.0
git status --porcelain                 # clean
bun install
bun run build                          # whole monorepo
bun run test
bun run lint
git diff main -- apps/web              # empty
```

- [ ] **Step 2: Confirm nothing regressed in the imports**

```bash
grep -rn 'Label\|Skeleton\|Input\|Textarea\|Checkbox\|StatusBadge' apps/web-stylex/src --include='*.tsx' | grep 'from "@interviews-tool/web-ui"'
```

Must return nothing — every one of these six now comes from `web-ui-stylex`.

- [ ] **Step 3: Final harness run** — 12/12 at or below 0.1%.

- [ ] **Step 4: Open the PR**

```bash
git push -u origin feat/web-stylex-phase-3a
gh pr create --repo niway-dev/tapuy-hiring-tool --base main \
  --title "feat: port the six primitive components to StyleX (phase 3a)"
```

The body must state, per component: how many call sites moved, which hard selectors were translated and how, and **whether the harness actually covered it**. `Label`, `Input` and `StatusBadge` are covered on public routes; `Skeleton`, `Textarea` and `Checkbox` are not. Say which is which — a reader who sees a green harness will otherwise assume all six were verified.

---

## Self-review

**Spec coverage:** D4 (components in `web-ui-stylex`, seeded and re-themed) → Tasks 1–5. D5 (`style?: StyleXStyles`, no `className`) → the prop shape in every task. D6 (component + call sites in one PR) → each task flips all its call sites before committing. D7 (`when.*` only where state lives elsewhere) → Task 1's `Label` is two of the four sanctioned sites; Tasks 3 and 4 explicitly rule _against_ `when.*` for `aria-invalid`, which the component owns. D8 (plain CSS survivors) → untouched by this plan.

**Placeholders:** `StatusBadge`'s `byStatus` block shows one entry and instructs transcription of the rest, because the nine triples must come from the real source rather than my recollection — transcribing them here from memory would be the actual error. Every other code block is complete. Where a token name or value must be checked against the source, the step says so explicitly rather than guessing.

**Type consistency:** `style?: StyleXStyles` with `Omit<…, "className" | "style">` is identical across Tasks 1–5. `icon` is created in Task 4 and reused by later plans, corrected to a 12/14/16px scale after Task 4's own execution found the initial 12/16/20px guess didn't match any real component. Task 5's `cva` replacement indexes its namespace directly (`byStatus[key ?? "unknown"]`) rather than through the `variant()` helper this plan originally specified — that helper was created, found to cause a runtime `ReferenceError` via `@stylexjs/babel-plugin`'s dead-code elimination, and removed; Phases 3B and 3C were corrected to match before either was dispatched.

**Known gap carried in:** the harness reaches 12 of 28 screenshots. Three of these six components are not covered by it, and each task says so at its verification step rather than implying otherwise.
