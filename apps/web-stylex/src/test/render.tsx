import type { ReactNode } from "react";
import { act, render } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { I18nProvider, loadMessages } from "@interviews-tool/i18n";

/* Loaded once: the real English catalog, so tests assert the strings users see
   and a missing translation key fails here rather than in the browser. */
const messages = await loadMessages("en");

/**
 * Renders a component inside the providers it needs in the app: i18n, and a
 * memory router so `Link` can resolve the routes the dashboard links to.
 *
 * The component under test is mounted as the index route, which is what lets
 * us put an arbitrary subtree inside a real router context.
 */
export async function renderWithProviders(ui: ReactNode) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });

  const routeTree = rootRoute.addChildren([
    createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => <>{ui}</> }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/hiring-processes/$id",
      component: () => null,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/hiring-processes/$id/edit",
      component: () => null,
    }),
  ]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  await router.load();

  let result!: ReturnType<typeof render>;

  /* The router settles its first transition right after mount; flushing it
     inside act keeps that state update out of the test output as a warning. */
  await act(async () => {
    result = render(
      <I18nProvider locale="en" messages={messages} setLocale={() => {}}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- the test tree is not the app's typed route tree */}
        <RouterProvider router={router as any} />
      </I18nProvider>,
    );
  });

  return result;
}
