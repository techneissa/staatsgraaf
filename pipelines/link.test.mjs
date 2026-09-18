import { test } from "node:test";
import assert from "node:assert/strict";

import {
  aliasLengthFloor,
  applyMarkup,
  buildGazetteer,
  buildTopicIndex,
  escapeRegExp,
  findTopicMatches,
  gazetteerConfidence,
  isAcronymAlias,
  linkArticle,
  normalizeText,
} from "./link.mjs";

function alias(aliasValue, target, confidence = "high") {
  return { alias: aliasValue, target, confidence };
}

const GAZETTEER = buildGazetteer([
  alias("Ministerie van Financiën", "org:ministerie-van-financien", "high"),
  alias("Financiën", "org:ministerie-van-financien", "medium"),
  alias("Politie", "org:politie", "high"),
  alias("de politie", "org:politie", "high"),
  alias("COA", "org:zbo-centraal-orgaan-opvang-asielzoekers", "medium"),
  alias("het kabinet", "org:regering", "low"),
  alias("de Kamer", "org:tweede-kamer", "high"),
  alias("Tweede Kamer", "org:tweede-kamer", "high"),
  alias("Rob Jetten", "person:rob-jetten", "high"),
  alias("de man", "person:de-man", "medium"),
  alias("OM", "org:openbaar-ministerie", "high"),
  alias("NA", "org:nationaal-archief", "high"),
]);

const TOPICS = buildTopicIndex([
  { id: "topic:asiel-en-migratie", name: "Asiel en migratie", keywords: ["asiel", "azc", "opvang", "coa"] },
  { id: "topic:veiligheid", name: "Veiligheid", keywords: ["politie", "criminaliteit", "aanhoudingen"] },
  { id: "topic:openbaar-bestuur-en-democratie", name: "Openbaar bestuur en democratie", keywords: ["kabinet", "regering"] },
]);

test("normalizes text with NFC, lowercase and collapsed whitespace", () => {
  assert.equal(normalizeText("  Café   Belastingdienst\n"), "café belastingdienst");
});

test("an acronym alias matches case-sensitively", () => {
  const lower = linkArticle({ title: "De politie en de coa", gazetteer: GAZETTEER, topicIndex: [] });
  assert.equal(lower.entities.includes("org:zbo-centraal-orgaan-opvang-asielzoekers"), false);
  const upper = linkArticle({ title: "Het COA laat de opvang open", gazetteer: GAZETTEER, topicIndex: [] });
  assert.equal(upper.entities.includes("org:zbo-centraal-orgaan-opvang-asielzoekers"), true);
});

test("a two-letter acronym does not match an ordinary word", () => {
  const result = linkArticle({ title: "Zij zei na het gesprek niets", gazetteer: GAZETTEER, topicIndex: [] });
  assert.equal(result.entities.includes("org:nationaal-archief"), false);
  assert.equal(result.entities.includes("org:openbaar-ministerie"), false);
});

test("a multi-token high-confidence alias links and is marked up inline", () => {
  const result = linkArticle({
    title: "Jetten bezoekt het Ministerie van Financiën",
    gazetteer: GAZETTEER,
    topicIndex: [],
  });
  assert.deepEqual(result.entities, ["org:ministerie-van-financien"]);
  assert.equal(result.highMatches, 1);
  assert.equal(
    result.summaryMarkup,
    'Jetten bezoekt het <entity id="org:ministerie-van-financien">Ministerie van Financiën</entity>',
  );
});

test("a low-confidence alias is dropped from the gazetteer and never matches", () => {
  const result = linkArticle({ title: "Het kabinet vergadert", gazetteer: GAZETTEER, topicIndex: [] });
  assert.equal(result.entities.length, 0);
  assert.equal(result.matches.length, 0);
  assert.equal(result.summaryMarkup, "Het kabinet vergadert");
});

