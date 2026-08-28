import * as stylex from "@stylexjs/stylex";

/** The variable set. Dark is the default, matching web-ui/styles.css.
 *
 * The values below are written out literally instead of `import { dark }
 * from "./tokens"` (which is what a plain call site would reach for, and
 * what an earlier draft of this file did). That import compiles under Vite
 * — `tokens.ts` is syntactically fine — but every build fails at
 * `defineVars()` with "Only static values are allowed inside of a
 * defineVars() call.", because @stylexjs/babel-plugin@0.19.0 has a bug in
 * the code path that resolves an imported identifier back to its value
 * across files (`evaluateImportedFile` in `lib/index.js`). It parses the
 * imported file, then guards the result with:
 *
 *   if (!ast || ast.errors || !t.isNode(ast)) { deopt(...); return; }
 *
 * `ast.errors` is the array Babel's parser always attaches to a parse
 * result, `[]` when there were no errors. `[]` is truthy in JS, so this
 * condition deopts on *every* successfully parsed file, whether the import
 * is a plain `.ts` re-export or a dedicated `.stylex.const.ts` file, and
 * whether `unstable_moduleResolution.type` is `commonJS` or the
 * `experimental_crossFileParsing` mode built for exactly this case —
 * verified directly against the installed 0.19.0 package, not inferred.
 * `stylex.defineVars()` and `stylex.createTheme()` can only consume a value
 * that Babel can evaluate without leaving this file, so the palette has to
 * be inlined here.
 *
 * This does mean `dark`/`light`/`fonts` exist in two places: the source of
 * truth in `./tokens.ts` and `./fonts.ts`, and this literal copy. That's
 * the same shape as the Tailwind/StyleX duplication `tokens.test.ts` (Task
 * 3) already guards — and that file also drift-guards this one: it parses
 * this file's source text and asserts these three object literals equal
 * `dark`, `light`, and `fonts` exactly. */
export const colors = stylex.defineVars({
  // Neons — the 1%
  mint: "#00ffc2",
  mintHover: "#33ffd0",
  mintOn: "#04261d",
  fuchsia: "#ff00a0",
  fuchsiaOn: "#3a0022",
  violet: "#7a00ff",
  violetOn: "#e8d6ff",

  // Neutrals — the 90%, cold blue tint
  bg: "#0a0f14",
  surface: "#0f161d",
  surface2: "#141c25",
  selected: "#0f1a1a",
  borderStrong: "#2a3440",
  text: "#e6ebf0",
  textSecondary: "#a7b1bc",
  textMuted: "#6b7785",

  // Danger
  danger: "#e05252",

  // States — the 9%. Active: tinted + border. Terminal: solid, no border.
  stFirstContactBg: "#1b0f33",
  stFirstContactText: "#c9a6ff",
  stFirstContactBorder: "#4a1f8a",
  stOngoingBg: "#0e1f38",
  stOngoingText: "#8fc1f5",
  stOngoingBorder: "#1f4b82",
  stOnHoldBg: "#2a1e08",
  stOnHoldText: "#f0c061",
  stOnHoldBorder: "#7a5a18",
  stOfferMadeBg: "#2e0a22",
  stOfferMadeText: "#ff6bc6",
  stOfferMadeBorder: "#8a0a5a",
  stOfferAcceptedBg: "#2fa155",
  stOfferAcceptedText: "#04200d",
  stHiredBg: "#1e7a3e",
  stHiredText: "#e6f7ec",
  stRejectedBg: "#c73a3a",
  stRejectedText: "#fdecec",
  stDroppedOutBg: "#4a5562",
  stDroppedOutText: "#eef2f5",

  // Focus ring — alias of `--focus-ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--mint)`
  focusRing: "0 0 0 2px #0a0f14, 0 0 0 4px #00ffc2",

  // Semantic (shadcn) aliases → Tapuy. Components inherit the theme through these.
  background: "#0a0f14",
  foreground: "#e6ebf0",
  card: "#0f161d",
  cardForeground: "#e6ebf0",
  popover: "#141c25",
  popoverForeground: "#e6ebf0",
  primary: "#00ffc2",
  primaryForeground: "#04261d",
  secondary: "#141c25",
  secondaryForeground: "#e6ebf0",
  muted: "#141c25",
  mutedForeground: "#6b7785",
  accent: "#0f1a1a",
  accentForeground: "#e6ebf0",
  destructive: "#e05252",
  border: "#1c232b",
  input: "#1c232b",
  ring: "#00ffc2",
  radius: "0.5rem",
});

export const typography = stylex.defineVars({
  sans: '"Geist", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
  display: '"Instrument Serif", Georgia, serif',
});

/** Applied as a class on <html> when the theme cookie says "light". */
export const lightTheme = stylex.createTheme(colors, {
  // Neons — the 1%
  mint: "#00a67e",
  mintHover: "#00926f",
  mintOn: "#e4fff6",
  fuchsia: "#c2007a",
  fuchsiaOn: "#ffe3f3",
  violet: "#5b00c4",
  violetOn: "#eedfff",

  // Neutrals
  bg: "#f3f5f8",
  surface: "#ffffff",
  surface2: "#e9edf2",
  selected: "#e4faf3",
  borderStrong: "#b8c0cb",
  text: "#0f1720",
  textSecondary: "#4a5563",
  textMuted: "#7a8593",

  // Danger
  danger: "#c73a3a",

  // States
  stFirstContactBg: "#efe4ff",
  stFirstContactText: "#4a1f8a",
  stFirstContactBorder: "#c9a6ff",
  stOngoingBg: "#e3eefb",
  stOngoingText: "#1f4b82",
  stOngoingBorder: "#9fc7f0",
  stOnHoldBg: "#fbf0d5",
  stOnHoldText: "#7a5a18",
  stOnHoldBorder: "#edcf7a",
  stOfferMadeBg: "#ffe3f3",
  stOfferMadeText: "#8a0a5a",
  stOfferMadeBorder: "#ff8dd4",
  stOfferAcceptedBg: "#1e8c44",
  stOfferAcceptedText: "#f0faf3",
  stHiredBg: "#156b34",
  stHiredText: "#eaf6ee",
  stRejectedBg: "#b52f2f",
  stRejectedText: "#fdecec",
  stDroppedOutBg: "#5a6470",
  stDroppedOutText: "#f4f6f8",

  // Focus ring — light diverges from dark's `var(--bg)`/`var(--mint)` composition.
  focusRing: "0 0 0 2px #f3f5f8, 0 0 0 4px #00a67e",

  // Semantic (shadcn) aliases.
  background: "#f3f5f8",
  foreground: "#0f1720",
  card: "#ffffff",
  cardForeground: "#0f1720",
  popover: "#e9edf2",
  popoverForeground: "#0f1720",
  primary: "#00a67e",
  primaryForeground: "#e4fff6",
  secondary: "#e9edf2",
  secondaryForeground: "#0f1720",
  muted: "#e9edf2",
  mutedForeground: "#7a8593",
  accent: "#e4faf3",
  accentForeground: "#0f1720",
  destructive: "#c73a3a",
  border: "#d5dae1",
  input: "#d5dae1",
  ring: "#00a67e",
  radius: "0.5rem",
});
