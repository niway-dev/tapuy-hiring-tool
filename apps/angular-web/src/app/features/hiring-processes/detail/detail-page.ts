import { Component, computed, inject, input, viewChild } from "@angular/core";
import { httpResource } from "@angular/common/http";
import { Router, RouterLink } from "@angular/router";
import {
  HIRING_PROCESS_STATUS_INFO,
  STATUS_TRANSITIONS,
  type ArchiveReason,
  type HiringProcessStatus,
} from "@interviews-tool/domain/constants";
import type { ApiResponse } from "@interviews-tool/domain/types";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
import { ApiError } from "../../../core/http/api-error";
import { AbsoluteDatePipe } from "../../../shared/pipes/absolute-date.pipe";
import { EmptyState } from "../../../shared/ui/empty-state";
import { Spinner } from "../../../shared/ui/spinner";
import { StatusBadge } from "../../../shared/ui/status-badge";
import {
  injectArchiveHiringProcess,
  injectChangeHiringProcessStatus,
  injectDeleteHiringProcess,
  injectRestoreHiringProcess,
} from "../hiring-process.queries";
import { injectInteractionList } from "../interaction.queries";
import { ArchiveDialog } from "./archive-dialog";
import { InteractionSection } from "./interactions/interaction-section";
import { ProcessStats } from "./process-stats";

@Component({
  selector: "app-detail-page",
  imports: [
    RouterLink,
    StatusBadge,
    EmptyState,
    Spinner,
    AbsoluteDatePipe,
    ArchiveDialog,
    ProcessStats,
    InteractionSection,
  ],
  template: `
    <!-- Guarded with !process.hasValue(): resource.isLoading() is also true during a
         reload (status 'reloading'), and every action here calls process.reload(), so
         gating on isLoading() alone would tear down the whole loaded view — heading,
         actions, status card, error message, dialog — into a spinner on every action.
         Only show the spinner when there is truly nothing loaded yet. -->
    @if (process.isLoading() && !process.hasValue()) {
      <div class="flex justify-center py-10"><app-spinner /></div>
    } @else if (process.error(); as error) {
      <app-empty-state
        [title]="isNotFound(error) ? 'Hiring process not found' : 'Could not load this process'"
        [message]="isNotFound(error) ? 'It may have been deleted.' : errorMessage(error)"
      >
        <a routerLink="/hiring-processes" class="btn btn-secondary">Back to list</a>
        @if (!isNotFound(error)) {
          <button type="button" class="btn btn-primary" (click)="process.reload()">Retry</button>
        }
      </app-empty-state>
    } @else if (process.hasValue()) {
      <a routerLink="/hiring-processes" class="text-xs text-text-muted hover:underline">
        ← Back to processes
      </a>

      <section class="mt-4 rounded-xl border border-border bg-surface p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-[32px] font-medium leading-tight tracking-[-0.01em] text-text">
              {{ process.value().companyName }}
            </h1>
            @if (process.value().jobTitle; as jobTitle) {
              <p class="mt-1 text-sm text-text-secondary">{{ jobTitle }}</p>
            }
            <div class="mt-3">
              <app-status-badge [status]="process.value().status" />
            </div>
          </div>
          <div class="flex shrink-0 gap-1">
            <a [routerLink]="['/hiring-processes', id(), 'edit']" class="btn btn-secondary h-8">Edit</a>
            @if (process.value().archivedAt) {
              <button type="button" class="btn btn-secondary h-8" [disabled]="restore.isPending()" (click)="onRestore()">
                Restore
              </button>
            } @else {
              <button type="button" class="btn btn-secondary h-8" (click)="archiveDialog().open()">
                Archive
              </button>
            }
            <button type="button" class="btn btn-danger h-8" [disabled]="remove.isPending()" (click)="onDelete()">
              Delete
            </button>
          </div>
        </div>

        <app-process-stats [process]="process.value()" [interactionCount]="interactionCount()" />

        <div class="mt-6 flex items-center gap-3 border-t border-border pt-6">
          @if (nextStatuses().length > 0) {
            <select
              id="next-status"
              class="input max-w-48"
              aria-label="Move this process to another status"
              [disabled]="changeStatus.isPending()"
              (change)="onStatusChange($event)"
            >
              <option value="">Move to…</option>
              @for (s of nextStatuses(); track s) {
                <option [value]="s" [selected]="false">{{ statusInfo[s].label }}</option>
              }
            </select>
          }
          @if (process.value().archivedAt; as archivedAt) {
            <p class="text-xs text-text-muted">
              Archived {{ archivedAt | absoluteDate: "date" }} · {{ process.value().archiveReason }}
            </p>
          }
        </div>

        @if (actionError(); as message) {
          <p class="field-error mt-3" role="alert">{{ message }}</p>
        }
      </section>

      <app-interaction-section [hiringProcessId]="id()" />

      <app-archive-dialog (confirm)="onArchive($event)" />
    }
  `,
})
export class DetailPage {
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  /**
   * Angular-native alternative to TanStack Query, kept here on purpose so the two
   * can be compared: no shared cache, so mutations call `reload()` explicitly.
   */
  protected readonly process = httpResource<HiringProcess>(
    () => `/api/v1/hiring-processes/${this.id()}`,
    {
      parse: (raw) => (raw as ApiResponse<HiringProcess>).data as HiringProcess,
    },
  );

