import { createHash } from "node:crypto";
import { getDataset } from "./data";
import type { NewsItem, NewsLanguage, NewsTranslation } from "./types";

/**
 * Machine translations of news headlines and leads (docs/adr/0016). Server
 * only: it reads the dataset and hashes with node:crypto at build time.
 *
 * The hash formula is the shared contract in
 * shared/news-translation-hash.mjs (translationSourceHash): the first 12 hex
 * characters of sha256(title + "\n" + (summaryMarkup ?? "")) over UTF-8.
 * web/lib/news-translations.test.mjs checks that both agree.
 */
export function newsSourceHash(title: string, summaryMarkup: string | null | undefined): string {
  return createHash("sha256")
    .update(`${title}\n${summaryMarkup ?? ""}`, "utf8")
    .digest("hex")
    .slice(0, 12);
}

let index: Map<string, NewsTranslation> | null = null;

function translationIndex(): Map<string, NewsTranslation> {
  if (index) return index;
  index = new Map();
  for (const record of getDataset().newsTranslations) {
    if (!record || typeof record.id !== "string" || (record.language !== "nl" && record.language !== "en")) continue;
    if (typeof record.title !== "string" || record.title.trim() === "") continue;
    index.set(`${record.id}:${record.language}`, record);
  }
  return index;
}

/**
 * The translation of an item into `language`, or null when there is none,
 * when it is the item's own language, or when the item changed after it was
 * translated (the hash no longer matches). A stale translation is never shown.
 */
export function newsTranslationFor(item: NewsItem, language: NewsLanguage): NewsTranslation | null {
  const own = item.language === "en" ? "en" : "nl";
  if (language === own) return null;
  const record = translationIndex().get(`${item.id}:${language}`);
  if (!record) return null;
  if (record.sourceHash !== newsSourceHash(item.title, item.summaryMarkup)) return null;
  return record;
}

/** Counts for the method page: how many items have a valid translation. */
export function newsTranslationCoverage(): { items: number; translated: number } {
  const items = getDataset().news;
  let translated = 0;
  for (const item of items) {
    const target = item.language === "en" ? "nl" : "en";
    if (newsTranslationFor(item, target) !== null) translated += 1;
  }
  return { items: items.length, translated };
}
