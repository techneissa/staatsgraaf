import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseRijksoverheidParty,
  parseEkFractievoorzitter,
  parseEkFractieLinks,
  parseDutchDate,
  mapPartyLabel,
  upsertSource,
  planPartyAffiliation,
  PARTY_SOURCE_PREFIXES,
  RIJKSOVERHEID_OVERVIEW,
  EK_FRACTIES,
} from "./party-affiliation.mjs";

const card = (slug, name, role) =>
  `<a href="/regering/bewindspersonen/${slug}" class="card card--photo-nav"><span class="link-plus__title">${name}</span><p class="card__subtitle">${role}</p></a>`;

const personPage = (line) => `<html><body><p>Nieuws</p><p>${line}</p><p>Lid Tweede Kamer en fractievoorzitter CDA</p></body></html>`;

const fractiePage = (title, body) => `<html><head><title>${title} - Eerste Kamer der Staten-Generaal</title></head><body><h2>Fractiebestuur</h2>${body}</body></html>`;

test("parseRijksoverheidParty reads the personal line in its three forms", () => {
  assert.equal(parseRijksoverheidParty(personPage("Geboren op 25 maart 1987 in Veghel, partner. Partij: D66")), "D66");
  assert.equal(parseRijksoverheidParty(personPage("Geboren op 17 augustus 1963 in Voorschoten, gehuwd, 2 kinderen. Partij D66.")), "D66");
  assert.equal(parseRijksoverheidParty(personPage("Geboren op 17 februari 1972 in Cuijk, getrouwd. Partijloos.")), "partijloos");
  // A party named elsewhere on the page (career history) is not the current party.
  assert.equal(parseRijksoverheidParty(personPage("Geboren op 1 januari 1970 in Utrecht.")), null);
});

test("mapPartyLabel maps to dataset labels and never guesses", () => {
  assert.deepEqual(mapPartyLabel("D66"), { party: "D66" });
  assert.deepEqual(mapPartyLabel("GroenLinks-PvdA"), { party: "PRO" });
  assert.deepEqual(mapPartyLabel("partijloos"), { nonParty: "partijloos" });
  assert.deepEqual(mapPartyLabel("Nieuwe Partij"), { unknown: "Nieuwe Partij" });
  assert.deepEqual(mapPartyLabel(null), { unknown: null });
});

test("parseEkFractievoorzitter skips the vice-fractievoorzitter and reads the start date", () => {
  const html = fractiePage("CDA-fractie", 'vice-fractievoorzitter: <a href="/persoon/b">B</a> (sinds 1&nbsp;mei&nbsp;2026)<br />\nfractievoorzitter: <a href="/persoon/drs_t_j_f_m_bovens_cda">Theo Bovens</a> (sinds 13&nbsp;juni&nbsp;2023)<br />');
  assert.deepEqual(parseEkFractievoorzitter(html), { href: "/persoon/drs_t_j_f_m_bovens_cda", name: "Theo Bovens", since: "2023-06-13" });
  assert.equal(parseEkFractievoorzitter(fractiePage("X", "fractiesecretaris: <a href=\"/persoon/c\">C</a>")), null);
  assert.equal(parseDutchDate("9 september 2026"), "2026-09-09");
  assert.deepEqual(parseEkFractieLinks('<a href="/fractie/cda">x</a><a href="/fractie/cda">y</a><a href="/fractie/volt">z</a>'), ["cda", "volt"]);
});

test("upsertSource keeps one record per URL and reuses its id", () => {
  const sources = [{ id: "src:k-bewindspersoon-a", url: "https://example.org/a", retrieved: "2026-09-18", notes: null, license: null }];
  const id = upsertSource(sources, { id: "src:rijksoverheid-bewindspersoon-a", url: "https://example.org/a", retrieved: "2026-09-25", notes: "n", license: "CC0-1.0" });
  assert.equal(id, "src:k-bewindspersoon-a");
  assert.equal(sources.length, 1);
  assert.equal(sources[0].retrieved, "2026-09-25");
  assert.equal(sources[0].license, "CC0-1.0");
});

function fixtureDataset() {
  return {
    people: [
      { id: "person:ann-a", slug: "ann-a", name: "Ann A", party: null, sources: [] },
      { id: "person:bob-b", slug: "bob-b", name: "Bob B", party: null, sources: [] },
      { id: "person:cas-c", slug: "cas-c", name: "Cas C", party: null, sources: [] },
      { id: "person:drs-d-d", slug: "drs-d-d", name: "drs. D. D", party: "CDA", sources: [{ source: "src:ek-persoon-drs-d-d-cda", retrieved: "2026-09-17", confidence: "high" }] },
    ],
    positions: [
      { id: "pos:minister-van-x", title: "Minister van X", organization: "org:ministerie-van-x" },
      { id: "pos:staatssecretaris-y", title: "Staatssecretaris Y", organization: "org:ministerie-van-x" },
    ],
    tenures: [
      { id: "t1", person: "person:ann-a", position: "pos:minister-van-x", end: null },
      { id: "t2", person: "person:bob-b", position: "pos:staatssecretaris-y", end: null },
      { id: "t3", person: "person:cas-c", position: "pos:minister-van-x", end: null },
    ],
    relations: [],
    memberships: [
      { id: "m1", organization: "org:eerste-kamer", person: "person:drs-d-d", fractie: "CDA", start: "2023-06-13", end: null, source: { source: "src:ek-persoon-drs-d-d-cda" } },
    ],
    sources: [{ id: "src:ek-persoon-drs-d-d-cda", url: "https://www.eerstekamer.nl/persoon/drs_d_d_cda", retrieved: "2026-09-17" }],
  };
}

