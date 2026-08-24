import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE_KEY = "tapuy:theme";
export const DEFAULT_THEME: Theme = "dark";

const themeSchema = z.enum(THEMES);

/**
 * Read on the server so the very first HTML already carries the right
 * data-theme. A client-side read would repaint after hydration, which is the
 * flash the inline critical styles exist to avoid.
 */
export const getTheme = createServerFn({ method: "GET" }).handler(async (): Promise<Theme> => {
  const saved = themeSchema.safeParse(getCookie(THEME_COOKIE_KEY));
  return saved.success ? saved.data : DEFAULT_THEME;
});

export const setTheme = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => themeSchema.parse(input))
  .handler(async ({ data }): Promise<void> => {
    setCookie(THEME_COOKIE_KEY, data, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      path: "/",
    });
  });
