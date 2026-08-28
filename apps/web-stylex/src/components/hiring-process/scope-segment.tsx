import { useTranslations } from "@interviews-tool/i18n";
import type { HiringProcessScope } from "@interviews-tool/domain/constants";

interface ScopeSegmentProps {
  scope: HiringProcessScope;
  activeCount?: number;
  archivedCount?: number;
  onChange: (scope: HiringProcessScope) => void;
}

/**
 * Active | Archived. Counts come from the same response as the rows, so the
 * numbers are there on the first render instead of arriving a beat later.
 */
export function ScopeSegment({ scope, activeCount, archivedCount, onChange }: ScopeSegmentProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      <SegmentButton selected={scope === "active"} onClick={() => onChange("active")}>
        {t("scopeActive")}
        {activeCount !== undefined && <Count value={activeCount} />}
      </SegmentButton>
      <SegmentButton selected={scope === "archived"} onClick={() => onChange("archived")}>
        {t("scopeArchived")}
        {archivedCount !== undefined && <Count value={archivedCount} />}
      </SegmentButton>
    </div>
  );
}

function Count({ value }: { value: number }) {
  return <span className="mono ml-1.5 opacity-70">{value}</span>;
}

function SegmentButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded px-3 py-1 text-sm transition-colors ${
        selected ? "bg-surface-2 text-text" : "text-text-muted hover:text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}
