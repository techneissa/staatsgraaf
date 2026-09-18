import {
  getDataset,
  getDatasetDate,
  getOrganizationById,
  getPersonById,
  getPositionById,
  getSourceById,
} from "./data";
import type { NewsItem, Source } from "./types";

export const NEWS_HOME_LIMIT = 6;
export const NEWS_PAGE_SIZE = 8;

export type NewsEntityRef = {
  id: string;
  href: string;
  label: string;
  kind: "organization" | "position" | "person" | "topic";
};

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

export function resolveNewsEntities(item: NewsItem): NewsEntityRef[] {
  const refs: NewsEntityRef[] = [];
  const seen = new Set<string>();
  for (const id of item.entities) {
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
        });
      }
      continue;
    }
    if (id.startsWith("pos:")) {
      const position = getPositionById(id);
      if (position) {
        refs.push({ id, href: `/posities/${position.slug}/`, label: position.title, kind: "position" });
      }
      continue;
    }
    if (id.startsWith("person:")) {
      const person = getPersonById(id);
      if (person) {
        refs.push({ id, href: `/personen/${person.slug}/`, label: person.name, kind: "person" });
      }
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
