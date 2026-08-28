/** Raw Tapuy palette. No StyleX import here on purpose: this file is the one
    source both the StyleX variables and the emitted CSS are derived from, and
    it must stay consumable by anything, including a plain Node script.

    Transcribed from `packages/web-ui/src/styles.css`'s `:root` (dark) and
    `[data-theme="light"]` blocks. Where `:root` composes a value from another
    token (the shadcn semantic layer, e.g. `--background: var(--bg)`), the
    concrete value is resolved here and the alias it corresponds to is noted
    in a comment next to it. */
export const dark = {
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
  background: "#0a0f14", // alias of --background: var(--bg)
  foreground: "#e6ebf0", // alias of --foreground: var(--text)
  card: "#0f161d", // alias of --card: var(--surface)
  cardForeground: "#e6ebf0", // alias of --card-foreground: var(--text)
  popover: "#141c25", // alias of --popover: var(--surface-2)
  popoverForeground: "#e6ebf0", // alias of --popover-foreground: var(--text)
  primary: "#00ffc2", // alias of --primary: var(--mint)
  primaryForeground: "#04261d", // alias of --primary-foreground: var(--mint-on)
  secondary: "#141c25", // alias of --secondary: var(--surface-2)
  secondaryForeground: "#e6ebf0", // alias of --secondary-foreground: var(--text)
  muted: "#141c25", // alias of --muted: var(--surface-2)
  mutedForeground: "#6b7785", // alias of --muted-foreground: var(--text-muted)
  accent: "#0f1a1a", // alias of --accent: var(--selected)
  accentForeground: "#e6ebf0", // alias of --accent-foreground: var(--text)
  destructive: "#e05252", // alias of --destructive: var(--danger)
  border: "#1c232b",
  input: "#1c232b",
  ring: "#00ffc2", // alias of --ring: var(--mint)
  // control 6px = rounded-md · card 12px = rounded-xl
  radius: "0.5rem",
} as const;

export type TokenName = keyof typeof dark;
export type TokenSet = Record<TokenName, string>;

export const light: TokenSet = {
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

  // Focus ring — `[data-theme="light"]` does not redeclare --focus-ring, but it
  // is `var(--bg) `/ `var(--mint)`, both of which change under light, so the
  // resolved value here is the light-theme composition, not a copy of dark's.
  focusRing: "0 0 0 2px #f3f5f8, 0 0 0 4px #00a67e",

  // Semantic (shadcn) aliases. `[data-theme="light"]` does not redeclare most
  // of these either — they resolve through `var()` to tokens that light DOES
  // override (bg, text, surface, surface-2, selected, text-muted, mint,
  // mint-on, danger), so the concrete values below differ from dark even
  // though there is no matching line in the light block for them.
  background: "#f3f5f8", // alias of --background: var(--bg)
  foreground: "#0f1720", // alias of --foreground: var(--text)
  card: "#ffffff", // alias of --card: var(--surface)
  cardForeground: "#0f1720", // alias of --card-foreground: var(--text)
  popover: "#e9edf2", // alias of --popover: var(--surface-2)
  popoverForeground: "#0f1720", // alias of --popover-foreground: var(--text)
  primary: "#00a67e", // alias of --primary: var(--mint)
  primaryForeground: "#e4fff6", // alias of --primary-foreground: var(--mint-on)
  secondary: "#e9edf2", // alias of --secondary: var(--surface-2)
  secondaryForeground: "#0f1720", // alias of --secondary-foreground: var(--text)
  muted: "#e9edf2", // alias of --muted: var(--surface-2)
  mutedForeground: "#7a8593", // alias of --muted-foreground: var(--text-muted)
  accent: "#e4faf3", // alias of --accent: var(--selected)
  accentForeground: "#0f1720", // alias of --accent-foreground: var(--text)
  destructive: "#c73a3a", // alias of --destructive: var(--danger)
  // `[data-theme="light"]` DOES redeclare --border and --input directly.
  border: "#d5dae1",
  input: "#d5dae1",
  ring: "#00a67e", // alias of --ring: var(--mint)
  // --radius is not redeclared in light; it has no var() reference either way.
  radius: "0.5rem",
};
