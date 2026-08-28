import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "@interviews-tool/i18n";
import { cn } from "@interviews-tool/web-ui";
import { SLASH_ITEMS, insertAtCaret, type SlashItem } from "@/lib/capture";
import { getCaretCoordinates } from "@/lib/caret-position";

/* Slash-to-insert — spec §3 of documentation/CAPTURE-V2.md.
   The hook owns detection/navigation state; the parent wires the returned
   handlers into its textarea and renders `menu` inside a relative wrapper.
   The menu anchors to the caret line (mirror-div measurement), Notion-style,
   flipping above when there is no room below. */

const SLASH_RE = /(?:^|\s)\/(\w*)$/;

const MENU_WIDTH = 256;
/* 5 rows ≈ 170px + padding — used only to decide the flip */
const MENU_EST_HEIGHT = 190;

interface UseSlashMenuArgs {
  value: string;
  onValueChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function useSlashMenu({ value, onValueChange, textareaRef }: UseSlashMenuArgs) {
  const t = useTranslations("capture");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [slashAt, setSlashAt] = useState(0);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);

  const items = useMemo(() => {
    const q = query.toLowerCase();
    return SLASH_ITEMS.filter((item) => t(`slash.${item.id}`).toLowerCase().includes(q));
  }, [query, t]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setIndex(0);
    setMenuStyle(null);
  }, []);

  /** Insert any snippet at the caret (or at the end when the textarea was
      never touched — restoring a draft must not write at position 0). */
  const insertSnippet = useCallback(
    (snippet: string, replaceFrom?: number) => {
      const el = textareaRef.current;
      const touched = el?.dataset.touched === "1";
      const caret = touched && el ? el.selectionStart : value.length;
      const result = insertAtCaret(value, caret, snippet, replaceFrom);
      onValueChange(result.value);
      requestAnimationFrame(() => {
        const node = textareaRef.current;
        if (node) {
          node.focus();
          node.setSelectionRange(result.caret, result.caret);
          node.dataset.touched = "1";
        }
      });
    },
    [value, onValueChange, textareaRef],
  );

  const pick = useCallback(
    (item: SlashItem) => {
      insertSnippet(item.insert(), slashAt);
      close();
    },
    [insertSnippet, slashAt, close],
  );

  /** Call from the textarea's onChange, after updating the value. */
  const detect = useCallback((el: HTMLTextAreaElement) => {
    const caret = el.selectionStart;
    const before = el.value.slice(0, caret);
    const match = SLASH_RE.exec(before);
    if (!match) {
      setOpen(false);
      setMenuStyle(null);
      return;
    }

    setOpen(true);
    setQuery(match[1]);
    setIndex(0);
    setSlashAt(caret - match[1].length - 1);

    /* Anchor to the caret line. Coordinates come out relative to the
       textarea's border box; offsetTop/Left map them into the nearest
       positioned ancestor (the relative wrapper the menu renders in). */
    const coords = getCaretCoordinates(el, caret);
    const caretTop = coords.top - el.scrollTop;
    const left =
      el.offsetLeft + Math.max(0, Math.min(coords.left, el.clientWidth - MENU_WIDTH - 8));
    const flipAbove = caretTop > MENU_EST_HEIGHT && el.clientHeight - caretTop < MENU_EST_HEIGHT;

    setMenuStyle(
      flipAbove
        ? { top: el.offsetTop + caretTop - 6, left, transform: "translateY(-100%)" }
        : { top: el.offsetTop + caretTop + coords.height + 6, left },
    );
  }, []);

  /** Call from the textarea's onKeyDown. Returns true when the event was
      consumed by the menu. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (e.currentTarget) e.currentTarget.dataset.touched = "1";
      if (!open) return false;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => (i + 1) % Math.max(items.length, 1));
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (items.length > 0) {
          e.preventDefault();
          pick(items[index]);
          return true;
        }
        return false;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        return true;
      }
      return false;
    },
    [open, items, index, pick, close],
  );

  const menu =
    open && items.length > 0 ? (
      <div
        style={menuStyle ?? undefined}
        className="absolute z-20 w-[256px] rounded-md border border-border bg-surface-2 py-1 shadow-md"
      >
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onMouseEnter={() => setIndex(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              pick(item);
            }}
            className={cn(
              "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-[13px]",
              i === index ? "bg-selected text-text" : "text-text-secondary",
            )}
          >
            <span>{t(`slash.${item.id}`)}</span>
            <span className="mono text-[11px] text-text-muted">{item.hint}</span>
          </button>
        ))}
      </div>
    ) : null;

  return { menu, detect, handleKeyDown, insertSnippet, isOpen: open, close };
}
