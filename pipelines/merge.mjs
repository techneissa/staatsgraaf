#!/usr/bin/env bun
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { applyArchiveUrls, applyLicenses, licenseDistribution, writeAttribution } from "./licenses.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const ENTITY_FILES = [
  ["organizations", "organizations.json"],
  ["positions", "positions.json"],
  ["people", "people.json"],
  ["tenures", "tenures.json"],
  ["memberships", "memberships.json"],
  ["relations", "relations.json"],
  ["topics", "topics.json"],
  ["budgets", "budgets.json"],
  ["sources", "sources.json"],
  ["media", "media.json"],
];

const TIER = { live: -1, primary: 0, register: 1, government: 2, secondary: 3, news: 4, base: 99 };
const TIER_LABEL = {
  [TIER.live]: "live official source",
  [TIER.primary]: "primary legal text",
  [TIER.register]: "official register",
  [TIER.government]: "government site",
  [TIER.secondary]: "secondary",
  [TIER.news]: "news",
  [TIER.base]: "seed base",
};

const GOVERNMENT_DOMAINS = [
  "overheid.nl",
  "gob.nl",
  "tweedekamer.nl",
  "eerstekamer.nl",
  "rechtspraak.nl",
  "hogeraad.nl",
  "kiesraad.nl",
  "rekenkamer.nl",
  "nationaleombudsman.nl",
  "om.nl",
  "politie.nl",
  "defensie.nl",
  "ser.nl",
  "wrr.nl",
  "rli.nl",
  "rob-rfv.nl",
  "onderwijsraad.nl",
  "gezondheidsraad.nl",
  "raadrvs.nl",
  "adviesraadmigratie.nl",
  "awti.nl",
  "cpb.nl",
  "pbl.nl",
  "scp.nl",
  "ipo.nl",
  "vng.nl",
  "openraadsinformatie.nl",
  "rijksfinancien.nl",
  "rijksdienstcn.com",
  "cbs.nl",
  "openstate.eu",
  "officielebekendmakingen.nl",
  "staatsblad.overheid.nl",
];

