import { cn } from "@interviews-tool/web-ui";
import type { InteractionType } from "@interviews-tool/domain/constants";
import { useInteractionTypeLabel } from "@/lib/i18n-labels";

/* Type badges speak the same language as status badges: 12px/500, 2×8 padding,
   radius 5, sentence case, never an icon or emoji inside. Only `offer` and
   `rejection` get color (offer-made / rejected palettes); the rest are neutral. */
const typeClasses: Partial<Record<InteractionType, string>> = {
  offer: "bg-status-offer-made-bg text-status-offer-made-text border-status-offer-made-border",
  rejection: "bg-status-rejected-bg text-status-rejected-text border-transparent",
};

export function InteractionTypeBadge({
  type,
}: {
  type: InteractionType | null;
}): React.ReactElement | null {
  const typeLabel = useInteractionTypeLabel();
  if (!type) return null;

  return (
    <span
      data-slot="interaction-type-badge"
      className={cn(
        "inline-flex w-fit items-center whitespace-nowrap rounded-[5px] border px-2 py-0.5 text-xs font-medium leading-[18px]",
        typeClasses[type] ?? "bg-surface-2 text-text-secondary border-border-strong",
      )}
    >
      {typeLabel(type)}
    </span>
  );
}
