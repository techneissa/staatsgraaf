import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  allowedImageHosts,
  amsterdamWallToUtcMs,
  buildSummary,
  carryOverItems,
  dedupeItems,
  feedConfigsFromEnvelope,
  fetchFeeds,
  imageHostAllowed,
  isExcludedUrl,
  isRelevantStored,
  itemKeywords,
  itemScope,
  keywordsFromMatches,
  makeIdFactory,
  normalizeDate,
  normalizeUrl,
  parseFeed,
  parseNewsSitemap,
  sourceIdFor,
  splitSentences,
  truncate,
  withinWindow,
} from "./news.mjs";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Testfeed</title>
    <item>
      <title><![CDATA[Epe houdt vast aan dwangsom COA]]></title>
      <link>https://example.nl/nieuws/epe-coa?utm_source=rss&amp;utm_medium=feed</link>
      <description><![CDATA[<p>De <b>gemeente Epe</b> wil dat de opvanglocatie sluit. Het COA reageert later.</p>]]></description>
      <pubDate>Fri, 18 Sep 2026 00:58:13 +0200</pubDate>
      <media:content type="image/jpeg" url="https://example.nl/img/epe.jpg" />
    </item>
    <item>
      <title>Ministerie van Financien licht begroting toe</title>
      <link>https://example.nl/nieuws/begroting</link>
      <description>Het ministerie geeft uitleg aan de Tweede Kamer.</description>
      <pubDate>Thu, 17 Sep 2026 19:10:00 +0200</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atomfeed</title>
  <entry>
    <title>Provincie Fryslan test donoren</title>
    <link rel="alternate" href="https://example.org/artikel/1" />
    <summary>De provincie start een test.</summary>
    <published>2026-09-17T20:02:21Z</published>
    <updated>2026-09-17T20:05:00Z</updated>
  </entry>
</feed>`;

test("parseFeed reads RSS items, strips HTML and decodes entities", () => {
  const items = parseFeed(RSS, { publisher: "Testkrant", feedUrl: "https://example.nl/rss.xml" });
  assert.equal(items.length, 2);
  const first = items[0];
  assert.equal(first.title, "Epe houdt vast aan dwangsom COA");
  assert.equal(first.url, "https://example.nl/nieuws/epe-coa");
  assert.equal(first.publisher, "Testkrant");
  assert.equal(first.lede, "De gemeente Epe wil dat de opvanglocatie sluit. Het COA reageert later.");
  assert.equal(first.published, "2026-09-17T22:58:13.000Z");
  assert.equal(first.image, "https://example.nl/img/epe.jpg");
});

test("parseFeed reads an Atom entry", () => {
  const items = parseFeed(ATOM, { publisher: "Atomkrant", feedUrl: "https://example.org/feed" });
  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://example.org/artikel/1");
  assert.equal(items[0].published, "2026-09-17T20:02:21.000Z");
});

test("parseFeed skips items without a title or link", () => {
  const xml = `<rss><channel><item><title>Zonder link</title></item><item><link>https://a.nl/x</link></item></channel></rss>`;
  assert.deepEqual(parseFeed(xml, { publisher: "X" }), []);
});

test("normalizeUrl strips tracking parameters and fragments", () => {
  assert.equal(
    normalizeUrl("https://Example.nl/nieuws/x/?utm_source=rss&fbclid=1#top"),
    "https://example.nl/nieuws/x",
  );
  assert.equal(normalizeUrl("niet een url"), null);
});

test("normalizeDate converts feed dates to ISO and rejects junk", () => {
  assert.equal(normalizeDate("Fri, 18 Sep 2026 00:58:13 +0200"), "2026-09-17T22:58:13.000Z");
  assert.equal(normalizeDate("2026-09-17T20:02:21Z"), "2026-09-17T20:02:21.000Z");
  assert.equal(normalizeDate("geen datum"), null);
  // NL Times: Amsterdam wall-clock time without a zone (CEST in September, CET in January).
  assert.equal(normalizeDate("24 September 2026 - 21:30"), "2026-09-24T19:30:00.000Z");
  assert.equal(normalizeDate("5 January 2026 - 09:05"), "2026-01-05T08:05:00.000Z");
  assert.equal(normalizeDate(""), null);
});

test("dedupeItems keeps one item per URL and prefers the newest", () => {
  const items = [
    { url: "https://a.nl/1", published: "2026-09-17T10:00:00.000Z", title: "Oud" },
    { url: "https://a.nl/1", published: "2026-09-17T12:00:00.000Z", title: "Nieuw" },
    { url: "https://a.nl/2", published: "2026-09-17T11:00:00.000Z", title: "Twee" },
  ];
  const result = dedupeItems(items);
  assert.equal(result.length, 2);
  assert.equal(result.find((item) => item.url === "https://a.nl/1").title, "Nieuw");
});

test("withinWindow keeps only items inside the retention window", () => {
  const since = "2026-08-19T00:00:00.000Z";
  assert.equal(withinWindow({ published: "2026-09-17T00:00:00.000Z" }, since), true);
  assert.equal(withinWindow({ published: "2026-08-01T00:00:00.000Z" }, since), false);
  assert.equal(withinWindow({ published: null }, since), false);
});

test("sourceIdFor is deterministic and stable", () => {
  const id = sourceIdFor("https://example.nl/nieuws/epe");
  assert.match(id, /^src:news-[0-9a-f]+$/);
  assert.equal(id, sourceIdFor("https://example.nl/nieuws/epe"));
});

