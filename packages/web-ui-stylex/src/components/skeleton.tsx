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
