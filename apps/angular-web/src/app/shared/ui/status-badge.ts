import { Component, computed, input } from "@angular/core";
import {
  HIRING_PROCESS_STATUS_INFO,
  type HiringProcessStatus,
} from "@interviews-tool/domain/constants";

@Component({
  selector: "app-status-badge",
  template: `<span class="badge" [attr.data-status]="status()">{{ label() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<HiringProcessStatus>();
  protected readonly label = computed(() => HIRING_PROCESS_STATUS_INFO[this.status()].label);
}
