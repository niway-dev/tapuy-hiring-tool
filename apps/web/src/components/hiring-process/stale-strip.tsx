import { Button } from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import { STALE_DAYS } from "@interviews-tool/domain/constants";

interface StaleStripProps {
  count: number;
  onShowThem: () => void;
  onDismiss: () => void;
}

/**
 * Without this nobody remembers to tidy up, and archiving goes unused.
 * It counts only active processes in an open status — a hired role from a year
 * ago is finished, not stalled.
 */
export function StaleStrip({ count, onShowThem, onDismiss }: StaleStripProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-sm text-text-secondary">{t("staleStrip", { count, days: STALE_DAYS })}</p>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" onClick={onShowThem}>
          {t("showThem")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          {t("notNow")}
        </Button>
      </div>
    </div>
  );
}
