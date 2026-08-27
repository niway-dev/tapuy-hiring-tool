import { Component, input, output } from "@angular/core";
import type { Interaction } from "../../../../core/api/interaction.model";
import { AbsoluteDatePipe } from "../../../../shared/pipes/absolute-date.pipe";
import { MarkdownContent } from "../../../../shared/ui/markdown-content";
import { InteractionTypeBadge } from "./interaction-type-badge";

/* Content renders in full — the timeline is the product, not a teaser. */
@Component({
  selector: "app-interaction-card",
  imports: [InteractionTypeBadge, MarkdownContent, AbsoluteDatePipe],
  template: `
    <div class="rounded-xl border border-border bg-surface px-5 py-[18px]">
      <div class="mb-2 flex items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2.5">
          <app-interaction-type-badge [type]="interaction().type" />
          <span class="font-mono text-xs text-text-muted">
            {{ interaction().createdAt | absoluteDate }}
          </span>
        </div>
        <div class="flex shrink-0 gap-0.5">
          <button
            type="button"
            class="btn-icon"
            aria-label="Edit interaction"
            (click)="edit.emit(interaction())"
          >
            ✎
          </button>
          <button
            type="button"
            class="btn-icon"
            aria-label="Delete interaction"
            (click)="remove.emit(interaction())"
          >
            🗑
          </button>
        </div>
      </div>

      @if (interaction().title; as title) {
        <h4 class="mb-2.5 text-sm font-medium text-text">{{ title }}</h4>
      }

      <app-markdown [content]="interaction().content" />
    </div>
  `,
})
export class InteractionCard {
  readonly interaction = input.required<Interaction>();
  readonly edit = output<Interaction>();
  readonly remove = output<Interaction>();
}
