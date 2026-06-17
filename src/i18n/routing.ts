import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales:       ["en", "th"],
  defaultLocale: "en",
  // en has no prefix (/market), th gets /th/market
  localePrefix:  "as-needed",
  // Only use cookie (NEXT_LOCALE) — never infer from Accept-Language header.
  // This ensures the site is English by default regardless of OS/browser language.
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
