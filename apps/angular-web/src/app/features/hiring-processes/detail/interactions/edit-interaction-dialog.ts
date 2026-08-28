import { Component, ElementRef, input, output, signal, viewChild } from "@angular/core";
import {
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPE_VALUES,
  type InteractionType,
} from "@interviews-tool/domain/constants";
import type { UpdateInteraction } from "@interviews-tool/domain/schemas";
import type { Interaction } from "../../../../core/api/interaction.model";

/* The domain schema requires 10..10000 characters, so a two-word note would be
   rejected by the server. Catch it here and say why, instead of surfacing a 422. */
const CONTENT_MIN = 10;
const TITLE_MAX = 100;

@Component({
  selector: "app-edit-interaction-dialog",
  template: `
    <dialog #dialog class="card w-full max-w-lg backdrop:bg-black/60" (close)="onDialogClose()">
      <h2 class="mb-4 text-base font-semibold">Edit interaction</h2>

      <label class="label" for="edit-title">Title</label>
      <input
        id="edit-title"
        class="input mb-4"
        [maxLength]="titleMax"
        [value]="title()"
        (input)="onTitle($event)"
      />

      <label class="label" for="edit-type">Type</label>
      <select
        id="edit-type"
        class="input mb-4"
        (change)="onType($event)"
      >
        @for (t of types; track t) {
          <option [value]="t" [selected]="t === type()">{{ labels[t] }}</option>
        }
      </select>

      <label class="label" for="edit-content">Content</label>
      <textarea
        id="edit-content"
        class="input mb-1 min-h-40 font-mono text-sm"
        [value]="content()"
        (input)="onContent($event)"
      ></textarea>
      @if (tooShort()) {
        <p class="field-error mb-3" role="alert">
          Content needs at least {{ contentMin }} characters.
        </p>
      }
      @if (serverError(); as message) {
        <p class="field-error mb-3" role="alert">{{ message }}</p>
      }

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="close()">Cancel</button>
        <button type="button" class="btn btn-primary" [disabled]="pending()" (click)="onSave()">
          {{ pending() ? "Saving…" : "Save changes" }}
        </button>
      </div>
    </dialog>
  `,
})
export class EditInteractionDialog {
  readonly save = output<{ interactionId: string; body: UpdateInteraction }>();
  /* Emitted whenever the native dialog closes -- via Cancel, Escape, or the
     owning section calling close() on success -- so the section can clear a
     stale server error instead of leaving it to be revealed on next open. */
  readonly closed = output<void>();
  readonly pending = input(false);
  readonly serverError = input<string | null>(null);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>("dialog");

  protected readonly types = INTERACTION_TYPE_VALUES;
  protected readonly labels = INTERACTION_TYPE_LABELS;
  protected readonly contentMin = CONTENT_MIN;
  protected readonly titleMax = TITLE_MAX;

  protected readonly title = signal("");
  protected readonly content = signal("");
  protected readonly type = signal<InteractionType>("note");
  protected readonly tooShort = signal(false);
  private interactionId = "";

  open(interaction: Interaction): void {
    this.interactionId = interaction.id;
    this.title.set(interaction.title ?? "");
    this.content.set(interaction.content);
    this.type.set(interaction.type);
    this.tooShort.set(false);
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected onDialogClose(): void {
    this.closed.emit();
  }

  protected onTitle(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  protected onType(event: Event): void {
    this.type.set((event.target as HTMLSelectElement).value as InteractionType);
  }

  protected onContent(event: Event): void {
    this.content.set((event.target as HTMLTextAreaElement).value);
    this.tooShort.set(false);
  }

  protected onSave(): void {
    // Guards the keyboard/Enter path the same way [disabled]="pending()" guards
    // the button: a slow network must not let a second click fire a second PUT.
    if (this.pending()) return;
    const content = this.content().trim();
    if (content.length < CONTENT_MIN) {
      this.tooShort.set(true);
      return;
    }
    const title = this.title().trim();
    this.save.emit({
      interactionId: this.interactionId,
      // title is optional in the schema; send it only when there is one.
      body: { content, type: this.type(), ...(title ? { title } : {}) },
    });
    // Closing happens in the owning section's onSuccess, not here: a failed
    // update must leave the dialog open with the edit still in it.
  }
}
