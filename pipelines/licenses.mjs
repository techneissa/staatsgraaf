#!/usr/bin/env bun
// Per-source license and provenance application for Staatsgraaf.
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
//
// A general document, not a per-URL table: the data licence and what reuse
// requires, one row per source family, one paragraph each for portraits, news
// and sources with no established licence. Counts come from data/sources.json
// and data/media.json; nothing in the output depends on the date or the run, so
// the same data always gives the same file. The per-source detail stays in
// data/sources.json and the per-photo detail in data/media.json.
// ---------------------------------------------------------------------------

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

const LICENSE_LABELS = Object.freeze({
  "CC0-1.0": "CC0 1.0",
  "CC-BY-4.0": "CC BY 4.0",
  "CC-BY-3.0-NL": "CC BY 3.0 NL",
  "CC-BY-SA-4.0": "CC BY-SA 4.0",
  "all-rights-reserved": "all rights reserved",
  unknown: "not established",
  // Per-file values the portrait pipeline records for Commons file pages (ADR 0014).
  "publiek-domein": "public domain",
  "European Parliament": "European Parliament legal notice",
  "Copyrighted free use": "Commons free use",
  Attribution: "CC BY (version not stated)",
});

const CC_VALUE = /^CC-(BY(?:-SA)?)-(\d\.\d)(?:-NL)?$/;

// The news-outlet records of DutchNews and NL Times carry the sentence "Koppen en deep links; geen overname
// van artikeltekst of beeld." as their licence: a links-only note, so all rights reserved.
const LINKS_ONLY = /deep links/i;

/** The licence of a source as recorded; an empty value or `unknown` is `unknown`; free text is `unknown`, unless it is a links-only note or sits on a news record. */
export function recordedLicense(source) {
  const value = typeof source?.license === "string" ? source.license.trim() : "";
  if (value === "" || value === "unknown") return "unknown";
  if (LICENSE_LABELS[value] || CC_VALUE.test(value)) return value;
  return source?.type === "news" || LINKS_ONLY.test(value) ? "all-rights-reserved" : "unknown";
}

function licenseLabel(license) {
  if (LICENSE_LABELS[license]) return LICENSE_LABELS[license];
  const cc = CC_VALUE.exec(license);
  return cc ? `CC ${cc[1]} ${cc[2]}` : license;
}

/**
 * The source families of the table, in reading order. A source belongs to the
 * first family that lists its hostname; news records and records with no
 * established licence are counted in their own paragraphs, and everything else
 * falls into "Other public bodies". `terms` is the page that states the licence
 * (research/O-licenses.md has the evidence and retrieval date for each).
 */
