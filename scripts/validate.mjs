#!/usr/bin/env bun
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_DIR = join(ROOT, "schema", "v1");
const SHARED_DIR = join(ROOT, "shared");
const DATA_DIR = join(ROOT, "data");
const RESEARCH_DIR = join(ROOT, "research");
const RESEARCH_MODE = process.argv.includes("--research");

const DATA_MAP = [
  ["governments.json", "government.schema.json", "government"],
  ["organizations.json", "organization.schema.json", "organization"],
  ["positions.json", "position.schema.json", "position"],
  ["people.json", "person.schema.json", "person"],
  ["tenures.json", "tenure.schema.json", "tenure"],
  ["memberships.json", "membership.schema.json", "membership"],
  ["relations.json", "relation.schema.json", "relation"],
  ["changes.json", "change.schema.json", "change"],
  ["news.json", "news-item.schema.json", "newsItem"],
  ["topics.json", "topic.schema.json", "topic"],
  ["budgets.json", "budget.schema.json", "budget"],
  ["sources.json", "source.schema.json", "source"],
  ["media.json", "media.schema.json", "media"],
  ["elections.json", "election.schema.json", "election"],
  ["coalitions.json", "coalition.schema.json", "coalition"],
];

const SUPPORTED = new Set([
  "$schema", "$id", "$ref", "$defs", "type", "required", "properties", "additionalProperties",
  "items", "enum", "pattern", "format", "minItems", "minimum", "maximum", "minLength", "maxLength",
  "title", "description", "x-validate-against",
]);

const failures = [];
function fail(where, message) {
  failures.push(`${where}: ${message}`);
}

const schemaCache = new Map();
function loadSchema(file) {
  if (!schemaCache.has(file)) {
    const candidates = [
      join(SCHEMA_DIR, file),
      join(SHARED_DIR, file),
      join(ROOT, file),
    ];
    const full = candidates.find((c) => existsSync(c));
    if (!full) throw new Error(`schema file not found: ${file}`);
    schemaCache.set(file, JSON.parse(readFileSync(full, "utf8")));
  }
  return schemaCache.get(file);
}

function resolveRef(ref, currentFile) {
  const [filePart, pointer] = ref.split("#");
  const file = filePart === "" ? currentFile : filePart;
  const schema = loadSchema(file);
  if (!pointer || pointer === "" || pointer === "/") return { schema, file };
  const parts = pointer.split("/").filter(Boolean).map(decodeURIComponent);
  let node = schema;
  for (const part of parts) {
    node = node?.[part];
    if (node === undefined) throw new Error(`cannot resolve $ref ${ref}`);
  }
  return { schema: node, file };
}

function checkKeywords(schema, file, path) {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) return;
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED.has(key)) throw new Error(`unsupported keyword "${key}" in ${file} at ${path}`);
  }
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  if (typeof value === "number") return "number";
  return typeof value;
}

function matchesType(value, t) {
  const actual = typeOf(value);
  if (t === actual) return true;
  if (t === "number" && actual === "integer") return true;
  return false;
}

function isValidDate(s) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(`${s}T00:00:00Z`);
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
}

