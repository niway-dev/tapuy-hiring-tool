import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideHttpClient, withFetch, withInterceptors } from "@angular/common/http";
import { Router, provideRouter, withComponentInputBinding } from "@angular/router";
import { QueryClient, provideTanStackQuery } from "@tanstack/angular-query-experimental";
import { routes } from "./app.routes";
import { AuthService } from "./core/auth/auth.service";
import { UNAUTHORIZED_HANDLER, apiErrorInterceptor } from "./core/http/api-error.interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([apiErrorInterceptor])),
    provideTanStackQuery(
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
    ),
    {
      provide: UNAUTHORIZED_HANDLER,
      useFactory: () => {
        const auth = inject(AuthService);
        const router = inject(Router);
        return () => {
          auth.clear();
          void router.navigate(["/auth/login"], { queryParams: { redirect: router.url } });
        };
      },
    },
    // Load the session before the first route resolves, so guards never see "loading".
    provideAppInitializer(() => inject(AuthService).refresh()),
  ],
};
