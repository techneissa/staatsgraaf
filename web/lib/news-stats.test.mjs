import { test } from "node:test";
import assert from "node:assert/strict";

import { sumBuckets, translationSummary, windowHours } from "./news-stats.ts";

const bucket = (total, relevantTotal, translated, relevantTranslated) => ({ total, relevantTotal, translated, relevantTranslated });

test("sums per-group buckets per language", () => {
  const sum = sumBuckets([
    { nl: bucket(10, 4, 3, 2), en: bucket(2, 1, 0, 0) },
    { nl: bucket(5, 1, 1, 1), en: bucket(1, 1, 0, 0) },
  ]);
  assert.deepEqual(sum.nl, bucket(15, 5, 4, 3));
  assert.deepEqual(sum.en, bucket(3, 2, 0, 0));
});

test("the disclosure counts the items from the other language that are translated", () => {
  const buckets = { nl: bucket(100, 40, 30, 20), en: bucket(10, 6, 0, 0) };
  // English interface: the Dutch items are the foreign ones.
  assert.deepEqual(translationSummary(buckets, "en", "all", true), { foreign: "nl", total: 40, translated: 20 });
  assert.deepEqual(translationSummary(buckets, "en", "all", false), { foreign: "nl", total: 100, translated: 30 });
  // Dutch interface: the English items.
  assert.deepEqual(translationSummary({ nl: bucket(100, 40, 0, 0), en: bucket(10, 6, 5, 4) }, "nl", "all", true), {
    foreign: "en",
    total: 6,
    translated: 4,
  });
});

test("no disclosure when no foreign items are shown", () => {
  const buckets = { nl: bucket(100, 40, 30, 20), en: bucket(10, 6, 0, 0) };
  assert.equal(translationSummary(buckets, "en", "en", true), null);
  assert.equal(translationSummary({ nl: bucket(0, 0, 0, 0), en: bucket(1, 1, 0, 0) }, "en", "all", true), null);
});

const hour = (name, count) => ({ hour: name, label: name, items: Array.from({ length: count }, (_, i) => ({ id: `${name}-${i}` })) });

test("windowHours shows the first N items across hours and keeps the order", () => {
  const out = windowHours([hour("21", 3), hour("20", 5), hour("19", 4)], 6);
  assert.deepEqual(out.hours.map((entry) => [entry.hour, entry.items.length]), [["21", 3], ["20", 3]]);
  assert.equal(out.shown, 6);
  assert.equal(out.total, 12);
  assert.equal(out.rest, 6);
});

test("windowHours returns everything when it fits and drops empty hours", () => {
  const out = windowHours([hour("21", 2), hour("20", 0)], 40);
  assert.deepEqual(out.hours.map((entry) => entry.hour), ["21"]);
  assert.equal(out.rest, 0);
});
