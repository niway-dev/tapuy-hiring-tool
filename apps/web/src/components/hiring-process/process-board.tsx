import { useState } from "react";
import { StatusBadge } from "@interviews-tool/web-ui";
import { useTranslations } from "@interviews-tool/i18n";
import type { HiringProcessStatus } from "@interviews-tool/domain/constants";
import type { BoardColumn as BoardColumnData } from "@interviews-tool/application/hiring";
import { useStatusLabel } from "@/lib/i18n-labels";
import { ProcessBoardCard } from "./process-board-card";

interface ProcessBoardProps {
  columns: BoardColumnData[];
  onMove: (id: string, from: HiringProcessStatus, to: HiringProcessStatus) => void;
  onArchive: (card: BoardColumnData["cards"][number]) => void;
}

export function ProcessBoard({ columns, onMove, onArchive }: ProcessBoardProps) {
  const t = useTranslations("dashboard");
  const [dragId, setDragId] = useState<string | null>(null);

  const draggedFrom = dragId
    ? columns.find((column) => column.cards.some((card) => card.id === dragId))?.status
    : undefined;

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-min items-start gap-3.5">
          {columns.map((column) => (
            <BoardColumn
              key={column.status}
              column={column}
              dragId={dragId}
              canDrop={draggedFrom !== undefined && draggedFrom !== column.status}
              onDragStart={setDragId}
              onDragEnd={() => setDragId(null)}
              onDrop={(id) => {
                if (draggedFrom && draggedFrom !== column.status) {
                  onMove(id, draggedFrom, column.status);
                }
                setDragId(null);
              }}
              onMove={(id, to) => onMove(id, column.status, to)}
              onArchive={onArchive}
            />
          ))}
        </div>
      </div>

      {/* The last sentence is deliberate: it takes the fear out of dragging */}
      <p className="mt-3 text-xs text-text-muted">{t("boardLegend")}</p>
    </div>
  );
}

interface BoardColumnProps {
  column: BoardColumnData;
  dragId: string | null;
  canDrop: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (id: string) => void;
  onMove: (id: string, to: HiringProcessStatus) => void;
  onArchive: (card: BoardColumnData["cards"][number]) => void;
}

function BoardColumn({
  column,
  dragId,
  canDrop,
  onDragStart,
  onDragEnd,
  onDrop,
  onMove,
  onArchive,
}: BoardColumnProps) {
  const t = useTranslations("dashboard");
  const statusLabel = useStatusLabel();
  const [isOver, setIsOver] = useState(false);

  const active = isOver && canDrop;

  return (
    <section
      onDragOver={(e) => {
        // Without preventDefault the browser never fires a drop
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (canDrop) setIsOver(true);
      }}
      onDragLeave={(e) => {
        // Ignore crossings onto the column's own children
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const id = e.dataTransfer.getData("text/plain") || dragId;
        if (id) onDrop(id);
      }}
      data-drop-active={active || undefined}
      className="w-[272px] shrink-0 rounded-xl border border-border bg-surface-2 p-3 transition-colors data-drop-active:border-dashed data-drop-active:border-mint data-drop-active:bg-selected"
      style={{ minHeight: 180 }}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <StatusBadge status={column.status} label={statusLabel(column.status)} />
        <span className="mono text-xs text-text-muted">{column.count}</span>
      </header>

      <div className="grid gap-2">
        {column.cards.map((card) => (
          <ProcessBoardCard
            key={card.id}
            card={card}
            isDragging={dragId === card.id}
            onDragStart={() => onDragStart(card.id)}
            onDragEnd={onDragEnd}
            onMove={(to) => onMove(card.id, to)}
            onArchive={() => onArchive(card)}
          />
        ))}

        {column.cards.length === 0 && (
          <p className="rounded-[10px] border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
            {active ? t("dropHere") : t("nothingHere")}
          </p>
        )}
      </div>
    </section>
  );
}
