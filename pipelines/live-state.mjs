// The small committed state file of the live run: cursors, ETags and hashes,
// the TK Persoon.Id to person id map, last-run counts. No secrets, no personal
// data beyond the public ids the Tweede Kamer itself publishes.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export const STATE_FILE = "research/P-live-state.json";
export const STATE_VERSION = 1;

export function emptyState() {
  return {
    version: STATE_VERSION,
    note:
      "State of `bun run live` (ADR 0024). Cursors are Tweede Kamer ApiGewijzigdOp values; personMap maps a Tweede Kamer Persoon.Id to a person id in data/people.json; decentral holds, per source of provincies, gemeenten and waterschappen, the code to org id map (ADR 0027). Written by the pipeline, not by hand.",
    tk: { cursors: {}, presidiumId: null, personMap: {}, lastFullRun: null, lastCounts: null },
    ek: { hashes: {}, lastFullRun: null, colofon: null },
    bewindspersonen: { cabinetSlug: null, slugsHash: null, lastRun: null },
    news: { lastRun: null, sitemapLastmod: null },
    electionDates: { lastRun: null, items: [], gaps: [] },
    decentral: emptyDecentral(),
    lastRun: null,
  };
}

/**
 * Provincies, gemeenten, waterschappen and the commissarissen (ADR 0027): per source the last attempt and
 * run, the retry flag after a guard stop or a failed read, and for the three levels the map from an official
 * code (gm0363, ws0654, pv22) to an org id, the official name last seen per code, and the bootstrap dates.
 */
export function emptyDecentral() {
  const level = () => ({ lastRun: null, lastAttempt: null, pendingGuard: null, pendingRetry: false, codes: {}, names: {}, holdersBootstrapped: null, lastCounts: null, cbsTable: null });
  return { gemeenten: level(), provincies: level(), waterschappen: level(), commissarissen: { lastRun: null, lastAttempt: null, pendingGuard: null, pendingRetry: false, lastCounts: null } };
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
  }
  return value;
}

/** Fill in sections an older state file lacks, without touching what it has. */
export function normalizeState(raw) {
  const base = emptyState();
  const state = raw && typeof raw === "object" ? raw : {};
  return {
    ...base,
    ...state,
    tk: { ...base.tk, ...(state.tk ?? {}), cursors: { ...(state.tk?.cursors ?? {}) }, personMap: { ...(state.tk?.personMap ?? {}) } },
    ek: { ...base.ek, ...(state.ek ?? {}), hashes: { ...(state.ek?.hashes ?? {}) } },
    bewindspersonen: { ...base.bewindspersonen, ...(state.bewindspersonen ?? {}) },
    news: { ...base.news, ...(state.news ?? {}) },
    electionDates: { ...base.electionDates, ...(state.electionDates ?? {}) },
    decentral: Object.fromEntries(
      Object.entries(base.decentral).map(([key, value]) => [
        key,
        { ...value, ...(state.decentral?.[key] ?? {}), ...(value.codes ? { codes: { ...(state.decentral?.[key]?.codes ?? {}) }, names: { ...(state.decentral?.[key]?.names ?? {}) } } : {}) },
      ]),
    ),
  };
}

export async function loadState(root) {
  try {
    return normalizeState(JSON.parse(await readFile(join(root, STATE_FILE), "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") return emptyState();
    throw new Error(`${STATE_FILE}: ${error.message}`);
  }
}

export function serializeState(state) {
  return `${JSON.stringify(sortKeys(state), null, 2)}\n`;
}

/** Writes only when the content changed, so an unchanged run leaves the file (and git) alone. Returns true when written. */
export async function saveState(root, state) {
  const path = join(root, STATE_FILE);
  const next = serializeState(state);
  let current = null;
  try {
    current = await readFile(path, "utf8");
  } catch {
    current = null;
  }
  if (current === next) return false;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, next, "utf8");
  return true;
}
