import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
import { MoneyPipe } from "../../../shared/pipes/money.pipe";
import { RelativeDatePipe } from "../../../shared/pipes/relative-date.pipe";
import { StatusBadge } from "../../../shared/ui/status-badge";

@Component({
  selector: "app-hiring-process-table",
  imports: [RouterLink, StatusBadge, MoneyPipe, RelativeDatePipe],
  template: `
    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="text-left text-xs text-text-muted">
          <tr class="border-b border-border">
            <th class="px-4 py-2 font-medium">Company</th>
            <th class="px-4 py-2 font-medium">Role</th>
            <th class="px-4 py-2 font-medium">Status</th>
            <th class="px-4 py-2 font-medium">Salary</th>
            <th class="px-4 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.id) {
            <tr class="border-b border-border last:border-0 hover:bg-selected">
              <td class="px-4 py-2 font-medium">
                <a [routerLink]="['/hiring-processes', item.id]" class="hover:underline">
                  {{ item.companyName }}
                </a>
              </td>
              <td class="px-4 py-2 text-text-secondary">{{ item.jobTitle || "—" }}</td>
              <td class="px-4 py-2"><app-status-badge [status]="item.status" /></td>
              <td class="px-4 py-2 font-mono">{{ item.salary | money: item.currency : item.salaryRateType }}</td>
              <td class="px-4 py-2 text-text-muted">{{ item.updatedAt | relativeDate }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class HiringProcessTable {
  readonly items = input.required<HiringProcess[]>();
}
