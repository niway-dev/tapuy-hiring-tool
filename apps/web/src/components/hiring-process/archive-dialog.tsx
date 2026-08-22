import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import { ARCHIVE_REASONS, ARCHIVE_REASON_VALUES } from "@interviews-tool/domain/constants";
import type { ArchiveReason } from "@interviews-tool/domain/constants";
import { useArchiveReasonLabel } from "@/lib/i18n-labels";

interface ArchiveDialogProps {
  companyName: string;
  /** Drives the preselected reason: a silent process most likely went unanswered */
  isStale: boolean;
  isArchiving?: boolean;
  onConfirm: (reason: ArchiveReason) => void;
  onCancel: () => void;
}

export function ArchiveDialog({
  companyName,
  isStale,
  isArchiving = false,
  onConfirm,
  onCancel,
}: ArchiveDialogProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const reasonLabel = useArchiveReasonLabel();

  /* Preselected so the common case is one click: most archives never pick a reason */
  const [reason, setReason] = useState<ArchiveReason>(
    isStale ? ARCHIVE_REASONS.NO_REPLY : ARCHIVE_REASONS.THEY_PASSED,
  );

  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="rounded-xl border-border-strong bg-surface p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-medium">
            {t("archiveTitle", { company: companyName })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("archiveBody")}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-1">
          <p className="text-[11px] font-medium tracking-[0.04em] text-text-muted uppercase">
            {t("archiveWhy")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ARCHIVE_REASON_VALUES.map((value) => {
              const selected = value === reason;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setReason(value)}
                  className={`rounded-md border px-2.5 py-1 text-[13px] transition-colors ${
                    selected
                      ? "border-mint bg-selected text-mint"
                      : "border-border-strong text-text-secondary hover:text-text"
                  }`}
                >
                  {reasonLabel(value)}
                </button>
              );
            })}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isArchiving}>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={isArchiving} onClick={() => onConfirm(reason)}>
            {t("archiveAction")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