export function isGovernmentUrl(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return GOVERNMENT_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function sourceTier(source) {
  if (!source) return TIER.secondary;
  if (source.type === "wet" || source.type === "kb") return TIER.primary;
  if (source.type === "register") return TIER.register;
  if (source.type === "news") return TIER.news;
  if (source.type === "api" || source.type === "page") {
    return isGovernmentUrl(source.url) ? TIER.government : TIER.secondary;
  }
  return TIER.secondary;
}

function sourceRefsOf(record) {
  const ids = [];
  if (Array.isArray(record.sources)) {
    for (const s of record.sources) if (s && typeof s.source === "string") ids.push(s.source);
  }
  if (typeof record.source === "string") ids.push(record.source);
  else if (record.source && typeof record.source.source === "string") ids.push(record.source.source);
  return ids;
}

function recordTier(record, sourceById) {
  let best = null;
  for (const id of sourceRefsOf(record)) {
    const rank = sourceTier(sourceById.get(id));
    if (best === null || rank < best) best = rank;
  }
  return best === null ? TIER.secondary : best;
}

const SUBSTANTIVE_FIELDS = {
  tenures: ["person", "position", "start", "end", "seat", "acting", "entryMode", "appointedBy", "predecessor", "successor", "endReason"],
  memberships: ["organization", "person", "seatNumber", "fractie", "start", "end"],
};

function substantiveDiff(entity, a, b) {
  const fields = SUBSTANTIVE_FIELDS[entity];
  if (!fields) return false;
  const norm = (value) => (value == null ? null : value);
  return fields.some((field) => norm(a?.[field]) !== norm(b?.[field]));
}

function candidateTier(entity, candidate, sourceById, group) {
  if (candidate.isBase) return TIER.base;
  const isLive = (entity === "tenures" || entity === "memberships") && candidate.from.startsWith("P-");
  if (!isLive) return recordTier(candidate.rec, sourceById);
  const others = group.filter((entry) => entry !== candidate && !entry.isBase);
  const changes = others.some((entry) => substantiveDiff(entity, entry.rec, candidate.rec));
  return changes || others.length === 0 ? TIER.live : TIER.base;
}

// Enrichment written into data/ by a pipeline that runs after the merge
// (pipelines/portraits.mjs). Research envelopes never carry these fields, so a
// research record that wins the id would silently drop them on the next run.
// Carry them forward from the previous data/ record unless the winner sets
// them itself, together with the source refs that back them.
const ENRICHMENT_FIELDS = {
  people: ["portrait", "wikidata", "wikipedia"],
};
const ENRICHMENT_SOURCE_PREFIXES = ["src:wikidata-", "src:commons-"];

function carryForwardEnrichment(entity, winners, base, stats) {
  const fields = ENRICHMENT_FIELDS[entity];
  if (!fields) return;
  const previous = new Map((base ?? []).filter((rec) => rec && rec.id).map((rec) => [rec.id, rec]));
  for (const [key, entry] of winners) {
    const before = previous.get(key);
    if (!before || entry.from.startsWith("data/")) continue;
    const record = entry.record;
    let carried = false;
    for (const field of fields) {
      if (record[field] != null || before[field] == null) continue;
      record[field] = structuredClone(before[field]);
      carried = true;
    }
    if (!carried) continue;
    stats.enrichmentCarried += 1;
    appendSourceRefs(
      record,
      (before.sources ?? []).filter(
        (ref) => ref && typeof ref.source === "string" && ENRICHMENT_SOURCE_PREFIXES.some((prefix) => ref.source.startsWith(prefix)),
      ),
    );
  }
}

function recordKey(entity, record) {
  return entity === "budgets" ? `${record.organization}|${record.fiscalYear}` : record.id;
}

function logLine(kind, id, keptFrom, droppedFrom, field, note) {
  const entry = { kind, id, keptFrom, droppedFrom, note };
  if (field) entry.field = field;
  return entry;
}

function mergeSourceFields(existing, candidate, logs) {
  const a = existing.record;
  const b = candidate.rec;
  for (const field of ["retrieved"]) {
    if (b[field] == null) continue;
    if (a[field] != null && a[field] !== b[field]) {
      logs.push(logLine("source-conflict", a.id, existing.from, candidate.from, field, `kept ${a[field]}, saw ${b[field]}`));
    } else if (a[field] == null) {
      a[field] = b[field];
    }
  }
  for (const field of ["title", "license"]) {
    const current = a[field] ?? null;
    const incoming = b[field] ?? null;
    if (incoming == null) continue;
    if (current != null && current !== incoming) {
      logs.push(logLine("source-conflict", a.id, existing.from, candidate.from, field, `kept longest, saw a differing value`));
    }
    if (current == null || incoming.length > current.length) a[field] = incoming;
  }
  for (const field of ["url", "publisher", "type", "published", "archiveUrl", "notes"]) {
    const current = a[field] ?? null;
    const incoming = b[field] ?? null;
    if (incoming == null) continue;
    if (current != null && current !== incoming) {
      logs.push(logLine("source-conflict", a.id, existing.from, candidate.from, field, `kept first, saw a differing value`));
    } else if (current == null) {
      a[field] = incoming;
    }
  }
}

function mergeSources(candidates, logs) {
  const byId = new Map();
  for (const candidate of candidates) {
    const existing = byId.get(candidate.rec.id);
    if (!existing) {
      byId.set(candidate.rec.id, { record: structuredClone(candidate.rec), from: candidate.from });
      continue;
    }
    mergeSourceFields(existing, candidate, logs);
  }
  return byId;
}

function selectWinners(entity, candidates, sourceById, logs, stats) {
  const groups = new Map();
  for (const candidate of candidates) {
    const key = recordKey(entity, candidate.rec);
    if (key == null) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }
  const winners = new Map();
  for (const key of [...groups.keys()].sort()) {
    const ranked = groups.get(key).map((candidate) => ({
      ...candidate,
      tier: candidateTier(entity, candidate, sourceById, groups.get(key)),
    }));
    ranked.sort((x, y) => x.tier - y.tier || x.order - y.order);
    const winner = ranked[0];
    winners.set(key, { record: structuredClone(winner.rec), from: winner.from });
    for (const loser of ranked.slice(1)) {
      if (loser.from === winner.from && loser.order === winner.order) {
        stats.idDuplicate += 1;
        logs.push(logLine("id-duplicate", key, winner.from, loser.from, undefined, "duplicate id within one workstream; first kept"));
        continue;
      }
      if (loser.isBase) {
        stats.baseOverrides += 1;
        logs.push(logLine("record-conflict", key, winner.from, loser.from, undefined, "seed base record replaced by research"));
        continue;
      }
      stats.recordConflicts += 1;
      const note =
        winner.tier === loser.tier
          ? `equal tier (${TIER_LABEL[winner.tier]}), first workstream wins`
          : `${TIER_LABEL[winner.tier]} wins over ${TIER_LABEL[loser.tier]}`;
      logs.push(logLine("record-conflict", key, winner.from, loser.from, undefined, note));
    }
  }
  return winners;
}

function appendSourceRefs(record, refs) {
  if (!Array.isArray(refs) || refs.length === 0) return;
  if (!Array.isArray(record.sources)) record.sources = [];
  const present = new Set(record.sources.map((s) => (s && s.source) || null));
  for (const ref of refs) {
    if (!ref || typeof ref.source !== "string" || present.has(ref.source)) continue;
    record.sources.push(structuredClone(ref));
    present.add(ref.source);
  }
}

function mappingTargets(target, orgs, positions) {
  if (typeof target !== "string") return [];
  if (target.startsWith("subtype:")) {
    const subtype = target.slice("subtype:".length);
    return [...orgs.values()]
      .filter((entry) => entry.record.subtype === subtype)
      .map((entry) => ({ record: entry.record, entity: "organizations" }));
  }
  if (target.startsWith("org:")) {
    const entry = orgs.get(target);
    return entry ? [{ record: entry.record, entity: "organizations" }] : [];
  }
  if (target.startsWith("pos:")) {
    const entry = positions.get(target);
    return entry ? [{ record: entry.record, entity: "positions" }] : [];
  }
  return [];
}

function applyLegalMappings(envelopes, winners, stats) {
  for (const env of envelopes) {
    for (const mapping of env.data.legalMappings ?? []) {
      if (!mapping || !mapping.legalSource) continue;
      const targets = mappingTargets(mapping.target, winners.organizations, winners.positions);
      if (targets.length === 0) {
        stats.unmatchedMappings += 1;
        continue;
      }
      for (const { record, entity } of targets) {
        const field = entity === "organizations" ? "legalSource" : "legalBasis";
        record[field] = structuredClone(mapping.legalSource);
        appendSourceRefs(record, mapping.sources);
      }
    }
  }
}

function aliasHolder(target, winners) {
  if (target.startsWith("org:")) return winners.organizations.get(target);
  if (target.startsWith("person:")) return winners.people.get(target);
  return null;
}

function applyAliases(envelopes, winners, logs, stats) {
  const registry = new Map();
  for (const env of envelopes) {
    for (const alias of env.data.aliases ?? []) {
      if (!alias || typeof alias.alias !== "string" || typeof alias.target !== "string") continue;
      const key = alias.alias.trim().toLowerCase();
      if (key === "") continue;
      const previous = registry.get(key);
      if (previous && previous !== alias.target) {
        stats.aliasCollisions += 1;
        logs.push(logLine("alias-collision", alias.target, previous, alias.target, undefined, `alias "${alias.alias}" already targets another entity`));
        continue;
      }
      registry.set(key, alias.target);
      const holder = aliasHolder(alias.target, winners);
      if (!holder) {
        stats.skippedAliases += 1;
        continue;
      }
      const record = holder.record;
      if (!Array.isArray(record.aliases)) record.aliases = [];
      const exists = record.aliases.some((value) => typeof value === "string" && value.trim().toLowerCase() === key);
      if (!exists) record.aliases.push(alias.alias.trim());
    }
  }
}

async function readArray(dir, file) {
  const full = join(dir, file);
  if (!existsSync(full)) return [];
  const raw = await readFile(full, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${file}: invalid JSON: ${error.message}`);
  }
  return Array.isArray(parsed) ? parsed : [];
}

async function listResearchFiles(researchDir) {
  let entries;
  try {
    entries = await readdir(researchDir);
  } catch {
    return [];
  }
  return entries.filter((name) => /^[A-P]-.*\.json$/.test(name)).sort();
}

async function writeJson(file, value) {
  const dir = dirname(file);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function mergeDataset({
  researchDir,
  dataDir,
  logPath,
  now = new Date(),
  archive = false,
  archiveReportPath = null,
  archiveLog = () => {},
}) {
  const files = await listResearchFiles(researchDir);
  const envelopes = [];
  for (const [order, file] of files.entries()) {
    const raw = await readFile(join(researchDir, file), "utf8");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      throw new Error(`research/${file}: invalid JSON: ${error.message}`);
    }
    envelopes.push({ file, letter: file.slice(0, 1), order, data });
  }

  const base = {};
  for (const [entity, file] of ENTITY_FILES) base[entity] = await readArray(dataDir, file);

  const logs = [];
  const stats = {
    recordConflicts: 0,
    sourceConflicts: 0,
    aliasCollisions: 0,
    idDuplicate: 0,
    baseOverrides: 0,
    unmatchedMappings: 0,
    skippedAliases: 0,
    enrichmentCarried: 0,
  };

  const sourceCandidates = [];
  for (const env of envelopes) {
    for (const rec of env.data.sources ?? []) {
      if (rec && rec.id) sourceCandidates.push({ rec, from: env.file, order: env.order, isBase: false });
    }
  }
  for (const [entity, file] of ENTITY_FILES) {
    if (entity !== "sources") continue;
    for (const rec of base.sources ?? []) {
      if (rec && rec.id) sourceCandidates.push({ rec, from: `data/${file}`, order: Infinity, isBase: true });
    }
  }
  const mergedSources = mergeSources(sourceCandidates, logs);
  stats.sourceConflicts = logs.filter((line) => line.kind === "source-conflict").length;
  const sourceById = new Map([...mergedSources].map(([id, entry]) => [id, entry.record]));

  const winners = {};
  for (const [entity] of ENTITY_FILES) {
    if (entity === "sources") {
      winners.sources = mergedSources;
      continue;
    }
    const candidates = [];
    for (const env of envelopes) {
      for (const rec of env.data[entity] ?? []) {
        if (rec && recordKey(entity, rec) != null) {
          candidates.push({ rec, from: env.file, order: env.order, isBase: false });
        }
      }
    }
    for (const rec of base[entity] ?? []) {
      if (rec && recordKey(entity, rec) != null) {
        candidates.push({ rec, from: `data/${ENTITY_FILES.find(([key]) => key === entity)[1]}`, order: Infinity, isBase: true });
      }
    }
    winners[entity] = selectWinners(entity, candidates, sourceById, logs, stats);
  }

  applyLegalMappings(envelopes, winners, stats);
  applyAliases(envelopes, winners, logs, stats);
  for (const [entity] of ENTITY_FILES) carryForwardEnrichment(entity, winners[entity], base[entity], stats);

  const sourceRecords = [...mergedSources.values()].map((entry) => entry.record);
  applyLicenses(sourceRecords);

  let archiveResult = { targets: 0, applied: 0, gaps: [] };
  if (archive) {
    archiveResult = await applyArchiveUrls({
      sources: sourceRecords,
      reportPath: archiveReportPath ?? join(REPO_ROOT, "research", "qa", "link-check.md"),
      log: archiveLog,
    });
  }

  const counts = {};
  for (const [entity, file] of ENTITY_FILES) {
    const records = [...winners[entity].values()].map((entry) => entry.record);
    records.sort((a, b) => String(recordKey(entity, a)).localeCompare(String(recordKey(entity, b))));
    counts[file] = records.length;
    await writeJson(join(dataDir, file), records);
  }

  const retrieved = [...mergedSources.values()]
    .map((entry) => entry.record.retrieved)
    .filter((value) => typeof value === "string")
    .sort();
  const earliest = retrieved[0] ?? null;
  const latest = retrieved[retrieved.length - 1] ?? null;
  const snapshotId = latest ?? now.toISOString().slice(0, 10);
  const meta = {
    datasetVersion: "v1",
    snapshotId,
    generatedAt: now.toISOString(),
    sources: { earliest, latest },
    licenses: { code: "MIT", data: "CC-BY-4.0" },
    datasetLicenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  };
  await writeJson(join(dataDir, "meta.json"), meta);
  await writeAttribution(sourceRecords, join(dirname(dataDir), "ATTRIBUTION.md"));

  const logDir = dirname(logPath);
  if (!existsSync(logDir)) await mkdir(logDir, { recursive: true });
  await writeFile(logPath, logs.map((line) => JSON.stringify(line)).join("\n") + (logs.length ? "\n" : ""), "utf8");

  return {
    counts,
    logs,
    meta,
    stats,
    files: files.length,
    snapshotId,
    licenses: licenseDistribution(sourceRecords),
    archive: archiveResult,
  };
}

function parseArgs(argv) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const options = {
    researchDir: join(root, "research"),
    dataDir: join(root, "data"),
    logPath: null,
    archive: true,
    archiveReportPath: join(root, "research", "qa", "link-check.md"),
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--research") options.researchDir = argv[(i += 1)];
    else if (argv[i] === "--data") options.dataDir = argv[(i += 1)];
    else if (argv[i] === "--log") options.logPath = argv[(i += 1)];
    else if (argv[i] === "--archive-report") options.archiveReportPath = argv[(i += 1)];
    else if (argv[i] === "--no-archive") options.archive = false;
  }
  if (!options.logPath) options.logPath = join(options.researchDir, "merge-log.entries.jsonl");
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await mergeDataset(options);
  console.log(`Merged ${result.files} research file(s) from ${options.researchDir}`);
  console.log(`${"file".padEnd(22)} ${"records".padStart(8)}`);
  for (const [file, count] of Object.entries(result.counts)) {
    console.log(`${file.padEnd(22)} ${String(count).padStart(8)}`);
  }
  const s = result.stats;
  console.log("\nConflicts:");
  console.log(`  record-conflict (research vs research) ${s.recordConflicts}`);
  console.log(`  record-conflict (seed base replaced)    ${s.baseOverrides}`);
  console.log(`  source-conflict                         ${s.sourceConflicts}`);
  console.log(`  alias-collision                         ${s.aliasCollisions}`);
  console.log(`  id-duplicate                            ${s.idDuplicate}`);
  console.log(`  unmatched legalMappings                 ${s.unmatchedMappings}`);
  console.log(`  aliases skipped (target has no aliases) ${s.skippedAliases}`);
  console.log(`  enrichment carried forward (portraits)  ${s.enrichmentCarried}`);
  console.log("\nLicenses:");
  for (const [license, count] of Object.entries(result.licenses)) {
    if (count > 0) console.log(`  ${license.padEnd(22)} ${String(count).padStart(6)}`);
  }
  if (options.archive) {
    console.log(`\nArchive: ${result.archive.applied} source(s) given an archiveUrl, ${result.archive.targets} target(s) queried, ${result.archive.gaps.length} gap(s)`);
    for (const gap of result.archive.gaps) {
      console.log(`  gap  ${gap.url}`);
      console.log(`       ${gap.reason}; endpoint: ${gap.endpoint}`);
    }
  }
  console.log(`\nSnapshot ${result.snapshotId}, conflict log written to ${options.logPath}`);
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`merge failed: ${error.message}`);
    process.exitCode = 1;
  });
}