function validate(instance, schema, file, path) {
  if (schema.$ref) {
    const { schema: target, file: targetFile } = resolveRef(schema.$ref, file);
    return validate(instance, target, targetFile, path);
  }
  checkKeywords(schema, file, path);

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(instance, t))) {
      fail(path, `expected type ${types.join("|")}, got ${typeOf(instance)}`);
      return;
    }
  }
  if (schema.enum !== undefined) {
    if (!schema.enum.some((v) => JSON.stringify(v) === JSON.stringify(instance))) {
      fail(path, `value ${JSON.stringify(instance)} not in enum`);
    }
  }
  if (schema.pattern !== undefined && typeof instance === "string") {
    if (!new RegExp(schema.pattern).test(instance)) {
      fail(path, `value ${JSON.stringify(instance)} does not match ${schema.pattern}`);
    }
  }
  if (schema.format !== undefined && typeof instance === "string") {
    if (schema.format === "date" && !isValidDate(instance)) fail(path, `invalid date ${instance}`);
    if (schema.format === "date-time" && Number.isNaN(Date.parse(instance))) {
      fail(path, `invalid date-time ${instance}`);
    }
    if (schema.format === "uri" && !/^https?:\/\//.test(instance)) fail(path, `invalid uri ${instance}`);
  }
  if (schema.minLength !== undefined && typeof instance === "string" && instance.length < schema.minLength) {
    fail(path, `string shorter than ${schema.minLength}`);
  }
  if (schema.maxLength !== undefined && typeof instance === "string" && instance.length > schema.maxLength) {
    fail(path, `string longer than ${schema.maxLength}`);
  }
  if (schema.minimum !== undefined && typeof instance === "number" && instance < schema.minimum) {
    fail(path, `number below minimum ${schema.minimum}`);
  }
  if (schema.maximum !== undefined && typeof instance === "number" && instance > schema.maximum) {
    fail(path, `number above maximum ${schema.maximum}`);
  }
  if (schema.minItems !== undefined && Array.isArray(instance) && instance.length < schema.minItems) {
    fail(path, `array has fewer than ${schema.minItems} items`);
  }
  if (schema.items !== undefined && Array.isArray(instance)) {
    instance.forEach((item, i) => validate(item, schema.items, file, `${path}[${i}]`));
  }
  if (schema.required !== undefined && instance !== null && typeof instance === "object" && !Array.isArray(instance)) {
    for (const key of schema.required) {
      if (!(key in instance)) fail(path, `missing required key "${key}"`);
    }
  }
  if (schema.properties !== undefined && instance !== null && typeof instance === "object" && !Array.isArray(instance)) {
    for (const [key, sub] of Object.entries(schema.properties)) {
      if (key in instance) validate(instance[key], sub, file, `${path}.${key}`);
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(instance)) {
        if (!allowed.has(key)) fail(path, `unexpected key "${key}"`);
      }
    }
  }
}

function loadData(file) {
  const full = join(DATA_DIR, file);
  if (!existsSync(full)) {
    fail(file, "data file missing");
    return null;
  }
  const parsed = JSON.parse(readFileSync(full, "utf8"));
  if (!Array.isArray(parsed)) {
    fail(file, "root must be a JSON array");
    return null;
  }
  return parsed;
}

const data = {};
const counts = {};
for (const [file, schemaFile, defName] of DATA_MAP) {
  const items = loadData(file);
  data[file] = items ?? [];
  counts[file] = data[file].length;
  if (items === null) continue;
  const schema = { $ref: `${schemaFile}#/$defs/${defName}` };
  items.forEach((item, i) => validate(item, schema, schemaFile, `${file}[${i}]`));
}

const byFile = Object.fromEntries(DATA_MAP.map(([f]) => [f, data[f]]));
const index = (file, key = "id") => new Map(byFile[file].map((e) => [e[key], e]));
const orgIds = index("organizations.json");
const posIds = index("positions.json");
const personIds = index("people.json");
const tenureIds = index("tenures.json");
const membershipIds = index("memberships.json");
const changeIds = index("changes.json");
const topicIds = index("topics.json");
const mediaIds = index("media.json");
const srcIds = index("sources.json");
const relationIds = index("relations.json");

// Party keys come from the sourced party table; the import is optional so the
// validator still runs when the web package is absent.
let partyKeyForDataset = null;
try {
  ({ partyKeyForDataset } = await import("../web/lib/parties.ts"));
} catch {
  console.warn("warning: web/lib/parties.ts not importable, party keys are not checked");
}
function partyOk(where, value) {
  if (partyKeyForDataset && partyKeyForDataset(value) === null) fail(where, `party ${value} is not in web/lib/parties.ts`);
}

function checkUniqueIds(file) {
  const seen = new Map();
  for (const item of byFile[file]) {
    const key = file === "budgets.json" ? `${item.organization}|${item.fiscalYear}` : item.id;
    if (seen.has(key)) fail(`${file}`, `duplicate id ${key}`);
    seen.set(key, true);
  }
}
for (const [file] of DATA_MAP) if (file !== "governments.json") checkUniqueIds(file);