test("makeIdFactory deduplicates suspicious hash collisions", () => {
  const factory = makeIdFactory();
  const first = factory("https://a.nl/1");
  const second = factory("https://a.nl/1");
  assert.match(first, /^news:[0-9a-f]+$/);
  assert.notEqual(first, second);
});

test("buildSummary states the publisher, the headline and a derived lede sentence", () => {
  const summary = buildSummary({
    publisher: "NOS",
    title: "Epe houdt vast aan dwangsom COA",
    lede: "De gemeente Epe wil dat de opvanglocatie sluit.",
  });
  assert.match(summary, /^NOS bericht: "Epe houdt vast aan dwangsom COA"/);
  assert.match(summary, /Volgens de inleiding gaat het onder meer om/);
  assert.match(summary, /opvanglocatie/);
});

test("buildSummary does not assert anything when there is no lede", () => {
  const summary = buildSummary({
    publisher: "NOS",
    title: "Epe houdt vast aan dwangsom COA",
    lede: "",
  });
  assert.equal(summary, 'NOS bericht: "Epe houdt vast aan dwangsom COA"');
});

test("buildSummary can omit the lede and returns null without a title", () => {
  assert.equal(
    buildSummary({ publisher: "AD", title: "Kort bericht", lede: "", ledeUsed: false }),
    'AD bericht: "Kort bericht"',
  );
  assert.equal(buildSummary({ publisher: "AD", title: "", lede: "iets" }), null);
});

test("truncate cuts on a word boundary and marks the cut", () => {
  const long = "een ".repeat(200);
  const result = truncate(long, 40);
  assert.ok(result.length <= 43);
  assert.ok(result.endsWith("..."));
});

test("splitSentences keeps abbreviations together", () => {
  const sentences = splitSentences("De heer dr. Jansen spreekt. Daarna volgt de Kamer.");
  assert.equal(sentences.length, 2);
  assert.equal(sentences[0], "De heer dr. Jansen spreekt.");
});

