import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { AVAILABLE_LOCALES, COOKIE_KEY } from "@interviews-tool/i18n/config";

const localeSchema = z.enum(AVAILABLE_LOCALES);

export const setLocale = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => localeSchema.parse(input))
  .handler(async ({ data }): Promise<void> => {
    setCookie(COOKIE_KEY, data, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      path: "/",
    });
  });
