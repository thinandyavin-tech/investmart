import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales:       ["en", "th"],
  defaultLocale: "en",
  // en has no prefix (/market), th gets /th/market
  localePrefix:  "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
