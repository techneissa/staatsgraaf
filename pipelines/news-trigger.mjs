// News as a trigger, never as a fact (ADR 0006 amended, ADR 0024).
//
// A headline that names a change of office holder only decides that the official
// fetchers run now instead of at their next scheduled turn. Nothing in a news
// item is ever written to the dataset by this module: the official sources stay
// the only authority. The word list is deliberately broad; a false trigger costs
// one early read of sources that are cheap to read.

import { isGovernmentUrl } from "./merge.mjs";
import { normalizeName } from "./live-util.mjs";

export const TRIGGER_WORDS = [
  "beëdigd",
  "treedt af",
  "aftreden",
  "ontslag",
  "benoemd",
  "nieuwe minister",
  "staatssecretaris",
  "verkiezingen",
  "kabinet",
  "fractievoorzitter",
  "Kamervoorzitter",
];

export const RIJKSOVERHEID_NEWS_SITEMAP = "https://www.rijksoverheid.nl/news/sitemap.xml";

const TRIGGER_KEYS = TRIGGER_WORDS.map((word) => ({ word, key: normalizeName(word) }));

/** Trigger words found in a text, matched on whole words with accents and case ignored. */
export function matchTriggerWords(text) {
  const haystack = ` ${normalizeName(String(text ?? ""))} `;
  return TRIGGER_KEYS.filter(({ key }) => haystack.includes(` ${key} `) || haystack.includes(` ${key}s `)).map(({ word }) => word);
}

// isGovernmentUrl (merge.mjs) does not list rijksoverheid.nl, so the outlets this trigger trusts are named here too.
const OFFICIAL_HOSTS = ["rijksoverheid.nl", "government.nl", "tweedekamer.nl", "eerstekamer.nl", "kiesraad.nl"];

function isOfficialUrl(url) {
  if (typeof url !== "string") return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return OFFICIAL_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`)) || isGovernmentUrl(url);
  } catch {
    return false;
  }
}

function isOfficial(item) {
  return item.official === true || item.publisherKind === "overheid" || isOfficialUrl(item.url);
}

function hasKnownEntity(item) {
  return Array.isArray(item.entities) && item.entities.length > 0;
}

/**
 * Should the official fetchers run early?
 * @param newsItems items with { id, title, summary?, url, published, entities?, publisherKind? }
 * @param lastRun ISO timestamp of the last run, or null (then only the last 24 hours count)
 * @param options { now } for the null case
 * @returns { run, reason, matches }
 */
export function shouldRunEarly(newsItems, lastRun, { now = new Date() } = {}) {
  const since = lastRun ?? new Date(now.getTime() - 24 * 3_600_000).toISOString();
  const matches = [];
  for (const item of newsItems ?? []) {
    if (!item || typeof item.published !== "string" || item.published <= since) continue;
    const words = matchTriggerWords(`${item.title ?? ""} ${item.summary ?? ""}`);
    if (words.length === 0) continue;
    const official = isOfficial(item);
    const known = hasKnownEntity(item);
    if (!official && !known) continue;
    matches.push({ id: item.id ?? item.url, title: item.title ?? "", words, why: official ? "officiële bron" : "koppeling aan een bekende entiteit" });
  }
  if (matches.length === 0) return { run: false, reason: null, matches };
  const first = matches[0];
  return {
    run: true,
    reason: `${matches.length} nieuwsbericht(en) sinds ${since} met een triggerwoord (${[...new Set(matches.flatMap((m) => m.words))].join(", ")}), bijvoorbeeld "${first.title}" (${first.why}); de officiële bronnen worden nu vroeg uitgelezen`,
    matches,
  };
}

/** The Google News sitemap of rijksoverheid.nl as news-like items; the lastmod counts as the publication time. */
export function parseNewsSitemap(xml) {
  const items = [];
  for (const match of String(xml ?? "").matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = match[1];
    const url = (/<loc>([^<]+)<\/loc>/.exec(block) || [])[1];
    const title = (/<news:title>([\s\S]*?)<\/news:title>/.exec(block) || [])[1];
    const published = (/<news:publication_date>([^<]+)<\/news:publication_date>/.exec(block) || [])[1] ?? (/<lastmod>([^<]+)<\/lastmod>/.exec(block) || [])[1];
    if (!url || !title || !published) continue;
    items.push({
      id: url,
      title: title.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim(),
      url,
      published,
      publisherKind: "overheid",
      official: true,
      entities: [],
    });
  }
  return items;
}

export async function fetchNewsSitemap(http) {
  const response = await http.get(RIJKSOVERHEID_NEWS_SITEMAP, { accept: "application/xml" });
  if (!response.ok) return { items: [], status: response.status };
  return { items: parseNewsSitemap(response.text), status: response.status };
}
