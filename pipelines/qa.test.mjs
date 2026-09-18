import { it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildGazetteer, buildTopicIndex, linkArticle, normalizeText } from "./link.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data");
const FIXTURE_DIR = join(ROOT, "pipelines", "fixtures", "qa");

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

let datasetPromise = null;
function dataset() {
  datasetPromise ??= Promise.all([
    readJson(join(DATA_DIR, "organizations.json")),
    readJson(join(DATA_DIR, "positions.json")),
    readJson(join(DATA_DIR, "people.json")),
    readJson(join(DATA_DIR, "topics.json")),
    readJson(join(DATA_DIR, "memberships.json")),
    readJson(join(DATA_DIR, "tenures.json")),
  ]).then(([organizations, positions, people, topics, memberships, tenures]) => ({
    organizations,
    positions,
    people,
    topics,
    memberships,
    tenures,
  }));
  return datasetPromise;
}

let gazetteerPromise = null;
function gazetteer() {
  gazetteerPromise ??= readJson(join(ROOT, "research", "J-nieuwsbronnen.json")).then((envelope) =>
    buildGazetteer(envelope.aliases ?? []),
  );
  return gazetteerPromise;
}

let topicIndexPromise = null;
function topicIndex() {
  topicIndexPromise ??= readJson(join(ROOT, "research", "K-topics.json")).then((envelope) =>
    buildTopicIndex(envelope.topics ?? []),
  );
  return topicIndexPromise;
}

const LEADING_ARTICLE = /^(de|het|een|den|der|des)\s+/;

function stripLeadingArticles(value) {
  let text = normalizeText(value);
  for (;;) {
    const next = text.replace(LEADING_ARTICLE, "").trim();
    if (next === text) return text;
    text = next;
  }
}

function matchScore(key, query) {
  if (key === query) return 400;
  if (key.startsWith(query)) return 300;
  if (key.split(" ").some((word) => word.startsWith(query))) return 250;
  if (key.includes(query)) return 200;
  return 0;
}

function buildSearchIndex({ organizations, positions, people, topics }) {
  const index = [];
  const add = (term, target, kind) => {
    if (typeof term !== "string") return;
    const key = stripLeadingArticles(term);
    if (key === "") return;
    index.push({ term, key, target, kind });
  };
  for (const organization of organizations) {
    add(organization.name, organization.id, "organization");
    for (const alias of organization.aliases ?? []) add(alias, organization.id, "organization");
  }
  for (const person of people) {
    add(person.name, person.id, "person");
    for (const alias of person.aliases ?? []) add(alias, person.id, "person");
  }
  for (const position of positions) {
    add(position.title, position.id, "position");
    for (const alias of position.aliases ?? []) add(alias, position.id, "position");
  }
  for (const topic of topics) {
    add(topic.name, topic.id, "topic");
    for (const keyword of topic.keywords ?? []) add(keyword, topic.id, "topic");
  }
  return index;
}

function rankSearch(query, index) {
  const normalized = stripLeadingArticles(query);
  if (normalized === "") return [];
  const best = new Map();
  for (const entry of index) {
    const score = matchScore(entry.key, normalized);
    if (score === 0) continue;
    const current = best.get(entry.target);
    if (!current || score > current.score || (score === current.score && entry.key.length < current.termLength)) {
      best.set(entry.target, {
        target: entry.target,
        kind: entry.kind,
        score,
        matched: entry.term,
        termLength: entry.key.length,
      });
    }
  }
  const topicTier = (kind) => (kind === "topic" ? 1 : 0);
  return [...best.values()].sort(
    (a, b) =>
      topicTier(a.kind) - topicTier(b.kind) ||
      b.score - a.score ||
      a.termLength - b.termLength ||
      a.target.localeCompare(b.target),
  );
}

function topResult(query, index) {
  return rankSearch(query, index)[0] ?? null;
}

const newsFixture = await readJson(join(FIXTURE_DIR, "news-articles.json"));

for (const article of newsFixture.articles) {
  it(`news fixture ${article.id} (${article.kind}): ${article.title}`, async () => {
    const [gaz, topics] = await Promise.all([gazetteer(), topicIndex()]);
    const result = linkArticle({ title: article.title, text: article.text, gazetteer: gaz, topicIndex: topics });
    assert.deepEqual(result.entities, article.expectedEntities, `${article.id}: unexpected entities`);
    assert.equal(result.highMatches, article.expectedHigh, `${article.id}: unexpected high-confidence count`);
    for (const forbidden of article.forbidden ?? []) {
      assert.equal(result.entities.includes(forbidden), false, `${article.id}: must not link ${forbidden}`);
    }
  });
}

