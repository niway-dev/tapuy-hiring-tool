import { Component, inject, input, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { FormField, form, required, email, submit } from "@angular/forms/signals";
import { AuthService } from "../../core/auth/auth.service";

@Component({
  selector: "app-login",
  imports: [FormField, RouterLink],
  template: `
    <div class="mx-auto max-w-sm">
      <h1 class="mb-4 text-xl font-semibold">Sign in</h1>
      <form class="card flex flex-col gap-4" (submit)="onSubmit($event)" novalidate>
        <div>
          <label class="label" for="email">Email</label>
          <input
            id="email"
            type="email"
            class="input"
            autocomplete="email"
            [formField]="loginForm.email"
            [attr.aria-invalid]="showError(loginForm.email())"
          />
          @if (showError(loginForm.email())) {
            <p class="field-error">{{ loginForm.email().errors()[0]?.message }}</p>
          }
        </div>
        <div>
          <label class="label" for="password">Password</label>
          <input
            id="password"
            type="password"
            class="input"
            autocomplete="current-password"
            [formField]="loginForm.password"
            [attr.aria-invalid]="showError(loginForm.password())"
          />
          @if (showError(loginForm.password())) {
            <p class="field-error">{{ loginForm.password().errors()[0]?.message }}</p>
          }
        </div>
        @if (serverError()) {
          <p class="field-error" role="alert">{{ serverError() }}</p>
        }
        <button type="submit" class="btn btn-primary" [disabled]="loginForm().submitting()">
          {{ loginForm().submitting() ? "Signing in…" : "Sign in" }}
        </button>
        <p class="text-center text-xs text-text-muted">
          No account? <a routerLink="/auth/signup" class="underline">Sign up</a>
        </p>
      </form>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Bound from ?redirect= by withComponentInputBinding. */
  readonly redirect = input<string>();

  protected readonly serverError = signal<string | null>(null);
  protected readonly model = signal({ email: "", password: "" });

  protected readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: "Email is required" });
    email(path.email, { message: "Enter a valid email" });
    required(path.password, { message: "Password is required" });
  });

  /** Errors are shown once the field was touched or the form was submitted. */
  protected showError(field: { touched: () => boolean; invalid: () => boolean }): boolean {
    return field.invalid() && (field.touched() || this.loginForm().submitting());
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(null);
    void submit(this.loginForm, async () => {
      const { email, password } = this.model();
      try {
        await this.auth.signIn(email, password);
        await this.router.navigateByUrl(this.redirect() || "/hiring-processes");
      } catch (err) {
        this.serverError.set((err as Error).message);
      }
    });
  }
}
