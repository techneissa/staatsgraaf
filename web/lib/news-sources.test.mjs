import { test } from "node:test";
import assert from "node:assert/strict";

import { buildSourceRows, outletSite } from "./news-sources.ts";

const item = (id, publisher, url, extra = {}) => ({
  id,
  title: id,
  url,
  publisher,
  published: "2026-10-01T10:00:00.000Z",
  summary: null,
  summaryMarkup: null,
  entities: [],
  topics: [],
  image: null,
  sources: [],
  ...extra,
});

const feeds = [
  { url: "https://feeds.nos.nl/nosnieuwsalgemeen", publisher: "NOS", language: "nl", publisherKind: "publieke-omroep", license: "Koppen en deep links; geen overname van artikeltekst of beeld.", status: 200, retrieved: "2026-09-18", enabled: true, notes: null },
  { url: "https://example.org/feed", publisher: "Uit", language: "nl", publisherKind: "video", license: null, status: 404, retrieved: "2026-09-18", enabled: false, notes: "Feed niet bereikbaar." },
];

test("the outlet website is the most common origin of its item links", () => {
  const items = [
    item("1", "NOS", "https://nos.nl/artikel/1"),
    item("2", "NOS", "https://nos.nl/artikel/2"),
    item("3", "NOS", "https://www.example.com/x"),
  ];
  assert.equal(outletSite(items, "NOS"), "https://nos.nl");
  assert.equal(outletSite(items, "Onbekend"), null);
});

test("rows carry counts, relevance, kind, languages and the feed record", () => {
  const items = [
    item("1", "NOS", "https://nos.nl/a", { entities: ["org:x"], publisherKind: "publieke-omroep" }),
    item("2", "NOS", "https://nos.nl/b", { publisherKind: "publieke-omroep" }),
  ];
  const { rows } = buildSourceRows(items, feeds, []);
  const nos = rows.find((row) => row.publisher === "NOS");
  assert.equal(nos.count, 2);
  assert.equal(nos.relevant, 1);
  assert.equal(nos.kind, "publieke-omroep");
  assert.deepEqual(nos.languages, ["nl"]);
  assert.equal(nos.site, "https://nos.nl");
  assert.equal(nos.feed.enabled, true);
  assert.equal(nos.feed.status, 200);
});

test("a disabled feed without items stays a row, flagged as a named gap", () => {
  const { rows } = buildSourceRows([item("1", "NOS", "https://nos.nl/a")], feeds, []);
  const off = rows.find((row) => row.publisher === "Uit");
  assert.equal(off.count, 0);
  assert.equal(off.feed.enabled, false);
  assert.equal(off.feed.notes, "Feed niet bereikbaar.");
  assert.equal(off.site, null);
});

test("rows are ordered by item count, then name; gaps pass through", () => {
  const gaps = [{ url: "https://www.youtube.com/@NOS", why: "geen feed", resume: "later" }];
  const items = [item("1", "NOS", "https://nos.nl/a"), item("2", "NOS", "https://nos.nl/b")];
  const out = buildSourceRows(items, feeds, gaps);
  assert.deepEqual(out.rows.map((row) => row.publisher), ["NOS", "Uit"]);
  assert.deepEqual(out.gaps, gaps);
});

test("an outlet in the data but not in the registry still gets a row without a feed", () => {
  const { rows } = buildSourceRows([item("1", "Vreemd", "https://vreemd.nl/a")], feeds, []);
  const row = rows.find((entry) => entry.publisher === "Vreemd");
  assert.equal(row.feed, null);
  assert.equal(row.count, 1);
});