it("news fixture covers at least twenty articles with at least fifteen positives and three negatives", () => {
  assert.ok(newsFixture.articles.length >= 20, "fewer than twenty fixture articles");
  assert.ok(
    newsFixture.articles.filter((article) => article.kind === "positive").length >= 15,
    "fewer than fifteen positive fixture articles",
  );
  assert.ok(
    newsFixture.articles.filter((article) => article.kind === "negative").length >= 3,
    "fewer than three negative fixture articles",
  );
});

const TARGETED_ALIAS_PROBES = [
  ["DUO", "org:dienst-uitvoering-onderwijs"],
  ["Belastingdienst", "org:belastingdienst"],
  ["BZK", "org:ministerie-van-binnenlandse-zaken-en-koninkrijksrelaties"],
  ["kabinet", "org:kabinet"],
  ["Kamer", "org:tweede-kamer"],
];

const GEMEENTE_PROBES = [
  ["Amsterdam", "org:gemeente-amsterdam"],
  ["Rotterdam", "org:gemeente-rotterdam"],
  ["Eindhoven", "org:gemeente-eindhoven"],
  ["Nijmegen", "org:gemeente-nijmegen"],
  ["Maastricht", "org:gemeente-maastricht"],
];

for (const [term, expected] of [...TARGETED_ALIAS_PROBES, ...GEMEENTE_PROBES]) {
  it(`alias search resolves "${term}" to ${expected}`, async () => {
    const index = buildSearchIndex(await dataset());
    const top = topResult(term, index);
    assert.ok(top, `no result for ${term}`);
    assert.equal(top.target, expected, `top result for ${term}`);
  });
}

it("alias search GAP-3 resolved: VNG now resolves to the VNG koepel", async () => {
  const index = buildSearchIndex(await dataset());
  const top = topResult("VNG", index);
  assert.ok(top, "no result for VNG");
  assert.equal(top.target, "org:vereniging-van-nederlandse-gemeenten", "top result for VNG");
  const full = topResult("Vereniging van Nederlandse Gemeenten", index);
  assert.ok(full, "no result for the full VNG name");
  assert.equal(
    full.target,
    "org:vereniging-van-nederlandse-gemeenten",
    "top result for Vereniging van Nederlandse Gemeenten",
  );
});

it("alias search F-09: the gemeente owns the bare place name Utrecht", async () => {
  const index = buildSearchIndex(await dataset());
  const top = topResult("Utrecht", index);
  assert.equal(top.target, "org:gemeente-utrecht");
});

it("alias search F-08: bare Den Haag resolves to Gemeente 's-Gravenhage", async () => {
  const index = buildSearchIndex(await dataset());
  const top = topResult("Den Haag", index);
  assert.equal(top.target, "org:gemeente-s-gravenhage");
});

it("alias search F-09: bare Groningen resolves to the gemeente", async () => {
  const index = buildSearchIndex(await dataset());
  const top = topResult("Groningen", index);
  assert.equal(top.target, "org:gemeente-groningen");
});

it("search index consumes merged aliases: positions now carry aliases from pos: gazetteer targets", async () => {
  const { positions, topics } = await dataset();
  assert.ok(positions.length > 0);
  assert.equal(positions.some((position) => Array.isArray(position.aliases) && position.aliases.length > 0), true);
  assert.equal(topics.some((topic) => Array.isArray(topic.aliases)), false);
});

it("counts match the Phase 0 snapshot", async () => {
  const { organizations, memberships } = await dataset();
  const bySubtype = (subtype) => organizations.filter((record) => record.subtype === subtype).length;
  assert.equal(bySubtype("ministerie"), 12, "ministeries");
  assert.equal(bySubtype("provincie"), 12, "provincies");
  assert.equal(bySubtype("gemeente"), 342, "gemeenten");
  assert.equal(bySubtype("waterschap"), 21, "waterschappen");
  assert.equal(bySubtype("veiligheidsregio"), 25, "veiligheidsregio's");
  assert.equal(bySubtype("koepel"), 3, "koepels");
  assert.equal(organizations.length, 1572, "organizations total");
  assert.equal(memberships.filter((record) => record.organization === "org:tweede-kamer").length, 150, "Tweede Kamer");
  assert.equal(memberships.filter((record) => record.organization === "org:eerste-kamer").length, 75, "Eerste Kamer");
});

it("derived snapshot count: 28 bewindspersonen hold an open tenure", async () => {
  const { positions, tenures } = await dataset();
  const positionById = new Map(positions.map((position) => [position.id, position]));
  const open = tenures.filter((tenure) => {
    if (tenure.end) return false;
    const title = positionById.get(tenure.position)?.title ?? "";
    return /^(minister|staatssecretaris)/i.test(title);
  });
  assert.equal(new Set(open.map((tenure) => tenure.person)).size, 28);
});
