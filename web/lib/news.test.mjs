import { test } from "node:test";
import assert from "node:assert/strict";

import {
  byDayGroups,
  byHour,
  byKind,
  byLanguage,
  isRelevantNews,
  latestPublished,
  newsDayKey,
  newsDays,
  newsKeywords,
  newsKind,
  newsReferenceAt,
  newsLanguage,
  outlets,
  recencyGroup,
  recencyGroupDetail,
  relevanceCounts,
  selectRelevantNews,
} from "./news.ts";
import { isRelevantStored } from "../../pipelines/news.mjs";

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

test("isRelevantNews needs a matched entity or a topic", () => {
  assert.equal(isRelevantNews({ entities: [], topics: [] }), false);
  assert.equal(isRelevantNews({ entities: ["org:x"], topics: [] }), true);
  assert.equal(isRelevantNews({ entities: [], topics: ["topic:y"] }), true);
  assert.equal(isRelevantNews({ entities: ["org:x"], topics: ["topic:y"] }), true);
});

test("relevanceCounts splits a list into relevant and other items", () => {
  const items = [
    item("a", REFERENCE, { entities: ["org:x"] }),
    item("b", REFERENCE, { topics: ["topic:y"] }),
    item("c", REFERENCE),
  ];
  assert.deepEqual(relevanceCounts(items), { total: 3, relevant: 2 });
  assert.deepEqual(relevanceCounts([]), { total: 0, relevant: 0 });
});

test("selectRelevantNews keeps the newest relevant items and falls back to all when none is relevant", () => {
  const items = [
    item("new-plain", "2026-09-18T07:00:00.000Z"),
    item("mid-hit", "2026-09-18T06:00:00.000Z", { entities: ["org:x"] }),
    item("old-hit", "2026-09-17T06:00:00.000Z", { topics: ["topic:y"] }),
    item("older-plain", "2026-09-16T06:00:00.000Z"),
  ];
  assert.deepEqual(selectRelevantNews(items, 2).map((entry) => entry.id), ["news:mid-hit", "news:old-hit"]);
  assert.deepEqual(selectRelevantNews(items, 1).map((entry) => entry.id), ["news:mid-hit"]);
  const nothing = [item("p1", "2026-09-18T07:00:00.000Z"), item("p2", "2026-09-18T06:00:00.000Z")];
  assert.deepEqual(selectRelevantNews(nothing, 5).map((entry) => entry.id), ["news:p1", "news:p2"]);
  assert.deepEqual(selectRelevantNews([], 3), []);
});

test("a topic without evidence keywords does not make an item relevant", () => {
  assert.equal(isRelevantNews({ entities: [], topics: ["topic:zorg"], keywords: [] }), false);
  assert.equal(isRelevantNews({ entities: [], topics: ["topic:zorg"], keywords: ["ziekenhuis", "zorg"] }), true);
  assert.equal(isRelevantNews({ entities: ["org:x"], topics: ["topic:zorg"], keywords: [] }), true);
});

test("recencyGroupDetail names the real date or time behind each relative group", () => {
  assert.equal(recencyGroupDetail("hour", REFERENCE, [], "nl"), "tot 09:00");
  assert.equal(recencyGroupDetail("hour", REFERENCE, [], "en"), "until 09:00");
  assert.equal(recencyGroupDetail("today", REFERENCE, [], "nl"), "vrijdag 18 september");
  assert.equal(recencyGroupDetail("yesterday", REFERENCE, [], "nl"), "donderdag 17 september");
  assert.equal(recencyGroupDetail("today", REFERENCE, [], "en"), "Friday 18 September");
  const week = ["2026-09-14T08:00:00.000Z", "2026-09-12T08:00:00.000Z", "2026-09-16T08:00:00.000Z"];
  assert.equal(recencyGroupDetail("week", REFERENCE, week, "nl"), "12 sep tot 16 sep");
  assert.equal(recencyGroupDetail("earlier", REFERENCE, ["2026-09-01T08:00:00.000Z", "2026-09-10T08:00:00.000Z"], "nl"), "tot 10 sep");
  assert.equal(recencyGroupDetail("earlier", REFERENCE, [], "nl"), "");
});

