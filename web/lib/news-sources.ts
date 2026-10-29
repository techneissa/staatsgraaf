import { isRelevantNews, outlets } from "./news";
import type { NewsLanguage, NewsItem, PublisherKind } from "./types";

/** One entry of pipelines/feeds.json ( point 1). */
export type NewsFeed = {
  url: string;
  publisher: string;
  language: NewsLanguage;
  publisherKind: PublisherKind;
  license: string | null;
  status: number | null;
  retrieved: string | null;
  enabled: boolean;
  notes: string | null;
};

/** A named gap of the registry: a feed that could not be verified. */
export type NewsFeedGap = { url: string; why: string; resume: string };

export type NewsSourceRow = {
  publisher: string;
  kind: PublisherKind;
  languages: NewsLanguage[];
  count: number;
  /** Items of this outlet that name the state (). */
  relevant: number;
  /** Licences recorded on the outlet's source records. */
  licenses: string[];
  latest: string | null;
  /** The outlet's own website, taken from where its items link to; null when it has no items. */
  site: string | null;
  feed: NewsFeed | null;
};

/** The most common origin of the item links of one outlet, for example "https://nos.nl". */
export function outletSite(items: Pick<NewsItem, "publisher" | "url">[], publisher: string): string | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.publisher !== publisher) continue;
    try {
      const origin = new URL(item.url).origin;
      counts.set(origin, (counts.get(origin) ?? 0) + 1);
    } catch {
      // A malformed link is not counted.
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

/**
 * One row per outlet in the data or the registry: counts from the data, feed status from
 * the registry. A feed without items (a disabled one) stays a row, so a gap is visible
 * (NW-20). `licenseFor` supplies the licences of an item's source records.
 */
export function buildSourceRows(
  items: NewsItem[],
  feeds: NewsFeed[],
  gaps: NewsFeedGap[],
  licenseFor?: (item: NewsItem) => string[],
): { rows: NewsSourceRow[]; gaps: NewsFeedGap[] } {
  const known = outlets(items, licenseFor);
  // An outlet can have several feeds (NOS algemeen and NOS politiek): the row shows the first
  // enabled one, or the first at all when every feed of the outlet is disabled.
  const byFeed = new Map<string, NewsFeed>();
  for (const feed of feeds) {
    const current = byFeed.get(feed.publisher);
    if (current === undefined || (!current.enabled && feed.enabled)) byFeed.set(feed.publisher, feed);
  }
  const rows: NewsSourceRow[] = known.map((outlet) => ({
    publisher: outlet.publisher,
    kind: outlet.kind,
    languages: outlet.languages,
    count: outlet.count,
    relevant: items.filter((item) => item.publisher === outlet.publisher && isRelevantNews(item)).length,
    licenses: outlet.licenses,
    latest: outlet.latest,
    site: outletSite(items, outlet.publisher),
    feed: byFeed.get(outlet.publisher) ?? null,
  }));
  const present = new Set(rows.map((row) => row.publisher));
  for (const feed of feeds) {
    if (present.has(feed.publisher)) continue;
    rows.push({
      publisher: feed.publisher,
      kind: feed.publisherKind,
      languages: [feed.language],
      count: 0,
      relevant: 0,
      licenses: [],
      latest: null,
      site: null,
      feed,
    });
  }
  rows.sort((a, b) => b.count - a.count || a.publisher.localeCompare(b.publisher, "nl"));
  return { rows, gaps };
}
