/* GENERATED — do not edit. Run `bun run generate:stylex` in
   packages/design-tokens (source: ./tokens.ts, ./fonts.ts). CI regenerates
   this file and fails the PR if it differs from what's committed.

   Why the palette is written out literally here instead of
   `import { dark } from "./tokens"`: this repo's StyleX config uses
   `unstable_moduleResolution: { type: "commonJS" }`, and under that mode
   defineVars()/createTheme() can only take a value written in the same
   file. A plain `.ts` import is rejected outright — the import specifier
   must end in `.stylex`, `.stylex.const`, or `.transformed`, and
   "./tokens" matches none of them.

   The trap: renaming the import to qualify does NOT fix it. Under
   `commonJS`, a qualifying import resolves through a theme-reference
   proxy, not the real value — `defineVars(dark)` would silently compile
   to `{ __varGroupHash__: "..." }` with none of the actual variables. No
   build error, just broken CSS custom properties.

   (Real cross-file *value* reading only exists under
   `unstable_moduleResolution: { type: "experimental_crossFileParsing" }`,
   which this repo does not use — and which has its own, unrelated bug in
   @stylexjs/babel-plugin@0.19.0: it deopts on every file, because its
   success check treats Babel's always-present, always-truthy empty
   `ast.errors` array as a parse failure.)

   So: literal values, kept in sync with ./tokens.ts by this generator. */
import * as stylex from "@stylexjs/stylex";

export const colors = stylex.defineVars({
  mint: "#00ffc2",
  mintHover: "#33ffd0",
  mintOn: "#04261d",
  fuchsia: "#ff00a0",
  fuchsiaOn: "#3a0022",
  violet: "#7a00ff",
  violetOn: "#e8d6ff",
  bg: "#0a0f14",
  surface: "#0f161d",
  surface2: "#141c25",
  selected: "#0f1a1a",
  borderStrong: "#2a3440",
  text: "#e6ebf0",
  textSecondary: "#a7b1bc",
  textMuted: "#6b7785",
  danger: "#e05252",
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
  focusRing: "0 0 0 2px #0a0f14, 0 0 0 4px #00ffc2",
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
  mint: "#00a67e",
  mintHover: "#00926f",
  mintOn: "#e4fff6",
  fuchsia: "#c2007a",
  fuchsiaOn: "#ffe3f3",
  violet: "#5b00c4",
  violetOn: "#eedfff",
  bg: "#f3f5f8",
  surface: "#ffffff",
  surface2: "#e9edf2",
  selected: "#e4faf3",
  borderStrong: "#b8c0cb",
  text: "#0f1720",
  textSecondary: "#4a5563",
  textMuted: "#7a8593",
  danger: "#c73a3a",
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
  focusRing: "0 0 0 2px #f3f5f8, 0 0 0 4px #00a67e",
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
