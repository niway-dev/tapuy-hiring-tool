import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { HIRING_PROCESS_STATUS_ORDER } from "@interviews-tool/domain/constants";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  templateUrl: "./app.html",
})
export class App {
  protected readonly statusCount = HIRING_PROCESS_STATUS_ORDER.length;
}
