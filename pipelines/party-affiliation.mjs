#!/usr/bin/env bun
// Partij van bewindspersonen en fractievoorzitters van de Eerste Kamer.
//
// 1. Partij (`party` in data/people.json) van elke huidige minister en
//    staatssecretaris. Bron: de eigen pagina op rijksoverheid.nl
//    (/regering/bewindspersonen/<slug>, de regel "Partij: D66"), confidence
//    high. Staat daar geen partij, dan parlement.com (/id/<id>/<slug>) als
//    fallback met confidence medium, maar alleen voor wie in
//    research/raw/party-affiliation/parlement.json een beoordeelde
//    parlement.com-URL heeft. Wie geen partij heeft of voor wie geen bron een
//    partij noemt, houdt `party: null` en verschijnt als benoemde gap.
//    Partijnamen volgen de namen die data/people.json al voor Kamerleden
//    gebruikt (PARTY_LABELS); een onbekende naam is een gap, geen gok.
// 2. Fractievoorzitters van de Eerste Kamer. Bron: de fractiepagina's op
//    eerstekamer.nl (/fractie/<slug>, blok Fractiebestuur, "fractievoorzitter:
//    <naam> (sinds <datum>)"). Opgeslagen zoals de Tweede Kamer-
//    fractievoorzitters: een positie per fractie (pos:ek-fractievoorzitter-<fractie>,
//    organisatie org:eerste-kamer, titel "Fractievoorzitter <fractie>"), een
//    office-relatie naar org:eerste-kamer en een tenure per persoon. De
//    persoon wordt gevonden via de URL van zijn ledenpagina, die al als bron
//    in data/sources.json staat; de fractienaam komt uit de open membership.
//    Een eerdere open tenure op dezelfde positie wordt niet gesloten (geen
//    einddatum afleiden uit een opvolger); dat wordt een gap.
//
// Volgorde en overleven van een refresh. De pipeline draait na
// `bun run refresh-official` en `bun run merge`, net als pipelines/portraits.mjs,
// en schrijft rechtstreeks in data/. Bij de volgende nachtelijke run blijven
// de velden staan:
//  - refresh-official kloont bestaande persoonsrecords (met `party`) in zijn
//    envelope en sluit alleen tenures op posities van org:ministerie-*; de
//    posities en tenures onder org:eerste-kamer raakt hij niet.
//  - merge houdt data/-records zonder research-tegenhanger als basisrecord, dus
//    de EK-posities, -tenures, -relaties en alle bronrecords blijven. Wint een
//    research-record zonder `party` het id van een persoon, dan zet
//    carryForwardEnrichment in pipelines/merge.mjs `party` terug, samen met de
//    bronverwijzing, zolang het vorige record een bron uit
//    PARTY_SOURCE_PREFIXES draagt.
//  - Een tweede run is idempotent en zonder netwerk mogelijk: alle pagina's
//    staan in research/raw/party-affiliation/ (`--offline` gebruikt alleen de
//    cache, `--refresh` haalt alles opnieuw op).
//
// Uitvoer: data/people.json, positions.json, tenures.json, relations.json,
// sources.json en research/raw/party-affiliation/report.json (tellingen en gaps).
//
// No dependencies. Node ESM only.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  decodeEntities,
  normalizeName,
  slugify,
  buildPersonIndex,
  resolvePerson,
  parseRijksoverheidBewindspersonen,
  cabinetPositionIds,
} from "./refresh-official.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
export const THROTTLE_MS = 500;
export const RIJKSOVERHEID_BASE = "https://www.rijksoverheid.nl";
export const RIJKSOVERHEID_OVERVIEW = `${RIJKSOVERHEID_BASE}/regering/bewindspersonen`;
export const EK_BASE = "https://www.eerstekamer.nl";
export const EK_FRACTIES = `${EK_BASE}/fracties`;
export const CACHE_DIR = "research/raw/party-affiliation";

/**
 * Source id prefixes that back a `party` value; merge.mjs carries `party` forward
 * only when the person cites one of these. A bewindspersoon page on rijksoverheid.nl
 * already has a record under src:rijksoverheid-<slug> or src:k-bewindspersoon-<slug>
 * (one record per URL), which is reused; new ones get src:rijksoverheid-bewindspersoon-<slug>.
 */
export const PARTY_SOURCE_PREFIXES = Object.freeze(["src:rijksoverheid-", "src:k-bewindspersoon-", "src:parlement-"]);

