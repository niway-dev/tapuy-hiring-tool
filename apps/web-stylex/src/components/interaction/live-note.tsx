import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button, StatusBadge, cn } from "@interviews-tool/web-ui";
import { useFormatter, useTranslations } from "@interviews-tool/i18n";
import type { HiringProcessStatus } from "@interviews-tool/domain/constants";

import { useCreateInteraction, type Interaction } from "@/hooks/use-interactions";
import { useInteractionTypeLabel } from "@/lib/i18n-labels";
import { SLASH_ITEMS, excerpt, formatDuration, formatTimer } from "@/lib/capture";
import type { InteractionDraftState } from "@/lib/interaction-draft";
import { useSlashMenu } from "./slash-menu";
import { EditorToolbar, useMdEditing } from "./editor-toolbar";
import { QuestionsPanel } from "./questions-panel";
import { CONTENT_MIN } from "./interaction-form";

interface LiveNoteProps {
  processId: string;
  companyName: string;
  jobTitle?: string | null;
  status: HiringProcessStatus | string;
  statusLabel: string;
  /** Preformatted mono salary text, e.g. "$5,200 / mo · USD" */
  salaryText?: string | null;
  interactions: Interaction[];
  draft: InteractionDraftState;
  onClose: () => void;
}

interface LiveTopBarProps {
  elapsed: number;
  companyName: string;
  jobTitle?: string | null;
  status: HiringProcessStatus | string;
  statusLabel: string;
  salaryText?: string | null;
  savedAt: number | null;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onSave: () => void;
  saving: boolean;
  onClose: () => void;
}

