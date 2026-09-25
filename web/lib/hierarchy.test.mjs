import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildHierarchy, ministryShort, personSlug, HIERARCHY_SCHEMA } from "./hierarchy.ts";

const src = (id) => ({ source: id, retrieved: "2026-09-17", confidence: "high" });

function fixture() {
  return {
    snapshot: "test",
    organizations: [
      { id: "org:regering", slug: "regering", name: "Regering" },
      { id: "org:ministerie-van-algemene-zaken", slug: "az", name: "Ministerie van Algemene Zaken", aliases: ["AZ"] },
      { id: "org:ministerie-van-defensie", slug: "defensie", name: "Ministerie van Defensie", aliases: ["Defensie", "DEF"] },
      { id: "org:ministerie-van-financien", slug: "fin", name: "Ministerie van Financiën", aliases: ["FIN", "Financiën"] },
      { id: "org:tweede-kamer", slug: "tweede-kamer", name: "Tweede Kamer der Staten-Generaal" },
    ],
    people: [
      { id: "person:pm", slug: "pm", name: "Premier" },
      { id: "person:king", slug: "king", name: "Koning" },
      { id: "person:def", slug: "def", name: "Minister Def", party: "VVD" },
      { id: "person:def-s", slug: "def-s", name: "Staatssecretaris Def" },
      { id: "person:fin", slug: "fin-other", name: "Minister Fin" },
      { id: "person:old", slug: "old", name: "Oud-minister" },
      { id: "person:chair", slug: "chair", name: "Voorzitter" },
      { id: "person:a", slug: "a", name: "Anna Bakker" },
      { id: "person:b", slug: "b", name: "Bert Aalders" },
      { id: "person:c", slug: "c", name: "Carla de Vries" },
    ],
    positions: [
      { id: "pos:minister-president", title: "Minister-president en Minister van Algemene Zaken", organization: "org:ministerie-van-algemene-zaken" },
      { id: "pos:koning", title: "Koning der Nederlanden", organization: "org:regering" },
      { id: "pos:def", title: "Minister van Defensie", organization: "org:ministerie-van-defensie" },
      { id: "pos:def-s", title: "Staatssecretaris van Defensie", organization: "org:ministerie-van-defensie" },
      { id: "pos:vmp", title: "Vice-Minister-President", organization: "org:regering" },
      { id: "pos:fin", title: "Minister van Financiën", organization: "org:ministerie-van-financien" },
      { id: "pos:tk-chair", title: "Voorzitter van de Tweede Kamer der Staten-Generaal", organization: "org:tweede-kamer" },
      { id: "pos:fv-x", title: "Fractievoorzitter Partij X", organization: "org:tweede-kamer" },
    ],
    tenures: [
      { person: "person:pm", position: "pos:minister-president", end: null, source: src("src:pm") },
      { person: "person:king", position: "pos:koning", end: null, source: src("src:king") },
      { person: "person:def-s", position: "pos:def-s", start: "2026-02-23", end: null, source: src("src:def-s") },
      { person: "person:def", position: "pos:def", start: "2026-02-23", end: null, source: src("src:cabinet") },
      { person: "person:def", position: "pos:vmp", end: null, source: src("src:cabinet") },
      { person: "person:fin", position: "pos:fin", end: null, source: src("src:cabinet") },
      { person: "person:old", position: "pos:fin", end: "2025-01-01", source: src("src:old") },
      { person: "person:chair", position: "pos:tk-chair", end: null, source: src("src:chair") },
      { person: "person:c", position: "pos:fv-x", end: null, source: src("src:fv") },
    ],
    memberships: [
      { person: "person:a", organization: "org:tweede-kamer", fractie: "X", end: null, source: src("src:tk") },
      { person: "person:b", organization: "org:tweede-kamer", fractie: "X", end: null, source: src("src:tk") },
      { person: "person:c", organization: "org:tweede-kamer", fractie: "X", end: null, source: src("src:tk") },
      { person: "person:chair", organization: "org:tweede-kamer", fractie: "Y", end: null, source: src("src:tk") },
      { person: "person:old", organization: "org:tweede-kamer", fractie: "Y", end: "2025-01-01", source: src("src:tk") },
    ],
    coalitions: [
      { id: "coalition:test", government: "org:regering", name: "Kabinet-Test", parties: ["VVD"], end: null, primeMinister: "person:pm", source: src("src:coalition") },
    ],
    sources: [
      { id: "src:cabinet", url: "https://example.org/cabinet", title: "Benoemingen" },
      { id: "src:tk", url: "https://example.org/tk", title: "Kamerleden" },
    ],
    portraitOf: (id) => (id === "person:pm" ? "/media/pm.jpg" : null),
    partyOf: (name) => (name === "X" ? { key: "X", abbrev: "PX", color: "#123456" } : null),
    seatOrder: (members) => [...members].sort((a, b) => a.name.split(" ").at(-1).localeCompare(b.name.split(" ").at(-1))),
  };
}