test("runNewsPipeline writes schema-shaped news and proposed sources from a fixture feed", async () => {
  const { runNewsPipeline } = await import("./news.mjs");
  const dir = await mkdtemp(join(tmpdir(), "nlgraph-news-"));
  const cacheDir = join(dir, "cache");
  const dataDir = join(dir, "data");
  await mkdir(dataDir, { recursive: true });

  const feedsPath = join(dir, "feeds.json");
  await writeFile(
    feedsPath,
    JSON.stringify({ workstream: "J", endpointsUsed: [{ url: "https://example.nl/rss.xml", retrieved: "2026-09-18" }], aliases: [] }),
    "utf8",
  );
  const topicsPath = join(dir, "topics.json");
  await writeFile(
    topicsPath,
    JSON.stringify({ workstream: "K", topics: [{ id: "topic:asiel-en-migratie", name: "Asiel en migratie", keywords: ["azc", "opvang"] }] }),
    "utf8",
  );

  const result = await runNewsPipeline({
    feedsPath,
    topicsPath,
    cacheDir,
    dataDir,
    userAgent: "test",
    fetchImpl: async () => new Response(RSS, { status: 200 }),
    now: new Date("2026-09-18T06:00:00Z"),
    log: () => {},
  });

  assert.equal(result.stats.keptItems, 2);
  assert.equal(result.sourceRecords.length, 2);
  const news = JSON.parse(await readFile(join(dataDir, "news.json"), "utf8"));
  assert.equal(news.length, 2);
  for (const item of news) {
    assert.match(item.id, /^news:[0-9a-f]+$/);
    assert.match(item.published, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(item.sources[0].source.startsWith("src:news-"));
    assert.equal(item.image, null);
  }
  const proposed = JSON.parse(await readFile(join(cacheDir, "sources.json"), "utf8"));
  assert.equal(proposed.length, 2);
  assert.equal(proposed[0].type, "news");
});

test("feedConfigsFromEnvelope reads the registry, defaults language and kind, and skips disabled feeds", () => {
  const envelope = {
    generatedAt: "2026-09-18T06:00:00.000Z",
    feeds: [
      { url: "https://en.example/rss.xml", publisher: "EN Krant", language: "en", publisherKind: "krant", enabled: true },
      { url: "https://off.example/rss.xml", publisher: "Uit", enabled: false },
      { url: "https://nl.example/rss.xml", publisher: "NL Bron" },
    ],
  };
  const configs = feedConfigsFromEnvelope(envelope);
  assert.deepEqual(
    configs.map((config) => config.url),
    ["https://en.example/rss.xml", "https://nl.example/rss.xml"],
  );
  assert.equal(configs[0].language, "en");
  assert.equal(configs[0].publisherKind, "krant");
  assert.equal(configs[1].language, "nl");
  assert.equal(configs[1].publisherKind, "online");
});

test("feedConfigsFromEnvelope falls back to the J endpointsUsed envelope as nl and online", () => {
  const envelope = {
    workstream: "J",
    endpointsUsed: [{ url: "https://feeds.nos.nl/nosnieuwsalgemeen", retrieved: "2026-09-18" }],
    aliases: [],
  };
  const configs = feedConfigsFromEnvelope(envelope);
  assert.equal(configs.length, 1);
  assert.equal(configs[0].publisher, "NOS");
  assert.equal(configs[0].language, "nl");
  assert.equal(configs[0].publisherKind, "online");
  assert.equal(configs[0].license, null);
});

test("keywordsFromMatches keeps only high-confidence aliases, deduped, in order, capped at 8", () => {
  const extra = Array.from({ length: 12 }, (_, index) => ({
    alias: `Alias ${index}`,
    target: `org:extra-${index}`,
    confidence: "high",
  }));
  const matches = [
    { alias: "NOS", target: "org:nos", confidence: "high" },
    { alias: "NOS", target: "org:nos", confidence: "high" },
    { alias: "kabinet", target: "org:regering", confidence: "low" },
    { alias: "Amsterdam", target: "org:gemeente-amsterdam", confidence: "medium" },
    { alias: "COA", target: "org:coa", confidence: "high" },
    ...extra,
  ];
  const keywords = keywordsFromMatches(matches);
  assert.equal(keywords.length, 8);
  assert.deepEqual(keywords.slice(0, 2), ["NOS", "COA"]);
  assert.equal(new Set(keywords).size, 8);
  assert.ok(!keywords.includes("kabinet"));
  assert.ok(!keywords.includes("Amsterdam"));
});

test("runNewsPipeline carries language, publisherKind, keywords and feed license from feeds.json", async () => {
  const { runNewsPipeline } = await import("./news.mjs");
  const dir = await mkdtemp(join(tmpdir(), "nlgraph-news-registry-"));
  const cacheDir = join(dir, "cache");
  const dataDir = join(dir, "data");
  await mkdir(dataDir, { recursive: true });

  const feedsPath = join(dir, "feeds.json");
  await writeFile(
    feedsPath,
    JSON.stringify({
      generatedAt: "2026-09-18T06:00:00.000Z",
      notes: "test",
      feeds: [
        {
          url: "https://example.nl/rss.xml",
          publisher: "Testkrant",
          language: "en",
          publisherKind: "krant",
          license: "test-license",
          status: 200,
          retrieved: "2026-09-18",
          enabled: true,
          notes: null,
        },
        {
          url: "https://disabled.example.nl/rss.xml",
          publisher: "Uit",
          language: "nl",
          publisherKind: "online",
          enabled: false,
        },
      ],
      gaps: [],
    }),
    "utf8",
  );
  const aliasPath = join(dir, "aliases.json");
  await writeFile(aliasPath, JSON.stringify({ aliases: [] }), "utf8");
  const topicsPath = join(dir, "topics.json");
  await writeFile(
    topicsPath,
    JSON.stringify({ topics: [{ id: "topic:asiel-en-migratie", name: "Asiel en migratie", keywords: ["azc", "opvang"] }] }),
    "utf8",
  );

  const result = await runNewsPipeline({
    feedsPath,
    aliasPath,
    topicsPath,
    cacheDir,
    dataDir,
    userAgent: "test",
    fetchImpl: async () => new Response(RSS, { status: 200 }),
    now: new Date("2026-09-18T06:00:00Z"),
    log: () => {},
  });

  assert.equal(result.stats.feeds, 1);
  assert.equal(result.stats.keptItems, 2);
  const news = JSON.parse(await readFile(join(dataDir, "news.json"), "utf8"));
  for (const item of news) {
    assert.equal(item.language, "en");
    assert.equal(item.publisherKind, "krant");
    assert.ok(Array.isArray(item.keywords));
  }
  const proposed = JSON.parse(await readFile(join(cacheDir, "sources.json"), "utf8"));
  assert.equal(proposed.length, 2);
  for (const record of proposed) assert.equal(record.license, "test-license");
});

// A single-item feed with an <enclosure> image, used by the imageLicense tests below.
const IMAGE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Beeldfeed</title>
    <item>
      <title>Kabinet presenteert plan</title>
      <link>https://example.org/nieuws/plan</link>
      <description>Het kabinet licht het plan toe.</description>
      <pubDate>Fri, 18 Sep 2026 08:00:00 +0200</pubDate>
      <enclosure url="https://example.org/a.jpg" type="image/jpeg" />
    </item>
  </channel>
</rss>`;

// Rejects anything the media.schema.json shape does not allow, without pulling in an
// ajv dependency the rest of the pipeline test suite does not use.
function assertMatchesMediaSchema(record) {
  const required = ["id", "url", "type", "license", "credit", "source"];
  for (const key of required) assert.ok(key in record, `media record is missing "${key}"`);
  const allowed = new Set([...required, "author", "width", "height"]);
  for (const key of Object.keys(record)) assert.ok(allowed.has(key), `media record has unexpected property "${key}"`);
  assert.match(record.id, /^media:[a-z0-9][a-z0-9-]*$/);
  assert.match(record.url, /^(https?:\/\/|\/)/);
  assert.ok(["portrait", "logo", "photo"].includes(record.type));
  assert.ok(typeof record.license === "string" && record.license.length >= 1);
  assert.ok(typeof record.credit === "string" && record.credit.length >= 1);
  assert.match(record.source, /^src:/);
}

async function setupImageRun(feedOverrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), "nlgraph-news-image-"));
  const cacheDir = join(dir, "cache");
  const dataDir = join(dir, "data");
  const mediaDir = join(dir, "media");
  await mkdir(dataDir, { recursive: true });

  const feedsPath = join(dir, "feeds.json");
  await writeFile(
    feedsPath,
    JSON.stringify({
      generatedAt: "2026-09-18T06:00:00.000Z",
      feeds: [
        {
          url: "https://example.org/rss.xml",
          publisher: "Voorbeeldkrant",
          language: "nl",
          publisherKind: "online",
          license: "Koppen en deep links.",
          imageLicense: null,
          imageCredit: null,
          enabled: true,
          ...feedOverrides,
        },
      ],
    }),
    "utf8",
  );
  const aliasPath = join(dir, "aliases.json");
  await writeFile(aliasPath, JSON.stringify({ aliases: [] }), "utf8");
  const topicsPath = join(dir, "topics.json");
  await writeFile(topicsPath, JSON.stringify({ topics: [] }), "utf8");

  return { dir, cacheDir, dataDir, mediaDir, feedsPath, aliasPath, topicsPath };
}

test("runNewsPipeline never downloads or stores an image when imageLicense is null (rights gate)", async () => {
  const { runNewsPipeline } = await import("./news.mjs");
  const { cacheDir, dataDir, mediaDir, feedsPath, aliasPath, topicsPath } = await setupImageRun();

  const fetchImpl = async (url) => {
    if (url === "https://example.org/rss.xml") return new Response(IMAGE_RSS, { status: 200 });
    throw new Error(`unexpected fetch of ${url}: an all-rights-reserved feed must never fetch its image`);
  };

  const result = await runNewsPipeline({
    feedsPath,
    aliasPath,
    topicsPath,
    cacheDir,
    dataDir,
    mediaDir,
    headersPath: null,
    userAgent: "test",
    fetchImpl,
    now: new Date("2026-09-18T09:00:00Z"),
    log: () => {},
  });

  assert.equal(result.stats.keptItems, 1);
  assert.equal(result.stats.imagesDownloaded, 0);
  assert.equal(result.stats.imagesSkippedForRights, 1);
  assert.equal(result.mediaRecords.length, 0);

  const news = JSON.parse(await readFile(join(dataDir, "news.json"), "utf8"));
  assert.equal(news[0].image, null);
  assert.equal(news[0].imageUrl, "https://example.org/a.jpg");

  assert.equal(existsSync(join(mediaDir, "nieuws")), false);

  const media = JSON.parse(await readFile(join(dataDir, "media.json"), "utf8"));
  assert.equal(media.filter((record) => record.id.startsWith("media:nieuws-")).length, 0);
});

test("runNewsPipeline downloads and registers an image when the feed carries a license", async () => {
  const { runNewsPipeline } = await import("./news.mjs");
  const { cacheDir, dataDir, mediaDir, feedsPath, aliasPath, topicsPath } = await setupImageRun({
    imageLicense: "CC0-1.0",
  });

  const imageBytes = new Uint8Array([1, 2, 3, 4]);
  const fetchImpl = async (url) => {
    if (url === "https://example.org/rss.xml") return new Response(IMAGE_RSS, { status: 200 });
    if (url === "https://example.org/a.jpg") {
      return new Response(imageBytes, { status: 200, headers: { "content-type": "image/jpeg" } });
    }
    throw new Error(`unexpected fetch of ${url}`);
  };

  const result = await runNewsPipeline({
    feedsPath,
    aliasPath,
    topicsPath,
    cacheDir,
    dataDir,
    mediaDir,
    headersPath: null,
    userAgent: "test",
    fetchImpl,
    now: new Date("2026-09-18T09:00:00Z"),
    log: () => {},
  });

  assert.equal(result.stats.imagesDownloaded, 1);
  assert.equal(result.stats.imagesSkippedForRights, 0);
  assert.equal(result.mediaRecords.length, 1);

  const news = JSON.parse(await readFile(join(dataDir, "news.json"), "utf8"));
  const [item] = news;
  assert.ok(item.image);
  assert.equal(item.image, result.mediaRecords[0].id);
  assert.equal(item.imageUrl, "https://example.org/a.jpg");

  const files = await readdir(join(mediaDir, "nieuws"));
  assert.equal(files.length, 1);
  assert.match(files[0], /\.jpg$/);

  const [mediaRecord] = result.mediaRecords;
  assertMatchesMediaSchema(mediaRecord);
  assert.equal(mediaRecord.license, "CC0-1.0");
  assert.equal(mediaRecord.credit, "Beeld: Voorbeeldkrant");
  assert.equal(mediaRecord.url, `/media/nieuws/${files[0]}`);

  const media = JSON.parse(await readFile(join(dataDir, "media.json"), "utf8"));
  assert.deepEqual(media, [mediaRecord]);
});

test("allowedImageHosts reads the img-src hosts of the CSP line and imageHostAllowed checks a url against them", () => {
  const hosts = allowedImageHosts("/*\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src 'self'; img-src 'self' data: images.nrc.nl image.trouw.nl; font-src 'self'\n");
  assert.deepEqual([...hosts].sort(), ["image.trouw.nl", "images.nrc.nl"]);
  assert.equal(imageHostAllowed("https://images.nrc.nl/a.jpg", hosts), true);
  assert.equal(imageHostAllowed("https://sargasso.nl/a.jpg", hosts), false);
  assert.equal(imageHostAllowed("not a url", hosts), false);
  assert.equal(allowedImageHosts("nothing here").size, 0);
});

test("runNewsPipeline skips an image whose response is not one of the accepted image content types", async () => {
  const { runNewsPipeline } = await import("./news.mjs");
  const { cacheDir, dataDir, mediaDir, feedsPath, aliasPath, topicsPath } = await setupImageRun({
    imageLicense: "CC0-1.0",
  });

  const fetchImpl = async (url) => {
    if (url === "https://example.org/rss.xml") return new Response(IMAGE_RSS, { status: 200 });
    if (url === "https://example.org/a.jpg") {
      return new Response("<html>not an image</html>", { status: 200, headers: { "content-type": "text/html" } });
    }
    throw new Error(`unexpected fetch of ${url}`);
  };

  const result = await runNewsPipeline({
    feedsPath,
    aliasPath,
    topicsPath,
    cacheDir,
    dataDir,
    mediaDir,
    headersPath: null,
    userAgent: "test",
    fetchImpl,
    now: new Date("2026-09-18T09:00:00Z"),
    log: () => {},
  });

  assert.equal(result.stats.imagesDownloaded, 0);
  assert.equal(result.stats.imagesSkippedForErrors, 1);
  assert.equal(result.mediaRecords.length, 0);

  const news = JSON.parse(await readFile(join(dataDir, "news.json"), "utf8"));
  assert.equal(news[0].image, null);
  assert.equal(existsSync(join(mediaDir, "nieuws")), false);
});

test("runNewsPipeline leaves pre-existing non-nieuws media records (e.g. Wikidata portraits) untouched", async () => {
  const { runNewsPipeline } = await import("./news.mjs");
  const { cacheDir, dataDir, mediaDir, feedsPath, aliasPath, topicsPath } = await setupImageRun();

  const portrait = {
    id: "media:persoon-rutte",
    url: "https://upload.wikimedia.org/rutte.jpg",
    type: "portrait",
    license: "CC BY-SA 4.0",
    credit: "Wikimedia Commons",
    author: "Minister-president",
    source: "src:wikidata-rutte",
  };
  await writeFile(join(dataDir, "media.json"), `${JSON.stringify([portrait], null, 2)}\n`, "utf8");

  const fetchImpl = async (url) => {
    if (url === "https://example.org/rss.xml") return new Response(IMAGE_RSS, { status: 200 });
    throw new Error(`unexpected fetch of ${url}`);
  };

  await runNewsPipeline({
    feedsPath,
    aliasPath,
    topicsPath,
    cacheDir,
    dataDir,
    mediaDir,
    headersPath: null,
    userAgent: "test",
    fetchImpl,
    now: new Date("2026-09-18T09:00:00Z"),
    log: () => {},
  });

  const media = JSON.parse(await readFile(join(dataDir, "media.json"), "utf8"));
  assert.deepEqual(media, [portrait]);
});

test("isExcludedUrl matches a path prefix and nothing else on the same host", () => {
  const rules = [{ pattern: "/boulevard/", reason: "celebrity news" }];
  assert.equal(isExcludedUrl("https://www.rtlnieuws.nl/boulevard/artikel/1", rules), true);
  assert.equal(isExcludedUrl("https://www.rtlnieuws.nl/nieuws/artikel/1", rules), false);
  assert.equal(isExcludedUrl("https://www.rtlnieuws.nl/nieuws/boulevard/artikel/1", rules), false);
  assert.equal(isExcludedUrl("https://www.rtlnieuws.nl/boulevardkrant", rules), false);
  assert.equal(isExcludedUrl("not a url", rules), false);
  assert.equal(isExcludedUrl("https://www.rtlnieuws.nl/boulevard/artikel/1", []), false);
  assert.equal(isExcludedUrl("https://www.rtlnieuws.nl/boulevard/artikel/1", undefined), false);
});

test("feedConfigsFromEnvelope carries excludePaths through to the feed config", () => {
  const rules = [{ pattern: "/boulevard/", reason: "celebrity news" }];
  const configs = feedConfigsFromEnvelope({
    feeds: [{ url: "https://example.nl/rss", publisher: "Voorbeeld", enabled: true, excludePaths: rules }],
  });
  assert.deepEqual(configs[0].excludePaths, rules);
  const bare = feedConfigsFromEnvelope({ feeds: [{ url: "https://example.nl/rss", publisher: "Voorbeeld" }] });
  assert.deepEqual(bare[0].excludePaths, []);
});

test("the registry blocks RTL boulevard with a stated reason", async () => {
  const registry = JSON.parse(await readFile(new URL("./feeds.json", import.meta.url), "utf8"));
  const rtl = registry.feeds.find((feed) => feed.publisher === "RTL Nieuws");
  const rule = rtl.excludePaths.find((entry) => entry.pattern === "/boulevard/");
  assert.ok(rule && rule.reason.length > 10);
});

test("itemKeywords lists entity aliases first, then the topic evidence, without duplicates", () => {
  const link = {
    matches: [
      { alias: "minister Heinen", confidence: "high" },
      { alias: "het kabinet", confidence: "medium" },
    ],
    topicEvidence: ["box 3", "minister Heinen", "belasting"],
  };
  assert.deepEqual(itemKeywords(link, 3), ["minister Heinen", "box 3", "belasting"]);
  assert.deepEqual(itemKeywords({ matches: [], topicEvidence: ["azc"] }), ["azc"]);
  assert.deepEqual(itemKeywords({ matches: [] }), []);
});

test("parseFeed reads a wall-clock time labelled Z as Amsterdam time when the feed is flagged", () => {
  const xml = `<rss><channel><item><title>Radio</title><link>https://example.nl/a</link><pubDate>Tue, 06 Oct 2026 15:17:00 Z</pubDate></item></channel></rss>`;
  assert.equal(parseFeed(xml)[0].published, "2026-10-06T15:17:00.000Z");
  // 15:17 in Amsterdam on 06-10-2026 (CEST, UTC+2) is 13:17 UTC.
  assert.equal(parseFeed(xml, { datesAreAmsterdamLocal: true })[0].published, "2026-10-06T13:17:00.000Z");
  // In winter (CET, UTC+1) the same wall clock is one hour ahead of UTC.
  const winter = xml.replace("06 Oct 2026", "06 Jan 2026");
  assert.equal(parseFeed(winter, { datesAreAmsterdamLocal: true })[0].published, "2026-01-06T14:17:00.000Z");
  assert.equal(new Date(amsterdamWallToUtcMs(Date.UTC(2026, 9, 6, 15, 17))).toISOString(), "2026-10-06T13:17:00.000Z");
});