for (const file of ["organizations.json", "positions.json", "people.json", "topics.json"]) {
  const seen = new Map();
  for (const item of byFile[file]) {
    if (!item.slug) continue;
    if (seen.has(item.slug)) fail(file, `duplicate slug ${item.slug}`);
    seen.set(item.slug, true);
  }
}

function refOk(where, id, table, label) {
  if (id === null || id === undefined) return;
  if (!table.has(id)) fail(where, `${label} ${id} does not resolve`);
}

for (const org of byFile["organizations.json"]) {
  const w = `organizations.json#${org.id}`;
  refOk(w, org.parent, orgIds, "parent");
  for (const p of org.partOf ?? []) refOk(w, p, orgIds, "partOf");
  for (const m of org.images ?? []) refOk(w, m, mediaIds, "image");
  for (const s of org.sources ?? []) refOk(w, s.source, srcIds, "source");
}
for (const pos of byFile["positions.json"]) {
  const w = `positions.json#${pos.id}`;
  refOk(w, pos.organization, orgIds, "organization");
  for (const e of pos.exOfficioOf ?? []) refOk(w, e, orgIds, "exOfficioOf");
  for (const s of pos.sources ?? []) refOk(w, s.source, srcIds, "source");
}
for (const person of byFile["people.json"]) {
  const w = `people.json#${person.id}`;
  refOk(w, person.portrait, mediaIds, "portrait");
  for (const s of person.sources ?? []) refOk(w, s.source, srcIds, "source");
}
for (const tenure of byFile["tenures.json"]) {
  const w = `tenures.json#${tenure.id}`;
  refOk(w, tenure.person, personIds, "person");
  refOk(w, tenure.position, posIds, "position");
  refOk(w, tenure.appointedBy, orgIds, "appointedBy");
  refOk(w, tenure.predecessor, tenureIds, "predecessor");
  refOk(w, tenure.successor, tenureIds, "successor");
  refOk(w, tenure.source?.source, srcIds, "source");
  if (tenure.end && tenure.start && tenure.end <= tenure.start) {
    fail(w, `end ${tenure.end} is not after start ${tenure.start}`);
  }
}
for (const membership of byFile["memberships.json"]) {
  const w = `memberships.json#${membership.id}`;
  refOk(w, membership.organization, orgIds, "organization");
  refOk(w, membership.person, personIds, "person");
  refOk(w, membership.source?.source, srcIds, "source");
  if (membership.end && membership.start && membership.end <= membership.start) {
    fail(w, `end ${membership.end} is not after start ${membership.start}`);
  }
}
for (const rel of byFile["relations.json"]) {
  const w = `relations.json#${rel.id}`;
  const tables = { org: orgIds, pos: posIds, person: personIds, tenure: tenureIds };
  refOk(w, rel.from, tables[(rel.from ?? "").split(":")[0]], "from");
  refOk(w, rel.to, tables[(rel.to ?? "").split(":")[0]], "to");
  refOk(w, rel.source?.source, srcIds, "source");
  refOk(w, rel.supersededBy, relationIds, "supersededBy");
  if (rel.validFrom && rel.validTo && rel.validTo <= rel.validFrom) {
    fail(w, `validTo ${rel.validTo} is not after validFrom ${rel.validFrom}`);
  }
}
{
  // Two open relations of the same type between the same pair would be the same fact twice.
  const open = new Map();
  for (const rel of byFile["relations.json"]) {
    if (rel.validTo) continue;
    const key = `${rel.from}|${rel.to}|${rel.type}`;
    if (open.has(key)) fail(`relations.json#${rel.id}`, `duplicates open relation ${open.get(key)}`);
    open.set(key, rel.id);
  }
}
for (const election of byFile["elections.json"]) {
  const w = `elections.json#${election.id}`;
  refOk(w, election.body, orgIds, "body");
  refOk(w, election.source?.source, srcIds, "source");
  const sum = (election.seats ?? []).reduce((total, row) => total + (row.seats ?? 0), 0);
  if (sum !== election.seatsTotal) fail(w, `seats sum to ${sum}, seatsTotal is ${election.seatsTotal}`);
  const parties = new Set();
  for (const row of election.seats ?? []) {
    if (parties.has(row.party)) fail(w, `party ${row.party} listed twice`);
    parties.add(row.party);
    partyOk(w, row.party);
  }
}
for (const coalition of byFile["coalitions.json"]) {
  const w = `coalitions.json#${coalition.id}`;
  refOk(w, coalition.government, orgIds, "government");
  refOk(w, coalition.primeMinister, personIds, "primeMinister");
  refOk(w, coalition.agreement, srcIds, "agreement");
  refOk(w, coalition.source?.source, srcIds, "source");
  if (coalition.end && coalition.end <= coalition.start) fail(w, `end ${coalition.end} is not after start ${coalition.start}`);
  if (coalition.demissionairSince && coalition.demissionairSince < coalition.start) {
    fail(w, `demissionairSince ${coalition.demissionairSince} is before start ${coalition.start}`);
  }
  for (const party of coalition.parties ?? []) partyOk(w, party);
}
for (const change of byFile["changes.json"]) {
  const w = `changes.json#${change.id}`;
  refOk(w, change.position, posIds, "position");
  refOk(w, change.organization, orgIds, "organization");
  refOk(w, change.out?.tenure, tenureIds, "out.tenure");
  refOk(w, change.out?.person, personIds, "out.person");
  refOk(w, change.in?.tenure, tenureIds, "in.tenure");
  refOk(w, change.in?.person, personIds, "in.person");
  refOk(w, change.source?.source, srcIds, "source");
}
for (const news of byFile["news.json"]) {
  const w = `news.json#${news.id}`;
  const tables = { org: orgIds, pos: posIds, person: personIds, topic: topicIds };
  for (const e of news.entities ?? []) refOk(w, e, tables[(e ?? "").split(":")[0]], "entity");
  for (const t of news.topics ?? []) refOk(w, t, topicIds, "topic");
  refOk(w, news.image, mediaIds, "image");
  for (const s of news.sources ?? []) refOk(w, s.source, srcIds, "source");
}
// News translations live in their own file so a news run never overwrites them.
// The file is optional; when present every record must translate a current news
// item into the other language and keep the source's entity tags.
const TRANSLATIONS_FILE = "news-translations.json";
let translationLine = null;
if (existsSync(join(DATA_DIR, TRANSLATIONS_FILE))) {
  const { entityTags, translationSourceHash } = await import("../shared/news-translation-hash.mjs");
  const translations = loadData(TRANSLATIONS_FILE) ?? [];
  const schema = { $ref: "news-translation.schema.json#/$defs/newsTranslation" };
  translations.forEach((record, i) => validate(record, schema, "news-translation.schema.json", `${TRANSLATIONS_FILE}[${i}]`));
  const newsById = index("news.json");
  const seen = new Set();
  let previous = "";
  let stale = 0;
  for (const record of translations) {
    const w = `${TRANSLATIONS_FILE}#${record.id}/${record.language}`;
    const key = `${record.id}|${record.language}`;
    if (seen.has(key)) fail(w, "duplicate record for this item and language");
    seen.add(key);
    if (key < previous) fail(w, "records are not sorted by id and language");
    previous = key;
    const item = newsById.get(record.id);
    if (!item) {
      fail(w, "news item does not resolve (run `bun run translate` to prune records of items that left news.json)");
      continue;
    }
    const itemLanguage = item.language ?? "nl";
    if (record.sourceLanguage !== itemLanguage) fail(w, `sourceLanguage ${record.sourceLanguage} but the item is ${itemLanguage}`);
    if (record.language === record.sourceLanguage) fail(w, "language equals sourceLanguage");
    for (const tag of entityTags(record.lead)) {
      if (!(item.summaryMarkup ?? "").includes(tag)) fail(w, `entity tag not in the source summaryMarkup: ${tag}`);
    }
    if (record.sourceHash !== translationSourceHash(item.title, item.summaryMarkup ?? null)) stale += 1;
  }
  translationLine = `  ${TRANSLATIONS_FILE.padEnd(22)} ${String(translations.length).padStart(5)} (${stale} stale, hidden until retranslated)`;
}

