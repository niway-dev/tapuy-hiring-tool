import { Injectable, computed, inject, signal } from "@angular/core";
import { AUTH_CLIENT } from "./auth-client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export type AuthStatus = "loading" | "authed" | "anon";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly client = inject(AUTH_CLIENT);

  readonly user = signal<SessionUser | null>(null);
  readonly status = signal<AuthStatus>("loading");
  readonly isAuthenticated = computed(() => this.status() === "authed");

  /** Re-reads the session cookie. Safe to call many times. */
  async refresh(): Promise<void> {
    try {
      const { data } = await this.client.getSession();
      const sessionUser = data?.user;
      if (sessionUser) {
        this.user.set({ id: sessionUser.id, email: sessionUser.email, name: sessionUser.name });
        this.status.set("authed");
      } else {
        this.clear();
      }
    } catch {
      this.clear();
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client.signIn.email({ email, password });
    if (error) throw new Error(error.message ?? "Sign in failed");
    await this.refresh();
  }

  async signUp(name: string, email: string, password: string): Promise<void> {
    const { error } = await this.client.signUp.email({ name, email, password });
    if (error) throw new Error(error.message ?? "Sign up failed");
    await this.refresh();
  }

  async signOut(): Promise<void> {
    await this.client.signOut();
    this.clear();
  }

  /** Forget the session locally (used by the 401 interceptor and signOut). */
  clear(): void {
    this.user.set(null);
    this.status.set("anon");
  }
}
