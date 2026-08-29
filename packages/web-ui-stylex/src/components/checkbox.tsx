import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { CheckIcon } from "lucide-react";

import { colors } from "@interviews-tool/design-tokens/tokens.stylex";
import { icon } from "../lib/icon";

/* data-checked comes from Base UI's own render-prop state (CheckboxRootState.
   checked — see CheckboxRootDataAttributes.d.ts for the data-checked/
   data-unchecked pair Base UI writes to the DOM), read here via the `render`
   prop's (props, state) callback, not via a data-[state=checked] attribute
   selector. (A className/style *function* prop was tried first, per
   05-porting-conventions.md §7.1's DialogPrimitive.Popup example, but
   CheckboxRoot's own implementation does not destructure `style` out of its
   componentProps before spreading the rest into elementProps — passing a
   style function collides with Base UI's own resolved style there. `render`
   sidesteps it entirely by building the DOM props ourselves.)

   The five aria-invalid:* classes on the original collapse into one
   `invalid` namespace, applied from this component's own `aria-invalid`
   prop, same as Input/Textarea (D-equivalent of 05-porting-conventions.md
   §7.4). `checked` is applied after `invalid` so a checked-and-invalid box
   still reads as checked (border-primary), matching the source's compound
   `aria-invalid:aria-checked:border-primary` override.

   group-has-disabled/field:opacity-50 is dropped: it is not one of the 3
   sites sanctioned for stylex.when.* (05-porting-conventions.md §7.5). This
   is safe because it was already dead in the *original Tailwind source
   too*, for the same reason: Base UI's CheckboxRoot renders as
   `<span role="checkbox">`, not a native button/input, so it never gets a
   real `disabled` DOM attribute — only `aria-disabled`. `:disabled` cannot
   match a `<span>`, so none of the source's own `disabled:*` classes
   (including this one's sibling `disabled:cursor-not-allowed
   disabled:opacity-50`) ever fired on this element either.

   Opacity-at-a-token values below (`color-mix(in srgb, <token> X%,
   transparent)`) replace Tailwind's `/NN` modifier — StyleX has no
   equivalent shorthand. Where the source's value differs by theme
   (`dark:` present with a different number, or present at all), the CSS
   `light-dark(<light-value>, <dark-value>)` function is used instead of a
   flat value: this repo's `color-scheme` is set per `[data-theme]` (see
   packages/web-ui/src/styles.css), so `light-dark()` resolves against the
   same theme signal `lightTheme`/`createTheme` already drive — no new
   token or condition key required. */
const styles = stylex.create({
  root: {
    display: "flex",
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexShrink: 0,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.input, ":focus-visible": colors.ring },
    /* Source: `dark:bg-input/30` — no light-mode equivalent class exists,
       so the light branch stays fully transparent. */
    backgroundColor: `light-dark(transparent, color-mix(in srgb, ${colors.input} 30%, transparent))`,
    outline: "none",
    /* Source: `focus-visible:ring-ring/50 focus-visible:ring-1` — a 1px
       ring at 50% alpha, not the shared global `colors.focusRing` halo
       (2px opaque, offset) used elsewhere in this app. No `dark:` variant
       exists for this rule, so no `light-dark()` is needed here. */
    boxShadow: {
      default: null,
      ":focus-visible": `0 0 0 1px color-mix(in srgb, ${colors.ring} 50%, transparent)`,
    },
    transitionProperty: "color, background-color, border-color",
    transitionDuration: "150ms",
    cursor: { default: null, ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": 0.5 },
    "::after": {
      content: '""',
      position: "absolute",
      insetInline: -12,
      insetBlock: -8,
    },
  },
  checked: {
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    borderColor: colors.primary,
  },
  invalid: {
    /* Source: `aria-invalid:border-destructive
       dark:aria-invalid:border-destructive/50` — full opacity in light,
       50% in dark. */
    borderColor: `light-dark(${colors.danger}, color-mix(in srgb, ${colors.danger} 50%, transparent))`,
    /* Source: `aria-invalid:ring-destructive/20
       dark:aria-invalid:ring-destructive/40 aria-invalid:ring-1` — a
       colored 1px ring around the whole control, unconditional on focus. */
    boxShadow: `light-dark(0 0 0 1px color-mix(in srgb, ${colors.danger} 20%, transparent), 0 0 0 1px color-mix(in srgb, ${colors.danger} 40%, transparent))`,
  },
  indicator: {
    display: "grid",
    placeContent: "center",
    color: "currentColor",
    transitionProperty: "none",
  },
});

export type CheckboxProps = Omit<CheckboxPrimitive.Root.Props, "className" | "style"> & {
  style?: StyleXStyles;
};

export function Checkbox({ style, ...props }: CheckboxProps) {
  const invalid = Boolean(props["aria-invalid"]);

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      render={(rootProps, state) => (
        <span
          {...rootProps}
          {...stylex.props(
            styles.root,
            invalid ? styles.invalid : null,
            state.checked ? styles.checked : null,
            style,
          )}
        />
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        {...stylex.props(styles.indicator)}
      >
        <CheckIcon {...stylex.props(icon.sm)} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
