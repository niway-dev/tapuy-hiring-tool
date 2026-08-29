import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import * as React from "react";

import { colors } from "@interviews-tool/design-tokens/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    width: "100%",
    minWidth: 0,
    minHeight: 60,
    paddingInline: 12,
    paddingBlock: 8,
    fontSize: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.border, ":hover": colors.borderStrong },
    backgroundColor: colors.surface2,
    outline: "none",
    resize: "none",
    transitionProperty: "color, background-color, border-color",
    transitionDuration: "150ms",
    pointerEvents: { default: null, ":disabled": "none" },
    cursor: { default: null, ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": 0.45 },
    "::placeholder": { color: colors.textMuted },
  },
  invalid: { borderColor: colors.danger },
});

export type TextareaProps = Omit<React.ComponentProps<"textarea">, "className" | "style"> & {
  style?: StyleXStyles;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ style, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        {...stylex.props(styles.root, props["aria-invalid"] ? styles.invalid : null, style)}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
