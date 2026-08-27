import { HttpErrorResponse, type HttpInterceptorFn } from "@angular/common/http";
import { InjectionToken, inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { ApiError } from "./api-error";

/**
 * Called when any request comes back 401. Provided by app.config.ts so the
 * interceptor does not depend on AuthService (which would create a cycle:
 * AuthService → HttpClient → interceptor → AuthService).
 */
export const UNAUTHORIZED_HANDLER = new InjectionToken<() => void>("UNAUTHORIZED_HANDLER", {
  providedIn: "root",
  factory: () => () => {},
});

type ErrorBody = { error?: { message?: string } | null } | null | undefined;

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const onUnauthorized = inject(UNAUTHORIZED_HANDLER);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
      const body = err.error as ErrorBody;
      const message =
        (typeof body === "object" && body?.error?.message) || err.message || "Request failed";
      if (err.status === 401) onUnauthorized();
      return throwError(() => new ApiError(err.status, message));
    }),
  );
};
