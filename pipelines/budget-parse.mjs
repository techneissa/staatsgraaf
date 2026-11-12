// Ministry budgets from the rijksfinancien "Begrotingsstaten" open data.
//
// The download (Begrotingsstaten_2013-2027.json, CC0) is a table written by pandas:
// one object per column, each holding the values under the row number as a string key.
// Per fiscal year, budget chapter (hoofdstuk) and article it carries the amounts of
// five phases, in EUR x 1,000, for V (verplichtingen), U (uitgaven) and O (ontvangsten).
//
// This module holds the rules that turn it into data/budgets.json. They reproduce the
// first import (retrieved 2026-09-18) figure for figure, for all 12 ministries and all
// years (the test on pipelines/fixtures/budget/begrotingsstaten.json holds them to it):
//
//   - a ministry is a fixed set of chapters (MINISTRIES below), including the chapters that
//     took over a task of an earlier ministry (XXII Volkshuisvesting with BZK, XXIII Klimaat
//     en Groene Groei with EZK, XX Asiel en Migratie with J&V). The source also labels some
//     rows by name instead of by number (Algemene Zaken article 1 sits under chapter IIB in
//     some years, and the Buitenlandse Zaken share of the Nationaal Groeifonds under L), so a
//     chapter can also be claimed by its name;
//   - the same article can appear twice with the same number and name (chapter III next to
//     IIB for Algemene Zaken, one row per phase group for Financiën). Such rows are one
//     article: per phase the larger figure counts, so nothing is counted twice;
//   - the budget figure of an article is its latest phase that has a figure (OWB, O1, SBS, O2,
//     in file order); a ministry's spendingBudget is the sum over its articles, U for spending
//     and O for revenue. The realised figure (Realisatie) only exists once the year is closed;
//   - net is spending minus revenue, using the realised spending when it exists;
//   - V (verplichtingen) is not used.
//
// A chapter that belongs to no ministry of the dataset and is not known to be outside it is
// not guessed: when it carries amounts it is returned as a named gap (unmatchedChapters), and
// the guard stops the run until a person has placed it.

export const SOURCE_UNIT = "EUR x 1,000";
export const PHASES = ["StandOWB", "StandO1", "StandSBS", "StandO2"];
export const ACTUAL = "Realisatie";
const REQUIRED_COLUMNS = ["Begrotingsjaar", "VUO", "HoofdstukRomeins", "Hoofdstuknaam", "Artikelnummer", "Artikelnaam", ...PHASES, ACTUAL];

/**
 * The twelve ministries of the dataset. `chapters` are Roman chapter numbers that belong
 * to the ministry whatever their name; `byName` claims rows of another chapter by its
 * (normalised) chapter name.
 */
export const MINISTRIES = [
  { id: "org:ministerie-van-algemene-zaken", chapters: ["III"], byName: [{ chapter: "IIB", name: "algemene zaken", as: "III" }] },
  { id: "org:ministerie-van-binnenlandse-zaken-en-koninkrijksrelaties", chapters: ["IV", "VII", "XXII"] },
  {
    id: "org:ministerie-van-buitenlandse-zaken",
    chapters: ["V", "XVII"],
    byName: [{ chapter: "L", name: "buitenlandse zaken", as: "V" }],
  },
  { id: "org:ministerie-van-defensie", chapters: ["X"] },
  { id: "org:ministerie-van-economische-zaken-en-klimaat", chapters: ["XIII", "XXIII"] },
  { id: "org:ministerie-van-financien", chapters: ["IX"] },
  { id: "org:ministerie-van-infrastructuur-en-waterstaat", chapters: ["XII"] },
  { id: "org:ministerie-van-justitie-en-veiligheid", chapters: ["VI", "XX"] },
  { id: "org:ministerie-van-landbouw-visserij-voedselzekerheid-en-natuur", chapters: ["XIV"] },
  { id: "org:ministerie-van-onderwijs-cultuur-en-wetenschap", chapters: ["VIII"] },
  { id: "org:ministerie-van-sociale-zaken-en-werkgelegenheid", chapters: ["XV"] },
  { id: "org:ministerie-van-volksgezondheid-welzijn-en-sport", chapters: ["XVI"] },
];

/**
 * Chapters that are on purpose not part of a ministry here: the Koning, the Staten-Generaal and
 * the other high councils, the funds, and chapters before 2017 that were taken over by one of
 * the twelve. Any other chapter number is reported as a gap.
 */
const KNOWN_OUTSIDE = new Set(["A", "B", "C", "F", "H", "I", "IIA", "IIB", "J", "K", "L", "M", "XI", "XVIII", "XIX"]);

const normalize = (text) =>
  String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " en ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function number(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`geen getal in de brondata: ${JSON.stringify(value)}`);
  return n;
}

