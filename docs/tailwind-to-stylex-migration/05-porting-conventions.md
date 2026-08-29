# Porting conventions — Tailwind → StyleX

**Date:** 2026-08-28
**Status:** normative for Phases 3 and 4
**Settles:** the spec's §5 summary table, expanded into the full rules
**Inputs:** `spec-web-stylex.md` (D5–D8), `02-plan-review.md` §2.1, `01-baseline-analysis.md` §4, `03-spike-findings.md`

Phases 3 and 4 are worked in parallel, one component or one route group per PR,
by different people. This document is the shared translation. Follow it even
where you would have chosen differently — a coherent migration is worth more
than a locally optimal one. If a rule here is wrong, change the rule in a PR
against this file, then follow the new one.

Every count below is quoted from a document in this folder, with the section
named. Nothing here is estimated. Where a number was never measured it says
`not measured`.

---

## 0. The shape of the job

From `01-baseline-analysis.md` §4, measured:

| Surface                                       |   Count |
| --------------------------------------------- | ------: |
| `className=` occurrences in `apps/web`        | **563** |
| `className=` occurrences in `packages/web-ui` |  **94** |
| `cn()` merge-helper calls                     |  **83** |
| `cva()` variant definitions                   |   **4** |
| Arbitrary-value escapes `[...]`               |   **9** |

657 `className` sites, 4 variant definitions. The variant machinery is small;
the volume is in plain utility strings. Most of a porting PR is mechanical
transcription against §2's tables. The interesting 10% is §7.

**Five rules that cover most of it.**

1. Styles are declared with `stylex.create` at module scope and applied with
   `stylex.props`. Never build a style object inline in the render.
2. Colours come from `colors.*` in `@interviews-tool/design-tokens/tokens.stylex`.
   Never a hex literal, never `var(--surface)`. See §9.
3. Lengths are unitless numbers (StyleX appends `px`) or explicit strings.
   `p-4` is `padding: 16`. See §2.
4. One property, one form: shorthand **or** longhands, never both in the same
   style object. See §4.
5. Ported components take `style?: StyleXStyles`, not `className`. See §5.

---

## 1. The two calls, and where they live

```tsx
import * as stylex from "@stylexjs/stylex";
import { colors } from "@interviews-tool/design-tokens/tokens.stylex";

const styles = stylex.create({
  base: {
    display: "flex",
    alignItems: "center",
    backgroundColor: colors.surface,
    color: colors.text,
  },
});

function Thing(props: React.ComponentProps<"div">) {
  return <div {...stylex.props(styles.base)} {...props} />;
}
```

`stylex.create` is compiled away by `@stylexjs/babel-plugin` at build time. It
must be called at module scope with a statically analysable object literal — no
variables holding values, no spreads from another module, no computed keys.
Violating that fails the **build**, not a lint pass (D13: there is no
`@stylexjs/eslint-plugin` here; the Babel plugin is the linter).

`stylex.props(...)` returns `{ className, style }` and is spread onto the
element. Later arguments win over earlier ones — that is the whole merge model,
and it replaces the 83 `cn()` calls that resolve merge order at runtime today.

**Order matters and it is the API.** Caller styles go last:

```tsx
stylex.props(styles.base, variants[variant], style);
```

---

## 2. Scales — do not re-derive these

### 2.1 Spacing

Tailwind 4's default spacing step is `0.25rem`, and `packages/web-ui/src/styles.css`
does not override `--spacing`. So `p-4` = `1rem` = **16px**. The full scale used
in this repo:

| Tailwind suffix | rem      |  px | StyleX value |
| --------------- | -------- | --: | -----------: |
| `0`             | 0        |   0 |            0 |
| `0.5`           | 0.125rem |   2 |            2 |
| `1`             | 0.25rem  |   4 |            4 |
| `1.5`           | 0.375rem |   6 |            6 |
| `2`             | 0.5rem   |   8 |            8 |
| `2.5`           | 0.625rem |  10 |           10 |
| `3`             | 0.75rem  |  12 |           12 |
| `3.5`           | 0.875rem |  14 |           14 |
| `4`             | 1rem     |  16 |           16 |
| `5`             | 1.25rem  |  20 |           20 |
| `6`             | 1.5rem   |  24 |           24 |
| `8`             | 2rem     |  32 |           32 |
| `10`            | 2.5rem   |  40 |           40 |
| `12`            | 3rem     |  48 |           48 |
| `16`            | 4rem     |  64 |           64 |
| `20`            | 5rem     |  80 |           80 |
| `24`            | 6rem     |  96 |           96 |

This table applies to every spacing-scale utility, not just padding: `p-*`,
`m-*`, `gap-*`, `size-*`, `w-*`, `h-*`, `top-*`, `inset-*`, `translate-*`.
`size-9` is `{ width: 36, height: 36 }`. `h-9` is `{ height: 36 }`.

Write the number, not the string: `padding: 16`, not `padding: "16px"`. StyleX
appends `px` to bare numbers for length properties. Unitless properties
(`flexGrow`, `opacity`, `zIndex`, `lineHeight` as a ratio) stay numbers and are
not suffixed.

### 2.2 Radii

`--radius` is `0.5rem` = 8px (`packages/web-ui/src/styles.css:88`), and the
scale is derived from it (lines 212–218):

| Tailwind       | CSS                       |         px |
| -------------- | ------------------------- | ---------: |
| `rounded-sm`   | `calc(var(--radius) - 4)` |          4 |
| `rounded-md`   | `calc(var(--radius) - 2)` |          6 |
| `rounded-lg`   | `var(--radius)`           |          8 |
| `rounded-xl`   | `calc(var(--radius) + 4)` |         12 |
| `rounded-2xl`  | `calc(var(--radius) + 8)` |         16 |
| `rounded-3xl`  | `calc(var(--radius)+12)`  |         20 |
| `rounded-4xl`  | `calc(var(--radius)+16)`  |         24 |
| `rounded-none` | —                         |          0 |
| `rounded-full` | —                         | `"9999px"` |

