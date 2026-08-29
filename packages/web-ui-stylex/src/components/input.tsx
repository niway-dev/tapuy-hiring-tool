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
