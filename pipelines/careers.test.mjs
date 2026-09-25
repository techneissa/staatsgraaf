import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  comparePartial,
  dedupe,
  isPoliticalTitle,
  itemFacts,
  mergeConsecutiveTerms,
  officialOffices,
  normalizeDate,
  organizationIndex,
  rawStatements,
  resolveOrganization,
  resolveStatements,
  runCareers,
  sortEntries,
  tkEntries,
  tkPersoonUrl,
  wikidataDate,
  wikidataEntries,
} from "./careers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("normalizeDate keeps the precision the source gives", () => {
  assert.equal(normalizeDate("2018"), "2018");
  assert.equal(normalizeDate("2018-04"), "2018-04");
  assert.equal(normalizeDate("2010-04-08"), "2010-04-08");
  assert.equal(normalizeDate("2010-04-08T00:00:00"), "2010-04-08");
  assert.equal(normalizeDate("08-04-2010"), "2010-04-08");
  assert.equal(normalizeDate("2010-02-30"), "2010-02");
  assert.equal(normalizeDate("heden"), null);
  assert.equal(normalizeDate(null), null);
  assert.equal(normalizeDate(""), null);
});

test("comparePartial compares on the common precision", () => {
  assert.equal(comparePartial("2018", "2018-05-01"), 0);
  assert.equal(comparePartial("2017", "2018-05-01"), -1);
  assert.equal(comparePartial("2026-03-31", "2026-09-25"), -1);
});

test("wikidataDate follows the time precision", () => {
  assert.equal(wikidataDate("2017-10-26T00:00:00Z", "11"), "2017-10-26");
  assert.equal(wikidataDate("2017-10-01T00:00:00Z", 10), "2017-10");
  assert.equal(wikidataDate("2017-01-01T00:00:00Z", 9), "2017");
  assert.equal(wikidataDate("2000-01-01T00:00:00Z", 8), null);
  assert.equal(wikidataDate("+2004-04-31T00:00:00Z", 11), "2004-04");
});

test("tkEntries maps the three TK lists and marks only active side jobs as current", () => {
  const gaps = [];
  const entries = tkEntries({
    PersoonLoopbaan: [
      { Id: "a", Functie: "Wethouder/1e locoburgemeester", Werkgever: "Hendrik-Ido-Ambacht", Van: "2018", TotEnMet: "2023" },
      { Id: "b", Functie: "Ondernemer", Werkgever: null, Van: "1997", TotEnMet: "2014" },
      { Id: "x", Functie: "Weg", Verwijderd: true },
    ],
    PersoonNevenfunctie: [
      { Id: "c", Omschrijving: "Vicevoorzitter Bestuurdersvereniging SGP", PeriodeVan: "2016-11-01", PeriodeTotEnMet: null, IsActief: true },
      { Id: "d", Omschrijving: "Columnist", PeriodeVan: "2024-05-28", PeriodeTotEnMet: "2026-03-31", IsActief: true },
    ],
    PersoonOnderwijs: [{ Id: "e", OpleidingNl: "Bestuurskunde", Instelling: "Universiteit van Utrecht", Van: null, TotEnMet: null }],
  }, "2026-09-25", gaps);
  assert.deepEqual(entries.map((e) => [e.title, e.kind, e.current]), [
    ["Wethouder/1e locoburgemeester", "politiek", false],
    ["Ondernemer", "loopbaan", false],
    ["Vicevoorzitter Bestuurdersvereniging SGP", "nevenfunctie", true],
    ["Columnist", "nevenfunctie", false],
    ["Bestuurskunde", "opleiding", false],
  ]);
  assert.equal(gaps.length, 1);
  assert.equal(entries[0].organization, "Hendrik-Ido-Ambacht");
});

