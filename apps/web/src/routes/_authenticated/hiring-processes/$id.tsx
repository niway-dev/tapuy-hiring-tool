import { useEffect, useState } from "react";
import { createFileRoute, Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useHotkey } from "@tanstack/react-hotkeys";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Skeleton,
  StatusBadge,
  cn,
} from "@interviews-tool/web-ui";
import { useFormatter, useTranslations } from "@interviews-tool/i18n";
import { CURRENCY_INFO, SALARY_RATE_TYPES } from "@interviews-tool/domain/constants";
import type { Currency, SalaryRateType } from "@interviews-tool/domain/constants";

import { DeleteConfirmDialog } from "@/components/hiring-process/delete-confirm-dialog";
import { ArchiveDialog } from "@/components/hiring-process/archive-dialog";
import { InteractionTimeline } from "@/components/interaction/interaction-timeline";
import { InteractionForm } from "@/components/interaction/interaction-form";
import { EditInteractionDialog } from "@/components/interaction/edit-interaction-dialog";
import { DeleteInteractionDialog } from "@/components/interaction/delete-interaction-dialog";
import { LiveNote } from "@/components/interaction/live-note";
import { QuestionsPanel } from "@/components/interaction/questions-panel";
import { useHiringProcess, useDeleteHiringProcess } from "@/hooks/use-hiring-processes";
import {
  useArchiveHiringProcess,
  useRestoreHiringProcess,
} from "@/hooks/use-archive-hiring-process";
import { isStaleProcess, type ArchiveReason } from "@interviews-tool/domain/constants";
import { useCompanyDetails } from "@/hooks/use-company-details";
import { useCreateInteraction, useInteractions, type Interaction } from "@/hooks/use-interactions";
import { useStatusLabel } from "@/lib/i18n-labels";
import { useInteractionDraft } from "@/lib/interaction-draft";
import { formatClock } from "@/lib/capture";

export const Route = createFileRoute("/_authenticated/hiring-processes/$id")({
  component: HiringProcessDetailPage,
  validateSearch: (search: Record<string, unknown>): { live?: boolean } => ({
    live: search.live === true || search.live === "true" ? true : undefined,
  }),
});

const STICKY_THRESHOLD = 240;