test("itemScope marks a politics section item unless its text points abroad", () => {
  assert.equal(itemScope("politiek", { title: "Kabinet wil mobieltjes verbannen uit scholen", lede: "" }), "politiek");
  assert.equal(itemScope("politiek", { title: "Trump dreigt met nieuwe heffingen", lede: "Het Witte Huis zegt dat" }), null);
  assert.equal(itemScope("politiek", { title: "Trump dreigt met heffingen", lede: "Ook Nederland wordt geraakt." }), "politiek");
  assert.equal(itemScope(null, { title: "Kabinet wil mobieltjes verbannen uit scholen" }), null);
  assert.equal(itemScope(undefined, { title: "x" }), null);
});

test("feedConfigsFromEnvelope carries scope and datesAreAmsterdamLocal and ignores any other scope", () => {
  const configs = feedConfigsFromEnvelope({
    feeds: [
      { url: "https://a.nl/rss", publisher: "A", scope: "politiek" },
      { url: "https://b.nl/rss", publisher: "B", scope: "sport", datesAreAmsterdamLocal: true },
      { url: "https://c.nl/rss", publisher: "C" },
    ],
  });
  assert.deepEqual(configs.map((config) => config.scope), ["politiek", null, null]);
  assert.deepEqual(configs.map((config) => config.datesAreAmsterdamLocal), [false, true, false]);
});

