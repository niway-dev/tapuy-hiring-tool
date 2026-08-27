import { Component, ElementRef, output, signal, viewChild } from "@angular/core";
import { ARCHIVE_REASON_VALUES, type ArchiveReason } from "@interviews-tool/domain/constants";

const REASON_LABEL: Record<ArchiveReason, string> = {
  "no-reply": "No reply",
  "they-passed": "They passed",
  "i-withdrew": "I withdrew",
  "role-closed": "Role closed",
};

@Component({
  selector: "app-archive-dialog",
  template: `
    <dialog #dialog class="card w-full max-w-sm backdrop:bg-black/60" (close)="reason.set('no-reply')">
      <h2 class="mb-2 text-base font-semibold">Archive this process?</h2>
      <p class="mb-4 text-sm text-text-muted">It leaves the active list but keeps its status and history.</p>
      <label class="label" for="archive-reason">Reason</label>
      <!-- [selected] lives on each option, not [value] on the select: Angular emits
           the select's property instruction before the @for creates its options, so
           [value] would bind before any option exists and the assignment would be
           discarded. Only works today because "no-reply" happens to be the first
           option; fixed proactively so a change to the default doesn't silently break it. -->
      <select id="archive-reason" class="input mb-4" (change)="onReason($event)">
        @for (r of reasons; track r) {
          <option [value]="r" [selected]="r === reason()">{{ labels[r] }}</option>
        }
      </select>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="close()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="onConfirm()">Archive</button>
      </div>
    </dialog>
  `,
})
export class ArchiveDialog {
  readonly confirm = output<ArchiveReason>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>("dialog");

  protected readonly reasons = ARCHIVE_REASON_VALUES;
  protected readonly labels = REASON_LABEL;
  protected readonly reason = signal<ArchiveReason>("no-reply");

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected onReason(event: Event): void {
    this.reason.set((event.target as HTMLSelectElement).value as ArchiveReason);
  }

  protected onConfirm(): void {
    this.confirm.emit(this.reason());
    this.close();
  }
}