function fakeGet(pages) {
  return async (url) => (pages[url] !== undefined ? { ok: true, html: pages[url] } : { ok: false, error: "HTTP 404" });
}

const PAGES = {
  [RIJKSOVERHEID_OVERVIEW]: card("ann-a", "Ann A", "Minister van X") + card("bob-b", "Bob B", "Staatssecretaris Y"),
  "https://www.rijksoverheid.nl/regering/bewindspersonen/ann-a": personPage("Geboren op 1 mei 1980 in Delft. Partij: VVD"),
  "https://www.rijksoverheid.nl/regering/bewindspersonen/bob-b": personPage("Geboren op 1 mei 1980 in Delft. Partijloos."),
  [EK_FRACTIES]: '<a href="/fractie/christen_democratisch_appel">CDA</a><a href="/fractie/leeg">Leeg</a>',
  "https://www.eerstekamer.nl/fractie/christen_democratisch_appel": fractiePage("CDA-fractie", 'fractievoorzitter: <a href="/persoon/drs_d_d_cda">D D</a> (sinds 13 juni 2023)'),
  "https://www.eerstekamer.nl/fractie/leeg": fractiePage("Fractie-Leeg", "<p>geen bestuur</p>"),
};

test("planPartyAffiliation fills parties, names gaps and adds EK fractievoorzitters like the TK ones", async () => {
  const plan = await planPartyAffiliation({ dataset: fixtureDataset(), get: fakeGet(PAGES), today: "2026-09-25" });
  const person = (id) => plan.people.find((p) => p.id === id);
  assert.equal(person("person:ann-a").party, "VVD");
  assert.equal(person("person:ann-a").sources.at(-1).confidence, "high");
  assert.ok(PARTY_SOURCE_PREFIXES.some((prefix) => person("person:ann-a").sources.at(-1).source.startsWith(prefix)));
  assert.equal(person("person:bob-b").party, null);
  assert.equal(person("person:cas-c").party, null);
  const gapText = plan.gaps.map((g) => `${g.what}: ${g.why}`).join("\n");
  assert.match(gapText, /Partij van Bob B: geen partij/);
  assert.match(gapText, /Partij van Cas C: open tenure/);
  assert.match(gapText, /Fractievoorzitter van Fractie-Leeg/);

  const position = plan.positions.find((p) => p.id === "pos:ek-fractievoorzitter-cda");
  assert.equal(position.organization, "org:eerste-kamer");
  assert.equal(position.title, "Fractievoorzitter CDA");
  const tenure = plan.tenures.find((t) => t.position === "pos:ek-fractievoorzitter-cda");
  assert.equal(tenure.person, "person:drs-d-d");
  assert.equal(tenure.start, "2023-06-13");
  assert.equal(tenure.end, null);
  assert.ok(plan.relations.some((r) => r.id === "rel:office-ek-fractievoorzitter-cda" && r.to === "org:eerste-kamer"));
  assert.ok(plan.sources.some((s) => s.id === "src:ek-fractie-christen-democratisch-appel"));
});

test("planPartyAffiliation is idempotent", async () => {
  const first = await planPartyAffiliation({ dataset: fixtureDataset(), get: fakeGet(PAGES), today: "2026-09-25" });
  const second = await planPartyAffiliation({
    dataset: { ...fixtureDataset(), people: first.people, positions: first.positions, tenures: first.tenures, relations: first.relations, sources: first.sources },
    get: fakeGet(PAGES),
    today: "2026-09-25",
  });
  assert.deepEqual(second.people, first.people);
  assert.deepEqual(second.tenures, first.tenures);
  assert.deepEqual(second.positions, first.positions);
  assert.deepEqual(second.sources, first.sources);
  assert.equal(second.stats.ekNewTenures, 0);
});

test("a new fractievoorzitter does not close the previous open tenure but names a gap", async () => {
  const first = await planPartyAffiliation({ dataset: fixtureDataset(), get: fakeGet(PAGES), today: "2026-09-25" });
  const dataset = { ...fixtureDataset(), people: first.people, positions: first.positions, tenures: first.tenures, relations: first.relations, sources: first.sources };
  dataset.people.push({ id: "person:e-e", slug: "e-e", name: "E. E", party: "CDA", sources: [{ source: "src:ek-persoon-e-e-cda" }] });
  dataset.memberships = [...dataset.memberships, { id: "m2", organization: "org:eerste-kamer", person: "person:e-e", fractie: "CDA", end: null, source: { source: "src:ek-persoon-e-e-cda" } }];
  dataset.sources.push({ id: "src:ek-persoon-e-e-cda", url: "https://www.eerstekamer.nl/persoon/e_e_cda" });
  const pages = { ...PAGES, "https://www.eerstekamer.nl/fractie/christen_democratisch_appel": fractiePage("CDA-fractie", 'fractievoorzitter: <a href="/persoon/e_e_cda">E E</a> (sinds 1 oktober 2026)') };
  const plan = await planPartyAffiliation({ dataset, get: fakeGet(pages), today: "2026-10-02" });
  const open = plan.tenures.filter((t) => t.position === "pos:ek-fractievoorzitter-cda" && t.end === null);
  assert.equal(open.length, 2);
  const fresh = open.find((t) => t.person === "person:e-e");
  assert.equal(fresh.predecessor, open.find((t) => t.person === "person:drs-d-d").id);
  assert.ok(plan.gaps.some((g) => /^Einde van tenure:fvp-ek-fractievoorzitter-cda-drs-d-d/.test(g.what)));
});
