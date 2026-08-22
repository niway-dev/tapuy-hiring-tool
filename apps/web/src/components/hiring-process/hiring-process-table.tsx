import { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@interviews-tool/web-ui";
import { useTranslations, useFormatter } from "@interviews-tool/i18n";
import { useArchiveReasonLabel, useStatusLabel } from "@/lib/i18n-labels";
import { useAgeLabel, useSalaryFormatter } from "@/lib/format";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import type { HiringProcess } from "@/hooks/use-hiring-processes";
import { isStaleProcess, type HiringProcessScope } from "@interviews-tool/domain/constants";
import {
  Archive,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

const columnHelper = createColumnHelper<HiringProcess>();

interface InterviewTableProps {
  interviews: HiringProcess[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  totalCount: number;
  isLoading?: boolean;
  scope?: HiringProcessScope;
  /** Opens the archive dialog; the row can't archive on its own because a reason is required */
  onArchive?: (process: HiringProcess) => void;
  onRestore?: (id: string) => void;
  isMutating?: boolean;
}

export function InterviewTable({
  interviews,
  onDelete,
  isDeleting = false,
  pagination,
  onPaginationChange,
  totalCount,
  isLoading = false,
  scope = "active",
  onArchive,
  onRestore,
  isMutating = false,
}: InterviewTableProps) {
  const navigate = useNavigate();
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const statusLabel = useStatusLabel();
  const reasonLabel = useArchiveReasonLabel();
  const formatSalary = useSalaryFormatter();
  const ageLabel = useAgeLabel();
  const isArchived = scope === "archived";
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);

  const interviewToDelete = interviews.find((i) => i.id === deleteId);
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const formatDate = (date: Date): string =>
    format.dateTime(new Date(date), { month: "short", day: "numeric", year: "numeric" });

  const columns = useMemo(
    () => [
      columnHelper.accessor("companyName", {
        header: t("columns.company"),
        cell: (info) => {
          const interview = info.row.original;
          return (
            <Link
              to="/hiring-processes/$id"
              params={{ id: interview.id }}
              className="block max-w-[220px] truncate font-medium text-text transition-colors hover:text-mint"
              title={info.getValue()}
            >
              {info.getValue()}
            </Link>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor("jobTitle", {
        header: t("columns.jobTitle"),
        cell: (info) => {
          const jobTitle = info.getValue();
          return jobTitle ? (
            <span className="block max-w-[320px] truncate text-text-secondary" title={jobTitle}>
              {jobTitle}
            </span>
          ) : (
            <span className="text-text-muted">–</span>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor("status", {
        /* Archived rows keep the status they stopped at — that's the point of archiving */
        header: isArchived ? t("columnsStatusWhenArchived") : t("columns.status"),
        cell: (info) => (
          <StatusBadge status={info.getValue()} label={statusLabel(info.getValue())} />
        ),
        enableSorting: false,
      }),
      columnHelper.accessor("salary", {
        header: () => <div className="text-right">{t("columns.salary")}</div>,
        cell: (info) => {
          const interview = info.row.original;
          return (
            <div className="mono text-right text-[13px] text-text">
              {formatSalary(info.getValue(), interview.currency, interview.salaryRateType)}
            </div>
          );
        },
        enableSorting: true,
        sortingFn: (rowA, rowB) => (rowA.original.salary || 0) - (rowB.original.salary || 0),
      }),
      columnHelper.accessor(isArchived ? "archivedAt" : "updatedAt", {
        id: "updatedAt",
        header: isArchived ? t("columnsArchived") : t("columns.lastUpdate"),
        cell: (info) => {
          const interview = info.row.original;
          const value = info.getValue() as Date | null | undefined;

          if (isArchived) {
            return (
              <span className="mono text-[13px] text-text-secondary">
                {value ? formatDate(value) : "–"}
                {interview.archiveReason && (
                  <span className="text-text-muted"> · {reasonLabel(interview.archiveReason)}</span>
                )}
              </span>
            );
          }

          /* A stalled process says how long it has been silent, right next to the date */
          const updatedAt = new Date(interview.updatedAt);
          const stale = isStaleProcess(
            { status: interview.status, updatedAt, archivedAt: interview.archivedAt },
            new Date(),
          );

          return (
            <span
              className={`mono text-[13px] ${stale ? "text-status-on-hold-text" : "text-text-secondary"}`}
            >
              {formatDate(updatedAt)}
              {stale && <span className="ml-2">{ageLabel(updatedAt)}</span>}
            </span>
          );
        },
        enableSorting: true,
        sortingFn: (rowA, rowB) =>
          new Date(rowA.original.updatedAt).getTime() - new Date(rowB.original.updatedAt).getTime(),
      }),
      columnHelper.display({
        id: "actions",
        header: () => null,
        cell: (info) => {
          const interview = info.row.original;
          return (
            <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
              {isArchived ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onRestore?.(interview.id)}
                  disabled={isMutating}
                >
                  {t("restore")}
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2 text-[13px] text-text-secondary hover:text-text"
                    onClick={() =>
                      navigate({
                        to: "/hiring-processes/$id",
                        params: { id: interview.id },
                        search: { live: true },
                      })
                    }
                  >
                    <span className="size-1.5 rounded-full bg-mint" />
                    {t("liveNote")}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title={t("view")}
                    className="text-text-muted hover:text-text"
                    onClick={() =>
                      navigate({ to: "/hiring-processes/$id", params: { id: interview.id } })
                    }
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title={t("edit")}
                    className="text-text-muted hover:text-text"
                    onClick={() =>
                      navigate({
                        to: "/hiring-processes/$id/edit",
                        params: { id: interview.id },
                      })
                    }
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title={t("archive")}
                    className="text-text-muted hover:text-text"
                    onClick={() => onArchive?.(interview)}
                  >
                    <Archive className="size-3.5" />
                  </Button>
                </>
              )}
              <Button
                size="icon-sm"
                variant="ghost"
                title={t("delete")}
                className="text-text-muted hover:text-danger"
                onClick={() => setDeleteId(interview.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        },
        enableSorting: false,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formatSalary/formatDate derive from format, which is in the deps
    [navigate, t, statusLabel, format, isArchived, onArchive, onRestore, isMutating],
  );

  const table = useReactTable({
    data: interviews,
    columns,
    pageCount,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === "function" ? updater(pagination) : updater;
      onPaginationChange(newPagination);
    },
    state: {
      sorting,
      pagination,
    },
  });

  return (
    <>
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/60 backdrop-blur-[1px]">
            <div className="text-sm text-text-muted">…</div>
          </div>
        )}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();
                  const isActions = header.column.id === "actions";
                  const isSalary = header.column.id === "salary";
                  const rendered = header.isPlaceholder
                    ? null
                    : typeof header.column.columnDef.header === "function"
                      ? header.column.columnDef.header(header.getContext())
                      : header.column.columnDef.header;
                  return (
                    <TableHead
                      key={header.id}
                      className={isActions || isSalary ? "text-right" : "text-left"}
                    >
                      {canSort ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className={`inline-flex items-center gap-1 transition-colors hover:text-text ${
                            isSalary ? "justify-end" : ""
                          }`}
                        >
                          {rendered}
                          {isSorted === "asc" && <ArrowUp className="size-3" />}
                          {isSorted === "desc" && <ArrowDown className="size-3" />}
                        </button>
                      ) : (
                        rendered
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="group/row">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {typeof cell.column.columnDef.cell === "function"
                      ? cell.column.columnDef.cell(cell.getContext())
                      : cell.getValue()}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <p className="mono text-[13px] text-text-muted">
            {totalCount === 0
              ? t("noEntries")
              : t("showing", {
                  from: pagination.pageIndex * pagination.pageSize + 1,
                  to: Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount),
                  total: totalCount,
                })}
          </p>

          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">{t("rowsPerPage")}</span>
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(value) => {
                  if (value) table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-18">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={String(pageSize)}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="icon-sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="mono px-2 text-[13px] text-text-secondary">
                {t("pageOf", {
                  page: table.getState().pagination.pageIndex + 1,
                  pages: Math.max(table.getPageCount(), 1),
                })}
              </span>
              <Button
                variant="secondary"
                size="icon-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon-sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {deleteId && interviewToDelete && (
        <DeleteConfirmDialog
          companyName={interviewToDelete.companyName}
          onConfirm={() => {
            onDelete(deleteId);
            setDeleteId(null);
          }}
          onCancel={() => setDeleteId(null)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
