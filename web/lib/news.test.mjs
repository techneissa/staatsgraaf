import { test } from "node:test";
import assert from "node:assert/strict";

import {
  byDayGroups,
  byHour,
  byKind,
  byLanguage,
  latestPublished,
  newsDayKey,
  newsDays,
  newsKeywords,
  newsKind,
  newsLanguage,
  outlets,
  recencyGroup,
} from "./news.ts";

// Reference: 18 September 2026, 07:00 UTC, which is 09:00 in Nederland (CEST).
const REFERENCE = "2026-09-18T07:00:00.000Z";

function item(id, published, extra = {}) {
  return {
    id: `news:${id}`,
    title: id,
    url: `https://example.org/${id}`,
    publisher: "Voorbeeldkrant",
    published,
    summary: null,
    summaryMarkup: null,
    entities: [],
    topics: [],
    image: null,
    sources: [{ source: `src:${id}`, retrieved: "2026-09-18", confidence: "high" }],
    ...extra,
  };
}

test("language defaults to nl when the field is absent", () => {
  assert.equal(newsLanguage({}), "nl");
  assert.equal(newsLanguage({ language: "nl" }), "nl");
  assert.equal(newsLanguage({ language: "en" }), "en");
});

test("publisherKind defaults to online when the field is absent or unknown", () => {
  assert.equal(newsKind({}), "online");
  assert.equal(newsKind({ publisherKind: "krant" }), "krant");
  assert.equal(newsKind({ publisherKind: "iets-anders" }), "online");
});

test("keywords tolerate an absent field", () => {
  assert.deepEqual(newsKeywords({}), []);
  assert.deepEqual(newsKeywords({ keywords: ["Kamer", ""] }), ["Kamer"]);
});

test("byLanguage and byKind apply the defaults", () => {
  const items = [
    item("a", REFERENCE),
    item("b", REFERENCE, { language: "en", publisherKind: "blog" }),
    item("c", REFERENCE, { publisherKind: "online" }),
  ];
  assert.deepEqual(
    byLanguage(items, "nl").map((entry) => entry.id),
    ["news:a", "news:c"],
  );
  assert.deepEqual(
    byLanguage(items, "en").map((entry) => entry.id),
    ["news:b"],
  );
  assert.deepEqual(
    byKind(items, "online").map((entry) => entry.id),
    ["news:a", "news:c"],
  );
  assert.deepEqual(
    byKind(items, "blog").map((entry) => entry.id),
    ["news:b"],
  );
});

test("day keys follow the calendar in Nederland, not UTC", () => {
  // 22:30 UTC on the 17th is 00:30 on the 18th in Amsterdam during summer time.
  assert.equal(newsDayKey("2026-09-17T22:30:00.000Z"), "2026-09-18");
  assert.equal(newsDayKey("2026-09-17T21:59:00.000Z"), "2026-09-17");
  // In winter time the offset is one hour.
  assert.equal(newsDayKey("2026-01-10T23:30:00.000Z"), "2026-01-11");
});

test("recency boundaries: last hour, today, yesterday, this week, earlier", () => {
  assert.equal(recencyGroup(REFERENCE, REFERENCE), "hour");
  assert.equal(recencyGroup("2026-09-18T06:00:01.000Z", REFERENCE), "hour");
  // Exactly one hour old is no longer "the last hour".
  assert.equal(recencyGroup("2026-09-18T06:00:00.000Z", REFERENCE), "today");
  // Just after midnight in Amsterdam counts as today.
  assert.equal(recencyGroup("2026-09-17T22:30:00.000Z", REFERENCE), "today");
  // Just before midnight in Amsterdam counts as yesterday.
  assert.equal(recencyGroup("2026-09-17T21:59:00.000Z", REFERENCE), "yesterday");
  assert.equal(recencyGroup("2026-09-16T12:00:00.000Z", REFERENCE), "week");
  // Six days back is still this week, seven days back is earlier.
  assert.equal(recencyGroup("2026-09-12T10:00:00.000Z", REFERENCE), "week");
  assert.equal(recencyGroup("2026-09-11T10:00:00.000Z", REFERENCE), "earlier");
  assert.equal(recencyGroup("2026-08-19T10:00:00.000Z", REFERENCE), "earlier");
});

