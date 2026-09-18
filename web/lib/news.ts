import {
  getDataset,
  getDatasetDate,
  getOrganizationById,
  getPersonById,
  getPositionById,
  getSourceById,
} from "./data";
import { getMediaItem, mediaCreditLine, personPortraitId } from "./entity";
import type { NewsItem, NewsLanguage, Person, PublisherKind, Source } from "./types";

import {
  NEWS_HOME_LIMIT,
  NEWS_PAGE_SIZE,
  NEWS_LANGUAGES,
  PUBLISHER_KINDS,
  RECENCY_GROUPS,
  RECENCY_GROUP_LABELS,
} from "./news-meta";
import type {
  NewsDay,
  NewsDayGroup,
  NewsEntityRef,
  NewsOutlet,
  RecencyGroupKey,
} from "./news-meta";

export * from "./news-meta";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NEWS_TIME_ZONE = "Europe/Amsterdam";

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: NEWS_TIME_ZONE,
});

const hourKeyFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  hourCycle: "h23",
  timeZone: NEWS_TIME_ZONE,
});

function compareNews(a: NewsItem, b: NewsItem): number {
  return b.published.localeCompare(a.published) || a.id.localeCompare(b.id);
}

export function sortNews(items: NewsItem[]): NewsItem[] {
  return [...items].sort(compareNews);
}

export function getAllNews(): NewsItem[] {
  return getDataset().news;
}

export function getHomeNews(limit = NEWS_HOME_LIMIT): NewsItem[] {
  return sortNews(getAllNews()).slice(0, limit);
}

export function getLatestNews(limit = NEWS_PAGE_SIZE): NewsItem[] {
  return sortNews(getAllNews()).slice(0, limit);
}

export function getNewsForEntity(id: string, limit?: number): NewsItem[] {
  const items = getAllNews().filter(
    (item) => Array.isArray(item.entities) && item.entities.includes(id),
  );
  const sorted = sortNews(items);
  return limit === undefined ? sorted : sorted.slice(0, limit);
}

export function getNewsForTopic(topicId: string, organizationIds: string[] = [], limit?: number): NewsItem[] {
  const orgs = new Set(organizationIds);
  const items = getAllNews().filter(
    (item) =>
      (Array.isArray(item.topics) && item.topics.includes(topicId)) ||
      (Array.isArray(item.entities) && item.entities.some((id) => orgs.has(id))),
  );
  const sorted = sortNews(items);
  return limit === undefined ? sorted : sorted.slice(0, limit);
}

export function getNewsCount(): number {
  return getAllNews().length;
}

export function getNewsDatasetDate(): string | null {
  return getDatasetDate();
}

export function getNewsSource(id: string): Source | undefined {
  return getSourceById(id);
}

/** The `language` field with the schema default applied. */
export function newsLanguage(item: Pick<NewsItem, "language">): NewsLanguage {
  return item.language === "en" ? "en" : "nl";
}

/** The `publisherKind` field with the schema default applied. */
export function newsKind(item: Pick<NewsItem, "publisherKind">): PublisherKind {
  const kind = item.publisherKind;
  return kind !== undefined && PUBLISHER_KINDS.includes(kind) ? kind : "online";
}

/** The `keywords` field, tolerant of it being absent. */
export function newsKeywords(item: Pick<NewsItem, "keywords">): string[] {
  return Array.isArray(item.keywords) ? item.keywords.filter((word) => word.length > 0) : [];
}

export function byLanguage<T extends Pick<NewsItem, "language">>(items: T[], language: NewsLanguage): T[] {
  return items.filter((item) => newsLanguage(item) === language);
}

export function byKind<T extends Pick<NewsItem, "publisherKind">>(items: T[], kind: PublisherKind): T[] {
  return items.filter((item) => newsKind(item) === kind);
}

export function byPublisher<T extends Pick<NewsItem, "publisher">>(items: T[], publisher: string): T[] {
  return items.filter((item) => item.publisher === publisher);
}

