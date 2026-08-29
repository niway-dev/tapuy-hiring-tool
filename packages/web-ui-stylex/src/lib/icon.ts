import * as stylex from "@stylexjs/stylex";

/* Replaces Tailwind's [&_svg]:size-* descendant selectors, which StyleX does
   not support. The icon styles itself instead of being styled by its parent:
   <Check {...stylex.props(icon.xs)} />. */
export const icon = stylex.create({
  xs: { width: 12, height: 12, flexShrink: 0, pointerEvents: "none" },
  sm: { width: 16, height: 16, flexShrink: 0, pointerEvents: "none" },
  md: { width: 20, height: 20, flexShrink: 0, pointerEvents: "none" },
});