// Proposals and motions per person (pipelines/parliament-activity.mjs). The file is
// optional; when present every record and co-submitter must resolve to a person,
// every source to a source record, and an item appears once per person.
const ACTIVITIES_FILE = "activities.json";
let activitiesLine = null;
if (existsSync(join(DATA_DIR, ACTIVITIES_FILE))) {
  const records = loadData(ACTIVITIES_FILE) ?? [];
  const schema = { $ref: "activity.schema.json#/$defs/personActivity" };
  records.forEach((record, i) => validate(record, schema, "activity.schema.json", `${ACTIVITIES_FILE}[${i}]`));
  const seenRecords = new Set();
  const seenPeople = new Set();
  let items = 0;
  for (const record of records) {
    const w = `${ACTIVITIES_FILE}#${record.id}`;
    if (seenRecords.has(record.id)) fail(w, "duplicate id");
    seenRecords.add(record.id);
    if (seenPeople.has(record.person)) fail(w, `second record for ${record.person}`);
    seenPeople.add(record.person);
    refOk(w, record.person, personIds, "person");
    refOk(w, record.source?.source, srcIds, "source");
    const seenItems = new Set();
    for (const item of record.items ?? []) {
      items += 1;
      if (seenItems.has(item.id)) fail(w, `item ${item.id} listed twice`);
      seenItems.add(item.id);
      if (record.since && item.date < record.since) fail(w, `item ${item.id} dated ${item.date} before since ${record.since}`);
      if ((record.totals?.[item.kind] ?? 0) < 1) fail(w, `item ${item.id} of kind ${item.kind} but totals.${item.kind} is 0`);
      for (const co of item.coSubmitters ?? []) {
        refOk(`${w}/${item.id}`, co.person, personIds, "coSubmitter");
        if (co.person === record.person) fail(`${w}/${item.id}`, "the person is listed as their own co-submitter");
      }
    }
  }
  activitiesLine = `  ${ACTIVITIES_FILE.padEnd(22)} ${String(records.length).padStart(5)} (${items} items)`;
}

