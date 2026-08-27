import type { Routes } from "@angular/router";
import { authGuard, guestGuard } from "./core/auth/auth.guard";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "hiring-processes" },
  {
    path: "auth/login",
    canActivate: [guestGuard],
    loadComponent: () => import("./features/auth/login").then((m) => m.Login),
  },
  {
    path: "auth/signup",
    canActivate: [guestGuard],
    loadComponent: () => import("./features/auth/signup").then((m) => m.Signup),
  },
  {
    path: "hiring-processes",
    canActivate: [authGuard],
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./features/hiring-processes/list/list-page").then((m) => m.ListPage),
      },
      {
        path: "new",
        loadComponent: () =>
          import("./features/hiring-processes/form/form-page").then((m) => m.FormPage),
      },
      {
        path: ":id/edit",
        loadComponent: () =>
          import("./features/hiring-processes/form/form-page").then((m) => m.FormPage),
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./features/hiring-processes/detail/detail-page").then((m) => m.DetailPage),
      },
    ],
  },
  { path: "**", redirectTo: "hiring-processes" },
];
