#!/usr/bin/env bun
// Parlementaire activiteit voor Staatsgraaf: moties, amendementen,
// (initiatief)wetsvoorstellen en schriftelijke vragen waarvan een persoon uit de
// dataset indiener of medeindiener is.
//
// Bron: het Gegevensmagazijn van de Tweede Kamer (OData v4), CC0 1.0 volgens
// https://opendata.tweedekamer.nl/disclaimer. Een persoon wordt aan een
// TK-Persoon gekoppeld op volledige naam plus geboortedatum, nooit op naam
// alleen (dezelfde regel als pipelines/portraits.mjs). Alles wat niet zo te
// koppelen is, wordt een benoemde gap in het rapport.
//
// Ruwe antwoorden staan onder research/raw/parliament-activity/, zodat een
// nieuwe run zonder netwerk hetzelfde bestand schrijft (`--offline`).
// `--refresh` haalt alles opnieuw op.
//
// No dependencies. Node ESM only.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { normalizeName } from "./portraits.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const USER_AGENT =
  "StaatsgraafBot/0.1 (https://github.com/techneissa/staatsgraaf; parlementaire activiteit uit het Gegevensmagazijn van de Tweede Kamer)";
export const TK_ODATA = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0";
export const TK_LICENSE_PAGE = "https://opendata.tweedekamer.nl/disclaimer";
export const THROTTLE_MS = 300;
export const MAX_ITEMS = 40;
export const DETAIL_CHUNK = 20;

// Installatie van de Tweede Kamer na de verkiezing van 22-11-2023: 85 zetels in
// FractieZetelPersoon beginnen op 2023-12-06 (gecontroleerd 25-09-2026). De
// huidige Kamer is geinstalleerd op 2025-11-12 (69 zetels beginnen die dag).
export const TERM_START = "2023-12-06";
export const CURRENT_TERM_START = "2025-11-12";

export const ROLES = Object.freeze({ Indiener: "indiener", Medeindiener: "medeindiener" });

// Zaak.Soort in het Gegevensmagazijn naar de soort in data/activities.json.
export const KINDS = Object.freeze({
  Motie: "motie",
  Amendement: "amendement",
  Initiatiefwetgeving: "initiatiefwetsvoorstel",
  Wetgeving: "wetsvoorstel",
  "Schriftelijke vragen": "schriftelijke-vragen",
});
export const KIND_ORDER = Object.freeze(["motie", "amendement", "initiatiefwetsvoorstel", "wetsvoorstel", "schriftelijke-vragen"]);

// Per soort het document dat de openbare pagina op tweedekamer.nl opent.
const DOCUMENT_SOORT = {
  motie: /^motie/i,
  amendement: /^amendement/i,
  initiatiefwetsvoorstel: /^voorstel van wet/i,
  wetsvoorstel: /^voorstel van wet/i,
  "schriftelijke-vragen": /^schriftelijke vragen/i,
};

// Bevestigd door een echt voorbeeld live op te halen (25-09-2026):
// https://www.tweedekamer.nl/kamerstukken/detail?id=2026Z17941&did=2026D40912 (motie, 200, titel gelijk)
// https://www.tweedekamer.nl/kamerstukken/detail?id=2026Z19833&did=2026D45966 (schriftelijke vragen, 200)
// https://www.tweedekamer.nl/kamerstukken/detail?id=2026Z13411&did=2026D30308 (amendement, 200)
// https://www.tweedekamer.nl/kamerstukken/wetsvoorstellen/detail?cfg=wetsvoorsteldetails&qry=wetsvoorstel%3A37025 (wetsvoorstel, 200)
// Zonder did geeft de detailpagina een 404; dan wordt het OData-record gelinkt.
export const TK_DETAIL_URL = "https://www.tweedekamer.nl/kamerstukken/detail";
export const TK_BILL_URL = "https://www.tweedekamer.nl/kamerstukken/wetsvoorstellen/detail";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- identiteit ----------

/** Name forms of a TK Persoon: all given names and the call name, each with tussenvoegsel and achternaam. */
export function tkNameForms(persoon) {
  if (!persoon?.Achternaam) return [];
  const tail = [persoon.Tussenvoegsel, persoon.Achternaam].filter(Boolean).join(" ");
  const forms = new Set();
  if (persoon.Voornamen) forms.add(normalizeName(`${persoon.Voornamen} ${tail}`));
  if (persoon.Roepnaam) forms.add(normalizeName(`${persoon.Roepnaam} ${tail}`));
  forms.delete("");
  return [...forms];
}

export function tkFullName(persoon) {
  return [persoon?.Roepnaam ?? persoon?.Voornamen, persoon?.Tussenvoegsel, persoon?.Achternaam].filter(Boolean).join(" ");
}

/**
 * Identity evidence for one dataset person: full-name forms and birth dates, each
 * with where it came from. Initials ("H.W.M. Schoof") are not a full name and
 * never match a TK Persoon on their own.
 */