test("the cabinet has the minister-president in the centre and the Koning as head of state", () => {
  const bundle = buildHierarchy(fixture());
  assert.equal(bundle.schema, HIERARCHY_SCHEMA);
  const kabinet = bundle.trees.find((tree) => tree.id === "kabinet");
  assert.equal(kabinet.name, "Kabinet-Test");
  assert.equal(kabinet.head.id, "person:pm");
  assert.equal(kabinet.head.image, "/media/pm.jpg");
  assert.equal(kabinet.headOfState.id, "person:king");
  assert.deepEqual(kabinet.parties, ["VVD"]);
  // Algemene Zaken holds only the head, so it is not a hub.
  assert.deepEqual(kabinet.hubs.map((hub) => hub.short), ["Defensie", "Financiën"]);
});

test("ministers come before staatssecretarissen and ended tenures are left out", () => {
  const kabinet = buildHierarchy(fixture()).trees[0];
  const defensie = kabinet.hubs[0];
  assert.deepEqual(defensie.people.map((person) => person.id), ["person:def", "person:def-s"]);
  assert.deepEqual(defensie.people[0].extra, ["Vice-Minister-President"]);
  assert.equal(defensie.people[0].party, "VVD");
  assert.ok(!kabinet.hubs[1].people.some((person) => person.id === "person:old"));
});

test("every person carries a source index that resolves", () => {
  const bundle = buildHierarchy(fixture());
  for (const tree of bundle.trees) {
    const people = [tree.head, tree.headOfState, ...tree.hubs.flatMap((hub) => hub.people)].filter(Boolean);
    for (const person of people) {
      assert.ok(person.src >= 0 && bundle.sources[person.src], `${person.id} has a source`);
    }
  }
  const cabinet = bundle.sources.find((source) => source.id === "src:cabinet");
  assert.equal(cabinet.url, "https://example.org/cabinet");
  assert.equal(cabinet.retrieved, "2026-09-17");
  // One entry per source and retrieval date.
  assert.equal(new Set(bundle.sources.map((source) => `${source.id}|${source.retrieved}`)).size, bundle.sources.length);
});

test("a chamber has its chair in the centre and fracties by size, leader first", () => {
  const tk = buildHierarchy(fixture()).trees.find((tree) => tree.id === "tweede-kamer");
  assert.equal(tk.head.id, "person:chair");
  assert.equal(tk.seats, 4);
  assert.deepEqual(tk.hubs.map((hub) => [hub.short, hub.seats]), [["PX", 3], ["Y", 1]]);
  const x = tk.hubs[0];
  assert.equal(x.color, "#123456");
  assert.equal(x.people[0].id, "person:c");
  assert.equal(x.people[0].leader, true);
  assert.deepEqual(x.people.slice(1).map((person) => person.id), ["person:b", "person:a"]);
  assert.equal(tk.hubs[1].color, null);
});

test("slugs are shipped only when the id does not give them", () => {
  const kabinet = buildHierarchy(fixture()).trees[0];
  const fin = kabinet.hubs[1].people[0];
  assert.equal(fin.slug, "fin-other");
  assert.equal(personSlug(fin), "fin-other");
  assert.equal(kabinet.hubs[0].people[0].slug, undefined);
  assert.equal(personSlug(kabinet.hubs[0].people[0]), "def");
});

test("ministry labels prefer a short word, then an abbreviation", () => {
  assert.equal(ministryShort({ name: "Ministerie van Defensie", aliases: ["Defensie", "DEF"] }), "Defensie");
  assert.equal(ministryShort({ name: "Ministerie van Financiën", aliases: ["FIN", "Financiën"] }), "Financiën");
  assert.equal(ministryShort({ name: "Ministerie van Justitie en Veiligheid", aliases: ["JenV", "J&V", "Justitie en Veiligheid"] }), "JenV");
  assert.equal(ministryShort({ name: "Ministerie van Iets", aliases: [] }), "Iets");
});

test("the shipped hierarchy.json is small and complete", () => {
  const raw = readFileSync(new URL("../public/hierarchy.json", import.meta.url), "utf8");
  const bundle = JSON.parse(raw);
  assert.equal(bundle.schema, HIERARCHY_SCHEMA);
  assert.deepEqual(bundle.trees.map((tree) => tree.id), ["kabinet", "tweede-kamer", "eerste-kamer"]);
  for (const tree of bundle.trees) {
    assert.ok(tree.hubs.length > 0, `${tree.id} has hubs`);
    for (const hub of tree.hubs) for (const person of hub.people) assert.ok(bundle.sources[person.src], `${person.id} is sourced`);
  }
  assert.ok(raw.length < 120_000, `hierarchy.json is ${raw.length} bytes`);
});
