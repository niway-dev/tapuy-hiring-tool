import { Component, input } from "@angular/core";

@Component({
  selector: "app-empty-state",
  template: `
    <div class="card flex flex-col items-center gap-2 py-10 text-center">
      <p class="text-base font-medium">{{ title() }}</p>
      @if (message()) {
        <p class="text-sm text-text-muted">{{ message() }}</p>
      }
      <div class="mt-2 flex gap-2"><ng-content /></div>
    </div>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>();
}
