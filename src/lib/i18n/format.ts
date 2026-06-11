import type { Lang } from "./translations";

const LOCALE_MAP: Record<Lang, string> = {
  en: "en-US",
  th: "th-TH",
};

export function formatNumber(value: number, lang: Lang, decimals?: number): string {
  return new Intl.NumberFormat(LOCALE_MAP[lang], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, lang: Lang, decimals = 2): string {
  return new Intl.NumberFormat(LOCALE_MAP[lang], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value) + "%";
}

export function formatCurrency(value: number, lang: Lang, currency: "USD" | "THB" = "USD"): string {
  return new Intl.NumberFormat(LOCALE_MAP[lang], {
    style:                 "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: Date | number, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE_MAP[lang], {
    year:  "numeric",
    month: "short",
    day:   "numeric",
  }).format(typeof date === "number" ? new Date(date) : date);
}

export function formatShortDate(date: Date | number, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE_MAP[lang], {
    month: "short",
    day:   "numeric",
  }).format(typeof date === "number" ? new Date(date) : date);
}

export function formatDateTime(date: Date | number, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE_MAP[lang], {
    year:   "numeric",
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(typeof date === "number" ? new Date(date) : date);
}

export interface FormatUtils {
  number:    (v: number, decimals?: number) => string;
  percent:   (v: number, decimals?: number) => string;
  currency:  (v: number, currency?: "USD" | "THB") => string;
  date:      (d: Date | number) => string;
  shortDate: (d: Date | number) => string;
  dateTime:  (d: Date | number) => string;
}

export function makeFormatUtils(lang: Lang): FormatUtils {
  return {
    number:    (v, decimals)  => formatNumber(v, lang, decimals),
    percent:   (v, decimals)  => formatPercent(v, lang, decimals),
    currency:  (v, currency)  => formatCurrency(v, lang, currency),
    date:      (d)            => formatDate(d, lang),
    shortDate: (d)            => formatShortDate(d, lang),
    dateTime:  (d)            => formatDateTime(d, lang),
  };
}
