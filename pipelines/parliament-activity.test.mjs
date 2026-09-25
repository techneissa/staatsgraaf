import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  TERM_START,
  TK_ODATA,
  actorListUrl,
  buildItem,
  coSubmittersOf,
  kamerstukOf,
  listEntries,
  matchPeople,
  outcomeOf,
  personEvidence,
  personGroup,
  publicUrlOf,
  runParliamentActivity,
  tkNameForms,
  totalsOf,
  wikidataBirthDate,
  zaakDetailUrl,
} from "./parliament-activity.mjs";

const wilders = {
  Id: "6d33b9bc-7d3a-4a60-b2d7-c2b70cd11ab1",
  Voornamen: "Geert",
  Roepnaam: "Geert",
  Tussenvoegsel: null,
  Achternaam: "Wilders",
  Geboortedatum: "1963-09-06",
  Verwijderd: false,
};
const deRoon = {
  Id: "c60c655f-40ba-47b0-8e93-a2c8d1ff4743",
  Voornamen: "Raymond",
  Roepnaam: "Raymond",
  Tussenvoegsel: "de",
  Achternaam: "Roon",
  Geboortedatum: "1952-07-24",
  Verwijderd: false,
};

const evidence = (person) => personEvidence(person);

test("TK name forms cover given names and call name with tussenvoegsel", () => {
  assert.deepEqual(
    tkNameForms({ Voornamen: "Rob Arnoldus Adrianus", Roepnaam: "Rob", Tussenvoegsel: null, Achternaam: "Jetten" }),
    ["rob arnoldus adrianus jetten", "rob jetten"],
  );
  assert.deepEqual(tkNameForms({ Voornamen: null, Roepnaam: null, Achternaam: null }), []);
  assert.ok(tkNameForms(deRoon).includes("raymond de roon"));
});

test("initials are never a full name", () => {
  const { names } = personEvidence({ id: "person:x", name: "H.W.M. Schoof", aliases: ["G. Wilders"], birthDate: null });
  assert.equal(names.size, 0);
});

test("a match needs the full name and the same birth date", () => {
  const people = [
    { id: "person:geert-wilders", slug: "geert-wilders", name: "Geert Wilders", aliases: [], birthDate: "1963-09-06" },
    { id: "person:no-birth", slug: "no-birth", name: "Raymond de Roon", aliases: [], birthDate: null },
    { id: "person:other-birth", slug: "other-birth", name: "Raymond de Roon", aliases: [], birthDate: "1960-01-01" },
    { id: "person:initials", slug: "initials", name: "G. Wilders", aliases: [], birthDate: "1963-09-06" },
  ];
  const { matches, unmatched } = matchPeople(people, [wilders, deRoon], evidence);
  assert.equal(matches.get("person:geert-wilders")?.persoon.Id, wilders.Id);
  assert.match(matches.get("person:geert-wilders").identity, /1963-09-06/);
  assert.match(unmatched.get("person:no-birth"), /geen geboortedatum/);
  assert.match(unmatched.get("person:other-birth"), /wijkt af/);
  assert.match(unmatched.get("person:initials"), /initialen/);
});

test("birth dates from the portraits review and Wikidata count as evidence", () => {
  const person = { id: "person:raymond-de-roon", slug: "raymond-de-roon", name: "Raymond de Roon", aliases: [], birthDate: null, wikidata: "Q1" };
  const viaReview = personEvidence(person, { review: { expectName: "Raymond de Roon", birthDate: "1952-07-24", wikidata: "Q1" } });
  assert.equal(viaReview.births.has("1952-07-24"), true);
  const viaWikidata = personEvidence(person, { wikidataBirth: "1952-07-24" });
  assert.match(viaWikidata.births.get("1952-07-24"), /Wikidata Q1/);
  // A reviewed entry for another entity is ignored.
  const other = personEvidence(person, { review: { expectName: "Raymond de Roon", birthDate: "1952-07-24", wikidata: "Q2" } });
  assert.equal(other.births.size, 0);
});

test("two dataset people on one TK Persoon are both unmatched", () => {
  const people = [
    { id: "person:a", slug: "a", name: "Geert Wilders", aliases: [], birthDate: "1963-09-06" },
    { id: "person:b", slug: "b", name: "Geert Wilders", aliases: [], birthDate: "1963-09-06" },
  ];
  const { matches, unmatched } = matchPeople(people, [wilders], evidence);
  assert.equal(matches.size, 0);
  assert.match(unmatched.get("person:a"), /meer dan een persoon/);
});