export const SOURCE_FAMILIES = Object.freeze([
  {
    name: "Tweede Kamer open data",
    hosts: ["gegevensmagazijn.tweedekamer.nl"],
    use: "Members, factions, committees, activities, official photos",
    terms: "https://data.overheid.nl/dataset/open-data-portaal-van-de-tweede-kamer-der-staten-generaal",
  },
  {
    name: "Wikidata",
    hosts: ["www.wikidata.org"],
    use: "Identifiers, birth dates, links to photos",
    terms: "https://www.wikidata.org/wiki/Wikidata:Licensing",
  },
  {
    name: "Rijksoverheid and other central government sites",
    hosts: [
      "www.rijksoverheid.nl", "regering.nl", "www.regering.nl", "government.nl", "www.government.nl",
      "www.koninklijkhuis.nl", "www.rijksdienstcn.com", "www.rijksfinancien.nl", "www.om.nl", "www.dji.nl",
      "www.inspectie-jenv.nl", "www.justitieleictorganisatie.nl", "www.algemenebestuursdienst.nl",
      "www.rekenkamer.nl", "www.wrr.nl", "www.raadopenbaarbestuur.nl", "www.onderwijsraad.nl",
      "www.gezondheidsraad.nl", "www.raadrvs.nl", "www.adviesraadinternationalevraagstukken.nl",
      "www.adviesraadmigratie.nl", "www.awti.nl", "www.scp.nl",
    ],
    use: "Offices, office holders, organisation structure",
    terms: "https://www.rijksoverheid.nl/service/copyright",
  },
  {
    name: "Laws and official gazettes (overheid.nl)",
    hosts: ["wetten.overheid.nl", "repository.overheid.nl", "www.officielebekendmakingen.nl", "zoek.officielebekendmakingen.nl", "staatsblad.overheid.nl"],
    use: "Legal bases, appointments, decrees",
    terms: "https://www.overheid.nl/help/officiele-bekendmakingen/bestanden-en-hergebruik",
  },
  {
    name: "Register van Overheidsorganisaties (KOOP)",
    hosts: ["organisaties.overheid.nl"],
    use: "Public bodies and their managers",
    terms: "https://data.overheid.nl/dataset/overheidsorganisaties-xml",
  },
  {
    name: "Eerste Kamer",
    hosts: ["www.eerstekamer.nl"],
    use: "Members, committees (facts only, no photos)",
    terms: "https://www.eerstekamer.nl/begrip/colofon",
    note: "custom reuse right: source URL, extraction date and annotation",
  },
  {
    name: "Rechtspraak",
    hosts: ["www.rechtspraak.nl", "uitspraken.rechtspraak.nl"],
    use: "Courts and judges (facts only, no photos)",
    terms: "https://www.rechtspraak.nl/colofon",
    note: "custom attribution right: name the source, imply no endorsement",
  },
  {
    name: "Kiesraad and verkiezingsuitslagen.nl",
    hosts: ["www.kiesraad.nl", "www.verkiezingsuitslagen.nl"],
    use: "Election results and dates",
    terms: "https://www.kiesraad.nl/service/copyright",
  },
  {
    name: "Centraal Bureau voor de Statistiek",
    hosts: ["opendata.cbs.nl"],
    use: "Statistics",
    terms: "https://www.cbs.nl/nl-nl/over-ons/website/copyright",
  },
  {
    name: "CPB",
    hosts: ["www.cpb.nl"],
    use: "Publications and figures",
    terms: "https://www.cpb.nl/copyright",
  },
  {
    name: "PBL",
    hosts: ["www.pbl.nl"],
    use: "Publications and figures",
    terms: "https://www.pbl.nl/over-het-pbl/copyright",
  },
  {
    name: "Wikipedia",
    hosts: ["nl.wikipedia.org", "en.wikipedia.org"],
    use: "Lists of mayors and dijkgraven (facts)",
    terms: "https://nl.wikipedia.org/wiki/Wikipedia:Auteursrechten",
  },
  {
    name: "Wikimedia Commons",
    hosts: ["commons.wikimedia.org"],
    use: "Photo file pages (the source of each portrait)",
    terms: "https://commons.wikimedia.org/wiki/Commons:Licensing",
    perFile: true,
  },
  {
    name: "Parlement.com and overheid.nl site pages",
    hosts: ["www.parlement.com", "www.overheid.nl", "overheid.nl"],
    use: "Cross-checks (facts only)",
    terms: "https://www.parlement.com/over-deze-site",
  },
]);

const OTHER_FAMILY = Object.freeze({
  name: "Other public bodies",
  use: "Offices and office holders from the body's own site",
  terms: "the site's own copyright page; see research/O-licenses.md",
});

function familyOf(host) {
  if (!host) return null;
  const bare = host.replace(/^www\./, "");
  return (
    SOURCE_FAMILIES.find((family) => family.hosts.some((candidate) => candidate === host || candidate.replace(/^www\./, "") === bare)) ?? null
  );
}

/** Count sources into families, news and unknown. Pure, so the test can feed it a fixture. */
export function summarizeSources(sources) {
  const records = (sources ?? []).filter((source) => source && typeof source.url === "string");
  const families = new Map([...SOURCE_FAMILIES, OTHER_FAMILY].map((family) => [family.name, new Map()]));
  const summary = { total: records.length, news: 0, unknown: 0, families };
  for (const source of records) {
    const license = recordedLicense(source);
    const family = familyOf(hostOf(source.url));
    if (license === "unknown") {
      summary.unknown += 1;
    } else if (source.type === "news" || (license === "all-rights-reserved" && family === null)) {
      summary.news += 1;
    } else {
      const counts = families.get((family ?? OTHER_FAMILY).name);
      counts.set(license, (counts.get(license) ?? 0) + 1);
    }
  }
  return summary;
}