// Career history per person (pipelines/careers.mjs). Optional file; when present
// every person, organizationId and source resolves and every date is valid.
const CAREERS_FILE = "careers.json";
let careersLine = null;
if (existsSync(join(DATA_DIR, CAREERS_FILE))) {
  const records = loadData(CAREERS_FILE) ?? [];
  const schema = { $ref: "career.schema.json#/$defs/career" };
  records.forEach((record, i) => validate(record, schema, "career.schema.json", `${CAREERS_FILE}[${i}]`));
  const partialOk = (value) => {
    if (value === null) return true;
    if (/^[0-9]{4}$/.test(value)) return true;
    if (/^[0-9]{4}-[0-9]{2}$/.test(value)) return Number(value.slice(5)) >= 1 && Number(value.slice(5)) <= 12;
    return isValidDate(value);
  };
  const seen = new Set();
  const people = new Set();
  for (const record of records) {
    const w = `${CAREERS_FILE}#${record.id}`;
    if (seen.has(record.id)) fail(w, "duplicate id");
    seen.add(record.id);
    people.add(record.person);
    refOk(w, record.person, personIds, "person");
    refOk(w, record.organizationId, orgIds, "organizationId");
    refOk(w, record.source?.source, srcIds, "source");
    const slug = (record.person ?? "").replace(/^person:/, "");
    if (!record.id?.startsWith(`career:${slug}-`)) fail(w, `id does not belong to ${record.person}`);
    for (const key of ["start", "end"]) if (!partialOk(record[key])) fail(w, `invalid ${key} ${record[key]}`);
    if (record.start && record.end) {
      const n = Math.min(record.start.length, record.end.length);
      if (record.end.slice(0, n) < record.start.slice(0, n)) fail(w, `end ${record.end} is before start ${record.start}`);
    }
  }
  careersLine = `  ${CAREERS_FILE.padEnd(22)} ${String(records.length).padStart(5)} (${people.size} people)`;
}

