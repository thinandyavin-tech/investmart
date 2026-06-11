"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

import { translations, type Lang, type Translations } from "./translations";
import { makeFormatUtils, type FormatUtils } from "./format";

const COOKIE_NAME    = "investmart_lang";
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
  children:      ReactNode;
  initialLocale?: Lang;
}

export function I18nProvider({ children, initialLocale = "en" }: I18nProviderProps) {
  const [lang, setLangState] = useState<Lang>(initialLocale);

  // Sync when URL-driven locale changes (e.g., after router.replace)
  useEffect(() => {
    setLangState(initialLocale);
  }, [initialLocale]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      document.cookie = `${COOKIE_NAME}=${l};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
    } catch { /* private browsing */ }
  }, []);

  const toggle = useCallback(() => {
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
