#!/usr/bin/env bun
// Loopbaan (career history) for Staatsgraaf: previous and current jobs, offices,
// side jobs and education per person, with years.
//
// Sources, in order of preference:
//  (a) the Gegevensmagazijn of the Tweede Kamer (OData v4, CC0 1.0 according to
//      https://opendata.tweedekamer.nl/disclaimer): PersoonLoopbaan,
//      PersoonNevenfunctie and PersoonOnderwijs of every person that
//      pipelines/parliament-activity.mjs matched to a TK Persoon on full name
//      plus birth date (research/raw/parliament-activity/matches.json). The
//      match is reused; nothing is matched again on name.
//  (b) Wikidata (CC0): P39 (position held) and P108 (employer) of the person's
//      own Wikidata entity, only claims with a start (P580) or end (P582) date,
//      labels in Dutch.
//
// Raw answers are cached under research/raw/careers/ so a run without network
// (`--offline`) writes the same file. `--refresh` fetches everything again.
//
// No dependencies. Node ESM only.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const USER_AGENT =
  "StaatsgraafBot/0.1 (https://github.com/techneissa/staatsgraaf; loopbaan uit het Gegevensmagazijn van de Tweede Kamer en Wikidata)";
export const TK_ODATA = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0";
export const TK_LICENSE_PAGE = "https://opendata.tweedekamer.nl/disclaimer";
export const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
export const THROTTLE_MS = 250;
export const MAX_PER_PERSON = 25;
export const WIKIDATA_CHUNK = 50;
export const KINDS = Object.freeze(["politiek", "loopbaan", "nevenfunctie", "opleiding", "beroep"]);
export const WIKIDATA_CACHE_VERSION = 2;
export const WIKIDATA_PROPS = Object.freeze(["P39", "P108", "P106"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- dates ----------

/** A date as the source gives it, normalised to YYYY, YYYY-MM or YYYY-MM-DD; null when there is none or it cannot be read. */
export function normalizeDate(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === "") return null;
  let m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?:T.*)?$/.exec(text);
  if (m) return validPartial(m[1], m[2], m[3]);
  m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(text);
  if (m) return validPartial(m[3], m[2].padStart(2, "0"), m[1].padStart(2, "0"));
  m = /^(\d{1,2})-(\d{4})$/.exec(text);
  if (m) return validPartial(m[2], m[1].padStart(2, "0"));
  return null;
}

function validPartial(y, m, d) {
  if (m === undefined) return y;
  const month = Number(m);
  if (month < 1 || month > 12) return y;
  if (d === undefined) return `${y}-${m}`;
  const dt = new Date(`${y}-${m}-${d}T00:00:00Z`);
  if (Number.isNaN(dt.getTime()) || dt.getUTCDate() !== Number(d)) return `${y}-${m}`;
  return `${y}-${m}-${d}`;
}

/** True when a partial date is a valid YYYY, YYYY-MM or YYYY-MM-DD. */
export function isPartialDate(value) {
  return typeof value === "string" && normalizeDate(value) === value;
}

