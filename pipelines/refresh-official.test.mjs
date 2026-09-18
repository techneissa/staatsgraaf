import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ClosureThresholdError,
  buildPersonIndex,
  enforceClosureThreshold,
  matchBewindspersoonPosition,
  normalizeName,
  parseEersteKamerLeden,
  parseRijksoverheidBewindspersonen,
  parseTweedeKamerOData,
  planRefresh,
  resolvePerson,
  runRefresh,
  slugify,
} from "./refresh-official.mjs";

const RIJKSOVERHEID_HTML = `
<main>
  <a href="/regering/bewindspersonen/kabinet-jetten" class="card card--photo-nav card--link">
    <span class="link-plus__title">Kabinet-Jetten</span>
    <div class="card__summary"><p class="card__subtitle">Overzicht van het kabinet</p></div>
  </a>
  <a href="/regering/bewindspersonen/rob-jetten" class="card card--photo-nav card--link card--large">
    <span class="link-plus__title">Rob Jetten</span>
    <div class="card__summary"><p class="card__subtitle">Minister-president, Minister van Algemene Zaken</p></div>
  </a>
  <a href="/regering/bewindspersonen/dilan-yesilgoz-zegerius" class="card card--photo-nav">
    <span class="link-plus__title">Dilan Ye&#351;ilg&ouml;z-Zegerius</span>
    <div class="card__summary"><p class="card__subtitle">Minister van Defensie, 1e viceminister-president</p></div>
  </a>
</main>`;

const EERSTE_KAMER_HTML = `
<ul>
  <li class="persoon grid-x nowr">
    <a href="/persoon/r_van_aelst_den_uijl_ma_sp">
      <div class="persoon_bijschrift"><div class="naam">R. van Aelst-den Uijl MA</div></div>
      <div>SP</div>
      <div>Anci&euml;nniteit: 948 dagen</div>
      <div>Woonplaats: Gorinchem, Zuid-Holland</div>
    </a>
  </li>
  <li class="persoon grid-x nowr">
    <a href="/persoon/dr_mr_j_bakker_klein_cda">
      <div class="persoon_bijschrift"><div class="naam">dr. mr. J. Bakker-Klein</div></div>
      <div>CDA</div>
      <div>Anci&euml;nniteit: 1.193 dagen</div>
    </a>
  </li>
</ul>`;

const TK_ODATA = {
  value: [
    {
      Id: "row-1",
      Persoon_Id: "p-1",
      FractieZetel_Id: "fz-1",
      Functie: "Lid",
      Van: "2025-11-12T00:00:00+01:00",
      TotEnMet: null,
      Verwijderd: false,
      Persoon: { Id: "p-1", Voornamen: "Ahlam", Tussenvoegsel: null, Achternaam: "Oualhadj", Fractielabel: null },
      FractieZetel: { Id: "fz-1", Fractie_Id: "f-1", Fractie: { Afkorting: "D66", NaamNL: "Democraten 66" } },
    },
    {
      Id: "row-2",
      Persoon_Id: "p-2",
      FractieZetel_Id: "fz-2",
      Functie: "Fractievoorzitter",
      Van: "2023-12-06T00:00:00+01:00",
      TotEnMet: null,
      Verwijderd: false,
      Persoon: { Id: "p-2", Voornamen: "Stephan Ruben Tobias", Tussenvoegsel: "van", Achternaam: "Baarle", Fractielabel: null },
      FractieZetel: { Id: "fz-2", Fractie_Id: "f-2", Fractie: { Afkorting: "DENK", NaamNL: "DENK" } },
    },
    {
      Id: "row-3",
      Persoon_Id: null,
      FractieZetel_Id: null,
      Functie: null,
      Van: null,
      TotEnMet: null,
      Verwijderd: true,
    },
  ],
};

function emptyFetched(overrides = {}) {
  return {
    generatedAt: "2026-09-18T00:00:00.000Z",
    endpointsUsed: [],
    gaps: [],
    rawFiles: [],
    bodies: {
      bewindspersonen: { ok: false, status: 500, url: "https://example.org/rijk", items: [], error: "HTTP 500" },
      eersteKamer: { ok: false, status: 500, url: "https://example.org/ek", items: [], error: "HTTP 500" },
      tweedeKamer: { ok: false, status: 500, url: "https://example.org/tk", items: [], error: "HTTP 500" },
      ...overrides,
    },
  };
}

