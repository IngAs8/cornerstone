/**
 * i18n configuration — single source of truth for supported locales.
 */

export const locales = ["en", "es", "pt", "fr", "de", "it", "pl", "ru", "ja", "zh", "ko"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pl: "Polski",
  ru: "Русский",
  ja: "日本語",
  zh: "中文",
  ko: "한국어",
};

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isValidLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
