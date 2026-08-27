import { Component, input, output } from "@angular/core";
import {
  HIRING_PROCESS_STATUS_INFO,
  HIRING_PROCESS_STATUS_ORDER,
  type HiringProcessStatus,
} from "@interviews-tool/domain/constants";

export interface ListFilterValues {
  status: HiringProcessStatus | null;
  salaryDeclared: boolean;
}

@Component({
  selector: "app-list-filters",
  template: `
    <div class="flex flex-wrap items-end gap-4">
      <div>
        <label class="label" for="status">Status</label>
        <!-- [selected] lives on each option, not [value] on the select: Angular emits
             the select's property instruction before the @for creates its options, so
             on first render [value] would be applied while only "All statuses" exists
             and the assignment gets discarded (and never re-applied afterwards). -->
        <select id="status" class="input min-w-44" (change)="onStatus($event)">
          <option value="" [selected]="!status()">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s" [selected]="s === status()">{{ info[s].label }}</option>
          }
        </select>
      </div>
      <label class="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" [checked]="salaryDeclared()" (change)="onSalary($event)" />
        Only with salary
      </label>
    </div>
  `,
})
export class ListFilters {
  readonly status = input<HiringProcessStatus | null>(null);
  readonly salaryDeclared = input(false);
  readonly filtersChange = output<ListFilterValues>();

  protected readonly statuses = HIRING_PROCESS_STATUS_ORDER;
  protected readonly info = HIRING_PROCESS_STATUS_INFO;

  protected onStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filtersChange.emit({
      status: value ? (value as HiringProcessStatus) : null,
      salaryDeclared: this.salaryDeclared(),
    });
  }

  protected onSalary(event: Event): void {
    this.filtersChange.emit({
      status: this.status(),
      salaryDeclared: (event.target as HTMLInputElement).checked,
    });
  }
}
