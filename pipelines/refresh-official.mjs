#!/usr/bin/env bun
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
export const THROTTLE_MS = 1000;
export const DEFAULT_MAX_CLOSURES = 5;

export const RIJKSOVERHEID_URL = "https://www.rijksoverheid.nl/regering/bewindspersonen";
export const EERSTE_KAMER_URL = "https://www.eerstekamer.nl/alle_leden";
export const TK_ODATA_URL =
  "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/FractieZetelPersoon" +
  "?$filter=TotEnMet eq null&$expand=Persoon,FractieZetel($expand=Fractie)&$format=json&$top=250";

const RAW_RIJKSOVERHEID = "research/raw/P/rijksoverheid-bewindspersonen.html";
const RAW_EERSTE_KAMER = "research/raw/P/eerstekamer-alle-leden.html";
const RAW_TWEDE_KAMER = "research/raw/P/tk-fractiezetelpersoon.json";

const SOURCE_DEFS = {
  bewindspersonen: {
    id: "src:rijksoverheid-bewindspersonen",
    url: RIJKSOVERHEID_URL,
    title: "Bewindspersonen",
    publisher: "Rijksoverheid",
    type: "page",
    license: "CC0-1.0",
    notes: "Overzichtspagina met de huidige ministers en staatssecretarissen.",
  },
  eersteKamer: {
    id: "src:ek-alle-leden",
    url: EERSTE_KAMER_URL,
    title: "Alle leden",
    publisher: "Eerste Kamer",
    type: "page",
    license: "CC-BY-4.0",
    notes: "Overzicht van de 75 huidige Eerste Kamerleden met fractie en ancienniteit.",
  },
  tweedeKamer: {
    id: "src:tk-odata-fractiezetelpersonen-expand",
    url: TK_ODATA_URL,
    title: "FractieZetelPersoon (huidige leden, met Persoon en Fractie)",
    publisher: "Tweede Kamer OData API",
    type: "api",
    license: "CC0-1.0",
    notes:
      "OData v4, $filter=TotEnMet eq null met $expand=Persoon,FractieZetel($expand=Fractie). De filter alleen levert ook 7 verwijderde tombstones; die worden overgeslagen.",
  },
};

export class ClosureThresholdError extends Error {
  constructor(count, max) {
    super(
      `closure safety check failed: ${count} sluitingen overschrijden de drempel van ${max}. ` +
        "Mogelijk is een bronlayout gewijzigd; er is niets geschreven.",
    );
    this.name = "ClosureThresholdError";
    this.count = count;
    this.max = max;
  }
}

export function decodeEntities(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&euml;/g, "ë")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&iuml;/g, "ï")
    .replace(/&ccedil;/g, "ç")
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

export function normalizeName(value) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(value) {
  return normalizeName(value).replace(/\s+/g, "-") || "onbekend";
}