test("the recency reference is the build clock, never older than the newest item", () => {
  const items = [item("a", "2026-09-18T06:00:00.000Z")];
  assert.equal(newsReferenceAt(items, new Date("2026-09-22T10:00:00.000Z")), "2026-09-22T10:00:00.000Z");
  assert.equal(newsReferenceAt(items, new Date("2026-09-10T10:00:00.000Z")), "2026-09-18T06:00:00.000Z");
  assert.equal(newsReferenceAt([], new Date("2026-09-22T10:00:00.000Z")), "2026-09-22T10:00:00.000Z");
});

test("an item from a politics section or an official body is relevant by source, with or without a link", () => {
  assert.equal(isRelevantNews({ entities: [], topics: [], scope: "politiek" }), true);
  assert.equal(isRelevantNews({ entities: [], topics: [], publisherKind: "overheid" }), true);
  // A topic without evidence still proves nothing; the source is what counts.
  assert.equal(isRelevantNews({ entities: [], topics: ["topic:zorg"], keywords: [], scope: "politiek" }), true);
  assert.equal(isRelevantNews({ entities: [], topics: [], publisherKind: "krant" }), false);
  assert.equal(isRelevantNews({ entities: [], topics: [], scope: undefined, publisherKind: "vakmedia" }), false);
});

test("relevanceCounts counts items relevant by source with the linked ones", () => {
  const items = [
    item("a", REFERENCE, { entities: ["org:x"] }),
    item("b", REFERENCE, { scope: "politiek" }),
    item("c", REFERENCE, { publisherKind: "overheid" }),
    item("d", REFERENCE),
  ];
  assert.deepEqual(relevanceCounts(items), { total: 4, relevant: 3 });
});

test("the pipeline's stored-item rule and isRelevantNews agree on every combination", () => {
  const entities = [[], ["org:x"]];
  const topics = [[], ["topic:y"]];
  const keywords = [undefined, [], ["woord"]];
  const scopes = [undefined, "politiek"];
  const kinds = [undefined, "krant", "overheid"];
  for (const e of entities) for (const t of topics) for (const k of keywords) for (const sc of scopes) for (const kind of kinds) {
    const candidate = { entities: e, topics: t, keywords: k, scope: sc, publisherKind: kind };
    assert.equal(isRelevantNews(candidate), isRelevantStored(candidate), JSON.stringify(candidate));
  }
});

test("the home band takes at most the per-outlet cap from one outlet and keeps time order", () => {
  const from = (id, publisher, published) => item(id, published, { publisher, entities: ["org:x"] });
  const items = [
    from("rtl-1", "RTL Nieuws", "2026-09-18T07:00:00.000Z"),
    from("rtl-2", "RTL Nieuws", "2026-09-18T06:55:00.000Z"),
    from("rtl-3", "RTL Nieuws", "2026-09-18T06:50:00.000Z"),
    from("nos-1", "NOS", "2026-09-18T06:40:00.000Z"),
    from("nos-2", "NOS", "2026-09-18T06:30:00.000Z"),
    from("nos-3", "NOS", "2026-09-18T06:20:00.000Z"),
    from("nrc-1", "NRC", "2026-09-18T06:10:00.000Z"),
  ];
  const band = selectRelevantNews(items, 5, { perOutletCap: 2 }).map((entry) => entry.id);
  assert.deepEqual(band, ["news:rtl-1", "news:rtl-2", "news:nos-1", "news:nos-2", "news:nrc-1"]);
  // Without a cap the newest outlet crowds the band.
  assert.deepEqual(selectRelevantNews(items, 3).map((entry) => entry.id), ["news:rtl-1", "news:rtl-2", "news:rtl-3"]);
});

test("the home band fills up from capped items when too few outlets have news", () => {
  const items = ["a", "b", "c", "d"].map((id, index) =>
    item(id, `2026-09-18T0${6 - index}:00:00.000Z`, { publisher: "NOS", scope: "politiek" }),
  );
  assert.deepEqual(selectRelevantNews(items, 3, { perOutletCap: 1 }).map((entry) => entry.id), ["news:a", "news:b", "news:c"]);
});

test("the home band only caps relevant items and still falls back to all items when none is relevant", () => {
  const plain = [item("p1", "2026-09-18T07:00:00.000Z"), item("p2", "2026-09-18T06:00:00.000Z"), item("p3", "2026-09-18T05:00:00.000Z")];
  assert.deepEqual(selectRelevantNews(plain, 3, { perOutletCap: 1 }).map((entry) => entry.id), ["news:p1", "news:p2", "news:p3"]);
});