test("dedupeItems keeps the politics scope of a URL found in a section and a general feed", () => {
  const general = { url: "https://x.nl/a", published: "2026-10-06T10:00:00.000Z", scope: null, feedUrl: "general" };
  const section = { url: "https://x.nl/a", published: "2026-10-06T10:00:00.000Z", scope: "politiek", feedUrl: "section" };
  assert.equal(dedupeItems([general, section])[0].scope, "politiek");
  assert.equal(dedupeItems([section, general])[0].scope, "politiek");
  const newerGeneral = { ...general, published: "2026-10-06T11:00:00.000Z" };
  assert.equal(dedupeItems([section, newerGeneral])[0].scope, "politiek");
  assert.equal(dedupeItems([general])[0].scope, null);
});

test("isRelevantStored follows the same routes as the web rule", () => {
  assert.equal(isRelevantStored({ entities: ["org:x"], topics: [] }), true);
  assert.equal(isRelevantStored({ entities: [], topics: [], scope: "politiek" }), true);
  assert.equal(isRelevantStored({ entities: [], topics: [], publisherKind: "overheid" }), true);
  assert.equal(isRelevantStored({ entities: [], topics: ["topic:z"], keywords: [] }), false);
  assert.equal(isRelevantStored({ entities: [], topics: [] }), false);
});

