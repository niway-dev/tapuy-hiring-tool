import { Component, computed, input, output } from "@angular/core";
import type { Interaction } from "../../../../core/api/interaction.model";
import { EmptyState } from "../../../../shared/ui/empty-state";
import { injectInteractionList } from "../../interaction.queries";
import { InteractionCard } from "./interaction-card";

/* Only `offer` and `rejection` nodes carry colour; every other node is muted —
   the same rule the React timeline uses. */
function nodeClass(type: Interaction["type"]): string {
  if (type === "offer") return "bg-fuchsia";
  if (type === "rejection") return "bg-danger";
  return "bg-text-muted";
}

@Component({
  selector: "app-interaction-timeline",
  imports: [InteractionCard, EmptyState],
  template: `
    @if (query.isPending()) {
      <div class="relative pl-8">
        <div class="absolute bottom-2 left-[7px] top-2 w-px bg-border-strong"></div>
        @for (row of skeletonRows; track row) {
          <article class="relative mb-5">
            <div class="absolute -left-[28px] top-4 size-2 rounded-full bg-surface-2"></div>
            <div class="rounded-xl border border-border bg-surface px-5 py-[18px]">
              <div class="mb-3 flex items-center gap-2.5">
                <div class="h-[22px] w-16 animate-pulse rounded bg-surface-2"></div>
                <div class="h-3 w-36 animate-pulse rounded bg-surface-2"></div>
              </div>
              <div class="mb-2 h-4 w-48 animate-pulse rounded bg-surface-2"></div>
              <div class="h-16 w-full animate-pulse rounded bg-surface-2"></div>
            </div>
          </article>
        }
      </div>
    } @else if (query.isError()) {
      <app-empty-state title="Could not load interactions" [message]="query.error().message">
        <button type="button" class="btn btn-secondary" (click)="query.refetch()">Retry</button>
      </app-empty-state>
    } @else if (interactions().length === 0) {
      <app-empty-state
        title="No interactions logged yet"
        message="Log what just happened and it will show up here."
      />
    } @else {
      <div class="relative pl-8">
        <div class="absolute bottom-2 left-[7px] top-2 w-px bg-border-strong"></div>
        @for (interaction of interactions(); track interaction.id) {
          <article class="relative mb-5">
            <div
              class="absolute -left-[28px] top-4 size-2 rounded-full"
              [class]="nodeClass(interaction.type)"
            ></div>
            <app-interaction-card
              [interaction]="interaction"
              (edit)="edit.emit($event)"
              (remove)="remove.emit($event)"
            />
          </article>
        }
      </div>
    }
  `,
})
export class InteractionTimeline {
  readonly hiringProcessId = input.required<string>();
  readonly edit = output<Interaction>();
  readonly remove = output<Interaction>();

  protected readonly skeletonRows = [0, 1, 2];
  protected readonly nodeClass = nodeClass;

  protected readonly query = injectInteractionList(() => this.hiringProcessId());

  /* Newest first. The API returns insertion order, and the timeline reads
     top-down as "most recent thing that happened". */
  protected readonly interactions = computed(() =>
    [...(this.query.data() ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );
}