// English translations of descriptions and provenance flags. Optional files;
// every record must point at an organization or person that has a description.
const DESCRIPTION_TRANSLATIONS_FILE = "description-translations.json";
const DESCRIPTION_FLAGS_FILE = "description-flags.json";
let descriptionLine = null;
{
  const described = new Map();
  for (const e of [...byFile["organizations.json"], ...byFile["people.json"]]) if (e.description) described.set(e.id, e.description);
  if (existsSync(join(DATA_DIR, DESCRIPTION_TRANSLATIONS_FILE))) {
    const { descriptionSourceHash } = await import("../shared/description-translation-hash.mjs");
    const records = loadData(DESCRIPTION_TRANSLATIONS_FILE) ?? [];
    const schema = { $ref: "description-translation.schema.json#/$defs/descriptionTranslation" };
    records.forEach((r, i) => validate(r, schema, "description-translation.schema.json", `${DESCRIPTION_TRANSLATIONS_FILE}[${i}]`));
    const seen = new Set();
    let previous = "";
    let stale = 0;
    for (const record of records) {
      const key = `${record.id}|${record.field}|${record.language}`;
      const w = `${DESCRIPTION_TRANSLATIONS_FILE}#${key}`;
      if (seen.has(key)) fail(w, "duplicate record");
      seen.add(key);
      if (key < previous) fail(w, "records are not sorted by id, field and language");
      previous = key;
      if (!described.has(record.id)) {
        fail(w, "no organization or person with a description has this id (run `bun pipelines/translate.mjs desc-merge` to prune)");
        continue;
      }
      if (record.sourceHash !== descriptionSourceHash(described.get(record.id))) stale += 1;
    }
    descriptionLine = `  ${DESCRIPTION_TRANSLATIONS_FILE.padEnd(22)} ${String(records.length).padStart(5)} (${stale} stale, hidden until retranslated)`;
  }
  if (existsSync(join(DATA_DIR, DESCRIPTION_FLAGS_FILE))) {
    const flags = loadData(DESCRIPTION_FLAGS_FILE) ?? [];
    const schema = { $ref: "description-flag.schema.json#/$defs/descriptionFlag" };
    flags.forEach((r, i) => validate(r, schema, "description-flag.schema.json", `${DESCRIPTION_FLAGS_FILE}[${i}]`));
    const seen = new Set();
    for (const flag of flags) {
      const w = `${DESCRIPTION_FLAGS_FILE}#${flag.id}`;
      if (seen.has(flag.id)) fail(w, "duplicate id");
      seen.add(flag.id);
      if (!described.has(flag.id)) fail(w, "no organization or person with a description has this id");
    }
    descriptionLine = `${descriptionLine ?? ""}${descriptionLine ? "\n" : ""}  ${DESCRIPTION_FLAGS_FILE.padEnd(22)} ${String(flags.length).padStart(5)}`;
  }
}

for (const topic of byFile["topics.json"]) {
  const w = `topics.json#${topic.id}`;
  for (const o of topic.organizations ?? []) refOk(w, o, orgIds, "organization");
  for (const p of topic.positions ?? []) refOk(w, p, posIds, "position");
}
for (const budget of byFile["budgets.json"]) {
  const w = `budgets.json#${budget.organization}`;
  refOk(w, budget.organization, orgIds, "organization");
  for (const s of budget.sources ?? []) refOk(w, s.source, srcIds, "source");
}
for (const media of byFile["media.json"]) {
  const w = `media.json#${media.id}`;
  refOk(w, media.source, srcIds, "source");
}
for (const gov of byFile["governments.json"]) {
  const w = `governments.json#${gov.slug}`;
  for (const s of gov.sources ?? []) refOk(w, s.source, srcIds, "source");
}

