import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  aliasLengthFloor,
  applyMarkup,
  buildGazetteer,
  buildTitleAliases,
  buildTopicIndex,
  escapeRegExp,
  findTopicMatches,
  gazetteerConfidence,
  isAcronymAlias,
  linkArticle,
  loadGazetteer,
  loadTopicIndex,
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
  assert.deepEqual(linkArticle({ title: "Student in Leiden klaagt de gemeente aan", gazetteer, topicIndex: [] }).entities, [
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

// Relevance precision and recall (docs/adr/0021). The fixtures below use the real
// gazetteer and topic list so each rule is proven on the headlines that motivated it.

const REAL_GAZETTEER = await loadGazetteer();
const REAL_TOPICS = await loadTopicIndex();
const realLink = (title, text = "", extra = {}) =>
  linkArticle({ title, text, gazetteer: REAL_GAZETTEER, topicIndex: REAL_TOPICS, ...extra });

test("title aliases come from current tenures only and join title and surname", () => {
  const people = [
    { id: "person:eelco-heinen", name: "Eelco Heinen" },
    { id: "person:david-van-weel", name: "David van Weel" },
    { id: "person:oud-minister", name: "Oud Minister" },
    { id: "person:dilan-yesilgoz-zegerius", name: "Dilan Yeşilgöz-Zegerius" },
  ];
  const tenures = [
    { person: "person:eelco-heinen", position: "pos:minister-van-financien", end: null, acting: false },
    { person: "person:david-van-weel", position: "pos:minister-van-justitie-en-veiligheid", end: null, acting: false },
    { person: "person:oud-minister", position: "pos:minister-van-defensie", end: "2025-01-01", acting: false },
    { person: "person:dilan-yesilgoz-zegerius", position: "pos:minister-van-defensie", end: null, acting: false },
    { person: "person:eelco-heinen", position: "pos:minister-van-financien-aruba", end: null, acting: false },
  ];
  const aliases = buildTitleAliases(people, tenures);
  const byAlias = new Map(aliases.map((entry) => [entry.alias, entry.target]));
  assert.equal(byAlias.get("minister Heinen"), "person:eelco-heinen");
  assert.equal(byAlias.get("minister van Weel"), "person:david-van-weel");
  assert.equal(byAlias.get("minister Yeşilgöz"), "person:dilan-yesilgoz-zegerius");
  assert.equal(byAlias.get("minister Yesilgoz-Zegerius"), "person:dilan-yesilgoz-zegerius");
  assert.equal([...byAlias.keys()].some((key) => key.includes("Minister")), false);
  assert.ok(!byAlias.has("minister Oud"), "an ended tenure gives no title alias");
  assert.ok(aliases.every((entry) => entry.confidence === "high" && /^person:/.test(entry.target)));
});

test("a title alias shared by two people is dropped instead of guessed", () => {
  const people = [
    { id: "person:a-jansen", name: "Anna Jansen" },
    { id: "person:b-jansen", name: "Bert Jansen" },
  ];
  const tenures = [
    { person: "person:a-jansen", position: "pos:minister-van-financien", end: null },
    { person: "person:b-jansen", position: "pos:minister-van-defensie", end: null },
  ];
  assert.deepEqual(buildTitleAliases(people, tenures), []);
});

test("the prime minister gets premier, minister-president and ministerpresident aliases", () => {
  const aliases = buildTitleAliases(
    [{ id: "person:rob-jetten", name: "Rob Jetten" }],
    [{ person: "person:rob-jetten", position: "pos:minister-president", end: null }],
  );
  assert.deepEqual(aliases.map((entry) => entry.alias).sort(), ["minister-president Jetten", "ministerpresident Jetten", "premier Jetten"]);
});

test("a party leader is linked from the leader title, a fraction chair from the chair title", () => {
  const aliases = buildTitleAliases(
    [{ id: "person:geert-wilders", name: "Geert Wilders" }],
    [{ person: "person:geert-wilders", position: "pos:fractievoorzitter-pvv", end: null }],
  );
  const gazetteer = buildGazetteer(aliases);
  const result = linkArticle({ title: "PVV-leider Wilders stelt vragen", gazetteer, topicIndex: [] });
  assert.deepEqual(result.entities, ["person:geert-wilders"]);
});

test("the real gazetteer links minister Heinen and premier Jetten from the headline", () => {
  const gazetteer = buildGazetteer([
    ...buildTitleAliases(
      [
        { id: "person:eelco-heinen", name: "Eelco Heinen" },
        { id: "person:rob-jetten", name: "Rob Jetten" },
      ],
      [
        { person: "person:eelco-heinen", position: "pos:minister-van-financien", end: null },
        { person: "person:rob-jetten", position: "pos:minister-president", end: null },
      ],
    ),
  ]);
  const heinen = linkArticle({ title: "De box 3-missie van minister Heinen eindigt in een snelle uitglijder", gazetteer, topicIndex: [] });
  assert.deepEqual(heinen.entities, ["person:eelco-heinen"]);
  const jetten = linkArticle({ title: "Premier Jetten vliegt gepassioneerd uit de bocht", gazetteer, topicIndex: [] });
  assert.deepEqual(jetten.entities, ["person:rob-jetten"]);
});

test("a foreign minister with a Dutch surname is not linked to the Dutch minister", () => {
  const gazetteer = buildGazetteer(
    buildTitleAliases(
      [{ id: "person:sophie-hermans", name: "Sophie Hermans" }],
      [{ person: "person:sophie-hermans", position: "pos:minister-van-volksgezondheid-welzijn-en-sport", end: null }],
    ),
  );
  const dutch = linkArticle({ title: "Minister Hermans schrapt wachtlijst", gazetteer, topicIndex: [] });
  assert.deepEqual(dutch.entities, ["person:sophie-hermans"]);
  const belgian = linkArticle({ title: "Belgische minister Hermans schrapt wachtlijst", gazetteer, topicIndex: [] });
  assert.deepEqual(belgian.entities, []);
});

test("a capitalised Kabinet at the start of a headline links to the cabinet", () => {
  const result = realLink("Kabinet wil met verplicht beroepsregister een einde maken aan wanpraktijken van makelaars");
  assert.ok(result.entities.includes("org:kabinet"), JSON.stringify(result.entities));
});

test("a foreign government is not linked to the Dutch regering or kabinet", () => {
  assert.deepEqual(realLink("Familie van vrouw die werd doodgeschoten door ICE klaagt regering-Trump aan").entities, []);
  assert.deepEqual(realLink("De Franse regering presenteert een fors bezuinigingspakket").entities, []);
  assert.deepEqual(realLink("Het Britse kabinet buigt zich over de energierekening").entities, []);
  assert.deepEqual(realLink("Duitse minister van Defensie wil nieuwe fregatten").entities, []);
});

test("the Dutch regering is still linked when Nederland anchors the item", () => {
  const result = realLink("Nederland steunt Franse plannen, zegt de regering");
  assert.ok(result.entities.includes("org:regering"), JSON.stringify(result.entities));
});

test("a bare place name without a government cue is not linked", () => {
  assert.deepEqual(realLink("Amsterdam museums draw fewer visitors as tourists cut trips short").entities, []);
  assert.deepEqual(realLink("Appartement uitgebrand in Apeldoorn, alle bewoners geëvacueerd").entities, []);
});

test("a bare place name with a government cue, or in a government outlet, is linked", () => {
  const cued = realLink("Wethouder wil dat Amsterdam stopt met buurtbudgetten");
  assert.ok(cued.entities.includes("org:gemeente-amsterdam"), JSON.stringify(cued.entities));
  const outlet = realLink("Noord-Holland probeert waterstofeconomie alsnog op gang te brengen", "", { governmentOutlet: true });
  assert.ok(outlet.entities.length > 0, JSON.stringify(outlet.entities));
  assert.deepEqual(realLink("Noord-Holland probeert waterstofeconomie alsnog op gang te brengen").entities, []);
});

test("an explicit gemeente or provincie name always links", () => {
  const result = realLink("Gemeente Hoeksche Waard grijpt in", "");
  assert.ok(result.entities.includes("org:gemeente-hoeksche-waard"), JSON.stringify(result.entities));
});

test("a public broadcaster named in entertainment news is not linked", () => {
  assert.deepEqual(realLink("NPO eert Paulien Cornelisse met uitzending van theatershow").entities, []);
  assert.deepEqual(realLink("NOS-nieuwslezer Evita Mac-nack in verwachting").entities, []);
});

test("a public broadcaster links when a state actor corroborates it", () => {
  const gazetteer = buildGazetteer([
    ...REAL_GAZETTEER.map((entry) => ({ alias: entry.alias, target: entry.target, confidence: entry.declared })),
    ...buildTitleAliases(
      [{ id: "person:eelco-heinen", name: "Eelco Heinen" }],
      [{ person: "person:eelco-heinen", position: "pos:minister-van-financien", end: null }],
    ),
  ]);
  const result = linkArticle({ title: "Minister Heinen wil bezuinigen op de NPO", gazetteer, topicIndex: [] });
  assert.ok(result.entities.includes("person:eelco-heinen"));
  assert.ok(result.entities.includes("org:zbo-nederlandse-publieke-omroep"), JSON.stringify(result.entities));
});

test("CBS the American network is not the Dutch statistics office", () => {
  assert.deepEqual(realLink("Rick Ross in de boeien na verdenking van huiselijk geweld", "Dat meldt CBS.").entities, []);
  const dutch = realLink("Inflatie stijgt volgens het CBS naar 3 procent");
  assert.ok(dutch.entities.includes("org:zbo-centraal-bureau-voor-de-statistiek"), JSON.stringify(dutch.entities));
});

test("an everyday word that is also a topic keyword does not attach a topic on its own", () => {
  assert.deepEqual(realLink("Avatar-acteur Cliff Curtis in ziekenhuis na auto-ongeluk").topics, []);
  assert.deepEqual(realLink("Aanvoerder Van Dijk begint tegen Griekenland aan 99e interland").topics, []);
  assert.deepEqual(realLink("Peter Gillis nog niet uit de schulden ondanks miljoenenbod op vakantieparken").topics, []);
  assert.deepEqual(realLink("Steeds meer premier league clubs kopen auto's").topics, []);
});

test("two keywords of one topic, or one policy keyword, still attach the topic", () => {
  assert.deepEqual(realLink("Inspectie: scholen moeten rekening houden met kennisniveau van leerlingen").topics, ["topic:onderwijs"]);
  assert.ok(realLink("Hersteloperatie voor gedupeerde ouders loopt vertraging op").topics.includes("topic:toeslagen"));
  assert.ok(realLink("Stikstof blokkeert nieuwe woningbouw").topics.includes("topic:stikstof-en-landbouw"));
});

test("the gazetteer only points at records that exist in the dataset", async () => {
  const load = async (name) => JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), "utf8"));
  const ids = new Set();
  for (const name of ["organizations", "people", "positions", "topics"]) for (const record of await load(name)) ids.add(record.id);
  const envelope = JSON.parse(await readFile(new URL("../research/J-nieuwsbronnen.json", import.meta.url), "utf8"));
  const dangling = envelope.aliases.filter((entry) => !ids.has(entry.target)).map((entry) => `${entry.alias} -> ${entry.target}`);
  assert.deepEqual(dangling, []);
});