test("carryOverItems keeps what the feeds dropped, inside the rules, and nothing else", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  const base = (id, published, extra = {}) => ({
    id: `news:${id}`,
    url: `https://x.nl/${id}`,
    publisher: "NOS",
    published,
    entities: ["org:x"],
    topics: [],
    sources: [{ source: `src:news-${id}`, retrieved: "2026-10-05", confidence: "high" }],
    ...extra,
  });
  const previous = [
    base("kept", "2026-10-04T12:00:00.000Z"),
    base("in-feed", "2026-10-05T12:00:00.000Z"),
    base("too-old", "2026-08-01T12:00:00.000Z"),
    base("future", "2026-10-08T12:00:00.000Z"),
    base("gone-outlet", "2026-10-04T12:00:00.000Z", { publisher: "Verdwenen" }),
    base("blocked", "2026-10-04T12:00:00.000Z", { url: "https://x.nl/boulevard/a" }),
    base("no-source", "2026-10-04T12:00:00.000Z", { sources: [{ source: "src:weg", retrieved: "2026-10-05", confidence: "high" }] }),
    base("old-plain", "2026-09-20T12:00:00.000Z", { entities: [] }),
    base("old-scoped", "2026-09-20T12:00:00.000Z", { entities: [], scope: "politiek" }),
    base("recent-plain", "2026-10-04T12:00:00.000Z", { entities: [] }),
  ];
  const kept = carryOverItems({
    previous,
    currentUrls: new Set(["https://x.nl/in-feed"]),
    since: "2026-09-06T12:00:00.000Z",
    irrelevantSince: "2026-09-29T12:00:00.000Z",
    now,
    publishers: new Set(["NOS"]),
    excludeByPublisher: new Map([["NOS", [{ pattern: "/boulevard/" }]]]),
    knownSourceIds: new Set(previous.filter((item) => item.id !== "news:no-source").flatMap((item) => item.sources.map((ref) => ref.source))),
  });
  assert.deepEqual(kept.map((item) => item.id), ["news:kept", "news:old-scoped", "news:recent-plain"]);
  assert.deepEqual(carryOverItems({ previous: [null, {}, { id: "a" }], currentUrls: new Set(), since: "2026-01-01", now, publishers: new Set() }), []);
});

async function newsFixture(prefix) {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  const dataDir = join(dir, "data");
  await mkdir(dataDir, { recursive: true });
  const feedsPath = join(dir, "feeds.json");
  const topicsPath = join(dir, "topics.json");
  await writeFile(topicsPath, JSON.stringify({ topics: [] }), "utf8");
  return { dir, dataDir, feedsPath, topicsPath, cacheDir: join(dir, "cache"), mediaDir: join(dir, "media") };
}