test("the longest alias wins and the shorter overlapping alias is skipped", () => {
  const result = linkArticle({
    title: "De Tweede Kamer debatteert, de Kamer stemt",
    gazetteer: GAZETTEER,
    topicIndex: [],
  });
  assert.deepEqual(result.entities, ["org:tweede-kamer"]);
  assert.equal(result.highMatches, 1);
  const surfaces = [...result.summaryMarkup.matchAll(/<entity id="[^"]+">([^<]*)<\/entity>/g)].map((m) => m[1]);
  assert.deepEqual(surfaces, ["Tweede Kamer"]);
});

test("a target is linked once even when several aliases match", () => {
  const result = linkArticle({
    title: "Politie en de politie en Politie",
    gazetteer: GAZETTEER,
    topicIndex: [],
  });
  assert.deepEqual(result.entities, ["org:politie"]);
  assert.equal(result.highMatches, 1);
});

test("single-token aliases below the length floor are dropped", () => {
  assert.equal(aliasLengthFloor("abc"), 5);
  assert.equal(aliasLengthFloor("de man"), 8);
  const result = linkArticle({ title: "De man liep weg", gazetteer: GAZETTEER, topicIndex: [] });
  assert.equal(result.entities.length, 0);
});

test("a person name links as a high-confidence entity", () => {
  const result = linkArticle({ title: "Rob Jetten praat met de pers", gazetteer: GAZETTEER, topicIndex: [] });
  assert.deepEqual(result.entities, ["person:rob-jetten"]);
});

test("topic fallback fires when no entity matches, choosing the top topic", () => {
  const result = linkArticle({
    title: "Gemeente houdt vast aan dwangsom en legt noodopvang stil",
    text: "Het azc blijft open zolang de asielprocedure loopt.",
    gazetteer: GAZETTEER,
    topicIndex: TOPICS,
  });
  assert.equal(result.entities.length, 0);
  assert.deepEqual(result.topics, ["topic:asiel-en-migratie"]);
  assert.deepEqual(result.fallbackTopics, ["topic:asiel-en-migratie"]);
});

test("topic fallback does not fire when an entity already matched, but keyword topics still attach", () => {
  const result = linkArticle({
    title: "De Politie grijpt in bij aanhoudingen",
    text: "Bij het azc zijn mensen aangehouden.",
    gazetteer: GAZETTEER,
    topicIndex: TOPICS,
  });
  assert.deepEqual(result.entities, ["org:politie"]);
  assert.equal(result.fallbackTopics.length, 0);
  assert.ok(result.topics.length >= 1);
});

test("a topic tie is broken deterministically by topic id", () => {
  const result = linkArticle({
    title: "Kwestie raakt de politie en het azc",
    gazetteer: [],
    topicIndex: buildTopicIndex([
      { id: "topic:zorg", name: "Zorg", keywords: ["ziekenhuis"] },
      { id: "topic:asiel-en-migratie", name: "Asiel en migratie", keywords: ["azc"] },
      { id: "topic:veiligheid", name: "Veiligheid", keywords: ["politie"] },
    ]),
  });
  assert.deepEqual(result.topics, ["topic:asiel-en-migratie", "topic:veiligheid"]);
  assert.deepEqual(result.fallbackTopics, ["topic:asiel-en-migratie"]);
});

test("no alias and no keyword yields no entity and no topic", () => {
  const result = linkArticle({
    title: "Deze tekst noemt geen enkele organisatie",
    gazetteer: GAZETTEER,
    topicIndex: TOPICS,
  });
  assert.deepEqual(result.entities, []);
  assert.deepEqual(result.topics, []);
  assert.equal(result.highMatches, 0);
});

test("gazetteer confidence follows the documented threshold", () => {
  assert.equal(gazetteerConfidence("Politie", "high", false), "high");
  assert.equal(gazetteerConfidence("de VNG", "high", false), "medium");
  assert.equal(gazetteerConfidence("de politie", "medium", false), "high");
  assert.equal(gazetteerConfidence("COA", "medium", true), "high");
  assert.equal(gazetteerConfidence("OM", "high", true), "medium");
  assert.equal(gazetteerConfidence("het kabinet", "low", false), "low");
});

test("acronym detection accepts short uppercase forms and rejects mixed case", () => {
  assert.equal(isAcronymAlias("COA"), true);
  assert.equal(isAcronymAlias("Politie"), false);
  assert.equal(isAcronymAlias("Belastingdienst"), false);
});

test("a capitalized medium single-token alias needs matching case (Leiden the city, not leiden the verb)", () => {
  const gazetteer = buildGazetteer([alias("Leiden", "org:gemeente-leiden", "medium")]);
  assert.equal(linkArticle({ title: "Bezwaren leiden tot vertraging", gazetteer, topicIndex: [] }).entities.length, 0);
  assert.deepEqual(linkArticle({ title: "Student in Leiden klaagt", gazetteer, topicIndex: [] }).entities, [
    "org:gemeente-leiden",
  ]);
  const verbOnly = linkArticle({ title: "maatregelen leiden tot minder overlast", gazetteer, topicIndex: [] });
  assert.equal(verbOnly.entities.length, 0);
});

test("applyMarkup leaves unmatched text untouched", () => {
  assert.equal(applyMarkup("geen tags", []), "geen tags");
});

test("escapeRegExp escapes regex metacharacters", () => {
  assert.equal(escapeRegExp("a.b(c)"), "a\\.b\\(c\\)");
});

test("topic matching is case-insensitive on word boundaries", () => {
  const matches = findTopicMatches("Het AZC in Nederland", TOPICS);
  assert.equal(matches[0].id, "topic:asiel-en-migratie");
  const falsePositive = findTopicMatches("de asielmotor", TOPICS);
  assert.equal(falsePositive.length, 0);
});
