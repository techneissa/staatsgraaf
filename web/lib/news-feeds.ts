import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { NewsFeed, NewsFeedGap } from "./news-sources";

/**
 * The feed registry (pipelines/feeds.json), read at build time. Server only. Walks up
 * from the working directory like lib/data.ts, because the web app builds from web/
 * and the tests run from the repository root.
 */
function findRegistry(): string | null {
  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, "pipelines", "feeds.json");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

let cached: { feeds: NewsFeed[]; gaps: NewsFeedGap[] } | null = null;

export function getNewsFeedRegistry(): { feeds: NewsFeed[]; gaps: NewsFeedGap[] } {
  if (cached) return cached;
  const file = findRegistry();
  if (file === null) return (cached = { feeds: [], gaps: [] });
  const raw = JSON.parse(readFileSync(file, "utf8")) as { feeds?: Partial<NewsFeed>[]; gaps?: Partial<NewsFeedGap>[] };
  const feeds: NewsFeed[] = (raw.feeds ?? [])
    .filter((feed) => typeof feed.publisher === "string" && typeof feed.url === "string")
    .map((feed) => ({
      url: feed.url as string,
      publisher: feed.publisher as string,
      language: feed.language === "en" ? "en" : "nl",
      publisherKind: feed.publisherKind ?? "online",
      license: typeof feed.license === "string" ? feed.license : null,
      status: typeof feed.status === "number" ? feed.status : null,
      retrieved: typeof feed.retrieved === "string" ? feed.retrieved : null,
      enabled: feed.enabled === true,
      notes: typeof feed.notes === "string" ? feed.notes : null,
    }));
  const gaps: NewsFeedGap[] = (raw.gaps ?? [])
    .filter((gap) => typeof gap.url === "string")
    .map((gap) => ({ url: gap.url as string, why: gap.why ?? "", resume: gap.resume ?? "" }));
  return (cached = { feeds, gaps });
}
