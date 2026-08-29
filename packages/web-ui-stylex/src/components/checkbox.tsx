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
   sites sanctioned for stylex.when.* (05-porting-conventions.md §7.5), and
   the checkbox already dims itself via its own :disabled state. */
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
    backgroundColor: "transparent",
    outline: "none",
    boxShadow: { default: null, ":focus-visible": colors.focusRing },
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
    borderColor: colors.danger,
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