test("isPoliticalTitle recognises public offices", () => {
  assert.ok(isPoliticalTitle("Lid Tweede Kamer"));
  assert.ok(isPoliticalTitle("Gemeenteraadslid"));
  assert.ok(isPoliticalTitle("Minister van Financiën"));
  assert.ok(!isPoliticalTitle("Advocaat", "Houthoff"));
});

const t = (time, precision) => ({ snaktype: "value", datavalue: { value: { time, precision } } });
const q = (id) => ({ snaktype: "value", datavalue: { value: { id } } });
const ENTITY = {
  claims: {
    P39: [
      { id: "s1", rank: "normal", mainsnak: q("Q10"), qualifiers: { P580: [t("+2017-03-23T00:00:00Z", 11)], P582: [t("+2021-03-30T00:00:00Z", 11)] }, references: [{}] },
      { id: "s2", rank: "normal", mainsnak: q("Q10"), qualifiers: { P580: [t("+2021-03-31T00:00:00Z", 11)] }, references: [{}] },
      { id: "s5", rank: "deprecated", mainsnak: q("Q10"), qualifiers: { P580: [t("+1990-01-01T00:00:00Z", 9)] } },
      { id: "s6", rank: "normal", mainsnak: q("Q11"), qualifiers: {} },
      { id: "s7", rank: "normal", mainsnak: q("Q12"), qualifiers: {} },
    ],
    P108: [
      { id: "s3", rank: "normal", mainsnak: q("Q30"), qualifiers: { P580: [t("+2000-01-01T00:00:00Z", 9)] }, references: [{}] },
      { id: "s4", rank: "normal", mainsnak: q("Q31"), qualifiers: { P580: [t("+2005-01-01T00:00:00Z", 9)], P582: [t("+2010-01-01T00:00:00Z", 9)] }, references: [{}] },
      { id: "s8", rank: "normal", mainsnak: q("Q181912"), qualifiers: {}, references: [{}] },
      { id: "s9", rank: "normal", mainsnak: q("Q32"), qualifiers: {} },
    ],
    P106: [
      { id: "s10", rank: "normal", mainsnak: q("Q2095549"), qualifiers: {}, references: [{}] },
      { id: "s11", rank: "normal", mainsnak: q("Q16533"), qualifiers: {} },
    ],
  },
};
const ITEMS = {
  Q10: itemFacts({ labels: { nl: { value: "lid van de Tweede Kamer" } }, claims: { P361: [{ rank: "normal", mainsnak: q("Q20") }] } }),
  Q20: itemFacts({ labels: { nl: { value: "Tweede Kamer" } } }),
  Q30: itemFacts({ labels: {} }),
  Q31: itemFacts({ labels: { nl: { value: "Universiteit Leiden" } } }),
  Q11: itemFacts({ labels: { nl: { value: "Koning der Nederlanden" } } }),
  Q12: itemFacts({ labels: { nl: { value: "burgemeester van Utrecht" } } }),
  Q32: itemFacts({ labels: { nl: { value: "Shell" } } }),
  Q181912: itemFacts({ labels: { nl: { value: "Koninklijke Luchtvaart Maatschappij" } } }),
  Q2095549: itemFacts({ labels: { nl: { value: "piloot" } } }),
  Q16533: itemFacts({ labels: { nl: { value: "rechter" } } }),
};
const STATEMENTS = resolveStatements(rawStatements(ENTITY), ITEMS);

test("wikidataEntries keeps referenced claims, dated or not, and occupations apart from employers", () => {
  const counters = { noLabel: 0, undated: 0, unreferenced: 0 };
  const confirms = (title) => /Koning/.test(title);
  const entries = wikidataEntries(STATEMENTS, counters, confirms);
  assert.equal(counters.noLabel, 1);
  // s7 (P39 burgemeester, not confirmed), s9 (P108 Shell) and s11 (P106 rechter) have no reference.
  assert.equal(counters.unreferenced, 3);
  assert.deepEqual(sortEntries(entries).map((e) => [e.title, e.organization, e.start, e.end, e.kind, e.current]), [
    ["lid van de Tweede Kamer", "Tweede Kamer", "2017-03-23", null, "politiek", false],
    ["Universiteit Leiden", "Universiteit Leiden", "2005", "2010", "loopbaan", false],
    ["Koning der Nederlanden", null, null, null, "politiek", false],
    ["Koninklijke Luchtvaart Maatschappij", "Koninklijke Luchtvaart Maatschappij", null, null, "loopbaan", false],
    ["piloot", null, null, null, "beroep", false],
  ]);
});

