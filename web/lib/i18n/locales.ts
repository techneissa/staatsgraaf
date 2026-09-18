export type Locale = "nl" | "en";

export const LOCALES: Locale[] = ["nl", "en"];
export const DEFAULT_LOCALE: Locale = "nl";
export const LANG_STORAGE_KEY = "staatsgraaf-lang";

export const LOCALE_LABEL: Record<Locale, string> = {
  nl: "NL",
  en: "EN",
};

export type LocString = { nl: string; en: string };

export function isLocale(value: unknown): value is Locale {
  return value === "nl" || value === "en";
}

export function localeHtmlLang(locale: Locale): string {
  return locale === "nl" ? "nl-NL" : "en-GB";
}

/** Simple {var} interpolation for dictionary strings. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}
