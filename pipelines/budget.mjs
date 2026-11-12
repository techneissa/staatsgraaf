#!/usr/bin/env bun
// Ministry budgets that take in each new year on their own (data/budgets.json).
//
// Source: the rijksfinancien open data "Begrotingsstaten" (CC0), the same file as the first
// import. The rules that turn it into records are in budget-parse.mjs and budget-build.mjs,
// the guard in budget-guard.mjs. This file is the unattended run around them:
//
//   1. at most one check per CHECK_EVERY_HOURS (the refresh runs every 3 hours);
//   2. find the newest Begrotingsstaten_<from>-<to>.json on the open data overview page (a new
//      fiscal year is a new file name);
//   3. a HEAD request: the same URL with the same validators (ETag, Last-Modified, length) as
//      last time, and a data/budgets.json that is still the file this run wrote, stops here;
//   4. otherwise download, hash, and stop when the hash is the one already processed;
//   5. build the records, run the guard, write data/budgets.json and data/sources.json only
//      when a record changed or a year was added.
//
// The validators live in pipelines/.cache/budget/state.json, which the refresh workflow keeps
// in the Actions cache like the news feeds. Without it every run downloads once (1.5 MB).
// Exit codes: 0 fine (also when nothing changed), 2 the guard stopped the download and nothing
// was written, anything else is a hard error.

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { aggregate, MINISTRIES, readTable } from "./budget-parse.mjs";
import { buildRecords, sourceIdFor, updateSources } from "./budget-build.mjs";
import { BudgetGuardError, evaluateBudgetDownload } from "./budget-guard.mjs";
import { LIVE_USER_AGENT } from "./live-util.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const OVERVIEW_URL = "https://www.rijksfinancien.nl/open-data/overzicht-datasets";
export const CHECK_EVERY_HOURS = 20;
/** A download is also hashed once a week when the validators say nothing changed (the host sends only a length). */
export const FULL_CHECK_EVERY_DAYS = 7;
/** A host that does not answer must not hold up the whole scheduled refresh. */
export const REQUEST_TIMEOUT_MS = 30_000;
const STATE_FILE = "state.json";
const HOUR = 3_600_000;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");

/** The newest Begrotingsstaten JSON link on the overview page, or null. */
export function findDownloadUrl(html, pageUrl = OVERVIEW_URL) {
  const found = [];
  for (const match of html.matchAll(/href="([^"]*Begrotingsstaten_(\d{4})-(\d{4})\.json)"/g)) {
    found.push({ url: new URL(match[1].replaceAll("&amp;", "&"), pageUrl).href, from: Number(match[2]), to: Number(match[3]) });
  }
  found.sort((a, b) => b.to - a.to || a.from - b.from);
  return found[0]?.url ?? null;
}

function validatorsOf(response, body) {
  const header = (name) => response.headers?.get?.(name) ?? null;
  return {
    etag: header("etag"),
    lastModified: header("last-modified"),
    contentLength: header("content-length") ?? (body === undefined ? null : String(Buffer.byteLength(body))),
  };
}

function sameValidators(a, b) {
  const keys = ["etag", "lastModified", "contentLength"].filter((key) => a?.[key] && b?.[key]);
  return keys.length > 0 && keys.every((key) => a[key] === b[key]);
}

/**
 * Run the refresh. Returns { status, ... }; throws BudgetGuardError when the guard stops the
 * download. `status` is one of: recent, unreachable, unchanged, unchanged-content, updated, no-change.
 */