test("officialOffices confirms an office only from a non-Wikidata source", () => {
  const confirmsFor = officialOffices({
    tenures: [{ person: "person:k", position: "pos:koning", source: { source: "src:koninklijkhuis-koning" } }],
    memberships: [{ person: "person:m", organization: "org:tk", source: { source: "src:wikidata-m" } }],
    positions: [{ id: "pos:koning", title: "Koning", organization: null }],
    organizations: [{ id: "org:tk", name: "Tweede Kamer" }],
  });
  assert.ok(confirmsFor("person:k")("Koning der Nederlanden", null));
  assert.ok(!confirmsFor("person:k")("burgemeester van Utrecht", null));
  assert.ok(!confirmsFor("person:m")("lid van de Tweede Kamer", "Tweede Kamer"));
});

test("mergeConsecutiveTerms leaves a gap of more than a week alone", () => {
  const base = { value: "Q10", title: "t", organization: null, kind: "politiek" };
  const out = mergeConsecutiveTerms([
    { ...base, start: "2010-01-01", end: "2012-01-01" },
    { ...base, start: "2013-06-01", end: "2015-01-01" },
  ]);
  assert.equal(out.length, 2);
});

test("dedupe prefers TK over Wikidata for the same office", () => {
  const tk = { origin: "tk", rank: 1, title: "Wethouder gemeente Hendrik-Ido-Ambacht", organization: null, start: "2010-04-08", end: "2023-12-05", kind: "nevenfunctie" };
  const wd = { origin: "wikidata", rank: 3, title: "wethouder", organization: "Hendrik-Ido-Ambacht", start: "2010", end: "2023", kind: "politiek" };
  const other = { origin: "wikidata", rank: 3, title: "burgemeester", organization: "Dordrecht", start: "2010", end: null, kind: "politiek" };
  const { entries, dropped } = dedupe([wd, tk, other]);
  assert.equal(dropped, 1);
  assert.deepEqual(entries.map((e) => e.origin), ["tk", "wikidata"]);
});

test("sortEntries puts current first, then newest start, undated last", () => {
  const sorted = sortEntries([
    { title: "a", start: "2001", end: "2005", current: false, rank: 0 },
    { title: "b", start: null, end: null, current: false, rank: 2 },
    { title: "c", start: "1999", end: null, current: true, rank: 1 },
    { title: "d", start: "2015-06", end: null, current: false, rank: 0 },
    { title: "e", start: null, end: "1990", current: false, rank: 0 },
  ]);
  assert.deepEqual(sorted.map((e) => e.title), ["c", "d", "a", "e", "b"]);
});

test("resolveOrganization resolves only an exact, unique name or alias", () => {
  const index = organizationIndex([
    { id: "org:a", name: "Ministerie van Financiën", aliases: ["Financiën"] },
    { id: "org:b", name: "Raad", aliases: [] },
    { id: "org:c", name: "Raad", aliases: [] },
  ]);
  assert.equal(resolveOrganization("Ministerie van Financiën", index), "org:a");
  assert.equal(resolveOrganization("Financiën", index), "org:a");
  assert.equal(resolveOrganization("ministerie van financiën", index), null);
  assert.equal(resolveOrganization("Raad", index), null);
  assert.equal(resolveOrganization(null, index), null);
});

