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

test("kabinet resolves to the distinct Kabinet, not to the Kabinet offices", () => {
  assert.equal(topId("kabinet"), "org:kabinet");
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

import { suggestSearch } from "./search.ts";

test("typo tolerance: one extra letter in a 5+ letter token still finds the topic", () => {
  const ids = rankSearch(index, "zorgg", 8).map((result) => result.id);
  assert.ok(ids.length > 0, "zorgg finds something");
  assert.ok(ids.includes("topic:zorg"), `zorgg finds the zorg topic, got ${ids}`);
  assert.equal(rankSearch(index, "zorgg", 8)[0].matchedNormalized, "zorg");
  assert.equal(suggestSearch(index, "zorgg"), "zorg");
});

test("typo tolerance: Belastindienst finds the Belastingdienst and is suggested", () => {
  assert.equal(topId("Belastindienst"), "org:belastingdienst");
  assert.equal(suggestSearch(index, "Belastindienst"), "belastingdienst");
});

test("typo tolerance: transposed letters and two typos in a long token", () => {
  assert.equal(topId("Belastigndienst"), "org:belastingdienst");
  assert.equal(topId("Belastinqdienxt"), "org:belastingdienst");
});

test("short tokens are not fuzzy: a four letter typo finds nothing odd", () => {
  assert.equal(rankSearch(index, "zrog", 5).length, 0);
  assert.equal(suggestSearch(index, "zrog"), null);
});

test("no suggestion when the query already matches", () => {
  assert.equal(suggestSearch(index, "Belastingdienst"), null);
  assert.equal(suggestSearch(index, "financien"), null);
});

test("fuzzy results come after every exact result", () => {
  const results = rankSearch(index, "belastingdienst", 8);
  const firstFuzzy = results.findIndex((result) => result.tier >= 5);
  const lastExact = results.reduce((last, result, i) => (result.tier < 5 ? i : last), -1);
  if (firstFuzzy !== -1) assert.ok(lastExact < firstFuzzy);
});

test("diacritics are ignored in both directions", () => {
  assert.equal(topId("financien"), topId("financiën"));
  assert.equal(topId("Curacao"), topId("Curaçao"));
});

test("multi-word queries match words in any order", () => {
  const ids = rankSearch(index, "financien minister", 8).map((result) => result.id);
  assert.ok(ids.includes("pos:minister-van-financien"));
});

test("Dutch positions rank above Caribbean positions with the same title", () => {
  const results = rankSearch(index, "Minister van Financiën", 8);
  assert.equal(results[0].id, "pos:minister-van-financien");
  const dutch = results.findIndex((result) => result.id === "pos:minister-van-financien");
  for (const foreign of ["pos:minister-financien-curacao", "pos:minister-financien-cultuur-aruba"]) {
    const at = results.findIndex((result) => result.id === foreign);
    if (at !== -1) assert.ok(dutch < at, `${foreign} ranks below the Dutch position`);
  }
});

test("a query that names the country ranks that country first", () => {
  const first = (query) => rankSearch(index, query, 8).find((result) => result.kind === "position")?.id;
  assert.equal(first("Minister van Financiën Curaçao"), "pos:minister-financien-curacao");
  assert.equal(first("minister financien aruba"), "pos:minister-financien-cultuur-aruba");
});

test("every row has a context line and equal titles are told apart", () => {
  const results = rankSearch(index, "Minister van Financiën", 8);
  const positions = results.filter((result) => result.kind === "position");
  for (const result of positions) assert.ok(result.context, `${result.id} has a context`);
  const dutch = results.find((result) => result.id === "pos:minister-van-financien");
  assert.equal(dutch.context, "Ministerie van Financiën");
  const keys = results.map((result) => `${result.kind}|${result.label}|${result.context}`);
  assert.equal(new Set(keys).size, keys.length, `identical rows remain: ${keys}`);
  const curacao = results.find((result) => result.id === "pos:minister-financien-curacao");
  assert.ok(curacao.context.includes("Curaçao"), curacao.context);
});

test("a person row names the position, an organization row names its parent", () => {
  const person = rankSearch(index, "Schoof", 5).find((result) => result.kind === "person");
  assert.ok(person && person.context, "Schoof has a context line");
  const org = rankSearch(index, "Belastingdienst", 3)[0];
  assert.equal(org.context, "Ministerie van Financiën");
  assert.equal(rankSearch(index, "Ministerie van Financiën", 3)[0].context, "Regering");
});

test("the English alias finds the ministerie and is the matched term", () => {
  const top = rankSearch(index, "Ministry of Finance", 5)[0];
  assert.equal(top.id, "org:ministerie-van-financien");
  assert.equal(top.matchedTerm, "Ministry of Finance");
});

test("a query over the full index stays fast", () => {
  const queries = ["zorgg", "Belastindienst", "minister van financien", "a", "ministerie", "xqzvw plmk"];
  for (const query of queries) rankSearch(index, query, 8);
  for (const query of queries) {
    const times = [];
    for (let i = 0; i < 5; i += 1) {
      const start = performance.now();
      rankSearch(index, query, 8);
      suggestSearch(index, query);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    assert.ok(times[2] < 50, `${query}: median ${times[2].toFixed(1)} ms`);
  }
});

test("ministries carry their English alias for the English interface", () => {
  const top = rankSearch(index, "financien", 5).find((result) => result.id === "org:ministerie-van-financien");
  assert.equal(top.en, "Ministry of Finance");
  assert.equal(rankSearch(index, "Ministry of Finance", 3)[0].label, "Ministerie van Financiën");
});