export async function run({
  dataDir = join(ROOT, "data"),
  cacheDir = join(ROOT, "pipelines", ".cache", "budget"),
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  force = false,
  log = console.log,
} = {}) {
  const started = now();
  const today = started.toISOString().slice(0, 10);
  const statePath = join(cacheDir, STATE_FILE);
  const budgetsPath = join(dataDir, "budgets.json");
  const sourcesPath = join(dataDir, "sources.json");
  const state = await readJson(statePath, {});
  const budgetsText = await readFile(budgetsPath, "utf8");
  const budgetsSha = sha256(budgetsText);
  // The cache only counts while data/budgets.json is the file this run wrote last time; a run
  // whose data was never committed (a later step failed) starts over instead of skipping.
  const inSync = state.budgetsSha === budgetsSha;

  if (!force && inSync && state.checkedAt && started - new Date(state.checkedAt) < CHECK_EVERY_HOURS * HOUR) {
    log(`begroting: gecontroleerd op ${state.checkedAt}, overgeslagen`);
    return { status: "recent" };
  }

  const get = (url, init = {}) =>
    fetchImpl(url, { redirect: "follow", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), ...init, headers: { "User-Agent": LIVE_USER_AGENT, Accept: "*/*", ...init.headers } });

  const sources = await readJson(sourcesPath, []);
  const knownUrl = sources.filter((source) => /^src:rijksfinancien-begrotingsstaten-/.test(source.id)).at(-1)?.url;
  let url = null;
  try {
    const page = await get(OVERVIEW_URL);
    if (page.ok) url = findDownloadUrl(await page.text(), page.url || OVERVIEW_URL);
    else log(`begroting: overzichtspagina gaf HTTP ${page.status}`);
  } catch (error) {
    log(`begroting: overzichtspagina niet bereikbaar (${error.message})`);
  }
  url ??= knownUrl;
  if (!url) {
    log("begroting: geen Begrotingsstaten-bestand gevonden en geen bekende bron; deze keer overgeslagen");
    return { status: "unreachable" };
  }
  const { id: sourceId, from, to } = sourceIdFor(url);

  // A network error, a timeout or an error status on the download is a missed check, not a failed
  // refresh: log it, keep the saved state, and try again at the next run.
  let head;
  try {
    head = await get(url, { method: "HEAD" });
  } catch (error) {
    log(`begroting: ${url} niet bereikbaar (${error.message}); deze keer overgeslagen`);
    return { status: "unreachable", url };
  }
  if (!head.ok) {
    log(`begroting: HEAD ${url} gaf HTTP ${head.status}; deze keer overgeslagen`);
    return { status: "unreachable", url };
  }
  const validators = validatorsOf(head);
  const fullCheckDue = !state.hashedAt || started - new Date(state.hashedAt) >= FULL_CHECK_EVERY_DAYS * 86_400_000;
  if (!force && inSync && state.url === url && !fullCheckDue && sameValidators(validators, state.validators)) {
    await saveState(cacheDir, statePath, { ...state, checkedAt: started.toISOString() });
    log(`begroting: ${url} ongewijzigd`);
    return { status: "unchanged", url };
  }

  let response;
  let body;
  try {
    response = await get(url);
    if (response.ok) body = await response.text();
  } catch (error) {
    log(`begroting: ${url} niet te downloaden (${error.message}); deze keer overgeslagen`);
    return { status: "unreachable", url };
  }
  if (!response.ok) {
    log(`begroting: GET ${url} gaf HTTP ${response.status}; deze keer overgeslagen`);
    return { status: "unreachable", url };
  }
  const bodySha = sha256(body);
  const nextState = {
    url,
    validators: validatorsOf(response, body),
    sha256: bodySha,
    hashedAt: started.toISOString(),
    checkedAt: started.toISOString(),
    budgetsSha,
  };
  if (!force && inSync && state.url === url && state.sha256 === bodySha) {
    await saveState(cacheDir, statePath, nextState);
    log(`begroting: ${url} heeft dezelfde inhoud als de vorige keer`);
    return { status: "unchanged-content", url };
  }

  const existing = JSON.parse(budgetsText);
  let table;
  try {
    table = readTable(JSON.parse(body));
  } catch (error) {
    throw new BudgetGuardError([`de download is niet te lezen: ${error.message}`]);
  }
  const { totals, unmatchedChapters, rowCount } = aggregate(table);
  const ministries = MINISTRIES.map((ministry) => ministry.id);
  const reasons = evaluateBudgetDownload({ totals, existing, ministries, unmatchedChapters });
  if (reasons.length > 0) throw new BudgetGuardError(reasons);

  const { records, added, changed, missing } = buildRecords({ existing, totals, sourceId, today });
  for (const record of missing) log(`begroting: geen cijfers meer voor ${record.organization} ${record.fiscalYear}; record blijft ongewijzigd`);

  if (added.length === 0 && changed.length === 0) {
    await saveState(cacheDir, statePath, nextState);
    log(`begroting: ${rowCount} rijen gelezen, geen cijfer veranderd`);
    return { status: "no-change", url, rows: rowCount };
  }

  await writeJson(budgetsPath, records);
  const nextSources = updateSources({ sources, sourceId, url, from, to, today, used: true });
  if (nextSources !== sources) await writeJson(sourcesPath, nextSources);
  nextState.budgetsSha = sha256(await readFile(budgetsPath, "utf8"));
  await saveState(cacheDir, statePath, nextState);
  const years = [...new Set(added.map((record) => record.fiscalYear))].sort();
  log(`begroting: ${added.length} record(s) toegevoegd${years.length ? ` (jaar ${years.join(", ")})` : ""}, ${changed.length} bijgewerkt`);
  return { status: "updated", url, added, changed };
}

async function saveState(cacheDir, statePath, state) {
  await mkdir(cacheDir, { recursive: true });
  await writeJson(statePath, state);
}

async function main(argv) {
  const options = { force: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--force") options.force = true;
    else if (argv[i] === "--cache") options.cacheDir = argv[(i += 1)];
    else if (argv[i] === "--data") options.dataDir = argv[(i += 1)];
    else throw new Error(`onbekende optie ${argv[i]}`);
  }
  try {
    await run(options);
  } catch (error) {
    if (error instanceof BudgetGuardError) {
      console.error(error.message);
      for (const reason of error.reasons) console.error(`  - ${reason}`);
      process.exit(2);
    }
    throw error;
  }
}

if (import.meta.main) await main(process.argv.slice(2));
