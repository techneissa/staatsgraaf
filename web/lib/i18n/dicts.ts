import type { Locale } from "./locales";

export type DictTable = Record<string, { nl: string; en: string }>;

export const DICT_AREAS = ["common", "graph", "power", "home", "news", "entity", "pages"] as const;
export type DictArea = (typeof DICT_AREAS)[number];

export type Dicts = Record<DictArea, DictTable>;

export function pick(dict: DictTable, key: string, locale: Locale, vars?: Record<string, string | number>): string {
  const entry = dict[key];
  if (!entry) return key;
  const value = (locale === "en" ? entry.en : entry.nl) || key;
  if (vars) {
    let out = value;
    for (const [name, replacement] of Object.entries(vars)) {
      out = out.replaceAll(`{${name}}`, String(replacement));
    }
    return out;
  }
  return value;
}
