// Official election results from the Kiesraad's Databank verkiezingsuitslagen (issue #8).
//
// A few days after a Tweede Kamer or Eerste Kamer election the Kiesraad publishes the
// established result on https://www.verkiezingsuitslagen.nl/verkiezingen/detail/<code>
// (code = TK or EK plus the voting day, for example TK20251029). The page carries the
// national result as JSON in a hidden <textarea id="UitslagData">. This module turns it
// into a record of data/elections.json, in the shape of the hand-made ones.
//
// The check makes no request unless a TK or EK election day lies in the last weeks, is
// old enough for the result to be established, and has no record yet. A page that does
// not pass the guard (seats do not add up to 150 or 75, a party name nobody knows, the
// wrong election) writes nothing and comes back as a gap.

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { applyLicenses, writeAttribution } from "./licenses.mjs";
import { buildSourceRecord, makeGap, sourceRef } from "./live-util.mjs";

export const DATABANK_BASE = "https://www.verkiezingsuitslagen.nl/verkiezingen/detail";

/** How far back an election day still counts as "recent" (days). */
export const WINDOW_DAYS = 42;

/**
 * The two chambers with a result. `minDays` keeps the check away from a day on which the
 * Kiesraad has not yet established the result (Tweede Kamer: the central count takes
 * about a week and a half; Eerste Kamer: one or two days).
 */
export const RESULT_TYPES = {
  tk: { id: "tk", code: "TK", body: "org:tweede-kamer", label: "Tweede Kamer", seatsTotal: 150, minDays: 10 },
  ek: { id: "ek", code: "EK", body: "org:eerste-kamer", label: "Eerste Kamer", seatsTotal: 75, minDays: 2 },
};

const MONTHS_NL = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** Names the databank spells out that are not a party key or an abbreviation in brackets. */
const NAME_ALIASES = {
  "groenlinks / partij van de arbeid (pvda)": "GL-PvdA",
  "forum voor democratie": "FVD",
  "partij voor de dieren": "PvdD",
  christenunie: "CU",
  groenlinks: "GL",
  "partij van de arbeid (p.v.d.a.)": "PvdA",
  "socialistische partij": "SP",
};

function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function electionId(type, date) {
  return `election:${type.id}-${date}`;
}

export function detailCode(type, date) {
  return `${type.code}${date.replaceAll("-", "")}`;
}

export function detailUrl(type, date) {
  return `${DATABANK_BASE}/${detailCode(type, date)}`;
}

function dutchDate(date) {
  const [year, month, day] = date.split("-");
  return `${Number(day)} ${MONTHS_NL[Number(month) - 1]} ${year}`;
}

/**
 * Elections that need a result now: a TK or EK election day in the last WINDOW_DAYS days, at
 * least `minDays` ago, with no record in `elections` yet. Reads the dates the Kiesraad type
 * pages gave (data/upcoming-elections.json). Returns [{ type, date, kind }].
 */
