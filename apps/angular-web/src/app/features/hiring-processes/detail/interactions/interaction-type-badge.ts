import { Component, computed, input } from "@angular/core";
import { INTERACTION_TYPE_LABELS, type InteractionType } from "@interviews-tool/domain/constants";

@Component({
  selector: "app-interaction-type-badge",
  template: `
    @if (type(); as value) {
      <span class="badge-type" [attr.data-type]="value">{{ label() }}</span>
    }
  `,
})
export class InteractionTypeBadge {
  readonly type = input.required<InteractionType | null>();
  protected readonly label = computed(() => {
    const value = this.type();
    return value ? INTERACTION_TYPE_LABELS[value] : "";
  });
}