function useStickyHeader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > STICKY_THRESHOLD;
      setVisible((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return visible;
}

function useSalaryParts() {
  const t = useTranslations("processForm");
  const format = useFormatter();

  return (salary: number | null, currency: Currency, rateType?: SalaryRateType | null) => {
    if (!salary) return null;
    const symbol = CURRENCY_INFO[currency]?.symbol ?? "$";
    const rate =
      rateType === SALARY_RATE_TYPES.HOURLY
        ? { long: t("perHour"), short: t("perHourShort") }
        : { long: t("perMonth"), short: t("perMonthShort") };
    return { amount: `${symbol}${format.number(salary)}`, rate, currency };
  };
}

function HiringProcessDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const t = useTranslations("process");
  const format = useFormatter();
  const statusLabel = useStatusLabel();
  const salaryParts = useSalaryParts();

  const { data: hiringProcess, isLoading, error, refetch } = useHiringProcess(id);
  const { data: companyDetailsData } = useCompanyDetails(id);
  const { data: interactionsData } = useInteractions(id);
  const deleteMutation = useDeleteHiringProcess();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const archiveMutation = useArchiveHiringProcess();
  const restoreMutation = useRestoreHiringProcess();
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);
  const [deletingInteractionId, setDeletingInteractionId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showStickyHeader = useStickyHeader();

  const tCapture = useTranslations("capture");
  const tDashboard = useTranslations("dashboard");
  const tInteraction = useTranslations("interaction");
  const { live } = Route.useSearch();
  const draft = useInteractionDraft(id);
  const [liveOpen, setLiveOpen] = useState(!!live);
  const [quickText, setQuickText] = useState("");
  const createInteraction = useCreateInteraction();

  const closeLive = () => {
    setLiveOpen(false);
    if (live) {
      navigate({ to: ".", search: {}, replace: true });
    }
  };

  /* L opens live mode from anywhere on the page. A bare key (Linear-style)
     because browsers reserve ⌘L for the address bar; ignoreInputs defaults
     to true for single keys, so typing in the notepad never triggers it. */
  useHotkey("L", () => setLiveOpen(true));

  /* The API order is not guaranteed: sort newest-first once and pass the
     sorted array everywhere (carry-over dates, earlier notes). */
  const interactions = [...(interactionsData?.data ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const interactionCount = interactions.length;
  const hasUnsavedNote = draft.content.trim().length > 0;

  /* Leave guards — spec §5. Router navigations go through useBlocker (keeps
     router state and query cache intact); beforeunload covers browser-level
     exits. The draft survives either way, the dialog just says so. */
  useEffect(() => {
    if (!hasUnsavedNote) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedNote]);

  const blocker = useBlocker({
    /* Same-route search changes (e.g. clearing ?live on close) must not block */
    shouldBlockFn: ({ current, next }) => hasUnsavedNote && current.pathname !== next.pathname,
    withResolver: true,
  });

  const handleQuickCapture = async () => {
    const text = quickText.trim();
    if (!text) return;
    try {
      await createInteraction.mutateAsync({
        hiringProcessId: id,
        data: { content: `**${formatClock()}** ${text}`, type: "note" },
      });
      toast.success(tInteraction("savedToast"));
      setQuickText("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t("deletedToast"));
      navigate({ to: "/hiring-processes" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = (reason: ArchiveReason) => {
    setShowArchiveDialog(false);
    archiveMutation.mutate(
      { id, reason },
      {
        onSuccess: () =>
          toast.success(
            tDashboard("archivedToast", { company: hiringProcess?.companyName ?? "" }),
            {
              duration: 5000,
              action: {
                label: tDashboard("undo"),
                onClick: () => restoreMutation.mutate({ id }),
              },
            },
          ),
        onError: () => toast.error(tDashboard("archiveError")),
      },
    );
  };

  const handleRestore = () => {
    /* Kept so Undo can re-archive with the reason it originally had */
    const previousReason = hiringProcess?.archiveReason ?? "no-reply";
    restoreMutation.mutate(
      { id },
      {
        onSuccess: () =>
          toast.success(
            tDashboard("restoredToast", { company: hiringProcess?.companyName ?? "" }),
            {
              duration: 5000,
              action: {
                label: tDashboard("undo"),
                onClick: () => archiveMutation.mutate({ id, reason: previousReason }),
              },
            },
          ),
        onError: () => toast.error(tDashboard("restoreError")),
      },
    );
  };

  if (error) {
    return (
      <main className="mx-auto max-w-[1200px] px-8 pb-24 pt-7">
        <BackLink />
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-base font-medium text-text">{t("loadErrorTitle")}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t("loadErrorBody")}</p>
          <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
            {t("retry")}
          </Button>
        </div>
      </main>
    );
  }

  if (!isLoading && !hiringProcess) {
    return (
      <main className="mx-auto max-w-[1200px] px-8 pb-24 pt-7">
        <BackLink />
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-base font-medium text-text">{t("notFoundTitle")}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t("notFoundBody")}</p>
          <Link to="/hiring-processes" className="mt-4 inline-block">
            <Button variant="secondary">{t("backToProcesses")}</Button>
          </Link>
        </div>
      </main>
    );
  }

  const salary = hiringProcess
    ? salaryParts(
        hiringProcess.salary,
        hiringProcess.currency,
        hiringProcess.salaryRateType as SalaryRateType | undefined,
      )
    : null;

  const companyDetails = companyDetailsData?.data;
  const detailFields = companyDetails
    ? ([
        ["website", companyDetails.website],
        ["location", companyDetails.location],
        ["contactedVia", companyDetails.contactedVia],
        ["contactPerson", companyDetails.contactPerson],
        ["interviewSteps", companyDetails.interviewSteps],
        ["benefits", companyDetails.benefits],
      ] as const)
    : [];
  const hasDetails = detailFields.some(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  return (
    <>
      {/* Sticky contextual header */}
      {hiringProcess && (
        <div
          className={cn(
            "fixed inset-x-0 top-0 z-40 h-[52px] border-b border-border bg-bg/80 backdrop-blur-[12px] transition-all duration-200",
            showStickyHeader
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-full opacity-0",
          )}
        >
          <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-4 px-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="truncate text-sm font-medium text-text">
                {hiringProcess.companyName}
              </span>
              {hiringProcess.jobTitle && (
                <span className="truncate text-[13px] text-text-secondary">
                  {hiringProcess.jobTitle}
                </span>
              )}
              <StatusBadge
                status={hiringProcess.status}
                label={statusLabel(hiringProcess.status)}
              />
              {salary && (
                <span className="mono hidden text-[13px] text-text-secondary md:inline">
                  {salary.amount} {salary.rate.short} · {salary.currency}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="secondary"
                className="h-[30px] gap-2 px-2.5 text-[13px]"
                onClick={() => setLiveOpen(true)}
              >
                <span className="size-1.5 rounded-full bg-mint" />
                {tCapture("liveNote")}
              </Button>
              <Link to="/hiring-processes/$id/edit" params={{ id }}>
                <Button variant="ghost" className="h-[30px] px-2.5 text-[13px]">
                  {t("edit")}
                </Button>
              </Link>
              {hiringProcess.archivedAt ? (
                <Button
                  variant="ghost"
                  className="h-[30px] px-2.5 text-[13px]"
                  disabled={restoreMutation.isPending}
                  onClick={handleRestore}
                >
                  {tDashboard("restore")}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="h-[30px] px-2.5 text-[13px]"
                  onClick={() => setShowArchiveDialog(true)}
                >
                  {tDashboard("archive")}
                </Button>
              )}
              <Button
                variant="ghost"
                className="h-[30px] px-2.5 text-[13px] hover:bg-danger/10 hover:text-danger"
                onClick={() => setShowDeleteDialog(true)}
              >
                {t("delete")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1200px] px-8 pb-24 pt-7">
        <BackLink />

        {/* Process card */}
        {isLoading || !hiringProcess ? (
          <ProcessCardSkeleton />
        ) : (
          <section className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[32px] font-medium leading-tight tracking-[-0.01em] text-text">
                  {hiringProcess.companyName}
                </h1>
                {hiringProcess.jobTitle && (
                  <p className="mt-1 text-sm text-text-secondary">{hiringProcess.jobTitle}</p>
                )}
                <div className="mt-3">
                  <StatusBadge
                    status={hiringProcess.status}
                    label={statusLabel(hiringProcess.status)}
                  />
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Link to="/hiring-processes/$id/edit" params={{ id }}>
                  <Button variant="ghost" className="h-8">
                    {t("edit")}
                  </Button>
                </Link>
                {hiringProcess.archivedAt ? (
                  <Button
                    variant="ghost"
                    className="h-8"
                    disabled={restoreMutation.isPending}
                    onClick={handleRestore}
                  >
                    {tDashboard("restore")}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="h-8"
                    onClick={() => setShowArchiveDialog(true)}
                  >
                    {tDashboard("archive")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="h-8 hover:bg-danger/10 hover:text-danger"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  {t("delete")}
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-6 lg:grid-cols-4">
              <div>
                <FieldLabel>{t("salary")}</FieldLabel>
                {salary ? (
                  <>
                    <p className="mono text-2xl text-text">{salary.amount}</p>
                    <p className="mono mt-0.5 text-xs text-text-secondary">
                      {salary.rate.long} · {salary.currency}
                    </p>
                  </>
                ) : (
                  <p className="mono text-2xl text-text-muted">—</p>
                )}
              </div>
              <div>
                <FieldLabel>{t("interactions")}</FieldLabel>
                <p className="mono text-2xl text-text">{format.number(interactionCount)}</p>
                <p className="mono mt-0.5 text-xs text-text-secondary">{t("logged")}</p>
              </div>
              <DateField label={t("created")} date={hiringProcess.createdAt} />
              <DateField label={t("lastUpdated")} date={hiringProcess.updatedAt} />
            </div>

            {hasDetails && (
              <div className="mt-4 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setDetailsOpen((open) => !open)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-sm font-medium text-text">{t("companyDetails")}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-text-muted transition-transform",
                      detailsOpen && "rotate-180",
                    )}
                  />
                </button>
                {detailsOpen && companyDetails && (
                  <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    {companyDetails.website && (
                      <div>
                        <FieldLabel>{t("website")}</FieldLabel>
                        <a
                          href={
                            companyDetails.website.startsWith("http")
                              ? companyDetails.website
                              : `https://${companyDetails.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-mint hover:underline"
                        >
                          {companyDetails.website}
                        </a>
                      </div>
                    )}
                    {companyDetails.location && (
                      <div>
                        <FieldLabel>{t("location")}</FieldLabel>
                        <p className="text-sm text-text">{companyDetails.location}</p>
                      </div>
                    )}
                    {companyDetails.contactedVia && (
                      <div>
                        <FieldLabel>{t("contactedVia")}</FieldLabel>
                        <p className="text-sm text-text">{companyDetails.contactedVia}</p>
                      </div>
                    )}
                    {companyDetails.contactPerson && (
                      <div>
                        <FieldLabel>{t("contactPerson")}</FieldLabel>
                        <p className="text-sm text-text">{companyDetails.contactPerson}</p>
                      </div>
                    )}
                    {companyDetails.interviewSteps !== null &&
                      companyDetails.interviewSteps !== undefined && (
                        <div>
                          <FieldLabel>{t("interviewSteps")}</FieldLabel>
                          <p className="mono text-sm text-text">{companyDetails.interviewSteps}</p>
                        </div>
                      )}
                    {companyDetails.benefits && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <FieldLabel>{t("benefits")}</FieldLabel>
                        <p className="whitespace-pre-wrap text-sm text-text">
                          {companyDetails.benefits}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Interactions */}
        <div className="mb-5 mt-11 flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-medium text-text">{t("interactions")}</h2>
          <span className="mono text-[13px] text-text-muted">
            {format.number(interactionCount)} {t("logged")}
          </span>
        </div>
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[440px_1fr]">
          <div className="space-y-6 lg:sticky lg:top-20">
            {/* Live-note CTA — the fast path when the call is happening now */}
            <section className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2.5">
                <span className="size-[7px] rounded-full bg-fuchsia" />
                <h3 className="text-base font-medium text-text">{tCapture("inCallTitle")}</h3>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-text-secondary">
                {tCapture("inCallBody")}
              </p>
              <Button className="mt-4 w-full gap-2.5" onClick={() => setLiveOpen(true)}>
                {tCapture("startLiveNote")}
                <kbd className="mono rounded border border-mint-on/30 px-1.5 text-xs font-normal opacity-70">
                  L
                </kbd>
              </Button>
            </section>
            <InteractionForm hiringProcessId={id} draft={draft} />
            <QuestionsPanel
              processId={id}
              lastInteractionAt={interactions[0]?.createdAt ?? null}
              variant="column"
            />
          </div>
          <div className="min-w-0">
            {/* Quick capture — spec §6: Enter logs a time-stamped note */}
            <div className="mb-6 flex gap-2">
              <Input
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickCapture();
                  }
                }}
                placeholder={tCapture("quickCapturePlaceholder")}
                className="h-10 flex-1"
              />
              <Button
                variant="secondary"
                className="h-10"
                onClick={handleQuickCapture}
                disabled={createInteraction.isPending}
              >
                {tCapture("log")}
              </Button>
            </div>
            <InteractionTimeline
              hiringProcessId={id}
              onEdit={(interaction) => setEditingInteraction(interaction)}
              onDelete={(interaction) => setDeletingInteractionId(interaction.id)}
            />
          </div>
        </div>
      </main>

      {showArchiveDialog && hiringProcess && (
        <ArchiveDialog
          companyName={hiringProcess.companyName}
          isStale={isStaleProcess(
            {
              status: hiringProcess.status,
              updatedAt: new Date(hiringProcess.updatedAt),
              archivedAt: hiringProcess.archivedAt,
            },
            new Date(),
          )}
          isArchiving={archiveMutation.isPending}
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveDialog(false)}
        />
      )}

      {showDeleteDialog && hiringProcess && (
        <DeleteConfirmDialog
          companyName={hiringProcess.companyName}
          interactionCount={interactionCount}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {editingInteraction && (
        <EditInteractionDialog
          interaction={editingInteraction}
          hiringProcessId={id}
          open={!!editingInteraction}
          onOpenChange={(open) => !open && setEditingInteraction(null)}
        />
      )}

      {deletingInteractionId && (
        <DeleteInteractionDialog
          interactionId={deletingInteractionId}
          hiringProcessId={id}
          open={!!deletingInteractionId}
          onOpenChange={(open) => !open && setDeletingInteractionId(null)}
        />
      )}

      {/* Live mode overlay */}
      {liveOpen && hiringProcess && (
        <LiveNote
          processId={id}
          companyName={hiringProcess.companyName}
          jobTitle={hiringProcess.jobTitle}
          status={hiringProcess.status}
          statusLabel={statusLabel(hiringProcess.status)}
          salaryText={salary ? `${salary.amount} ${salary.rate.short} · ${salary.currency}` : null}
          interactions={interactions}
          draft={draft}
          onClose={closeLive}
        />
      )}

      {/* Leave guard — the draft survives on this device either way */}
      {blocker.status === "blocked" && (
        <AlertDialog open onOpenChange={(open) => !open && blocker.reset()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-medium">
                {tCapture("unsavedTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>{tCapture("unsavedBody")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => blocker.reset()}>
                {tCapture("keepWriting")}
              </AlertDialogCancel>
              <AlertDialogAction variant="secondary" onClick={() => blocker.proceed()}>
                {tCapture("leaveAnyway")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

function BackLink() {
  const t = useTranslations("process");
  return (
    <Link
      to="/hiring-processes"
      className="mb-6 inline-flex items-center gap-2 text-[13px] text-text-secondary transition-colors hover:text-text"
    >
      <ArrowLeft className="size-3.5" />
      {t("backToProcesses")}
    </Link>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-medium tracking-[0.04em] text-text-muted">{children}</p>
  );
}

function DateField({ label, date }: { label: string; date: Date }) {
  const format = useFormatter();
  const value = new Date(date);
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p className="mono text-[13px] leading-relaxed text-text-secondary">
        {format.dateTime(value, { month: "short", day: "numeric", year: "numeric" })}
        <br />
        {format.dateTime(value, { hour: "numeric", minute: "2-digit" })}
      </p>
    </div>
  );
}

function ProcessCardSkeleton() {
  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <Skeleton className="h-8 w-64 bg-surface-2" />
      <Skeleton className="mt-2 h-4 w-40 bg-surface-2" />
      <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-16 bg-surface-2" />
            <Skeleton className="mt-2 h-7 w-24 bg-surface-2" />
          </div>
        ))}
      </div>
    </section>
  );
}
