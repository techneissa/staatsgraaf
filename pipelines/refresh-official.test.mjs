import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildPersonIndex,
  matchBewindspersoonPosition,
  normalizeName,
  parseEersteKamerLeden,
  parseRijksoverheidBewindspersonen,
  parseRijksoverheidCabinet,
  planRefresh,
  resolvePerson,
  runRefresh,
  slugify,
} from "./refresh-official.mjs";
import { parseEkFracties } from "./ek-live.mjs";

function html(name) {
  return readFileSync(new URL(`./fixtures/live/${name}`, import.meta.url), "utf8");
}

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

const TODAY = "2026-10-05";
const OLD = { source: "src:old", retrieved: "2026-09-17", confidence: "high" };

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

test("a card of any cabinet is skipped as a person and read as the cabinet slug", () => {
  const html2 = RIJKSOVERHEID_HTML.replaceAll("kabinet-jetten", "kabinet-nieuw").replace("Kabinet-Jetten", "Kabinet-Nieuw");
  assert.equal(parseRijksoverheidBewindspersonen(html2).length, 2);
  assert.deepEqual(parseRijksoverheidCabinet(html2), { slug: "kabinet-nieuw", name: "Kabinet-Nieuw" });
  assert.equal(parseRijksoverheidCabinet("<main></main>"), null);
  // today's page has no cabinet card: the slug comes from the image paths, the most frequent one wins
  const images = '"contentUrl":"https://www.rijksoverheid.nl/site/binaries/content/gallery/regering/bewindspersonen/kabinet-jetten/rob-jetten/a.jpg","x":"/bewindspersonen/kabinet-jetten/b/b.jpg","y":"/bewindspersonen/kabinet-schoof/c/c.jpg"';
  assert.deepEqual(parseRijksoverheidCabinet(`<main>${images}</main>`), { slug: "kabinet-jetten", name: null });
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

test("a role with a comma in its title matches the whole title, and a same-named Caribbean position is never taken", () => {
  const positions = [
    { id: "pos:minister-onderwijs-sport-aruba", title: "Minister van Onderwijs", organization: "org:land-aruba" },
    { id: "pos:minister-van-onderwijs-cultuur-en-wetenschap", title: "Minister van Onderwijs, Cultuur en Wetenschap", organization: "org:ministerie-van-onderwijs-cultuur-en-wetenschap" },
  ];
  assert.equal(matchBewindspersoonPosition("Minister van Onderwijs, Cultuur en Wetenschap", positions), "pos:minister-van-onderwijs-cultuur-en-wetenschap");
});

test("planRefresh keeps the Aruba position out of the bewindspersonen match", async () => {
  const { items } = cabinet(28);
  const dataset = bwDataset(28);
  dataset.positions.push({ id: "pos:minister-test-0-aruba", slug: "minister-test-0-aruba", title: "Minister van Test 0", organization: "org:ministerie-test-0-aruba" });
  dataset.organizations.push({ id: "org:ministerie-test-0-aruba", level: "koninkrijk", country: "aruba" });
  dataset.tenures.push({ id: "tenure:aruba-0", person: "person:aruba-0", position: "pos:minister-test-0-aruba", start: "2025-01-01", end: null, source: OLD });
  dataset.positions.reverse();
  const plan = await planRefresh({ fetched: bwFetched(items), dataset, today: TODAY });
  assert.equal(plan.openings.length, 0);
  assert.equal(plan.closures.length, 0);
});

test("slugify produces schema-safe ids", () => {
  assert.equal(slugify("Elanor Boekholt-O’Sullivan"), "elanor-boekholt-o-sullivan");
  assert.equal(slugify("A.J.M. van Kesteren"), "a-j-m-van-kesteren");
});

// ----- bewindspersonen -----

function cabinet(count) {
  const items = Array.from({ length: count }, (_, index) => ({
    slug: `persoon-${index}`,
    name: `Persoon ${index}`,
    role: `Minister van Test ${index}`,
    url: `https://www.rijksoverheid.nl/regering/bewindspersonen/persoon-${index}`,
  }));
  const positions = items.map((item, index) => ({
    id: `pos:minister-van-test-${index}`,
    slug: `minister-van-test-${index}`,
    title: `Minister van Test ${index}`,
    organization: `org:ministerie-test-${index}`,
  }));
  return { items, positions };
}

function bwDataset(count, { without = [] } = {}) {
  const { items, positions } = cabinet(count);
  const people = items.map((item, index) => ({ id: `person:persoon-${index}`, name: item.name, sources: [OLD] }));
  const tenures = items
    .map((item, index) => ({
      id: `tenure:minister-van-test-${index}-persoon-${index}`,
      person: `person:persoon-${index}`,
      position: `pos:minister-van-test-${index}`,
      start: "2026-02-23",
      end: null,
      source: OLD,
    }))
    .filter((_, index) => !without.includes(index));
  const organizations = positions.map((position) => ({ id: position.organization, level: "rijk", country: "nederland" }));
  return { organizations, positions, people, tenures, memberships: [], relations: [], sources: [], elections: [], coalitions: [] };
}

function bwFetched(items, extra = {}) {
  return {
    generatedAt: "2026-10-05T00:00:00.000Z",
    endpointsUsed: [],
    gaps: [],
    rawFiles: [],
    bodies: {
      bewindspersonen: { ok: true, status: 200, url: "https://www.rijksoverheid.nl/regering/bewindspersonen", items, cabinet: { slug: "kabinet-jetten", name: "Kabinet-Jetten" }, ...extra },
      tweedeKamer: { ok: true, skipped: true, items: [] },
      eersteKamer: { ok: true, skipped: true, items: [] },
    },
  };
}

test("a new bewindspersoon gets an unknown start (ADR 0020), a sourced new person and a review entry", async () => {
  const { items } = cabinet(28);
  const dataset = bwDataset(28);
  // person 27 is new: not in people, no tenure
  dataset.people = dataset.people.filter((person) => person.id !== "person:persoon-27");
  dataset.tenures = dataset.tenures.filter((tenure) => tenure.person !== "person:persoon-27");
  const plan = await planRefresh({ fetched: bwFetched(items), dataset, today: TODAY });
  assert.deepEqual(plan.stopped, []);
  const opened = plan.openings.find((entry) => entry.record.position === "pos:minister-van-test-27");
  assert.equal(opened.record.start, null);
  assert.equal(opened.record.person, "person:persoon-27");
  assert.equal(opened.record.source.source, "src:rijksoverheid-bewindspersoon-persoon-27");
  const created = plan.envelope.people.find((person) => person.id === "person:persoon-27");
  assert.equal(created.sources[0].source, "src:rijksoverheid-bewindspersoon-persoon-27");
  assert.ok(plan.envelope.sources.some((source) => source.url === "https://www.rijksoverheid.nl/regering/bewindspersonen/persoon-27"));
  assert.ok(plan.review.some((entry) => entry.kind === "unknown-start"));
  assert.equal(plan.stats.closed, 0);
});

test("a bewindspersoon no longer listed is closed on the retrieval date at medium confidence", async () => {
  const { items } = cabinet(28);
  const dataset = bwDataset(28);
  const plan = await planRefresh({ fetched: bwFetched(items.slice(0, 27)), dataset, today: TODAY });
  assert.equal(plan.closures.length, 1);
  assert.equal(plan.closures[0].record.end, TODAY);
  assert.equal(plan.closures[0].record.source.confidence, "medium");
  assert.ok(plan.review.some((entry) => entry.kind === "closed-without-official-end"));
});

test("a list of 24 bewindspersonen is refused and the previous records stay", async () => {
  const { items } = cabinet(24);
  const dataset = bwDataset(28);
  const prevEnvelope = { tenures: dataset.tenures.slice(0, 3), memberships: [], people: [], positions: [], relations: [], sources: [] };
  const plan = await planRefresh({ fetched: bwFetched(items), dataset, today: TODAY, prevEnvelope });
  assert.equal(plan.stopped.length, 1);
  assert.equal(plan.stopped[0].source, "bewindspersonen");
  assert.match(plan.stopped[0].reasons[0], /list-size/);
  assert.equal(plan.closures.length, 0);
  assert.equal(plan.envelope.tenures.length, 3, "the previous envelope tenures of the stopped source stay");
});

test("more than 3 bewindspersonen leaving at once is refused without a cabinet event and allowed with one", async () => {
  const { items } = cabinet(31);
  const dataset = bwDataset(31);
  const kept = items.slice(0, 27);
  const refused = await planRefresh({ fetched: bwFetched(kept), dataset, today: TODAY });
  assert.equal(refused.stopped.length, 1);
  assert.match(refused.stopped[0].reasons[0], /4 sluitingen/);
  const state = { bewindspersonen: { cabinetSlug: "kabinet-oud" } };
  const allowed = await planRefresh({ fetched: bwFetched(kept), dataset, today: TODAY, state });
  assert.deepEqual(allowed.stopped, []);
  assert.equal(allowed.closures.length, 4);
  assert.ok(allowed.review.some((entry) => entry.kind === "bulk-event"));
});

// ----- Eerste Kamer -----

function ekFetched({ members, fracties }) {
  return {
    generatedAt: "2026-10-05T00:00:00.000Z",
    endpointsUsed: [],
    gaps: [],
    rawFiles: [],
    bodies: {
      bewindspersonen: { ok: true, skipped: true, items: [] },
      tweedeKamer: { ok: true, skipped: true, items: [] },
      eersteKamer: { ok: true, status: 200, url: "https://www.eerstekamer.nl/alle_leden", items: members, fracties, boards: null, memberSince: {} },
    },
  };
}

function ekDataset(members) {
  const people = members.map((item) => ({ id: `person:${slugify(item.name)}`, name: item.name, sources: [OLD] }));
  const memberships = members.map((item) => ({
    id: `membership:eerste-kamer-${slugify(item.name)}`,
    organization: "org:eerste-kamer",
    person: `person:${slugify(item.name)}`,
    seatNumber: null,
    fractie: item.party,
    start: "2023-06-13",
    end: null,
    source: OLD,
  }));
  return { organizations: [{ id: "org:eerste-kamer" }], positions: [], people, tenures: [], memberships, relations: [], sources: [], elections: [], coalitions: [] };
}

test("75 consistent Eerste Kamer members plan no change and carry every membership", async () => {
  const members = parseEersteKamerLeden(html("ek-alle-leden.html"));
  const plan = await planRefresh({ fetched: ekFetched({ members, fracties: parseEkFracties(html("ek-fracties.html")) }), dataset: ekDataset(members), today: TODAY });
  assert.deepEqual(plan.stopped, []);
  assert.equal(plan.closures.length, 0);
  assert.equal(plan.stats.bodies.eersteKamer.fetched, 75);
  assert.equal(plan.envelope.memberships.length, 75);
});

test("74 Eerste Kamer members are refused and nothing of that source is planned", async () => {
  const members = parseEersteKamerLeden(html("ek-alle-leden.html"));
  const dataset = ekDataset(members);
  const plan = await planRefresh({ fetched: ekFetched({ members: members.slice(0, 74), fracties: parseEkFracties(html("ek-fracties.html")) }), dataset, today: TODAY });
  assert.equal(plan.stopped[0].source, "eersteKamer");
  assert.ok(plan.stopped[0].reasons.some((reason) => reason.startsWith("member-total")));
  assert.equal(plan.closures.length, 0);
  assert.deepEqual(plan.planned, []);
});

test("a new senator is created with a source and dated from the member page", async () => {
  const members = parseEersteKamerLeden(html("ek-alle-leden.html"));
  const dataset = ekDataset(members);
  const target = members[10];
  dataset.people = dataset.people.filter((person) => person.name !== target.name);
  dataset.memberships = dataset.memberships.filter((membership) => membership.person !== `person:${slugify(target.name)}`);
  const fetched = ekFetched({ members, fracties: parseEkFracties(html("ek-fracties.html")) });
  fetched.bodies.eersteKamer.memberSince = { [target.slug]: "2026-09-29" };
  const plan = await planRefresh({ fetched, dataset, today: TODAY });
  assert.deepEqual(plan.stopped, []);
  const opened = plan.openings.find((entry) => entry.entity === "memberships");
  assert.equal(opened.record.start, "2026-09-29");
  assert.equal(opened.record.person, `person:${slugify(target.name)}`);
  const created = plan.envelope.people.find((person) => person.id === opened.record.person);
  assert.equal(created.sources[0].source, `src:ek-persoon-${slugify(target.slug)}`);
  assert.ok(plan.envelope.sources.some((source) => source.url === target.url && source.retrieved === TODAY));
  // without a start date on the page there is no membership, only a named gap
  fetched.bodies.eersteKamer.memberSince = {};
  const noDate = await planRefresh({ fetched, dataset, today: TODAY });
  assert.equal(noDate.openings.length, 0);
  assert.ok(noDate.gaps.some((gap) => gap.what.includes("Startdatum")));
});

// ----- carry-forward and the closed ledger -----

test("closed records of the previous envelope stay, so an older research envelope cannot reopen them", async () => {
  const closed = { id: "membership:tweede-kamer-x", organization: "org:tweede-kamer", person: "person:x", seatNumber: null, fractie: "A", start: "2021-03-31", end: "2026-06-09", source: OLD };
  const open = { ...closed, id: "membership:tweede-kamer-y", person: "person:y", end: null };
  const plan = await planRefresh({
    fetched: bwFetched([]),
    dataset: { organizations: [], positions: [], people: [], tenures: [], memberships: [], relations: [], sources: [], elections: [], coalitions: [] },
    today: TODAY,
    prevEnvelope: { memberships: [closed, open], tenures: [], people: [], positions: [], relations: [], sources: [] },
  });
  // no source was planned: the open one stays as carried for the stopped owner, the closed one stays as ledger
  assert.ok(plan.envelope.memberships.some((membership) => membership.id === "membership:tweede-kamer-x" && membership.end === "2026-06-09"));
});

test("runRefresh writes no envelope when every planned source was stopped, but still writes the run report", async () => {
  const { items } = cabinet(24);
  const writes = [];
  const result = await runRefresh({
    fetched: bwFetched(items),
    dataset: bwDataset(28),
    state: {},
    prevEnvelope: null,
    today: TODAY,
    now: new Date("2026-10-05T00:00:00Z"),
    root: "/nonexistent-root",
    io: { writeFile: async (path) => writes.push(path), mkdir: async () => {} },
    log: () => {},
  });
  assert.equal(result.stopped.length, 1);
  assert.ok(writes.every((path) => !path.endsWith("P-live-ambtsdragers.json")));
  assert.ok(writes.some((path) => path.includes("refresh-official-05-10-2026.md")));
});