export function personEvidence(person, { portrait = null, ekName = null, review = null, identity = null, wikidataBirth = null } = {}) {
  const names = new Map();
  const births = new Map();
  const addName = (value, via) => {
    const key = normalizeName(value);
    if (!key || !/\s/.test(key)) return;
    // A form that is only initials plus a surname is not a full name.
    const tokens = key.split(" ");
    if (tokens.slice(0, -1).every((token) => token.length === 1)) return;
    if (!names.has(key)) names.set(key, via);
  };
  const addBirth = (value, via) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    if (!births.has(value)) births.set(value, via);
  };
  addName(person.name, "naam in de dataset");
  for (const alias of person.aliases ?? []) addName(alias, "alias in de dataset");
  addBirth(person.birthDate, "geboortedatum in de dataset");
  const chosen = portrait?.chosen;
  if (chosen && (!person.wikidata || chosen.id === person.wikidata)) {
    addName(chosen.label, `Wikidata ${chosen.id}`);
    addName(chosen.matchedName, `Wikidata ${chosen.id}`);
    addBirth(chosen.birthDate, `Wikidata ${chosen.id}`);
  }
  if (ekName) {
    addName(ekName.fullName, "ledenpagina eerstekamer.nl");
    addBirth(ekName.birthDate, "ledenpagina eerstekamer.nl");
  }
  if (review && (!person.wikidata || !review.wikidata || review.wikidata === person.wikidata)) {
    addName(review.expectName, "beoordeelde identiteit in research/raw/portraits/review.json");
    addBirth(review.birthDate, "beoordeelde identiteit in research/raw/portraits/review.json");
  }
  for (const entity of identity?.entities ?? []) {
    if (!person.wikidata || entity.id !== person.wikidata) continue;
    addName(entity.label, `Wikidata ${entity.id}`);
    addBirth(entity.birth, `Wikidata ${entity.id}`);
  }
  if (wikidataBirth && person.wikidata) addBirth(wikidataBirth, `Wikidata ${person.wikidata} (P569)`);
  return { names, births };
}

/**
 * Match dataset people to TK Persoon records on a full name plus the same birth
 * date. Returns matches and, per unmatched person, the reason.
 */
export function matchPeople(people, tkPersons, evidenceFor) {
  const byName = new Map();
  for (const persoon of tkPersons) {
    if (persoon.Verwijderd) continue;
    for (const form of tkNameForms(persoon)) {
      if (!byName.has(form)) byName.set(form, []);
      if (!byName.get(form).includes(persoon)) byName.get(form).push(persoon);
    }
  }
  const matches = new Map();
  const unmatched = new Map();
  for (const person of people) {
    const { names, births } = evidenceFor(person);
    const candidates = new Set();
    for (const form of names.keys()) for (const persoon of byName.get(form) ?? []) candidates.add(persoon);
    if (candidates.size === 0) {
      unmatched.set(person.id, names.size === 0 ? "geen volledige naam bekend (alleen initialen)" : "geen TK-Persoon met deze volledige naam");
      continue;
    }
    if (births.size === 0) {
      unmatched.set(person.id, `TK-Persoon met dezelfde naam gevonden, maar geen geboortedatum in de dataset, op Wikidata of op eerstekamer.nl om te toetsen`);
      continue;
    }
    const hits = [...candidates].filter((persoon) => births.has(String(persoon.Geboortedatum ?? "").slice(0, 10)));
    if (hits.length === 0) {
      unmatched.set(person.id, "TK-Persoon met dezelfde naam, maar de geboortedatum wijkt af");
      continue;
    }
    if (hits.length > 1) {
      unmatched.set(person.id, `${hits.length} TK-Personen met dezelfde naam en geboortedatum`);
      continue;
    }
    const persoon = hits[0];
    const birth = String(persoon.Geboortedatum).slice(0, 10);
    const nameVia = [...names.entries()].find(([form]) => tkNameForms(persoon).includes(form));
    matches.set(person.id, {
      person,
      persoon,
      identity: `naam "${tkFullName(persoon)}" (${nameVia?.[1] ?? "dataset"}) en geboortedatum ${birth} (${births.get(birth)}) gelijk aan TK-Persoon ${persoon.Id}`,
    });
  }
  // One TK Persoon may belong to one dataset person only.
  const byTk = new Map();
  for (const [personId, match] of matches) {
    if (!byTk.has(match.persoon.Id)) byTk.set(match.persoon.Id, []);
    byTk.get(match.persoon.Id).push(personId);
  }
  for (const ids of byTk.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      matches.delete(id);
      unmatched.set(id, "dezelfde TK-Persoon past bij meer dan een persoon in de dataset");
    }
  }
  return { matches, unmatched };
}

/** Full-precision birth date (P569, precision 11) from a wbgetentities entity, else null. */
export function wikidataBirthDate(entity) {
  for (const claim of entity?.claims?.P569 ?? []) {
    const value = claim?.mainsnak?.datavalue?.value;
    if (!value || value.precision !== 11) continue;
    const match = /^\+(\d{4}-\d{2}-\d{2})T/.exec(value.time ?? "");
    if (match) return match[1];
  }
  return null;
}

export const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

// ---------- groepen ----------

export function isBewindspersoonPosition(position, organizationsById) {
  if (!position || !/^(minister|staatssecretaris)/i.test(position.title ?? "")) return false;
  return organizationsById.get(position.organization)?.level === "rijk";
}

