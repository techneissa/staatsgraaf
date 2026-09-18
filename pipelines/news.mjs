#!/usr/bin/env bun
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildGazetteer, buildTopicIndex, linkArticle } from "./link.mjs";
import { applyLicenses, applyNewsFactsNote } from "./licenses.mjs";

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export const RETENTION_DAYS = 30;
export const THROTTLE_MS = 1000;
export const MAX_RETRIES = 2;
export const MAX_SUMMARY_LENGTH = 320;
export const DEFAULT_FEED_LANGUAGE = "nl";
export const DEFAULT_PUBLISHER_KIND = "online";
export const MAX_KEYWORDS = 8;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_FEEDS = join(ROOT, "research", "J-nieuwsbronnen.json");
const DEFAULT_FEEDS_REGISTRY = join(ROOT, "pipelines", "feeds.json");
const DEFAULT_TOPICS = join(ROOT, "research", "K-topics.json");
const DEFAULT_CACHE = join(ROOT, "pipelines", ".cache", "news");
const DEFAULT_DATA = join(ROOT, "data");

export function decodeEntities(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'");
}

export function unwrapCdata(value) {
  const trimmed = String(value ?? "").trim();
  const match = trimmed.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return match ? match[1] : trimmed;
}

export function stripHtml(value) {
  return decodeEntities(unwrapCdata(value))
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(block, tag) {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = block.match(pattern);
  return match ? match[1] : null;
}

function firstLink(block) {
  const atom = block.match(/<link[^>]*\shref="([^"]+)"/i);
  if (atom) return decodeEntities(atom[1]).trim();
  const text = tagValue(block, "link");
  return stripHtml(text ?? "");
}

function firstImage(block) {
  const enclosure = block.match(/<enclosure[^>]*\surl="([^"]+)"/i);
  if (enclosure) return decodeEntities(enclosure[1]).trim();
  const content = block.match(/<media:content[^>]*\surl="([^"]+)"/i);
  if (content) return decodeEntities(content[1]).trim();
  const thumbnail = block.match(/<media:thumbnail[^>]*\surl="([^"]+)"/i);
  if (thumbnail) return decodeEntities(thumbnail[1]).trim();
  const encoded = tagValue(block, "content:encoded");
  if (encoded) {
    const img = encoded.match(/<img[^>]*\ssrc="([^"]+)"/i);
    if (img) return decodeEntities(img[1]).trim();
  }
  return null;
}

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeDate(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Date.parse(value.trim());
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

export function normalizeUrl(url) {
  if (typeof url !== "string" || url.trim() === "") return null;
  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  parsed.hash = "";
  const drop = [];
  for (const key of parsed.searchParams.keys()) {
    if (key.toLowerCase().startsWith("utm_") || ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(key.toLowerCase())) {
      drop.push(key);
    }
  }
  for (const key of drop) parsed.searchParams.delete(key);
  parsed.hostname = parsed.hostname.toLowerCase();
  let result = parsed.toString();
  if (result.endsWith("/") && parsed.pathname !== "/") result = result.slice(0, -1);
  return result;
}

export function parseFeed(xml, { publisher = "", feedUrl = "" } = {}) {
  if (typeof xml !== "string") return [];
  const items = [];
  const itemPattern = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  const entryPattern = /<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi;
  for (const pattern of [itemPattern, entryPattern]) {
    let match;
    while ((match = pattern.exec(xml)) !== null) {
      const block = match[1];
      const title = stripHtml(tagValue(block, "title") ?? "");
      const url = normalizeUrl(firstLink(block));
      if (!title || !url) continue;
      const descriptionRaw =
        tagValue(block, "description") ??
        tagValue(block, "summary") ??
        tagValue(block, "content:encoded") ??
        "";
      const publishedRaw =
        tagValue(block, "pubDate") ?? tagValue(block, "published") ?? tagValue(block, "updated") ?? tagValue(block, "dc:date");
      items.push({
        title: normalizeWhitespace(decodeEntities(title)),
        url,
        publisher,
        feedUrl,
        lede: stripHtml(descriptionRaw),
        published: normalizeDate(unwrapCdata(publishedRaw ?? "")),
        image: firstImage(block),
      });
    }
  }
  return items;
}

function sameTitleAndLede(title, lede) {
  const clean = (value) =>
    normalizeText(value).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  return clean(title) === clean(lede);
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").toLowerCase();
}

export function splitSentences(text) {
  const value = normalizeWhitespace(text);
  if (value === "") return [];
  const protectedText = value.replace(/\b(dhr|mevr|mr|dr|prof|ir|drs|ca|o\.a|etc|vs|bijv|bv|nv)\./gi, "$1<DOT>");
  const parts = protectedText
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.replace(/<DOT>/g, ".").trim())
    .filter(Boolean);
  return parts;
}

