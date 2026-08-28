import { useCallback } from "react";
import { cn } from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import { applyMdAction, type MdAction } from "@/lib/md-editing";

/* Markdown controls shared by the notepad form and the live editor.
   Buttons act on the textarea's live selection; onMouseDown prevents the
   blur so the selection survives the click. ⌘B / ⌘I / ⌘K via handleKeyDown. */

interface UseMdEditingArgs {
  value: string;
  onValueChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export interface MdEditingApi {
  run: (action: MdAction) => void;
  /** Returns true when the shortcut was handled. */
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
}

export function useMdEditing({
  value,
  onValueChange,
  textareaRef,
}: UseMdEditingArgs): MdEditingApi {
  const run = useCallback(
    (action: MdAction) => {
      const el = textareaRef.current;
      if (!el) return;
      const touched = el.dataset.touched === "1";
      const selStart = touched ? el.selectionStart : value.length;
      const selEnd = touched ? el.selectionEnd : value.length;
      const result = applyMdAction(action, value, selStart, selEnd);
      onValueChange(result.value);
      requestAnimationFrame(() => {
        const node = textareaRef.current;
        if (node) {
          node.focus();
          node.setSelectionRange(result.selStart, result.selEnd);
          node.dataset.touched = "1";
        }
      });
    },
    [value, onValueChange, textareaRef],
  );

  /** Returns true when the shortcut was handled. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!(e.metaKey || e.ctrlKey)) return false;
      const key = e.key.toLowerCase();
      const action: MdAction | null =
        key === "b" ? "bold" : key === "i" ? "italic" : key === "k" ? "link" : null;
      if (!action) return false;
      e.preventDefault();
      run(action);
      return true;
    },
    [run],
  );

  return { run, handleKeyDown };
}

const TOOLBAR_ITEMS: { action: MdAction; glyph: string; mono?: boolean; italic?: boolean }[] = [
  { action: "bold", glyph: "B" },
  { action: "italic", glyph: "I", italic: true },
  { action: "code", glyph: "<>", mono: true },
  { action: "heading", glyph: "H" },
  { action: "bullet", glyph: "•" },
  { action: "checkbox", glyph: "[ ]", mono: true },
  { action: "link", glyph: "[]()", mono: true },
];

interface EditorToolbarProps {
  run: (action: MdAction) => void;
  /** Subset + order of actions to render (defaults to all) */
  actions?: MdAction[];
  /** Extra content rendered after the buttons (e.g. a timestamp chip) */
  children?: React.ReactNode;
  className?: string;
}

export function EditorToolbar({
  run,
  actions,
  children,
  className,
}: EditorToolbarProps): React.ReactElement {
  const t = useTranslations("capture");
  const items = actions
    ? actions
        .map((action) => TOOLBAR_ITEMS.find((item) => item.action === action))
        .filter((item): item is (typeof TOOLBAR_ITEMS)[number] => Boolean(item))
    : TOOLBAR_ITEMS;

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {items.map((item) => (
        <button
          key={item.action}
          type="button"
          title={t(`toolbar.${item.action}`)}
          /* preventDefault on mousedown keeps the textarea selection alive;
             the action runs on click so Enter/Space also trigger it */
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run(item.action)}
          className={cn(
            "flex h-7 min-w-7 items-center justify-center rounded-[5px] px-1.5 text-[13px] text-text-secondary transition-colors hover:bg-surface-2 hover:text-text",
            item.mono && "mono text-[11px]",
            item.italic && "italic",
            item.action === "bold" && "font-medium",
          )}
        >
          {item.glyph}
        </button>
      ))}
      {children}
    </div>
  );
}
