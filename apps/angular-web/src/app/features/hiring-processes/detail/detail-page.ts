import { Component, input } from "@angular/core";

@Component({ selector: "app-detail-page", template: `<p>Detail page {{ id() }}</p>` })
export class DetailPage {
  readonly id = input.required<string>();
}