/* Top bar — 52px: recording dot, timer, process context, draft state, actions */
function LiveTopBar({
  elapsed,
  companyName,
  jobTitle,
  status,
  statusLabel,
  salaryText,
  savedAt,
  panelOpen,
  onTogglePanel,
  onSave,
  saving,
  onClose,
}: LiveTopBarProps): React.ReactElement {
  const t = useTranslations("capture");
  const tInteraction = useTranslations("interaction");
  const format = useFormatter();

  return (
    <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border px-4">
      <span className="size-[7px] shrink-0 rounded-full bg-fuchsia" />
      <span className="mono shrink-0 text-[13px] tabular-nums text-text">
        {formatTimer(elapsed)}
      </span>
      <span className="shrink-0 text-sm font-medium text-text">{companyName}</span>
      {jobTitle && <span className="min-w-0 truncate text-[13px] text-text-muted">{jobTitle}</span>}
      <StatusBadge status={status} label={statusLabel} className="shrink-0" />
      {salaryText && (
        <span className="mono hidden shrink-0 text-[13px] text-text-secondary lg:inline">
          {salaryText}
        </span>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {savedAt && (
          <span className="mono max-w-[160px] truncate text-xs text-text-muted">
            {t("draftSaved", {
              time: format.dateTime(new Date(savedAt), { hour: "numeric", minute: "2-digit" }),
            })}
          </span>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 whitespace-nowrap"
          onClick={onTogglePanel}
        >
          {panelOpen ? t("hidePanel") : t("showPanel")}
        </Button>
        <Button size="sm" className="shrink-0 whitespace-nowrap" onClick={onSave} disabled={saving}>
          {saving ? tInteraction("saving") : t("saveInteraction")}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-[30px] shrink-0"
          onClick={onClose}
          title={t("close")}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/* Earlier notes — the last conversations, excerpted with exact wording */
function EarlierNotes({
  interactions,
}: {
  interactions: Interaction[];
}): React.ReactElement | null {
  const t = useTranslations("capture");
  const format = useFormatter();
  const typeLabel = useInteractionTypeLabel();

  if (interactions.length === 0) return null;

  return (
    <div className="mt-8 border-t border-border pt-5">
      <h3 className="text-base font-medium text-text">{t("earlierNotes")}</h3>
      <div className="mt-4 space-y-5">
        {interactions.map((interaction) => (
          <div key={interaction.id}>
            <div className="flex items-center gap-2">
              <span className="rounded-[5px] bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
                {interaction.type ? typeLabel(interaction.type) : "—"}
              </span>
              <span className="mono text-[11px] text-text-muted">
                {format.dateTime(new Date(interaction.createdAt), {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
              {excerpt(interaction.content)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Live mode — spec §2 of documentation/CAPTURE-V2.md. Full-screen overlay
   for taking notes during the call: mono editor over bg with no focus ring
   (the mint caret is the indicator), timer in the top bar, and a
   collapsible side panel with questions and earlier notes. */
export function LiveNote({
  processId,
  companyName,
  jobTitle,
  status,
  statusLabel,
  salaryText,
  interactions,
  draft,
  onClose,
}: LiveNoteProps): React.ReactElement {
  const t = useTranslations("capture");
  const tInteraction = useTranslations("interaction");
  const tCommon = useTranslations("common");
  const createMutation = useCreateInteraction();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const openedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);

  const { content, title, type, setContent } = draft;

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

  /* Timer */
  useEffect(() => {
    const interval = setInterval(
      () => setElapsed(Math.floor((Date.now() - openedAt.current) / 1000)),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  /* Caret at the end on open */
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
      el.dataset.touched = "1";
    }
  }, []);

  const handleSave = async (): Promise<void> => {
    if (content.length < CONTENT_MIN) {
      toast.error(tInteraction("contentMinError"));
      return;
    }
    const duration = formatDuration(Math.floor((Date.now() - openedAt.current) / 1000));
    const baseTitle = title.trim();
    const finalTitle = duration
      ? `${baseTitle || t("liveNoteDefaultTitle")} · ${duration}`
      : baseTitle || undefined;

    try {
      await createMutation.mutateAsync({
        hiringProcessId: processId,
        data: { content, title: finalTitle, type },
      });
      toast.success(tInteraction("savedToast"));
      draft.clear();
      onClose();
    } catch (error) {
      toast.error(tCommon("error"));
      console.error(error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-bg"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <LiveTopBar
        elapsed={elapsed}
        companyName={companyName}
        jobTitle={jobTitle}
        status={status}
        statusLabel={statusLabel}
        salaryText={salaryText}
        savedAt={draft.savedAt}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((v) => !v)}
        onSave={handleSave}
        saving={createMutation.isPending}
        onClose={onClose}
      />

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Editor */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {slash.menu}
          <textarea
            ref={textareaRef}
            id="live-content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              slash.detect(e.target);
            }}
            onKeyDown={(e) => {
              if (slash.handleKeyDown(e)) {
                e.stopPropagation();
                return;
              }
              if (md.handleKeyDown(e)) {
                e.stopPropagation();
                return;
              }
              if (e.key === "Escape") return; /* bubbles to the overlay: close */
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.currentTarget.dataset.touched = "1";
            }}
            placeholder={tInteraction("contentPlaceholder")}
            className="mono w-full flex-1 resize-none border-0 bg-transparent p-7 text-[15px] leading-[1.8] text-text outline-none [caret-color:var(--mint)] focus-visible:shadow-none"
          />

          {/* Markdown controls + quick-insert chips */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 px-7 pb-5">
            <EditorToolbar
              run={md.run}
              actions={["bold", "italic", "code", "bullet", "checkbox"]}
              className="mr-2 gap-1 [&>button]:h-[30px] [&>button]:min-w-[30px] [&>button]:rounded-md [&>button]:border [&>button]:border-border [&>button]:hover:border-border-strong"
            />
            {SLASH_ITEMS.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => slash.insertSnippet(item.insert())}
                className="h-[30px] rounded-md border border-border bg-transparent px-2.5 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text"
              >
                {t(`slash.${item.id}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Side panel — 320px, collapsible */}
        <aside
          className={cn(
            "box-border w-[320px] shrink-0 overflow-y-auto border-l border-border p-5",
            !panelOpen && "hidden",
          )}
        >
          <QuestionsPanel
            processId={processId}
            lastInteractionAt={interactions[0]?.createdAt ?? null}
            variant="live"
            onTick={(text) => slash.insertSnippet(`**Q:** ${text}\n`)}
          />
          <EarlierNotes interactions={interactions.slice(0, 4)} />
        </aside>
      </div>
    </div>
  );
}