/** The latest `published` timestamp in the set, the build's reference point for recency. */
export function latestPublished(items: Pick<NewsItem, "published">[]): string | null {
  let latest: string | null = null;
  for (const item of items) {
    if (latest === null || item.published > latest) latest = item.published;
  }
  return latest;
}

export function getNewsReference(): string | null {
  return latestPublished(getAllNews());
}

/** Calendar day (yyyy-mm-dd) in Nederland for an ISO timestamp. */
export function newsDayKey(iso: string): string {
  return dayKeyFormat.format(new Date(iso));
}

/** Hour of the day (00 to 23) in Nederland for an ISO timestamp. */
export function newsHourKey(iso: string): string {
  return hourKeyFormat.format(new Date(iso));
}

function dayNumber(dayKey: string): number {
  return Math.round(Date.parse(`${dayKey}T00:00:00Z`) / DAY_MS);
}

/** Which recency group a timestamp falls in, relative to the reference timestamp. */
export function recencyGroup(published: string, reference: string): RecencyGroupKey {
  const age = Date.parse(reference) - Date.parse(published);
  if (age >= 0 && age < HOUR_MS) return "hour";
  const dayDiff = dayNumber(newsDayKey(reference)) - dayNumber(newsDayKey(published));
  if (dayDiff <= 0) return "today";
  if (dayDiff === 1) return "yesterday";
  if (dayDiff < 7) return "week";
  return "earlier";
}

/**
 * Groups items by recency relative to the reference, newest first inside each group.
 * Every group is returned, including empty ones, so the page can show a count of zero.
 */
export function byDayGroups<T extends Pick<NewsItem, "published" | "id">>(
  items: T[],
  reference: string | null = latestPublished(items),
): NewsDayGroup<T>[] {
  const buckets = new Map<RecencyGroupKey, T[]>(RECENCY_GROUPS.map((key) => [key, []]));
  if (reference !== null) {
    const sorted = [...items].sort(
      (a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id),
    );
    for (const item of sorted) buckets.get(recencyGroup(item.published, reference))?.push(item);
  }
  return RECENCY_GROUPS.map((key) => ({
    key,
    label: RECENCY_GROUP_LABELS[key],
    items: buckets.get(key) ?? [],
  }));
}

/** Groups items of one day by hour in Nederland, latest hour first. */
export function byHour<T extends Pick<NewsItem, "published" | "id">>(
  items: T[],
): { hour: string; label: string; items: T[] }[] {
  const buckets = new Map<string, T[]>();
  const sorted = [...items].sort(
    (a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id),
  );
  for (const item of sorted) {
    const hour = newsHourKey(item.published);
    const list = buckets.get(hour);
    if (list) list.push(item);
    else buckets.set(hour, [item]);
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([hour, list]) => ({
      hour,
      label: `${hour}:00 tot ${hour}:59`,
      items: list,
    }));
}

/** Every calendar day (in Nederland) with at least one item, newest first. */
export function newsDays(items: Pick<NewsItem, "published">[]): NewsDay[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = newsDayKey(item.published);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, count]) => ({ date, count }));
}

export function getNewsDays(): NewsDay[] {
  return newsDays(getAllNews());
}

export function getNewsForDay(date: string): NewsItem[] {
  return sortNews(getAllNews().filter((item) => newsDayKey(item.published) === date));
}