test("wikidataBirthDate reads only day precision", () => {
  const entity = (time, precision) => ({ claims: { P569: [{ mainsnak: { datavalue: { value: { time, precision } } } }] } });
  assert.equal(wikidataBirthDate(entity("+1981-07-10T00:00:00Z", 11)), "1981-07-10");
  assert.equal(wikidataBirthDate(entity("+1998-00-00T00:00:00Z", 9)), null);
  assert.equal(wikidataBirthDate(undefined), null);
});

test("outcome: only Stemmen besluiten count, a final outcome beats aangehouden", () => {
  assert.equal(outcomeOf([{ BesluitSoort: "Ingediend", Status: "Besluit" }]), null);
  assert.equal(outcomeOf([{ BesluitSoort: "Stemmen - verworpen", Status: "Besluit", GewijzigdOp: "2026-09-08" }]), "verworpen");
  assert.equal(
    outcomeOf([
      { BesluitSoort: "Stemmen - aangenomen", Status: "Besluit", GewijzigdOp: "2026-01-01" },
      { BesluitSoort: "Stemmen - aangehouden", Status: "Besluit", GewijzigdOp: "2026-02-01" },
    ]),
    "aangenomen",
  );
  assert.equal(outcomeOf([{ BesluitSoort: "Stemmen - aangehouden (al tijdens debat)", Status: "Besluit" }]), "aangehouden");
  assert.equal(outcomeOf([{ BesluitSoort: "Stemmen - aangenomen", Status: "Besluit", Verwijderd: true }]), null);
  assert.equal(outcomeOf([{ BesluitSoort: "Stemmen - aangenomen", Status: "Concept" }]), null);
});

test("kamerstuk number from dossier, toevoeging and volgnummer", () => {
  assert.equal(kamerstukOf({ Volgnummer: 791, Kamerstukdossier: [{ Nummer: 23432, Toevoeging: null }] }), "23432, nr. 791");
  assert.equal(kamerstukOf({ Volgnummer: 12, Kamerstukdossier: [{ Nummer: 36600, Toevoeging: "VII" }] }), "36600-VII, nr. 12");
  assert.equal(kamerstukOf({ Volgnummer: 0, Kamerstukdossier: [{ Nummer: 37025, Toevoeging: null }] }), "37025");
  assert.equal(kamerstukOf({ Volgnummer: 8, Kamerstukdossier: [{ Nummer: 36688, Toevoeging: "(R2205)" }] }), "36688 (R2205), nr. 8");
  assert.equal(kamerstukOf({ Volgnummer: -1, Kamerstukdossier: [] }), null);
});

test("public links follow the confirmed patterns, else the OData record", () => {
  const motie = {
    Id: "0784eabb-c713-4797-87c1-5996a1a12971",
    Nummer: "2026Z17941",
    Kamerstukdossier: [{ Nummer: 23432, Toevoeging: null }],
    Document: [{ Soort: "Motie", DocumentNummer: "2026D40912", Datum: "2026-09-03" }],
  };
  assert.equal(publicUrlOf(motie, "motie"), "https://www.tweedekamer.nl/kamerstukken/detail?id=2026Z17941&did=2026D40912");
  const bill = { Id: "x", Nummer: "2026Z18843", Kamerstukdossier: [{ Nummer: 37025, Toevoeging: null }], Document: [] };
  assert.equal(
    publicUrlOf(bill, "wetsvoorstel"),
    "https://www.tweedekamer.nl/kamerstukken/wetsvoorstellen/detail?cfg=wetsvoorsteldetails&qry=wetsvoorstel%3A37025",
  );
  const bare = { Id: "abc", Nummer: "2026Z1", Kamerstukdossier: [], Document: [] };
  assert.equal(publicUrlOf(bare, "motie"), `${TK_ODATA}/Zaak(abc)`);
  const multi = {
    Id: "y",
    Nummer: "2026Z2",
    Kamerstukdossier: [],
    Document: [
      { Soort: "Antwoord schriftelijke vragen", DocumentNummer: "2026D2", Datum: "2026-02-01" },
      { Soort: "Schriftelijke vragen", DocumentNummer: "2026D1", Datum: "2026-01-01" },
    ],
  };
  assert.match(publicUrlOf(multi, "schriftelijke-vragen"), /did=2026D1$/);
});

