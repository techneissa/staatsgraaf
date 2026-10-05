import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createHttp, HttpError } from "./live-http.mjs";
import { LIVE_USER_AGENT } from "./live-util.mjs";
import {
  bootstrapSince,
  changedAfter,
  computeCursors,
  countUrl,
  fetchAllPages,
  fetchTkCounts,
  fetchTkSnapshot,
  makeClosedRowLookup,
  readWindowStart,
  tkUrl,
} from "./tk-fetch.mjs";

function fx(name) {
  return JSON.parse(readFileSync(new URL(`./fixtures/live/${name}`, import.meta.url), "utf8"));
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function stubHttp(handler) {
  const urls = [];
  const http = createHttp({
    fetchImpl: async (url, init) => {
      urls.push({ url: decodeURIComponent(url), init });
      return handler(decodeURIComponent(url), init);
    },
    minIntervalMs: 0,
  });
  return { http, urls };
}

test("tkUrl keeps the OData keys readable and encodes only the values", () => {
  const url = tkUrl("Fractie", { $filter: "DatumInactief eq null", $top: 250 });
  assert.equal(url, "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Fractie?$filter=DatumInactief%20eq%20null&$top=250");
});

test("the count query reads by the ApiGewijzigdOp cursor, never by Van", () => {
  const url = decodeURIComponent(countUrl("FractieZetelPersoon", "2026-09-02T13:39:19.6078662Z"));
  assert.match(url, /\$filter=ApiGewijzigdOp gt 2026-09-02T13:39:19\.6078662Z/);
  assert.match(url, /\$count=true/);
  assert.match(url, /\$top=0/);
  assert.doesNotMatch(url, /Van/);
  assert.equal(changedAfter("X"), "ApiGewijzigdOp gt X");
  const presidium = decodeURIComponent(countUrl("CommissieZetelVastPersoon", "2026-01-01T00:00:00Z", "pres-id"));
  assert.match(presidium, /CommissieZetel\/Commissie_Id eq pres-id and ApiGewijzigdOp gt/);
});

test("counts of zero on every entity mean nothing changed and cost four small requests", async () => {
  const { http, urls } = stubHttp(() => jsonResponse({ "@odata.count": 0, value: [] }));
  const cursors = { fzp: "a", fractie: "b", vacature: "c", presidium: "d" };
  const result = await fetchTkCounts({ http, cursors, presidiumId: "pres-id" });
  assert.equal(result.changed, false);
  assert.deepEqual(result.counts, { fzp: 0, fractie: 0, vacature: 0, presidium: 0 });
  assert.equal(urls.length, 4);
  assert.ok(urls.every((entry) => entry.init.headers["User-Agent"] === LIVE_USER_AGENT));
});

test("one entity with a changed row is enough to read the snapshot", async () => {
  const { http } = stubHttp((url) => jsonResponse({ "@odata.count": url.includes("/Fractie?") ? 1 : 0, value: [] }));
  const result = await fetchTkCounts({ http, cursors: { fzp: "a", fractie: "b", vacature: "c", presidium: "d" }, presidiumId: "p" });
  assert.equal(result.changed, true);
});

test("a missing cursor (first run) counts as changed without a request", async () => {
  const { http, urls } = stubHttp(() => jsonResponse({ "@odata.count": 0, value: [] }));
  const result = await fetchTkCounts({ http, cursors: {}, presidiumId: null });
  assert.equal(result.changed, true);
  assert.equal(urls.length, 0);
});

test("the cursor moves forward to the newest ApiGewijzigdOp and never back", () => {
  const next = computeCursors(
    { fzp: "2026-09-02T13:39:19.6078662Z", fractie: "2026-06-23T07:15:12.0000000Z" },
    {
      fzp: [{ ApiGewijzigdOp: "2026-09-03T08:00:00.1000000Z" }, { ApiGewijzigdOp: "2026-08-01T00:00:00Z" }],
      fractie: [{ ApiGewijzigdOp: "2026-01-01T00:00:00Z" }],
      vacature: [],
    },
  );
  assert.equal(next.fzp, "2026-09-03T08:00:00.1000000Z");
  assert.equal(next.fractie, "2026-06-23T07:15:12.0000000Z");
  assert.equal(next.vacature, undefined);
  // the newest change of the whole entity counts even when none of the rows read carries it
  const withLatest = computeCursors({}, { vacature: [{ ApiGewijzigdOp: "2025-02-13T10:22:14Z" }] }, { vacature: "2026-09-02T13:39:18.4481246Z" });
  assert.equal(withLatest.vacature, "2026-09-02T13:39:18.4481246Z");
});

test("the read window starts a day before the cursor so a late row is read twice rather than missed", () => {
  assert.equal(readWindowStart("2026-08-31T10:04:20.5777947Z"), "2026-08-30T00:00:00Z");
  assert.equal(readWindowStart(null, "2026-09-01"), "2026-08-31T00:00:00Z");
});

function snapshotRouter(overrides = {}) {
  return (url) => {
    if (overrides[url]) return overrides[url]();
    if (url.includes("$orderby=ApiGewijzigdOp desc")) return jsonResponse({ value: [{ ApiGewijzigdOp: "2026-09-02T13:39:19.6078662Z" }] });
    if (url.includes("FractieZetelPersoon") && url.includes("TotEnMet ne null")) return jsonResponse(fx("tk-merger-closed-rows.json"));
    if (url.includes("FractieZetelPersoon")) return jsonResponse(fx("tk-fzp-open.json"));
    if (url.includes("/Fractie?")) return jsonResponse(fx("tk-fractie-active.json"));
    if (url.includes("FractieZetelVacature")) return jsonResponse(fx("tk-vacature-open.json"));
    if (url.includes("CommissieZetelVastPersoon")) return jsonResponse(fx("tk-presidium-rows.json"));
    return jsonResponse({}, 404);
  };
}

test("the snapshot reads open rows, rows closed since the cursor, fracties, vacancies and the presidium", async () => {
  const { http, urls } = stubHttp(snapshotRouter());
  const result = await fetchTkSnapshot({ http, since: "2026-06-01T00:00:00Z", presidiumId: "pres-id" });
  assert.equal(urls.length, 9, "four latest-change queries plus the five snapshot queries");
  assert.equal(result.latest.fzp, "2026-09-02T13:39:19.6078662Z");
  const closedQuery = urls.find((entry) => entry.url.includes("TotEnMet ne null")).url;
  assert.match(closedQuery, /ApiGewijzigdOp gt 2026-06-01T00:00:00Z/);
  assert.doesNotMatch(closedQuery, /Van /);
  assert.equal(result.snapshot.rows.length, 150 + 20);
  assert.equal(result.snapshot.rows.filter((row) => !row.totEnMet).length, 150);
  assert.equal(result.snapshot.fracties.length, 17);
  assert.equal(result.snapshot.vacatures.length, 1);
  assert.equal(result.snapshot.presidium.length, 7);
  const voorzitter = result.snapshot.presidium.find((row) => row.functie === "Voorzitter");
  assert.equal(voorzitter.van, "2025-11-18");
  assert.equal(voorzitter.persoonId.length > 10, true);
  assert.ok(result.raws.fzp.length === 170);
});

test("pages are followed through @odata.nextLink", async () => {
  const first = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Fractie?$top=1";
  const second = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Fractie?$top=1&$skip=1";
  const { http, urls } = stubHttp((url) =>
    url === first
      ? jsonResponse({ value: [{ Id: "a" }], "@odata.nextLink": second })
      : jsonResponse({ value: [{ Id: "b" }] }),
  );
  const result = await fetchAllPages(http, first);
  assert.deepEqual(result.value.map((row) => row.Id), ["a", "b"]);
  assert.equal(urls.length, 2);
});

test("a closed row look-up asks for the newest closed row of one Persoon.Id", async () => {
  const { http, urls } = stubHttp(() => jsonResponse({ value: [{ TotEnMet: "2026-09-29T00:00:00+02:00" }] }));
  const lookup = makeClosedRowLookup({ http, presidiumId: "pres-id" });
  const row = await lookup({ kind: "fzp", persoonId: "guid-1", functie: "Fractievoorzitter" });
  assert.equal(row.totEnMet, "2026-09-29");
  assert.match(urls[0].url, /Persoon_Id eq guid-1 and TotEnMet ne null/);
  assert.match(urls[0].url, /\$orderby=TotEnMet desc/);
  assert.equal(await lookup({ kind: "fzp", persoonId: null }), null);
});

test("an HTTP error becomes an HttpError with the status", async () => {
  const { http } = stubHttp(() => jsonResponse({}, 500));
  await assert.rejects(http.getJson("https://example.org/x"), (error) => error instanceof HttpError && error.status === 500);
});

test("requests to one host are spaced by the minimum interval, other hosts are not delayed", async () => {
  let clock = 0;
  const waits = [];
  const http = createHttp({
    fetchImpl: async () => new Response("{}", { status: 200 }),
    minIntervalMs: 1000,
    now: () => clock,
    sleep: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
  });
  await http.get("https://a.example/1");
  await http.get("https://a.example/2");
  await http.get("https://b.example/1");
  await http.get("https://a.example/3");
  assert.deepEqual(waits, [1000, 1000]);
  assert.deepEqual(http.stats.byHost, { "a.example": 3, "b.example": 1 });
});

test("a first run reads from a week before the newest Tweede Kamer retrieval in the dataset", () => {
  const sources = [
    { id: "src:tk-odata-fractiezetelpersonen", retrieved: "2026-09-19" },
    { id: "src:tk-odata-fractiezetelpersonen-expand", retrieved: "2026-09-26" },
    { id: "src:other", retrieved: "2026-10-01" },
  ];
  assert.equal(bootstrapSince(sources, "2026-10-05"), "2026-09-19T00:00:00Z");
  assert.equal(bootstrapSince([], "2026-10-05"), "2026-08-06T00:00:00Z");
});