  protected readonly archiveDialog = viewChild.required(ArchiveDialog);
  protected readonly statusInfo = HIRING_PROCESS_STATUS_INFO;

  /* The stats row shows the same count the section's heading does; both read the
     one cached interactions query, so this is a second reader, not a second fetch. */
  private readonly interactions = injectInteractionList(() => this.id());
  protected readonly interactionCount = computed(() => this.interactions.data()?.length ?? 0);

  protected readonly changeStatus = injectChangeHiringProcessStatus();
  protected readonly archive = injectArchiveHiringProcess();
  protected readonly restore = injectRestoreHiringProcess();
  protected readonly remove = injectDeleteHiringProcess();

  protected readonly nextStatuses = computed<readonly HiringProcessStatus[]>(() =>
    this.process.hasValue() ? STATUS_TRANSITIONS[this.process.value().status] : [],
  );

  protected readonly actionError = computed(
    () =>
      this.changeStatus.error()?.message ??
      this.archive.error()?.message ??
      this.restore.error()?.message ??
      this.remove.error()?.message ??
      null,
  );

  protected isNotFound(error: unknown): boolean {
    return error instanceof ApiError && error.isNotFound;
  }

  protected errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }

  /**
   * Only the action the user just took may show an error: TanStack clears a
   * mutation's error when that same mutation reruns, never when a sibling
   * succeeds, so a stale message would otherwise outlive the failure.
   * Pending mutations are skipped: reset() detaches the observer from an
   * in-flight mutation, which would drop its onSuccess/onSettled callback
   * (e.g. a delete's navigation) when the response finally arrives.
   */
  private resetActionErrors(): void {
    if (!this.changeStatus.isPending()) this.changeStatus.reset();
    if (!this.archive.isPending()) this.archive.reset();
    if (!this.restore.isPending()) this.restore.reset();
    if (!this.remove.isPending()) this.remove.reset();
  }

  protected onStatusChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const status = select.value as HiringProcessStatus | "";
    if (!status) return;
    this.resetActionErrors();
    this.changeStatus.mutate(
      { id: this.id(), status },
      {
        onSettled: () => {
          select.value = "";
          this.process.reload();
        },
      },
    );
  }

  protected onArchive(reason: ArchiveReason): void {
    this.resetActionErrors();
    this.archive.mutate({ id: this.id(), reason }, { onSuccess: () => this.process.reload() });
  }

  protected onRestore(): void {
    this.resetActionErrors();
    this.restore.mutate(this.id(), { onSuccess: () => this.process.reload() });
  }

  protected onDelete(): void {
    if (!window.confirm("Delete this hiring process? This cannot be undone.")) return;
    this.resetActionErrors();
    this.remove.mutate(this.id(), {
      onSuccess: () => void this.router.navigate(["/hiring-processes"]),
    });
  }
}