test("runCareers offline writes careers, sources and a report from the cache", async () => {
  const root = await mkdtemp(join(tmpdir(), "careers-"));
  const dataDir = join(root, "data");
  const cacheDir = join(root, "cache");
  await mkdir(join(cacheDir, "tk"), { recursive: true });
  await mkdir(dataDir, { recursive: true });
  const tkId = "2bea63db-715f-401f-b710-e91c7650df0c";
  await writeFile(join(dataDir, "people.json"), JSON.stringify([
    { id: "person:jan", slug: "jan", name: "Jan", wikidata: "Q1" },
    { id: "person:piet", slug: "piet", name: "Piet", wikidata: null },
  ]));
  await writeFile(join(dataDir, "organizations.json"), JSON.stringify([{ id: "org:tk", name: "Tweede Kamer", aliases: [] }]));
  await writeFile(join(dataDir, "sources.json"), JSON.stringify([{ id: "src:keep", url: "https://example.org/", title: "k", publisher: "p", type: "page", retrieved: "2026-09-01" }]));
  const matchesPath = join(root, "matches.json");
  await writeFile(matchesPath, JSON.stringify({ people: { "person:jan": { group: "tweede-kamerlid", tkPersoon: tkId }, "person:piet": { group: "overig", tkPersoon: null } } }));
  await writeFile(join(cacheDir, "tk", `${tkId}.json`), JSON.stringify({
    retrieved: "2026-09-25",
    tkPersoon: tkId,
    url: tkPersoonUrl(tkId),
    value: { PersoonLoopbaan: [{ Id: "a", Functie: "Leraar", Werkgever: "School", Van: "2001", TotEnMet: "2005" }], PersoonNevenfunctie: [], PersoonOnderwijs: [] },
  }));
  await writeFile(join(cacheDir, "wikidata.json"), JSON.stringify({ retrieved: "2026-09-25", persons: { Q1: rawStatements(ENTITY) }, items: ITEMS }));
  const reportPath = join(root, "report.md");
  const result = await runCareers({ root, dataDir, cacheDir, matchesPath, today: "2026-09-25", offline: true, reportPath, log: () => {} });
  const careers = JSON.parse(await readFile(join(dataDir, "careers.json"), "utf8"));
  assert.deepEqual(careers.map((c) => [c.id, c.title, c.organizationId, c.source.source, c.source.confidence]), [
    ["career:jan-1", "lid van de Tweede Kamer", "org:tk", "src:wikidata-jan", "medium"],
    ["career:jan-2", "Universiteit Leiden", null, "src:wikidata-jan", "medium"],
    ["career:jan-3", "Leraar", null, "src:tk-loopbaan-jan", "high"],
    ["career:jan-4", "Koninklijke Luchtvaart Maatschappij", null, "src:wikidata-jan", "medium"],
    ["career:jan-5", "piloot", null, "src:wikidata-jan", "medium"],
  ]);
  const sources = JSON.parse(await readFile(join(dataDir, "sources.json"), "utf8"));
  assert.deepEqual(sources.map((s) => s.id), ["src:keep", "src:tk-loopbaan-jan", "src:wikidata-jan"]);
  assert.ok(existsSync(reportPath));
  assert.equal(result.stats.tkEntries, 1);
});

test("data/careers.json: every record is well formed and sorted per person", () => {
  const file = join(ROOT, "data", "careers.json");
  if (!existsSync(file)) return;
  const records = JSON.parse(readFileSync(file, "utf8"));
  const byPerson = new Map();
  for (const r of records) {
    if (!byPerson.has(r.person)) byPerson.set(r.person, []);
    byPerson.get(r.person).push(r);
  }
  for (const [, list] of byPerson) {
    assert.ok(list.length <= 25);
    let seenPast = false;
    for (const r of list) {
      if (!r.current) seenPast = true;
      else assert.ok(!seenPast, `${r.id}: current entry after a past one`);
    }
    list.forEach((r, i) => assert.ok(r.id.endsWith(`-${i + 1}`)));
  }
});