export function electionsDue({ elections = [], upcoming = [], today, windowDays = WINDOW_DAYS }) {
  const stored = new Set(elections.map((election) => election.id));
  const due = new Map();
  for (const item of upcoming) {
    const type = RESULT_TYPES[item?.type];
    if (!type || !item.date || item.date > today) continue;
    const age = daysBetween(item.date, today);
    if (age < type.minDays || age > windowDays) continue;
    const id = electionId(type, item.date);
    if (stored.has(id) || due.has(id)) continue;
    due.set(id, { type, date: item.date });
  }
  return [...due.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** The JSON of the hidden UitslagData textarea, or null when the page has none. */
export function parseDatabankPage(html) {
  const match = /<textarea[^>]*id="UitslagData"[^>]*>([\s\S]*?)<\/textarea>/.exec(String(html));
  if (!match) return null;
  const text = match[1]
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** "1.790.634" or "616" to an integer; null for anything else. */
export function parseCount(value) {
  if (typeof value !== "string" || !/^\d{1,3}(\.\d{3})*$|^\d+$/.test(value.trim())) return null;
  return Number(value.trim().replaceAll(".", ""));
}

/** "78,3%" to 0.783; null for anything else. */
export function parseFraction(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d+(?:,\d+)?)\s*%$/.exec(value.trim());
  return match ? Math.round(Number(match[1].replace(",", ".")) * 10) / 1000 : null;
}

/**
 * The dataset key of a party as the databank spells it ("PVV (Partij voor de Vrijheid)" is PVV,
 * "Staatkundig Gereformeerde Partij (SGP)" is SGP), or null when no known key matches.
 */
export function partyKeyFromName(name, partyKeys) {
  if (typeof name !== "string" || !partyKeys) return null;
  const byLower = new Map([...partyKeys].map((key) => [key.toLowerCase(), key]));
  const lookup = (candidate) => byLower.get(candidate.toLowerCase().replaceAll(".", "").trim()) ?? null;
  const alias = NAME_ALIASES[name.trim().toLowerCase()];
  if (alias && partyKeys.has(alias)) return alias;
  const exact = lookup(name);
  if (exact) return exact;
  const bracket = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(name.trim());
  if (bracket) return lookup(bracket[1]) ?? lookup(bracket[2]);
  return null;
}

/** Keys the app knows (web/lib/parties.ts), read the way live.mjs reads them. */
export async function loadPartyKeys(root) {
  try {
    const text = await readFile(join(root, "web", "lib", "parties.ts"), "utf8");
    const keys = new Set();
    for (const match of text.matchAll(/\b(?:key|abbrev):\s*"([^"]+)"/g)) keys.add(match[1]);
    for (const match of text.matchAll(/unlisted\(\s*"([^"]+)"/g)) keys.add(match[1]);
    return keys.size > 0 ? keys : null;
  } catch {
    return null;
  }
}

function sourceDef(type, date) {
  const url = detailUrl(type, date);
  return {
    id: `src:kiesraad-databank-${type.id}-${date}`,
    url,
    title: `Databank verkiezingsuitslagen: ${type.label} ${dutchDate(date)}`,
    publisher: "Kiesraad",
    type: "register",
    license: "CC0-1.0",
    notes: "Landelijke uitslag per partij in de Databank verkiezingsuitslagen van de Kiesraad; door de pagina zelf gemeld als uitslag van de verkiezing.",
  };
}

/**
 * Turn one databank page into a record, behind the guard. Returns { record, source, problems }:
 * `record` is null as soon as there is a problem (nothing may be written then).
 * `regular` says the date was announced as the regular election day.
 */
export function buildElectionRecord({ type, date, page, partyKeys, today, existingSources = [], regular = false }) {
  const problems = [];
  const info = page?.Info;
  const region = page?.Stemregio;
  if (!info || !region) return { record: null, source: null, problems: ["de pagina bevat geen uitslaggegevens"] };
  if (info.Code !== detailCode(type, date)) problems.push(`de pagina hoort bij ${info.Code ?? "een onbekende verkiezing"}, niet bij ${detailCode(type, date)}`);
  if (region.Naam !== "Nederland") problems.push(`de uitslag is voor "${region.Naam}", niet voor heel Nederland`);
  if (!partyKeys) problems.push("de lijst met bekende partijnamen (web/lib/parties.ts) kon niet worden gelezen");

  const parties = Array.isArray(region.Partij) ? region.Partij : [];
  const seated = parties.filter((party) => (parseCount(party.AantalZetels) ?? 0) > 0);
  if (seated.length === 0) problems.push("geen enkele partij heeft zetels");

  const weighted = type.id === "ek";
  const rows = [];
  const keys = new Set();
  for (const party of seated) {
    const key = partyKeyFromName(party.Naam, partyKeys);
    if (!key) {
      if (partyKeys) problems.push(`onbekende partijnaam "${party.Naam}"`);
      continue;
    }
    if (keys.has(key)) problems.push(`partij ${key} staat twee keer in de uitslag`);
    keys.add(key);
    const seats = parseCount(party.AantalZetels);
    // Eerste Kamer: votes are cast by Statenleden and carry a weight; the records keep only the weighted total.
    rows.push({ key, seats, votes: weighted ? null : parseCount(party.AantalStemmen), weighted: parseCount(party.AantalGewogenstemmen) });
  }

  const seatSum = seated.reduce((total, party) => total + (parseCount(party.AantalZetels) ?? 0), 0);
  if (seatSum !== type.seatsTotal) problems.push(`de zetels tellen op tot ${seatSum}, niet tot ${type.seatsTotal}`);

  let validVotes = null;
  if (weighted) {
    const weights = parties.map((party) => parseCount(party.AantalGewogenstemmen));
    validVotes = weights.some((weight) => weight === null) ? null : weights.reduce((total, weight) => total + weight, 0);
  } else {
    validVotes = parseCount(region.AantalGeldigeStemmen);
  }
  if (!validVotes) problems.push("het aantal geldige stemmen ontbreekt");
  const turnout = weighted ? null : parseFraction(region.OpkomstPercentage);
  if (!weighted && turnout === null) problems.push("de opkomst ontbreekt");
  if (!weighted && validVotes && rows.some((row) => row.votes === null)) problems.push("een partij met zetels heeft geen stemmen");
  if (problems.length > 0) return { record: null, source: null, problems };

  rows.sort((a, b) => b.seats - a.seats || (b.votes ?? b.weighted ?? 0) - (a.votes ?? a.weighted ?? 0));
  const source = buildSourceRecord(sourceDef(type, date), existingSources, today);
  const notes = weighted
    ? `Zetels uit de Databank verkiezingsuitslagen van de Kiesraad. validVotes is het totaal van de gewogen stemmen (stemmen van de Statenleden en kiescollegeleden vermenigvuldigd met de stemwaarde). Stemcijfers per lijst zijn niet overgenomen. Toegevoegd door pipelines/election-results.mjs.`
    : `Zetels, opkomst en geldige stemmen uit de Databank verkiezingsuitslagen van de Kiesraad; stemmen per lijst uit dezelfde pagina; share berekend als stemmen gedeeld door geldige stemmen op kandidaten.${regular ? "" : " Aard (regulier of vervroegd) niet vastgesteld."} Toegevoegd door pipelines/election-results.mjs.`;
  const record = {
    id: electionId(type, date),
    body: type.body,
    date,
    kind: weighted || regular ? "regulier" : null,
    seatsTotal: type.seatsTotal,
    turnout,
    validVotes,
    seats: rows.map((row) => ({
      party: row.key,
      seats: row.seats,
      votes: row.votes,
      share: row.votes === null ? null : Math.round((row.votes / validVotes) * 10_000) / 10_000,
    })),
    notes,
    source: sourceRef(source.id, today),
  };
  return { record, source, problems: [] };
}

/**
 * Fetch the pages of the elections that are due and build their records. Makes no request when
 * nothing is due. A page that is missing or fails the guard is a gap, never a record.
 */
export async function fetchElectionResults({ http, today, elections, upcoming, partyKeys, existingSources = [] }) {
  const due = electionsDue({ elections, upcoming, today });
  const records = [];
  const sources = [];
  const gaps = [];
  for (const { type, date } of due) {
    const what = `Verkiezingsuitslag ${type.label} ${dutchDate(date)}`;
    const url = detailUrl(type, date);
    let html;
    try {
      html = await http.getText(url, { accept: "text/html" });
    } catch (error) {
      gaps.push(makeGap(what, `de uitslagpagina van de Kiesraad is nog niet beschikbaar (${error.message})`, url, "De volgende run probeert het opnieuw zolang de verkiezing recent is."));
      continue;
    }
    const regular = upcoming.some((item) => item.type === type.id && item.kind === "next" && item.date === date);
    const built = buildElectionRecord({ type, date, page: parseDatabankPage(html), partyKeys, today, existingSources, regular });
    if (!built.record) {
      gaps.push(makeGap(what, `niets geschreven: ${built.problems.join("; ")}`, url, "Controleer de uitslagpagina; de volgende run probeert het opnieuw. Zo nodig voeg je de uitslag met de hand toe."));
      continue;
    }
    records.push(built.record);
    sources.push(built.source);
  }
  return { due: due.map(({ type, date }) => electionId(type, date)), records, sources, gaps };
}

/** Write the records to data/elections.json and their sources to data/sources.json (and ATTRIBUTION.md). */
export async function writeElectionResults(root, { records, sources }) {
  if (records.length === 0) return false;
  const read = async (relative) => JSON.parse(await readFile(join(root, relative), "utf8"));
  const elections = await read("data/elections.json");
  const known = new Set(elections.map((election) => election.id));
  const added = records.filter((record) => !known.has(record.id));
  if (added.length === 0) return false;
  const nextElections = [...elections, ...added].sort((a, b) => a.id.localeCompare(b.id));
  const allSources = await read("data/sources.json");
  const have = new Set(allSources.map((source) => source.id));
  const newSources = applyLicenses(structuredClone(sources.filter((source) => !have.has(source.id))));
  const nextSources = [...allSources, ...newSources].sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(join(root, "data", "elections.json"), `${JSON.stringify(nextElections, null, 2)}\n`, "utf8");
  if (newSources.length > 0) {
    await writeFile(join(root, "data", "sources.json"), `${JSON.stringify(nextSources, null, 2)}\n`, "utf8");
    await writeAttribution(nextSources, join(root, "ATTRIBUTION.md"));
  }
  return true;
}

const TOUCHED = ["data/elections.json", "data/sources.json", "ATTRIBUTION.md"];

function runValidate(root) {
  const script = join(root, "scripts", "validate.mjs");
  if (!existsSync(script)) return { ok: true, output: "" };
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8", timeout: 300_000 });
  return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split("\n").slice(-8).join("\n") };
}

/**
 * The step the live run calls. Fetches what is due, writes what passed the guard, validates and
 * restores the files when validation fails. Returns { requested, added, gaps } (`requested` is
 * the number of elections looked up, `added` the ids written).
 */
export async function runElectionResults({ root, http, today, partyKeys, elections, upcoming, validate = true }) {
  const read = async (relative, fallback) => {
    try {
      return JSON.parse(await readFile(join(root, relative), "utf8"));
    } catch {
      return fallback;
    }
  };
  const stored = elections ?? (await read("data/elections.json", []));
  const dates = upcoming ?? (await read("data/upcoming-elections.json", []));
  const existingSources = await read("data/sources.json", []);
  const keys = partyKeys ?? (await loadPartyKeys(root));
  const fetched = await fetchElectionResults({ http, today, elections: stored, upcoming: dates, partyKeys: keys, existingSources });
  const gaps = [...fetched.gaps];
  if (fetched.records.length === 0) return { requested: fetched.due.length, added: [], gaps };

  const before = new Map();
  for (const relative of TOUCHED) before.set(relative, existsSync(join(root, relative)) ? await readFile(join(root, relative), "utf8") : null);
  await writeElectionResults(root, fetched);
  if (validate) {
    const checked = runValidate(root);
    if (!checked.ok) {
      for (const [relative, text] of before) if (text !== null) await writeFile(join(root, relative), text, "utf8");
      gaps.push(makeGap("Verkiezingsuitslag bijschrijven", `de validatie faalde, de bestanden zijn hersteld (${checked.output.split("\n").pop()})`, "scripts/validate.mjs", "Lees de foutmelding van bun run validate en voeg de uitslag met de hand toe."));
      return { requested: fetched.due.length, added: [], gaps };
    }
  }
  return { requested: fetched.due.length, added: fetched.records.map((record) => record.id), gaps };
}
