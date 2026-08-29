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