/** First matching group from top to bottom, the same order as the portraits report. */
export function personGroup(personId, { bewindspersonen, tkMembers, ekMembers }) {
  if (bewindspersonen.has(personId)) return "bewindspersoon";
  if (tkMembers.has(personId)) return "tweede-kamerlid";
  if (ekMembers.has(personId)) return "eerste-kamerlid";
  return "overig";
}

export const GROUP_LABELS = Object.freeze({
  bewindspersoon: "Bewindspersonen (nu of eerder, rijksniveau)",
  "tweede-kamerlid": "Tweede Kamerleden",
  "eerste-kamerlid": "Eerste Kamerleden",
  overig: "Overige personen",
});

// ---------- items ----------

export function kindOf(zaakSoort) {
  return KINDS[zaakSoort] ?? null;
}

const FINAL_OUTCOMES = ["aangenomen", "verworpen", "ingetrokken", "vervallen"];

/**
 * Outcome from the Besluit records of a zaak. Only a "Stemmen - ..." besluit
 * counts. A final outcome beats aangehouden; among equals the latest wins.
 */
export function outcomeOf(besluiten) {
  let best = null;
  for (const besluit of besluiten ?? []) {
    if (!besluit || besluit.Verwijderd || (besluit.Status && besluit.Status !== "Besluit")) continue;
    const match = /^Stemmen - (aangenomen|verworpen|aangehouden|ingetrokken|vervallen)\b/i.exec(besluit.BesluitSoort ?? "");
    if (!match) continue;
    const outcome = match[1].toLowerCase();
    const rank = FINAL_OUTCOMES.includes(outcome) ? 1 : 0;
    const when = besluit.GewijzigdOp ?? "";
    if (!best || rank > best.rank || (rank === best.rank && when > best.when)) best = { outcome, rank, when };
  }
  return best?.outcome ?? null;
}

export function kamerstukOf(zaak) {
  const dossier = (zaak.Kamerstukdossier ?? []).find((d) => d && Number.isInteger(d.Nummer));
  if (!dossier) return null;
  // A rijkswet marker "(R2218)" is cited after a space ("36910 (R2218)"), other toevoegingen after a hyphen ("36600-VII").
  const toevoeging = dossier.Toevoeging ? String(dossier.Toevoeging).trim() : "";
  const base = !toevoeging ? String(dossier.Nummer) : toevoeging.startsWith("(") ? `${dossier.Nummer} ${toevoeging}` : `${dossier.Nummer}-${toevoeging}`;
  return Number.isInteger(zaak.Volgnummer) && zaak.Volgnummer > 0 ? `${base}, nr. ${zaak.Volgnummer}` : base;
}

/** Public link on tweedekamer.nl from a confirmed pattern, else the OData record. */
export function publicUrlOf(zaak, kind) {
  const dossier = (zaak.Kamerstukdossier ?? []).find((d) => d && Number.isInteger(d.Nummer));
  if ((kind === "wetsvoorstel" || kind === "initiatiefwetsvoorstel") && dossier && !dossier.Toevoeging) {
    return `${TK_BILL_URL}?cfg=wetsvoorsteldetails&qry=${encodeURIComponent(`wetsvoorstel:${dossier.Nummer}`)}`;
  }
  const documents = (zaak.Document ?? []).filter((d) => d && !d.Verwijderd && d.DocumentNummer);
  const preferred = documents.find((d) => DOCUMENT_SOORT[kind]?.test(d.Soort ?? ""))
    ?? [...documents].sort((a, b) => String(a.Datum ?? "").localeCompare(String(b.Datum ?? "")))[0];
  if (zaak.Nummer && preferred) {
    return `${TK_DETAIL_URL}?id=${encodeURIComponent(zaak.Nummer)}&did=${encodeURIComponent(preferred.DocumentNummer)}`;
  }
  return `${TK_ODATA}/Zaak(${zaak.Id})`;
}

export function coSubmittersOf(zaak, selfTkId, personByTkId) {
  const rows = (zaak.ZaakActor ?? []).filter(
    (actor) => actor && !actor.Verwijderd && ROLES[actor.Relatie] && actor.Persoon_Id !== selfTkId,
  );
  rows.sort((a, b) => (a.Relatie === b.Relatie ? 0 : a.Relatie === "Indiener" ? -1 : 1));
  const seen = new Set();
  const out = [];
  for (const actor of rows) {
    const key = actor.Persoon_Id ?? actor.ActorNaam;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      person: (actor.Persoon_Id && personByTkId.get(actor.Persoon_Id)) || null,
      name: actor.ActorNaam ?? "",
      party: actor.ActorFractie ?? null,
      role: ROLES[actor.Relatie],
    });
  }
  return out;
}

export function buildItem(zaak, role, selfTkId, personByTkId) {
  const kind = kindOf(zaak.Soort);
  if (!kind || !zaak.Nummer || !zaak.GestartOp) return null;
  const title = String(zaak.Onderwerp ?? zaak.Titel ?? "").trim();
  if (!title) return null;
  return {
    id: `tk:${zaak.Nummer}`,
    role,
    kind,
    title,
    date: String(zaak.GestartOp).slice(0, 10),
    kamerstuk: kamerstukOf(zaak),
    outcome: kind === "schriftelijke-vragen" ? null : outcomeOf(zaak.Besluit),
    coSubmitters: coSubmittersOf(zaak, selfTkId, personByTkId),
    url: publicUrlOf(zaak, kind),
  };
}