/** One row per publisher with its kind, languages, count, and recorded licences. */
export function outlets(
  items: NewsItem[],
  licenseFor: (item: NewsItem) => string[] = () => [],
): NewsOutlet[] {
  const map = new Map<
    string,
    { kinds: Map<PublisherKind, number>; languages: Set<NewsLanguage>; count: number; licenses: Set<string>; latest: string | null }
  >();
  for (const item of items) {
    let row = map.get(item.publisher);
    if (!row) {
      row = { kinds: new Map(), languages: new Set(), count: 0, licenses: new Set(), latest: null };
      map.set(item.publisher, row);
    }
    const kind = newsKind(item);
    row.kinds.set(kind, (row.kinds.get(kind) ?? 0) + 1);
    row.languages.add(newsLanguage(item));
    row.count += 1;
    for (const license of licenseFor(item)) row.licenses.add(license);
    if (row.latest === null || item.published > row.latest) row.latest = item.published;
  }
  return [...map.entries()]
    .map(([publisher, row]) => {
      const kind =
        [...row.kinds.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "online";
      return {
        publisher,
        kind,
        languages: NEWS_LANGUAGES.filter((language) => row.languages.has(language)),
        count: row.count,
        licenses: [...row.licenses].sort(),
        latest: row.latest,
      };
    })
    .sort((a, b) => b.count - a.count || a.publisher.localeCompare(b.publisher, "nl"));
}

function itemLicenses(item: NewsItem): string[] {
  const result: string[] = [];
  for (const ref of item.sources) {
    const source = getSourceById(ref.source);
    if (source?.license) result.push(source.license);
  }
  return result;
}

export function getNewsOutlets(): NewsOutlet[] {
  return outlets(getAllNews(), itemLicenses);
}

function personPortrait(person: Person): NewsEntityRef["portrait"] {
  const media = getMediaItem(personPortraitId(person));
  if (media === null) return null;
  return { url: media.url, caption: mediaCreditLine(media) };
}

export function resolveNewsEntities(item: NewsItem): NewsEntityRef[] {
  const refs: NewsEntityRef[] = [];
  const seen = new Set<string>();
  const { topics } = getDataset();
  for (const id of item.entities ?? []) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (id.startsWith("org:")) {
      const organization = getOrganizationById(id);
      if (organization) {
        refs.push({
          id,
          href: `/organisaties/${organization.slug}/`,
          label: organization.name,
          kind: "organization",
          portrait: null,
        });
      }
      continue;
    }
    if (id.startsWith("pos:")) {
      const position = getPositionById(id);
      if (position) {
        refs.push({ id, href: `/posities/${position.slug}/`, label: position.title, kind: "position", portrait: null });
      }
      continue;
    }
    if (id.startsWith("person:")) {
      const person = getPersonById(id);
      if (person) {
        refs.push({
          id,
          href: `/personen/${person.slug}/`,
          label: person.name,
          kind: "person",
          portrait: personPortrait(person),
        });
      }
      continue;
    }
    if (id.startsWith("topic:")) {
      const topic = topics.find((entry) => entry.id === id);
      if (topic) {
        refs.push({ id, href: `/onderwerpen/${topic.slug}/`, label: topic.name, kind: "topic", portrait: null });
      }
    }
  }
  for (const id of item.topics ?? []) {
    if (seen.has(id)) continue;
    seen.add(id);
    const topic = topics.find((entry) => entry.id === id);
    if (topic) {
      refs.push({ id, href: `/onderwerpen/${topic.slug}/`, label: topic.name, kind: "topic", portrait: null });
    }
  }
  return refs;
}

export function countNewsByPublisher(items: NewsItem[]): { publisher: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.publisher, (counts.get(item.publisher) ?? 0) + 1);
  return [...counts.entries()]
    .map(([publisher, count]) => ({ publisher, count }))
    .sort((a, b) => b.count - a.count || a.publisher.localeCompare(b.publisher, "nl"));
}

export function countNewsByTopic(items: NewsItem[]): { topic: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const topic of item.topics) counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
}

export function summariseNews(items: NewsItem[]): {
  total: number;
  linked: number;
  topicOnly: number;
  unlinked: number;
  publishers: number;
} {
  let linked = 0;
  let topicOnly = 0;
  let unlinked = 0;
  const publishers = new Set<string>();
  for (const item of items) {
    publishers.add(item.publisher);
    if (item.entities.length > 0) linked += 1;
    else if (item.topics.length > 0) topicOnly += 1;
    else unlinked += 1;
  }
  return { total: items.length, linked, topicOnly, unlinked, publishers: publishers.size };
}
