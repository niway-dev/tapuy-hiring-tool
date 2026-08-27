import { Component } from "@angular/core";

@Component({
  selector: "app-spinner",
  template: `
    <span
      role="status"
      aria-label="Loading"
      class="inline-block size-5 animate-spin rounded-full border-2 border-border-strong border-t-mint"
    ></span>
  `,
})
export class Spinner {}
