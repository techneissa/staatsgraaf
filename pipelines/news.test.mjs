import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildSummary,
  dedupeItems,
  feedConfigsFromEnvelope,
  keywordsFromMatches,
  makeIdFactory,
  normalizeDate,
  normalizeUrl,
  parseFeed,
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
