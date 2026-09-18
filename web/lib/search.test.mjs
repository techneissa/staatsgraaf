import { test } from "node:test";
import assert from "node:assert/strict";

import { buildSearchIndex, normalizeSearchTerm, rankSearch } from "./search.ts";
import { buildIndex } from "../scripts/build-search-index.mjs";

const built = buildIndex();
const index = buildSearchIndex(built.records);

function topId(query) {
  return rankSearch(index, query, 5)[0]?.id ?? null;
}

test("normalizer lowercases, deaccents and strips punctuation", () => {
  assert.equal(normalizeSearchTerm("  Café  Belastingdienst  "), "cafe belastingdienst");
  assert.equal(normalizeSearchTerm("'s-Gravenhage"), "s gravenhage");
  assert.equal(normalizeSearchTerm("J. van der Berg"), "j van der berg");
});

test("DUO resolves to Dienst Uitvoering Onderwijs", () => {
  assert.equal(topId("DUO"), "org:dienst-uitvoering-onderwijs");
});

test("Belastingdienst resolves to the Belastingdienst", () => {
  assert.equal(topId("Belastingdienst"), "org:belastingdienst");
});

test("BZK resolves to the ministerie van Binnenlandse Zaken", () => {
  assert.equal(topId("BZK"), "org:ministerie-van-binnenlandse-zaken-en-koninkrijksrelaties");
});

test("kabinet resolves to the Regering, not to the Kabinet offices", () => {
  assert.equal(topId("kabinet"), "org:regering");
});

test("Kamer resolves to the Tweede Kamer", () => {
  assert.equal(topId("Kamer"), "org:tweede-kamer");
});

test("the five gemeenten resolve to their municipality", () => {
  const expected = {
    Amsterdam: "org:gemeente-amsterdam",
    Rotterdam: "org:gemeente-rotterdam",
    Eindhoven: "org:gemeente-eindhoven",
    Nijmegen: "org:gemeente-nijmegen",
    Maastricht: "org:gemeente-maastricht",
  };
  for (const [query, id] of Object.entries(expected)) {
    assert.equal(topId(query), id, `${query} should resolve to ${id}`);
  }
});

test("bare Den Haag resolves to the gemeente, not to a court", () => {
  assert.equal(topId("Den Haag"), "org:gemeente-s-gravenhage");
});

test("bare Utrecht resolves to the gemeente, not to the provincie or Utrechtse Heuvelrug", () => {
  assert.equal(topId("Utrecht"), "org:gemeente-utrecht");
});

test("bare Groningen resolves to the gemeente, not to the provincie", () => {
  assert.equal(topId("Groningen"), "org:gemeente-groningen");
});

test("entities rank above topics on an equal match tier", () => {
  const results = rankSearch(index, "Groningen", 5);
  const entity = results.findIndex((result) => result.kind !== "topic");
  const topic = results.findIndex((result) => result.kind === "topic");
  if (entity !== -1 && topic !== -1) {
    assert.ok(entity < topic, "an entity outranks a topic on the same tier");
  }
});

test("the VNG overlay entry resolves to the VNG koepel", () => {
  const skipped = built.skipped.find((entry) => entry.target === "org:vereniging-van-nederlandse-gemeenten");
  assert.equal(skipped, undefined, "the VNG overlay target is present in the dataset");
  assert.equal(topId("VNG"), "org:vereniging-van-nederlandse-gemeenten");
  assert.equal(topId("Vereniging van Nederlandse Gemeenten"), "org:vereniging-van-nederlandse-gemeenten");
});

test("the index is deterministic", () => {
  const again = buildIndex();
  assert.equal(JSON.stringify(again), JSON.stringify(built));
});
