"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

import { translations, type Lang, type Translations } from "./translations";

const STORAGE_KEY = "investmart_lang";

interface I18nContextValue {
  lang:    Lang;
  t:       Translations;
  setLang: (l: Lang) => void;
  toggle:  () => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang:    "en",
  t:       translations.en,
  setLang: () => {},
  toggle:  () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "th") setLangState("th");
    } catch { /* SSR or private browsing */ }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "en" ? "th" : "en");
  }, [lang, setLang]);

  const t = translations[lang];

  return (
    <I18nContext.Provider value={{ lang, t, setLang, toggle }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