The comment in `styles.css:211` states the intent: **control 6px (`md`), badge
5px, card 12px (`xl`)**. `badge.tsx` uses `rounded-[5px]` — one of the 9
arbitrary values; it becomes `borderRadius: 5`.

### 2.3 Type

| Tailwind      | fontSize |  px | lineHeight |
| ------------- | -------- | --: | ---------- |
| `text-xs`     | 0.75rem  |  12 | 16px       |
| `text-[13px]` | —        |  13 | inherit    |
| `text-sm`     | 0.875rem |  14 | 20px       |
| `text-base`   | 1rem     |  16 | 24px       |
| `text-lg`     | 1.125rem |  18 | 28px       |

`text-sm/relaxed` is `{ fontSize: 14, lineHeight: 1.625 }`. `text-xs/relaxed` is
`{ fontSize: 12, lineHeight: 1.625 }`. `leading-none` is `lineHeight: 1`;
`leading-snug` is `1.375`.

Font weights: `font-medium` = `500`, `font-semibold` = `600`, `font-normal` = `400`.

---

## 3. The translation table

Every row of `spec-web-stylex.md` §5, with a real before/after from this repo.
The "before" snippets are quoted verbatim from `packages/web-ui/src/components/`
and `apps/web/src/`, at the file and line named.

### 3.1 A plain utility string

**Before** — `packages/web-ui/src/components/card.tsx:66-74`:

```tsx
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  );
}
```

**After** (ignoring the `group-data-` part, which §7.2 handles):

```tsx
const styles = stylex.create({
  content: { paddingInline: 16 },
  contentSm: { paddingInline: 12 },
});

function CardContent({ style, size = "default", ...props }: CardContentProps) {
  return <div data-slot="card-content" {...stylex.props(styles.content, size === "sm" && styles.contentSm, style)} {...props} />;
}
```

A falsy argument to `stylex.props` is ignored. `cond && styles.x` is the
idiomatic conditional and it is used constantly below.

### 3.2 `cn(base, className)` → `stylex.props(styles.base, style)`

**Before** — `packages/web-ui/src/components/card.tsx:36-44`:

```tsx
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-sm font-medium group-data-[size=sm]/card:text-sm", className)}
      {...props}
    />
  );
}
```

**After:**

```tsx
const styles = stylex.create({
  title: { fontSize: 14, fontWeight: 500 },
});

function CardTitle({ style, ...props }: CardTitleProps) {
  return <div data-slot="card-title" {...stylex.props(styles.title, style)} {...props} />;
}
```

Note the source's `group-data-[size=sm]/card:text-sm` is a no-op — it sets the
same `text-sm` the base already sets. Ported code drops it. Finding dead
Tailwind like this is normal; delete it, and say so in the PR description so the
reviewer knows the compare diff is expected to stay at 0.

### 3.3 `cva(base, { variants })` → `stylex.create` + `variant()`

See §6. Worked in full on `button.tsx`.

### 3.4 `hover:` `focus-visible:` `disabled:` → pseudo-class conditions

Supported natively. **114 sites** (`02-plan-review.md` §2.1).

**Before** — `packages/web-ui/src/components/button.tsx:13,21`:

```tsx
default: "bg-mint text-mint-on hover:bg-mint-hover",
link: "text-mint underline-offset-4 hover:underline",
```

**After:**

```tsx
const variants = stylex.create({
  default: {
    backgroundColor: { default: colors.mint, ":hover": colors.mintHover },
    color: colors.mintOn,
  },
  link: {
    color: colors.mint,
    textUnderlineOffset: 4,
    textDecorationLine: { default: "none", ":hover": "underline" },
  },
});
```

The condition object is per **property**, not per rule. Every branch of a
condition object must set the same property, and the `default` key is required.

`disabled:pointer-events-none disabled:opacity-45` (`button.tsx:9`) becomes:

```tsx
{
  pointerEvents: { default: null, ":disabled": "none" },
  opacity: { default: 1, ":disabled": 0.45 },
}
```

`null` means "do not emit this declaration" — it is how you express "no value in
the default case" without inventing one.

### 3.5 `sm:` `md:` `lg:` → `@media` conditions

Supported natively. **47 sites** (`02-plan-review.md` §2.1). Same condition-object
shape, media query as the key:

**Before** — `packages/web-ui/src/components/alert.tsx:55`:

```tsx
"text-muted-foreground text-xs/relaxed text-balance md:text-pretty ..."
```

**After:**

```tsx
description: {
  color: colors.mutedForeground,
  fontSize: 12,
  lineHeight: 1.625,
  textWrap: { default: "balance", "@media (min-width: 768px)": "pretty" },
},
```

Breakpoints: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px — Tailwind
defaults, not overridden in `styles.css`.

### 3.6 `dark:` → nothing

**5 sites** (`02-plan-review.md` §2.1). They disappear. A token means the right
colour in both themes because `lightTheme` (`createTheme`) is applied as a class
on `<html>` per D12. If you are writing a `dark:` conditional in StyleX, you are
using a hex literal somewhere; go back to §9.

### 3.7 `[&_svg]:size-4` → the icon styles itself

See §7.3. **39 sites** (`02-plan-review.md` §2.1).

### 3.8 `data-[state=open]:` / `aria-expanded:` → JS conditional

See §7.1 and §7.4.

### 3.9 `data-[variant=x]:` / `data-[icon=…]:` → a real prop

See §7.2.

### 3.10 `group-hover:` / `peer-disabled:` → `stylex.when.*`

See §7.5. **3 sites, and only those 3 are sanctioned** (D7).

### 3.11 `animate-in fade-in slide-in-from-top-2` → `stylex.keyframes`

See §7.6. **19 sites** (`02-plan-review.md` §2.1).

### 3.12 `.mono` / `.display` utilities → `typography` from `design-tokens`

`packages/web-ui/src/styles.css:246-259` defines two custom utilities in
`@layer utilities`. `packages/design-tokens/src/tokens.stylex.ts:88` already
exports the font stacks as StyleX vars:

