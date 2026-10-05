// Apply the live envelope to data/ field by field (ADR 0024).
//
// `bun run merge` rebuilds data/ from every research envelope and replaces a
// record whole; on the committed dataset it is not idempotent (it drops the
// descriptions and some source references that later pipelines wrote straight
// into data/, see the ADR). The unattended live run therefore applies only what
// the live envelope says, and leaves every other field and record alone:
//  - tenures and memberships: inserted when new, replaced only on a substantive
//    difference (same fields as merge), otherwise left as they are;
//  - people: inserted when new, otherwise only missing source references are added;
//  - positions and relations: inserted when new;
//  - sources: inserted when new (license and credit note resolved as merge does),
//    otherwise the retrieval date moves forward.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { applyLicenses, writeAttribution } from "./licenses.mjs";

const SUBSTANTIVE = {
  tenures: ["person", "position", "start", "end", "seat", "acting", "entryMode", "appointedBy", "predecessor", "successor", "endReason"],
  memberships: ["organization", "person", "seatNumber", "fractie", "start", "end"],
};

// Tenures and memberships first: the people pass needs to know whose records changed.
const FILES = {
  tenures: "tenures.json",
  memberships: "memberships.json",
  people: "people.json",
  positions: "positions.json",
  relations: "relations.json",
  sources: "sources.json",
};

async function readArray(path) {
  if (!existsSync(path)) return [];
  const parsed = JSON.parse(await readFile(path, "utf8"));
  return Array.isArray(parsed) ? parsed : [];
}

function substantiveDiff(entity, a, b) {
  const norm = (value) => (value == null ? null : value);
  return SUBSTANTIVE[entity].some((field) => norm(a?.[field]) !== norm(b?.[field]));
}

function sortById(records) {
  return records.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

export async function applyEnvelopeToData({ dataDir, envelope, now = new Date(), attributionPath = null }) {
  const counts = {};
  const next = {};
  const changedFiles = new Set();
  // People whose tenure or membership is written by this apply: only they gain a source reference.
  const touchedPeople = new Set();

  for (const entity of Object.keys(FILES)) {
    const records = await readArray(join(dataDir, FILES[entity]));
    const byId = new Map(records.map((record) => [record.id, record]));
    const tally = { added: 0, updated: 0, unchanged: 0 };
    for (const incoming of envelope[entity] ?? []) {
      if (!incoming || typeof incoming.id !== "string") continue;
      const existing = byId.get(incoming.id);
      if (!existing) {
        const record = structuredClone(incoming);
        if (entity === "sources") applyLicenses([record]);
        byId.set(record.id, record);
        tally.added += 1;
        if (entity === "tenures" || entity === "memberships") touchedPeople.add(record.person);
        continue;
      }
      if (entity === "tenures" || entity === "memberships") {
        if (substantiveDiff(entity, existing, incoming)) {
          byId.set(incoming.id, structuredClone(incoming));
          tally.updated += 1;
          touchedPeople.add(incoming.person);
        } else tally.unchanged += 1;
        continue;
      }
      if (entity === "people") {
        if (!touchedPeople.has(existing.id)) {
          tally.unchanged += 1;
          continue;
        }
        const have = new Set((existing.sources ?? []).map((ref) => ref && ref.source));
        const missing = (incoming.sources ?? []).filter((ref) => ref && !have.has(ref.source));
        if (missing.length > 0) {
          existing.sources = [...(existing.sources ?? []), ...structuredClone(missing)];
          tally.updated += 1;
        } else tally.unchanged += 1;
        continue;
      }
      if (entity === "sources") {
        if (typeof incoming.retrieved === "string" && (!existing.retrieved || incoming.retrieved > existing.retrieved)) {
          existing.retrieved = incoming.retrieved;
          tally.updated += 1;
        } else tally.unchanged += 1;
        continue;
      }
      tally.unchanged += 1;
    }
    counts[entity] = tally;
    next[entity] = sortById([...byId.values()]);
    if (tally.added > 0 || tally.updated > 0) changedFiles.add(entity);
  }

  for (const entity of changedFiles) {
    const path = join(dataDir, FILES[entity]);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(next[entity], null, 2)}\n`, "utf8");
  }

  if (changedFiles.size > 0) {
    const retrieved = next.sources.map((record) => record.retrieved).filter((value) => typeof value === "string").sort();
    const metaPath = join(dataDir, "meta.json");
    let meta = {};
    try {
      meta = JSON.parse(await readFile(metaPath, "utf8"));
    } catch {
      meta = { datasetVersion: "v1", licenses: { code: "CC-BY-NC-SA-4.0", data: "CC-BY-4.0" }, datasetLicenseUrl: "https://creativecommons.org/licenses/by/4.0/" };
    }
    meta.snapshotId = retrieved[retrieved.length - 1] ?? now.toISOString().slice(0, 10);
    meta.generatedAt = now.toISOString();
    meta.sources = { earliest: retrieved[0] ?? null, latest: retrieved[retrieved.length - 1] ?? null };
    await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    if (changedFiles.has("sources") && attributionPath) await writeAttribution(next.sources, attributionPath);
  }

  return { counts, changedFiles: [...changedFiles].sort() };
}