// ---------- research mode: validate workstream output files ----------
const researchLines = [];
if (RESEARCH_MODE) {
  const ENVELOPE = "output-envelope.schema.json";
  const ENTITY_DEFS = {
    organizations: "organization",
    positions: "position",
    people: "person",
    tenures: "tenure",
    memberships: "membership",
    relations: "relation",
    topics: "topic",
    budgets: "budget",
    sources: "source",
    media: "media",
    elections: "election",
    coalitions: "coalition",
  };
  const researchFiles = readdirSync(RESEARCH_DIR).filter((f) => f.endsWith(".json")).sort();
  const parsedFiles = new Map();
  for (const f of researchFiles) {
    try {
      parsedFiles.set(f, JSON.parse(readFileSync(join(RESEARCH_DIR, f), "utf8")));
    } catch (e) {
      fail(`research/${f}`, `invalid JSON: ${e.message}`);
    }
  }
  const declaredSources = new Set(byFile["sources.json"].map((s) => s.id));
  for (const [, env] of parsedFiles) {
    for (const s of env.sources ?? []) if (s && s.id) declaredSources.add(s.id);
  }
  const sourceRefsOf = (record) => {
    const refs = [];
    for (const s of record.sources ?? []) if (s && typeof s.source === "string") refs.push(s.source);
    if (record.source && typeof record.source.source === "string") refs.push(record.source.source);
    return refs;
  };
  const lettersWithMd = new Set(
    readdirSync(RESEARCH_DIR).filter((f) => f.endsWith(".md")).map((f) => f.split("-")[0])
  );
  for (const [f, env] of parsedFiles) {
    const where = `research/${f}`;
    validate(env, { $ref: ENVELOPE }, ENVELOPE, where);
    const letter = f.split("-")[0];
    if (env.workstream !== undefined && env.workstream !== letter) {
      fail(where, `filename letter ${letter} does not match envelope.workstream ${env.workstream}`);
    }
    if (!lettersWithMd.has(letter)) fail(where, `no markdown report for workstream ${letter}`);
    const counts = [];
    for (const [key, defName] of Object.entries(ENTITY_DEFS)) {
      const items = env[key] ?? [];
      counts.push(`${key.slice(0, 4)}:${items.length}`);
      items.forEach((item, i) => {
        validate(item, { $ref: `schema/v1/${defName}.schema.json#/$defs/${defName}` }, ENVELOPE, `${where}:${key}[${i}]`);
      });
    }
    const idsSeen = new Map();
    for (const [key] of Object.entries(ENTITY_DEFS)) {
      if (key === "governments") continue;
      for (const item of env[key] ?? []) {
        if (!item.id) continue;
        if (idsSeen.has(item.id)) fail(where, `duplicate id ${item.id}`);
        idsSeen.set(item.id, true);
      }
      for (const item of env[key] ?? []) {
        for (const ref of sourceRefsOf(item)) {
          if (!declaredSources.has(ref)) fail(where, `source ${ref} does not resolve to any declared source record`);
        }
      }
    }
    for (const mapping of env.legalMappings ?? []) {
      for (const s of mapping.sources ?? []) {
        if (s && !declaredSources.has(s.source)) {
          fail(where, `legalMappings source ${s.source} does not resolve to any declared source record`);
        }
      }
    }
    for (const a of env.aliases ?? []) {
      const target = (a.target ?? "").split(":")[0];
      if (!["org", "pos", "person", "topic"].includes(target)) {
        fail(where, `alias target ${a.target} has unknown prefix`);
      }
    }
    researchLines.push(`  ${f.padEnd(36)} ${counts.join(" ")} gaps:${(env.gaps ?? []).length}`);
  }
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log("Validated data files:");
for (const [file] of DATA_MAP) console.log(`  ${file.padEnd(22)} ${String(counts[file]).padStart(5)}`);
console.log(`  ${"total".padEnd(22)} ${String(total).padStart(5)}`);
if (translationLine) console.log(translationLine);
if (activitiesLine) console.log(activitiesLine);
if (careersLine) console.log(careersLine);
if (descriptionLine) console.log(descriptionLine);
if (RESEARCH_MODE) {
  console.log("\nValidated workstream files:");
  if (researchLines.length === 0) console.log("  (none found)");
  for (const line of researchLines) console.log(line);
}
if (failures.length === 0) {
  console.log("\nOK: schema and referential integrity pass.");
  process.exit(0);
}
console.log(`\nFAIL: ${failures.length} problem(s):`);
for (const f of failures) console.log(`  ${f}`);
process.exit(1);
