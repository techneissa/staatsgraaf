import { NEWS_LANGUAGES } from "./news-meta";
import type { NewsLanguage } from "./types";

/**
 * Counts for one original language: items in total and those that name the state, and
 * how many of each have a valid machine translation into the interface language.
 */
export type LanguageCounts = { total: number; relevantTotal: number; translated: number; relevantTranslated: number };

export function sumBuckets(groups: Record<NewsLanguage, LanguageCounts>[]): Record<NewsLanguage, LanguageCounts> {
  const zero = (): LanguageCounts => ({ total: 0, relevantTotal: 0, translated: 0, relevantTranslated: 0 });
  const sum: Record<NewsLanguage, LanguageCounts> = { nl: zero(), en: zero() };
  for (const group of groups) {
    for (const language of NEWS_LANGUAGES) {
      sum[language].total += group[language].total;
      sum[language].relevantTotal += group[language].relevantTotal;
      sum[language].translated += group[language].translated;
      sum[language].relevantTranslated += group[language].relevantTranslated;
    }
  }
  return sum;
}

/**
 * What the machine-translation line says (NW-12): of the items in the other language
 * that are listed, how many have a translation. Null when no foreign item is listed, so
 * the page does not claim a translation it does not show.
 */
export function translationSummary(
  buckets: Record<NewsLanguage, LanguageCounts>,
  ui: NewsLanguage,
  language: "all" | NewsLanguage,
  relevantOnly: boolean,
): { foreign: NewsLanguage; total: number; translated: number } | null {
  const foreign: NewsLanguage = ui === "nl" ? "en" : "nl";
  if (language !== "all" && language !== foreign) return null;
  const bucket = buckets[foreign];
  const total = relevantOnly ? bucket.relevantTotal : bucket.total;
  const translated = relevantOnly ? bucket.relevantTranslated : bucket.translated;
  return total === 0 ? null : { foreign, total, translated };
}

export type HourSection<T> = { hour: string; label: string; items: T[] };

/**
 * The first `shown` items of a day across its hour sections, in order, so a day with
 * hundreds of items renders a page of cards and a "show more" (NW-19).
 */
export function windowHours<T>(
  hours: HourSection<T>[],
  shown: number,
): { hours: HourSection<T>[]; shown: number; total: number; rest: number } {
  const total = hours.reduce((sum, hour) => sum + hour.items.length, 0);
  let left = shown;
  const out: HourSection<T>[] = [];
  for (const hour of hours) {
    if (left <= 0) break;
    if (hour.items.length === 0) continue;
    const items = hour.items.slice(0, left);
    left -= items.length;
    out.push({ ...hour, items });
  }
  const shownCount = out.reduce((sum, hour) => sum + hour.items.length, 0);
  return { hours: out, shown: shownCount, total, rest: total - shownCount };
}