function tkMembership(index, person) {
  return {
    id: `membership:tweede-kamer-${person}`,
    organization: "org:tweede-kamer",
    person: `person:${person}`,
    seatNumber: null,
    fractie: "XX",
    start: "2021-03-31",
    end: null,
    source: { source: "src:tk-odata-fractiezetelpersonen", retrieved: "2026-09-17", confidence: "high" },
  };
}

test("parseRijksoverheidBewindspersonen reads name, role and url and skips the cabinet overview", () => {
  const items = parseRijksoverheidBewindspersonen(RIJKSOVERHEID_HTML);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    slug: "rob-jetten",
    name: "Rob Jetten",
    role: "Minister-president, Minister van Algemene Zaken",
    url: "https://www.rijksoverheid.nl/regering/bewindspersonen/rob-jetten",
  });
  assert.equal(items[1].name, "Dilan Yeşilgöz-Zegerius");
  assert.equal(items[1].role, "Minister van Defensie, 1e viceminister-president");
});

test("parseEersteKamerLeden reads name, party, days and url", () => {
  const items = parseEersteKamerLeden(EERSTE_KAMER_HTML);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    slug: "r_van_aelst_den_uijl_ma_sp",
    name: "R. van Aelst-den Uijl MA",
    party: "SP",
    ancienniteitDays: 948,
    url: "https://www.eerstekamer.nl/persoon/r_van_aelst_den_uijl_ma_sp",
  });
  assert.equal(items[1].party, "CDA");
  assert.equal(items[1].ancienniteitDays, 1193);
});

test("parseTweedeKamerOData builds names, fractie and Van-date and drops tombstones", () => {
  const items = parseTweedeKamerOData(TK_ODATA);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    odataId: "row-1",
    personId: "p-1",
    name: "Ahlam Oualhadj",
    fractie: "D66",
    start: "2025-11-12",
    functie: "Lid",
  });
  assert.equal(items[1].name, "Stephan Ruben Tobias van Baarle");
  assert.equal(items[1].functie, "Fractievoorzitter");
});

test("parseTweedeKamerOData also accepts separate lookup maps", () => {
  const personenById = new Map([["p-1", { Id: "p-1", Voornamen: "Ahlam", Tussenvoegsel: null, Achternaam: "Oualhadj" }]]);
  const fractieZetelsById = new Map([["fz-1", { Id: "fz-1", Fractie_Id: "f-1" }]]);
  const fractiesById = new Map([["f-1", { Afkorting: "D66" }]]);
  const items = parseTweedeKamerOData({
    value: [TK_ODATA.value[0]],
    personenById,
    fractieZetelsById,
    fractiesById,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].name, "Ahlam Oualhadj");
  assert.equal(items[0].fractie, "D66");
});

test("resolvePerson reuses the id on an exact normalized name or alias", () => {
  const index = buildPersonIndex([
    { id: "person:a", name: "Elanor Boekholt-O’Sullivan", aliases: ["E. Boekholt-O'Sullivan"] },
    { id: "person:b", name: "Rob Jetten", aliases: [] },
  ]);
  assert.equal(normalizeName("Elanor Boekholt-O’Sullivan"), normalizeName("Elanor Boekholt-O'Sullivan"));
  assert.deepEqual(resolvePerson("Elanor Boekholt-O’Sullivan", index), { status: "matched", id: "person:a" });
  assert.deepEqual(resolvePerson("E. Boekholt-O'Sullivan", index), { status: "matched", id: "person:a" });
});

test("resolvePerson marks ambiguous matches and never fuzzy matches a partial name", () => {
  const index = buildPersonIndex([
    { id: "person:a", name: "Jan de Vries", aliases: [] },
    { id: "person:b", name: "Jan de Vries", aliases: [] },
    { id: "person:c", name: "Jane Doe", aliases: [] },
  ]);
  assert.deepEqual(resolvePerson("Jan de Vries", index), { status: "ambiguous", candidates: ["person:a", "person:b"] });
  assert.deepEqual(resolvePerson("Jan Doe", index), { status: "none" });
});

