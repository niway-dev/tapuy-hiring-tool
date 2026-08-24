import type { QueryClient } from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { I18nProvider, type Locale } from "@interviews-tool/i18n";
import { Toaster } from "@interviews-tool/web-ui";

import Header from "../components/header";
import appCss from "../index.css?url";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import type { AuthSession } from "@/lib/auth/types";
import { getLocale } from "@/functions/get-locale";
import { setLocale as setLocaleFn } from "@/functions/set-locale";
import { getTheme, setTheme as setThemeFn, type Theme } from "@/functions/theme";

export interface RouterAppContext {
  queryClient: QueryClient;
  isAuthenticated: boolean;
  session: AuthSession | null;
  locale: Locale;
  messages: Record<string, unknown>;
  theme: Theme;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "tapuy",
      },
      {
        name: "description",
        content: "Open-source interview and hiring process tracker",
      },
      {
        property: "og:title",
        content: "tapuy",
      },
      {
        property: "og:description",
        content: "Every question in the process, on record.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:image",
        content: "/og-image.svg",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
    ],
  }),
  component: RootDocument,
  staleTime: 10 * 60 * 1000, // 10 minutes
  beforeLoad: async () => {
    const [session, i18n, theme] = await Promise.all([getAuthSession(), getLocale(), getTheme()]);
    return {
      session: session ?? null,
      isAuthenticated: !!session,
      locale: i18n.locale,
      messages: i18n.messages,
      theme,
    };
  },
});

/* Painted before the stylesheet lands, so the page never flashes the wrong
   ground. Literal values because no CSS variable exists this early; they must
   track --bg and --text in web-ui's styles.css. */
const criticalStyles = `
  html, body { margin: 0; padding: 0; }
  html[data-theme="dark"], html[data-theme="dark"] body {
    background-color: #0a0f14;
    color: #e6ebf0;
  }
  html[data-theme="light"], html[data-theme="light"] body {
    background-color: #ffffff;
    color: #0d1117;
  }
`;

function RootDocument(): React.ReactElement {
  const context = Route.useRouteContext();
  const router = useRouter();
  const { isAuthenticated, session, locale, messages, theme } = context;

  const handleSetLocale = async (next: Locale): Promise<void> => {
    await setLocaleFn({ data: next });
    await router.invalidate();
  };

  const handleToggleTheme = async (): Promise<void> => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    /* Flip the attribute first: the round trip is only there to make the
       choice stick on the next visit. */
    document.documentElement.dataset.theme = next;
    await setThemeFn({ data: next });
    await router.invalidate();
  };

  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: criticalStyles }} />
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <I18nProvider locale={locale} messages={messages} setLocale={handleSetLocale}>
          <div className="min-h-svh">
            <Header
              isAuthenticated={isAuthenticated}
              userName={session?.user?.name ?? ""}
              userEmail={session?.user?.email ?? ""}
              theme={theme}
              onToggleTheme={handleToggleTheme}
            />
            <main className="pt-12">
              <Outlet />
            </main>
          </div>
          <Toaster />
        </I18nProvider>
        <TanStackRouterDevtools position="bottom-left" />
        <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