function rssOf(items) {
  return `<rss version="2.0"><channel>${items
    .map(
      (entry) =>
        `<item><title>${entry.title}</title><link>${entry.url}</link><description>${entry.lede ?? ""}</description><pubDate>${entry.date}</pubDate></item>`,
    )
    .join("")}</channel></rss>`;
}

test("runNewsPipeline keeps items the feed no longer shows, marks politics items and drops future-dated ones", async () => {
  const { runNewsPipeline } = await import("./news.mjs");
  const fx = await newsFixture("nlgraph-news-carry-");
  await writeFile(
    fx.feedsPath,
    JSON.stringify({
      feeds: [
        { url: "https://feed.test/politiek", publisher: "NOS", language: "nl", publisherKind: "publieke-omroep", license: null, enabled: true, scope: "politiek" },
        { url: "https://feed.test/algemeen", publisher: "NOS", language: "nl", publisherKind: "publieke-omroep", license: null, enabled: true },
      ],
    }),
    "utf8",
  );
  const run = (bodies, now) =>
    runNewsPipeline({
      feedsPath: fx.feedsPath,
      aliasPath: join(fx.dir, "none.json"),
      topicsPath: fx.topicsPath,
      cacheDir: fx.cacheDir,
      dataDir: fx.dataDir,
      mediaDir: fx.mediaDir,
      headersPath: null,
      userAgent: "test",
      throttleMs: 0,
      fetchImpl: async (url) => new Response(bodies[url] ?? "<rss><channel/></rss>", { status: 200 }),
      now,
      log: () => {},
    });

  const first = await run(
    {
      "https://feed.test/politiek": rssOf([
        { title: "Kabinet wil mobieltjes verbannen", url: "https://nos.test/a", date: "Mon, 05 Oct 2026 08:00:00 +0200" },
        { title: "Trump dreigt met heffingen", url: "https://nos.test/b", date: "Mon, 05 Oct 2026 09:00:00 +0200", lede: "Het Witte Huis zegt dat" },
      ]),
      "https://feed.test/algemeen": rssOf([
        { title: "Kattendieven opgerold", url: "https://nos.test/c", date: "Mon, 05 Oct 2026 10:00:00 +0200" },
        { title: "Bericht uit de toekomst", url: "https://nos.test/future", date: "Fri, 09 Oct 2026 10:00:00 +0200" },
      ]),
    },
    new Date("2026-10-05T12:00:00Z"),
  );
  assert.equal(first.stats.keptItems, 3);
  assert.equal(first.stats.futureDated, 1);
  const byUrl = (news) => new Map(news.map((item) => [item.url, item]));
  const firstNews = byUrl(first.news);
  assert.equal(firstNews.get("https://nos.test/a").scope, "politiek");
  assert.equal("scope" in firstNews.get("https://nos.test/b"), false, "a foreign story in a politics section gets no scope");
  assert.equal("scope" in firstNews.get("https://nos.test/c"), false);
  assert.equal(firstNews.has("https://nos.test/future"), false);

  // Next run: the feeds show only a new item; the earlier three roll off and are carried over.
  const second = await run(
    { "https://feed.test/algemeen": rssOf([{ title: "Nieuw bericht", url: "https://nos.test/d", date: "Tue, 06 Oct 2026 08:00:00 +0200" }]) },
    new Date("2026-10-06T12:00:00Z"),
  );
  assert.equal(second.stats.freshItems, 1);
  assert.equal(second.stats.carriedItems, 3);
  const secondNews = byUrl(second.news);
  assert.deepEqual([...secondNews.keys()].sort(), ["https://nos.test/a", "https://nos.test/b", "https://nos.test/c", "https://nos.test/d"]);
  for (const url of ["https://nos.test/a", "https://nos.test/b", "https://nos.test/c"]) {
    assert.equal(secondNews.get(url).id, firstNews.get(url).id, "a carried item keeps its id");
  }
  assert.equal(secondNews.get("https://nos.test/a").scope, "politiek");
  assert.equal(second.news[0].url, "https://nos.test/d", "the newest item sorts first");
  const written = JSON.parse(await readFile(join(fx.dataDir, "news.json"), "utf8"));
  assert.equal(written.length, 4);
  const sources = JSON.parse(await readFile(join(fx.dataDir, "sources.json"), "utf8"));
  const sourceIds = new Set(sources.map((record) => record.id));
  for (const item of written) for (const ref of item.sources) assert.ok(sourceIds.has(ref.source), `${item.url} has its source record`);

  // A feed that disappears from the registry takes its outlet's carried items with it.
  await writeFile(fx.feedsPath, JSON.stringify({ feeds: [{ url: "https://feed.test/algemeen", publisher: "Anders", enabled: true }] }), "utf8");
  const third = await run({ "https://feed.test/algemeen": rssOf([{ title: "Los", url: "https://anders.test/e", date: "Tue, 06 Oct 2026 09:00:00 +0200" }]) }, new Date("2026-10-06T13:00:00Z"));
  assert.deepEqual(third.news.map((item) => item.url), ["https://anders.test/e"]);
});

const NEWS_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"><url><loc>https://www.rijksoverheid.nl/actueel/nieuws/2026/10/06/jetten-ontvangt-costa</loc><lastmod>2026-10-06T10:26:06.858Z</lastmod><news:news><news:publication><news:language>nl</news:language><news:name>Rijksoverheid.nl</news:name></news:publication><news:publication_date>2026-10-06T10:26:10.241Z</news:publication_date><news:title>Jetten ontvangt voorzitter &amp; gast</news:title></news:news></url><url><loc>https://www.rijksoverheid.nl/actueel/nieuws/2026/10/05/zonder-titel</loc><lastmod>2026-10-05T10:00:00.000Z</lastmod></url></urlset>`;

