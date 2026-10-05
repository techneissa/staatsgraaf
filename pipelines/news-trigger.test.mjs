import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { matchTriggerWords, parseNewsSitemap, shouldRunEarly } from "./news-trigger.mjs";

const LAST = "2026-10-05T06:00:00.000Z";

function item(overrides) {
  return {
    id: "news:1",
    title: "Gewoon nieuws",
    url: "https://www.nrc.nl/nieuws/x",
    published: "2026-10-05T10:00:00.000Z",
    publisherKind: "krant",
    entities: [],
    ...overrides,
  };
}

test("a trigger word in a recent item that links to a known entity runs the fetchers early", () => {
  const result = shouldRunEarly([item({ title: "Minister treedt af na debat", entities: ["person:x"] })], LAST);
  assert.equal(result.run, true);
  assert.match(result.reason, /treedt af/);
  assert.equal(result.matches[0].why, "koppeling aan een bekende entiteit");
});

test("an official outlet is enough, with no entity link", () => {
  const result = shouldRunEarly([item({ title: "Nieuwe staatssecretaris benoemd", url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/10/05/x" })], LAST);
  assert.equal(result.run, true);
  assert.equal(result.matches[0].why, "officiële bron");
  assert.deepEqual(result.matches[0].words.sort(), ["benoemd", "staatssecretaris"]);
});

test("a trigger word without an entity link or an official outlet does not trigger", () => {
  const result = shouldRunEarly([item({ title: "Burgemeester treedt af in een dorp" })], LAST);
  assert.equal(result.run, false);
  assert.equal(result.reason, null);
});

test("an item without a trigger word does not trigger, even from an official outlet", () => {
  const result = shouldRunEarly([item({ title: "De asielinstroom van week 40 bedroeg ongeveer 860", url: "https://www.rijksoverheid.nl/x", entities: ["org:kabinet"] })], LAST);
  assert.equal(result.run, false);
});

test("an item published before the last run does not trigger", () => {
  const result = shouldRunEarly([item({ title: "Kabinet gevallen", entities: ["org:kabinet"], published: "2026-10-05T05:59:59.000Z" })], LAST);
  assert.equal(result.run, false);
});

test("accents and case do not matter and the word is matched whole", () => {
  assert.deepEqual(matchTriggerWords("BEEDIGD in de Kamer"), ["beëdigd"]);
  assert.deepEqual(matchTriggerWords("Kamervoorzitter Van Campen"), ["Kamervoorzitter"]);
  assert.deepEqual(matchTriggerWords("de benoemde regels"), []);
});

test("without a last run only the last 24 hours count", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  const recent = shouldRunEarly([item({ title: "Fractievoorzitter gekozen", entities: ["org:tweede-kamer"], published: "2026-10-05T01:00:00.000Z" })], null, { now });
  assert.equal(recent.run, true);
  const old = shouldRunEarly([item({ title: "Fractievoorzitter gekozen", entities: ["org:tweede-kamer"], published: "2026-10-03T01:00:00.000Z" })], null, { now });
  assert.equal(old.run, false);
});

test("the rijksoverheid news sitemap becomes official news-like items", () => {
  const xml = readFileSync(new URL("./fixtures/live/rijksoverheid-news-sitemap.xml", import.meta.url), "utf8");
  const items = parseNewsSitemap(xml);
  assert.equal(items.length, 6);
  assert.equal(items[1].title, "Kabinet: weloverwogen regie op internationaal talent");
  assert.equal(items[1].published, "2026-10-05T13:00:00.124Z");
  assert.equal(items[1].official, true);
  // the word "kabinet" in an official headline asks for an early read of the official sources
  assert.equal(shouldRunEarly(items, "2026-10-05T00:00:00.000Z").run, true);
  assert.equal(shouldRunEarly(items, "2026-10-05T23:00:00.000Z").run, false);
});