test("matchBewindspersoonPosition maps roles by slug, title and the minister-president form", () => {
  const positions = [
    { id: "pos:minister-president", title: "Minister-president en Minister van Algemene Zaken", organization: "org:ministerie-van-algemene-zaken" },
    { id: "pos:minister-van-defensie", title: "Minister van Defensie", organization: "org:ministerie-van-defensie" },
    { id: "pos:staatssecretaris-van-financien", title: "Staatssecretaris van Financiën", organization: "org:ministerie-van-financien" },
  ];
  assert.equal(matchBewindspersoonPosition("Minister-president, Minister van Algemene Zaken", positions), "pos:minister-president");
  assert.equal(matchBewindspersoonPosition("Minister van Defensie, 1e viceminister-president", positions), "pos:minister-van-defensie");
  assert.equal(matchBewindspersoonPosition("Staatssecretaris van Financiën", positions), "pos:staatssecretaris-van-financien");
  assert.equal(matchBewindspersoonPosition("Minister van Ruimtevaart", positions), null);
});

test("planRefresh closes absent holders and opens a genuinely new member", () => {
  const dataset = {
    organizations: [{ id: "org:tweede-kamer" }],
    positions: [],
    people: [{ id: "person:blijver", name: "Blijver", aliases: [] }],
    tenures: [],
    memberships: [tkMembership(1, "blijver"), tkMembership(2, "vertrekker")],
    sources: [{ id: "src:tk-odata-fractiezetelpersonen", url: "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/FractieZetelPersoon?$filter=Verwijderd eq false and TotEnMet eq null", title: "oud", publisher: "TK", type: "api", retrieved: "2026-09-17" }],
  };
  const fetched = emptyFetched({
    tweedeKamer: {
      ok: true,
      status: 200,
      url: "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/FractieZetelPersoon",
      items: [
        { personId: "p-1", name: "Blijver", fractie: "XX", start: "2021-03-31", functie: "Lid" },
        { personId: "p-2", name: "Nieuweling", fractie: "YY", start: "2026-09-01", functie: "Lid" },
      ],
    },
  });

  const plan = planRefresh({ fetched, dataset, today: "2026-09-18", maxClosures: 5 });
  assert.equal(plan.closures.length, 1);
  assert.equal(plan.closures[0].record.person, "person:vertrekker");
  assert.equal(plan.closures[0].record.end, "2026-09-18");
  assert.equal(plan.stats.opened, 1);
  assert.equal(plan.stats.newPeople, 1);
  const nieuweling = plan.envelope.memberships.find((m) => m.fractie === "YY");
  assert.equal(nieuweling.start, "2026-09-01");
  const blijver = plan.envelope.memberships.find((m) => m.person === "person:blijver");
  assert.equal(blijver.source.source, "src:tk-odata-fractiezetelpersonen-expand");
});

test("the closure threshold aborts without writing the envelope", async () => {
  const dataset = {
    organizations: [{ id: "org:tweede-kamer" }],
    positions: [],
    people: [],
    tenures: [],
    memberships: Array.from({ length: 6 }, (_, index) => tkMembership(index + 1, `p${index + 1}`)),
    sources: [],
  };
  const fetched = emptyFetched({
    tweedeKamer: { ok: true, status: 200, url: "https://example.org/tk", items: [] },
  });

  assert.throws(() => enforceClosureThreshold([{}, {}, {}, {}, {}, {}], 5), ClosureThresholdError);

  const writes = [];
  await assert.rejects(
    runRefresh({
      fetched,
      dataset,
      today: "2026-09-18",
      now: new Date("2026-09-18T00:00:00Z"),
      maxClosures: 5,
      io: {
        writeFile: async (path) => writes.push(path),
        mkdir: async () => {},
      },
      log: () => {},
    }),
    ClosureThresholdError,
  );
  assert.deepEqual(writes, []);
});

test("slugify produces schema-safe ids", () => {
  assert.equal(slugify("Elanor Boekholt-O’Sullivan"), "elanor-boekholt-o-sullivan");
  assert.equal(slugify("A.J.M. van Kesteren"), "a-j-m-van-kesteren");
});
