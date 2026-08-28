import { useState } from "react";
import { Button, Checkbox, Input, cn } from "@interviews-tool/web-ui";
import { useFormatter, useTranslations } from "@interviews-tool/i18n";
import { useQuestions, type QuestionWithState } from "@/lib/questions-store";

/* Questions to ask — spec §4 of documentation/CAPTURE-V2.md.
   In the normal column ticking only marks the question as asked; in live
   mode ticking also writes `**Q:** <question>` into the note (onTick). */

interface QuestionsPanelProps {
  processId: string;
  lastInteractionAt?: Date | string | null;
  variant: "column" | "live";
  /** Live mode: called with the question text when a question is ticked */
  onTick?: (text: string) => void;
  className?: string;
}

export function QuestionsPanel({
  processId,
  lastInteractionAt,
  variant,
  onTick,
  className,
}: QuestionsPanelProps) {
  const t = useTranslations("capture");
  const format = useFormatter();
  const { open, asked, addQuestion, toggle } = useQuestions(processId, lastInteractionAt);
  const [newQuestion, setNewQuestion] = useState("");
  const [showAsked, setShowAsked] = useState(false);

  const handleAdd = () => {
    if (!newQuestion.trim()) return;
    addQuestion(newQuestion);
    setNewQuestion("");
  };

  const originLabel = (q: QuestionWithState) => {
    if (q.carriedFrom) {
      return (
        <span className="mono text-[11px] text-violet">
          {t("carriedFrom", {
            date: format.dateTime(q.carriedFrom, { month: "short", day: "numeric" }),
          })}
        </span>
      );
    }
    return (
      <span className="mono text-[11px] text-text-muted">
        {q.scope === "default" ? t("defaultList") : t("thisProcess")}
      </span>
    );
  };

  return (
    <section
      className={cn(
        variant === "column" && "rounded-xl border border-border bg-surface p-5",
        className,
      )}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-medium text-text">{t("questionsTitle")}</h3>
        <span className="mono text-[13px] text-text-muted">
          {t("openCount", { count: open.length })}
        </span>
      </div>

      <div className="mt-4 space-y-3.5">
        {open.map((q) => (
          <label key={q.id} className="flex cursor-pointer items-start gap-2.5">
            <Checkbox
              checked={false}
              onCheckedChange={() => {
                toggle(q.id);
                onTick?.(q.text);
              }}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="block text-sm leading-snug text-text">{q.text}</span>
              {originLabel(q)}
            </span>
          </label>
        ))}
      </div>

      {asked.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAsked((v) => !v)}
            className="text-[13px] text-text-muted transition-colors hover:text-text"
          >
            {showAsked ? t("hideAsked") : t("showAsked", { count: asked.length })}
          </button>
          {showAsked && (
            <div className="mt-3 space-y-3">
              {asked.map((q) => (
                <label key={q.id} className="flex cursor-pointer items-start gap-2.5">
                  <Checkbox checked onCheckedChange={() => toggle(q.id)} className="mt-0.5" />
                  <span className="text-sm leading-snug text-text-muted line-through">
                    {q.text}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex gap-2 border-t border-border pt-4">
        <Input
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={t("addQuestion")}
          className="h-9 flex-1"
        />
        <Button type="button" variant="secondary" onClick={handleAdd}>
          {t("add")}
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-text-muted">
        {variant === "live" ? t("tickLegend") : t("carryLegend")}
      </p>
    </section>
  );
}