/** Rows from the ZaakActor list of one person, deduplicated per zaak (indiener wins), newest first. */
export function listEntries(actorRows, since = TERM_START) {
  const byZaak = new Map();
  for (const row of actorRows ?? []) {
    const zaak = row?.Zaak;
    if (!zaak || zaak.Verwijderd || row.Verwijderd) continue;
    const role = ROLES[row.Relatie];
    const kind = kindOf(zaak.Soort);
    if (!role || !kind) continue;
    const date = String(zaak.GestartOp ?? "").slice(0, 10);
    if (!date || date < since) continue;
    const previous = byZaak.get(zaak.Id);
    if (previous && previous.role === "indiener") continue;
    byZaak.set(zaak.Id, { zaakId: zaak.Id, nummer: zaak.Nummer, kind, role, date });
  }
  return [...byZaak.values()].sort((a, b) => b.date.localeCompare(a.date) || String(b.nummer).localeCompare(String(a.nummer)));
}

export function totalsOf(entries) {
  const totals = {};
  for (const kind of KIND_ORDER) totals[kind] = 0;
  for (const entry of entries) totals[entry.kind] += 1;
  return totals;
}

// ---------- OData ----------

export function actorListUrl(tkId, since = TERM_START) {
  const soorten = Object.keys(KINDS).map((soort) => `Zaak/Soort eq '${soort}'`).join(" or ");
  const filter = `Persoon_Id eq ${tkId} and Verwijderd eq false and (Relatie eq 'Indiener' or Relatie eq 'Medeindiener') and Zaak/GestartOp ge ${since}T00:00:00+01:00 and (${soorten})`;
  const params = new URLSearchParams({
    $filter: filter,
    $select: "Id,Relatie,Functie,Verwijderd",
    $expand: "Zaak($select=Id,Nummer,Soort,GestartOp,Verwijderd)",
    $orderby: "Zaak/GestartOp desc",
  });
  return `${TK_ODATA}/ZaakActor?${params.toString().replace(/\+/g, "%20")}`;
}

export function zaakDetailUrl(ids) {
  const params = new URLSearchParams({
    $filter: ids.map((id) => `Id eq ${id}`).join(" or "),
    $select: "Id,Nummer,Soort,Onderwerp,Titel,GestartOp,Volgnummer,Vergaderjaar,Verwijderd",
    $expand: [
      "Kamerstukdossier($select=Nummer,Toevoeging)",
      "Document($select=Soort,DocumentNummer,Datum,Verwijderd)",
      "Besluit($select=BesluitSoort,BesluitTekst,Status,Verwijderd,GewijzigdOp)",
      "ZaakActor($select=Relatie,Persoon_Id,ActorNaam,ActorFractie,Functie,Verwijderd)",
    ].join(","),
  });
  return `${TK_ODATA}/Zaak?${params.toString().replace(/\+/g, "%20")}`;
}

async function getJson(url, { fetchImpl, userAgent, throttleMs }) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await sleep(throttleMs);
    try {
      const response = await fetchImpl(url, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
      if (response.ok) return await response.json();
      if (response.status < 500 && response.status !== 429) throw new Error(`HTTP ${response.status} voor ${url}`);
    } catch (error) {
      if (attempt === 3) throw error;
    }
    await sleep(throttleMs * 4 * attempt);
  }
  throw new Error(`geen antwoord voor ${url}`);
}

async function getAllPages(url, options) {
  const rows = [];
  let next = url;
  while (next) {
    const body = await getJson(next, options);
    rows.push(...(body?.value ?? []));
    next = body?.["@odata.nextLink"] ?? null;
  }
  return rows;
}

/**
 * One record per block and one item per line: a small file that still diffs
 * per item. Parses back to exactly the same JSON.
 */
export function serializeActivities(records) {
  if (records.length === 0) return "[]\n";
  const blocks = records.map((record) => {
    const { items, ...head } = record;
    const headJson = JSON.stringify(head);
    const itemLines = items.map((item) => `  ${JSON.stringify(item)}`).join(",\n");
    return `{${headJson.slice(1, -1)},"items":[${items.length > 0 ? `\n${itemLines}\n` : ""}]}`;
  });
  return `[\n${blocks.join(",\n")}\n]\n`;
}

// ---------- rapport ----------

export function formatDutchDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}

