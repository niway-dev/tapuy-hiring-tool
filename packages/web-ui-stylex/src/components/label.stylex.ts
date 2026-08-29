import * as stylex from "@stylexjs/stylex";

/* stylex.defineMarker() creates a marker tied to a fresh, unique Symbol() —
   scoped to this module, not shared app-wide like stylex.defaultMarker()'s
   fixed x-default-marker class. It exists so Label's ancestor/sibling
   `when` selectors can never collide with an unrelated component that marks
   the same DOM element for a different purpose.

   The @stylexjs/babel-plugin requires defineMarker()'s (like defineVars'/
   defineConsts') return value to be bound to a named export in a file whose
   name matches the configured theme-file suffix (".stylex" by default, see
   `unstable_moduleResolution` in vite.config.ts / vitest.config.ts) — hence
   this file is separate from label.tsx rather than inlined there. */
export const disabledMarker = stylex.defineMarker();