```tsx
import { typography } from "@interviews-tool/design-tokens/tokens.stylex";

const text = stylex.create({
  mono: { fontFamily: typography.mono, fontVariantNumeric: "tabular-nums" },
  display: { fontFamily: typography.display, fontWeight: 400, letterSpacing: "-0.01em" },
});
```

`.mono` and `.tabular` are the same rule today; port both call sites to
`text.mono`. `.display` is landing-page-only by convention ("solo landing /
README / og:image, nunca dentro de la app" — `styles.css:252`); keep that.

---

## 4. The longhand rule

**StyleX rejects a shorthand and a longhand for the same property in one style
object.** This is a build error, not a warning.

```tsx
// ✗ fails the build
const styles = stylex.create({
  card: {
    padding: 16,
    paddingTop: 0,   // ← shorthand + longhand
  },
});
```

The error names the property:

```
[BABEL] .../card.tsx: The 'padding' property is a shorthand property that
may override the longhand property 'paddingTop'. Use longhand properties
instead.
```

**The fix: write every side longhand the moment any one side differs.**

```tsx
// ✓
const styles = stylex.create({
  card: {
    paddingTop: 0,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
  },
});
```

The two-value shorthands are safe and preferred where all sides on that axis
agree:

| Tailwind  | StyleX                 |
| --------- | ---------------------- |
| `p-4`     | `padding: 16`          |
| `px-4`    | `paddingInline: 16`    |
| `py-2`    | `paddingBlock: 8`      |
| `pt-0`    | `paddingTop: 0`        |
| `mx-auto` | `marginInline: "auto"` |

Same rule for `margin`, `inset`, `border`, `borderRadius`, `gap`,
`backgroundPosition`, `overflow`. `border` is the sharpest one in this repo,
because `button.tsx:9` sets `border border-transparent` and the variants then
override only the colour (`border-border-strong`, line 15).

Merging across **separate** `stylex.create` namespaces is fine — the rule is
per style object, and `stylex.props(styles.base, variants.outline)` is two
objects, so `border` in one and `borderColor` in the other does not error. It
does something worse: the shorthand's specificity is unspecified against the
longhand, and which one wins is not something you should be reasoning about.
Expand the base:

```tsx
base: {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
},
```

Use `borderWidth`/`borderStyle`/`borderColor`, not `border`, on anything a
variant will touch. In practice: always, on components with variants.

---

## 5. The `style` prop contract (D5, D6)

### 5.1 The signature

A ported component takes `style?: StyleXStyles` and **does not accept
`className`**.

```tsx
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";

type CardProps = Omit<React.ComponentProps<"div">, "className" | "style"> & {
  size?: "default" | "sm";
  style?: StyleXStyles;
};

function Card({ style, size = "default", ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      {...stylex.props(styles.card, size === "sm" && styles.cardSm, style)}
      {...props}
    />
  );
}
```

`Omit<..., "className" | "style">` is load-bearing. Without it the DOM
element's own `className: string` and `style: CSSProperties` stay in the type,
`style?: StyleXStyles` conflicts with the inherited `style`, and a Tailwind
string passed as `className` type-checks.

Spread `{...stylex.props(...)}` **before** `{...props}` only when `props` no
longer carries `className`/`style` — which the `Omit` guarantees. Keep that
order consistent so reviewers can scan it.

### 5.2 The call site

**Before** — `apps/web/src/routes/index.tsx:140`:

```tsx
<Card className="mt-6 px-4 py-4">
```

**After** — in `apps/web-stylex/src/routes/index.tsx`:

```tsx
const styles = stylex.create({
  section: { marginTop: 24, paddingInline: 16, paddingBlock: 16 },
});

<Card style={styles.section}>
```

The style object lives in the **calling** file, at module scope. Do not export
"spacing helper" styles from `web-ui-stylex` for call sites to reuse; that
recreates a utility framework, badly.

### 5.3 Why the prop is renamed, and why the PR is atomic

**A Tailwind string passed to a ported component is a silent no-op.** The
component ignores `className` entirely: no error, no warning, no console
message. The element simply renders without those styles, and unless somebody
looks at that exact pixel, nothing tells you.

That is the entire reason D5 renames the prop instead of keeping `className`
alongside `style`. A removed prop is a **type error at every call site**. A
kept-but-ignored prop is a visual regression discovered weeks later.

It follows (D6) that **the unit of work is one component plus every call site
that styles it, in one PR**. You cannot flip a component in isolation. To find
the call sites:

```bash
grep -rn '<Card' apps/web-stylex/src --include='*.tsx'
```

Mixed files are fine and expected during coexistence: a StyleX `Button` next to
Tailwind `div`s in the same file compiles, because both systems are live in
`apps/web-stylex` until Phase 5.

---

## 6. Variants — the 4 `cva` definitions

There are **4** `cva()` calls in the whole repo (`01-baseline-analysis.md` §4),
all in `packages/web-ui/src/components/`: `button.tsx:8`, `badge.tsx:7`,
`alert.tsx:6`, `status-badge.tsx:21`. `class-variance-authority` does two
things — pick a set of classes by key, and merge them with the caller's. StyleX
already does the merge in `stylex.props`, so only the _pick_ needs replacing.
That is `packages/web-ui-stylex/src/lib/variants.ts`, in full:

```ts
export function variant<M extends Record<string, unknown>>(
  map: M,
  key: keyof M | undefined,
  fallback: keyof M,
): M[keyof M] {
  return map[key ?? fallback];
}
```

### 6.1 Worked example: `button.tsx`

**Before** — `packages/web-ui/src/components/button.tsx:8-56`, abridged to the
parts that translate directly (the `[&_svg]` and `has-data-[icon=…]` parts are
§7.3 and §7.2):

```tsx
const buttonVariants = cva(
  "aria-invalid:border-danger rounded-md border border-transparent bg-clip-padding text-sm font-medium ... disabled:pointer-events-none disabled:opacity-45 ... outline-none group/button select-none",
  {
    variants: {
      variant: {
        default: "bg-mint text-mint-on hover:bg-mint-hover",
        outline: "border-border-strong bg-transparent text-text hover:bg-surface-2 aria-expanded:bg-surface-2",
        // secondary, ghost, destructive, link …
      },
      size: {
        default: "h-9 gap-2 px-4 has-data-[icon=inline-end]:pr-3 ...",
        sm: "h-8 gap-1.5 rounded-md px-3 text-[13px] ...",
        icon: "size-9 rounded-md",
        // xs, lg, icon-xs, icon-sm, icon-lg …
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant = "default", size = "default", ...props }) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
```

**After** — `packages/web-ui-stylex/src/components/button.tsx`:

```tsx
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { colors } from "@interviews-tool/design-tokens/tokens.stylex";

import { variant } from "../lib/variants";

const styles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    whiteSpace: "nowrap",
    userSelect: "none",
    outline: "none",
    backgroundClip: "padding-box",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    fontSize: 14,
    fontWeight: 500,
    transitionProperty: "color, background-color, border-color",
    transitionDuration: "150ms",
    pointerEvents: { default: null, ":disabled": "none" },
    opacity: { default: 1, ":disabled": 0.45 },
  },
  invalid: { borderColor: colors.danger },
});

const variants = stylex.create({
  default: {
    backgroundColor: { default: colors.mint, ":hover": colors.mintHover },
    color: colors.mintOn,
  },
  outline: {
    borderColor: colors.borderStrong,
    backgroundColor: { default: "transparent", ":hover": colors.surface2 },
    color: colors.text,
  },
  secondary: {
    borderColor: colors.borderStrong,
    backgroundColor: { default: "transparent", ":hover": colors.surface2 },
    color: colors.text,
  },
  ghost: {
    backgroundColor: { default: "transparent", ":hover": colors.surface2 },
    color: { default: colors.textSecondary, ":hover": colors.text },
  },
  destructive: {
    backgroundColor: { default: colors.stRejectedBg, ":hover": colors.danger },
    color: colors.stRejectedText,
  },
  link: {
    color: colors.mint,
    textUnderlineOffset: 4,
    textDecorationLine: { default: "none", ":hover": "underline" },
  },
});

/* aria-expanded:bg-surface-2 / aria-expanded:text-text, per variant (§7.4). */
const expanded = stylex.create({
  default: {},
  outline: { backgroundColor: colors.surface2 },
  secondary: { backgroundColor: colors.surface2 },
  ghost: { backgroundColor: colors.surface2, color: colors.text },
  destructive: {},
  link: {},
});

const sizes = stylex.create({
  default: { height: 36, gap: 8, paddingInline: 16 },
  xs: { height: 24, gap: 4, paddingInline: 8, fontSize: 12 },
  sm: { height: 32, gap: 6, paddingInline: 12, fontSize: 13 },
  lg: { height: 40, gap: 8, paddingInline: 20 },
  icon: { width: 36, height: 36 },
  "icon-xs": { width: 24, height: 24 },
  "icon-sm": { width: 28, height: 28 },
  "icon-lg": { width: 40, height: 40 },
});

type ButtonProps = Omit<ButtonPrimitive.Props, "className" | "style"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  invalid?: boolean;
  isExpanded?: boolean;
  style?: StyleXStyles;
};

function Button({ style, variant: v, size: s, invalid, isExpanded, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      aria-invalid={invalid || undefined}
      aria-expanded={isExpanded}
      {...stylex.props(
        styles.base,
        variant(variants, v, "default"),
        variant(sizes, s, "default"),
        invalid && styles.invalid,
        isExpanded && variant(expanded, v, "default"),
        style,
      )}
      {...props}
    />
  );
}
```

Points that generalise to the other three `cva` sites:

- **One `stylex.create` call per axis.** `variants` and `sizes` are separate
  namespaces, selected independently, applied in order. Compound variants
  (`cva`'s `compoundVariants`) become a third namespace keyed by the pair —
  none of the 4 definitions here need one.
- **`keyof typeof variants` is the prop type.** Adding a variant to the object
  adds it to the type. No `VariantProps<typeof …>` import, no `cva` dependency.
- **`variant(map, key, fallback)` replaces `defaultVariants`.** The fallback is
  passed at the call, not declared in the map.
- **Sizes set numbers, not classes.** `h-9` → `height: 36` straight off §2.1.
  `size-9` → both `width` and `height`.
- **`aria-expanded:` became an `isExpanded` prop.** See §7.4. It is named
  `isExpanded` because `expanded` is the style namespace; pick whichever names
  do not collide and stay consistent within the file.
- **`group/button` disappears** unless something actually reads it. In
  `button.tsx` it is declared and never consumed — drop it, and say so in the
  PR.

### 6.2 `badge.tsx`, `alert.tsx`, `status-badge.tsx`

Same shape, smaller. `badge.tsx:7` has one axis (`variant`) with 6 keys and
`rounded-[5px]` → `borderRadius: 5`. `status-badge.tsx:21` is one axis keyed by
hiring status, mapping straight onto the `colors.st*Bg` / `st*Text` /
`st*Border` token triples. `alert.tsx:6` has one axis with 2 keys, and
its `destructive` variant reaches into a descendant
(`*:data-[slot=alert-description]:text-destructive/90`) — that is §7.2 plus
§7.3: `AlertDescription` takes the variant as a prop, or `Alert` renders it
through context. Do not try to reproduce the descendant selector.

---

## 7. The unsupported-selector playbook

`stylex.create` supports pseudo-classes, pseudo-elements and `@media`. It does
**not** support arbitrary attribute selectors on the element itself, nor
descendant combinators. This repo uses both, heavily.

Measured surface, all from `02-plan-review.md` §2.1:

| Construct                              |  Count | Section |
| -------------------------------------- | -----: | ------- |
| `data-[…]` on self (state + own props) | **69** | 7.1–7.2 |
| `[&_svg]:…` descendant                 | **39** | 7.3     |
| `aria-*:`                              | **14** | 7.4     |
| `group-*` / `peer-*`                   |  **3** | 7.5     |
| `animate-*`                            | **19** | 7.6     |

Where they live — `data-[…]` + `[&…]` per file, from the same section:

| File                                               |  Count |
| -------------------------------------------------- | -----: |
| `packages/web-ui/src/components/dropdown-menu.tsx` |     30 |
| `packages/web-ui/src/components/select.tsx`        |     20 |
| `packages/web-ui/src/components/button.tsx`        |     10 |
| `packages/web-ui/src/components/alert.tsx`         |     10 |
| `card.tsx`, `accordion.tsx`                        | 7 each |
| `alert-dialog.tsx`, `apps/web/.../live-note.tsx`   | 6 each |

**60% of the hard work is in four files, all in `web-ui`.** That is why the
Phase 3 order in `06-tracker.md` puts `dropdown-menu` and `select` last: the
conventions get proven on `label` and `badge` first.

### 7.1 `data-[state=open]:` → Base UI already told you (~55 of the 69)

Roughly 55 of the 69 `data-[…]` sites are component **state** written by Base UI
onto the element — `data-open`, `data-closed`, `data-checked`, `data-highlighted`,
`data-disabled`. The exact state/prop split within the 69 is not measured; the
category total is.

Base UI puts that state in JavaScript before it puts it in the DOM. Take it from
there.

**Before** — `packages/web-ui/src/components/dialog.tsx:54-57`:

```tsx
className={cn(
  "bg-surface data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 border-border-strong grid ... rounded-xl border p-5 ...",
  className,
)}
```

**After** — Base UI's `Popup` accepts a function for `className`, and its state
object carries `open`. Use it to pick the StyleX style, then hand the result to
`stylex.props`:

```tsx
<DialogPrimitive.Popup
  data-slot="dialog-content"
  {...stylex.props(styles.content, open ? styles.enter : styles.exit, style)}
  {...props}
/>
```

where `open` comes from the same `useDialogContext()`/render-prop state Base UI
already exposes. When the state is only available as a render prop:

```tsx
<DialogPrimitive.Popup
  render={(props, state) => (
    <div {...props} {...stylex.props(styles.content, state.open ? styles.enter : styles.exit, style)} />
  )}
/>
```

**Keep writing the `data-*` attribute** even after the style stops reading it.
Two existing tests assert on component markup, the compare harness resolves the
process link by `href`, and `data-slot` is how anyone debugging finds the
element. Removing the attribute is a separate decision from removing the
selector.

If the state genuinely lives on an **ancestor**, `stylex.when.ancestor` accepts
attribute selectors — but see D7 in §7.5 before reaching for it.

### 7.2 `data-[variant=x]:` and `data-[icon=…]:` → make them props again (~14)

The remaining ~14 `data-[…]` sites are not state at all. They are shadcn passing
a **React prop through a DOM attribute** so a CSS selector can read it back.
`data-[variant=destructive]` occurs 8 times, `data-[icon=inline-start|end]` 8
times, in a repo-wide grep of `apps/web/src` + `packages/web-ui/src`.

The value was in JavaScript. It went to the DOM only because CSS was the styling
language. In StyleX it never has to leave.

**Before** — `packages/web-ui/src/components/button.tsx:24`:

```tsx
default: "h-9 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
```

Read that: _if this button contains a child marked `data-icon=inline-end`, tighten
the right padding._ A parent styling itself from a descendant's attribute.

**After** — the caller says so:

```tsx
type ButtonProps = /* … */ & { icon?: "inline-start" | "inline-end" };

const iconInset = stylex.create({
  "inline-start": { paddingLeft: 12 },
  "inline-end": { paddingRight: 12 },
});

{...stylex.props(styles.base, sizes.default, icon && iconInset[icon], style)}
```

Call site becomes `<Button icon="inline-end">Save <ArrowRight /></Button>`.

Same treatment for `alert.tsx:13`'s
`*:data-[slot=alert-description]:text-destructive/90`: `Alert`'s variant is
passed to `AlertDescription` as a prop (or via a small context), and
`AlertDescription` picks its own style. **The child styles the child.** That
sentence resolves most of §7.

### 7.3 `[&_svg]:size-4` → the icon styles itself (39)

39 descendant selectors, and almost all of them are a parent sizing its icons.

**Before** — `packages/web-ui/src/components/button.tsx:9,25-26,29`:

```
[&_svg:not([class*='size-'])]:size-4      // default
[&_svg:not([class*='size-'])]:size-3      // xs
[&_svg:not([class*='size-'])]:size-3.5    // sm
[&_svg]:pointer-events-none [&_svg]:shrink-0
```

`[class*='size-']` is a CSS-level escape hatch for "unless the caller already
sized it". That whole mechanism exists because the parent could not ask.

**After** — `packages/web-ui-stylex` exports an `icon` style set, and the icon
takes it:

```tsx
// packages/web-ui-stylex/src/lib/icon.ts
export const icon = stylex.create({
  base: { pointerEvents: "none", flexShrink: 0 },
  xs: { width: 12, height: 12 },
  sm: { width: 14, height: 14 },
  md: { width: 16, height: 16 },
  lg: { width: 20, height: 20 },
});
```

```tsx
import { icon } from "@interviews-tool/web-ui-stylex";

<Button size="sm">
  <SaveIcon {...stylex.props(icon.base, icon.sm)} />
  Save
</Button>
```

`lucide-react` icons forward `className` and `style` to the `<svg>`, so
`stylex.props` spreads onto them directly.

The trade-off is explicit and accepted: **the caller now states the icon size
instead of inheriting it.** Slightly more typing at 39 sites, in exchange for
the size being visible where the icon is written. The `:not([class*='size-'])`
override disappears entirely, because there is nothing to override.

Export `icon` from `packages/web-ui-stylex/src/index.ts` in the first PR that
needs it — `button` or `badge`, whichever lands first — not as a speculative
scaffold.

### 7.4 `aria-invalid:` / `aria-expanded:` → the component already knows (14)

**Before** — `packages/web-ui/src/components/button.tsx:9,15`:

```
aria-invalid:border-danger
aria-expanded:bg-surface-2
```

The component sets `aria-expanded` itself (or Base UI does). Reading it back out
of the DOM to style it is a round trip through the renderer for no reason.

**After:**

```tsx
function Button({ invalid, expanded, ... }: ButtonProps) {
  return (
    <ButtonPrimitive
      aria-invalid={invalid || undefined}
      aria-expanded={expanded}
      {...stylex.props(styles.base, invalid && styles.invalid, expanded && styles.expanded, style)}
      {...props}
    />
  );
}
```

**Never drop the ARIA attribute.** It is the accessible name/state, not a
styling hook. The style stops reading it; the assistive technology does not.
When Base UI owns the attribute (`aria-expanded` on a trigger), take the boolean
from Base UI's state via the render prop, exactly as in §7.1, and keep letting
Base UI write the attribute.

### 7.5 `group-hover:` / `peer-disabled:` → the only sanctioned `stylex.when.*` (3)

**D7: `stylex.when.*` is allowed only where the state genuinely lives on another
element. There are 3 such sites today, in 3 files. Anything else is a JS
conditional or a style on the child.**

The three files, verified by grep against `apps/web/src` + `packages/web-ui/src`:

| File                                                              | Line | Construct                                                      |
| ----------------------------------------------------------------- | ---: | -------------------------------------------------------------- |
| `apps/web/src/components/hiring-process/process-board-card.tsx`   |   84 | `group-hover:opacity-100`, `group-focus-within:opacity-100`    |
| `apps/web/src/components/hiring-process/hiring-process-table.tsx` |  191 | `group-hover/row:opacity-100`                                  |
| `packages/web-ui/src/components/label.tsx`                        |   12 | `peer-disabled:opacity-50`, `peer-disabled:cursor-not-allowed` |

All three are the same UI idea: a control is hidden until you reach for the row
or card that owns it. The hover is genuinely on the ancestor, and no React state
exists for it. This is what `when.*` is for.

**Before** — `apps/web/src/components/hiring-process/process-board-card.tsx:84`:

```tsx
<div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
```

**After:**

```tsx
const card = stylex.create({
  root: { marker: stylex.defaultMarker() },
});

const actions = stylex.create({
  reveal: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    gap: 4,
    transitionProperty: "opacity",
    transitionDuration: "150ms",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":hover")]: 1,
      [stylex.when.ancestor(":focus-within")]: 1,
    },
  },
});
```

The ancestor must carry the marker (`stylex.defaultMarker()` on the card root)
for `when.ancestor` to bind — that is the replacement for Tailwind's `group`
class. `hiring-process-table.tsx` uses a **named** group (`group/row`); use
`stylex.defineMarker()` and pass the named marker to both the row and the
actions cell, so a nested group cannot capture it.

`label.tsx`'s `peer-disabled:` is the sibling form:

```tsx
opacity: { default: 1, [stylex.when.siblingBefore(":disabled")]: 0.5 },
cursor: { default: null, [stylex.when.siblingBefore(":disabled")]: "not-allowed" },
```

`label.tsx:12` also carries `group-data-[disabled=true]:opacity-50` — that is a
**fourth** construct and it is _not_ sanctioned by D7, because the disabled
state is a prop the form field already has. Pass it: `<Label disabled>`.

`stylex.when.{ancestor,descendant,anySibling,siblingBefore,siblingAfter}` and
`defaultMarker`/`defineMarker` are confirmed present in `@stylexjs/stylex@0.19.0`
by inspecting the package's `.d.ts` (`02-plan-review.md` §2.1). They were **not
exercised in the Phase 0 spike** — the first PR that uses one should verify the
rendered result in a browser, not only in the compare harness.

### 7.6 `animate-*` → `stylex.keyframes` + explicit `animationName` (19)

19 sites, from `tw-animate-css`, concentrated in the overlays. Per-file, by grep:
`dropdown-menu.tsx` 4, `dialog.tsx` 4, `alert-dialog.tsx` 4, `select.tsx` 2,
`accordion.tsx` 2 (`animate-accordion-up`/`-down`), `sonner.tsx` 1 and
`apps/web/src/components/loader.tsx` 1 (`animate-spin`), `skeleton.tsx` 1
(`animate-pulse`).

`stylex.keyframes` returns a name; you assign it to `animationName` yourself.
There is no `animate-in` shorthand and no implicit direction.

**Before** — `packages/web-ui/src/components/dialog.tsx:55`:

```
data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ... duration-100
```

**After:**

```tsx
const enterKeyframes = stylex.keyframes({
  from: { opacity: 0, transform: "scale(0.95)" },
  to: { opacity: 1, transform: "scale(1)" },
});

const exitKeyframes = stylex.keyframes({
  from: { opacity: 1, transform: "scale(1)" },
  to: { opacity: 0, transform: "scale(0.95)" },
});

const styles = stylex.create({
  enter: { animationName: enterKeyframes, animationDuration: "100ms", animationFillMode: "forwards" },
  exit: { animationName: exitKeyframes, animationDuration: "100ms", animationFillMode: "forwards" },
});
```

selected by the same `open` boolean as §7.1.

`animate-spin` is `{ from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } }`
with `animationIterationCount: "infinite"` and `animationTimingFunction: "linear"`.
`animate-pulse` is the opacity `1 → 0.5 → 1` cycle at `2s`
`cubic-bezier(0.4, 0, 0.6, 1)`, `infinite`.

The side-aware entrances (`slide-in-from-top-2` and friends) pick their keyframe
from Base UI's `side` value in JS:

```tsx
const bySide = { top: slideFromTop, bottom: slideFromBottom, left: slideFromLeft, right: slideFromRight };
// …
{...stylex.props(styles.content, open && sideStyles[bySide[side]])}
```

**The compare harness disables animations** (`page.emulateMedia({ reducedMotion:
"reduce" })`, spec §7), so a keyframe port that is subtly wrong will pass the
gate. Check animations by hand.

---

## 8. What stays in plain CSS (D8)

Not everything belongs in StyleX, and pretending otherwise produces worse code
than Tailwind did. These stay in `apps/web-stylex/src/global.css`:

| What                         | Where it is today                | Why it stays                                                                                       |
| ---------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Font `@import`               | `packages/web-ui/src/styles.css` | `@import`/`@font-face` is a document-level at-rule, not a style                                    |
| `::selection`                | `styles.css:235`                 | Applies to a pseudo-element of _everything_; no element to attach to                               |
| `::placeholder`              | `styles.css:238`                 | Same — global, and needed on inputs the app does not own                                           |
| Global `:focus-visible` ring | `styles.css:243-246`             | `:where(a, button, input, …)` — a cross-cutting default, deliberately un-overridable per component |
| `color-scheme`               | `<html>` / root CSS              | A document property the browser reads to theme native UI                                           |
| `markdown-content.css`       | `packages/ui-markdown` consumers | Styles HTML generated at runtime from Markdown — descendant selectors are the only option          |

Rule of thumb: **if there is no React element you can attach the style to, it is
CSS.** Everything else is StyleX.

This is expected, not a failure of the migration (`02-plan-review.md` §2.9).
Report it that way in `07-results.md`; do not quietly count these lines as
"Tailwind removed".

Two things that look like they belong here but do not:

- `.mono` / `.display` — §3.12, they become exported StyleX styles.
- `@layer base`'s `* { @apply border-border }` — a Tailwind reset artefact. It
  does not survive; components set their own `borderColor`.

---

## 9. Tokens

### 9.1 The rule

```tsx
import { colors, typography } from "@interviews-tool/design-tokens/tokens.stylex";

backgroundColor: colors.surface;   // ✓
backgroundColor: "#0f161d";        // ✗ never
backgroundColor: "var(--surface)"; // ✗ never
```

A hex literal is invisible to the theme: `lightTheme` (`createTheme`) only
overrides values that came from `defineVars`. A hardcoded colour stays dark in
light mode, and the compare harness _will_ catch it — in the light-theme
screenshots only, which is 50% of the matrix and 0% of what most people look at
first.

`var(--surface)` is worse: it compiles, it even works today because
`design-tokens/tokens.css` is still imported for CSS consumers, and it silently
stops working in Phase 5 when that import goes away.

Available namespaces (`packages/design-tokens/src/tokens.stylex.ts`):

| Export       | Contents                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------- |
| `colors`     | neons, neutrals, `danger`, the 9 status colours × bg/text/border, `focusRing`, shadcn aliases |
| `typography` | `sans`, `mono`, `display` font stacks                                                         |
| `lightTheme` | the `createTheme` class, applied to `<html>` by `__root.tsx` (D12) — not used in components   |

Token names are camelCase versions of the CSS custom properties:
`--st-ongoing-bg` → `colors.stOngoingBg`, `--border-strong` → `colors.borderStrong`.
A token that exists in `styles.css` and not in `tokens.ts` is a bug — file it,
do not work around it with a literal.

### 9.2 The trap: `.stylex.const` does not "fix" a rejected import

`tokens.stylex.ts` is **generated**, and its header documents a StyleX failure
mode that is worth repeating here because it does not error.

This repo's Babel config uses
`unstable_moduleResolution: { type: "commonJS" }`. Under that mode
`defineVars()` / `createTheme()` can only take a value written **in the same
file**. A plain `import { dark } from "./tokens"` is rejected outright: the
import specifier must end in `.stylex`, `.stylex.const` or `.transformed`.

The obvious "fix" is to rename the import so it qualifies. **Do not.** Under
`commonJS` a qualifying import resolves through a _theme-reference proxy_, not
the real value. `defineVars(dark)` then compiles to
`{ __varGroupHash__: "…" }` — a variable group with **no variables in it**. No
build error. No warning. Just CSS custom properties that do not exist, and a
page rendered with every colour missing.

That is why the palette is written out literally in `tokens.stylex.ts` and kept
in sync by a generator.

(Real cross-file _value_ reading exists only under
`unstable_moduleResolution: { type: "experimental_crossFileParsing" }`, which
this repo does not use, and which has its own unrelated bug in
`@stylexjs/babel-plugin@0.19.0`: it deopts on every file because its success
check treats Babel's always-present, always-truthy empty `ast.errors` array as a
parse failure.)

### 9.3 Changing a token

`packages/design-tokens/src/tokens.stylex.ts` is generated. **Editing it
directly is wrong and CI will catch it** — the generator is re-run in CI and the
PR fails if the committed file differs.

```bash
# edit packages/design-tokens/src/tokens.ts   (dark + light, both objects)
cd packages/design-tokens
bun run generate:stylex      # rewrites src/tokens.stylex.ts
bun run build                # rewrites dist/tokens.css for CSS consumers
bun run test                 # asserts parity with web-ui/styles.css
```

Both `dark` and `light` must gain the key; `light` is typed `TokenSet`, so
omitting it is a type error.

### 9.4 Do not put a broken StyleX file under `packages/*/src` — ever

From `03-spike-findings.md` §6, demonstrated rather than reasoned about:

The PostCSS plugin's `include` glob is
`["src/**/*.{ts,tsx}", "../../packages/*/src/**/*.{ts,tsx}"]`. It is a **path
pattern, not an import graph**. Any StyleX file under any `packages/*/src` is
compiled, whether or not anything imports it.

**Consequence: one uncompilable StyleX file anywhere under `packages/*/src`
breaks every consuming app's build — including `apps/web`, which is the deployed
product.** In the spike, a throwaway `packages/web-ui-stylex-probe/button.tsx`
that nothing imported failed `apps/web`'s production build on its own unresolved
`@/lib/...` imports:

```
[vite:css] [postcss] .../button.tsx: Could not resolve the path to the imported file.
Please ensure that the theme file has a .stylex.js or .stylex.ts extension...
```

So: **never park an un-adapted shadcn-cssinjs registry file in
`packages/web-ui-stylex` "to fix later".** Adapt it in your working tree, commit
it StyleX-valid, or do not commit it. A half-ported component is a broken
`main` for everybody.

---

## 10. PR checklist — Phase 3 and Phase 4

Copy this into the PR description and tick it.

- [ ] **Scope is one component (Phase 3) or one route group (Phase 4)**, matching
      a row in `06-tracker.md`.
- [ ] **Every call site is in this PR.** `grep -rn '<ComponentName' apps/web-stylex/src --include='*.tsx'`
      returns nothing that still passes `className`. This is D6 and it is not
      optional — a missed call site is a silent no-op (§5.3).
- [ ] **No `className` prop on the ported component.** The type is
      `Omit<…, "className" | "style"> & { style?: StyleXStyles }`.
- [ ] **No hex literals, no `var(--…)`** in the new file.
      `grep -nE '#[0-9a-fA-F]{3,8}\b|var\(--' <file>` is empty (§9.1).
- [ ] **`data-*` and `aria-*` attributes are still written**, even where the
      style no longer reads them (§7.1, §7.4).
- [ ] **`bun run check-types`** passes — this is what proves the call sites were
      all found.
- [ ] **`bun run test`** green from the repo root. If the component is one of
      the two with class-name assertions (`process-board-card.test.tsx`,
      `hiring-process-table.test.tsx`, 3 assertions total), rewrite them to
      assert on behaviour, roles or `data-*` — never on a StyleX class, which is
      a hash.
- [ ] **`bun run build`** green. Remember §9.4: the build breaks for _every_ app,
      not just yours.
- [ ] **`bun run compare` ≤ 0.1% on every screenshot.** From `apps/web-stylex`,
      with both dev servers up — `bun run dev:web` **first**, then
      `bun run dev:web-stylex` (starting them the other way round crashes
      `apps/web`'s Cloudflare plugin with `EADDRINUSE:9229`). Read §11 before
      you trust the result.
- [ ] **If a diff exceeds 0.1%, the PR description says why.** Never raise the
      threshold. Attach `compare/output/diff/<id>.png`.
- [ ] **Tracker row updated** in `06-tracker.md`: owner, PR number, status.
- [ ] **Deleted Tailwind that was dead is called out** in the description, so the
      reviewer knows a 0.000% diff is the expected outcome and not a
      coincidence.

---

## 11. What the visual gate does not cover — read this before quoting it

**The compare harness currently runs 12 of its 28 defined screenshots.**

The matrix is 7 routes × 2 viewports × 2 themes = 28. The 12 that have actually
run are the 3 unauthenticated routes (`landing`, `login`, `signup`) under
`COMPARE_ONLY_PUBLIC=1`, all passing at 0.000%. The 4 authenticated routes —
`processes`, `process-new`, `process-detail`, `process-edit`, 16 screenshots —
**have never run**. They need `COMPARE_EMAIL` / `COMPARE_PASSWORD` for a seeded
account, and nobody has supplied those yet
(`apps/web-stylex/compare/README.md`, "Current coverage").

Read the consequence directly: **the components that render mainly behind auth
have no visual gate today.** That includes `dropdown-menu`, `select`, `table`,
`dialog` and `alert-dialog` — which are also, per §7, the files carrying most of
the hard selectors. Green does not mean covered. A PR touching those can pass
`bun run compare` at 0.000% having compared nothing that renders the component
you changed.

Until credentials exist, a PR for a behind-auth component must:

1. **Check it by hand, deliberately.** Both themes, both viewports, every state
   the component has — open, closed, hovered, disabled, invalid. Say in the PR
   description what you looked at. "Looks fine" is not a check.
2. **Test behaviour, not pixels.** `web-ui-stylex` gets one render test per
   component: it renders, each variant applies a distinct class, and the `style`
   prop lands last (spec §10). Class names are hashes — assert that two variants
   differ, never on the string.
3. **Keep the PR small.** With no visual gate, PR size is the only thing bounding
   what a regression can cost. One component, not three.
4. **Check the animations manually regardless of coverage.** The harness runs
   with `reducedMotion: "reduce"` (spec §7), so no keyframe port is gated even
   on the 12 covered screenshots.

Fixing this is cheap and worth doing early: seed an account, set the two env
vars, run `bun run compare:update-auth` once. Whoever does it should update this
section and `apps/web-stylex/compare/README.md` in the same PR.

Anyone citing the harness's number in a review, in `07-results.md`, or in the
public write-up **must say what it covers**, not just quote the percentage.

---

## Sources

| Claim                                             | Source                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| 563 / 94 `className`, 83 `cn()`, 4 `cva()`        | `01-baseline-analysis.md` §4 (measured)                                          |
| Selector counts: 69 / 39 / 14 / 3 / 19 / 47 / 114 | `02-plan-review.md` §2.1 (measured)                                              |
| Hard selectors per file                           | `02-plan-review.md` §2.1                                                         |
| `stylex.when.*` present in 0.19.0                 | `02-plan-review.md` §2.1 (`.d.ts` inspected)                                     |
| `packages/*` include-glob poisoning               | `03-spike-findings.md` §6 (demonstrated)                                         |
| `.stylex.const` silent miscompile                 | `packages/design-tokens/src/tokens.stylex.ts` header                             |
| D5 / D6 / D7 / D8 / D12 / D13                     | `spec-web-stylex.md` §2                                                          |
| 0.1% threshold, `reducedMotion: "reduce"`         | `spec-web-stylex.md` §7                                                          |
| 12 of 28 screenshots run                          | `apps/web-stylex/compare/README.md`                                              |
| Spacing / radius / type scales                    | Tailwind 4 defaults + `packages/web-ui/src/styles.css` (no `--spacing` override) |
