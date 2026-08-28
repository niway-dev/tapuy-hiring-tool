import type { InteractionType } from "@interviews-tool/domain/constants";

/* Shared capture helpers — documentation/CAPTURE-V2.md */

/** "9:14 AM" for timestamps stamped into note content */
export function formatClock(date = new Date()): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "12:04" / "1:03:22" — live-mode timer */
export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "1h 34m" / "28m" — appended to the saved interaction when over a minute */
export function formatDuration(seconds: number): string | null {
  if (seconds < 60) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* Slash menu items — insertion snippets. `id` doubles as the i18n key
   under capture.slash.*; `hint` is the mono glyph shown right-aligned. */
export interface SlashItem {
  id: "timestamp" | "question" | "figure" | "nextStep" | "followUp";
  hint: string;
  insert: () => string;
}

export const SLASH_ITEMS: SlashItem[] = [
  { id: "timestamp", hint: "hh:mm", insert: () => `**${formatClock()}** ` },
  { id: "question", hint: "Q:", insert: () => "**Q:** " },
  { id: "figure", hint: "`$`", insert: () => "`$` " },
  { id: "nextStep", hint: "→", insert: () => "**Next step:** " },
  { id: "followUp", hint: "- [ ]", insert: () => "- [ ] " },
];

/* Type templates — inserted only when the writing area is empty.
   Note content, deliberately not localized (like the notes themselves). */
export const TYPE_TEMPLATES: Partial<Record<InteractionType, string>> = {
  offer: "**Base:** `$` \n**Deadline:** \n**Not in the letter yet:** \n",
  "phone-call": "**Q:** \n\n**Next step:** \n",
  "video-call": "**Q:** \n\n**Next step:** \n",
  "technical-challenge": "**Format:** \n**Went well:** \n**Struggled:** \n**Next step:** \n",
  "in-person-meeting": "**Who:** \n\n**Q:** \n\n**Next step:** \n",
  rejection: "**Reason given:** \n**Feedback:** \n**Keep for next time:** \n",
};

/** Excerpt for the Earlier-notes panel: strip Markdown markers per line,
    never globally — `Sign-on`, `take-home`, `async-first` must survive. */
export function excerpt(content: string, max = 150): string {
  const cleaned = content
    .replace(/^\s*(?:[-*>#]+\s*)+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\n+/g, " ")
    .trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

/** Insert a snippet into a textarea value at the caret, replacing an optional
    /query. Returns the new value and caret position. */
export function insertAtCaret(
  value: string,
  caret: number,
  snippet: string,
  replaceFrom?: number,
): { value: string; caret: number } {
  const start = replaceFrom ?? caret;
  const before = value.slice(0, start);
  const after = value.slice(caret);
  return { value: before + snippet + after, caret: (before + snippet).length };
}
