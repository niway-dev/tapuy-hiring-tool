/* Markdown editing actions for plain textareas — toolbar + ⌘B/⌘I/⌘K. */

export interface EditResult {
  value: string;
  selStart: number;
  selEnd: number;
}

/** Wrap the selection with markers (or drop an empty pair with the caret
    inside). Unwraps when the selection is already wrapped. */
export function surroundSelection(
  value: string,
  selStart: number,
  selEnd: number,
  before: string,
  after: string = before,
): EditResult {
  const selected = value.slice(selStart, selEnd);
  const prev = value.slice(Math.max(0, selStart - before.length), selStart);
  const next = value.slice(selEnd, selEnd + after.length);

  /* Toggle off when already wrapped */
  if (prev === before && next === after) {
    return {
      value:
        value.slice(0, selStart - before.length) + selected + value.slice(selEnd + after.length),
      selStart: selStart - before.length,
      selEnd: selEnd - before.length,
    };
  }

  return {
    value: value.slice(0, selStart) + before + selected + after + value.slice(selEnd),
    selStart: selStart + before.length,
    selEnd: selEnd + before.length,
  };
}

/** Toggle a prefix at the start of the caret's line (`- `, `## `, `- [ ] `). */
export function toggleLinePrefix(value: string, selStart: number, prefix: string): EditResult {
  const lineStart = value.lastIndexOf("\n", selStart - 1) + 1;
  const hasPrefix = value.startsWith(prefix, lineStart);

  if (hasPrefix) {
    return {
      value: value.slice(0, lineStart) + value.slice(lineStart + prefix.length),
      selStart: Math.max(lineStart, selStart - prefix.length),
      selEnd: Math.max(lineStart, selStart - prefix.length),
    };
  }

  return {
    value: value.slice(0, lineStart) + prefix + value.slice(lineStart),
    selStart: selStart + prefix.length,
    selEnd: selStart + prefix.length,
  };
}

/** `[selection](url)` with the caret ready to type the url. */
export function wrapLink(value: string, selStart: number, selEnd: number): EditResult {
  const selected = value.slice(selStart, selEnd);
  const inserted = `[${selected}](`;
  return {
    value: value.slice(0, selStart) + inserted + ")" + value.slice(selEnd),
    selStart: selStart + inserted.length,
    selEnd: selStart + inserted.length,
  };
}

export type MdAction = "bold" | "italic" | "code" | "heading" | "bullet" | "checkbox" | "link";

export function applyMdAction(
  action: MdAction,
  value: string,
  selStart: number,
  selEnd: number,
): EditResult {
  switch (action) {
    case "bold":
      return surroundSelection(value, selStart, selEnd, "**");
    case "italic":
      return surroundSelection(value, selStart, selEnd, "*");
    case "code":
      return surroundSelection(value, selStart, selEnd, "`");
    case "heading":
      return toggleLinePrefix(value, selStart, "## ");
    case "bullet":
      return toggleLinePrefix(value, selStart, "- ");
    case "checkbox":
      return toggleLinePrefix(value, selStart, "- [ ] ");
    case "link":
      return wrapLink(value, selStart, selEnd);
  }
}
