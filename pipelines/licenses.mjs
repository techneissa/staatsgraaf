#!/usr/bin/env node
// Per-source license and provenance application for the NL Overheid Graph.
//
// Everything here is derived from research/O-licenses.md (sections 1, 3.3 and 7).
// The mapping is deterministic: an exact source id first (where O singles one
// out), then the URL hostname. Every source ends with one of the SPDX values in
// SPDX_LICENSES and never with license: null.
//
// No dependencies. Node ESM only.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SPDX_LICENSES = Object.freeze([
  "CC0-1.0",
  "CC-BY-4.0",
  "CC-BY-3.0-NL",
  "CC-BY-SA-4.0",
  "all-rights-reserved",
  "unknown",
]);

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export const WAYBACK_THROTTLE_MS = 4000;

export const NEWS_FACTS_ONLY_NOTE =
  "Feiten uit dit bericht mogen worden gebruikt; de tekst en het beeld van de bron niet. Zie research/O-licenses.md sectie 1.5.";

export const GAP_NOTE_PREFIX = "Licentie niet vastgesteld; endpoint:";

// Hosts where automated fetches are blocked, so the link check reports WARN/FAIL
// and an archive copy is the fallback. research/qa/link-check.md names both.
export const BLOCKED_HOSTS = Object.freeze(["www.hogeraad.nl", "www.raadvanstate.nl"]);

// O singles out the two Wikipedia-derived bulk rows (burgemeester and dijkgraaf
// lists) by content; O section 1.4 and section 3.3.
export const LICENSE_BY_ID = new Map([
  ["src:wiki-burgemeesters", "CC-BY-SA-4.0"],
  ["src:wiki-dijkgraven", "CC-BY-SA-4.0"],
]);

// Hostname -> SPDX, straight from the determination table in O section 1.
export const LICENSE_BY_HOST = Object.freeze({
  // 1.1 legal and legislative
  "wetten.overheid.nl": "CC0-1.0",
  "repository.overheid.nl": "CC0-1.0",
  "www.officielebekendmakingen.nl": "CC0-1.0",
  "zoek.officielebekendmakingen.nl": "CC0-1.0",
  "staatsblad.overheid.nl": "CC0-1.0",
  // 1.2 parliament
  "gegevensmagazijn.tweedekamer.nl": "CC0-1.0",
  "www.tweedekamer.nl": "unknown",
  "www.eerstekamer.nl": "CC-BY-4.0",
  "www.kiesraad.nl": "CC0-1.0",
  "www.verkiezingsuitslagen.nl": "CC0-1.0",
  // 1.3 executive, oversight, judiciary
  "www.rijksoverheid.nl": "CC0-1.0",
  "regering.nl": "CC0-1.0",
  "www.regering.nl": "CC0-1.0",
  "government.nl": "CC0-1.0",
  "www.government.nl": "CC0-1.0",
  "www.koninklijkhuis.nl": "CC0-1.0",
  "www.rijksdienstcn.com": "CC0-1.0",
  "www.rijksfinancien.nl": "CC0-1.0",
  "www.defensie.nl": "CC-BY-SA-4.0",
  "www.rechtspraak.nl": "CC-BY-4.0",
  "www.om.nl": "CC0-1.0",
  "www.dji.nl": "CC0-1.0",
  "www.inspectie-jenv.nl": "CC0-1.0",
  "www.justitieleictorganisatie.nl": "CC0-1.0",
  "www.algemenebestuursdienst.nl": "CC0-1.0",
  "www.rekenkamer.nl": "CC0-1.0",
  "www.wrr.nl": "CC0-1.0",
  "www.raadopenbaarbestuur.nl": "CC0-1.0",
  "www.onderwijsraad.nl": "CC0-1.0",
  "www.gezondheidsraad.nl": "CC0-1.0",
  "www.raadrvs.nl": "CC0-1.0",
  "www.adviesraadinternationalevraagstukken.nl": "CC0-1.0",
  "www.adviesraadmigratie.nl": "CC0-1.0",
  "www.awti.nl": "CC0-1.0",
  "www.scp.nl": "CC0-1.0",
  "www.cpb.nl": "CC-BY-3.0-NL",
  "www.pbl.nl": "CC-BY-4.0",
  // O section 7 gaps, named with their endpoint in O sections 1.3 and 7.
  "www.raadvanstate.nl": "unknown",
  "www.politie.nl": "unknown",
  "www.nationaleombudsman.nl": "unknown",
  "www.ser.nl": "unknown",
  "www.rli.nl": "unknown",
  "www.hogeraad.nl": "unknown",
  "www.universiteitleiden.nl": "unknown",
  // 1.4 decentral
  "opendata.cbs.nl": "CC-BY-4.0",
  "organisaties.overheid.nl": "CC0-1.0",
  "www.overheid.nl": "all-rights-reserved",
  "overheid.nl": "all-rights-reserved",
  "nl.wikipedia.org": "CC-BY-SA-4.0",
  // O section 7 item 11: provincie, gemeente and waterschap sites, unverified.
  "www.brabant.nl": "unknown",
  "www.fryslan.frl": "unknown",
  "www.limburg.nl": "unknown",
  "www.overijssel.nl": "unknown",
  "www.provincie.drenthe.nl": "unknown",
  "www.zeeland.nl": "unknown",
  "www.zuid-holland.nl": "unknown",
  "www.noord-holland.nl": "unknown",
  "www.schielandendekrimpenerwaard.nl": "unknown",
  // 1.5 media, news and reference
  "www.ad.nl": "all-rights-reserved",
  "www.volkskrant.nl": "all-rights-reserved",
  "www.trouw.nl": "all-rights-reserved",
  "www.parool.nl": "all-rights-reserved",
  "www.nrc.nl": "all-rights-reserved",
  "www.binnenlandsbestuur.nl": "all-rights-reserved",
  "fd.nl": "all-rights-reserved",
  "nos.nl": "all-rights-reserved",
  "feeds.nos.nl": "all-rights-reserved",
  "www.nu.nl": "all-rights-reserved",
  "www.rtlnieuws.nl": "all-rights-reserved",
  "www.rtl.nl": "all-rights-reserved",
  "www.bnr.nl": "all-rights-reserved",
  "www.rtvdrenthe.nl": "all-rights-reserved",
  "www.parlement.com": "all-rights-reserved",
});

