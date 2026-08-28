import type { Page } from "@playwright/test";

export const ORIGINS = {
  baseline: process.env.COMPARE_BASELINE ?? "http://localhost:3001",
  candidate: process.env.COMPARE_CANDIDATE ?? "http://localhost:3002",
} as const;

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
] as const;

export type RouteSpec = {
  name: string;
  /** Static path, or a resolver that derives the path from the app's data. */
  path: string | ((page: Page, origin: string) => Promise<string>);
  auth: boolean;
};

/* First process id, read from the list page. Both origins share a DB, so the
   id resolved on the baseline is valid on the candidate too.

   The list page's header also renders a "Create process" link
   (`/hiring-processes/new`) before the table, and it matches the same
   `a[href^="/hiring-processes/"]` prefix — `.first()` would pick it up
   instead of a real row. Excluded by href so this always resolves to an
   actual process, verified against apps/web-stylex/src/routes/_authenticated/hiring-processes/index.tsx:489
   and apps/web-stylex/src/components/hiring-process/hiring-process-table.tsx:102-109. */
async function firstProcessPath(page: Page, origin: string): Promise<string> {
  await page.goto(`${origin}/hiring-processes`);
  const href = await page
    .locator('a[href^="/hiring-processes/"]:not([href="/hiring-processes/new"])')
    .first()
    .getAttribute("href");
  if (!href) throw new Error("compare: no hiring process found — seed one before running");
  return href.split("/edit")[0];
}

export const ROUTES: RouteSpec[] = [
  { name: "landing", path: "/", auth: false },
  { name: "login", path: "/auth/login", auth: false },
  { name: "signup", path: "/auth/signup", auth: false },
  { name: "processes", path: "/hiring-processes", auth: true },
  { name: "process-new", path: "/hiring-processes/new", auth: true },
  { name: "process-detail", path: firstProcessPath, auth: true },
  {
    name: "process-edit",
    path: async (page, origin) => `${await firstProcessPath(page, origin)}/edit`,
    auth: true,
  },
];

/* Set to restrict ROUTES to the three unauthenticated routes (landing, login,
   signup) — used to exercise the harness end to end without credentials. */
export const COMPARE_ONLY_PUBLIC = process.env.COMPARE_ONLY_PUBLIC === "1";

export const ACTIVE_ROUTES: RouteSpec[] = COMPARE_ONLY_PUBLIC
  ? ROUTES.filter((route) => !route.auth)
  : ROUTES;

export async function resolveRoute(page: Page, spec: RouteSpec, origin: string): Promise<string> {
  return typeof spec.path === "string" ? spec.path : spec.path(page, origin);
}

/* The app stores the theme in a cookie read on the server (functions/theme.ts). */
export function themeCookie(origin: string, theme: Theme) {
  const url = new URL(origin);
  return { name: "tapuy:theme", value: theme, domain: url.hostname, path: "/" };
}
