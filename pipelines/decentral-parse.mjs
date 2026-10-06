// Parsers for the official sources of provincies, gemeenten and waterschappen (ADR 0027).
// Pure functions: text or JSON in, plain records out. No network, no files.
//
//  - Register van Overheidsorganisaties, CSV exports (organisaties.overheid.nl, CC0): the bodies
//    and their office holders ("medewerkers"). Semicolon separated, quoted, embedded newlines.
//  - TOOI organisation sets (identifier.overheid.nl): official codes, begin and end dates,
//    herindelingen (JSON-LD).
//  - CBS StatLine "Gebieden in Nederland <jaar>" (opendata.cbs.nl, CC BY 4.0): an independent count.
//  - Rijksoverheid overview of the commissarissen van de Koning (CC0): name, party, date, birth date.

import { decodeEntities, isoDate } from "./live-util.mjs";

// ---------- CSV ----------

/** Parse CSV text into rows of cells. Handles a BOM, quoted cells, doubled quotes and newlines inside quotes. */
export function parseCsv(text, delimiter = ";") {
  const source = typeof text === "string" ? text.replace(/^﻿/, "") : "";
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

/** CSV text to objects keyed by the header row (trimmed). */
export function csvObjects(text, delimiter = ";") {
  const rows = parseCsv(text, delimiter);
  if (rows.length === 0) return [];
  const header = rows[0].map((name) => name.trim());
  return rows.slice(1).map((cells) => Object.fromEntries(header.map((name, index) => [name, (cells[index] ?? "").trim()])));
}

/** "18-09-2026" to "2026-09-18"; anything else (also an empty cell) to null. */
export function dutchDateToIso(value) {
  const match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(typeof value === "string" ? value.trim() : "");
  if (!match) return null;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function lastSegment(uri) {
  return typeof uri === "string" ? uri.trim().replace(/\/+$/, "").split("/").pop().toLowerCase() : "";
}

// ---------- Register: bodies ----------

const REGISTER_TYPE = { gemeenten: "Gemeente", provincies: "Provincie", waterschappen: "Waterschap" };

/** "Gemeentebelangen (GB) (3);VVD (5)" to [{ party, seats }]. */
export function parseCouncilSeats(value) {
  if (typeof value !== "string" || value.trim() === "") return [];
  const out = [];
  for (const part of value.split(";")) {
    const match = /^(.*)\((\d+)\)\s*$/.exec(part.trim());
    if (match) out.push({ party: match[1].trim(), seats: Number(match[2]) });
  }
  return out;
}

/** The bodies of one level from the register export (`export/Gemeenten.csv` and the like). */
export function parseRegisterBodies(text, level) {
  const type = REGISTER_TYPE[level];
  const bodies = [];
  for (const row of csvObjects(text)) {
    if (row.Type !== type) continue;
    const code = lastSegment(row["TOOi URI"]) || (row.Organisatiecode ?? "").toLowerCase();
    if (code === "") continue;
    const site = /(https?:\/\/[^,;\s]+)/.exec(row["Internetpagina's"] ?? "");
    const seats = Number.parseInt(row["Totaal aantal zetels"] ?? "", 10);
    bodies.push({
      code,
      name: row["Officiële naam"],
      short: row.Afkorting || null,
      start: dutchDateToIso(row.Startdatum),
      end: dutchDateToIso(row.Einddatum),
      website: site ? site[1] : null,
      seats: Number.isFinite(seats) ? seats : null,
      inhabitants: Number.parseInt(row["Aantal inwoners"] ?? "", 10) || null,
      council: parseCouncilSeats(row["Raad (Partij (aantal zetels))"]),
      tooi: row["TOOi URI"] || null,
    });
  }
  return bodies;
}

// ---------- Register: office holders ----------

/**
 * The office holders of one level from the "medewerkers" export. A row names the organisation
 * (a body, or "Provincie X | Commissaris van de Koning" for a part of it), the person and the function.
 * Rows of functions without a public office (Woo-contactpersoon, Secretariaat, Teamleider) are kept
 * as read; the planner takes only the functions it models.
 */
export function parseRegisterPeople(text) {
  const rows = [];
  for (const row of csvObjects(text)) {
    const orgCell = row["Organisatie (onderdeel)"] ?? "";
    const [orgName, ...part] = orgCell.split("|").map((piece) => piece.trim());
    rows.push({
      orgName,
      part: part.join(" | ") || null,
      code: lastSegment(row["Resource identifier v5.0 organisatie"]) || null,
      name: row.Naam ?? "",
      function: row.Functie ?? "",
    });
  }
  return rows;
}

// ---------- TOOI (JSON-LD) ----------

function valuesOf(node, suffix) {
  for (const [key, list] of Object.entries(node)) {
    if (key.endsWith(`/${suffix}`) || key.endsWith(`#${suffix}`)) {
      return (Array.isArray(list) ? list : [list]).map((entry) => (entry && typeof entry === "object" ? entry["@value"] ?? entry["@id"] : entry)).filter((value) => value !== undefined);
    }
  }
  return [];
}

/**
 * A TOOI organisation set (`https://identifier.overheid.nl/tooi/id/gemeente?format=json`).
 * Returns { entries, events }. An entry is one code with its official names, begin date, end date
 * (the last day it existed) and province; a code that appears twice (a name change) is one entry.
 * An event is a herindeling: { type, date, predecessors, successors } with codes.
 */
export function parseTooiSet(json) {
  const nodes = [];
  for (const block of Array.isArray(json) ? json : [json]) {
    for (const node of block?.["@graph"] ?? []) nodes.push(node);
  }
  const byCode = new Map();
  const events = [];
  for (const node of nodes) {
    const code = (valuesOf(node, "organisatiecode")[0] ?? "").toString().toLowerCase();
    if (code !== "") {
      const entry = byCode.get(code) ?? { code, names: [], begin: null, end: null, endOpen: false, province: null };
      for (const name of [...valuesOf(node, "officieleNaamExclSoort"), ...valuesOf(node, "voorkeursnaamExclSoort")]) {
        if (typeof name === "string" && name !== "" && !entry.names.includes(name)) entry.names.push(name);
      }
      const begin = valuesOf(node, "begindatum")[0];
      if (typeof begin === "string") entry.begin = entry.begin && entry.begin < begin ? entry.begin : begin;
      const end = valuesOf(node, "einddatum")[0];
      if (typeof end === "string") entry.end = entry.end && entry.end > end ? entry.end : end;
      else entry.endOpen = true;
      const province = valuesOf(node, "ligtInProvincie")[0];
      if (province) entry.province = lastSegment(province);
      byCode.set(code, entry);
      continue;
    }
    const when = valuesOf(node, "tijdstipWijziging")[0];
    if (typeof when !== "string") continue;
    const type = String((node["@type"] ?? [])[0] ?? "").split("/").pop();
    const codesOf = (suffix) => valuesOf(node, suffix).map(lastSegment).filter((value) => /^[a-z]{2}\d{3,4}$/.test(value));
    events.push({
      type,
      date: when.slice(0, 10),
      predecessors: codesOf("invalidated"),
      successors: [...new Set([...codesOf("generated"), ...codesOf("used")])],
    });
  }
  // A code with a node that has no end date is current; the end date counts only when every node of the code ends.
  const entries = [...byCode.values()].map((entry) => ({ ...entry, end: entry.endOpen ? null : entry.end }));
  entries.sort((a, b) => a.code.localeCompare(b.code));
  events.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
  return { entries, events };
}

/** Entries that exist on `today`: no end date, or an end date that has not passed. */
export function currentTooi(entries, today) {
  return entries.filter((entry) => !entry.end || entry.end >= today);
}

// ---------- CBS ----------

/** The newest "Gebieden in Nederland <jaar>" table whose year is not after `today`'s year. */
export function pickCbsTable(catalog, today) {
  const year = Number(String(today).slice(0, 4));
  let best = null;
  for (const table of catalog?.value ?? []) {
    if (!/^Gebieden in Nederland \d{4}$/.test(table.Title ?? "")) continue;
    if (!/^\d+NED$/i.test(table.Identifier ?? "")) continue;
    const tableYear = Number(table.Title.slice(-4));
    if (tableYear > year) continue;
    if (!best || tableYear > best.year) best = { id: table.Identifier, year: tableYear, title: table.Title, modified: table.Modified ?? null };
  }
  return best;
}

/** The TypedDataSet of the table: gemeenten (GM####) with their province (PV##). */
export function parseCbsRegions(json) {
  const gemeenten = [];
  const provinces = new Map();
  for (const row of json?.value ?? []) {
    const code = String(row.Code_1 ?? row.RegioS ?? "").trim().toLowerCase();
    if (!/^gm\d{4}$/.test(code)) continue;
    const provinceCode = String(row.Code_28 ?? "").trim().toLowerCase();
    const provinceName = String(row.Naam_29 ?? "").trim();
    gemeenten.push({ code, name: String(row.Naam_2 ?? "").trim(), provinceCode, provinceName });
    if (/^pv\d{2}$/.test(provinceCode)) provinces.set(provinceCode, provinceName);
  }
  gemeenten.sort((a, b) => a.code.localeCompare(b.code));
  return { gemeenten, provincies: [...provinces].map(([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code)) };
}

// ---------- Rijksoverheid: commissarissen van de Koning ----------

/** The table of the overview page: [{ name, party, province, start, birthDate, raw }]. */
export function parseCommissarissen(html) {
  if (typeof html !== "string" || html === "") return [];
  const table = /<table[\s\S]*?<\/table>/.exec(html);
  if (!table) return [];
  const items = [];
  for (const row of table[0].matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => decodeEntities(cell[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim());
    if (cells.length < 4) continue;
    const named = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(cells[0]);
    const name = (named ? named[1] : cells[0]).trim();
    const party = named ? named[2].trim() : "";
    items.push({
      name,
      party: party === "" || party === "-" ? null : party,
      province: cells[1],
      start: dutchDateToIso(cells[2]),
      birthDate: dutchDateToIso(cells[3]),
      raw: cells[0],
    });
  }
  return items;
}

export { isoDate };