// Hosts whose license requires the exact credit line in O section 3.3.
const CREDIT_HOSTS = new Set([
  "opendata.cbs.nl",
  "www.cpb.nl",
  "www.pbl.nl",
  "www.eerstekamer.nl",
  "www.defensie.nl",
  "nl.wikipedia.org",
]);

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostLookup(host) {
  if (typeof host !== "string" || host === "") return null;
  if (Object.prototype.hasOwnProperty.call(LICENSE_BY_HOST, host)) return LICENSE_BY_HOST[host];
  if (host.startsWith("www.")) {
    const bare = host.slice(4);
    if (Object.prototype.hasOwnProperty.call(LICENSE_BY_HOST, bare)) return LICENSE_BY_HOST[bare];
  } else {
    const www = `www.${host}`;
    if (Object.prototype.hasOwnProperty.call(LICENSE_BY_HOST, www)) return LICENSE_BY_HOST[www];
  }
  return null;
}

/**
 * Deterministic license for one source record.
 *
 * Order, per the task: exact id (where research/O-licenses.md singles one out),
 * then URL hostname. A host not covered by O keeps an already-recorded license
 * (so an out-of-scope host is never silently relabelled); a news source without
 * one is all-rights-reserved; anything else is a named gap, unknown.
 */
export function licenseForSource(source) {
  if (!source || typeof source !== "object") return "unknown";
  if (typeof source.id === "string" && LICENSE_BY_ID.has(source.id)) {
    return LICENSE_BY_ID.get(source.id);
  }
  const mapped = hostLookup(hostOf(source.url));
  if (mapped) return mapped;
  if (typeof source.license === "string" && source.license.trim() !== "") return source.license;
  if (source.type === "news") return "all-rights-reserved";
  return "unknown";
}

/** The exact credit line O section 3.3 requires for this source, or null. */
export function creditForSource(source) {
  if (!source || typeof source !== "object") return null;
  const host = hostOf(source.url);
  if (!host) return null;
  const key = CREDIT_HOSTS.has(host) ? host : host.startsWith("www.") && CREDIT_HOSTS.has(host.slice(4)) ? host.slice(4) : null;
  if (!key) return null;
  const title = typeof source.title === "string" && source.title.trim() !== "" ? source.title.trim() : source.url;
  const retrieved = source.retrieved ?? "";
  switch (key) {
    case "opendata.cbs.nl":
      return `Bron: Centraal Bureau voor de Statistiek (CBS), ${title}, geraadpleegd ${retrieved}.`;
    case "www.cpb.nl":
      return `Bron: CPB, ${title}, geraadpleegd ${retrieved}.`;
    case "www.pbl.nl":
      return `Bron: PBL, ${title}, geraadpleegd ${retrieved}.`;
    case "www.eerstekamer.nl":
      return `Bron: Eerste Kamer der Staten-Generaal, ${source.url}, geraadpleegd ${retrieved}.`;
    case "www.defensie.nl":
      return `Bron: Ministerie van Defensie, ${source.url}, geraadpleegd ${retrieved}, gewijzigd weergegeven.`;
    case "nl.wikipedia.org":
      return `Bron: Wikipedia, ${source.url}, geraadpleegd ${retrieved}, CC BY-SA 4.0.`;
    default:
      return null;
  }
}