export function truncate(value, max = MAX_SUMMARY_LENGTH) {
  const text = normalizeWhitespace(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[,;:\s]+$/, "")}...`;
}

const SUMMARY_STOPWORDS = new Set([
  "aan", "af", "al", "als", "bij", "dan", "dat", "de", "den", "der", "des", "die", "dit",
  "een", "en", "er", "het", "in", "is", "je", "kan", "maar", "met", "na", "naar", "niet",
  "of", "om", "onder", "op", "over", "te", "tot", "uit", "van", "voor", "was", "we", "wordt",
  "worden", "ze", "zich", "zij", "zijn", "zo", "ook", "nog", "meer", "dit", "deze", "door",
]);

export function keyTerms(text, { exclude = [], limit = 3 } = {}) {
  const excludeSet = new Set(exclude.map((value) => normalizeText(value)));
  const seen = new Set();
  const scored = [];
  const words = normalizeWhitespace(text).split(/[^0-9A-Za-zÀ-ÿ'’-]+/).filter(Boolean);
  for (const raw of words) {
    const word = raw.replace(/^['’-]+|['’-]+$/g, "");
    const key = normalizeText(word);
    if (key.length < 4 || key.length > 22 || SUMMARY_STOPWORDS.has(key) || seen.has(key) || excludeSet.has(key)) continue;
    if (!/[a-zà-ÿ]/.test(word)) continue;
    seen.add(key);
    const capitalized = /^[A-ZÀ-Þ]/.test(word);
    scored.push({ word: capitalized ? word : key, key, score: word.length + (capitalized ? 2 : 0) });
  }
  scored.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return scored.slice(0, limit).map((entry) => entry.word);
}

function dutchList(terms) {
  if (terms.length === 0) return "";
  if (terms.length === 1) return terms[0];
  if (terms.length === 2) return `${terms[0]} en ${terms[1]}`;
  return `${terms.slice(0, -1).join(", ")} en ${terms[terms.length - 1]}`;
}

export function buildSummary({ publisher, title, lede, ledeUsed = true }) {
  const cleanTitle = normalizeWhitespace(title);
  if (cleanTitle === "") return null;
  const sentences = [`${publisher} bericht: "${cleanTitle}"`];
  if (ledeUsed && typeof lede === "string" && lede.trim() !== "" && !sameTitleAndLede(cleanTitle, lede)) {
    const terms = keyTerms(lede, { exclude: keyTerms(cleanTitle, { limit: 4 }) });
    if (terms.length > 0) {
      sentences.push(`Volgens de inleiding gaat het onder meer om ${dutchList(terms)}.`);
    }
  }
  return truncate(sentences.join(" "));
}

export function dedupeItems(items) {
  const byUrl = new Map();
  for (const item of items) {
    if (!item || !item.url) continue;
    const existing = byUrl.get(item.url);
    if (!existing) {
      byUrl.set(item.url, item);
      continue;
    }
    const existingDate = existing.published ?? "";
    const itemDate = item.published ?? "";
    if (itemDate > existingDate) byUrl.set(item.url, { ...existing, ...item });
  }
  return [...byUrl.values()];
}

export function withinWindow(item, sinceIso) {
  if (!item.published) return false;
  return item.published >= sinceIso;
}

export function hashString(value) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

export function sourceIdFor(url) {
  return `src:news-${hashString(url)}`;
}

export function makeIdFactory(prefix = "news") {
  const used = new Set();
  return (url) => {
    const base = `${prefix}:${hashString(url)}`;
    let id = base;
    let counter = 2;
    while (used.has(id)) {
      id = `${base}-${counter}`;
      counter += 1;
    }
    used.add(id);
    return id;
  };
}

export function keywordsFromMatches(matches, limit = MAX_KEYWORDS) {
  const keywords = [];
  const seen = new Set();
  for (const match of matches ?? []) {
    if (!match || match.confidence !== "high") continue;
    const alias = match.alias;
    if (typeof alias !== "string" || alias === "" || seen.has(alias)) continue;
    seen.add(alias);
    keywords.push(alias);
    if (keywords.length >= limit) break;
  }
  return keywords;
}

async function fetchWithRetry(url, { userAgent = DEFAULT_USER_AGENT, retries = MAX_RETRIES, fetchImpl = fetch } = {}) {
  let attempt = 0;
  let lastError = null;
  while (attempt <= retries) {
    attempt += 1;
    try {
      const response = await fetchImpl(url, {
        headers: { "User-Agent": userAgent, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
        redirect: "follow",
      });
      if (response.status === 200) return { ok: true, body: await response.text(), status: 200 };
      if (response.status === 403 || response.status === 401 || response.status === 402) {
        return { ok: false, status: response.status, error: `blocked (${response.status})` };
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    if (attempt <= retries) await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS * attempt));
  }
  return { ok: false, status: 0, error: lastError ?? "unknown" };
}

export async function fetchFeeds({
  feedConfigs,
  cacheDir = DEFAULT_CACHE,
  userAgent = DEFAULT_USER_AGENT,
  throttleMs = THROTTLE_MS,
  offline = false,
  fetchImpl = fetch,
  now = new Date(),
  log = () => {},
}) {
  await mkdir(cacheDir, { recursive: true });
  const results = [];
  for (const [index, feed] of feedConfigs.entries()) {
    const safeName = feed.publisher
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const cacheFile = join(cacheDir, `${safeName}-${hashString(feed.url)}.xml`);
    let body = null;
    let status = "cache";
    let error = null;
    if (offline) {
      if (existsSync(cacheFile)) {
        body = await readFile(cacheFile, "utf8");
      } else {
        status = "missing";
        error = "no cached copy and offline mode is on";
      }
    } else {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, throttleMs));
      const response = await fetchWithRetry(feed.url, { userAgent, fetchImpl });
      if (response.ok) {
        body = response.body;
        status = "fetched";
        await writeFile(cacheFile, body, "utf8");
      } else {
        status = "failed";
        error = response.error;
        if (existsSync(cacheFile)) {
          body = await readFile(cacheFile, "utf8");
          status = "stale-cache";
        }
      }
    }
    const items = body ? parseFeed(body, { publisher: feed.publisher, feedUrl: feed.url }) : [];
    results.push({ ...feed, cacheFile, status, error, items });
    log(`  ${feed.publisher.padEnd(22)} ${status.padEnd(12)} ${String(items.length).padStart(3)} item(s)`);
  }
  return results;
}

export async function runNewsPipeline({
  feedsPath = DEFAULT_FEEDS_REGISTRY,
  aliasPath = DEFAULT_FEEDS,
  topicsPath = DEFAULT_TOPICS,
  cacheDir = DEFAULT_CACHE,
  dataDir = DEFAULT_DATA,
  offline = false,
  registerSources = true,
  now = new Date(),
  userAgent = DEFAULT_USER_AGENT,
  fetchImpl = fetch,
  log = console.log,
} = {}) {
  const loaded = existsSync(feedsPath) ? JSON.parse(await readFile(feedsPath, "utf8")) : null;
  const usesRegistry = Array.isArray(loaded?.feeds);
  const feedEnvelope = usesRegistry ? loaded : loaded ?? JSON.parse(await readFile(DEFAULT_FEEDS, "utf8"));
  const feedConfigs = feedConfigsFromEnvelope(feedEnvelope);
  const configByFeedUrl = new Map(feedConfigs.map((config) => [config.url, config]));

  const topicEnvelope = existsSync(topicsPath) ? JSON.parse(await readFile(topicsPath, "utf8")) : { topics: [] };
  const topicIndex = buildTopicIndex(topicEnvelope.topics ?? []);
  const topicsById = new Map((topicEnvelope.topics ?? []).map((topic) => [topic.id, topic]));

  const aliasEnvelope = usesRegistry
    ? existsSync(aliasPath)
      ? JSON.parse(await readFile(aliasPath, "utf8"))
      : { aliases: [] }
    : feedEnvelope;
  const gazetteer = buildGazetteer(aliasEnvelope.aliases ?? []);

  log(`Fetching ${feedConfigs.length} feed(s) with a ${THROTTLE_MS} ms throttle${offline ? " (offline/cache mode)" : ""}`);
  const feedResults = await fetchFeeds({ feedConfigs, cacheDir, userAgent, offline, fetchImpl, now, log });

  const allItems = [];
  const feedReport = [];
  for (const result of feedResults) {
    const report = {
      publisher: result.publisher,
      url: result.url,
      status: result.status,
      error: result.error,
      itemCount: result.items.length,
    };
    for (const item of result.items) {
      allItems.push({
        ...item,
        language: result.language ?? DEFAULT_FEED_LANGUAGE,
        publisherKind: result.publisherKind ?? DEFAULT_PUBLISHER_KIND,
      });
    }
    feedReport.push(report);
  }

  const deduped = dedupeItems(allItems);
  const publishedDates = deduped.map((item) => item.published).filter(Boolean).sort();
  const latest = publishedDates[publishedDates.length - 1] ?? now.toISOString();
  const since = new Date(Date.parse(latest) - RETENTION_DAYS * 86_400_000).toISOString();
  const kept = deduped.filter((item) => withinWindow(item, since));

  const idFor = makeIdFactory();
  const news = [];
  const sourceRecords = [];
  const seenSources = new Set();
  const knownSourceByUrl = await sourceIdsByUrl(dataDir);
  let highConfidenceItems = 0;
  let entityHits = 0;
  let fallbackTopics = 0;

  for (const item of kept) {
    const link = linkArticle({ title: item.title, text: item.lede ?? "", gazetteer, topicIndex });
    if (link.highMatches > 0) {
      highConfidenceItems += 1;
      entityHits += link.highMatches;
    }
    if (link.fallbackTopics.length > 0) fallbackTopics += 1;
    const srcId = knownSourceByUrl.get(item.url) ?? sourceIdFor(item.url);
    if (!knownSourceByUrl.has(item.url) && !seenSources.has(srcId)) {
      seenSources.add(srcId);
      sourceRecords.push({
        id: srcId,
        url: item.url,
        title: item.title,
        publisher: item.publisher,
        type: "news",
        published: item.published ? item.published.slice(0, 10) : null,
        retrieved: now.toISOString().slice(0, 10),
        license: configByFeedUrl.get(item.feedUrl)?.license ?? null,
        archiveUrl: null,
        notes: `Kop en inleiding uit de RSS-feed van ${item.publisher}. Samenvatting is een originele Nederlandse weergave van kop en inleiding; niets buiten de feed is beweerd.`,
      });
    }
    news.push({
      id: idFor(item.url),
      title: item.title,
      url: item.url,
      publisher: item.publisher,
      language: item.language ?? DEFAULT_FEED_LANGUAGE,
      publisherKind: item.publisherKind ?? DEFAULT_PUBLISHER_KIND,
      published: item.published,
      summary: buildSummary({ publisher: item.publisher, title: item.title, lede: item.lede, ledeUsed: true }),
      summaryMarkup: link.summaryMarkup,
      entities: link.entities,
      topics: link.topics,
      keywords: keywordsFromMatches(link.matches),
      image: null,
      sources: [{ source: srcId, retrieved: now.toISOString().slice(0, 10), confidence: "high" }],
    });
  }

  applyLicenses(sourceRecords);
  for (const record of sourceRecords) applyNewsFactsNote(record);

  news.sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id));
  sourceRecords.sort((a, b) => a.id.localeCompare(b.id));

  const sourcesOutPath = join(cacheDir, "sources.json");
  await writeFile(sourcesOutPath, `${JSON.stringify(sourceRecords, null, 2)}\n`, "utf8");
  await writeFile(join(dataDir, "news.json"), `${JSON.stringify(news, null, 2)}\n`, "utf8");

  let registeredSources = 0;
  let updatedSources = 0;
  let prunedSources = 0;
  if (registerSources) {
    const referencedIds = new Set(news.flatMap((item) => item.sources.map((ref) => ref.source)));
    const handled = await registerSourceRecords({ dataDir, sourceRecords, referencedIds, now });
    registeredSources = handled.added;
    updatedSources = handled.updated;
    prunedSources = handled.pruned;
  }

  const stats = {
    feeds: feedConfigs.length,
    feedsOk: feedReport.filter((report) => report.status === "fetched" || report.status === "cache").length,
    rawItems: allItems.length,
    dedupedItems: deduped.length,
    keptItems: news.length,
    highConfidenceItems,
    entityHits,
    topicOnlyItems: news.filter((item) => item.entities.length === 0 && item.topics.length > 0).length,
    fallbackTopics,
    noLinkItems: news.filter((item) => item.entities.length === 0 && item.topics.length === 0).length,
    sourceRecords: sourceRecords.length,
    registeredSources,
    updatedSources,
    prunedSources,
    since,
    latest,
  };

  log("");
  log(`Kept ${news.length} item(s) published on or after ${since.slice(0, 10)} (${RETENTION_DAYS}-day window).`);
  log(`Entity linker: ${entityHits} high-confidence hit(s) across ${highConfidenceItems} article(s).`);
  log(`Topic fallback: ${fallbackTopics} article(s) assigned a topic with no entity; ${stats.topicOnlyItems} article(s) end up topic-only.`);
  log(`Wrote ${join(dataDir, "news.json")} and ${sourceRecords.length} article source record(s) to ${sourcesOutPath}`);
  if (registerSources) {
    log(`Registered ${registeredSources} new, refreshed ${updatedSources} and pruned ${prunedSources} article source record(s) in ${join(dataDir, "sources.json")} (per-article records keyed by url, existing catalog preserved).`);
  } else {
    log("Source registration is off; run the merge with the emitted sources file before validating news.json.");
  }

  return { news, sourceRecords, feedReport, stats, since, latest, sourcesOutPath, topicsById };
}

async function readJsonArray(file) {
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function sourceIdsByUrl(dataDir) {
  const existing = await readJsonArray(join(dataDir, "sources.json"));
  return new Map(existing.map((record) => [record.url, record.id]));
}

export async function registerSourceRecords({ dataDir, sourceRecords, referencedIds = null, now = new Date() }) {
  const file = join(dataDir, "sources.json");
  const existing = await readJsonArray(file);
  const byId = new Map(existing.map((record) => [record.id, record]));
  const byUrl = new Map(existing.map((record) => [record.url, record]));
  let added = 0;
  let updated = 0;
  for (const record of sourceRecords) {
    const current = byId.get(record.id) ?? byUrl.get(record.url);
    if (!current) {
      existing.push(structuredClone(record));
      byId.set(record.id, record);
      byUrl.set(record.url, record);
      added += 1;
      continue;
    }
    if (current.type === "news" && current.id === record.id) {
      const next = structuredClone(current);
      let changed = false;
      for (const field of ["title", "publisher", "published", "retrieved", "url"]) {
        if (record[field] != null && record[field] !== next[field]) {
          next[field] = record[field];
          changed = true;
        }
      }
      if (changed) {
        const index = existing.findIndex((item) => item.id === current.id);
        if (index >= 0) existing[index] = next;
        updated += 1;
      }
    }
  }

  let pruned = 0;
  let kept = existing;
  if (referencedIds instanceof Set) {
    kept = existing.filter((record) => {
      if (!record.id.startsWith("src:news-")) return true;
      if (referencedIds.has(record.id)) return true;
      pruned += 1;
      return false;
    });
  }
  kept.sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(file, `${JSON.stringify(kept, null, 2)}\n`, "utf8");
  return { added, updated, pruned, total: kept.length };
}

export function feedConfigsFromEnvelope(envelope) {
  if (Array.isArray(envelope?.feeds)) {
    return envelope.feeds
      .filter((feed) => feed && feed.enabled !== false)
      .map((feed) => ({
        url: feed.url,
        publisher: feed.publisher ?? feedEnvelopePublisher(envelope, feed.url),
        language: feed.language ?? DEFAULT_FEED_LANGUAGE,
        publisherKind: feed.publisherKind ?? DEFAULT_PUBLISHER_KIND,
        retrieved: feed.retrieved ?? null,
        license: feed.license ?? null,
      }));
  }
  return (envelope?.endpointsUsed ?? []).map((entry) => ({
    url: entry.url,
    publisher: feedEnvelopePublisher(envelope, entry.url),
    language: DEFAULT_FEED_LANGUAGE,
    publisherKind: DEFAULT_PUBLISHER_KIND,
    retrieved: entry.retrieved ?? null,
    license: null,
  }));
}

function feedEnvelopePublisher(envelope, url) {
  const publishers = {
    "feeds.nos.nl": "NOS",
    "www.nu.nl": "NU.nl",
    "www.nrc.nl": "NRC",
    "www.ad.nl": "AD",
    "www.volkskrant.nl": "de Volkskrant",
    "www.trouw.nl": "Trouw",
    "www.parool.nl": "Het Parool",
    "fd.nl": "FD",
    "www.rtlnieuws.nl": "RTL Nieuws",
    "www.binnenlandsbestuur.nl": "Binnenlands Bestuur",
  };
  try {
    const host = new URL(url).hostname.toLowerCase();
    return publishers[host] ?? host.replace(/^www\./, "");
  } catch {
    return envelope.workstream ?? "unknown";
  }
}

function parseArgs(argv) {
  const options = {
    feedsPath: DEFAULT_FEEDS_REGISTRY,
    aliasPath: DEFAULT_FEEDS,
    topicsPath: DEFAULT_TOPICS,
    cacheDir: DEFAULT_CACHE,
    dataDir: DEFAULT_DATA,
    offline: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--feeds") options.feedsPath = argv[(i += 1)];
    else if (argv[i] === "--alias") options.aliasPath = argv[(i += 1)];
    else if (argv[i] === "--topics") options.topicsPath = argv[(i += 1)];
    else if (argv[i] === "--cache") options.cacheDir = argv[(i += 1)];
    else if (argv[i] === "--data") options.dataDir = argv[(i += 1)];
    else if (argv[i] === "--offline") options.offline = true;
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await runNewsPipeline(options);
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`news failed: ${error.message}`);
    process.exitCode = 1;
  });
}
