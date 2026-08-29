import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  MarkdownContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@interviews-tool/web-ui";
import { Input, Label } from "@interviews-tool/web-ui-stylex";
import { useFormatter, useTranslations } from "@interviews-tool/i18n";
import { INTERACTION_TYPE_VALUES, type InteractionType } from "@interviews-tool/domain/constants";
import { useCreateInteraction, type CreateInteractionInput } from "@/hooks/use-interactions";
import { useInteractionTypeLabel } from "@/lib/i18n-labels";
import { useSlashMenu } from "./slash-menu";
import { EditorToolbar, useMdEditing } from "./editor-toolbar";
import { TYPE_TEMPLATES, formatClock } from "@/lib/capture";
import type { InteractionDraftState } from "@/lib/interaction-draft";
import { toast } from "sonner";

export const CONTENT_MIN = 10;
export const CONTENT_MAX = 10000;
const MIN_HEIGHT = 200;

export const INTERACTION_CONTENT_ID = "interaction-content";

const styles = stylex.create({
  flex1: { flex: "1 1 0%", minWidth: 0 },
});

interface InteractionFormProps {
  hiringProcessId: string;
  draft: InteractionDraftState;
  onSuccess?: () => void;
}

/* Notepad, not a form — spec §1 of documentation/CAPTURE-V2.md.
   Notes first, then Type + Title, then submit: write first, classify last. */
export function InteractionForm({
  hiringProcessId,
  draft,
  onSuccess,
}: InteractionFormProps): React.ReactElement {
  const t = useTranslations("interaction");
  const tCapture = useTranslations("capture");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const typeLabel = useInteractionTypeLabel();
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [contentError, setContentError] = useState<"min" | "max" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { content, title, type, setContent, setTitle, setType } = draft;
  const createMutation = useCreateInteraction();
  const overMax = content.length > CONTENT_MAX;

  const slash = useSlashMenu({
    value: content,
    onValueChange: setContent,
    textareaRef,
  });

  const md = useMdEditing({
    value: content,
    onValueChange: setContent,
    textareaRef,
  });

  /* Auto-grow: height:auto → scrollHeight, min 200px, capped at 52vh
     (then the textarea scrolls internally) */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || tab !== "write") return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, MIN_HEIGHT)}px`;
  }, [content, tab]);

  const handleTypeChange = (value: InteractionType) => {
    setType(value);
    /* Empty area + a template for this type → insert the skeleton.
       Never overwrites existing text. */
    const template = TYPE_TEMPLATES[value];
    if (template && !content.trim()) {
      setContent(template);
      toast.success(tCapture("templateInserted"));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (content.length < CONTENT_MIN || overMax) {
      setContentError(overMax ? "max" : "min");
      setTab("write");
      return;
    }

    const data: CreateInteractionInput = {
      content,
      title: title || undefined,
      type,
    };

    try {
      await createMutation.mutateAsync({ hiringProcessId, data });
      toast.success(t("savedToast"));
      draft.clear();
      setContentError(null);
      setTab("write");
      onSuccess?.();
    } catch (error) {
      toast.error(tCommon("error"));
      console.error(error);
    }
  };

  const formatClockAt = (at: number) =>
    format.dateTime(new Date(at), { hour: "numeric", minute: "2-digit" });

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-medium text-text">{tCapture("logItAfter")}</h3>
        {draft.savedAt && (
          <span className="mono truncate text-xs text-text-muted">
            {tCapture("draftSaved", { time: formatClockAt(draft.savedAt) })}
          </span>
        )}
      </div>

      {draft.restoredFrom && (
        <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
          <span className="text-[13px] text-text-secondary">
            {tCapture("draftRestored", { time: formatClockAt(draft.restoredFrom) })}
          </span>
          <button
            type="button"
            onClick={draft.discard}
            className="text-[13px] font-medium text-text transition-colors hover:text-danger"
          >
            {tCapture("discard")}
          </button>
        </div>
      )}

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={INTERACTION_CONTENT_ID}>{tCapture("notes")}</Label>
          <div className="flex rounded-md border border-border bg-surface-2 p-0.5">
            {(["write", "preview"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTab(mode)}
                className={cn(
                  "h-[22px] rounded-[5px] px-2 text-xs font-medium transition-colors",
                  tab === mode ? "bg-border text-text" : "text-text-muted hover:text-text",
                )}
              >
                {t(mode)}
              </button>
            ))}
          </div>
        </div>

        {tab === "write" ? (
          <div className="relative">
            {slash.menu}
            <div className="rounded-md border border-border bg-surface-2">
              <EditorToolbar run={md.run} className="border-b border-border px-1.5 py-1">
                <button
                  type="button"
                  title={t("type")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => slash.insertSnippet(`**${formatClock()}** `)}
                  className="mono ml-1 flex h-7 items-center rounded-[5px] border-l border-border px-2.5 pl-3 text-[12px] text-text-secondary transition-colors hover:text-text"
                >
                  {formatClock()}
                </button>
              </EditorToolbar>
              <textarea
                ref={textareaRef}
                id={INTERACTION_CONTENT_ID}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  slash.detect(e.target);
                  if (
                    contentError &&
                    e.target.value.length >= CONTENT_MIN &&
                    e.target.value.length <= CONTENT_MAX
                  ) {
                    setContentError(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (slash.handleKeyDown(e)) return;
                  if (md.handleKeyDown(e)) return;
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                onPointerDown={(e) => {
                  e.currentTarget.dataset.touched = "1";
                }}
                placeholder={t("contentPlaceholder")}
                style={{ maxHeight: "52vh" }}
                className="mono block min-h-[200px] w-full resize-none overflow-y-auto rounded-b-md border-0 bg-transparent px-3 py-2 text-[13px] leading-[1.65] text-text outline-none [caret-color:var(--mint)] focus-visible:shadow-none"
              />
            </div>
          </div>
        ) : (
          <div className="min-h-[200px] rounded-md border border-border bg-surface-2 px-3 py-2">
            {content.trim() ? (
              <MarkdownContent content={content} />
            ) : (
              <p className="text-sm text-text-muted">{t("nothingToPreview")}</p>
            )}
          </div>
        )}

        {contentError && (
          <p className="text-xs text-danger">
            {contentError === "max" ? t("contentMaxError") : t("contentMinError")}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-xs text-text-muted">{tCapture("shortcutsHint")}</span>
          <span
            className={cn("mono shrink-0 text-xs", overMax ? "text-danger" : "text-text-muted")}
          >
            {format.number(content.length)} / {format.number(CONTENT_MAX)}
          </span>
        </div>
      </div>

      {/* Classify at the end: Type + Title on one row */}
      <div className="flex gap-2">
        <Select value={type} onValueChange={(value) => handleTypeChange(value as InteractionType)}>
          <SelectTrigger id="interaction-type" className="h-9 w-[150px] shrink-0">
            <SelectValue>{typeLabel(type)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {INTERACTION_TYPE_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {typeLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id="interaction-title"
          style={styles.flex1}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          maxLength={100}
        />
      </div>

      <Button type="submit" disabled={createMutation.isPending} className="w-full">
        {createMutation.isPending ? t("saving") : t("logInteraction")}
      </Button>
    </form>
  );
}
