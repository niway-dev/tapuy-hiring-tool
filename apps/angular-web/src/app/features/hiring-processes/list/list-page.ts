import { Component, computed, inject, input } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import {
  isValidHiringProcessStatus,
  type HiringProcessStatus,
} from "@interviews-tool/domain/constants";
import type { HiringProcessListParams } from "../../../core/api/hiring-process.model";
import { EmptyState } from "../../../shared/ui/empty-state";
import { Spinner } from "../../../shared/ui/spinner";
import { injectHiringProcessList } from "../hiring-process.queries";
import { HiringProcessTable } from "./hiring-process-table";
import { ListFilters, type ListFilterValues } from "./list-filters";

const PAGE_SIZE = 10;

@Component({
  selector: "app-list-page",
  imports: [RouterLink, ListFilters, HiringProcessTable, EmptyState, Spinner],
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold">Hiring processes</h1>
      <a routerLink="/hiring-processes/new" class="btn btn-primary">New process</a>
    </div>

    <div class="mb-4">
      <app-list-filters
        [status]="statusFilter()"
        [salaryDeclared]="salaryDeclaredFilter()"
        (filtersChange)="applyFilters($event)"
      />
    </div>

    @if (query.isPending()) {
      <div class="flex justify-center py-10"><app-spinner /></div>
    } @else if (query.isError()) {
      <app-empty-state title="Could not load hiring processes" [message]="query.error().message">
        <button type="button" class="btn btn-secondary" (click)="query.refetch()">Retry</button>
      </app-empty-state>
    } @else if (query.data()!.items.length === 0) {
      <app-empty-state title="No hiring processes yet" message="Create your first one to start tracking.">
        <a routerLink="/hiring-processes/new" class="btn btn-primary">New process</a>
      </app-empty-state>
    } @else {
      <app-hiring-process-table [items]="query.data()!.items" />
      <div class="mt-4 flex items-center justify-between text-sm text-text-muted">
        <span>Page {{ pagination().page }} of {{ pagination().totalPages }} · {{ pagination().total }} total</span>
        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary" [disabled]="pagination().page <= 1" (click)="goToPage(pagination().page - 1)">
            Previous
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            [disabled]="pagination().page >= pagination().totalPages"
            (click)="goToPage(pagination().page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    }
  `,
})
export class ListPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Bound from the query string by withComponentInputBinding — always strings.
  readonly page = input<string>();
  readonly status = input<string>();
  readonly salaryDeclared = input<string>();

  protected readonly statusFilter = computed<HiringProcessStatus | null>(() => {
    const value = this.status();
    return value && isValidHiringProcessStatus(value) ? value : null;
  });
  protected readonly salaryDeclaredFilter = computed(() => this.salaryDeclared() === "true");
  private readonly pageNumber = computed(() => Math.max(1, Number(this.page()) || 1));

  private readonly params = computed<HiringProcessListParams>(() => {
    const status = this.statusFilter();
    return {
      page: this.pageNumber(),
      limit: PAGE_SIZE,
      statuses: status ? [status] : undefined,
      salaryDeclared: this.salaryDeclaredFilter() ? true : undefined,
    };
  });

  protected readonly query = injectHiringProcessList(() => this.params());
  protected readonly pagination = computed(
    () => this.query.data()?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 },
  );

  protected applyFilters(values: ListFilterValues): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: values.status,
        salaryDeclared: values.salaryDeclared ? "true" : null,
        page: null,
      },
      queryParamsHandling: "merge",
    });
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? String(page) : null },
      queryParamsHandling: "merge",
    });
  }
}