/** Compare two partial dates on their common precision: -1, 0 or 1. */
export function comparePartial(a, b) {
  const n = Math.min(a.length, b.length);
  const x = a.slice(0, n);
  const y = b.slice(0, n);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** A Wikidata time value with its precision (9 year, 10 month, 11 day) as a partial date. */
export function wikidataDate(time, precision) {
  if (!time) return null;
  const m = /^\+?(\d{4})-(\d{2})-(\d{2})/.exec(String(time));
  if (!m) return null;
  const p = Number(precision);
  if (p === 9) return m[1];
  if (p === 10) return validPartial(m[1], m[2]);
  if (p >= 11) return validPartial(m[1], m[2], m[3]);
  return null;
}

const clean = (value) => {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text === "" ? null : text;
};

// ---------- classification ----------

// Titles that name an elected or appointed public office. Everything else in
// PersoonLoopbaan is employment.
const POLITICAL = /\b(minister|staatssecretaris|kamerlid|tweede kamer|eerste kamer|europees parlement|europarlementari[eë]r|wethouder|burgemeester|gemeenteraad|raadslid|gemeenteraadslid|statenlid|provinciale staten|gedeputeerde|commissaris van de koning|dijkgraaf|heemraad|hoogheemraad|fractievoorzitter|fractieleider|gezaghebber|premier|minister-president|lid van de raad|senator)\b/i;

export function isPoliticalTitle(...texts) {
  return texts.some((text) => typeof text === "string" && POLITICAL.test(text));
}

// ---------- organisations ----------

export function organizationIndex(organizations) {
  const index = new Map();
  const add = (name, id) => {
    const key = clean(name);
    if (!key) return;
    if (!index.has(key)) index.set(key, new Set());
    index.get(key).add(id);
  };
  for (const org of organizations) {
    add(org.name, org.id);
    for (const alias of org.aliases ?? []) add(alias, org.id);
  }
  return index;
}

/** The organisation id when the name resolves exactly (name or alias) to one organisation; otherwise null. */
export function resolveOrganization(name, index) {
  const key = clean(name);
  if (!key) return null;
  const ids = index.get(key);
  return ids && ids.size === 1 ? [...ids][0] : null;
}

// ---------- TK rows ----------

export function tkPersoonUrl(tkId) {
  return `${TK_ODATA}/Persoon(${tkId})?$expand=PersoonLoopbaan,PersoonNevenfunctie,PersoonOnderwijs`;
}

/**
 * Entries from one TK Persoon with its three expansions. `today` decides
 * whether an IsActief nevenfunctie with an end date in the past is current.
 */
export function tkEntries(persoon, today, gaps = []) {
  const out = [];
  const live = (rows) => (rows ?? []).filter((row) => row && row.Verwijderd !== true);
  for (const row of live(persoon?.PersoonLoopbaan)) {
    const title = clean(row.Functie) ?? clean(row.OmschrijvingNl);
    if (!title) continue;
    const organization = clean(row.Werkgever);
    out.push({
      origin: "tk",
      rank: 0,
      rowId: row.Id,
      title,
      organization,
      start: normalizeDate(row.Van),
      end: normalizeDate(row.TotEnMet),
      rawStart: row.Van ?? null,
      rawEnd: row.TotEnMet ?? null,
      current: false,
      kind: isPoliticalTitle(title, organization) ? "politiek" : "loopbaan",
    });
  }
  for (const row of live(persoon?.PersoonNevenfunctie)) {
    const title = clean(row.Omschrijving);
    if (!title) continue;
    const end = normalizeDate(row.PeriodeTotEnMet);
    const endPassed = end !== null && comparePartial(end, today) < 0;
    if (row.IsActief === true && endPassed) gaps.push(`nevenfunctie ${row.Id} staat op IsActief maar heeft einddatum \`${row.PeriodeTotEnMet}\`; niet als lopend opgenomen`);
    out.push({
      origin: "tk",
      rank: 1,
      rowId: row.Id,
      title,
      organization: null,
      start: normalizeDate(row.PeriodeVan),
      end,
      rawStart: row.PeriodeVan ?? null,
      rawEnd: row.PeriodeTotEnMet ?? null,
      current: row.IsActief === true && !endPassed,
      kind: "nevenfunctie",
    });
  }
  for (const row of live(persoon?.PersoonOnderwijs)) {
    const title = clean(row.OpleidingNl) ?? clean(row.OpleidingEn);
    if (!title) continue;
    out.push({
      origin: "tk",
      rank: 2,
      rowId: row.Id,
      title,
      organization: clean(row.Instelling),
      start: normalizeDate(row.Van),
      end: normalizeDate(row.TotEnMet),
      rawStart: row.Van ?? null,
      rawEnd: row.TotEnMet ?? null,
      current: false,
      kind: "opleiding",
    });
  }
  return out;
}

// ---------- Wikidata rows ----------

const ORG_PREFERENCE = ["P642", "P2389", "P361"];

const snakTime = (snak) => (snak?.snaktype === "value" && snak.datavalue?.value?.time ? snak.datavalue.value : null);
const snakItem = (snak) => (snak?.snaktype === "value" && snak.datavalue?.value?.id ? snak.datavalue.value.id : null);

/**
 * The P39 and P108 statements of one Wikidata entity (wbgetentities, props
 * claims), deprecated rank skipped, as plain rows with the Q ids they need
 * labels for and the number of references each statement carries.
 */
export function rawStatements(entity) {
  const rows = [];
  for (const prop of WIKIDATA_PROPS) {
    for (const claim of entity?.claims?.[prop] ?? []) {
      if (claim.rank === "deprecated") continue;
      const value = snakItem(claim.mainsnak);
      if (!value) continue;
      const start = snakTime(claim.qualifiers?.P580?.[0]);
      const end = snakTime(claim.qualifiers?.P582?.[0]);
      rows.push({
        statement: claim.id,
        prop,
        value,
        start: start?.time ?? null,
        startPrecision: start?.precision ?? null,
        end: end?.time ?? null,
        endPrecision: end?.precision ?? null,
        of: snakItem(claim.qualifiers?.P642?.[0]),
        roles: [...(claim.qualifiers?.P2868 ?? []), ...(claim.qualifiers?.P794 ?? [])].map(snakItem).filter(Boolean),
        references: (claim.references ?? []).length,
      });
    }
  }
  return rows;
}

/** Label and the organisation properties (P2389 directs, P361 part of) of a referenced item. */
export function itemFacts(entity) {
  return {
    label: entity?.labels?.nl?.value ?? null,
    P2389: (entity?.claims?.P2389 ?? []).filter((c) => c.rank !== "deprecated").map((c) => snakItem(c.mainsnak)).filter(Boolean),
    P361: (entity?.claims?.P361 ?? []).filter((c) => c.rank !== "deprecated").map((c) => snakItem(c.mainsnak)).filter(Boolean),
  };
}

/** Rows plus item facts to the statement shape wikidataEntries reads. */
export function resolveStatements(rows, items) {
  const label = (q) => (q ? items[q]?.label ?? null : null);
  return (rows ?? []).map((row) => {
    const orgs = {};
    if (row.of) orgs.P642 = { id: row.of, label: label(row.of) };
    const directs = items[row.value]?.P2389?.[0];
    if (directs) orgs.P2389 = { id: directs, label: label(directs) };
    const partOf = items[row.value]?.P361?.[0];
    if (partOf) orgs.P361 = { id: partOf, label: label(partOf) };
    return {
      statement: row.statement,
      prop: row.prop,
      value: row.value,
      valueLabel: label(row.value),
      start: row.start,
      startPrecision: row.startPrecision,
      end: row.end,
      endPrecision: row.endPrecision,
      orgs,
      roles: Object.fromEntries((row.roles ?? []).map((q) => [q, label(q)])),
      references: row.references ?? 0,
    };
  });
}

/** A Dutch label, or null when Wikidata has none (the label service then returns the Q id). */
export function dutchLabel(label) {
  if (typeof label !== "string" || label.trim() === "" || /^Q\d+$/.test(label.trim())) return null;
  return label.trim();
}

/** Entries from the grouped Wikidata statements of one person. */
/**
 * Entries from the resolved Wikidata statements of one person. A statement
 * needs at least one reference, except P39 when `confirmsOffice(label,
 * organization)` says the dataset already has that office from an official
 * source. Undated statements are kept with start and end null.
 */
export function wikidataEntries(statements, counters = { noLabel: 0, undated: 0, unreferenced: 0 }, confirmsOffice = () => false) {
  const out = [];
  for (const row of statements ?? []) {
    const start = wikidataDate(row.start, row.startPrecision);
    const end = wikidataDate(row.end, row.endPrecision);
    const valueLabel = dutchLabel(row.valueLabel);
    if (!valueLabel) {
      counters.noLabel = (counters.noLabel ?? 0) + 1;
      continue;
    }
    let entry = null;
    if (row.prop === "P39") {
      const via = ORG_PREFERENCE.find((key) => row.orgs?.[key] && dutchLabel(row.orgs[key].label));
      entry = { rank: 3, title: valueLabel, organization: via ? dutchLabel(row.orgs[via].label) : null, kind: "politiek" };
    } else if (row.prop === "P108") {
      const role = Object.values(row.roles ?? {}).map(dutchLabel).find(Boolean) ?? null;
      entry = { rank: 4, title: role ?? valueLabel, organization: valueLabel, kind: "loopbaan" };
    } else if (row.prop === "P106") {
      // An occupation stands alone: Wikidata does not tie it to an employer.
      entry = { rank: 5, title: valueLabel, organization: null, kind: "beroep" };
    }
    if (!entry) continue;
    if (!(row.references > 0) && !(row.prop === "P39" && confirmsOffice(entry.title, entry.organization))) {
      counters.unreferenced = (counters.unreferenced ?? 0) + 1;
      continue;
    }
    if (start === null && end === null) counters.undated = (counters.undated ?? 0) + 1;
    out.push({ origin: "wikidata", value: row.value, start, end, current: false, ...entry });
  }
  return mergeConsecutiveTerms(out);
}

/**
 * Per person, a test whether the dataset confirms an office from an official
 * (non-Wikidata) source: a tenure or membership whose position title or
 * organisation name shares a keyword with the Wikidata office.
 */
export function officialOffices({ tenures = [], memberships = [], positions = [], organizations = [] }) {
  const posById = new Map(positions.map((p) => [p.id, p]));
  const orgById = new Map(organizations.map((o) => [o.id, o]));
  const official = (ref) => typeof ref?.source === "string" && !/^src:(wikidata|wikipedia)/.test(ref.source);
  const byPerson = new Map();
  const add = (person, words) => {
    if (words.size === 0) return;
    if (!byPerson.has(person)) byPerson.set(person, []);
    byPerson.get(person).push(words);
  };
  for (const t of tenures) {
    if (!official(t.source)) continue;
    const pos = posById.get(t.position);
    add(t.person, keywords(pos?.title, pos?.name, orgById.get(pos?.organization)?.name));
  }
  for (const m of memberships) {
    if (!official(m.source)) continue;
    add(m.person, keywords(orgById.get(m.organization)?.name));
  }
  return (personId) => (title, organization) => {
    const want = keywords(title, organization);
    return (byPerson.get(personId) ?? []).some((words) => [...want].some((w) => words.has(w)));
  };
}

function dayOf(date) {
  if (!date || date.length !== 10) return null;
  return Date.parse(`${date}T00:00:00Z`);
}

/**
 * Consecutive Wikidata statements for the same position and organisation (one
 * per parliamentary term) become one entry when the next starts within seven
 * days of the previous end, or in the same year for year-precision dates.
 */
export function mergeConsecutiveTerms(entries) {
  const sorted = [...entries].sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  const out = [];
  for (const entry of sorted) {
    const prev = out.findLast(
      (e) => e.value === entry.value && e.title === entry.title && e.organization === entry.organization && e.kind === entry.kind,
    );
    if (prev && prev.end && entry.start) {
      const a = dayOf(prev.end);
      const b = dayOf(entry.start);
      const adjacent = a !== null && b !== null ? b - a >= 0 && b - a <= 7 * 86400000 : prev.end.slice(0, 4) === entry.start.slice(0, 4);
      if (adjacent) {
        prev.end = entry.end;
        continue;
      }
    }
    out.push({ ...entry });
  }
  return out;
}

// ---------- dedupe, sort, cap ----------

const STOP = new Set(["van", "de", "het", "der", "den", "en", "voor", "lid", "gemeente", "provincie", "bij", "the", "and", "of"]);
export function keywords(...texts) {
  const words = new Set();
  for (const text of texts) {
    for (const word of String(text ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/)) {
      if (word.length >= 5 && !STOP.has(word)) words.add(word);
    }
  }
  return words;
}

/** True when two entries describe the same office: same start year (or both open and same end year) and a shared keyword. */
export function sameOffice(a, b) {
  const sameStart = a.start && b.start ? a.start.slice(0, 4) === b.start.slice(0, 4) : !a.start && !b.start && a.end && b.end && a.end.slice(0, 4) === b.end.slice(0, 4);
  if (!sameStart) return false;
  const ka = keywords(a.title, a.organization);
  for (const word of keywords(b.title, b.organization)) if (ka.has(word)) return true;
  return false;
}

/** Drop Wikidata entries that repeat a TK entry, and exact repeats within one source. */
export function dedupe(entries) {
  const kept = [];
  const ordered = [...entries].sort((a, b) => a.rank - b.rank);
  let dropped = 0;
  for (const entry of ordered) {
    const exact = kept.some((k) => k.title === entry.title && k.organization === entry.organization && k.start === entry.start && k.end === entry.end);
    const repeat = entry.origin === "wikidata" && (
      kept.some((k) => k.origin === "tk" && k.kind !== "opleiding" && sameOffice(k, entry)) ||
      // An undated claim adds nothing when the same title and organisation is already there.
      (!entry.start && !entry.end && kept.some((k) => k.title.toLowerCase() === entry.title.toLowerCase() && (k.organization ?? "") === (entry.organization ?? "")))
    );
    if (exact || repeat) {
      dropped += 1;
      continue;
    }
    kept.push(entry);
  }
  return { entries: kept, dropped };
}

/** Current first, then by start, newest first; entries without a start last, by end. */
export function sortEntries(entries) {
  const when = (e) => e.start ?? "";
  const undated = (e) => !e.start && !e.end;
  return [...entries].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    if (undated(a) !== undated(b)) return undated(a) ? 1 : -1;
    const c = when(b).localeCompare(when(a));
    if (c !== 0) return c;
    const d = (b.end ?? "").localeCompare(a.end ?? "");
    if (d !== 0) return d;
    return a.rank - b.rank || a.title.localeCompare(b.title);
  });
}

