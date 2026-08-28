import { Button, MarkdownContent } from "@interviews-tool/web-ui";
import { useFormatter } from "@interviews-tool/i18n";
import { Pencil, Trash2 } from "lucide-react";
import { InteractionTypeBadge } from "./interaction-type-badge";
import type { Interaction } from "@/hooks/use-interactions";

interface InteractionCardProps {
  interaction: Interaction;
  onEdit?: (interaction: Interaction) => void;
  onDelete?: (interaction: Interaction) => void;
}

/* Content renders in full — the timeline is the product, not a teaser. */
export function InteractionCard({
  interaction,
  onEdit,
  onDelete,
}: InteractionCardProps): React.ReactElement {
  const format = useFormatter();
  const createdAt = new Date(interaction.createdAt);

  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-[18px]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <InteractionTypeBadge type={interaction.type} />
          <span className="mono text-xs text-text-muted">
            {format.dateTime(createdAt, { month: "short", day: "numeric", year: "numeric" })} ·{" "}
            {format.dateTime(createdAt, { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-[26px] text-text-muted hover:text-text"
              onClick={() => onEdit(interaction)}
            >
              <Pencil className="size-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-[26px] text-text-muted hover:text-text"
              onClick={() => onDelete(interaction)}
            >
              <Trash2 className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {interaction.title && (
        <h4 className="mb-2.5 text-sm font-medium text-text">{interaction.title}</h4>
      )}

      <MarkdownContent content={interaction.content} />
    </div>
  );
}
