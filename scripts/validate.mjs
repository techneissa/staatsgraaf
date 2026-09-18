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
