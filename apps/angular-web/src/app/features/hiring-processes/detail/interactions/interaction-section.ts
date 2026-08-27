import { Component, computed, input, output, viewChild } from "@angular/core";
import type { UpdateInteraction } from "@interviews-tool/domain/schemas";
import {
  injectCreateInteraction,
  injectDeleteInteraction,
  injectInteractionList,
  injectUpdateInteraction,
} from "../../interaction.queries";
import { DeleteInteractionDialog } from "./delete-interaction-dialog";
import { EditInteractionDialog } from "./edit-interaction-dialog";
import { InteractionTimeline } from "./interaction-timeline";
import { QuickCapture } from "./quick-capture";

@Component({
  selector: "app-interaction-section",
  imports: [QuickCapture, InteractionTimeline, EditInteractionDialog, DeleteInteractionDialog],
  template: `
    <div class="mb-5 mt-11 flex items-baseline justify-between gap-4">
      <h2 class="text-2xl font-medium text-text">Interactions</h2>
      <span class="font-mono text-[13px] text-text-muted">{{ count() }} logged</span>
    </div>

    @if (timelineActionError(); as message) {
      <p class="field-error mb-4" role="alert">{{ message }}</p>
    }

    <app-quick-capture
      [pending]="create.isPending()"
      [serverError]="create.error()?.message ?? null"
      (log)="onLog($event)"
    />

    <app-interaction-timeline
      [hiringProcessId]="hiringProcessId()"
      (edit)="editDialog().open($event)"
      (remove)="deleteDialog().open($event)"
    />

    <app-edit-interaction-dialog (save)="onSave($event)" />
    <app-delete-interaction-dialog (confirm)="onDelete($event)" />
  `,
})
export class InteractionSection {
  readonly hiringProcessId = input.required<string>();
  /** Fires after any successful mutation so the detail page can refresh Last updated. */
  readonly changed = output<void>();

  protected readonly editDialog = viewChild.required(EditInteractionDialog);
  protected readonly deleteDialog = viewChild.required(DeleteInteractionDialog);

  /* The count comes from the interactions query, not from the detail record:
     the list is the source of truth and updates the moment a mutation settles.
     Calling injectInteractionList here as well as inside the timeline is
     deliberate and costs nothing: TanStack dedupes by query key, so the two
     are readers of one cache entry, not two requests. */
  private readonly list = injectInteractionList(() => this.hiringProcessId());
  protected readonly count = computed(() => this.list.data()?.length ?? 0);

  protected readonly create = injectCreateInteraction();
  protected readonly update = injectUpdateInteraction();
  protected readonly remove = injectDeleteInteraction();

  /* Edit and delete are triggered from dialogs that close before their request
     settles, so their failures have nowhere to land unless the section shows
     them itself. Keeping them out of the composer's slot stops a failed edit
     from reading as a failed note. */
  protected readonly timelineActionError = computed(
    () => this.update.error()?.message ?? this.remove.error()?.message ?? null,
  );

  /* Only the action just taken may show an error, and a mutation that is still
     in flight keeps its observer so its onSuccess still fires. Same rule as the
     detail page's resetActionErrors. */
  private resetActionErrors(): void {
    if (!this.create.isPending()) this.create.reset();
    if (!this.update.isPending()) this.update.reset();
    if (!this.remove.isPending()) this.remove.reset();
  }

  protected onLog(content: string): void {
    this.resetActionErrors();
    this.create.mutate(
      { hiringProcessId: this.hiringProcessId(), body: { content, type: "note" } },
      { onSuccess: () => this.changed.emit() },
    );
  }

  protected onSave(event: { interactionId: string; body: UpdateInteraction }): void {
    this.resetActionErrors();
    this.update.mutate(
      {
        hiringProcessId: this.hiringProcessId(),
        interactionId: event.interactionId,
        body: event.body,
      },
      { onSuccess: () => this.changed.emit() },
    );
  }

  protected onDelete(interactionId: string): void {
    this.resetActionErrors();
    this.remove.mutate(
      { hiringProcessId: this.hiringProcessId(), interactionId },
      { onSuccess: () => this.changed.emit() },
    );
  }
}
