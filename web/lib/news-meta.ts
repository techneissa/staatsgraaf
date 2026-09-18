import type { NewsItem, NewsLanguage, PublisherKind } from "./types";

/**
 * Data-free news metadata: limits, language and publisher vocabularies, and the
 * shared view types. This module imports no dataset, so client components can
 * read it without pulling `node:fs` into the browser bundle. `./news` re-exports
 * everything here for server-side callers.
 */

export const NEWS_HOME_LIMIT = 6;
export const NEWS_PAGE_SIZE = 8;
/** Items shown per recency group and language on /nieuws/ before the day archive takes over. */
export const NEWS_GROUP_LIMIT = 30;
/** Items shown per group before the "Toon meer" disclosure. */
export const NEWS_GROUP_INITIAL = 10;
/** Items shown on a person page before the count note. */
export const NEWS_ENTITY_LIMIT = 12;

export const NEWS_LANGUAGES: NewsLanguage[] = ["nl", "en"];

export const NEWS_LANGUAGE_LABELS: Record<NewsLanguage, string> = {
  nl: "Nederlands",
  en: "English",
};

export const PUBLISHER_KINDS: PublisherKind[] = [
  "publieke-omroep",
  "krant",
  "commerciele-omroep",
  "online",
  "video",
  "nieuwsbrief",
  "blog",
  "vakmedia",
  "overheid",
];

/** Plural labels for filters and the outlets page. */
export const PUBLISHER_KIND_LABELS: Record<PublisherKind, string> = {
  "publieke-omroep": "Publieke omroep",
  krant: "Kranten",
  "commerciele-omroep": "Commerciële omroepen",
  online: "Online",
  video: "Video",
  nieuwsbrief: "Nieuwsbrieven",
  blog: "Blogs",
  vakmedia: "Vakmedia",
  overheid: "Overheid",
};

/** Singular labels for the badge on one item. */
export const PUBLISHER_KIND_BADGES: Record<PublisherKind, string> = {
  "publieke-omroep": "Publieke omroep",
  krant: "Krant",
  "commerciele-omroep": "Commerciële omroep",
  online: "Online",
  video: "Video",
  nieuwsbrief: "Nieuwsbrief",
  blog: "Blog",
  vakmedia: "Vakmedia",
  overheid: "Overheid",
};

export type RecencyGroupKey = "hour" | "today" | "yesterday" | "week" | "earlier";

export const RECENCY_GROUPS: RecencyGroupKey[] = ["hour", "today", "yesterday", "week", "earlier"];

export const RECENCY_GROUP_LABELS: Record<RecencyGroupKey, string> = {
  hour: "Afgelopen uur",
  today: "Vandaag",
  yesterday: "Gisteren",
  week: "Deze week",
  earlier: "Eerder",
};

export type NewsEntityRef = {
  id: string;
  href: string;
  label: string;
  kind: "organization" | "position" | "person" | "topic";
  /** A licensed portrait for a person, with its credit line; null for every other kind. */
  portrait: { url: string; caption: string } | null;
};

export type NewsOutlet = {
  publisher: string;
  kind: PublisherKind;
  languages: NewsLanguage[];
  count: number;
  /** Distinct licence values found on this outlet's source records, or empty when none is recorded. */
  licenses: string[];
  latest: string | null;
};

export type NewsDayGroup<T = NewsItem> = {
  key: RecencyGroupKey;
  label: string;
  items: T[];
};

export type NewsDay = {
  /** Calendar day in Nederland, yyyy-mm-dd. */
  date: string;
  count: number;
};
