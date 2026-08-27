import { Component, input, output, signal } from "@angular/core";

/* The domain schema requires 10..10000 characters, so a two-word note would be
   rejected by the server. Catch it here and say why, instead of surfacing a 422. */
const CONTENT_MIN = 10;

@Component({
  selector: "app-quick-capture",
  template: `
    <div class="mb-6 flex gap-2">
      <input
        type="text"
        class="input h-10 flex-1"
        placeholder="What just happened? Enter logs a note"
        aria-label="Log an interaction"
        [value]="text()"
        [attr.aria-invalid]="!!tooShort() || null"
        (input)="onInput($event)"
        (keydown.enter)="submit($event)"
      />
      <button
        type="button"
        class="btn btn-secondary h-10"
        [disabled]="pending()"
        (click)="submit()"
      >
        {{ pending() ? "Logging…" : "Log" }}
      </button>
    </div>
    @if (tooShort()) {
      <p class="field-error -mt-4 mb-6" role="alert">
        A note needs at least {{ min }} characters.
      </p>
    }
    @if (serverError(); as message) {
      <p class="field-error -mt-4 mb-6" role="alert">{{ message }}</p>
    }
  `,
})
export class QuickCapture {
  readonly pending = input(false);
  readonly serverError = input<string | null>(null);
  readonly log = output<string>();

  protected readonly min = CONTENT_MIN;
  protected readonly text = signal("");
  protected readonly tooShort = signal(false);

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLInputElement).value);
    this.tooShort.set(false);
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    // The button path is already guarded by [disabled]="pending()"; the
    // keyboard path (Enter) has no such guard from the DOM, so a second
    // keypress while a create is still in flight must be a no-op here, or
    // two quick Enters create two identical interactions.
    if (this.pending()) return;
    const content = this.text().trim();
    if (!content) return;
    if (content.length < CONTENT_MIN) {
      this.tooShort.set(true);
      return;
    }
    this.log.emit(content);
  }

  /** Called by the owning section once the mutation actually succeeds — a
      failed create must leave the typed note in the field, so clearing does
      not happen inside submit(). */
  clear(): void {
    this.text.set("");
    this.tooShort.set(false);
  }
}
