import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  TapuyMark,
} from "@interviews-tool/web-ui";
import {
  HIRING_PROCESS_STATUS_VALUES,
  getActiveStatuses,
  getTerminalStatuses,
  type HiringProcessStatus,
} from "@interviews-tool/domain/constants";
import { useTranslations } from "@interviews-tool/i18n";
import { useStatusLabel } from "@/lib/i18n-labels";
import { InterviewTable } from "@/components/hiring-process/hiring-process-table";
import {
  useHiringProcesses,
  useDeleteHiringProcess,
  hiringProcessesQueryOptions,
  type FilterParams,
} from "@/hooks/use-hiring-processes";
import { ProcessBoard } from "@/components/hiring-process/process-board";
import { useHiringBoard, useMoveHiringProcessStatus } from "@/hooks/use-hiring-board";
import { ChevronDown, X } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

type DashboardView = "table" | "board";

const VIEW_STORAGE_KEY = "tapuy:dashboard-view";

const ACTIVE_STATUSES = getActiveStatuses();
const TERMINAL_STATUSES = getTerminalStatuses();

export const Route = createFileRoute("/_authenticated/hiring-processes/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(hiringProcessesQueryOptions({ page: 1, limit: 10 })),
  component: HiringProcessesComponent,
});

/* Skeleton — 40px bars over bg, no card */
function TableSkeleton() {
  return (
    <div>
      <div className="flex gap-16 border-b border-border pb-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-20" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-16 border-b border-border py-3.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-5 w-24 rounded-[5px]" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

/* Board skeleton — four column shells, enough to hold the layout still */
function BoardSkeleton() {
  return (
    <div className="flex items-start gap-3.5 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="w-[272px] shrink-0 rounded-xl border border-border bg-surface-2 p-3">
          <Skeleton className="h-5 w-24 rounded-[5px]" />
          <div className="mt-3 grid gap-2">
            <Skeleton className="h-[86px] rounded-[10px]" />
            <Skeleton className="h-[86px] rounded-[10px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ViewSegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded px-3 py-1 text-sm transition-colors ${
        active ? "bg-surface-2 text-text" : "text-text-muted hover:text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function HiringProcessesComponent() {
  const t = useTranslations("dashboard");
  const statusLabel = useStatusLabel();

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [filters, setFilters] = useState<FilterParams>({});

  /* Read after mount: the server can't know the stored preference, and
     seeding it during render would desync hydration. */
  const [view, setView] = useState<DashboardView>("table");
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "board" || stored === "table") setView(stored);
  }, []);

  const changeView = useCallback((next: DashboardView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* private mode — the preference just won't persist */
    }
  }, []);

  const hasActiveFilters =
    (filters.statuses && filters.statuses.length > 0) ||
    filters.salaryDeclared !== undefined ||
    filters.salaryMin !== undefined ||
    filters.salaryMax !== undefined;

  const updateFilters = useCallback((update: Partial<FilterParams>) => {
    setFilters((prev) => ({ ...prev, ...update }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const {
    data: hiringProcessesData,
    isLoading,
    error,
    refetch,
  } = useHiringProcesses({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    filters: hasActiveFilters ? filters : undefined,
  });

  /* Active / closed counts for the header — lightweight total-only queries */
  const { data: activeData } = useHiringProcesses({
    page: 1,
    limit: 1,
    filters: { statuses: ACTIVE_STATUSES },
  });
  const { data: closedData } = useHiringProcesses({
    page: 1,
    limit: 1,
    filters: { statuses: TERMINAL_STATUSES },
  });
  const activeCount = activeData?.meta?.pagination?.total;
  const closedCount = closedData?.meta?.pagination?.total;

  /* Board reads every active process at once — no pagination, the columns are the shape */
  const boardFilters = {
    salaryDeclared: filters.salaryDeclared,
    salaryMin: filters.salaryMin,
    salaryMax: filters.salaryMax,
  };
  const {
    data: boardData,
    isLoading: isBoardLoading,
    error: boardError,
  } = useHiringBoard(boardFilters, { enabled: view === "board" });

  const moveStatus = useMoveHiringProcessStatus();

  const handleMove = useCallback(
    (id: string, from: HiringProcessStatus, to: HiringProcessStatus) => {
      moveStatus.mutate(
        { id, status: to },
        {
          onSuccess: () => {
            /* 5s, not 3: an undo that expires before it's read doesn't exist */
            toast.success(t("movedTo", { status: statusLabel(to) }), {
              duration: 5000,
              action: {
                label: t("undo"),
                onClick: () => moveStatus.mutate({ id, status: from }),
              },
            });
          },
          onError: () => toast.error(t("moveError")),
        },
      );
    },
    [moveStatus, statusLabel, t],
  );

  const deleteHiringProcess = useDeleteHiringProcess();

  const handleDelete = async (id: string) => {
    await deleteHiringProcess.mutateAsync(id);
  };

  const toggleStatus = useCallback(
    (status: HiringProcessStatus) => {
      const current = filters.statuses || [];
      const next = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      updateFilters({ statuses: next.length > 0 ? next : undefined });
    },
    [filters.statuses, updateFilters],
  );

  const hiringProcesses = hiringProcessesData?.data || [];
  const paginationMeta = hiringProcessesData?.meta?.pagination;
  const isEmpty = !isLoading && !error && hiringProcesses.length === 0;
  const selectedStatuses = filters.statuses?.length ?? 0;

  /* First-run empty state: full-page invitation, single primary */
  if (isEmpty && !hasActiveFilters) {
    return (
      <div className="container mx-auto flex max-w-6xl flex-col items-center px-4 pt-36 pb-24 text-center">
        <TapuyMark mono className="size-14 text-text-muted" />
        <h1 className="mt-8 text-2xl font-medium text-text">{t("emptyTitle")}</h1>
        <p className="mt-2 text-base text-text-secondary">{t("emptyBody")}</p>
        <Link to="/hiring-processes/new" className="mt-8">
          <Button>{t("createProcess")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`container mx-auto px-4 py-10 ${view === "board" ? "max-w-[1560px]" : "max-w-6xl"}`}
    >
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight font-medium text-text">{t("title")}</h1>
          {activeCount !== undefined && closedCount !== undefined && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="mono text-sm text-text-muted">
                {t("activeCount", { count: activeCount })} ·{" "}
                {t("closedCount", { count: closedCount })}
              </p>
              {activeCount + closedCount > 0 && (
                <p className="flex items-center gap-2 text-sm text-text-secondary">
                  <span className="size-1.5 shrink-0 rounded-full bg-mint" />
                  <span>
                    {t.rich("liveTip", {
                      kbd: (chunks) => (
                        <kbd className="mono rounded border border-border bg-surface-2 px-1 py-px text-xs">
                          {chunks}
                        </kbd>
                      ),
                    })}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
        <Link to="/hiring-processes/new" className="shrink-0">
          <Button>{t("createProcess")}</Button>
        </Link>
      </div>

      {/* Filters — compact, no accent */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* On the board the columns already are the status filter */}
        {view === "table" && (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-transparent px-3 text-sm text-text transition-colors hover:border-border-strong">
            {selectedStatuses > 0
              ? t("statusFilterCount", { count: selectedStatuses })
              : t("statusFilterAll")}
            <ChevronDown className="size-3.5 text-text-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("filterByStatus")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {HIRING_PROCESS_STATUS_VALUES.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.statuses?.includes(status) ?? false}
                  onCheckedChange={() => toggleStatus(status)}
                >
                  {statusLabel(status)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        )}

        <Select
          value={
            filters.salaryDeclared === undefined
              ? "all"
              : filters.salaryDeclared
                ? "declared"
                : "not-declared"
          }
          onValueChange={(value) => {
            if (!value || value === "all") {
              updateFilters({
                salaryDeclared: undefined,
                salaryMin: undefined,
                salaryMax: undefined,
              });
            } else {
              updateFilters({
                salaryDeclared: value === "declared",
                ...(value === "not-declared" ? { salaryMin: undefined, salaryMax: undefined } : {}),
              });
            }
          }}
        >
          <SelectTrigger className="bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("salaryAll")}</SelectItem>
            <SelectItem value="declared">{t("salaryDeclared")}</SelectItem>
            <SelectItem value="not-declared">{t("salaryNotDeclared")}</SelectItem>
          </SelectContent>
        </Select>

        {filters.salaryDeclared === true && (
          <>
            <Input
              type="number"
              min={0}
              placeholder={t("minSalary")}
              className="mono h-9 w-24"
              value={filters.salaryMin ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                updateFilters({ salaryMin: val ? Number(val) : undefined });
              }}
            />
            <Input
              type="number"
              min={0}
              placeholder={t("maxSalary")}
              className="mono h-9 w-24"
              value={filters.salaryMax ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                updateFilters({ salaryMax: val ? Number(val) : undefined });
              }}
            />
          </>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-3.5" />
            {t("clearFilters")}
          </Button>
        )}

        {/* View segment, pushed to the far right */}
        <div className="ml-auto inline-flex rounded-md border border-border p-0.5">
          <ViewSegmentButton active={view === "table"} onClick={() => changeView("table")}>
            {t("viewTable")}
          </ViewSegmentButton>
          <ViewSegmentButton active={view === "board"} onClick={() => changeView("board")}>
            {t("viewBoard")}
          </ViewSegmentButton>
        </div>
      </div>

      {/* Content */}
      {view === "board" ? (
        isBoardLoading ? (
          <BoardSkeleton />
        ) : boardError || !boardData?.data ? (
          <div className="py-20 text-center">
            <p className="text-sm text-danger">{t("loadError")}</p>
          </div>
        ) : (
          <ProcessBoard columns={boardData.data.columns} onMove={handleMove} />
        )
      ) : isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="py-20 text-center">
          <p className="text-sm text-danger">{t("loadError")}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => refetch()}>
            {t("retry")}
          </Button>
        </div>
      ) : isEmpty ? (
        <div className="py-20 text-center">
          <p className="text-base font-medium text-text">{t("noMatchTitle")}</p>
          <p className="mt-1 text-sm text-text-secondary">{t("noMatchBody")}</p>
          <Button variant="ghost" size="sm" className="mt-4" onClick={clearFilters}>
            {t("clearFilters")}
          </Button>
        </div>
      ) : (
        <InterviewTable
          interviews={hiringProcesses}
          onDelete={handleDelete}
          isDeleting={deleteHiringProcess.isPending}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalCount={paginationMeta?.total || 0}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