test("co-submitters exclude the person, keep the indiener first and resolve ids", () => {
  const zaak = {
    ZaakActor: [
      { Relatie: "Voortouwcommissie", ActorNaam: "TK", Persoon_Id: null },
      { Relatie: "Medeindiener", ActorNaam: "G. Wilders", ActorFractie: "PVV", Persoon_Id: wilders.Id },
      { Relatie: "Medeindiener", ActorNaam: "X. Onbekend", ActorFractie: "PVV", Persoon_Id: "ffffffff-0000-0000-0000-000000000000" },
      { Relatie: "Indiener", ActorNaam: "R. de Roon", ActorFractie: "PVV", Persoon_Id: deRoon.Id },
    ],
  };
  const out = coSubmittersOf(zaak, wilders.Id, new Map([[deRoon.Id, "person:raymond-de-roon"]]));
  assert.deepEqual(out, [
    { person: "person:raymond-de-roon", name: "R. de Roon", party: "PVV", role: "indiener" },
    { person: null, name: "X. Onbekend", party: "PVV", role: "medeindiener" },
  ]);
});

test("list entries: window, kinds, one entry per zaak with indiener winning, newest first", () => {
  const row = (id, soort, date, relatie) => ({ Relatie: relatie, Zaak: { Id: id, Nummer: `2026Z${id}`, Soort: soort, GestartOp: `${date}T00:00:00+02:00` } });
  const entries = listEntries([
    row("1", "Motie", "2026-09-01", "Medeindiener"),
    row("1", "Motie", "2026-09-01", "Indiener"),
    row("2", "Mondelinge vragen", "2026-09-02", "Indiener"),
    row("3", "Schriftelijke vragen", "2026-09-03", "Indiener"),
    row("4", "Motie", "2023-11-30", "Indiener"),
    row("5", "Amendement", "2024-01-10", "Gericht aan"),
  ]);
  assert.deepEqual(entries.map((e) => [e.zaakId, e.role, e.kind]), [
    ["3", "indiener", "schriftelijke-vragen"],
    ["1", "indiener", "motie"],
  ]);
  assert.deepEqual(totalsOf(entries), { motie: 1, amendement: 0, initiatiefwetsvoorstel: 0, wetsvoorstel: 0, "schriftelijke-vragen": 1 });
});

test("buildItem keeps the onderwerp verbatim and has no outcome for written questions", () => {
  const zaak = {
    Id: "z",
    Nummer: "2026Z19833",
    Soort: "Schriftelijke vragen",
    Onderwerp: "Het stelselmatig niet openbaar maken van ernstige incidenten met asielzoekers ",
    GestartOp: "2026-09-24T00:00:00+02:00",
    Volgnummer: -1,
    Kamerstukdossier: [],
    Document: [{ Soort: "Schriftelijke vragen", DocumentNummer: "2026D45966" }],
    Besluit: [{ BesluitSoort: "Stemmen - aangenomen", Status: "Besluit" }],
    ZaakActor: [],
  };
  const item = buildItem(zaak, "medeindiener", wilders.Id, new Map());
  assert.equal(item.id, "tk:2026Z19833");
  assert.equal(item.title, "Het stelselmatig niet openbaar maken van ernstige incidenten met asielzoekers");
  assert.equal(item.date, "2026-09-24");
  assert.equal(item.outcome, null);
  assert.equal(item.kamerstuk, null);
  assert.equal(buildItem({ ...zaak, Soort: "Brief regering" }, "indiener", wilders.Id, new Map()), null);
});

test("query URLs select little and filter on the window", () => {
  const url = decodeURIComponent(actorListUrl(wilders.Id));
  assert.match(url, /\$select=Id,Relatie,Functie,Verwijderd/);
  assert.match(url, new RegExp(`Zaak/GestartOp ge ${TERM_START}`));
  assert.doesNotMatch(actorListUrl(wilders.Id), /\+/);
  assert.match(decodeURIComponent(zaakDetailUrl(["a", "b"])), /Id eq a or Id eq b/);
});

test("person groups take the first match from bewindspersoon down", () => {
  const sets = { bewindspersonen: new Set(["person:a"]), tkMembers: new Set(["person:a", "person:b"]), ekMembers: new Set(["person:c"]) };
  assert.equal(personGroup("person:a", sets), "bewindspersoon");
  assert.equal(personGroup("person:b", sets), "tweede-kamerlid");
  assert.equal(personGroup("person:c", sets), "eerste-kamerlid");
  assert.equal(personGroup("person:d", sets), "overig");
});