export function renderReport({ today, groups, kindCounts, outcomeCounts, unmatched, gaps, bytes, recordCount, itemCount, urlCounts }) {
  const lines = [];
  lines.push(`# Run report: parlementaire activiteit ${formatDutchDate(today)}`);
  lines.push("");
  lines.push("Build area K. Pipeline: `pipelines/parliament-activity.mjs`. Bron: het Gegevensmagazijn van de Tweede Kamer (OData v4, https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/). Uitvoer: `data/activities.json`, een bronrecord per persoon in `data/sources.json`, ruwe antwoorden onder `research/raw/parliament-activity/`.");
  lines.push("");
  lines.push("## Licentie");
  lines.push("");
  lines.push(`Opnieuw gecontroleerd op ${formatDutchDate(today)}: ${TK_LICENSE_PAGE} zegt \"Tenzij anders vermeld is op de inhoud van deze website en de middels de API's aangeboden data de Creative Commons Universeel (CC0 1.0) Publiek Domeinverklaring van toepassing.\" De titels (Zaak.Onderwerp) staan daarom letterlijk in de dataset.`);
  lines.push("");
  lines.push("## Wat erin staat");
  lines.push("");
  lines.push(`- Zaken waarvan de persoon indiener of medeindiener is (ZaakActor.Relatie), met Zaak.Soort Motie, Amendement, Initiatiefwetgeving, Wetgeving of Schriftelijke vragen. Mondelinge vragen, brieven en nota's vallen erbuiten.`);
  lines.push(`- Periode: vanaf ${formatDutchDate(TERM_START)}, de installatie van de Kamer na de verkiezing van 22-11-2023 (85 zetels in FractieZetelPersoon beginnen die dag). De huidige Kamer is geinstalleerd op ${formatDutchDate(CURRENT_TERM_START)} (69 zetels beginnen die dag). Datum van een item is Zaak.GestartOp.`);
  lines.push(`- Per persoon de ${MAX_ITEMS} recentste items; \`totals\` telt alle items in de periode per soort, ook boven de grens.`);
  lines.push("- Uitkomst alleen uit een Besluit met BesluitSoort \"Stemmen - aangenomen/verworpen/aangehouden/ingetrokken/vervallen\" en Status \"Besluit\". Een definitieve uitkomst gaat voor aangehouden. Geen besluit is geen uitkomst (null), niet een gok.");
  lines.push("- Medeindieners zijn als persoon-id gekoppeld wanneer hun TK-Persoon op dezelfde manier (naam plus geboortedatum) aan de dataset gekoppeld is; anders staan naam en fractie zoals de Kamer ze publiceert.");
  lines.push("");
  lines.push("## Openbare links");
  lines.push("");
  lines.push("Patronen bevestigd door een echt voorbeeld live op te halen (HTTP 200, paginatitel gelijk aan het onderwerp):");
  lines.push("");
  lines.push("- `https://www.tweedekamer.nl/kamerstukken/detail?id=<Zaak.Nummer>&did=<Document.DocumentNummer>`, voorbeeld https://www.tweedekamer.nl/kamerstukken/detail?id=2026Z17941&did=2026D40912 (motie), ook bevestigd voor schriftelijke vragen (2026Z19833) en een amendement (2026Z13411). Zonder `did` geeft de pagina een 404.");
  lines.push("- `https://www.tweedekamer.nl/kamerstukken/wetsvoorstellen/detail?cfg=wetsvoorsteldetails&qry=wetsvoorstel%3A<dossiernummer>`, voorbeeld dossier 37025.");
  lines.push("- `https://zoek.officielebekendmakingen.nl/kst-<dossier>-<nr>.html` werkt ook (bevestigd voor kst-23432-791 en kst-37020-7), maar is niet gebruikt: niet elk item is als Kamerstuk gepubliceerd en het patroon voor dossiers met een toevoeging is niet bevestigd.");
  lines.push("- Zonder documentnummer linkt het item naar het OData-record `Zaak(<Id>)`.");
  lines.push("");
  lines.push(`Links per soort: ${Object.entries(urlCounts).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
  lines.push("");
  lines.push("## Aantallen");
  lines.push("");
  lines.push("| Groep | Personen | Gekoppeld aan een TK-Persoon | Met items |");
  lines.push("| --- | --- | --- | --- |");
  for (const [group, row] of Object.entries(groups)) {
    lines.push(`| ${GROUP_LABELS[group]} | ${row.people} | ${row.matched} | ${row.withItems} |`);
  }
  lines.push("");
  lines.push(`Een persoon telt in de eerste passende groep van boven naar beneden (huidige of eerdere functie in de dataset). ${recordCount} personen hebben een record in \`data/activities.json\`, samen ${itemCount} items; het bestand is ${(bytes / 1024).toFixed(0)} kB.`);
  lines.push("");
  lines.push("| Soort | Items in het bestand | Totaal in de periode |");
  lines.push("| --- | --- | --- |");
  for (const kind of KIND_ORDER) lines.push(`| ${kind} | ${kindCounts.shown[kind]} | ${kindCounts.total[kind]} |`);
  lines.push("");
  lines.push(`Uitkomsten in het bestand: ${Object.entries(outcomeCounts).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
  lines.push("");
  lines.push("## Gaps");
  lines.push("");
  lines.push("- Eerste Kamer: het Gegevensmagazijn bevat alleen zaken van de Tweede Kamer. Eerste Kamerleden komen in ZaakActor alleen voor bij brieven (Functie \"Eerste Kamerlid\" of \"Voorzitter van de Eerste Kamer\", Zaak.Soort brief of overig; gecontroleerd op 25-09-2026 met `ZaakActor?$filter=contains(Functie,'Eerste Kamer')`, 85 rijen, geen motie). Moties en amendementen van senatoren staan niet in deze bron. Eerste Kamerleden die eerder Tweede Kamerlid waren, hebben alleen items uit hun tijd in de Tweede Kamer.");
  lines.push("- Bewindspersonen die nooit Kamerlid waren, hebben in het Gegevensmagazijn een Persoon-record zonder naam en zonder geboortedatum (bijvoorbeeld `Persoon(49b617db-cf37-4a99-91b9-210b4394fd81)`, dat in ZaakActor als \"H.W.M. Schoof\" voorkomt). Koppelen op naam alleen is niet toegestaan, dus hun wetsvoorstellen ontbreken.");
  lines.push("- Wetsvoorstellen van de regering waarbij een bewindspersoon in ZaakActor niet als indiener of medeindiener staat, ontbreken voor die persoon.");
  for (const gap of gaps) lines.push(`- ${gap}`);
  lines.push("");
  lines.push("### Niet gekoppeld (bewindspersonen en Tweede Kamerleden)");
  lines.push("");
  const important = unmatched.filter((row) => row.group === "bewindspersoon" || row.group === "tweede-kamerlid");
  if (important.length === 0) lines.push("Geen.");
  important.forEach((row, i) => lines.push(`${i + 1}. \`${row.person}\` (${row.name}, ${row.group}): ${row.reason}`));
  lines.push("");
  const counts = {};
  for (const row of unmatched) if (row.group !== "bewindspersoon" && row.group !== "tweede-kamerlid") counts[row.group] = (counts[row.group] ?? 0) + 1;
  lines.push(`Overige niet gekoppelde personen (geen Kamerlid of bewindspersoon in de dataset, meestal zonder TK-Persoon): ${Object.entries(counts).map(([g, n]) => `${GROUP_LABELS[g]} ${n}`).join(", ") || "geen"}. Per persoon in \`research/raw/parliament-activity/matches.json\`.`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

// ---------- run ----------

async function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(await readFile(path, "utf8"));
}

