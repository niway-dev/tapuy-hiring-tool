import { Component, ElementRef, output, signal, viewChild } from "@angular/core";
import type { Interaction } from "../../../../core/api/interaction.model";

@Component({
  selector: "app-delete-interaction-dialog",
  template: `
    <dialog #dialog class="card w-full max-w-sm backdrop:bg-black/60">
      <h2 class="mb-2 text-base font-semibold">Delete this interaction?</h2>
      <p class="mb-4 text-sm text-text-muted">
        This removes it from the timeline permanently.
      </p>
      @if (preview(); as text) {
        <p class="mb-4 line-clamp-3 rounded-md bg-surface-2 p-3 font-mono text-xs text-text-secondary">
          {{ text }}
        </p>
      }
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="close()">Cancel</button>
        <button type="button" class="btn btn-danger" (click)="onConfirm()">Delete</button>
      </div>
    </dialog>
  `,
})
export class DeleteInteractionDialog {
  readonly confirm = output<string>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>("dialog");

  protected readonly preview = signal("");
  private interactionId = "";

  open(interaction: Interaction): void {
    this.interactionId = interaction.id;
    // A short excerpt so the user can tell which note they are about to lose.
    this.preview.set(interaction.content.slice(0, 160));
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected onConfirm(): void {
    this.confirm.emit(this.interactionId);
    this.close();
  }
}