// ---------- fetch ----------

async function fetchJson(url, { fetchImpl, userAgent, throttleMs, init = {} }) {
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await sleep(throttleMs);
    try {
      const response = await fetchImpl(url, { ...init, headers: { "User-Agent": userAgent, Accept: "application/json", ...(init.headers ?? {}) } });
      if (response.ok) return await response.json();
      lastError = new Error(`HTTP ${response.status} voor ${url.slice(0, 120)}`);
      if (response.status < 500 && response.status !== 429) throw lastError;
    } catch (error) {
      lastError = error;
      if (error === lastError && /HTTP 4/.test(error.message) && !/HTTP 429/.test(error.message)) throw error;
    }
    await sleep(throttleMs * 4 * attempt);
  }
  throw lastError ?? new Error(`geen antwoord voor ${url}`);
}

async function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(await readFile(path, "utf8"));
}

export function formatDutchDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}

const GROUP_LABELS = Object.freeze({
  bewindspersoon: "Bewindspersonen",
  "tweede-kamerlid": "Tweede Kamerleden",
  "eerste-kamerlid": "Eerste Kamerleden",
  overig: "Overige personen",
});

// ---------- run ----------

export async function runCareers(options = {}) {
  const root = options.root ?? REPO_ROOT;
  const dataDir = options.dataDir ?? join(root, "data");
  const cacheDir = options.cacheDir ?? join(root, "research", "raw", "careers");
  const matchesPath = options.matchesPath ?? join(root, "research", "raw", "parliament-activity", "matches.json");
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const offline = Boolean(options.offline);
  const refresh = Boolean(options.refresh) && !offline;
  const maxPerPerson = options.maxPerPerson ?? MAX_PER_PERSON;
  const fetchOptions = {
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
    userAgent: options.userAgent ?? USER_AGENT,
    throttleMs: options.throttleMs ?? THROTTLE_MS,
  };
  const log = options.log ?? ((line) => console.log(line));

  const people = await readJson(join(dataDir, "people.json"), []);
  const organizations = await readJson(join(dataDir, "organizations.json"), []);
  const sources = await readJson(join(dataDir, "sources.json"), []);
  const matches = (await readJson(matchesPath, { people: {} })).people ?? {};
  const orgIndex = organizationIndex(organizations);
  const confirmsFor = officialOffices({
    tenures: await readJson(join(dataDir, "tenures.json"), []),
    memberships: await readJson(join(dataDir, "memberships.json"), []),
    positions: await readJson(join(dataDir, "positions.json"), []),
    organizations,
  });
  const gaps = [];

  // (a) TK
  const tkDir = join(cacheDir, "tk");
  await mkdir(tkDir, { recursive: true });
  const tkByPerson = new Map();
  let tkFetched = 0;
  for (const person of people) {
    const tkId = matches[person.id]?.tkPersoon;
    if (!tkId) continue;
    const path = join(tkDir, `${tkId}.json`);
    let cached = await readJson(path, null);
    if (!cached || refresh) {
      if (offline) {
        gaps.push(`\`${person.id}\`: geen ruwe TK-loopbaan in de cache en de run was offline.`);
        continue;
      }
      const url = tkPersoonUrl(tkId);
      try {
        const body = await fetchJson(url, fetchOptions);
        cached = {
          retrieved: today,
          license: TK_LICENSE_PAGE,
          person: person.id,
          tkPersoon: tkId,
          url,
          value: {
            Id: body.Id,
            PersoonLoopbaan: body.PersoonLoopbaan ?? [],
            PersoonNevenfunctie: body.PersoonNevenfunctie ?? [],
            PersoonOnderwijs: body.PersoonOnderwijs ?? [],
          },
        };
        await writeFile(path, `${JSON.stringify(cached, null, 1)}\n`, "utf8");
        tkFetched += 1;
      } catch (error) {
        gaps.push(`\`${person.id}\`: TK-loopbaan niet op te halen (${error.message}).`);
        continue;
      }
    }
    tkByPerson.set(person.id, cached);
  }
  log(`TK: ${tkByPerson.size} personen (${tkFetched} opgehaald)`);

  // (b) Wikidata
  const wdPath = join(cacheDir, "wikidata.json");
  let wdCache = (await readJson(wdPath, null)) ?? null;
  if (!wdCache) wdCache = { version: WIKIDATA_CACHE_VERSION, retrieved: today, license: "CC0-1.0", endpoint: WIKIDATA_API, persons: {}, items: {} };
  wdCache.items ??= {};
  // Version 1 kept only dated P39 and P108 without references; those person claims are fetched again, labels stay.
  if ((wdCache.version ?? 1) < WIKIDATA_CACHE_VERSION && !offline) wdCache.persons = {};
  wdCache.persons ??= {};
  const qids = [...new Set(people.map((p) => p.wikidata).filter(Boolean))].sort();
  const needed = qids.filter((q) => refresh || !(q in wdCache.persons));
  const getEntities = async (ids, props) => {
    const url = `${WIKIDATA_API}?action=wbgetentities&format=json&props=${props}&languages=nl&ids=${ids.join("|")}`;
    const body = await fetchJson(url, fetchOptions);
    return body?.entities ?? {};
  };
  if (needed.length > 0 && !offline) {
    for (let i = 0; i < needed.length; i += WIKIDATA_CHUNK) {
      const chunk = needed.slice(i, i + WIKIDATA_CHUNK);
      try {
        const entities = await getEntities(chunk, "claims");
        for (const q of chunk) wdCache.persons[q] = rawStatements(entities[q]);
        wdCache.retrieved = today;
        wdCache.version = WIKIDATA_CACHE_VERSION;
      } catch (error) {
        gaps.push(`Wikidata-claims voor ${chunk.length} personen niet op te halen (${error.message}).`);
      }
    }
  } else if (needed.length > 0) {
    gaps.push(`${needed.length} Wikidata-entiteiten niet in de cache en de run was offline.`);
  }
  // Labels and organisation properties of every referenced item, then labels of the organisations they name.
  for (const round of [0, 1]) {
    const refs = new Set();
    for (const q of qids) {
      for (const row of wdCache.persons[q] ?? []) {
        if (round === 0) [row.value, row.of, ...(row.roles ?? [])].filter(Boolean).forEach((x) => refs.add(x));
        else [...(wdCache.items[row.value]?.P2389 ?? []).slice(0, 1), ...(wdCache.items[row.value]?.P361 ?? []).slice(0, 1)].forEach((x) => refs.add(x));
      }
    }
    const missing = [...refs].filter((q) => (refresh && round === 0) || !wdCache.items[q]).sort();
    if (missing.length > 0 && offline) {
      gaps.push(`${missing.length} Wikidata-items zonder label in de cache en de run was offline.`);
      continue;
    }
    for (let i = 0; i < missing.length; i += WIKIDATA_CHUNK) {
      const chunk = missing.slice(i, i + WIKIDATA_CHUNK);
      try {
        const entities = await getEntities(chunk, round === 0 ? "labels|claims" : "labels");
        for (const q of chunk) wdCache.items[q] = itemFacts(entities[q]);
      } catch (error) {
        gaps.push(`Wikidata-labels voor ${chunk.length} items niet op te halen (${error.message}).`);
      }
    }
  }
  if (!offline) await writeFile(wdPath, `${JSON.stringify(wdCache, null, 1)}\n`, "utf8");

  // Build entries per person.
  const byUrl = new Map(sources.map((s) => [s.url, s]));
  const byId = new Map(sources.map((s) => [s.id, s]));
  const newSources = [];
  const records = [];
  const stats = { tkEntries: 0, wdEntries: 0, deduped: 0, capped: 0, droppedBadRange: 0, wdNoLabel: 0, wdUnreferenced: 0, tkBadDate: 0, withOrgId: 0 };
  const perPerson = new Map();
  for (const person of people) {
    const entries = [];
    const personGaps = [];
    const tk = tkByPerson.get(person.id);
    let tkSourceId = null;
    if (tk) {
      tkSourceId = `src:tk-loopbaan-${person.slug}`;
      const tkEntriesList = tkEntries(tk.value, today, personGaps);
      for (const e of tkEntriesList) {
        if ((e.rawStart && !e.start) || (e.rawEnd && !e.end)) stats.tkBadDate += 1;
        e.sourceRef = { source: tkSourceId, retrieved: tk.retrieved, confidence: "high" };
      }
      entries.push(...tkEntriesList);
      if (tkEntriesList.length > 0) {
        newSources.push({
          id: tkSourceId,
          url: tk.url,
          title: `Loopbaan, nevenfuncties en opleiding van TK-Persoon ${tk.tkPersoon}`,
          publisher: "Tweede Kamer der Staten-Generaal",
          type: "api",
          published: null,
          retrieved: tk.retrieved,
          license: "CC0-1.0",
          archiveUrl: null,
          notes: `Gegevensmagazijn van de Tweede Kamer (OData v4), PersoonLoopbaan, PersoonNevenfunctie en PersoonOnderwijs van de TK-Persoon die pipelines/parliament-activity.mjs op volledige naam plus geboortedatum aan ${person.id} koppelde (research/raw/parliament-activity/matches.json). Licentie: CC0 1.0 volgens ${TK_LICENSE_PAGE}, gecontroleerd op ${formatDutchDate(today)}.`,
        });
      }
    }
    if (person.wikidata && wdCache.persons[person.wikidata]) {
      const counters = { noLabel: 0, undated: 0, unreferenced: 0 };
      const wd = wikidataEntries(resolveStatements(wdCache.persons[person.wikidata], wdCache.items), counters, confirmsFor(person.id));
      stats.wdNoLabel += counters.noLabel;
      stats.wdUnreferenced += counters.unreferenced;
      if (wd.length > 0) {
        const url = `https://www.wikidata.org/wiki/${person.wikidata}`;
        let source = byUrl.get(url);
        if (!source) {
          const id = byId.has(`src:wikidata-${person.slug}`) ? `src:wikidata-loopbaan-${person.slug}` : `src:wikidata-${person.slug}`;
          source = { id, url, title: person.name, publisher: "Wikidata", type: "page", published: null, retrieved: wdCache.retrieved, license: "CC0-1.0", archiveUrl: null, notes: `Wikidata-entiteit ${person.wikidata} voor ${person.name}; P39 en P108 gebruikt voor de loopbaan.` };
          newSources.push(source);
          byUrl.set(url, source);
        }
        for (const e of wd) e.sourceRef = { source: source.id, retrieved: wdCache.retrieved, confidence: "medium" };
        entries.push(...wd);
      }
    }
    if (entries.length === 0) continue;
    // An end before the start cannot be shown as a period; drop the entry and name it.
    const valid = entries.filter((e) => {
      if (e.start && e.end && comparePartial(e.end, e.start) < 0) {
        stats.droppedBadRange += 1;
        personGaps.push(`"${e.title}" (${e.origin}) heeft einde \`${e.end}\` voor begin \`${e.start}\`; weggelaten`);
        return false;
      }
      return true;
    });
    const { entries: unique, dropped } = dedupe(valid);
    stats.deduped += dropped;
    const sorted = sortEntries(unique);
    if (sorted.length > maxPerPerson) stats.capped += sorted.length - maxPerPerson;
    const shown = sorted.slice(0, maxPerPerson);
    shown.forEach((e, i) => {
      if (e.origin === "tk") stats.tkEntries += 1;
      else stats.wdEntries += 1;
      const organizationId = resolveOrganization(e.organization, orgIndex);
      if (organizationId) stats.withOrgId += 1;
      records.push({
        id: `career:${person.slug}-${i + 1}`,
        person: person.id,
        title: e.title,
        organization: e.organization,
        organizationId,
        start: e.start,
        end: e.end,
        current: e.current,
        kind: e.kind,
        source: e.sourceRef,
      });
    });
    perPerson.set(person.id, { count: shown.length, tk: shown.some((e) => e.origin === "tk"), wd: shown.some((e) => e.origin === "wikidata"), gaps: personGaps });
  }

  // Sources: replace own records, never remove others.
  const own = new Set(newSources.map((s) => s.id));
  const mergedSources = [...sources.filter((s) => !own.has(s.id)), ...newSources].sort((a, b) => a.id.localeCompare(b.id));
  const finalSources = mergedSources;

  if (!options.dryRun) {
    await writeFile(join(dataDir, "careers.json"), serializeCareers(records), "utf8");
    await writeFile(join(dataDir, "sources.json"), `${JSON.stringify(finalSources, null, 2)}\n`, "utf8");
  }

  // Report.
  const groups = {};
  for (const key of Object.keys(GROUP_LABELS)) groups[key] = { people: 0, matched: 0, wikidata: 0, withCareer: 0, fromTk: 0, fromWd: 0, entries: 0 };
  const noCareer = [];
  for (const person of people) {
    const group = GROUP_LABELS[matches[person.id]?.group] ? matches[person.id].group : "overig";
    const row = groups[group];
    row.people += 1;
    if (matches[person.id]?.tkPersoon) row.matched += 1;
    if (person.wikidata) row.wikidata += 1;
    const p = perPerson.get(person.id);
    if (p) {
      row.withCareer += 1;
      row.entries += p.count;
      if (p.tk) row.fromTk += 1;
      if (p.wd) row.fromWd += 1;
    } else if (group !== "overig") {
      noCareer.push({ id: person.id, name: person.name, group, tk: matches[person.id]?.tkPersoon ?? null, wikidata: person.wikidata ?? null, reason: matches[person.id]?.reason ?? null });
    }
  }
  const kinds = Object.fromEntries(KINDS.map((k) => [k, records.filter((r) => r.kind === k).length]));
  const allPersonGaps = [...perPerson.entries()].flatMap(([id, p]) => p.gaps.map((g) => ({ id, g })));
  const activeEnded = allPersonGaps.filter((x) => x.g.startsWith("nevenfunctie "));
  const personGaps = allPersonGaps.filter((x) => !x.g.startsWith("nevenfunctie ")).map((x) => `\`${x.id}\`: ${x.g}`);
  if (activeEnded.length > 0) {
    const ids = [...new Set(activeEnded.map((x) => x.id))];
    personGaps.unshift(`${activeEnded.length} nevenfuncties bij ${ids.length} personen staan in het Gegevensmagazijn op \`IsActief\` maar hebben een einddatum voor ${formatDutchDate(today)}; ze staan met die einddatum en \`current: false\` in het bestand. Voorbeeld: ${activeEnded[0].g.replace(/;.*$/, "")} (\`${activeEnded[0].id}\`).`);
  }
  const report = renderReport({ today, groups, kinds, stats, records, noCareer, gaps: [...gaps, ...personGaps], maxPerPerson });
  if (!options.dryRun && options.reportPath !== null) {
    const reportPath = options.reportPath ?? join(root, "research", "qa", `careers-${formatDutchDate(today)}.md`);
    await writeFile(reportPath, report, "utf8");
  }
  log(`careers: ${records.length} entries for ${perPerson.size} people`);
  return { records, sources: finalSources, stats, groups, kinds, report };
}

