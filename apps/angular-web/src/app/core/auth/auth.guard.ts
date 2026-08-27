import { inject } from "@angular/core";
import { Router, type CanActivateFn } from "@angular/router";
import { AuthService } from "./auth.service";

async function ensureSessionLoaded(auth: AuthService): Promise<void> {
  if (auth.status() === "loading") await auth.refresh();
}

/** Protects app routes: anonymous users go to /auth/login?redirect=<url>. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await ensureSessionLoaded(auth);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(["/auth/login"], { queryParams: { redirect: state.url } });
};

/** Protects /auth/* pages: authenticated users go straight to the list. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await ensureSessionLoaded(auth);
  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree(["/hiring-processes"]);
};