// Label as a source writes it -> label as data/people.json writes it for Kamerleden.
export const PARTY_LABELS = Object.freeze({
  PVV: "PVV",
  VVD: "VVD",
  D66: "D66",
  CDA: "CDA",
  JA21: "JA21",
  BBB: "BBB",
  SGP: "SGP",
  SP: "SP",
  FVD: "FVD",
  DENK: "DENK",
  Volt: "Volt",
  PvdD: "PvdD",
  "Partij voor de Dieren": "PvdD",
  "50PLUS": "50PLUS",
  NSC: "NSC",
  ChristenUnie: "ChristenUnie",
  CU: "ChristenUnie",
  PRO: "PRO",
  "GroenLinks-PvdA": "PRO",
  "GL-PvdA": "PRO",
  "GL/PvdA": "PRO",
  "Forum voor Democratie": "FVD",
  BoerBurgerBeweging: "BBB",
});

const NON_PARTY = /^(partijloos|geen|geen partij|onafhankelijk)$/i;

const MONTHS = {
  januari: "01", februari: "02", maart: "03", april: "04", mei: "05", juni: "06",
  juli: "07", augustus: "08", september: "09", oktober: "10", november: "11", december: "12",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- parsing ----------

function htmlToLines(html) {
  const text = String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n");
  return decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * The party a rijksoverheid.nl bewindspersoon page states in its personal line
 * ("Geboren op ..., partner. Partij: D66", "... Partij D66." or "... Partijloos."),
 * or null. Only the line that starts with "Geboren" counts, so a party named in
 * the career history is never read as the current party.
 */
export function parseRijksoverheidParty(html) {
  for (const line of htmlToLines(html)) {
    if (!/^Geboren\b/i.test(line)) continue;
    if (/(?:^|[.,;]\s*)Partijloos\b/i.test(line)) return "partijloos";
    const match = /(?:^|[.,;]\s*)Partij:?\s+([^.,;]+?)\s*(?:[.,;]|$)/.exec(line);
    if (match) return match[1].trim();
  }
  return null;
}

/** The party a parlement.com page states in its "partij" row, or null. */
export function parseParlementParty(html) {
  const lines = htmlToLines(html);
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (/^partij(?:\s*\/\s*fractie)?:?$/i.test(lines[i])) return lines[i + 1];
  }
  return null;
}

/** Map a source's party label to the dataset label. Returns { party } or { nonParty } or { unknown }. */
export function mapPartyLabel(label) {
  if (typeof label !== "string" || label.trim() === "") return { unknown: null };
  const value = label.trim();
  if (NON_PARTY.test(value)) return { nonParty: value };
  if (PARTY_LABELS[value] !== undefined) return { party: PARTY_LABELS[value] };
  return { unknown: value };
}

/** Dutch date "13 juni 2023" -> "2023-06-13", or null. */
export function parseDutchDate(text) {
  const match = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/i.exec(String(text ?? "").replace(/ /g, " "));
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${month}-${match[1].padStart(2, "0")}`;
}

/** Fractie page links on eerstekamer.nl/fracties. */
export function parseEkFractieLinks(html) {
  const out = [];
  const seen = new Set();
  for (const match of String(html ?? "").matchAll(/href="\/fractie\/([a-z0-9_]+)"/g)) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    out.push(match[1]);
  }
  return out;
}

/** The fractievoorzitter on an eerstekamer.nl fractie page: { href, name, since } or null. */
export function parseEkFractievoorzitter(html) {
  const text = decodeEntities(String(html ?? "")).replace(/ /g, " ");
  const match = /(?:^|[^-])fractievoorzitter:\s*<a href="(\/persoon\/[^"]+)"[^>]*>([^<]+)<\/a>\s*(?:\(sinds\s*([^)]+)\))?/i.exec(text);
  if (!match) return null;
  return { href: match[1], name: match[2].trim(), since: match[3] ? parseDutchDate(match[3]) : null };
}

/** The fractie name as the page title gives it, for reports only. */
export function parseEkFractieTitle(html) {
  const match = /<title>([^<]+)<\/title>/i.exec(String(html ?? ""));
  return match ? decodeEntities(match[1]).replace(/\s*-\s*Eerste Kamer.*$/i, "").trim() : null;
}

// ---------- fetching ----------

async function readCached(path) {
  if (!existsSync(path)) return null;
  return readFile(path, "utf8");
}

export function makeFetcher({ root = REPO_ROOT, offline = false, refresh = false, fetchImpl = globalThis.fetch, log = () => {} } = {}) {
  let last = 0;
  return async function get(url, cacheName) {
    const path = join(root, CACHE_DIR, cacheName);
    if (!refresh) {
      const cached = await readCached(path);
      if (cached !== null) return { ok: true, html: cached, cached: true };
    }
    if (offline) return { ok: false, error: "offline en niet in de cache" };
    const wait = last + THROTTLE_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const response = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, redirect: "follow" });
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
      const html = await response.text();
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, html, "utf8");
      log(`  opgehaald ${url}`);
      return { ok: true, html, cached: false };
    } catch (error) {
      return { ok: false, error: String(error?.message ?? error) };
    }
  };
}

// ---------- planning ----------

function sourceRef(id, retrieved, confidence) {
  return { source: id, retrieved, confidence };
}

/**
 * One source record per URL: an existing record with the same URL (or the same
 * id) is reused and only gets the new retrieval date; otherwise the record is added.
 * Returns the id to reference.
 */
export function upsertSource(sources, record) {
  const index = sources.findIndex((source) => source.url === record.url || source.id === record.id);
  if (index === -1) {
    sources.push(record);
    return record.id;
  }
  const existing = sources[index];
  sources[index] = {
    ...existing,
    retrieved: record.retrieved,
    license: existing.license ?? record.license ?? null,
    notes: existing.notes ?? record.notes ?? null,
  };
  return existing.id;
}

function addPersonRef(person, ref) {
  if (!Array.isArray(person.sources)) person.sources = [];
  const existing = person.sources.find((entry) => entry && entry.source === ref.source);
  if (existing) Object.assign(existing, ref);
  else person.sources.push(ref);
}

function gap(what, why, endpoint, resume) {
  return { what, why, endpoint, resume };
}

/**
 * Current bewindspersonen: people on the rijksoverheid.nl overview, plus anyone
 * with an open tenure on a minister or staatssecretaris position of a ministerie
 * (or minister-president) who is not on it.
 */
export function currentBewindspersonen({ overview, people, positions, tenures }) {
  const index = buildPersonIndex(people);
  const bySlug = new Map(people.map((person) => [person.slug, person]));
  const cabinet = new Set([...cabinetPositionIds(positions), "pos:minister-president", "pos:vice-minister-president"]);
  const holders = new Set(tenures.filter((t) => t && t.end == null && cabinet.has(t.position)).map((t) => t.person));
  const out = [];
  const unresolved = [];
  const seen = new Set();
  for (const entry of overview) {
    let match = resolvePerson(entry.name, index);
    let personId = match.status === "matched" ? match.id : null;
    if (!personId && bySlug.has(entry.slug)) personId = bySlug.get(entry.slug).id;
    if (!personId) {
      const holderMatch = [...holders].filter((id) => id.replace(/^person:/, "").startsWith(entry.slug));
      if (holderMatch.length === 1) personId = holderMatch[0];
    }
    if (!personId) {
      unresolved.push(entry);
      continue;
    }
    seen.add(personId);
    out.push({ personId, rijksoverheidSlug: entry.slug, url: entry.url, name: entry.name, role: entry.role });
  }
  const missing = [...holders].filter((id) => !seen.has(id)).sort();
  return { bewindspersonen: out, unresolved, missing };
}

export async function planPartyAffiliation({ dataset, get, today, parlement = {} }) {
  const people = structuredClone(dataset.people);
  const positions = structuredClone(dataset.positions);
  const tenures = structuredClone(dataset.tenures);
  const relations = structuredClone(dataset.relations);
  const memberships = dataset.memberships;
  const sources = structuredClone(dataset.sources);
  const personById = new Map(people.map((person) => [person.id, person]));
  const gaps = [];
  const stats = { bewindspersonen: 0, partyHigh: 0, partyMedium: 0, partyNull: 0, ekFracties: 0, ekLeaders: 0, ekNewTenures: 0, ekNewPositions: 0 };
  const filled = [];

  // --- 1. party of bewindspersonen ---
  const overviewPage = await get(RIJKSOVERHEID_OVERVIEW, "rijksoverheid/bewindspersonen.html");
  if (!overviewPage.ok) throw new Error(`rijksoverheid.nl overzicht niet bereikbaar: ${overviewPage.error}`);
  const overview = parseRijksoverheidBewindspersonen(overviewPage.html);
  if (overview.length === 0) throw new Error("rijksoverheid.nl overzicht bevat geen bewindspersonen; layout gewijzigd?");
  const { bewindspersonen, unresolved, missing } = currentBewindspersonen({ overview, people, positions, tenures });
  for (const entry of unresolved) {
    gaps.push(gap(`Persoon voor ${entry.name} (${entry.role})`, "naam van rijksoverheid.nl niet eenduidig in data/people.json", entry.url, "Voeg een alias toe in data/people.json."));
  }
  for (const personId of missing) {
    gaps.push(gap(`Partij van ${personById.get(personId)?.name ?? personId}`, "open tenure als bewindspersoon, maar niet op het overzicht van rijksoverheid.nl", RIJKSOVERHEID_OVERVIEW, "Controleer of de tenure gesloten moet worden (bron nodig) of zoek de partij op parlement.com."));
  }
  stats.bewindspersonen = bewindspersonen.length;
  for (const entry of bewindspersonen) {
    const person = personById.get(entry.personId);
    const page = await get(entry.url, `rijksoverheid/${entry.rijksoverheidSlug}.html`);
    let label = null;
    let source = null;
    if (page.ok) {
      label = parseRijksoverheidParty(page.html);
      if (label !== null) {
        source = {
          id: `src:rijksoverheid-bewindspersoon-${entry.rijksoverheidSlug}`,
          url: entry.url,
          title: `${entry.name} - ${entry.role}`,
          publisher: "Rijksoverheid",
          type: "page",
          published: null,
          retrieved: today,
          license: "CC0-1.0",
          archiveUrl: null,
          notes: `Persoonspagina van de bewindspersoon; noemt "Partij: ${label}".`,
          confidence: "high",
        };
      }
    }
    if (label === null && parlement[entry.personId]) {
      const url = parlement[entry.personId];
      const pslug = url.replace(/\/$/, "").split("/").pop();
      const ppage = await get(url, `parlement/${pslug}.html`);
      const plabel = ppage.ok ? parseParlementParty(ppage.html) : null;
      if (plabel) {
        label = plabel;
        source = {
          id: `src:parlement-persoon-${pslug}`,
          url,
          title: `${entry.name} - Parlement.com`,
          publisher: "Parlementair Documentatie Centrum (Parlement.com)",
          type: "page",
          published: null,
          retrieved: today,
          license: null,
          archiveUrl: null,
          notes: `Biografie op parlement.com; noemt partij "${plabel}". Fallback omdat rijksoverheid.nl geen partij noemt.`,
          confidence: "medium",
        };
      }
    }
    const mapped = mapPartyLabel(label);
    if (mapped.party) {
      const { confidence, ...record } = source;
      const sourceId = upsertSource(sources, record);
      person.party = mapped.party;
      addPersonRef(person, sourceRef(sourceId, today, confidence));
      if (confidence === "high") stats.partyHigh += 1;
      else stats.partyMedium += 1;
      filled.push({ person: person.id, name: person.name, party: mapped.party, source: sourceId, confidence });
      if (!PARTY_SOURCE_PREFIXES.some((prefix) => sourceId.startsWith(prefix))) {
        gaps.push(gap(`Bron voor de partij van ${person.name}`, `bron-id ${sourceId} valt buiten PARTY_SOURCE_PREFIXES; merge zet de partij dan niet terug`, entry.url, "Voeg het prefix toe aan PARTY_SOURCE_PREFIXES."));
      }
      continue;
    }
    stats.partyNull += 1;
    if (person.party != null && person.party !== "partijloos") {
      // Leave an earlier sourced value alone; report it.
      gaps.push(gap(`Partij van ${person.name}`, `rijksoverheid.nl noemt geen partij; bestaande waarde ${person.party} blijft staan`, entry.url, "Controleer de bestaande bron."));
      continue;
    }
    person.party = null;
    if (mapped.nonParty) {
      const { confidence, ...record } = source;
      addPersonRef(person, sourceRef(upsertSource(sources, record), today, confidence));
      gaps.push(gap(`Partij van ${person.name}`, `geen partij: de bron noemt "${mapped.nonParty}"`, entry.url, "Geen actie; party blijft null."));
    } else if (mapped.unknown) {
      gaps.push(gap(`Partij van ${person.name}`, `onbekende partijnaam "${mapped.unknown}" staat niet in PARTY_LABELS`, entry.url, "Voeg de naam toe aan PARTY_LABELS als de partij in de dataset bestaat."));
    } else {
      gaps.push(gap(`Partij van ${person.name}`, page.ok ? "de pagina op rijksoverheid.nl noemt geen partij en er is geen beoordeelde parlement.com-pagina" : `pagina niet bereikbaar (${page.error})`, entry.url, "Voeg een parlement.com-URL toe in research/raw/party-affiliation/parlement.json en draai opnieuw."));
    }
  }

  // --- 2. Eerste Kamer fractievoorzitters ---
  const fractiesPage = await get(EK_FRACTIES, "eerstekamer/fracties.html");
  if (!fractiesPage.ok) throw new Error(`eerstekamer.nl/fracties niet bereikbaar: ${fractiesPage.error}`);
  const fractieSlugs = parseEkFractieLinks(fractiesPage.html);
  if (fractieSlugs.length === 0) throw new Error("eerstekamer.nl/fracties bevat geen fracties; layout gewijzigd?");
  stats.ekFracties = fractieSlugs.length;
  const sourceIdByUrl = new Map(sources.map((source) => [source.url, source.id]));
  const openEk = memberships.filter((m) => m && m.organization === "org:eerste-kamer" && m.end == null);
  const ekByPerson = new Map(openEk.map((m) => [m.person, m]));
  const personBySourceId = new Map();
  for (const m of openEk) if (m.source?.source) personBySourceId.set(m.source.source, m.person);
  for (const person of people) {
    for (const ref of person.sources ?? []) {
      if (ref?.source?.startsWith("src:ek-persoon-") && ekByPerson.has(person.id) && !personBySourceId.has(ref.source)) personBySourceId.set(ref.source, person.id);
    }
  }
  const positionIds = new Set(positions.map((p) => p.id));
  const tenureIds = new Set(tenures.map((t) => t.id));
  const relationIds = new Set(relations.map((r) => r.id));
  const leaders = [];

  for (const fslug of fractieSlugs) {
    const url = `${EK_BASE}/fractie/${fslug}`;
    const page = await get(url, `eerstekamer/fractie-${fslug}.html`);
    if (!page.ok) {
      gaps.push(gap(`Fractievoorzitter van fractie ${fslug}`, `pagina niet bereikbaar (${page.error})`, url, "Draai opnieuw met --refresh."));
      continue;
    }
    const title = parseEkFractieTitle(page.html) ?? fslug;
    const leader = parseEkFractievoorzitter(page.html);
    if (!leader) {
      gaps.push(gap(`Fractievoorzitter van ${title}`, "de fractiepagina noemt geen fractievoorzitter", url, "Geen actie tot de pagina een fractievoorzitter noemt."));
      continue;
    }
    const memberUrl = `${EK_BASE}${leader.href}`;
    const memberSourceId = sourceIdByUrl.get(memberUrl);
    const personId = memberSourceId ? personBySourceId.get(memberSourceId) : null;
    const membership = personId ? ekByPerson.get(personId) : null;
    if (!personId || !membership) {
      gaps.push(gap(`Fractievoorzitter van ${title}: ${leader.name}`, "geen persoon met een open Eerste Kamerlidmaatschap en deze ledenpagina als bron", memberUrl, "Voer eerst refresh-official uit of voeg de persoon toe."));
      continue;
    }
    const fractie = membership.fractie;
    if (!fractie) {
      gaps.push(gap(`Fractievoorzitter van ${title}: ${leader.name}`, "de membership heeft geen fractie", memberUrl, "Vul de fractie in via refresh-official."));
      continue;
    }
    const retrieved = today;
    const sourceId = upsertSource(sources, {
      id: `src:ek-fractie-${slugify(fslug)}`,
      url,
      title: `${title} - fractiepagina Eerste Kamer`,
      publisher: "Eerste Kamer",
      type: "page",
      published: null,
      retrieved,
      license: "CC-BY-4.0",
      archiveUrl: null,
      notes: `Fractiebestuur: fractievoorzitter ${leader.name}${leader.since ? ` sinds ${leader.since}` : ""}.`,
    });
    const ref = sourceRef(sourceId, retrieved, "high");
    const fkey = slugify(fractie);
    const positionId = `pos:ek-fractievoorzitter-${fkey}`;
    if (!positionIds.has(positionId)) {
      positions.push({
        id: positionId,
        slug: positionId.replace(/^pos:/, ""),
        title: `Fractievoorzitter ${fractie}`,
        organization: "org:eerste-kamer",
        type: "elected",
        fillMethod: "benoeming-door-college",
        entryModes: ["gekozen"],
        termLengthMonths: null,
        seatsCount: 1,
        exOfficioOf: [],
        sources: [ref],
        aliases: [`Fractievoorzitter ${fractie} Eerste Kamer`],
      });
      positionIds.add(positionId);
      stats.ekNewPositions += 1;
    } else {
      const position = positions.find((p) => p.id === positionId);
      if (!position.sources.some((s) => s.source === sourceId)) position.sources.push(ref);
      else Object.assign(position.sources.find((s) => s.source === sourceId), ref);
    }
    const relationId = `rel:office-ek-fractievoorzitter-${fkey}`;
    if (!relationIds.has(relationId)) {
      relations.push({ id: relationId, from: positionId, to: "org:eerste-kamer", type: "office", metadata: {}, seatsAppointed: 0, source: ref });
      relationIds.add(relationId);
    }
    const personSlug = personId.replace(/^person:/, "");
    const openOnPosition = tenures.filter((t) => t.position === positionId && t.end == null);
    let tenure = openOnPosition.find((t) => t.person === personId);
    if (!tenure) {
      const tenureId = `tenure:fvp-ek-fractievoorzitter-${fkey}-${personSlug}-${(leader.since ?? "onbekend").replace(/-/g, "")}`;
      const predecessor = openOnPosition.length === 1 ? openOnPosition[0].id : null;
      for (const other of openOnPosition) {
        gaps.push(gap(`Einde van ${other.id}`, `eerstekamer.nl noemt nu ${leader.name} als fractievoorzitter; een einddatum wordt niet afgeleid`, url, "Zoek de einddatum in een bron en sluit de tenure."));
      }
      tenure = {
        id: tenureId,
        person: personId,
        position: positionId,
        seat: null,
        start: leader.since,
        end: null,
        acting: false,
        entryMode: "gekozen",
        appointedBy: null,
        predecessor,
        successor: null,
        endReason: null,
        source: ref,
      };
      if (!tenureIds.has(tenureId)) {
        tenures.push(tenure);
        tenureIds.add(tenureId);
        stats.ekNewTenures += 1;
      }
      if (!leader.since) gaps.push(gap(`Startdatum fractievoorzitterschap ${leader.name}`, "de fractiepagina noemt geen datum", url, "Zoek de datum op de ledenpagina."));
    } else {
      tenure.source = ref;
      if (tenure.start == null && leader.since) tenure.start = leader.since;
    }
    stats.ekLeaders += 1;
    leaders.push({ fractie, person: personId, name: personById.get(personId)?.name ?? leader.name, since: leader.since, source: sourceId });
  }

  const byId = (a, b) => String(a.id).localeCompare(String(b.id));
  positions.sort(byId);
  tenures.sort(byId);
  relations.sort(byId);
  sources.sort(byId);
  return { people, positions, tenures, relations, sources, gaps, stats, filled, leaders };
}

// ---------- run ----------

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

export async function runPartyAffiliation({ root = REPO_ROOT, offline = false, refresh = false, today = new Date().toISOString().slice(0, 10), fetchImpl, log = console.log } = {}) {
  const dataDir = join(root, "data");
  const dataset = {};
  for (const name of ["people", "positions", "tenures", "relations", "memberships", "sources"]) {
    dataset[name] = await readJson(join(dataDir, `${name}.json`), []);
  }
  const parlement = (await readJson(join(root, CACHE_DIR, "parlement.json"), { people: {} })).people ?? {};
  const get = makeFetcher({ root, offline, refresh, fetchImpl, log });
  const plan = await planPartyAffiliation({ dataset, get, today, parlement });
  for (const name of ["people", "positions", "tenures", "relations", "sources"]) {
    await writeFile(join(dataDir, `${name}.json`), `${JSON.stringify(plan[name], null, 2)}\n`, "utf8");
  }
  const report = { generated: today, stats: plan.stats, filled: plan.filled, leaders: plan.leaders, gaps: plan.gaps };
  await mkdir(join(root, CACHE_DIR), { recursive: true });
  await writeFile(join(root, CACHE_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  log(`bewindspersonen ${plan.stats.bewindspersonen}: partij high ${plan.stats.partyHigh}, medium ${plan.stats.partyMedium}, null ${plan.stats.partyNull}`);
  log(`EK-fracties ${plan.stats.ekFracties}: fractievoorzitters ${plan.stats.ekLeaders}, nieuwe tenures ${plan.stats.ekNewTenures}, nieuwe posities ${plan.stats.ekNewPositions}`);
  log(`gaps ${plan.gaps.length}`);
  return plan;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = new Set(process.argv.slice(2));
  runPartyAffiliation({ offline: args.has("--offline"), refresh: args.has("--refresh") }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
