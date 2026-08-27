import { Component, input } from "@angular/core";

@Component({ selector: "app-form-page", template: `<p>Form page {{ id() ?? "new" }}</p>` })
export class FormPage {
  readonly id = input<string>();
}