/** The pandas table as a list of row objects. Throws when a column is missing. */
export function readTable(json) {
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error("de download is geen tabel met kolommen");
  const missing = REQUIRED_COLUMNS.filter((column) => typeof json[column] !== "object" || json[column] === null);
  if (missing.length > 0) throw new Error(`kolom(men) ontbreken in de download: ${missing.join(", ")}`);
  return Object.keys(json.VUO).map((index) => {
    const row = {};
    for (const column of REQUIRED_COLUMNS) row[column] = json[column][index];
    return row;
  });
}

function ministryOf(row) {
  const chapter = String(row.HoofdstukRomeins ?? "");
  const name = normalize(row.Hoofdstuknaam);
  for (const ministry of MINISTRIES) {
    if (ministry.chapters.includes(chapter)) return { ministry, chapter };
    for (const claim of ministry.byName ?? []) {
      if (claim.chapter === chapter && claim.name === name) return { ministry, chapter: claim.as };
    }
  }
  return null;
}

/**
 * Sum the rows into amounts per ministry, fiscal year and kind (U, O).
 * Returns { totals: Map<orgId, Map<year, { U: {phase: n}, O: {phase: n} }>>, unmatchedChapters, rowCount }.
 */
export function aggregate(rows) {
  const articles = new Map(); // one entry per ministry, year, kind and article
  const unmatched = new Map();
  for (const row of rows) {
    const kind = row.VUO;
    if (kind !== "U" && kind !== "O") continue; // V (verplichtingen) is not a spending figure
    const year = Number(row.Begrotingsjaar);
    if (!Number.isInteger(year)) throw new Error(`ongeldig begrotingsjaar: ${JSON.stringify(row.Begrotingsjaar)}`);
    const hit = ministryOf(row);
    if (!hit) {
      const chapter = String(row.HoofdstukRomeins);
      const hasAmounts = [...PHASES, ACTUAL].some((phase) => number(row[phase]) !== 0);
      if (!KNOWN_OUTSIDE.has(chapter) && hasAmounts) {
        const entry = unmatched.get(chapter) ?? { chapter, name: row.Hoofdstuknaam, years: new Set() };
        entry.years.add(year);
        unmatched.set(chapter, entry);
      }
      continue;
    }
    const key = [hit.ministry.id, year, kind, hit.chapter, String(row.Artikelnummer), normalize(row.Artikelnaam)].join("|");
    const merged = articles.get(key) ?? { org: hit.ministry.id, year, kind, values: {} };
    for (const phase of [...PHASES, ACTUAL]) {
      merged.values[phase] = Math.max(merged.values[phase] ?? 0, number(row[phase]));
    }
    articles.set(key, merged);
  }

  const totals = new Map();
  for (const { org, year, kind, values } of articles.values()) {
    const years = totals.get(org) ?? new Map();
    const slot = years.get(year) ?? { U: { budget: 0, hasBudget: false, actual: 0, hasActual: false }, O: { budget: 0, hasBudget: false, actual: 0, hasActual: false } };
    const total = slot[kind];
    const phase = latestPhase(values);
    if (phase) {
      total.budget += values[phase];
      total.hasBudget = true;
    }
    if (values[ACTUAL]) {
      total.actual += values[ACTUAL];
      total.hasActual = true;
    }
    years.set(year, slot);
    totals.set(org, years);
  }
  return {
    totals,
    unmatchedChapters: [...unmatched.values()].map((entry) => ({ chapter: entry.chapter, name: entry.name, years: [...entry.years].sort() })),
    rowCount: rows.length,
  };
}

/** The latest budget phase of one article that holds a figure, or null. */
function latestPhase(values) {
  for (const phase of [...PHASES].reverse()) if (values[phase]) return phase;
  return null;
}

/** One year's amountSet (schema: budget.schema.json), or null when the ministry has no data that year. */
export function amountsFor(slot) {
  if (!slot) return null;
  const { U, O } = slot;
  const realised = U.hasActual || O.hasActual;
  if (!U.hasBudget && !O.hasBudget && !realised) return null;
  const spendingBudget = U.hasBudget ? U.budget : null;
  const spendingActual = realised ? U.actual : null;
  const revenue = realised ? O.actual : O.hasBudget ? O.budget : null;
  const spending = spendingActual ?? spendingBudget;
  return {
    spendingBudget,
    spendingActual,
    revenue,
    net: spending !== null && revenue !== null ? spending - revenue : null,
    nonprofit: null,
  };
}

/** Years of a ministry that have an amountSet, ascending. */
export function yearsOf(totals, org) {
  const years = totals.get(org);
  if (!years) return [];
  return [...years.keys()].filter((year) => amountsFor(years.get(year))).sort((a, b) => a - b);
}

/** Realised spending and revenue per closed year before `beforeYear`, for the history list. */
export function historyBefore(totals, org, beforeYear) {
  const years = totals.get(org);
  const out = [];
  for (const year of yearsOf(totals, org)) {
    if (year >= beforeYear) break;
    const amounts = amountsFor(years.get(year));
    if (amounts.spendingActual === null) continue;
    out.push({ fiscalYear: year, spendingActual: amounts.spendingActual, revenue: amounts.revenue });
  }
  return out;
}