export async function runParliamentActivity(options = {}) {
  const root = options.root ?? REPO_ROOT;
  const dataDir = options.dataDir ?? join(root, "data");
  const cacheDir = options.cacheDir ?? join(root, "research", "raw", "parliament-activity");
  const portraitsDir = join(root, "research", "raw", "portraits");
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const offline = Boolean(options.offline);
  const refresh = Boolean(options.refresh) && !offline;
  const fetchOptions = {
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
    userAgent: options.userAgent ?? USER_AGENT,
    throttleMs: options.throttleMs ?? THROTTLE_MS,
  };
  const log = options.log ?? ((line) => console.log(line));

  const people = await readJson(join(dataDir, "people.json"), []);
  const memberships = await readJson(join(dataDir, "memberships.json"), []);
  const tenures = await readJson(join(dataDir, "tenures.json"), []);
  const positions = await readJson(join(dataDir, "positions.json"), []);
  const organizations = await readJson(join(dataDir, "organizations.json"), []);
  const sources = await readJson(join(dataDir, "sources.json"), []);
  const tkAll = await readJson(join(portraitsDir, "tk", "personen-alle.json"));
  if (!tkAll?.persons) throw new Error("research/raw/portraits/tk/personen-alle.json ontbreekt");
  const ekNames = (await readJson(join(portraitsDir, "deep", "ek-names.json"), { people: {} })).people ?? {};
  const reviews = (await readJson(join(portraitsDir, "review.json"), { people: {} })).people ?? {};
  const identities = (await readJson(join(portraitsDir, "deep", "identities.json"), {})) ?? {};
  const wikidataPath = join(cacheDir, "wikidata-geboortedata.json");
  const wikidataBirths = (await readJson(wikidataPath, null)) ?? {
    retrieved: today,
    note: "P569 (precisie dag) van de eigen Wikidata-entiteit van de persoon, alleen opgehaald wanneer de naam bij een TK-Persoon past en er geen andere geboortedatum is. null: geen volledige datum.",
    births: {},
  };

  const organizationsById = new Map(organizations.map((o) => [o.id, o]));
  const positionsById = new Map(positions.map((p) => [p.id, p]));
  const bewindspersonen = new Set(
    tenures.filter((t) => isBewindspersoonPosition(positionsById.get(t.position), organizationsById)).map((t) => t.person),
  );
  const tkMembers = new Set(memberships.filter((m) => m.organization === "org:tweede-kamer").map((m) => m.person));
  const ekMembers = new Set(memberships.filter((m) => m.organization === "org:eerste-kamer").map((m) => m.person));
  const groupSets = { bewindspersonen, tkMembers, ekMembers };

  const evidenceCache = new Map();
  const evidenceFor = (person) => {
    if (!evidenceCache.has(person.id)) {
      const portraitPath = join(portraitsDir, `${person.slug}.json`);
      let portrait = null;
      if (existsSync(portraitPath)) {
        try {
          portrait = JSON.parse(readFileSync(portraitPath, "utf8"));
        } catch {
          portrait = null;
        }
      }
      evidenceCache.set(person.id, personEvidence(person, {
        portrait,
        ekName: ekNames[person.slug] ?? null,
        review: reviews[person.slug] ?? null,
        identity: identities[person.slug] ?? null,
        wikidataBirth: person.wikidata ? wikidataBirths.births[person.wikidata] ?? null : null,
      }));
    }
    return evidenceCache.get(person.id);
  };
  let { matches, unmatched } = matchPeople(people, tkAll.persons, evidenceFor);

  // A name that matches a TK Persoon but has no birth date to test: read P569 of
  // the person's own Wikidata entity (set by the portraits pipeline), then match again.
  const needBirth = people.filter((p) => p.wikidata && /geen geboortedatum/.test(unmatched.get(p.id) ?? "") && !(p.wikidata in wikidataBirths.births));
  if (needBirth.length > 0 && !offline) {
    for (let i = 0; i < needBirth.length; i += 40) {
      const ids = needBirth.slice(i, i + 40).map((p) => p.wikidata);
      const url = `${WIKIDATA_API}?action=wbgetentities&format=json&props=claims&ids=${ids.join("|")}`;
      try {
        const body = await getJson(url, fetchOptions);
        for (const id of ids) wikidataBirths.births[id] = wikidataBirthDate(body?.entities?.[id]);
        wikidataBirths.retrieved = today;
      } catch (error) {
        log(`Wikidata niet op te halen: ${error.message}`);
      }
    }
    await mkdir(cacheDir, { recursive: true });
    await writeFile(wikidataPath, `${JSON.stringify(wikidataBirths, null, 1)}\n`, "utf8");
    evidenceCache.clear();
    ({ matches, unmatched } = matchPeople(people, tkAll.persons, evidenceFor));
  }
  const personByTkId = new Map([...matches.values()].map((m) => [m.persoon.Id, m.person.id]));
  log(`gekoppeld: ${matches.size} van ${people.length} personen`);

  await mkdir(join(cacheDir, "personen"), { recursive: true });
  const zakenPath = join(cacheDir, "zaken.json");
  const zakenCache = (await readJson(zakenPath, null)) ?? { retrieved: today, license: TK_LICENSE_PAGE, zaken: {} };
  const gaps = [];
  const perPerson = [];
  let fetched = 0;

  const ordered = [...matches.values()].sort((a, b) => a.person.id.localeCompare(b.person.id));
  for (const match of ordered) {
    const tkId = match.persoon.Id;
    const listPath = join(cacheDir, "personen", `${tkId}.json`);
    let list = await readJson(listPath, null);
    const url = actorListUrl(tkId);
    if (!list || refresh) {
      if (offline) {
        gaps.push(`\`${match.person.id}\`: geen ruwe ZaakActor-lijst in de cache en de run was offline.`);
        continue;
      }
      try {
        const rows = await getAllPages(url, fetchOptions);
        list = { retrieved: today, license: TK_LICENSE_PAGE, person: match.person.id, tkPersoon: tkId, url, value: rows };
        await writeFile(listPath, `${JSON.stringify(list)}\n`, "utf8");
        fetched += 1;
      } catch (error) {
        gaps.push(`\`${match.person.id}\`: ZaakActor-lijst niet op te halen (${error.message}).`);
        continue;
      }
    }
    const entries = listEntries(list.value);
    perPerson.push({ match, list, entries, recent: entries.slice(0, options.maxItems ?? MAX_ITEMS) });
  }
  log(`ZaakActor-lijsten: ${perPerson.length} (${fetched} opgehaald)`);

  // Details voor alle zaken die in het bestand komen; een zaak die al in de cache staat wordt niet opnieuw opgehaald.
  const needed = new Set(perPerson.flatMap((row) => row.recent.map((entry) => entry.zaakId)));
  const missing = [...needed].filter((id) => refresh ? true : !zakenCache.zaken[id]);
  if (missing.length > 0 && !offline) {
    log(`zaakdetails ophalen: ${missing.length}`);
    for (let i = 0; i < missing.length; i += DETAIL_CHUNK) {
      const chunk = missing.slice(i, i + DETAIL_CHUNK);
      try {
        const rows = await getAllPages(zaakDetailUrl(chunk), fetchOptions);
        for (const row of rows) zakenCache.zaken[row.Id] = row;
      } catch (error) {
        gaps.push(`Zaakdetails voor ${chunk.length} zaken niet op te halen (${error.message}).`);
      }
      if ((i / DETAIL_CHUNK) % 25 === 0) await writeFile(zakenPath, `${JSON.stringify(zakenCache)}\n`, "utf8");
    }
    zakenCache.retrieved = today;
  }
  // Only keep the zaken the dataset uses, so the cache does not grow without bound.
  const kept = {};
  for (const id of [...needed].sort()) if (zakenCache.zaken[id]) kept[id] = zakenCache.zaken[id];
  zakenCache.zaken = kept;
  await writeFile(zakenPath, `${JSON.stringify(zakenCache)}\n`, "utf8");

  const records = [];
  const newSources = [];
  const urlCounts = { "tweedekamer.nl detail": 0, "tweedekamer.nl wetsvoorstel": 0, "OData-record": 0 };
  let missingDetails = 0;
  for (const { match, list, entries, recent } of perPerson) {
    const tkId = match.persoon.Id;
    const items = [];
    for (const entry of recent) {
      const zaak = zakenCache.zaken[entry.zaakId];
      if (!zaak) {
        missingDetails += 1;
        continue;
      }
      const item = buildItem(zaak, entry.role, tkId, personByTkId);
      if (!item) continue;
      if (item.url.startsWith(TK_BILL_URL)) urlCounts["tweedekamer.nl wetsvoorstel"] += 1;
      else if (item.url.startsWith(TK_DETAIL_URL)) urlCounts["tweedekamer.nl detail"] += 1;
      else urlCounts["OData-record"] += 1;
      items.push(item);
    }
    const sourceId = `src:tk-activiteit-${match.person.slug}`;
    newSources.push({
      id: sourceId,
      url: list.url,
      title: `Zaken met ${tkFullName(match.persoon)} als indiener of medeindiener (TK-Persoon ${tkId})`,
      publisher: "Tweede Kamer der Staten-Generaal",
      type: "api",
      published: null,
      retrieved: list.retrieved,
      license: "CC0-1.0",
      archiveUrl: null,
      notes: `Gegevensmagazijn van de Tweede Kamer (OData v4), ZaakActor met Relatie Indiener of Medeindiener en Zaak.Soort Motie, Amendement, Initiatiefwetgeving, Wetgeving of Schriftelijke vragen, vanaf ${formatDutchDate(TERM_START)}; details per zaak via ${TK_ODATA}/Zaak. Identiteit: ${match.identity}. Licentie: CC0 1.0 volgens ${TK_LICENSE_PAGE}, gecontroleerd op ${formatDutchDate(today)}.`,
    });
    records.push({
      id: `activities:${match.person.slug}`,
      person: match.person.id,
      tkPersoon: tkId,
      since: TERM_START,
      totals: totalsOf(entries),
      items,
      source: { source: sourceId, retrieved: list.retrieved, confidence: "high" },
    });
  }
  if (missingDetails > 0) gaps.push(`${missingDetails} items zonder zaakdetails in de cache zijn weggelaten.`);
  records.sort((a, b) => a.id.localeCompare(b.id));

  // Bronnen: eigen records vervangen, de rest blijft staan.
  const own = new Set(newSources.map((s) => s.id));
  const mergedSources = [...sources.filter((s) => !own.has(s.id)), ...newSources].sort((a, b) => a.id.localeCompare(b.id));

  const body = serializeActivities(records);
  if (!options.dryRun) {
    await writeFile(join(dataDir, "activities.json"), body, "utf8");
    await writeFile(join(dataDir, "sources.json"), `${JSON.stringify(mergedSources, null, 2)}\n`, "utf8");
  }

  // Rapport en koppelingen.
  const groups = {};
  for (const group of Object.keys(GROUP_LABELS)) groups[group] = { people: 0, matched: 0, withItems: 0 };
  const recordByPerson = new Map(records.map((r) => [r.person, r]));
  const unmatchedRows = [];
  const matchRows = {};
  for (const person of people) {
    const group = personGroup(person.id, groupSets);
    groups[group].people += 1;
    if (matches.has(person.id)) {
      groups[group].matched += 1;
      if ((recordByPerson.get(person.id)?.items.length ?? 0) > 0) groups[group].withItems += 1;
      matchRows[person.id] = { group, tkPersoon: matches.get(person.id).persoon.Id, identity: matches.get(person.id).identity };
    } else {
      const reason = unmatched.get(person.id) ?? "onbekend";
      unmatchedRows.push({ person: person.id, name: person.name, group, reason });
      matchRows[person.id] = { group, tkPersoon: null, reason };
    }
  }
  await writeFile(join(cacheDir, "matches.json"), `${JSON.stringify({ retrieved: today, rule: "volledige naam plus geboortedatum, nooit naam alleen", people: matchRows }, null, 1)}\n`, "utf8");

  const kindCounts = { shown: totalsOf([]), total: totalsOf([]) };
  const outcomeCounts = {};
  for (const record of records) {
    for (const kind of KIND_ORDER) kindCounts.total[kind] += record.totals[kind];
    for (const item of record.items) {
      kindCounts.shown[item.kind] += 1;
      const key = item.outcome ?? "geen";
      outcomeCounts[key] = (outcomeCounts[key] ?? 0) + 1;
    }
  }
  const report = renderReport({
    today,
    groups,
    kindCounts,
    outcomeCounts,
    unmatched: unmatchedRows,
    gaps,
    bytes: Buffer.byteLength(body),
    recordCount: records.length,
    itemCount: records.reduce((n, r) => n + r.items.length, 0),
    urlCounts,
  });
  if (!options.dryRun) {
    await mkdir(join(root, "research", "qa"), { recursive: true });
    await writeFile(join(root, "research", "qa", `parliament-activity-${formatDutchDate(today)}.md`), report, "utf8");
  }
  log(`klaar: ${records.length} personen, ${Buffer.byteLength(body)} bytes`);
  return { records, sources: newSources, groups, kindCounts, gaps, unmatched: unmatchedRows };
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--offline") options.offline = true;
    else if (argv[i] === "--refresh") options.refresh = true;
    else if (argv[i] === "--today") options.today = argv[(i += 1)];
    else if (argv[i] === "--throttle") options.throttleMs = Number(argv[(i += 1)]);
    else if (argv[i] === "--dry-run") options.dryRun = true;
  }
  return options;
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  runParliamentActivity(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(`parliament-activity failed: ${error.message}`);
    process.exitCode = 1;
  });
}