/** One record per line: a small file that still diffs per entry. */
export function serializeCareers(records) {
  if (records.length === 0) return "[]\n";
  return `[\n${records.map((r) => `  ${JSON.stringify(r)}`).join(",\n")}\n]\n`;
}

export function renderReport({ today, groups, kinds, stats, records, noCareer, gaps, maxPerPerson }) {
  const lines = [];
  lines.push(`# Loopbaan per persoon, ${formatDutchDate(today)}`);
  lines.push("");
  lines.push("Build area K. Pipeline: `pipelines/careers.mjs`. Uitvoer: `data/careers.json`, bronrecords `src:tk-loopbaan-<slug>` in `data/sources.json`, ruwe antwoorden onder `research/raw/careers/`.");
  lines.push("");
  lines.push("## Bronnen en regels");
  lines.push("");
  lines.push(`- Voorkeursbron: het Gegevensmagazijn van de Tweede Kamer (${TK_ODATA}/), entiteiten \`PersoonLoopbaan\`, \`PersoonNevenfunctie\` en \`PersoonOnderwijs\` (namen gecontroleerd in \`$metadata\` op ${formatDutchDate(today)}), CC0 1.0 volgens ${TK_LICENSE_PAGE}. Alleen voor personen die \`pipelines/parliament-activity.mjs\` op volledige naam plus geboortedatum aan een TK-Persoon koppelde; die koppeling is hergebruikt, niet opnieuw gemaakt. Betrouwbaarheid \`high\`.`);
  lines.push("- `PersoonLoopbaan`: `Functie` wordt de titel, `Werkgever` de organisatie, `Van` en `TotEnMet` de jaren. Soort `politiek` als titel of werkgever een politiek ambt noemt (minister, wethouder, burgemeester, raadslid, Statenlid, gedeputeerde, Kamerlid, enzovoort), anders `loopbaan`. `current` blijft `false`: de bron zegt bij een loopbaanregel niet of die loopt.");
  lines.push("- `PersoonNevenfunctie`: `Omschrijving` wordt de titel, zonder aparte organisatie. `current` is `true` als `IsActief` waar is en er geen einddatum in het verleden staat.");
  lines.push("- `PersoonOnderwijs`: `OpleidingNl` wordt de titel, `Instelling` de organisatie, soort `opleiding`.");
  lines.push("- Tweede bron: Wikidata, P39 (functie), P108 (werkgever) en P106 (beroep) van de eigen entiteit van de persoon, labels in het Nederlands, geen claims met rang deprecated, opgehaald met `wbgetentities` (de SPARQL-dienst gaf op 25-09-2026 een time-out, HTTP 504). Claims zonder P580 en P582 blijven staan met `start` en `end` op null.");
  lines.push("- Referentieregel: een Wikidata-claim komt alleen in het bestand als hij minstens een referentie heeft. De enige uitzondering is P39 zonder referentie bij een persoon van wie de dataset dat ambt al uit een officiele bron (geen Wikidata of Wikipedia) bevestigt: een tenure of lidmaatschap waarvan de positietitel of organisatienaam een kernwoord deelt met de Wikidata-functie.");
  lines.push("- P106 wordt soort `beroep`: titel het Nederlandse label van het beroep, organisatie null, datums alleen als kwalificaties ze geven. Een beroep wordt niet aan een werkgever gekoppeld, omdat Wikidata dat verband niet legt; P108 KLM en P106 vliegenier blijven twee regels.");
  lines.push("-  Organisatie bij P39: het label van kwalificatie P642, anders P2389 of P361 van de functie. Titel bij P108: de rol (P2868 of P794) als die er is, anders de werkgever. Opeenvolgende claims voor dezelfde functie (per zittingsperiode) worden samengevoegd als de volgende binnen zeven dagen na het einde van de vorige begint. Wikidata zegt niet of een functie loopt, dus `current` is daar `false`. Betrouwbaarheid `medium`.");
  lines.push("- Een Wikidata-regel die dezelfde functie beschrijft als een TK-regel (zelfde beginjaar en een gedeeld kernwoord) valt weg; TK gaat voor. Een ongedateerde Wikidata-regel met dezelfde titel en organisatie als een al opgenomen regel valt ook weg. Per persoon: lopend eerst, dan gedateerd op begin, nieuwste eerst, dan ongedateerd, en hooguit " + maxPerPerson + " regels.");
  lines.push("- `organizationId` staat alleen ingevuld als de organisatienaam precies gelijk is aan de naam of een alias van precies een organisatie in `data/organizations.json`.");
  lines.push("");
  lines.push("## Aantallen");
  lines.push("");
  lines.push("| Groep | Personen | Gekoppeld aan TK | Met Wikidata-id | Met loopbaan | Met TK-regels | Met Wikidata-regels | Regels |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const [group, row] of Object.entries(groups)) {
    lines.push(`| ${GROUP_LABELS[group]} | ${row.people} | ${row.matched} | ${row.wikidata} | ${row.withCareer} | ${row.fromTk} | ${row.fromWd} | ${row.entries} |`);
  }
  lines.push("");
  lines.push(`Totaal ${records.length} regels: ${stats.tkEntries} uit de Tweede Kamer, ${stats.wdEntries} uit Wikidata. Per soort: ${KINDS.map((k) => `${k} ${kinds[k]}`).join(", ")}. Lopend: ${records.filter((r) => r.current).length}. Met een \`organizationId\`: ${stats.withOrgId}. Zonder begin en einde: ${records.filter((r) => !r.start && !r.end).length} (${records.filter((r) => !r.start && !r.end && r.source.confidence === "medium").length} uit Wikidata).`);
  lines.push("");
  lines.push(`Weggelaten: ${stats.deduped} dubbele regels (Wikidata gelijk aan TK, of exact dezelfde regel), ${stats.capped} regels boven de grens van ${maxPerPerson} per persoon, ${stats.droppedBadRange} regels met een einde voor het begin, ${stats.wdNoLabel} Wikidata-claims zonder Nederlands label, ${stats.wdUnreferenced} Wikidata-claims zonder referentie. ${stats.tkBadDate} TK-regels hebben een datumwaarde die niet als jaar of datum te lezen is; die datum staat op null.`);
  lines.push("");
  lines.push("## Gaps");
  lines.push("");
  lines.push("- Personen zonder TK-koppeling en zonder Wikidata-id hebben geen loopbaan. De meeste personen in de groep overig (burgemeesters, bestuurders en ambtenaren uit de registers) vallen daaronder.");
  lines.push("- Eerste Kamerleden die nooit Tweede Kamerlid waren, hebben in het Gegevensmagazijn meestal lege loopbaanlijsten; voor hen is Wikidata de enige bron.");
  lines.push("- Bewindspersonen die nooit Kamerlid waren, hebben geen gekoppelde TK-Persoon (zie `research/qa/parliament-activity-25-09-2026.md`); ook voor hen is Wikidata de enige bron.");
  lines.push("- `current` is alleen `true` bij een actieve nevenfunctie. Een lopend ambt uit Wikidata of een lopende baan uit `PersoonLoopbaan` heeft `end: null` en `current: false`, omdat die bronnen niet zeggen dat het ambt loopt.");
  for (const gap of gaps) lines.push(`- ${gap}`);
  lines.push("");
  lines.push("### Bewindspersonen en Kamerleden zonder loopbaan");
  lines.push("");
  if (noCareer.length === 0) lines.push("Geen.");
  noCareer.forEach((row, i) => {
    const why = row.tk ? "gekoppelde TK-Persoon zonder loopbaanregels" : `geen TK-koppeling (${row.reason ?? "onbekend"})`;
    const wd = row.wikidata ? `Wikidata ${row.wikidata} zonder bruikbare P39, P108 of P106 met referentie` : "geen Wikidata-id";
    lines.push(`${i + 1}. \`${row.id}\` (${row.name}, ${row.group}): ${why}; ${wd}.`);
  });
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  return { offline: argv.includes("--offline"), refresh: argv.includes("--refresh"), dryRun: argv.includes("--dry-run") };
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  runCareers(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(`careers failed: ${error.message}`);
    process.exitCode = 1;
  });
}
