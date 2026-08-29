import * as stylex from "@stylexjs/stylex";

/* Replaces Tailwind's [&_svg]:size-* descendant selectors, which StyleX does
   not support. The icon styles itself instead of being styled by its parent:
   <Check {...stylex.props(icon.xs)} />.

   Sizes are the actual [&_svg]:size-* values measured across every
   packages/web-ui component (button's xs/sm/default variants, checkbox,
   dropdown-menu, select) — 12 / 14 / 16px. There is no third-party evidence
   for a fourth, larger size anywhere in this component library; add one only
   when a real component measurably needs it. */
export const icon = stylex.create({
  xs: { width: 12, height: 12, flexShrink: 0, pointerEvents: "none" },
  sm: { width: 14, height: 14, flexShrink: 0, pointerEvents: "none" },
  md: { width: 16, height: 16, flexShrink: 0, pointerEvents: "none" },
});
