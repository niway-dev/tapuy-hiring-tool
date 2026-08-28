import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import {
  isLocale,
  loadMessages,
  DEFAULT_LOCALE,
  COOKIE_KEY,
  type Locale,
} from "@interviews-tool/i18n/config";

interface LocalePayload {
  locale: Locale;
  messages: Record<string, object>;
}

export const getLocale = createServerFn({ method: "GET" }).handler(
  async (): Promise<LocalePayload> => {
    const saved = getCookie(COOKIE_KEY);
    if (isLocale(saved)) {
      return { locale: saved, messages: (await loadMessages(saved)) as Record<string, object> };
    }
    return {
      locale: DEFAULT_LOCALE,
      messages: (await loadMessages(DEFAULT_LOCALE)) as Record<string, object>,
    };
  },
);
