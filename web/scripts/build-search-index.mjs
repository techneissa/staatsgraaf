#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_DIR = fileURLToPath(new URL("../", import.meta.url));
const DATA_DIR = fileURLToPath(new URL("../../data/", import.meta.url));
const RESEARCH_DIR = fileURLToPath(new URL("../../research/", import.meta.url));
const OVERLAY_FILE = fileURLToPath(new URL("../data/search-aliases.json", import.meta.url));
const OUT_FILE = fileURLToPath(new URL("../public/search-index.json", import.meta.url));

const RESEARCH_FILE = /^[A-O]-.*\.json$/;
const ABBREVIATION = /^[A-Z0-9][A-Z0-9.\-]{1,9}$/;

process.chdir(WEB_DIR);
const { entityHref } = await import("../lib/data.ts");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readArray(name) {
  const value = readJson(join(DATA_DIR, name));
  return Array.isArray(value) ? value : [];
}

function stringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
}

function compareCodeUnit(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

// The gazetteer lives in the research files. Organizations and people carry
// their aliases in data/, but the position schema has no aliases field, so the
// 1454 position aliases can only be read here at index-build time.
export function collectGazetteerAliases() {
  const byTarget = new Map();
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (typeof value.alias === "string" && typeof value.target === "string") {
      const list = byTarget.get(value.target) ?? [];
      list.push(value.alias);
      byTarget.set(value.target, list);
      return;
    }
    for (const key of Object.keys(value)) visit(value[key]);
  };
  for (const file of readdirSync(RESEARCH_DIR).filter((name) => RESEARCH_FILE.test(name))) {
    visit(readJson(join(RESEARCH_DIR, file)));
  }
  return byTarget;
}

function detectAbbreviation(terms) {
  for (const term of terms) {
    if (ABBREVIATION.test(term)) return term;
  }
  return null;
}

function makeRecord(kind, id, label, aliasGroups, image = null) {
  const href = entityHref(id);
  // A missing href means the entity has no route yet; it is a named gap, not a fact.
  if (!href) return null;
  const terms = new Set([label]);
  for (const group of aliasGroups) {
    for (const alias of stringList(group)) terms.add(alias.trim());
  }
  const list = [...terms];
  return {
    id,
    kind,
    label,
    href,
    abbreviation: kind === "organization" ? detectAbbreviation(list) : null,
    image,
    terms: list,
  };
}

function applyAliasOverlay(records) {
  const overlay = readJson(OVERLAY_FILE);
  const entries = Array.isArray(overlay.entries) ? overlay.entries : [];
  const byId = new Map(records.map((record) => [record.id, record]));
  const skipped = [];
  for (const entry of entries) {
    const record = byId.get(entry.target);
    if (!record) {
      skipped.push({ target: entry.target, terms: stringList(entry.terms), reason: entry.reason ?? null });
      continue;
    }
    const terms = new Set(record.terms);
    for (const term of stringList(entry.terms)) terms.add(term.trim());
    record.terms = [...terms];
  }
  return skipped;
}

export function buildIndex() {
  const organizations = readArray("organizations.json");
  const people = readArray("people.json");
  const positions = readArray("positions.json");
  const topics = readArray("topics.json");
  const media = readArray("media.json");
  const meta = readJson(join(DATA_DIR, "meta.json"));
  // Portrait URLs come from media.json, the only place a licensed image lives.
  const portraitUrl = new Map(media.filter((item) => item.type === "portrait").map((item) => [item.id, item.url]));
  const gazetteer = collectGazetteerAliases();

  const records = [];
  for (const org of organizations) {
    records.push(makeRecord("organization", org.id, org.name, [org.aliases, gazetteer.get(org.id)]));
  }
  for (const person of people) {
    const image = typeof person.portrait === "string" ? (portraitUrl.get(person.portrait) ?? null) : null;
    records.push(makeRecord("person", person.id, person.name, [person.aliases, gazetteer.get(person.id)], image));
  }
  for (const position of positions) {
    records.push(makeRecord("position", position.id, position.title, [gazetteer.get(position.id)]));
  }
  for (const topic of topics) {
    records.push(makeRecord("topic", topic.id, topic.name, [topic.keywords]));
  }

  const present = records.filter(Boolean).sort((a, b) => compareCodeUnit(a.id, b.id));
  const skipped = applyAliasOverlay(present);
  for (const record of present) {
    record.terms = [...new Set(record.terms)].sort(compareCodeUnit);
  }

  const counts = { organization: 0, person: 0, position: 0, topic: 0 };
  for (const record of present) counts[record.kind] += 1;

  return {
    version: 1,
    generatedAt: typeof meta.generatedAt === "string" ? meta.generatedAt : null,
    counts,
    skipped,
    records: present,
  };
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (invokedDirectly) {
  const index = buildIndex();
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  const json = JSON.stringify(index);
  writeFileSync(OUT_FILE, json);

  const bytes = Buffer.byteLength(json, "utf8");
  console.log(
    `search-index.json: ${index.records.length} records ` +
      `(${index.counts.organization} org, ${index.counts.person} people, ` +
      `${index.counts.position} positions, ${index.counts.topic} topics), ` +
      `${bytes} bytes, ${(bytes / 1024).toFixed(1)} KiB`,
  );
  for (const skip of index.skipped) {
    console.warn(`search-index: skipped alias overlay target ${skip.target} (not in the dataset): ${skip.reason ?? ""}`);
  }
}
