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
import { MoneyPipe } from "../../../shared/pipes/money.pipe";
import { RelativeDatePipe } from "../../../shared/pipes/relative-date.pipe";
import { EmptyState } from "../../../shared/ui/empty-state";
import { Spinner } from "../../../shared/ui/spinner";
import { StatusBadge } from "../../../shared/ui/status-badge";
import {
  injectArchiveHiringProcess,
  injectChangeHiringProcessStatus,
  injectDeleteHiringProcess,
  injectRestoreHiringProcess,
} from "../hiring-process.queries";
import { ArchiveDialog } from "./archive-dialog";

@Component({
  selector: "app-detail-page",
  imports: [
    RouterLink,
    StatusBadge,
    EmptyState,
    Spinner,
    MoneyPipe,
    RelativeDatePipe,
    ArchiveDialog,
  ],
  template: `
    @if (process.isLoading()) {
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
      <div class="mb-4 flex items-start justify-between gap-4">
        <div>
          <a routerLink="/hiring-processes" class="text-xs text-text-muted hover:underline">← All processes</a>
          <h1 class="mt-1 text-2xl font-semibold">{{ process.value().companyName }}</h1>
          <p class="text-text-secondary">{{ process.value().jobTitle || "No job title" }}</p>
        </div>
        <div class="flex gap-2">
          <a [routerLink]="['/hiring-processes', id(), 'edit']" class="btn btn-secondary">Edit</a>
          @if (process.value().archivedAt) {
            <button type="button" class="btn btn-primary" [disabled]="restore.isPending()" (click)="onRestore()">
              Restore
            </button>
          } @else {
            <button type="button" class="btn btn-secondary" (click)="archiveDialog().open()">Archive</button>
          }
          <button type="button" class="btn btn-danger" [disabled]="remove.isPending()" (click)="onDelete()">
            Delete
          </button>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <section class="card">
          <h2 class="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">Status</h2>
          <div class="flex items-center gap-3">
            <app-status-badge [status]="process.value().status" />
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
                  <option [value]="s">{{ statusInfo[s].label }}</option>
                }
              </select>
            }
          </div>
          @if (process.value().archivedAt) {
            <p class="mt-3 text-xs text-text-muted">
              Archived {{ process.value().archivedAt | relativeDate }} · {{ process.value().archiveReason }}
            </p>
          }
          @if (actionError(); as message) {
            <p class="field-error" role="alert">{{ message }}</p>
          }
        </section>

        <section class="card">
          <h2 class="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">Compensation</h2>
          <p class="font-mono text-lg">
            {{ process.value().salary | money: process.value().currency : process.value().salaryRateType }}
          </p>
          <p class="mt-3 text-xs text-text-muted">
            Created {{ process.value().createdAt | relativeDate }} · Updated {{ process.value().updatedAt | relativeDate }}
          </p>
        </section>
      </div>

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
   */
  private resetActionErrors(): void {
    this.changeStatus.reset();
    this.archive.reset();
    this.restore.reset();
    this.remove.reset();
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
