"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useLocale } from "next-intl";

import { translations, type Lang, type Translations } from "./translations";
import { makeFormatUtils, type FormatUtils } from "./format";

const COOKIE_NAME    = "NEXT_LOCALE"; // next-intl middleware reads this cookie
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

interface I18nContextValue {
  lang:    Lang;
  t:       Translations;
  format:  FormatUtils;
  setLang: (l: Lang) => void;
  toggle:  () => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang:    "en",
  t:       translations.en,
  format:  makeFormatUtils("en"),
  setLang: () => {},
  toggle:  () => {},
});

interface I18nProviderProps {
  children:       ReactNode;
  initialLocale?: Lang; // kept for compat; next-intl context is authoritative
}

export function I18nProvider({ children }: I18nProviderProps) {
  // useLocale() reads from NextIntlClientProvider — always in sync with the URL
  const rawLocale = useLocale();
  const lang: Lang = rawLocale === "th" ? "th" : "en";

  const setLang = useCallback((l: Lang) => {
    try {
      document.cookie = `${COOKIE_NAME}=${l};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
    } catch { /* private browsing */ }
  }, []);

  const toggle = useCallback(() => {
    // LanguageToggle handles navigation; this just persists cookie for backward compat
    setLang(lang === "en" ? "th" : "en");
  }, [lang, setLang]);

  const t      = translations[lang];
  const format = useMemo(() => makeFormatUtils(lang), [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, format, setLang, toggle }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