/** Portrait counts per licence family from data/media.json: CC0, CC BY, CC BY-SA and the rest. */
export function summarizePortraits(media) {
  const portraits = (media ?? []).filter((item) => item && item.type === "portrait");
  const counts = { total: portraits.length, cc0: 0, by: 0, byAttributionOnly: 0, bySa: 0, publicDomain: 0, other: new Map() };
  for (const item of portraits) {
    const license = typeof item.license === "string" ? item.license.trim() : "";
    if (license === "CC0-1.0") counts.cc0 += 1;
    else if (/^CC-BY-\d\.\d$/.test(license)) counts.by += 1;
    else if (license === "Attribution") {
      counts.by += 1;
      counts.byAttributionOnly += 1;
    } else if (/^CC-BY-SA-\d\.\d$/.test(license)) counts.bySa += 1;
    else if (license === "publiek-domein") counts.publicDomain += 1;
    else counts.other.set(license || "no licence", (counts.other.get(license || "no licence") ?? 0) + 1);
  }
  return counts;
}

function portraitCountLine(counts) {
  const parts = [];
  if (counts.cc0) parts.push(`${counts.cc0} CC0 1.0`);
  if (counts.by) {
    const note = counts.byAttributionOnly ? ` (${counts.byAttributionOnly} marked only "Attribution" on Commons)` : "";
    parts.push(`${counts.by} CC BY${note}`);
  }
  if (counts.bySa) parts.push(`${counts.bySa} CC BY-SA`);
  if (counts.publicDomain) parts.push(`${counts.publicDomain} public domain`);
  for (const [license, count] of [...counts.other].sort((a, b) => a[0].localeCompare(b[0]))) parts.push(`${count} ${license}`);
  return parts.join(", ");
}

function number(value) {
  return new Intl.NumberFormat("en-GB").format(value);
}

function licenseCell(counts, family) {
  if (family.perFile) return "Per file (CC0, CC BY, CC BY-SA, public domain)";
  const order = [...counts.keys()].sort((a, b) => licenseLabel(a).localeCompare(licenseLabel(b)));
  const text = order.map((license) => licenseLabel(license)).join(", ");
  return family.note ? `${text} (recorded as such; ${family.note})` : text;
}

