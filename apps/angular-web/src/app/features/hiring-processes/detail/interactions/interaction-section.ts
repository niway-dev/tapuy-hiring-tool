import { Component, computed, input, viewChild } from "@angular/core";
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

    @if (deleteError(); as message) {
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

    <app-edit-interaction-dialog
      [pending]="update.isPending()"
      [serverError]="update.error()?.message ?? null"
      (save)="onSave($event)"
      (closed)="onEditDialogClosed()"
    />
    <app-delete-interaction-dialog (confirm)="onDelete($event)" />
  `,
})
export class InteractionSection {
  readonly hiringProcessId = input.required<string>();

  protected readonly composer = viewChild.required(QuickCapture);
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

  /* Delete has no dialog of its own to report into (the confirm dialog closes
     immediately, before the request settles), so its failure has nowhere to
     land unless the section shows it here. Update's failure renders inside
     EditInteractionDialog itself instead -- that dialog stays open on a
     failed save, and a page-level message painted underneath a native
     <dialog>'s top layer would be invisible to the user. */
  protected readonly deleteError = computed(() => this.remove.error()?.message ?? null);

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
      { onSuccess: () => this.composer().clear() },
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
      { onSuccess: () => this.editDialog().close() },
    );
  }

  protected onDelete(interactionId: string): void {
    this.resetActionErrors();
    this.remove.mutate({ hiringProcessId: this.hiringProcessId(), interactionId });
  }

  /* Cancel, Escape, or a successful save all end in the native dialog closing.
     Clear its stale error then, same pending-guard as resetActionErrors: a
     still in-flight update keeps its observer so its onSuccess still fires. */
  protected onEditDialogClosed(): void {
    if (!this.update.isPending()) this.update.reset();
  }
}
