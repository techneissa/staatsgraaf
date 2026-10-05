import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createHttp } from "./live-http.mjs";
import {
  ELECTION_TYPES,
  electionEventsFromState,
  fetchElectionDates,
  mergeElectionRecords,
  parseElectionPage,
  pageUrl,
} from "./election-dates.mjs";

function html(slug) {
  return readFileSync(new URL(`./fixtures/live/kiesraad-${slug}.html`, import.meta.url), "utf8");
}

function parse(id, text = null) {
  const type = ELECTION_TYPES.find((entry) => entry.id === id);
  return parseElectionPage(type, text ?? html(type.slug), { today: "2026-10-05", sourceId: `src:kiesraad-verkiezingen-${type.slug}` });
}

test("each Kiesraad type page yields its date from the expected sentence", () => {
  assert.equal(parse("tk").records.find((r) => r.kind === "next").date, "2030-05-15");
  assert.equal(parse("tk").records.find((r) => r.kind === "last").date, "2025-10-29");
  assert.equal(parse("ek").records[0].date, "2027-05-24");
  assert.equal(parse("ps").records[0].date, "2027-03-17");
  assert.equal(parse("ws").records[0].date, "2027-03-17");
  assert.equal(parse("ep").records[0].date, "2029-06-07");
  assert.equal(parse("her").records[0].date, "2026-11-18");
  assert.match(parse("her").records[0].scope, /Hilversum en Wijdemeren/);
  assert.ok(Object.values(ELECTION_TYPES).every((type) => parse(type.id).gaps.length === 0));
});

test("the municipal page names a month only: the date stays null and the month is kept", () => {
  const record = parse("gr").records[0];
  assert.equal(record.date, null);
  assert.equal(record.month, "2030-03");
  assert.match(record.quote, /in maart 2030/);
});

test("every record carries its quote, its page URL and a source reference", () => {
  const record = parse("tk").records.find((r) => r.kind === "next");
  assert.equal(record.quote, "De volgende reguliere Tweede Kamerverkiezing is op 15 mei 2030.");
  assert.equal(record.url, "https://www.kiesraad.nl/verkiezingen/tweede-kamer");
  assert.deepEqual(record.source, { source: "src:kiesraad-verkiezingen-tweede-kamer", retrieved: "2026-10-05", confidence: "high" });
});

test("a page whose sentence changed is a named gap and yields no record", () => {
  const result = parse("tk", "<main><p>De Tweede Kamerverkiezing wordt binnenkort gehouden.</p></main>");
  assert.deepEqual(result.records, []);
  assert.equal(result.gaps.length, 1);
  assert.match(result.gaps[0].what, /Verkiezingsdatum Tweede Kamer/);
  assert.equal(result.gaps[0].endpoint, pageUrl(ELECTION_TYPES[0]));
});

test("a failing page keeps its previous records and is reported as a gap", async () => {
  const http = createHttp({
    fetchImpl: async (url) => (url.endsWith("/eerste-kamer") ? new Response("nee", { status: 500 }) : new Response(html(url.split("/").pop()), { status: 200 })),
    minIntervalMs: 0,
  });
  const result = await fetchElectionDates({ http, today: "2026-10-05" });
  assert.ok(result.gaps.some((gap) => gap.what === "Verkiezingsdatum Eerste Kamer"));
  const previous = [{ id: "upcoming:ek-2027-05-24", type: "ek", kind: "next", date: "2027-05-24", month: null }];
  const merged = mergeElectionRecords(previous, result.records, result.gaps);
  assert.ok(merged.some((record) => record.type === "ek" && record.date === "2027-05-24"));
  assert.ok(merged.some((record) => record.type === "tk" && record.kind === "next"));
});

test("an election date that passed in the last 60 days is an event for the guards", () => {
  const items = [
    { id: "upcoming:ek-2026-09-20", body: "org:eerste-kamer", date: "2026-09-20" },
    { id: "upcoming:tk-last-2025-10-29", body: "org:tweede-kamer", date: "2025-10-29" },
    { id: "upcoming:ps-2027-03-17", body: null, date: "2027-03-17" },
    { id: "upcoming:tk-2030-05-15", body: "org:tweede-kamer", date: "2030-05-15" },
  ];
  assert.deepEqual(electionEventsFromState(items, "2026-10-05").map((event) => event.id), ["upcoming:ek-2026-09-20"]);
});