/** O section 7 gap wording, with the source's own endpoint. */
export function gapNoteForSource(source) {
  return `${GAP_NOTE_PREFIX} ${source.url}`;
}

function appendNote(source, text) {
  if (!text) return;
  const current = typeof source.notes === "string" ? source.notes.trim() : "";
  if (current.includes(text)) return;
  source.notes = current ? `${current} ${text}` : text;
}

/** Resolve every source to an SPDX license and append the required note. */
export function applyLicenses(sources) {
  for (const source of sources ?? []) {
    if (!source || typeof source !== "object") continue;
    const license = licenseForSource(source);
    source.license = license;
    if (source.archiveUrl === undefined) source.archiveUrl = null;
    if (license === "unknown") appendNote(source, gapNoteForSource(source));
    else appendNote(source, creditForSource(source));
  }
  return sources;
}

/** Ensure a news source carries the facts-only note in addition to its note. */
export function applyNewsFactsNote(source) {
  appendNote(source, NEWS_FACTS_ONLY_NOTE);
  return source;
}

/** License counts, keyed by the SPDX value. */
export function licenseDistribution(sources) {
  const counts = {};
  for (const license of SPDX_LICENSES) counts[license] = 0;
  for (const source of sources ?? []) {
    const license = source?.license ?? "unknown";
    counts[license] = (counts[license] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// archiveUrl provenance
// ---------------------------------------------------------------------------

/**
 * Read the FAIL and WARN tables of research/qa/link-check.md and return the
 * source URLs the link check could not verify. The report is the record of
 * link-check status, so it is the deterministic source for these targets.
 */
export function parseLinkCheckReport(markdown) {
  const warn = new Set();
  const fail = new Set();
  let section = null;
  for (const line of String(markdown ?? "").split("\n")) {
    const heading = line.match(/^#{2,3}\s+(FAIL|WARN)\b/);
    if (heading) {
      section = heading[1];
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) {
      section = null;
      continue;
    }
    if (!section) continue;
    const row = line.match(/^\|\s*[^|]*\|\s*[^|]*\|\s*(https?:\/\/[^|\s]+)\s*\|/);
    if (!row) continue;
    (section === "FAIL" ? fail : warn).add(row[1].trim());
  }
  return { warn, fail };
}

/** URLs to archive: the two blocked hosts plus every reported WARN/FAIL URL. */
export function archiveTargets(sources, { warn = new Set(), fail = new Set() } = {}) {
  const urls = new Set();
  for (const source of sources ?? []) {
    if (!source || typeof source.url !== "string") continue;
    const host = hostOf(source.url);
    if ((host && BLOCKED_HOSTS.includes(host)) || warn.has(source.url) || fail.has(source.url)) {
      urls.add(source.url);
    }
  }
  return [...urls].sort();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ask the Wayback availability API for a snapshot of every archive target, one
 * request at a time, with a browser user agent and a delay between requests.
 * A returned snapshot URL is used verbatim; when none exists the source keeps
 * archiveUrl: null and the attempt is returned as a named gap. Blocks (429 and
 * friends) are respected, never retried or evaded.
 */
export async function applyArchiveUrls({
  sources,
  reportPath = null,
  fetchImpl = fetch,
  userAgent = DEFAULT_USER_AGENT,
  throttleMs = WAYBACK_THROTTLE_MS,
  log = () => {},
} = {}) {
  let warn = new Set();
  let fail = new Set();
  if (reportPath && existsSync(reportPath)) {
    ({ warn, fail } = parseLinkCheckReport(await readFile(reportPath, "utf8")));
  }
  const targets = archiveTargets(sources, { warn, fail });
  const snapshots = new Map();
  const gaps = [];
  for (const [index, url] of targets.entries()) {
    if (index > 0 && throttleMs > 0) await sleep(throttleMs);
    const endpoint = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    let snapshotUrl = null;
    let error = null;
    try {
      const response = await fetchImpl(endpoint, {
        headers: { "User-Agent": userAgent, Accept: "application/json", "Accept-Language": "en" },
        redirect: "follow",
      });
      if (response.status === 200) {
        const body = await response.json();
        const closest = body?.archived_snapshots?.closest;
        if (closest && closest.available && typeof closest.url === "string") snapshotUrl = closest.url;
        else error = "geen snapshot beschikbaar";
      } else {
        error = `Wayback availability API HTTP ${response.status} (block gerespecteerd)`;
      }
    } catch (cause) {
      error = `Wayback availability API ${cause.message}`;
    }
    snapshots.set(url, snapshotUrl);
    if (!snapshotUrl) gaps.push({ url, endpoint, reason: error ?? "geen snapshot beschikbaar" });
    log(`  ${snapshotUrl ? "archief" : "geen   "} ${url}${snapshotUrl ? ` -> ${snapshotUrl}` : ` (${error})`}`);
  }

  let applied = 0;
  for (const source of sources ?? []) {
    if (!source || typeof source !== "object") continue;
    const snapshotUrl = snapshots.get(source.url);
    if (snapshotUrl) {
      source.archiveUrl = snapshotUrl;
      applied += 1;
    } else if (source.archiveUrl === undefined) {
      source.archiveUrl = null;
    }
  }
  return { targets: targets.length, applied, gaps, snapshots };
}

// ---------------------------------------------------------------------------
// ATTRIBUTION.md generator
// ---------------------------------------------------------------------------

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

export function buildAttribution(sources) {
  const records = (sources ?? []).filter((source) => source && typeof source.url === "string");
  const groups = new Map();
  for (const source of records) {
    const license = source.license ?? "unknown";
    if (!groups.has(license)) groups.set(license, []);
    groups.get(license).push(source);
  }
  const ordered = [
    ...SPDX_LICENSES.filter((license) => groups.has(license)),
    ...[...groups.keys()].filter((license) => !SPDX_LICENSES.includes(license)).sort(),
  ];

  const lines = [];
  lines.push("# Attribution");
  lines.push("");
  lines.push(
    "This file lists every source in `data/sources.json` with its URL, publisher, license, and the credit line that license requires. It is generated from `data/sources.json` by `pipelines/licenses.mjs` during `npm run merge`. Do not edit by hand.",
  );
  lines.push("");
  lines.push(
    "Licenses follow the per-source determination in `research/O-licenses.md`, which cites the terms page and retrieval date for each source. The dataset license is CC BY 4.0; see `LICENSE-DATA`. Facts are not copyrightable, and this dataset carries facts, codes, dates, and our own summaries, not source prose or images.",
  );
  lines.push("");
  for (const license of ordered) {
    const group = groups
      .get(license)
      .slice()
      .sort((a, b) => a.url.localeCompare(b.url) || String(a.id).localeCompare(String(b.id)));
    lines.push(`## ${license} (${group.length})`);
    lines.push("");
    lines.push("| url | publisher | license | required credit line |");
    lines.push("| --- | --- | --- | --- |");
    for (const source of group) {
      const credit = source.license === "unknown" ? gapNoteForSource(source) : creditForSource(source) ?? "-";
      lines.push(
        `| ${escapeCell(source.url)} | ${escapeCell(source.publisher)} | ${escapeCell(source.license)} | ${escapeCell(credit)} |`,
      );
    }
    lines.push("");
  }
  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

export async function writeAttribution(sources, outPath) {
  const dir = dirname(outPath);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(outPath, buildAttribution(sources), "utf8");
  return outPath;
}

// ---------------------------------------------------------------------------
// CLI: node pipelines/licenses.mjs [--data data] [--out ATTRIBUTION.md]
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const options = {
    dataDir: join(root, "data"),
    outPath: join(root, "ATTRIBUTION.md"),
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--data") options.dataDir = argv[(i += 1)];
    else if (argv[i] === "--out") options.outPath = argv[(i += 1)];
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sources = JSON.parse(await readFile(join(options.dataDir, "sources.json"), "utf8"));
  const outPath = await writeAttribution(sources, options.outPath);
  const counts = licenseDistribution(sources);
  console.log(`Wrote ${outPath} (${sources.length} source(s))`);
  for (const [license, count] of Object.entries(counts)) {
    if (count > 0) console.log(`  ${license.padEnd(22)} ${String(count).padStart(5)}`);
  }
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`licenses failed: ${error.message}`);
    process.exitCode = 1;
  });
}
