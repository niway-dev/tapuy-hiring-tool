import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";

import { DEFAULT_LOCALE } from "@interviews-tool/i18n";

import { DEFAULT_THEME } from "./functions/theme";

import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";
import { createQueryClient } from "./lib/query-client";

export const getRouter = () => {
  const queryClient = createQueryClient();
  const router = routerWithQueryClient(
    createTanStackRouter({
      routeTree,
      scrollRestoration: true,
      defaultPreloadStaleTime: 0,
      context: {
        queryClient,
        isAuthenticated: false,
        session: null,
        locale: DEFAULT_LOCALE,
        messages: {},
        theme: DEFAULT_THEME,
      },
      defaultPendingComponent: () => <Loader />,
      defaultNotFoundComponent: () => <div>Not Found</div>,
    }),
    queryClient,
  );
  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