test("a run writes activities, sources, the cache and the report, and re-runs offline", async () => {
  const root = await mkdtemp(join(tmpdir(), "parliament-activity-"));
  try {
    await mkdir(join(root, "data"), { recursive: true });
    await mkdir(join(root, "research", "raw", "portraits", "tk"), { recursive: true });
    const people = [
      { id: "person:geert-wilders", slug: "geert-wilders", name: "Geert Wilders", aliases: [], birthDate: "1963-09-06", wikidata: null, sources: [] },
      { id: "person:raymond-de-roon", slug: "raymond-de-roon", name: "Raymond de Roon", aliases: [], birthDate: "1952-07-24", wikidata: null, sources: [] },
    ];
    const files = {
      "people.json": people,
      "memberships.json": [{ id: "membership:x", organization: "org:tweede-kamer", person: "person:geert-wilders", start: "2023-12-06", end: null }],
      "tenures.json": [],
      "positions.json": [],
      "organizations.json": [],
      "sources.json": [{ id: "src:a", url: "https://example.org", title: "A", publisher: "A", type: "page", retrieved: "2026-09-01" }],
    };
    for (const [file, value] of Object.entries(files)) await writeFile(join(root, "data", file), JSON.stringify(value));
    await writeFile(join(root, "research", "raw", "portraits", "tk", "personen-alle.json"), JSON.stringify({ persons: [wilders, deRoon] }));

    const zaak = {
      Id: "0784eabb-c713-4797-87c1-5996a1a12971",
      Nummer: "2026Z17941",
      Soort: "Motie",
      Onderwerp: "Motie van de leden De Roon en Wilders over sancties",
      GestartOp: "2026-09-03T00:00:00+02:00",
      Volgnummer: 791,
      Kamerstukdossier: [{ Nummer: 23432, Toevoeging: null }],
      Document: [{ Soort: "Motie", DocumentNummer: "2026D40912", Datum: "2026-09-03" }],
      Besluit: [{ BesluitSoort: "Stemmen - verworpen", Status: "Besluit", GewijzigdOp: "2026-09-08" }],
      ZaakActor: [
        { Relatie: "Indiener", ActorNaam: "R. de Roon", ActorFractie: "PVV", Persoon_Id: deRoon.Id },
        { Relatie: "Medeindiener", ActorNaam: "G. Wilders", ActorFractie: "PVV", Persoon_Id: wilders.Id },
      ],
    };
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      const body = url.includes("/ZaakActor?")
        ? { value: [{ Relatie: url.includes(wilders.Id) ? "Medeindiener" : "Indiener", Zaak: { Id: zaak.Id, Nummer: zaak.Nummer, Soort: "Motie", GestartOp: zaak.GestartOp } }] }
        : { value: [zaak] };
      return { ok: true, status: 200, json: async () => body };
    };
    await runParliamentActivity({ root, fetchImpl, throttleMs: 0, today: "2026-09-25", log() {} });
    const activities = JSON.parse(await readFile(join(root, "data", "activities.json"), "utf8"));
    assert.equal(activities.length, 2);
    const w = activities.find((r) => r.person === "person:geert-wilders");
    assert.equal(w.items[0].role, "medeindiener");
    assert.equal(w.items[0].outcome, "verworpen");
    assert.equal(w.items[0].kamerstuk, "23432, nr. 791");
    assert.deepEqual(w.items[0].coSubmitters.map((c) => c.person), ["person:raymond-de-roon"]);
    assert.equal(w.source.source, "src:tk-activiteit-geert-wilders");
    const sources = JSON.parse(await readFile(join(root, "data", "sources.json"), "utf8"));
    assert.ok(sources.some((s) => s.id === "src:tk-activiteit-geert-wilders" && s.license === "CC0-1.0"));
    assert.ok(sources.some((s) => s.id === "src:a"));
    assert.ok(existsSync(join(root, "research", "qa", "parliament-activity-25-09-2026.md")));
    // Two lists plus one detail request (the shared zaak is fetched once).
    assert.equal(calls.length, 3);

    const before = await readFile(join(root, "data", "activities.json"), "utf8");
    await runParliamentActivity({
      root,
      offline: true,
      fetchImpl: async () => {
        throw new Error("no network in offline mode");
      },
      today: "2026-09-25",
      log() {},
    });
    assert.equal(await readFile(join(root, "data", "activities.json"), "utf8"), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("serializeActivities round-trips and puts one item per line", async () => {
  const { serializeActivities } = await import("./parliament-activity.mjs");
  const records = [
    { id: "activities:a", person: "person:a", items: [{ id: "tk:2026Z1" }, { id: "tk:2026Z2" }], source: { source: "src:x" } },
    { id: "activities:b", person: "person:b", items: [], source: { source: "src:y" } },
  ];
  const text = serializeActivities(records);
  assert.deepEqual(JSON.parse(text), records);
  assert.equal(text.split("\n").filter((line) => line.startsWith("  {\"id\":\"tk:")).length, 2);
  assert.equal(serializeActivities([]), "[]\n");
});
