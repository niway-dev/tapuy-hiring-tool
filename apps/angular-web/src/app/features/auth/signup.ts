import { Component, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { FormField, form, required, email, minLength, submit } from "@angular/forms/signals";
import { AuthService } from "../../core/auth/auth.service";

@Component({
  selector: "app-signup",
  imports: [FormField, RouterLink],
  template: `
    <div class="mx-auto max-w-sm">
      <h1 class="mb-4 text-xl font-semibold">Create account</h1>
      <form class="card flex flex-col gap-4" (submit)="onSubmit($event)" novalidate>
        <div>
          <label class="label" for="name">Name</label>
          <input id="name" type="text" class="input" autocomplete="name" [formField]="signupForm.name" />
          @if (showError(signupForm.name())) {
            <p class="field-error">{{ signupForm.name().errors()[0]?.message }}</p>
          }
        </div>
        <div>
          <label class="label" for="email">Email</label>
          <input id="email" type="email" class="input" autocomplete="email" [formField]="signupForm.email" />
          @if (showError(signupForm.email())) {
            <p class="field-error">{{ signupForm.email().errors()[0]?.message }}</p>
          }
        </div>
        <div>
          <label class="label" for="password">Password</label>
          <input
            id="password"
            type="password"
            class="input"
            autocomplete="new-password"
            [formField]="signupForm.password"
          />
          @if (showError(signupForm.password())) {
            <p class="field-error">{{ signupForm.password().errors()[0]?.message }}</p>
          }
        </div>
        @if (serverError()) {
          <p class="field-error" role="alert">{{ serverError() }}</p>
        }
        <button type="submit" class="btn btn-primary" [disabled]="signupForm().submitting()">
          {{ signupForm().submitting() ? "Creating…" : "Create account" }}
        </button>
        <p class="text-center text-xs text-text-muted">
          Already have an account? <a routerLink="/auth/login" class="underline">Sign in</a>
        </p>
      </form>
    </div>
  `,
})
export class Signup {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly serverError = signal<string | null>(null);
  protected readonly model = signal({ name: "", email: "", password: "" });

  protected readonly signupForm = form(this.model, (path) => {
    required(path.name, { message: "Name is required" });
    required(path.email, { message: "Email is required" });
    email(path.email, { message: "Enter a valid email" });
    required(path.password, { message: "Password is required" });
    minLength(path.password, 8, { message: "Use at least 8 characters" });
  });

  protected showError(field: { touched: () => boolean; invalid: () => boolean }): boolean {
    return field.invalid() && (field.touched() || this.signupForm().submitting());
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);
    void submit(this.signupForm, async () => {
      const { name, email, password } = this.model();
      try {
        await this.auth.signUp(name, email, password);
        await this.router.navigateByUrl("/hiring-processes");
      } catch (err) {
        this.serverError.set((err as Error).message);
      }
    });
  }
}