test("parseNewsSitemap reads title, link and publication time and skips an entry without a title", () => {
  const items = parseNewsSitemap(NEWS_SITEMAP, { publisher: "Rijksoverheid", feedUrl: "https://x/sitemap.xml" });
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    title: "Jetten ontvangt voorzitter & gast",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/06/jetten-ontvangt-costa",
    publisher: "Rijksoverheid",
    feedUrl: "https://x/sitemap.xml",
    lede: "",
    published: "2026-10-06T10:26:10.241Z",
    image: null,
  });
  assert.deepEqual(parseNewsSitemap(undefined), []);
});

test("feedConfigsFromEnvelope carries the news-sitemap format and defaults to rss", () => {
  const configs = feedConfigsFromEnvelope({
    feeds: [
      { url: "https://a.nl/sitemap.xml", publisher: "A", format: "news-sitemap" },
      { url: "https://b.nl/rss", publisher: "B", format: "weird" },
    ],
  });
  assert.deepEqual(configs.map((config) => config.format), ["news-sitemap", "rss"]);
});

test("runNewsPipeline reads a news sitemap feed of an official body", async () => {
  const { runNewsPipeline } = await import("./news.mjs");
  const fx = await newsFixture("nlgraph-news-sitemap-");
  await writeFile(
    fx.feedsPath,
    JSON.stringify({
      feeds: [
        { url: "https://feed.test/sitemap.xml", publisher: "Rijksoverheid", language: "nl", publisherKind: "overheid", license: null, enabled: true, format: "news-sitemap" },
      ],
    }),
    "utf8",
  );
  const result = await runNewsPipeline({
    feedsPath: fx.feedsPath,
    aliasPath: join(fx.dir, "none.json"),
    topicsPath: fx.topicsPath,
    cacheDir: fx.cacheDir,
    dataDir: fx.dataDir,
    mediaDir: fx.mediaDir,
    headersPath: null,
    userAgent: "test",
    throttleMs: 0,
    fetchImpl: async () => new Response(NEWS_SITEMAP, { status: 200 }),
    now: new Date("2026-10-06T12:00:00Z"),
    log: () => {},
  });
  assert.equal(result.news.length, 1);
  assert.equal(result.news[0].publisherKind, "overheid");
  assert.equal(result.news[0].publisher, "Rijksoverheid");
  assert.equal(result.news[0].published, "2026-10-06T10:26:10.241Z");
});

test("fetchFeeds sends the stored ETag and Last-Modified and reads a 304 from the cached body", async () => {
  const dir = await mkdtemp(join(tmpdir(), "news-conditional-"));
  const feedConfigs = [{ publisher: "Testkrant", url: "https://example.test/feed.xml" }];
  const xml = '<rss><channel><item><title>Kabinet valt</title><link>https://example.test/a</link><pubDate>Mon, 26 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>';
  const seen = [];

  // First run: no cached body, so no conditional header; the validators are stored.
  const first = await fetchFeeds({
    feedConfigs,
    cacheDir: dir,
    throttleMs: 0,
    fetchImpl: async (url, init) => {
      seen.push(init.headers);
      return new Response(xml, { status: 200, headers: { ETag: '"v1"', "Last-Modified": "Mon, 26 Oct 2026 10:00:00 GMT" } });
    },
  });
  assert.equal(first[0].status, "fetched");
  assert.equal(seen[0]["If-None-Match"], undefined);
  assert.equal(seen[0]["If-Modified-Since"], undefined);

  // Second run: both validators go out; a 304 keeps the cached items without a download.
  const second = await fetchFeeds({
    feedConfigs,
    cacheDir: dir,
    throttleMs: 0,
    fetchImpl: async (url, init) => {
      seen.push(init.headers);
      return new Response(null, { status: 304 });
    },
  });
  assert.equal(seen[1]["If-None-Match"], '"v1"');
  assert.equal(seen[1]["If-Modified-Since"], "Mon, 26 Oct 2026 10:00:00 GMT");
  assert.equal(second[0].status, "not-modified");
  assert.equal(second[0].items.length, 1);
  assert.equal(second[0].items[0].title, "Kabinet valt");

  // A 304 without stored validators is not trusted: it counts as a failed fetch.
  const fresh = await mkdtemp(join(tmpdir(), "news-conditional-"));
  const third = await fetchFeeds({
    feedConfigs,
    cacheDir: fresh,
    throttleMs: 0,
    fetchImpl: async () => new Response(null, { status: 304 }),
  });
  assert.equal(third[0].status, "failed");
  assert.equal(third[0].items.length, 0);

  // A changed feed (200) replaces the body and the validators.
  const changed = await fetchFeeds({
    feedConfigs,
    cacheDir: dir,
    throttleMs: 0,
    fetchImpl: async () => new Response(xml.replace("Kabinet valt", "Kabinet herstelt"), { status: 200, headers: { ETag: '"v2"' } }),
  });
  assert.equal(changed[0].status, "fetched");
  assert.equal(changed[0].items[0].title, "Kabinet herstelt");
  const stored = JSON.parse(await readFile(join(dir, "validators.json"), "utf8"));
  assert.deepEqual(Object.values(stored), [{ etag: '"v2"', lastModified: null }]);
});