test("byDayGroups returns every group in order, newest first inside, and uses the latest item as reference", () => {
  const items = [
    item("earlier", "2026-09-01T10:00:00.000Z"),
    item("week", "2026-09-15T10:00:00.000Z"),
    item("yesterday", "2026-09-17T10:00:00.000Z"),
    item("today-early", "2026-09-18T04:00:00.000Z"),
    item("hour", "2026-09-18T06:30:00.000Z"),
    item("latest", REFERENCE),
  ];
  assert.equal(latestPublished(items), REFERENCE);
  const groups = byDayGroups(items);
  assert.deepEqual(
    groups.map((group) => group.key),
    ["hour", "today", "yesterday", "week", "earlier"],
  );
  assert.deepEqual(
    groups.map((group) => group.label),
    ["Afgelopen uur", "Vandaag", "Gisteren", "Deze week", "Eerder"],
  );
  assert.deepEqual(
    groups[0].items.map((entry) => entry.id),
    ["news:latest", "news:hour"],
  );
  assert.deepEqual(
    groups[1].items.map((entry) => entry.id),
    ["news:today-early"],
  );
  assert.equal(groups[2].items.length, 1);
  assert.equal(groups[3].items.length, 1);
  assert.equal(groups[4].items.length, 1);
});

test("byDayGroups with no items yields five empty groups", () => {
  const groups = byDayGroups([]);
  assert.equal(groups.length, 5);
  assert.ok(groups.every((group) => group.items.length === 0));
});

test("byHour groups a day by wall-clock hour in Nederland, latest hour first", () => {
  const groups = byHour([
    item("a", "2026-09-18T07:10:00.000Z"),
    item("b", "2026-09-18T07:50:00.000Z"),
    item("c", "2026-09-18T05:05:00.000Z"),
  ]);
  assert.deepEqual(
    groups.map((group) => group.hour),
    ["09", "07"],
  );
  assert.equal(groups[0].label, "09:00 tot 09:59");
  assert.deepEqual(
    groups[0].items.map((entry) => entry.id),
    ["news:b", "news:a"],
  );
});

test("newsDays counts items per calendar day, newest first", () => {
  const days = newsDays([
    item("a", "2026-09-18T07:10:00.000Z"),
    item("b", "2026-09-17T22:30:00.000Z"),
    item("c", "2026-09-17T10:00:00.000Z"),
  ]);
  assert.deepEqual(days, [
    { date: "2026-09-18", count: 2 },
    { date: "2026-09-17", count: 1 },
  ]);
});

test("outlets aggregate kind, languages, count, and licences per publisher", () => {
  const rows = outlets(
    [
      item("a", REFERENCE, { publisher: "NOS", publisherKind: "publieke-omroep" }),
      item("b", "2026-09-17T10:00:00.000Z", { publisher: "NOS", publisherKind: "publieke-omroep" }),
      item("c", REFERENCE, { publisher: "DutchNews", language: "en" }),
    ],
    (entry) => (entry.publisher === "NOS" ? ["CC-BY-4.0"] : ["all-rights-reserved"]),
  );
  assert.deepEqual(rows, [
    {
      publisher: "NOS",
      kind: "publieke-omroep",
      languages: ["nl"],
      count: 2,
      licenses: ["CC-BY-4.0"],
      latest: REFERENCE,
    },
    {
      publisher: "DutchNews",
      kind: "online",
      languages: ["en"],
      count: 1,
      licenses: ["all-rights-reserved"],
      latest: REFERENCE,
    },
  ]);
});