export function buildAttribution(sources, media = null) {
  const summary = summarizeSources(sources);
  const rows = [];
  let tabled = 0;
  for (const family of [...SOURCE_FAMILIES, OTHER_FAMILY]) {
    const counts = summary.families.get(family.name);
    const count = [...counts.values()].reduce((sum, value) => sum + value, 0);
    if (count === 0) continue;
    tabled += count;
    const terms = /^https?:/.test(family.terms) ? `<${family.terms}>` : family.terms;
    rows.push(`| ${escapeCell(family.name)} | ${escapeCell(family.use)} | ${escapeCell(licenseCell(counts, family))} | ${terms} | ${number(count)} |`);
  }

  const lines = [];
  lines.push("# Attribution");
  lines.push("");
  lines.push(
    "What you must credit when you reuse Staatsgraaf, and where each source's terms are. Generated from `data/sources.json` and `data/media.json` by `pipelines/licenses.mjs` (`bun run merge`). Do not edit by hand.",
  );
  lines.push("");
  lines.push("## The data licence");
  lines.push("");
  lines.push(
    "The dataset (the compiled data, the descriptions and the summaries) is licensed CC BY 4.0, see `LICENSE-DATA`. The code is CC BY-NC-SA 4.0, see `LICENSE`. Facts are not copyrightable: the data licence covers our selection, structure and own wording. On reuse you must:",
  );
  lines.push("");
  lines.push('1. credit the project as "Staatsgraaf" and link to this repository;');
  lines.push("2. keep the source, the retrieval date and the licence next to the facts they belong to, as `data/sources.json` records them; and");
  lines.push("3. state the licence and link to it, and keep the independence statement in `LICENSE-DATA`.");
  lines.push("");
  lines.push(
    "The code has its own licence, CC BY-NC-SA 4.0 (`CC-BY-NC-SA-4.0`), see `LICENSE`. To reuse the code, credit \"Staatsgraaf (https://github.com/techneissa/staatsgraaf), CC BY-NC-SA 4.0\", use it for noncommercial purposes only, and share your adaptations under the same licence. The data licence above does not change that.",
  );
  lines.push("");
  lines.push(
    "Photos are not under the dataset licence. Each one keeps the licence its author gave it, see Portraits below. The per-source licence decisions, with evidence and retrieval dates, are in `research/O-licenses.md`.",
  );
  lines.push("");
  lines.push("## Source families");
  lines.push("");
  lines.push(
    `Where facts come from, grouped by publisher and licence. ${number(summary.total)} sources are recorded in all: ${number(tabled)} in the table, ${number(summary.news)} news links and ${number(summary.unknown)} with no established licence (each below).`,
  );
  lines.push("");
  lines.push("| Publisher or website | What we use it for | Licence | Terms | Sources |");
  lines.push("| --- | --- | --- | --- | ---: |");
  lines.push(...rows);
  lines.push("");
  lines.push(
    "Where a licence asks for a credit (CC BY and CC BY-SA, the Eerste Kamer, Rechtspraak), the credit is the publisher's name plus the source URL and retrieval date from `data/sources.json`. Where a source is licensed CC0, no credit is owed, but the dataset still names it. Do not imply that any publisher endorses Staatsgraaf.",
  );
  lines.push("");
  lines.push("## Portraits");
  lines.push("");
  const portraits = media ? summarizePortraits(media) : null;
  const countLine = portraits && portraits.total > 0 ? ` ${number(portraits.total)} portraits are on record: ${portraitCountLine(portraits)}.` : "";
  lines.push(
    `Photos come from Wikimedia Commons and the Tweede Kamer open data, never from a source with no stated licence. The author, licence and source page of each photo are shown in the (i) next to the photo on its person page, and stored with the photo in \`data/media.json\` (credit, author, licence, source) and \`data/sources.json\` (source page, retrieval date).${countLine}`,
  );
  lines.push("");
  lines.push(
    "The site shows scaled-down and cropped copies, and says so in the credit. For CC BY-SA photos the copy is shared under the same licence. The decision and the licence texts it rests on are in `docs/adr/0025-photo-credits.md`.",
  );
  lines.push("");
  lines.push("## News");
  lines.push("");
  lines.push(
    `${number(summary.news)} sources are news articles or news-outlet pages. Their publishers keep all rights, so Staatsgraaf links to them and shows only the headline and the link, never the article text or its images. No credit is owed beyond naming the outlet, which every link does.`,
  );
  lines.push("");
  lines.push("## Sources with no established licence");
  lines.push("");
  lines.push(
    `${number(summary.unknown)} sources have no established licence (\`unknown\` or empty in \`data/sources.json\`). They supply facts only, never text or images. The full list, with each endpoint, is in \`data/sources.json\`.`,
  );
  lines.push("");
  lines.push("## Where the detail lives");
  lines.push("");
  lines.push("- `data/sources.json`: every source, with its URL, publisher, licence and retrieval date.");
  lines.push("- `data/media.json`: every photo, with its credit, author, licence and source.");
  lines.push("- `research/O-licenses.md`: the licence determination per publisher, with the terms page and the date it was read.");
  lines.push("");
  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

export async function writeAttribution(sources, outPath, media) {
  const dir = dirname(outPath);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  let portraits = media;
  if (portraits === undefined) {
    const mediaPath = join(dir, "data", "media.json");
    portraits = existsSync(mediaPath) ? JSON.parse(await readFile(mediaPath, "utf8")) : null;
  }
  await writeFile(outPath, buildAttribution(sources, portraits), "utf8");
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
  const media = JSON.parse(await readFile(join(options.dataDir, "media.json"), "utf8"));
  const outPath = await writeAttribution(sources, options.outPath, media);
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
