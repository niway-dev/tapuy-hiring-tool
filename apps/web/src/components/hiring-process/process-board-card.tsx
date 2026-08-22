import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import {
  HIRING_PROCESS_STATUS_ORDER,
  isStaleProcess,
  type HiringProcessStatus,
} from "@interviews-tool/domain/constants";
import { useStatusLabel } from "@/lib/i18n-labels";
import { useAgeLabel, useSalaryFormatter } from "@/lib/format";
import type { HiringProcess } from "@/hooks/use-hiring-processes";
import { MoreHorizontal } from "lucide-react";

/* The one place the 8 status colours sit side by side: 7px squares inside a
   popover, small enough not to break the accent budget. Written out in full so
   Tailwind can see every class name. */
const STATUS_SQUARE: Record<HiringProcessStatus, string> = {
  "first-contact": "bg-status-first-contact-text",
  ongoing: "bg-status-ongoing-text",
  "on-hold": "bg-status-on-hold-text",
  "offer-made": "bg-status-offer-made-text",
  "offer-accepted": "bg-status-offer-accepted-text",
  hired: "bg-status-hired-text",
  rejected: "bg-status-rejected-text",
  "dropped-out": "bg-status-dropped-out-text",
};

interface ProcessBoardCardProps {
  card: HiringProcess;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (status: HiringProcessStatus) => void;
  onArchive: () => void;
}

export function ProcessBoardCard({
  card,
  isDragging,
  onDragStart,
  onDragEnd,
  onMove,
  onArchive,
}: ProcessBoardCardProps) {
  const t = useTranslations("dashboard");
  const tCapture = useTranslations("capture");
  const statusLabel = useStatusLabel();
  const formatSalary = useSalaryFormatter();
  const ageLabel = useAgeLabel();

  const updatedAt = new Date(card.updatedAt);
  const isStale = isStaleProcess({ status: card.status, updatedAt }, new Date());

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", card.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      data-dragging={isDragging || undefined}
      className="group cursor-grab rounded-[10px] border border-border bg-surface p-3 transition-colors hover:border-border-strong data-dragging:opacity-40"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to="/hiring-processes/$id"
          params={{ id: card.id }}
          className="text-sm leading-snug font-medium text-text transition-colors hover:text-mint"
        >
          {card.companyName}
        </Link>

        {/* Revealed on hover: the card stays quiet until you reach for it */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <Link
            to="/hiring-processes/$id"
            params={{ id: card.id }}
            search={{ live: true }}
            title={tCapture("startLiveNote")}
            aria-label={tCapture("startLiveNote")}
            className="flex size-5 items-center justify-center rounded transition-colors hover:bg-selected"
          >
            <span className="size-1.5 rounded-full bg-mint" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("moveTo")}
              className="flex size-5 items-center justify-center rounded text-text-muted transition-colors hover:bg-selected hover:text-text"
            >
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[196px]">
              <DropdownMenuLabel className="text-[11px] font-medium tracking-[0.04em] text-text-muted uppercase">
                {t("moveTo")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {HIRING_PROCESS_STATUS_ORDER.filter((status) => status !== card.status).map(
                (status) => (
                  <DropdownMenuItem key={status} onClick={() => onMove(status)}>
                    <span
                      aria-hidden
                      className={`size-[7px] shrink-0 rounded-[2px] ${STATUS_SQUARE[status]}`}
                    />
                    {statusLabel(status)}
                  </DropdownMenuItem>
                ),
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive}>{t("archiveMenuItem")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="mt-1 text-[13px] text-text-secondary">{card.jobTitle || "—"}</p>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="mono text-[13px] text-text">
          {formatSalary(card.salary, card.currency, card.salaryRateType)}
        </span>
        {/* Age, not an absolute date: on a board what matters is how long it has been sitting */}
        <span
          className={`mono text-xs ${isStale ? "text-status-on-hold-text" : "text-text-muted"}`}
          title={updatedAt.toLocaleDateString()}
        >
          {ageLabel(updatedAt)}
        </span>
      </div>
    </article>
  );
}
