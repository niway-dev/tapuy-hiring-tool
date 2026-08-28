import { Button, Skeleton, TapuyMark, cn } from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import { useInteractions } from "@/hooks/use-interactions";
import { InteractionCard } from "./interaction-card";
import { INTERACTION_CONTENT_ID } from "./interaction-form";
import type { Interaction } from "@/hooks/use-interactions";

interface InteractionTimelineProps {
  hiringProcessId: string;
  onEdit?: (interaction: Interaction) => void;
  onDelete?: (interaction: Interaction) => void;
}

/* Only `offer` and `rejection` nodes carry color; every other node is muted. */
function nodeColor(type: Interaction["type"]) {
  if (type === "offer") return "bg-fuchsia";
  if (type === "rejection") return "bg-status-rejected-bg";
  return "bg-text-muted";
}

function TimelineShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative pl-8">
      <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border-strong" />
      {children}
    </div>
  );
}

export function InteractionTimeline({
  hiringProcessId,
  onEdit,
  onDelete,
}: InteractionTimelineProps) {
  const t = useTranslations("interaction");
  const { data, isLoading, error } = useInteractions(hiringProcessId);

  if (isLoading) {
    return (
      <TimelineShell>
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="relative mb-5">
            <div className="absolute -left-[28px] top-4 size-2 rounded-full bg-surface-2" />
            <div className="rounded-xl border border-border bg-surface px-5 py-[18px]">
              <div className="mb-3 flex items-center gap-2.5">
                <Skeleton className="h-[22px] w-16 bg-surface-2" />
                <Skeleton className="h-3 w-36 bg-surface-2" />
              </div>
              <Skeleton className="mb-2 h-4 w-48 bg-surface-2" />
              <Skeleton className="h-16 w-full bg-surface-2" />
            </div>
          </article>
        ))}
      </TimelineShell>
    );
  }

  if (error) {
    return <p className="py-12 text-center text-sm text-danger">{t("loadError")}</p>;
  }

  const interactions = [...(data?.data ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (interactions.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-border px-8 py-[88px] text-center">
        <TapuyMark className="size-9 text-text-muted" />
        <h3 className="mt-5 text-base font-medium text-text">{t("emptyTitle")}</h3>
        <p className="mt-1.5 text-sm text-text-secondary">{t("emptyBody")}</p>
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={() => {
            const textarea = document.getElementById(INTERACTION_CONTENT_ID);
            textarea?.scrollIntoView({ behavior: "smooth", block: "center" });
            textarea?.focus({ preventScroll: true });
          }}
        >
          {t("emptyCta")}
        </Button>
      </div>
    );
  }

  return (
    <TimelineShell>
      {interactions.map((interaction) => (
        <article key={interaction.id} className="relative mb-5">
          <div
            className={cn(
              "absolute -left-[28px] top-4 size-2 rounded-full",
              nodeColor(interaction.type),
            )}
          />
          <InteractionCard interaction={interaction} onEdit={onEdit} onDelete={onDelete} />
        </article>
      ))}
    </TimelineShell>
  );
}
