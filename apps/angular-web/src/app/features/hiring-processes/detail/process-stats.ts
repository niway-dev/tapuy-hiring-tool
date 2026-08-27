import { Component, input } from "@angular/core";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
import { AbsoluteDatePipe } from "../../../shared/pipes/absolute-date.pipe";
import { MoneyPipe } from "../../../shared/pipes/money.pipe";

/* The four-stat row under the header, matching apps/web: two columns on small
   screens, four from lg. Mono type throughout — these are figures, not prose. */
@Component({
  selector: "app-process-stats",
  imports: [MoneyPipe, AbsoluteDatePipe],
  template: `
    <div class="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-6 lg:grid-cols-4">
      <div>
        <p class="mb-1.5 text-[11px] font-medium tracking-[0.04em] text-text-muted">Salary</p>
        @if (process().salary !== null) {
          <p class="font-mono text-2xl text-text">
            {{ process().salary | money: process().currency }}
          </p>
          <p class="mt-0.5 font-mono text-xs text-text-secondary">
            {{ process().salaryRateType }} · {{ process().currency }}
          </p>
        } @else {
          <p class="font-mono text-2xl text-text-muted">—</p>
        }
      </div>

      <div>
        <p class="mb-1.5 text-[11px] font-medium tracking-[0.04em] text-text-muted">Interactions</p>
        <p class="font-mono text-2xl text-text">{{ interactionCount() }}</p>
        <p class="mt-0.5 font-mono text-xs text-text-secondary">logged</p>
      </div>

      <div>
        <p class="mb-1.5 text-[11px] font-medium tracking-[0.04em] text-text-muted">Created</p>
        <p class="font-mono text-[13px] leading-relaxed text-text-secondary">
          {{ process().createdAt | absoluteDate: "date" }}<br />
          {{ process().createdAt | absoluteDate: "time" }}
        </p>
      </div>

      <div>
        <p class="mb-1.5 text-[11px] font-medium tracking-[0.04em] text-text-muted">Last updated</p>
        <p class="font-mono text-[13px] leading-relaxed text-text-secondary">
          {{ process().updatedAt | absoluteDate: "date" }}<br />
          {{ process().updatedAt | absoluteDate: "time" }}
        </p>
      </div>
    </div>
  `,
})
export class ProcessStats {
  readonly process = input.required<HiringProcess>();
  readonly interactionCount = input.required<number>();
}
