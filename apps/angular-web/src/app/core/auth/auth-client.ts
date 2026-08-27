import { InjectionToken } from "@angular/core";
import { createAuthClient } from "better-auth/client";

export type AuthClient = ReturnType<typeof createAuthClient>;

/** Real Better Auth client in the app; tests override it with a fake. */
export const AUTH_CLIENT = new InjectionToken<AuthClient>("AUTH_CLIENT", {
  providedIn: "root",
  factory: () => createAuthClient({ fetchOptions: { credentials: "include" } }),
});