export function parseRijksoverheidBewindspersonen(html) {
  if (typeof html !== "string" || html === "") return [];
  const cards = /<a href="\/regering\/bewindspersonen\/([^"?#]+)" class="card card--photo-nav[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  const results = [];
  const seen = new Set();
  let match;
  while ((match = cards.exec(html))) {
    const slug = match[1].trim();
    if (slug === "kabinet-jetten") continue;
    const block = match[2];
    const name = decodeEntities((block.match(/link-plus__title">([^<]+)</) || [])[1] || "").trim();
    const role = decodeEntities((block.match(/card__subtitle">([^<]+)</) || [])[1] || "").trim();
    if (name === "" || role === "") continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    results.push({
      slug,
      name,
      role,
      url: `https://www.rijksoverheid.nl/regering/bewindspersonen/${slug}`,
    });
  }
  return results;
}

export function parseEersteKamerLeden(html) {
  if (typeof html !== "string" || html === "") return [];
  const blocks = /<li class="persoon grid-x nowr">([\s\S]*?)<\/li>/g;
  const results = [];
  const seen = new Set();
  let match;
  while ((match = blocks.exec(html))) {
    const block = decodeEntities(match[1]);
    const name = ((block.match(/class="naam">([^<]+)</) || [])[1] || "").trim();
    const href = (block.match(/href="(\/persoon\/[^"]+)"/) || [])[1] || "";
    if (name === "" || href === "") continue;
    const slug = href.replace(/^\/persoon\//, "").replace(/\/$/, "");
    if (seen.has(slug)) continue;
    seen.add(slug);
    const divs = [...block.matchAll(/<div>([^<]*)<\/div>/g)].map((entry) => entry[1].trim());
    const party = divs[0] || "";
    const ancienniteitMatch = block.match(/Anci[eë]nniteit:\s*([0-9.]+)\s*dagen/);
    const ancienniteitDays = ancienniteitMatch ? Number(ancienniteitMatch[1].replace(/\./g, "")) : null;
    results.push({
      slug,
      name,
      party,
      ancienniteitDays,
      url: `https://www.eerstekamer.nl${href}`,
    });
  }
  return results;
}

function personNameFromOData(person) {
  if (!person) return "";
  return [person.Voornamen, person.Tussenvoegsel, person.Achternaam]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

export function parseTweedeKamerOData({
  value = [],
  personenById = new Map(),
  fractieZetelsById = new Map(),
  fractiesById = new Map(),
} = {}) {
  if (!Array.isArray(value)) return [];
  const results = [];
  for (const row of value) {
    if (!row || row.Verwijderd === true) continue;
    const person = row.Persoon ?? personenById.get(row.Persoon_Id) ?? null;
    if (!person) continue;
    const fractieZetel = row.FractieZetel ?? fractieZetelsById.get(row.FractieZetel_Id) ?? null;
    const fractie =
      (fractieZetel && fractieZetel.Fractie) ??
      (fractieZetel ? fractiesById.get(fractieZetel.Fractie_Id) : null) ??
      null;
    const name = personNameFromOData(person);
    if (name === "") continue;
    const start = typeof row.Van === "string" && row.Van.length >= 10 ? row.Van.slice(0, 10) : null;
    results.push({
      odataId: row.Id ?? null,
      personId: person.Id ?? row.Persoon_Id ?? null,
      name,
      fractie: (fractie && fractie.Afkorting) || person.Fractielabel || null,
      start,
      functie: row.Functie ?? null,
    });
  }
  return results;
}

export function buildPersonIndex(people = []) {
  const byNormalized = new Map();
  const byId = new Map();
  for (const person of people) {
    if (!person || typeof person.id !== "string") continue;
    byId.set(person.id, person);
    const forms = [person.name, ...(Array.isArray(person.aliases) ? person.aliases : [])];
    for (const form of forms) {
      const key = normalizeName(form);
      if (key === "") continue;
      if (!byNormalized.has(key)) byNormalized.set(key, new Set());
      byNormalized.get(key).add(person.id);
    }
  }
  return { byNormalized, byId };
}

export function resolvePerson(name, index) {
  const key = normalizeName(name);
  const matches = key === "" ? undefined : index.byNormalized.get(key);
  const ids = matches ? [...matches] : [];
  if (ids.length === 1) return { status: "matched", id: ids[0] };
  if (ids.length > 1) return { status: "ambiguous", candidates: ids.sort() };
  return { status: "none" };
}

export function matchBewindspersoonPosition(role, positions, posById = new Map(positions.map((p) => [p.id, p]))) {
  if (typeof role !== "string" || role.trim() === "") return null;
  const segments = role
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const withoutDeputy = segments.filter((segment) => !/viceminister-president/i.test(segment));
  const candidates = withoutDeputy.length > 0 ? withoutDeputy : segments;
  for (const segment of candidates) {
    const normalized = normalizeName(segment);
    if (normalized === "") continue;
    const exact = positions.find((position) => normalizeName(position.title) === normalized);
    if (exact) return exact.id;
    const bySlug = posById.get(`pos:${slugify(segment)}`);
    if (bySlug) return bySlug.id;
    const startsWith = positions.find(
      (position) => position.id.startsWith("pos:") && normalizeName(position.title).startsWith(`${normalized} `),
    );
    if (startsWith) return startsWith.id;
  }
  return null;
}

async function readJsonArray(path) {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadDataset(dataDir = join(REPO_ROOT, "data")) {
  const [organizations, positions, people, tenures, memberships, sources] = await Promise.all([
    readJsonArray(join(dataDir, "organizations.json")),
    readJsonArray(join(dataDir, "positions.json")),
    readJsonArray(join(dataDir, "people.json")),
    readJsonArray(join(dataDir, "tenures.json")),
    readJsonArray(join(dataDir, "memberships.json")),
    readJsonArray(join(dataDir, "sources.json")),
  ]);
  return { organizations, positions, people, tenures, memberships, sources };
}

export function cabinetPositionIds(positions = []) {
  return positions
    .filter(
      (position) =>
        position &&
        typeof position.id === "string" &&
        /^(minister|staatssecretaris)\b/i.test(position.title || "") &&
        typeof position.organization === "string" &&
        position.organization.startsWith("org:ministerie-"),
    )
    .map((position) => position.id);
}

export function buildSourceRecord(def, existingSources, today) {
  const existing = existingSources.find((source) => source && source.url === def.url) ?? null;
  return {
    id: existing ? existing.id : def.id,
    url: def.url,
    title: def.title || existing?.title || def.url,
    publisher: def.publisher || existing?.publisher || "Onbekend",
    type: def.type || existing?.type || "page",
    published: null,
    retrieved: today,
    license: existing?.license ?? def.license ?? null,
    archiveUrl: null,
    notes: def.notes ?? existing?.notes ?? null,
  };
}

function makeGap(what, why, endpoint, resume) {
  return { what, why, endpoint, resume };
}

function nextId(base, taken) {
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  const value = `${base}-${counter}`;
  taken.add(value);
  return value;
}

function sourceRef(sourceId, today) {
  return { source: sourceId, retrieved: today, confidence: "high" };
}

export function planRefresh({ fetched, dataset, today, maxClosures = DEFAULT_MAX_CLOSURES }) {
  const bodies = fetched.bodies;
  const gaps = [...(fetched.gaps ?? [])];
  const involvedPersons = new Map();
  const newPersonIds = new Set();
  const sources = [];
  const tenures = [];
  const memberships = [];
  const index = buildPersonIndex(dataset.people);
  const positions = dataset.positions ?? [];
  const posById = new Map(positions.map((position) => [position.id, position]));
  const existingSources = dataset.sources ?? [];
  const allPersonIds = new Set(dataset.people.map((person) => person.id));
  const allTenureIds = new Set(dataset.tenures.map((tenure) => tenure.id));
  const allMembershipIds = new Set(dataset.memberships.map((membership) => membership.id));

  const bodySources = {};
  for (const key of ["bewindspersonen", "eersteKamer", "tweedeKamer"]) {
    const body = bodies[key];
    if (body && body.ok) {
      bodySources[key] = buildSourceRecord(SOURCE_DEFS[key], existingSources, today);
      sources.push(bodySources[key]);
    }
  }

  function notePerson(name, reason, endpoint) {
    gaps.push(
      makeGap(
        `Persoon ${name} kon niet met een bestaand persoon-id worden gematcht`,
        reason,
        endpoint,
        "Controleer de naam en aliases in data/people.json en voeg de ontbrekende alias of persoon handmatig toe.",
      ),
    );
  }

  function trackPerson(personId, sourceKey) {
    if (!sourceKey || !bodySources[sourceKey]) return;
    if (!involvedPersons.has(personId)) involvedPersons.set(personId, new Set());
    involvedPersons.get(personId).add(bodySources[sourceKey].id);
  }

  function ensureNewPerson(name, naturalSourceKey) {
    const base = `person:${slugify(name)}`;
    const id = nextId(base, allPersonIds);
    newPersonIds.add(id);
    const record = { id, slug: slugify(name), name, sources: [] };
    index.byId.set(id, record);
    trackPerson(id, naturalSourceKey);
    return id;
  }

  const freshTenurePairs = new Set();
  const resolvedBewindspersonen = new Set();
  let unresolvedBewindspersonen = 0;
  let bwUnresolved = false;
  let tenuresCarried = 0;
  if (bodies.bewindspersonen && bodies.bewindspersonen.ok) {
    const openByPair = new Map();
    for (const tenure of dataset.tenures ?? []) {
      if (tenure.end) continue;
      const key = `${tenure.person}|${tenure.position}`;
      if (!openByPair.has(key)) openByPair.set(key, tenure);
    }
    for (const item of bodies.bewindspersonen.items) {
      const positionId = matchBewindspersoonPosition(item.role, positions, posById);
      if (!positionId) {
        bwUnresolved = true;
        gaps.push(
          makeGap(
            `Positie voor rol "${item.role}" van ${item.name}`,
            "geen bestaand pos:-record gevonden op titel of organisatie",
            RIJKSOVERHEID_URL,
            "Voeg het ontbrekende pos:-record toe in data/positions.json en draai de refresh opnieuw.",
          ),
        );
        continue;
      }
      const person = resolvePerson(item.name, index);
      if (person.status !== "matched") {
        unresolvedBewindspersonen += 1;
        bwUnresolved = true;
        notePerson(
          item.name,
          person.status === "ambiguous"
            ? `meerdere personen komen overeen (${person.candidates.join(", ")})`
            : "geen bestaande persoon gevonden",
          RIJKSOVERHEID_URL,
        );
        continue;
      }
      resolvedBewindspersonen.add(person.id);
      trackPerson(person.id, "bewindspersonen");
      freshTenurePairs.add(`${person.id}|${positionId}`);
      const existing = openByPair.get(`${person.id}|${positionId}`);
      if (existing) {
        tenures.push({ ...existing, source: sourceRef(bodySources.bewindspersonen.id, today) });
        tenuresCarried += 1;
      } else {
        gaps.push(
          makeGap(
            `Startdatum van de tenure van ${item.name} als ${item.role}`,
            "de Rijksoverheid-pagina noemt geen benoemingsdatum en er is geen bestaande open tenure om de start over te nemen",
            RIJKSOVERHEID_URL,
            "Zoek het benoemings-KB in de Staatscourant en voeg de startdatum en het tenure-record toe.",
          ),
        );
      }
    }
  }

  const organizationsById = new Map((dataset.organizations ?? []).map((organization) => [organization.id, organization]));
  const resolvedTweedeKamer = new Set();
  let tkUnresolved = false;
  let membershipsCarried = 0;
  let membershipsOpened = 0;
  if (bodies.tweedeKamer && bodies.tweedeKamer.ok) {
    const orgId = organizationsById.has("org:tweede-kamer") ? "org:tweede-kamer" : null;
    if (!orgId) {
      gaps.push(
        makeGap(
          "Organisatie org:tweede-kamer",
          "het org:-record ontbreekt in data/organizations.json",
          "data/organizations.json",
          "Voeg het org:tweede-kamer-record toe en draai de refresh opnieuw.",
        ),
      );
    } else {
      const openByPerson = new Map();
      for (const membership of dataset.memberships ?? []) {
        if (membership.end || membership.organization !== orgId) continue;
        if (!openByPerson.has(membership.person)) openByPerson.set(membership.person, membership);
      }
      for (const item of bodies.tweedeKamer.items) {
        if (!item.start) {
          gaps.push(
            makeGap(
              `Startdatum van het Tweede Kamerlidmaatschap van ${item.name}`,
              "de OData-rij heeft geen Van-datum",
              TK_ODATA_URL,
              "Controleer de OData-rij en vul de Van-datum aan.",
            ),
          );
          continue;
        }
        const person = resolvePerson(item.name, index);
        let personId;
        if (person.status === "matched") {
          personId = person.id;
        } else {
          if (person.status === "ambiguous") {
            tkUnresolved = true;
            notePerson(item.name, `meerdere personen komen overeen (${person.candidates.join(", ")})`, TK_ODATA_URL);
            continue;
          }
          personId = ensureNewPerson(item.name, "tweedeKamer");
        }
        resolvedTweedeKamer.add(personId);
        trackPerson(personId, "tweedeKamer");
        const existing = openByPerson.get(personId);
        const ref = sourceRef(bodySources.tweedeKamer.id, today);
        if (existing) {
          memberships.push({
            ...existing,
            fractie: item.fractie ?? existing.fractie ?? null,
            start: item.start,
            source: ref,
          });
          membershipsCarried += 1;
        } else {
          const id = nextId(`membership:tweede-kamer-${slugify(item.name)}`, allMembershipIds);
          memberships.push({
            id,
            organization: orgId,
            person: personId,
            seatNumber: null,
            fractie: item.fractie ?? null,
            start: item.start,
            end: null,
            source: ref,
          });
          membershipsOpened += 1;
        }
      }
    }
  }

  const resolvedEersteKamer = new Set();
  let ekUnresolved = false;
  if (bodies.eersteKamer && bodies.eersteKamer.ok) {
    const orgId = organizationsById.has("org:eerste-kamer") ? "org:eerste-kamer" : null;
    if (!orgId) {
      gaps.push(
        makeGap(
          "Organisatie org:eerste-kamer",
          "het org:-record ontbreekt in data/organizations.json",
          "data/organizations.json",
          "Voeg het org:eerste-kamer-record toe en draai de refresh opnieuw.",
        ),
      );
    } else {
      const openByPerson = new Map();
      for (const membership of dataset.memberships ?? []) {
        if (membership.end || membership.organization !== orgId) continue;
        if (!openByPerson.has(membership.person)) openByPerson.set(membership.person, membership);
      }
      for (const item of bodies.eersteKamer.items) {
        const person = resolvePerson(item.name, index);
        if (person.status !== "matched") {
          ekUnresolved = true;
          if (person.status === "ambiguous") {
            notePerson(item.name, `meerdere personen komen overeen (${person.candidates.join(", ")})`, EERSTE_KAMER_URL);
          } else {
            gaps.push(
              makeGap(
                `Startdatum van het Eerste Kamerlidmaatschap van ${item.name}`,
                "geen bestaande open membership om de start uit over te nemen en de overzichtspagina noemt geen startdatum",
                EERSTE_KAMER_URL,
                "Zoek de installatiedatum op de persoonspagina of in de personele mutaties en voeg de membership toe.",
              ),
            );
          }
          continue;
        }
        resolvedEersteKamer.add(person.id);
        trackPerson(person.id, "eersteKamer");
        const existing = openByPerson.get(person.id);
        const ref = sourceRef(bodySources.eersteKamer.id, today);
        if (existing) {
          memberships.push({
            ...existing,
            fractie: item.party || existing.fractie || null,
            source: ref,
          });
          membershipsCarried += 1;
        } else {
          gaps.push(
            makeGap(
              `Startdatum van het Eerste Kamerlidmaatschap van ${item.name}`,
              "geen bestaande open membership en de overzichtspagina noemt geen startdatum",
              EERSTE_KAMER_URL,
              "Zoek de installatiedatum op de persoonspagina of in de personele mutaties en voeg de membership toe.",
            ),
          );
        }
      }
    }
  }

  const closures = [];
  const coveredPositions = new Set(cabinetPositionIds(positions));
  if (bodies.bewindspersonen && bodies.bewindspersonen.ok && !bwUnresolved) {
    for (const tenure of dataset.tenures ?? []) {
      if (tenure.end || !coveredPositions.has(tenure.position)) continue;
      if (freshTenurePairs.has(`${tenure.person}|${tenure.position}`)) continue;
      closures.push({
        entity: "tenures",
        record: { ...tenure, end: today, source: sourceRef(bodySources.bewindspersonen.id, today) },
      });
    }
  }
  if (bodies.tweedeKamer && bodies.tweedeKamer.ok && !tkUnresolved && organizationsById.has("org:tweede-kamer")) {
    for (const membership of dataset.memberships ?? []) {
      if (membership.end || membership.organization !== "org:tweede-kamer") continue;
      if (resolvedTweedeKamer.has(membership.person)) continue;
      closures.push({
        entity: "memberships",
        record: { ...membership, end: today, source: sourceRef(bodySources.tweedeKamer.id, today) },
      });
    }
  }
  if (bodies.eersteKamer && bodies.eersteKamer.ok && !ekUnresolved && organizationsById.has("org:eerste-kamer")) {
    for (const membership of dataset.memberships ?? []) {
      if (membership.end || membership.organization !== "org:eerste-kamer") continue;
      if (resolvedEersteKamer.has(membership.person)) continue;
      closures.push({
        entity: "memberships",
        record: { ...membership, end: today, source: sourceRef(bodySources.eersteKamer.id, today) },
      });
    }
  }
  for (const closure of closures) {
    if (closure.entity === "tenures") tenures.push(closure.record);
    else memberships.push(closure.record);
  }

  const people = [];
  for (const [personId, sourceIds] of involvedPersons) {
    const existing = index.byId.get(personId);
    const record = existing
      ? structuredClone(existing)
      : { id: personId, slug: personId.replace(/^person:/, ""), name: personId.replace(/^person:/, ""), sources: [] };
    if (!Array.isArray(record.sources)) record.sources = [];
    const present = new Set(record.sources.map((ref) => ref && ref.source));
    for (const sourceId of [...sourceIds].sort()) {
      if (present.has(sourceId)) continue;
      record.sources.push(sourceRef(sourceId, today));
      present.add(sourceId);
    }
    people.push(record);
  }

  const sortById = (records) => records.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  sortById(people);
  sortById(tenures);
  sortById(memberships);
  sortById(sources);

  const envelope = {
    workstream: "P",
    generatedAt: fetched.generatedAt || new Date(`${today}T00:00:00.000Z`).toISOString(),
    endpointsUsed: fetched.endpointsUsed ?? [],
    organizations: [],
    positions: [],
    people,
    tenures,
    memberships,
    relations: [],
    topics: [],
    budgets: [],
    sources,
    media: [],
    gaps,
  };

  const stats = {
    tenuresEmitted: tenures.length,
    membershipsEmitted: memberships.length,
    tenuresCarried,
    membershipsCarried,
    membershipsOpened,
    opened: membershipsOpened,
    closed: closures.length,
    closures,
    gaps: gaps.length,
    newPeople: newPersonIds.size,
    unresolvedBewindspersonen,
    bodies: {
      bewindspersonen: {
        fetched: bodies.bewindspersonen?.ok ? bodies.bewindspersonen.items.length : 0,
        resolved: resolvedBewindspersonen.size,
      },
      tweedeKamer: {
        fetched: bodies.tweedeKamer?.ok ? bodies.tweedeKamer.items.length : 0,
        resolved: resolvedTweedeKamer.size,
      },
      eersteKamer: {
        fetched: bodies.eersteKamer?.ok ? bodies.eersteKamer.items.length : 0,
        resolved: resolvedEersteKamer.size,
      },
    },
  };

  return { envelope, stats, closures, gaps };
}

export function enforceClosureThreshold(closures, maxClosures = DEFAULT_MAX_CLOSURES) {
  if (closures.length > maxClosures) throw new ClosureThresholdError(closures.length, maxClosures);
}

function formatDateNL(iso) {
  if (typeof iso !== "string" || iso.length < 10) return String(iso ?? "");
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}-${month}-${year}`;
}

function bodyStatusLine(name, body) {
  if (!body) return `- ${name}: niet opgehaald`;
  if (body.ok) {
    if (typeof body.rawCount === "number") {
      return `- ${name}: HTTP ${body.status}, ${body.rawCount} rijen (${body.tombstones} tombstones), ${body.items.length} geldig`;
    }
    return `- ${name}: HTTP ${body.status}, ${body.items.length} records`;
  }
  return `- ${name}: mislukt (${body.status ?? "netwerk"}, ${body.error ?? "onbekende fout"})`;
}

export function renderReport({ stats, fetched, today }) {
  const lines = [];
  lines.push("# Workstream P: live ambtsdragers");
  lines.push("");
  lines.push(`- Gegenereerd: ${formatDateNL(today)}`);
  lines.push("- Bron: officiële pagina's van Rijksoverheid, de Eerste Kamer en het Tweede Kamer OData-gegevensmagazijn.");
  lines.push("- Werkwijze: fetch, nooit uit het geheugen; elke startdatum komt uit een bron of uit een bestaand, al gedateerd record.");
  lines.push("");
  lines.push("## Endpoints");
  lines.push("");
  lines.push("| Bron | URL | Opgehaald | Status |");
  lines.push("| --- | --- | --- | --- |");
  for (const endpoint of fetched.endpointsUsed ?? []) {
    lines.push(`| ${endpoint.notes ?? ""} | ${endpoint.url} | ${formatDateNL(endpoint.retrieved)} | 200 |`);
  }
  lines.push("");
  lines.push("## Tellingen");
  lines.push("");
  lines.push(`- Bewindspersonen: ${stats.bodies.bewindspersonen.fetched} opgehaald, ${stats.bodies.bewindspersonen.resolved} gematcht.`);
  lines.push(`- Tweede Kamer: ${stats.bodies.tweedeKamer.fetched} geldige leden, ${stats.bodies.tweedeKamer.resolved} gematcht.`);
  lines.push(`- Eerste Kamer: ${stats.bodies.eersteKamer.fetched} leden, ${stats.bodies.eersteKamer.resolved} gematcht.`);
  lines.push(`- Nieuwe personen: ${stats.newPeople}.`);
  lines.push(`- Uitgegeven tenures: ${stats.tenuresEmitted} (waarvan ${stats.tenuresCarried} overgenomen met bestaande start).`);
  lines.push(`- Uitgegeven memberships: ${stats.membershipsEmitted} (waarvan ${stats.membershipsCarried} overgenomen, ${stats.membershipsOpened} nieuw).`);
  lines.push(`- Geopend: ${stats.opened}. Gesloten: ${stats.closed}.`);
  lines.push(`- Gaps: ${stats.gaps}.`);
  lines.push("");
  lines.push("## Toelichting");
  lines.push("");
  lines.push(
    "- De Rijksoverheid-pagina noemt geen benoemingsdatum. Voor bestaande bewindspersonen is de start uit het bestaande open record overgenomen; nieuwe bewindspersonen zonder start gaan naar de gaps.",
  );
  lines.push(
    "- De OData-query met alleen TotEnMet eq null levert 157 rijen, waarvan 7 verwijderde tombstones zonder persoon. De parser houdt 150 geldige leden over.",
  );
  lines.push(
    "- De Eerste Kamer overzichtspagina noemt ancienniteit in dagen, geen startdatum; die dagentelling wordt niet omgerekend. Bestaande open memberships houden hun start.",
  );
  lines.push("- Sluitingen (aftredende ambtsdragers) krijgen de ophaaldatum als einddatum en de opgehaalde pagina als bron.");
  lines.push("");
  lines.push("## Gaps");
  lines.push("");
  if ((fetched.gaps ?? []).length === 0 && stats.gaps === 0) {
    lines.push("Geen.");
  } else {
    let number = 1;
    for (const gap of fetched.gaps ?? []) {
      lines.push(`${number}. ${gap.what} (${gap.endpoint}). ${gap.why} Vervolg: ${gap.resume}`);
      number += 1;
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function renderQaReport({ stats, fetched, today, maxClosures }) {
  const lines = [];
  lines.push(`# Run report: refresh-official ${formatDateNL(today)}`);
  lines.push("");
  lines.push("## HTTP-statussen en aantallen per lichaam");
  lines.push("");
  lines.push(`- Rijksoverheid bewindspersonen: ${stats.bodies.bewindspersonen.fetched} opgehaald, ${stats.bodies.bewindspersonen.resolved} gematcht.`);
  lines.push(`- Tweede Kamer OData: ${stats.bodies.tweedeKamer.fetched} geldige leden, ${stats.bodies.tweedeKamer.resolved} gematcht.`);
  lines.push(`- Eerste Kamer: ${stats.bodies.eersteKamer.fetched} leden, ${stats.bodies.eersteKamer.resolved} gematcht.`);
  lines.push("");
  lines.push("Per bron:");
  lines.push("");
  lines.push(bodyStatusLine("Rijksoverheid bewindspersonen", fetched.bodies.bewindspersonen));
  lines.push(bodyStatusLine("Tweede Kamer OData", fetched.bodies.tweedeKamer));
  lines.push(bodyStatusLine("Eerste Kamer leden", fetched.bodies.eersteKamer));
  lines.push("");
  lines.push("## Uitgegeven records");
  lines.push("");
  lines.push(`- Tenures: ${stats.tenuresEmitted} (${stats.tenuresCarried} overgenomen).`);
  lines.push(`- Memberships: ${stats.membershipsEmitted} (${stats.membershipsCarried} overgenomen, ${stats.membershipsOpened} nieuw).`);
  lines.push(`- Nieuwe personen: ${stats.newPeople}.`);
  lines.push("");
  lines.push("## Sluitingen");
  lines.push("");
  if (stats.closures.length === 0) {
    lines.push("Geen open records gesloten.");
  } else {
    for (const closure of stats.closures) {
      lines.push(`- ${closure.record.id} -> einde ${formatDateNL(closure.record.end)}`);
    }
  }
  lines.push("");
  lines.push("## Gaps");
  lines.push("");
  lines.push(`Aantal gaps: ${stats.gaps}.`);
  if (stats.gaps > 0) {
    let number = 1;
    for (const gap of fetched.gaps ?? []) {
      lines.push(`${number}. ${gap.what}. Bron: ${gap.endpoint}. ${gap.why} Vervolg: ${gap.resume}`);
      number += 1;
    }
  }
  lines.push("");
  lines.push("## Veiligheidscontrole");
  lines.push("");
  lines.push(
    `- Aantal sluitingen: ${stats.closed}. Drempel: ${maxClosures}. Resultaat: ${stats.closed > maxClosures ? "GEBLOKKEERD" : "OK"}.`,
  );
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function fetchText(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
    },
  });
  const text = await response.text();
  return { status: response.status, ok: response.ok, text };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchOfficialSources({
  fetchImpl = globalThis.fetch,
  today,
  generatedAt = new Date().toISOString(),
  throttleMs = THROTTLE_MS,
} = {}) {
  const bodies = {};
  const rawFiles = [];
  const endpointsUsed = [];
  const gaps = [];

  async function attempt({ key, name, url, kind }) {
    try {
      const response = await fetchText(url, fetchImpl);
      if (!response.ok) {
        bodies[key] = { ok: false, status: response.status, url, items: [], error: `HTTP ${response.status}` };
        gaps.push(
          makeGap(
            `${name} kon niet worden opgehaald`,
            `de bron antwoordde met HTTP ${response.status}`,
            url,
            "Controleer de endpoint of probeer het later opnieuw; de vorige records blijven ongewijzigd open.",
          ),
        );
        return;
      }
      let items;
      let content = response.text;
      if (kind === "json") {
        const parsed = JSON.parse(response.text);
        items = parseTweedeKamerOData(parsed);
        const tombstones = Array.isArray(parsed.value)
          ? parsed.value.filter((row) => row && row.Verwijderd === true).length
          : 0;
        bodies[key] = {
          ok: true,
          status: response.status,
          url,
          items,
          rawCount: Array.isArray(parsed.value) ? parsed.value.length : items.length,
          tombstones,
          functies: items.filter((item) => item.functie && item.functie !== "Lid").length,
        };
        content = `${JSON.stringify(parsed, null, 2)}\n`;
      } else {
        items = key === "bewindspersonen" ? parseRijksoverheidBewindspersonen(response.text) : parseEersteKamerLeden(response.text);
        bodies[key] = { ok: true, status: response.status, url, items };
      }
      rawFiles.push({ path: key === "bewindspersonen" ? RAW_RIJKSOVERHEID : key === "eersteKamer" ? RAW_EERSTE_KAMER : RAW_TWEDE_KAMER, content });
      endpointsUsed.push({ url, retrieved: today, notes: name });
    } catch (error) {
      bodies[key] = { ok: false, status: null, url, items: [], error: error.message };
      gaps.push(
        makeGap(
          `${name} kon niet worden opgehaald`,
          `netwerk- of parsefout: ${error.message}`,
          url,
          "Controleer de endpoint of probeer het later opnieuw; de vorige records blijven ongewijzigd open.",
        ),
      );
    }
  }

  await attempt({ key: "bewindspersonen", name: "Rijksoverheid bewindspersonen", url: RIJKSOVERHEID_URL, kind: "html" });
  if (throttleMs > 0) await sleep(throttleMs);
  await attempt({ key: "tweedeKamer", name: "Tweede Kamer OData FractieZetelPersoon", url: TK_ODATA_URL, kind: "json" });
  if (throttleMs > 0) await sleep(throttleMs);
  await attempt({ key: "eersteKamer", name: "Eerste Kamer alle leden", url: EERSTE_KAMER_URL, kind: "html" });

  return { generatedAt, bodies, rawFiles, endpointsUsed, gaps };
}

function resolveRoot(root) {
  return root ?? REPO_ROOT;
}

export async function runRefresh(options = {}) {
  const now = options.now ?? new Date();
  const today = options.today ?? now.toISOString().slice(0, 10);
  const root = resolveRoot(options.root);
  const maxClosures = options.maxClosures ?? DEFAULT_MAX_CLOSURES;
  const io = { writeFile, mkdir, ...(options.io ?? {}) };
  const log = options.log ?? console.log;

  const fetched =
    options.fetched ??
    (await fetchOfficialSources({
      fetchImpl: options.fetchImpl,
      today,
      generatedAt: now.toISOString(),
      throttleMs: options.throttleMs ?? THROTTLE_MS,
    }));

  const dataset = options.dataset ?? (await loadDataset(join(root, "data")));
  const plan = planRefresh({ fetched, dataset, today, maxClosures });

  enforceClosureThreshold(plan.closures, maxClosures);

  for (const file of fetched.rawFiles ?? []) {
    const full = join(root, file.path);
    await io.mkdir(dirname(full), { recursive: true });
    await io.writeFile(full, file.content, "utf8");
  }

  const envelopePath = join(root, "research", "P-live-ambtsdragers.json");
  const reportPath = join(root, "research", "P-live-ambtsdragers.md");
  const qaDir = join(root, "research", "qa");
  const qaPath = join(qaDir, `refresh-official-${formatDateNL(today)}.md`);

  const qaFetched = { ...fetched, gaps: plan.envelope.gaps };

  await io.mkdir(dirname(envelopePath), { recursive: true });
  await io.writeFile(envelopePath, `${JSON.stringify(plan.envelope, null, 2)}\n`, "utf8");
  await io.writeFile(reportPath, renderReport({ stats: plan.stats, fetched: qaFetched, today }), "utf8");
  await io.mkdir(qaDir, { recursive: true });
  await io.writeFile(qaPath, renderQaReport({ stats: plan.stats, fetched: qaFetched, today, maxClosures }), "utf8");

  log(
    `refresh-official: bewindspersonen ${plan.stats.bodies.bewindspersonen.fetched}, ` +
      `TK ${plan.stats.bodies.tweedeKamer.fetched}, EK ${plan.stats.bodies.eersteKamer.fetched}; ` +
      `tenures ${plan.stats.tenuresEmitted}, memberships ${plan.stats.membershipsEmitted}, ` +
      `geopend ${plan.stats.opened}, gesloten ${plan.stats.closed}, gaps ${plan.stats.gaps}.`,
  );

  return {
    envelopePath,
    reportPath,
    qaPath,
    stats: plan.stats,
    fetched,
  };
}

function parseArgs(argv) {
  const options = { maxClosures: DEFAULT_MAX_CLOSURES };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--max-closures") {
      const value = Number(argv[(i += 1)]);
      if (Number.isFinite(value) && value >= 0) options.maxClosures = value;
    } else if (argv[i] === "--root") {
      options.root = argv[(i += 1)];
    }
  }
  if (process.env.MAX_CLOSURES && options.maxClosures === DEFAULT_MAX_CLOSURES) {
    const value = Number(process.env.MAX_CLOSURES);
    if (Number.isFinite(value) && value >= 0) options.maxClosures = value;
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  try {
    await runRefresh(options);
  } catch (error) {
    if (error instanceof ClosureThresholdError) {
      console.error(`refresh-official: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    console.error(`refresh-official failed: ${error.message}`);
    process.exitCode = 1;
  }
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main();
}
