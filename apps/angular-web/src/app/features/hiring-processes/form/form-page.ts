import { Component, computed, inject, input } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import type { CreateHiringProcess } from "@interviews-tool/domain/schemas";
import { Spinner } from "../../../shared/ui/spinner";
import { EmptyState } from "../../../shared/ui/empty-state";
import {
  injectCreateHiringProcess,
  injectHiringProcess,
  injectUpdateHiringProcess,
} from "../hiring-process.queries";
import { HiringProcessForm } from "./hiring-process-form";

@Component({
  selector: "app-form-page",
  imports: [RouterLink, HiringProcessForm, Spinner, EmptyState],
  template: `
    <h1 class="mb-4 text-xl font-semibold">{{ isEdit() ? "Edit hiring process" : "New hiring process" }}</h1>

    @if (isEdit() && existing.isPending()) {
      <div class="flex justify-center py-10"><app-spinner /></div>
    } @else if (isEdit() && existing.isError()) {
      <app-empty-state title="Could not load this process" [message]="existing.error().message">
        <a routerLink="/hiring-processes" class="btn btn-secondary">Back to list</a>
      </app-empty-state>
    } @else {
      <app-hiring-process-form
        [initial]="existing.data() ?? null"
        [submitting]="create.isPending() || update.isPending()"
        [serverError]="serverError()"
        [submitLabel]="isEdit() ? 'Save changes' : 'Create'"
        (save)="onSave($event)"
      >
        <a cancel [routerLink]="cancelLink()" class="btn btn-secondary">Cancel</a>
      </app-hiring-process-form>
    }
  `,
})
export class FormPage {
  private readonly router = inject(Router);

  /** Present on /hiring-processes/:id/edit, absent on /hiring-processes/new. */
  readonly id = input<string>();
  protected readonly isEdit = computed(() => !!this.id());
  protected readonly cancelLink = computed(() =>
    this.id() ? ["/hiring-processes", this.id()] : ["/hiring-processes"],
  );

  protected readonly existing = injectHiringProcess(() => this.id());
  protected readonly create = injectCreateHiringProcess();
  protected readonly update = injectUpdateHiringProcess();

  protected readonly serverError = computed(
    () => this.create.error()?.message ?? this.update.error()?.message ?? null,
  );

  protected onSave(body: CreateHiringProcess): void {
    const id = this.id();
    if (id) {
      this.update.mutate(
        { id, body },
        { onSuccess: () => void this.router.navigate(["/hiring-processes", id]) },
      );
    } else {
      this.create.mutate(body, {
        onSuccess: (created) => void this.router.navigate(["/hiring-processes", created.id]),
      });
    }
  }
}
