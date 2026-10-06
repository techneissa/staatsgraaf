#!/usr/bin/env bun
// Refresh of the office holders from the official sources (ADR 0006, amended; ADR 0024).
//
// Sources: Rijksoverheid (bewindspersonen), the Tweede Kamer OData gegevensmagazijn
// (members, fractievoorzitters, Presidium, seat counts), the Eerste Kamer pages
// (members, fractie boards, Voorzitter). The result is research envelope
// research/P-live-ambtsdragers.json. A source whose own data is not consistent
// (see live-guard.mjs) contributes nothing to the run: its previous records stay
// and the run reports it as stopped by the guard.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createHttp } from "./live-http.mjs";
import {
  EK_URLS,
  EK_ORG,
  fetchEkFull,
  planEersteKamerBoards,
} from "./ek-live.mjs";
import {
  BEWINDSPERSONEN_EXPECTED,
  GuardError,
  decideBulk,
  evaluateBewindspersonenInvariants,
  evaluateEkInvariants,
  recentEvents,
} from "./live-guard.mjs";
import {
  LIVE_USER_AGENT,
  buildPersonIndex,
  buildSourceRecord,
  decodeEntities,
  formatDateNL,
  makeGap,
  nextId,
  normalizeName,
  resolvePerson,
  slugify,
  sourceRef,
} from "./live-util.mjs";
import { loadState, saveState } from "./live-state.mjs";
import { DECENTRAL_KEYS, planCommissarissen, planDecentral } from "./decentral-plan.mjs";
import { failureGap, fetchDecentral } from "./decentral-fetch.mjs";
import { TK_OPEN_URL, TK_SOURCE_DEFS, planTweedeKamer } from "./tk-changes.mjs";
import { fetchPresidiumId, fetchTkSnapshot, makeClosedRowLookup, readWindowStart } from "./tk-fetch.mjs";

export { buildPersonIndex, buildSourceRecord, decodeEntities, normalizeName, resolvePerson, slugify };

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const USER_AGENT = LIVE_USER_AGENT;
export const THROTTLE_MS = 1000;
export { GuardError };

export const RIJKSOVERHEID_URL = "https://www.rijksoverheid.nl/regering/bewindspersonen";
export const EERSTE_KAMER_URL = EK_URLS.leden;
export const TK_ODATA_URL = TK_OPEN_URL;

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
};

const SOURCE_KEYS = ["bewindspersonen", "tweedeKamer", "eersteKamer", ...DECENTRAL_KEYS];

export function parseRijksoverheidBewindspersonen(html) {
  if (typeof html !== "string" || html === "") return [];
  const cards = /<a href="\/regering\/bewindspersonen\/([^"?#]+)" class="card card--photo-nav[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  const results = [];
  const seen = new Set();
  let match;
  while ((match = cards.exec(html))) {
    const slug = match[1].trim();
    if (slug.startsWith("kabinet-")) continue;
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

/**
 * The cabinet the page describes: { slug, name } or null. Older layouts had a "Kabinet-<naam>" card; today the
 * page names it only in the image paths of the bewindspersonen ("/bewindspersonen/kabinet-jetten/..."), so the
 * slug that occurs most often wins. It is a hint for the guard (a new cabinet explains many changes), never a fact.
 */
export function parseRijksoverheidCabinet(html) {
  if (typeof html !== "string" || html === "") return null;
  const cards = /<a href="\/regering\/bewindspersonen\/(kabinet-[^"?#]+)" class="card card--photo-nav[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  const match = cards.exec(html);
  if (match) {
    const name = decodeEntities((match[2].match(/link-plus__title">([^<]+)</) || [])[1] || "").trim();
    return { slug: match[1].trim(), name };
  }
  const counts = new Map();
  for (const found of html.matchAll(/bewindspersonen\/(kabinet-[a-z0-9-]+)\//g)) counts.set(found[1], (counts.get(found[1]) ?? 0) + 1);
  const top = [...counts].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0];
  return top ? { slug: top[0], name: null } : null;
}

export function matchBewindspersoonPosition(role, positions, posById = new Map(positions.map((p) => [p.id, p]))) {
  if (typeof role !== "string" || role.trim() === "") return null;
  // The whole role first ("Minister van Onderwijs, Cultuur en Wetenschap" is one title with a comma in it).
  const whole = normalizeName(role.replace(/,?\s*[^,]*viceminister-president/i, ""));
  const fullExact = whole === "" ? null : positions.find((position) => normalizeName(position.title) === whole);
  if (fullExact) return fullExact.id;
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

/**
 * The ministerial positions of the Dutch cabinet. With the organisation records given, only ministries of the
 * Dutch state count (level rijk, country nederland): Aruba, Curaçao and Sint Maarten have ministries with the
 * same titles ("Minister van Financiën") that the Rijksoverheid page never lists.
 */
export function cabinetPositionIds(positions = [], organizations = null) {
  const byId = organizations ? new Map(organizations.map((organization) => [organization.id, organization])) : null;
  return positions
    .filter((position) => {
      if (
        !position ||
        typeof position.id !== "string" ||
        !/^(minister|staatssecretaris)\b/i.test(position.title || "") ||
        typeof position.organization !== "string" ||
        !position.organization.startsWith("org:ministerie-")
      ) {
        return false;
      }
      if (!byId) return true;
      const organization = byId.get(position.organization);
      return Boolean(organization) && organization.level === "rijk" && organization.country === "nederland";
    })
    .map((position) => position.id);
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
  const [organizations, positions, people, tenures, memberships, relations, sources, elections, coalitions] = await Promise.all(
    ["organizations", "positions", "people", "tenures", "memberships", "relations", "sources", "elections", "coalitions"].map((name) =>
      readJsonArray(join(dataDir, `${name}.json`)),
    ),
  );
  return { organizations, positions, people, tenures, memberships, relations, sources, elections, coalitions };
}

function isFetched(body) {
  return Boolean(body && body.ok && !body.skipped);
}

/** Endpoints read this run replace the earlier entry of the same URL; endpoints of sources not read this run stay. */
function mergeEndpoints(previous = [], fresh = []) {
  const byUrl = new Map((previous ?? []).map((entry) => [entry.url, entry]));
  for (const entry of fresh ?? []) byUrl.set(entry.url, entry);
  return [...byUrl.values()];
}

function sortById(records) {
  return records.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

/** The decentral source that owns an organisation id (gemeente, college, waterschap, provincie), by the id pattern. */
export function decentralOwnerOfOrg(orgId) {
  if (typeof orgId !== "string") return null;
  if (/^org:(gemeente|gemeenteraad|college-van-bw)-/.test(orgId)) return "gemeenten";
  if (/^org:(waterschap|algemeen-bestuur|dagelijks-bestuur)-/.test(orgId)) return "waterschappen";
  if (/^org:provincie-/.test(orgId)) return "commissarissen";
  return null;
}

function ownerOf(entity, record, positionsById) {
  if (entity === "memberships") {
    if (record.organization === "org:tweede-kamer") return "tweedeKamer";
    if (record.organization === EK_ORG) return "eersteKamer";
    return null;
  }
  const organization = positionsById.get(record.position)?.organization ?? null;
  if (organization === "org:tweede-kamer") return "tweedeKamer";
  if (organization === EK_ORG) return "eersteKamer";
  if (typeof organization === "string" && organization.startsWith("org:ministerie-")) return "bewindspersonen";
  return decentralOwnerOfOrg(organization);
}

/**
 * Plan the whole refresh. Each source is planned on its own; a source that was not fetched
 * (skipped, failed) or that the guard stops contributes nothing, and its records from the
 * previous envelope stay (`carried`). Closed records of the previous envelope always stay,
 * because an older research envelope that still says "open" must not reopen them on the next merge.
 */
export async function planRefresh({
  fetched,
  dataset,
  today,
  state = {},
  prevEnvelope = null,
  lookupClosedRow = async () => null,
  registeredFractieKeys = null,
  extraSources = [],
  options = {},
}) {
  const bodies = fetched.bodies ?? {};
  const gaps = [...(fetched.gaps ?? [])];
  const review = [];
  const stopped = [];
  const planned = new Set();
  const closures = [];
  const openings = [];
  const guards = {};

  const index = buildPersonIndex(dataset.people);
  const positions = dataset.positions ?? [];
  const posById = new Map(positions.map((position) => [position.id, position]));
  const existingSources = dataset.sources ?? [];
  const allPersonIds = new Set(dataset.people.map((person) => person.id));
  const allTenureIds = new Set(dataset.tenures.map((tenure) => tenure.id));
  const allMembershipIds = new Set(dataset.memberships.map((membership) => membership.id));
  const elections = dataset.elections ?? [];
  const coalitions = dataset.coalitions ?? [];

  const out = {
    organizations: new Map(),
    people: new Map(),
    positions: new Map(),
    relations: new Map(),
    sources: new Map(),
    tenures: new Map(),
    memberships: new Map(),
  };
  const newPersonIds = new Set();
  const decentralState = {};
  const sourceUpgrades = new Set();
  let decentralNewPeople = 0;
  const taken = {
    persons: allPersonIds,
    tenures: allTenureIds,
    positions: new Set((dataset.positions ?? []).map((position) => position.id)),
    orgs: new Set((dataset.organizations ?? []).map((organization) => organization.id)),
    relations: new Set((dataset.relations ?? []).map((relation) => relation.id)),
  };
  const involved = new Map();
  const newPeopleRecords = new Map();
  let personMapUpdates = {};
  let tkResult = null;

  function addSource(record) {
    out.sources.set(record.id, record);
    return record;
  }
  for (const record of extraSources) addSource(record);

  function trackPerson(personId, sourceId) {
    if (!involved.has(personId)) involved.set(personId, new Set());
    involved.get(personId).add(sourceId);
  }

  function createPerson(name, sourceId, extra = {}) {
    const id = nextId(`person:${slugify(name)}`, allPersonIds);
    const record = { id, slug: id.replace(/^person:/, ""), name, ...extra, sources: [] };
    newPersonIds.add(id);
    newPeopleRecords.set(id, record);
    index.byId.set(id, record);
    index.byNormalized.set(normalizeName(name), new Set([id]));
    trackPerson(id, sourceId);
    return id;
  }

  // ---------- bewindspersonen ----------
  function planBewindspersonen(body) {
    const invariants = evaluateBewindspersonenInvariants({ count: body.items.length });
    if (!invariants.ok) return { guard: { allowed: false, reasons: invariants.failures.map((entry) => `${entry.code}: ${entry.detail}`) } };
    const bodySource = buildSourceRecord(SOURCE_DEFS.bewindspersonen, existingSources, today);
    const ref = sourceRef(bodySource.id, today);
    const result = { tenures: [], closures: [], openings: [], gaps: [], review: [], sources: [bodySource], people: new Map(), newPeople: [] };
    const openByPair = new Map();
    for (const tenure of dataset.tenures ?? []) {
      if (tenure.end) continue;
      const key = `${tenure.person}|${tenure.position}`;
      if (!openByPair.has(key)) openByPair.set(key, tenure);
    }
    const fresh = new Set();
    const resolved = new Set();
    // Only positions at a ministry: a title such as "Minister van Onderwijs" also exists at Aruba, Curaçao and Sint Maarten.
    const cabinetIds = new Set(cabinetPositionIds(positions, dataset.organizations ?? null));
    const cabinetPositions = positions.filter((position) => cabinetIds.has(position.id));
    let blocked = false;
    for (const item of body.items) {
      const positionId = matchBewindspersoonPosition(item.role, cabinetPositions, posById);
      if (!positionId) {
        blocked = true;
        result.gaps.push(
          makeGap(
            `Positie voor rol "${item.role}" van ${item.name}`,
            "geen bestaand pos:-record gevonden op titel of organisatie",
            RIJKSOVERHEID_URL,
            "Voeg het ontbrekende pos:-record toe in data/positions.json en draai de refresh opnieuw.",
          ),
        );
        continue;
      }
      const found = resolvePerson(item.name, index);
      let personId;
      let personSourceRef = ref;
      if (found.status === "ambiguous") {
        blocked = true;
        result.review.push({
          kind: "identity-ambiguous",
          key: `identity-ambiguous|${item.slug}`,
          text: `${item.name} (${item.url}) komt overeen met meerdere personen (${found.candidates.join(", ")}); geen tenure geschreven.`,
        });
        continue;
      }
      if (found.status === "matched") {
        personId = found.id;
      } else {
        const pageSource = buildSourceRecord(
          {
            id: `src:rijksoverheid-bewindspersoon-${slugify(item.slug)}`,
            url: item.url,
            title: `${item.name} (Rijksoverheid)`,
            publisher: "Rijksoverheid",
            type: "page",
            license: "CC0-1.0",
            notes: `Persoonspagina van een bewindspersoon: ${item.role}.`,
          },
          existingSources,
          today,
        );
        result.sources.push(pageSource);
        personSourceRef = sourceRef(pageSource.id, today);
        personId = createPerson(item.name, pageSource.id);
        result.newPeople.push(personId);
        result.review.push({
          kind: "new-person",
          key: `new-person|${personId}`,
          text: `Nieuwe persoon ${personId} aangemaakt uit de Rijksoverheid-pagina ${item.url} (${item.role}).`,
        });
      }
      resolved.add(personId);
      fresh.add(`${personId}|${positionId}`);
      const existing = openByPair.get(`${personId}|${positionId}`);
      if (existing) {
        result.tenures.push({ ...existing, source: ref });
        result.people.set(personId, ref.source);
        continue;
      }
      // A new holder: the page gives no appointment date, so the start is unknown (ADR 0020), never the retrieval date.
      const position = posById.get(positionId);
      const id = nextId(`tenure:${position.slug ?? positionId.replace(/^pos:/, "")}-${personId.replace(/^person:/, "")}`, allTenureIds);
      const tenure = {
        id,
        person: personId,
        position: positionId,
        seat: null,
        start: null,
        end: null,
        acting: false,
        entryMode: "benoemd-bij-kb",
        appointedBy: null,
        predecessor: null,
        successor: null,
        endReason: null,
        source: personSourceRef,
      };
      result.tenures.push(tenure);
      result.openings.push({ entity: "tenures", record: tenure, why: "new-bewindspersoon" });
      result.people.set(personId, personSourceRef.source);
      result.review.push({
        kind: "unknown-start",
        key: `unknown-start|${id}`,
        text: `${id}: de Rijksoverheid-pagina noemt geen benoemingsdatum, dus de start is onbekend (ADR 0020). Een Staatscourant-besluit kan hem later dateren.`,
      });
    }
    if (!blocked) {
      const covered = new Set(cabinetIds);
      for (const tenure of dataset.tenures ?? []) {
        if (tenure.end || !covered.has(tenure.position)) continue;
        if (fresh.has(`${tenure.person}|${tenure.position}`)) continue;
        const record = { ...tenure, end: today, source: sourceRef(bodySource.id, today, "medium") };
        result.tenures.push(record);
        result.closures.push({ entity: "tenures", record, why: "left-office", endIsOfficial: false });
        result.review.push({
          kind: "closed-without-official-end",
          key: `closed-without-official-end|${tenure.id}`,
          text: `${tenure.id} is gesloten op de ophaaldatum ${today}: de Rijksoverheid-pagina noemt geen einddatum. Een Staatscourant-besluit kan hem later dateren.`,
        });
      }
    }
    const cabinetChanged = Boolean(body.cabinet?.slug && state.bewindspersonen?.cabinetSlug && body.cabinet.slug !== state.bewindspersonen.cabinetSlug);
    const decision = decideBulk({
      closures: result.closures.length,
      fractieChanged: cabinetChanged,
      events: recentEvents({ today, elections: elections.filter((entry) => entry.body === "org:tweede-kamer"), coalitions }),
      maxQuiet: 3,
    });
    result.guard = { allowed: decision.allowed, bulk: decision.bulk, event: decision.event, cabinetChanged, reasons: decision.allowed ? [] : [decision.reason] };
    if (decision.allowed && decision.bulk) {
      result.review.push({
        kind: "bulk-event",
        key: `bulk-event|bewindspersonen|${today}|${decision.event}`,
        text: `Kabinetswijziging toegepast (${decision.event}): ${result.closures.length} sluitingen en ${result.openings.length} nieuwe bewindspersonen op ${today}.`,
      });
    }
    result.resolved = resolved.size;
    result.blocked = blocked;
    return result;
  }

  // ---------- Eerste Kamer members ----------
  function planEersteKamerMembers(body) {
    const items = body.items;
    const invariants = evaluateEkInvariants({ members: items, fracties: body.fracties ?? [] });
    // Without the fracties page only the member total can be checked.
    const failures = body.fracties ? invariants.failures : invariants.failures.filter((entry) => entry.code === "member-total");
    if (failures.length > 0) return { guard: { allowed: false, reasons: failures.map((entry) => `${entry.code}: ${entry.detail}`) } };
    const orgPresent = (dataset.organizations ?? []).some((organization) => organization.id === EK_ORG);
    if (!orgPresent) {
      return { guard: { allowed: false, reasons: ["org:eerste-kamer ontbreekt in data/organizations.json"] } };
    }
    const bodySource = buildSourceRecord(SOURCE_DEFS.eersteKamer, existingSources, today);
    const ref = sourceRef(bodySource.id, today);
    const result = { memberships: [], closures: [], openings: [], gaps: [], review: [], sources: [bodySource], people: new Map(), extraPersons: {}, resolved: 0 };
    const openByPerson = new Map();
    for (const membership of dataset.memberships ?? []) {
      if (membership.end || membership.organization !== EK_ORG) continue;
      if (!openByPerson.has(membership.person)) openByPerson.set(membership.person, membership);
    }
    const present = new Set();
    let blocked = false;
    for (const item of items) {
      const found = resolvePerson(item.name, index);
      let personId;
      let personRef = ref;
      if (found.status === "ambiguous") {
        blocked = true;
        result.review.push({
          kind: "identity-ambiguous",
          key: `identity-ambiguous|${item.slug}`,
          text: `${item.name} (${item.url}) komt overeen met meerdere personen (${found.candidates.join(", ")}).`,
        });
        continue;
      }
      if (found.status === "matched") {
        personId = found.id;
      } else {
        const pageSource = buildSourceRecord(
          {
            id: `src:ek-persoon-${slugify(item.slug)}`,
            url: item.url,
            title: `${item.name} (${item.party}) - ledenpagina Eerste Kamer`,
            publisher: "Eerste Kamer",
            type: "page",
            license: "CC-BY-4.0",
            notes: `Bron: Eerste Kamer der Staten-Generaal, ${item.url}, geraadpleegd ${today}.`,
          },
          existingSources,
          today,
        );
        result.sources.push(pageSource);
        personRef = sourceRef(pageSource.id, today);
        personId = createPerson(item.name, pageSource.id);
        result.review.push({
          kind: "new-person",
          key: `new-person|${personId}`,
          text: `Nieuwe persoon ${personId} aangemaakt uit de Eerste Kamer-pagina ${item.url}.`,
        });
      }
      present.add(personId);
      result.extraPersons[item.slug] = personId;
      result.resolved += 1;
      result.people.set(personId, personRef.source);
      const existing = openByPerson.get(personId);
      if (existing) {
        result.memberships.push({ ...existing, fractie: item.party || existing.fractie || null, source: ref });
        continue;
      }
      const since = body.memberSince?.[item.slug] ?? null;
      if (!since) {
        result.gaps.push(
          makeGap(
            `Startdatum van het Eerste Kamerlidmaatschap van ${item.name}`,
            "geen bestaande open membership en de ledenpagina noemt geen startdatum",
            item.url,
            "Zoek de installatiedatum op de persoonspagina of in de personele mutaties en voeg de membership toe.",
          ),
        );
        continue;
      }
      const membership = {
        id: nextId(`membership:eerste-kamer-${slugify(item.name)}`, allMembershipIds),
        organization: EK_ORG,
        person: personId,
        seatNumber: null,
        fractie: item.party || null,
        start: since,
        end: null,
        source: sourceRef(personRef.source, today),
      };
      result.memberships.push(membership);
      result.openings.push({ entity: "memberships", record: membership, why: "new-senator" });
    }
    if (!blocked) {
      for (const membership of dataset.memberships ?? []) {
        if (membership.end || membership.organization !== EK_ORG) continue;
        if (present.has(membership.person)) continue;
        const record = { ...membership, end: today, source: sourceRef(bodySource.id, today, "medium") };
        result.memberships.push(record);
        result.closures.push({ entity: "memberships", record, why: "left-senate", endIsOfficial: false });
        result.review.push({
          kind: "closed-without-official-end",
          key: `closed-without-official-end|${membership.id}`,
          text: `${membership.id} is gesloten op de ophaaldatum ${today}: de Eerste Kamer-pagina noemt geen einddatum.`,
        });
      }
    }
    const datasetLabels = new Set(
      [...openByPerson.values()].map((membership) => membership.fractie).filter(Boolean),
    );
    const pageLabels = new Set(items.map((item) => item.party).filter(Boolean));
    const fractieChanged = [...pageLabels].some((label) => !datasetLabels.has(label)) || [...datasetLabels].some((label) => !pageLabels.has(label));
    const decision = decideBulk({
      closures: result.closures.length,
      fractieChanged,
      events: recentEvents({ today, elections: elections.filter((entry) => entry.body === EK_ORG) }),
    });
    result.guard = { allowed: decision.allowed, bulk: decision.bulk, event: decision.event, fractieChanged, reasons: decision.allowed ? [] : [decision.reason] };
    if (decision.allowed && decision.bulk) {
      result.review.push({
        kind: "bulk-event",
        key: `bulk-event|eerste-kamer|${today}|${decision.event}`,
        text: `Bulkwijziging toegepast (${decision.event}): ${result.closures.length} sluitingen in de Eerste Kamer-bron op ${today}.`,
      });
    }
    return result;
  }

  function stop(source, reasons) {
    stopped.push({ source, reasons });
    guards[source] = { allowed: false, reasons };
  }

  function take(source, result, extraEntities = {}) {
    planned.add(source);
    guards[source] = result.guard;
    for (const record of result.sources ?? []) addSource(record);
    for (const record of result.organizations ?? []) out.organizations.set(record.id, record);
    for (const record of result.tenures ?? []) out.tenures.set(record.id, record);
    for (const record of result.memberships ?? []) out.memberships.set(record.id, record);
    for (const record of result.positions ?? []) out.positions.set(record.id, record);
    for (const record of result.relations ?? []) out.relations.set(record.id, record);
    for (const record of result.people instanceof Map ? [] : result.people ?? []) out.people.set(record.id, record);
    closures.push(...(result.closures ?? []));
    openings.push(...(result.openings ?? []));
    gaps.push(...(result.gaps ?? []));
    review.push(...(result.review ?? []));
    void extraEntities;
  }

  if (isFetched(bodies.bewindspersonen)) {
    const result = planBewindspersonen(bodies.bewindspersonen);
    if (!result.guard.allowed) {
      review.push(...(result.review ?? []));
      stop("bewindspersonen", result.guard.reasons);
    } else {
      take("bewindspersonen", result);
      for (const [personId, sourceId] of result.people) trackPerson(personId, sourceId);
      guards.bewindspersonen.fetched = bodies.bewindspersonen.items.length;
      guards.bewindspersonen.resolved = result.resolved;
    }
  }

  let ekMembers = null;
  if (isFetched(bodies.eersteKamer)) {
    ekMembers = planEersteKamerMembers(bodies.eersteKamer);
    if (!ekMembers.guard.allowed) {
      stop("eersteKamer", ekMembers.guard.reasons);
      ekMembers = null;
    } else {
      take("eersteKamer", ekMembers);
      for (const [personId, sourceId] of ekMembers.people) trackPerson(personId, sourceId);
      guards.eersteKamer.fetched = bodies.eersteKamer.items.length;
      guards.eersteKamer.resolved = ekMembers.resolved;
      if (bodies.eersteKamer.boards) {
        const patched = {
          ...dataset,
          people: [...dataset.people, ...[...newPeopleRecords.values()]],
          memberships: dataset.memberships,
        };
        const boards = planEersteKamerBoards({
          ek: { boards: bodies.eersteKamer.boards, voorzitter: bodies.eersteKamer.voorzitter, extraPersons: ekMembers.extraPersons },
          memberItems: bodies.eersteKamer.items,
          dataset: patched,
          today,
          colofon: state.ek?.colofon ?? null,
        });
        for (const record of boards.sources) addSource(record);
        for (const record of boards.tenures) out.tenures.set(record.id, record);
        for (const record of boards.positions) out.positions.set(record.id, record);
        for (const record of boards.relations) out.relations.set(record.id, record);
        closures.push(...boards.closures);
        openings.push(...boards.openings);
        gaps.push(...boards.gaps);
        review.push(...boards.review);
      }
      gaps.push(...(bodies.eersteKamer.gaps ?? []));
    }
  }

  if (isFetched(bodies.tweedeKamer)) {
    tkResult = await planTweedeKamer({
      snapshot: bodies.tweedeKamer.snapshot,
      dataset,
      state,
      today,
      elections: elections.filter((entry) => entry.body === "org:tweede-kamer"),
      coalitions,
      lookupClosedRow,
      registeredFractieKeys,
    });
    if (!tkResult.guard.allowed) {
      review.push(...tkResult.review.filter((entry) => entry.kind === "identity-ambiguous"));
      stop("tweedeKamer", tkResult.guard.reasons);
    } else {
      take("tweedeKamer", tkResult);
      personMapUpdates = tkResult.personMap;
      guards.tweedeKamer.fetched = bodies.tweedeKamer.snapshot.rows.filter((row) => !row.totEnMet).length;
      guards.tweedeKamer.resolved = tkResult.stats.activeSeats;
    }
  }

  // ---------- provincies, gemeenten, waterschappen, commissarissen (ADR 0027) ----------
  const decentralOptions = options.decentral ?? {};
  for (const key of DECENTRAL_KEYS) {
    if (!isFetched(bodies[key])) continue;
    const result =
      key === "commissarissen"
        ? planCommissarissen({ body: bodies[key], dataset, state, today, taken, options: decentralOptions })
        : planDecentral({ level: key, body: bodies[key], dataset, state, today, elections: [], taken, options: decentralOptions });
    if (!result.guard.allowed) {
      review.push(...result.review.filter((entry) => entry.kind === "identity-ambiguous"));
      stop(key, result.guard.reasons);
      continue;
    }
    take(key, result);
    for (const [personId, sourceId] of result.touched) trackPerson(personId, sourceId);
    for (const record of result.people) {
      if (!index.byId.has(record.id)) {
        index.byId.set(record.id, record);
        decentralNewPeople += 1;
      }
    }
    for (const id of result.sourceUpgrades ?? []) sourceUpgrades.add(id);
    decentralState[key] = result.stateUpdate ?? {};
    guards[key].fetched = result.fetched ?? 0;
    guards[key].resolved = result.resolved ?? 0;
    guards[key].stats = result.stats ?? {};
  }

  // ---------- people: involved persons gain the live source ----------
  const sourceIdsBySource = out.sources;
  for (const [personId, sourceIds] of involved) {
    const existing = index.byId.get(personId);
    const record = newPeopleRecords.has(personId)
      ? newPeopleRecords.get(personId)
      : out.people.get(personId) ?? structuredClone(existing);
    if (!record) continue;
    if (!Array.isArray(record.sources)) record.sources = [];
    const have = new Set(record.sources.map((entry) => entry && entry.source));
    for (const sourceId of [...sourceIds].sort()) {
      if (have.has(sourceId) || !sourceIdsBySource.has(sourceId)) continue;
      record.sources.push(sourceRef(sourceId, today));
      have.add(sourceId);
    }
    out.people.set(personId, record);
  }
  for (const record of out.people.values()) {
    if (!Array.isArray(record.sources) || record.sources.length === 0) {
      record.sources = [sourceRef([...out.sources.keys()][0] ?? "src:onbekend", today)];
    }
  }

  // ---------- carry forward what this run did not plan ----------
  const prev = prevEnvelope ?? {};
  const positionsForOwner = new Map([...posById, ...(prev.positions ?? []).map((position) => [position.id, position])]);
  for (const entity of ["tenures", "memberships"]) {
    for (const record of prev[entity] ?? []) {
      if (out[entity].has(record.id)) continue;
      const owner = ownerOf(entity, record, positionsForOwner);
      const ownerPlanned = owner !== null && planned.has(owner);
      const isClosed = Boolean(record.end);
      // Records of the decentral sources are carried whether open or closed: the planner emits changes only.
      const carryAlways = owner !== null && DECENTRAL_KEYS.includes(owner);
      if (isClosed || carryAlways || (owner !== null && !ownerPlanned)) out[entity].set(record.id, record);
    }
  }
  for (const entity of ["people", "positions", "relations", "sources"]) {
    for (const record of prev[entity] ?? []) {
      if (!out[entity].has(record.id)) out[entity].set(record.id, record);
    }
  }

  const envelope = {
    workstream: "P",
    // Stable within a day, so a run that finds nothing new rewrites nothing.
    generatedAt: new Date(`${today}T00:00:00.000Z`).toISOString(),
    endpointsUsed: mergeEndpoints(prev.endpointsUsed, fetched.endpointsUsed),
    organizations: sortById([...out.organizations.values()]),
    positions: sortById([...out.positions.values()]),
    people: sortById([...out.people.values()]),
    tenures: sortById([...out.tenures.values()]),
    memberships: sortById([...out.memberships.values()]),
    relations: sortById([...out.relations.values()]),
    topics: [],
    budgets: [],
    sources: sortById([...out.sources.values()]),
    media: [],
    gaps,
  };

  const stats = {
    tenuresEmitted: envelope.tenures.length,
    membershipsEmitted: envelope.memberships.length,
    opened: openings.length,
    closed: closures.length,
    closures,
    openings,
    gaps: gaps.length,
    newPeople: newPersonIds.size + (tkResult?.guard.allowed ? tkResult.stats.newPeople : 0) + decentralNewPeople,
    review: review.length,
    stopped: stopped.length,
    planned: [...planned],
    bodies: {
      bewindspersonen: { fetched: guards.bewindspersonen?.fetched ?? 0, resolved: guards.bewindspersonen?.resolved ?? 0 },
      tweedeKamer: { fetched: guards.tweedeKamer?.fetched ?? 0, resolved: guards.tweedeKamer?.resolved ?? 0 },
      eersteKamer: { fetched: guards.eersteKamer?.fetched ?? 0, resolved: guards.eersteKamer?.resolved ?? 0 },
      ...Object.fromEntries(DECENTRAL_KEYS.map((key) => [key, { fetched: guards[key]?.fetched ?? 0, resolved: guards[key]?.resolved ?? 0, stats: guards[key]?.stats ?? null }])),
    },
    tweedeKamer: tkResult
      ? {
          seatsByFractie: tkResult.seatsByFractie ?? null,
          newFracties: tkResult.newFracties ?? [],
          goneFracties: tkResult.goneFracties ?? [],
          invariants: tkResult.invariants?.stats ?? null,
          maxApiGewijzigdOp: tkResult.maxApiGewijzigdOp ?? null,
        }
      : null,
  };

  return { envelope, stats, closures, openings, gaps, review, stopped, planned: [...planned], guards, personMapUpdates, tkResult, decentralState, sourceUpgrades: [...sourceUpgrades] };
}

// ---------- reports ----------

const DECENTRAL_LABEL = {
  gemeenten: "Gemeenten (TOOI, register, CBS)",
  provincies: "Provincies (TOOI, register, CBS)",
  waterschappen: "Waterschappen (TOOI, register)",
  commissarissen: "Commissarissen van de Koning (Rijksoverheid)",
};

function bodyStatusLine(name, body) {
  if (!body) return `- ${name}: niet opgehaald`;
  if (body.skipped) return `- ${name}: niet nodig deze run (${body.reason ?? "ongewijzigd"})`;
  if (body.ok) {
    if (body.snapshot) return `- ${name}: HTTP ${body.status ?? 200}, ${body.snapshot.rows.length} zetelrijen, ${body.snapshot.fracties.length} fracties, ${body.snapshot.presidium.length} presidiumrijen`;
    if (body.tooi) return `- ${name}: HTTP ${body.status ?? 200}, ${body.tooi.entries.length} TOOI-codes, ${body.register.bodies.length} registerorganisaties, ${body.register.people.length} registerrijen${body.cbs ? `, CBS ${body.cbs.table.id}` : ""}`;
    return `- ${name}: HTTP ${body.status ?? 200}, ${body.items?.length ?? 0} records`;
  }
  return `- ${name}: mislukt (${body.status ?? "netwerk"}, ${body.error ?? "onbekende fout"})`;
}

export function renderReport({ stats, fetched, today, gaps = [] }) {
  const lines = [];
  lines.push("# Workstream P: live ambtsdragers");
  lines.push("");
  lines.push(`- Gegenereerd: ${formatDateNL(today)}`);
  lines.push(
    "- Bron: officiële pagina's van Rijksoverheid en de Eerste Kamer, en het Tweede Kamer OData-gegevensmagazijn (FractieZetelPersoon met gesloten rijen, Fractie, Presidium).",
  );
  lines.push("- Werkwijze: fetch, nooit uit het geheugen; elke startdatum komt uit een bron of uit een bestaand, al gedateerd record. Geen einddatum wordt verzonnen: een sluiting zonder bronrij krijgt de ophaaldatum met confidence medium en staat in de reviewlijst.");
  lines.push("- Bewaking: een bron met inconsistente data (zetels, dubbele zetels, fractietotalen, 75 leden, 28 plus of min 3 bewindspersonen) schrijft niets; bulksluitingen alleen bij een gebeurtenis (ADR 0024).");
  lines.push("");
  lines.push("## Endpoints");
  lines.push("");
  lines.push("| Bron | URL | Opgehaald | Status |");
  lines.push("| --- | --- | --- | --- |");
  for (const endpoint of fetched.endpointsUsed ?? []) {
    lines.push(`| ${endpoint.notes ?? ""} | ${endpoint.url} | ${formatDateNL(endpoint.retrieved)} | ${endpoint.status ?? 200} |`);
  }
  lines.push("");
  lines.push("## Tellingen");
  lines.push("");
  lines.push(`- Bewindspersonen: ${stats.bodies.bewindspersonen.fetched} opgehaald, ${stats.bodies.bewindspersonen.resolved} gematcht.`);
  lines.push(`- Tweede Kamer: ${stats.bodies.tweedeKamer.fetched} geldige leden, ${stats.bodies.tweedeKamer.resolved} gematcht.`);
  lines.push(`- Eerste Kamer: ${stats.bodies.eersteKamer.fetched} leden, ${stats.bodies.eersteKamer.resolved} gematcht.`);
  for (const key of DECENTRAL_KEYS) lines.push(`- ${DECENTRAL_LABEL[key]}: ${stats.bodies[key]?.fetched ?? 0} gelezen, ${stats.bodies[key]?.resolved ?? 0} gekoppeld.`);
  lines.push(`- Nieuwe personen: ${stats.newPeople}.`);
  lines.push(`- Uitgegeven tenures: ${stats.tenuresEmitted}. Uitgegeven memberships: ${stats.membershipsEmitted}.`);
  lines.push(`- Geopend: ${stats.opened}. Gesloten: ${stats.closed}.`);
  lines.push(`- Gestopt door de bewaking: ${stats.stopped}. Gaps: ${stats.gaps}.`);
  lines.push("");
  lines.push("## Toelichting");
  lines.push("");
  lines.push("- De Rijksoverheid-pagina noemt geen benoemingsdatum. Voor bestaande bewindspersonen is de start uit het bestaande open record overgenomen; een nieuwe bewindspersoon krijgt een onbekende start (ADR 0020).");
  lines.push("- Tweede Kamer: open zetelrijen, gesloten rijen die sinds de cursor zijn gewijzigd (ApiGewijzigdOp, dus ook achterdateerde rijen), Fractie.AantalZetels als controle, en het Presidium voor de Voorzitter en de ondervoorzitters.");
  lines.push("- Eerste Kamer: ledenlijst, fractiebesturen en de Voorzitter uit de eigen pagina's; de pagina noemt geen einddatum, dus een vervangen fractievoorzitter wordt gesloten op de dag voor de start van de opvolger (confidence medium, reviewlijst).");
  lines.push("- Sluitingen krijgen de officiële einddatum van de bronrij (TotEnMet) wanneer die bestaat, anders de ophaaldatum met confidence medium.");
  lines.push("");
  lines.push("## Gaps");
  lines.push("");
  const all = gaps.length > 0 ? gaps : fetched.gaps ?? [];
  if (all.length === 0) {
    lines.push("Geen.");
  } else {
    let number = 1;
    for (const gap of all) {
      lines.push(`${number}. ${gap.what} (${gap.endpoint}): ${gap.why.replace(/\.$/, "")}. Vervolg: ${gap.resume}`);
      number += 1;
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function renderQaReport({ stats, fetched, today, stopped = [], gaps = [], review = [] }) {
  const lines = [];
  lines.push(`# Run report: refresh-official ${formatDateNL(today)}`);
  lines.push("");
  lines.push("## HTTP-statussen en aantallen per lichaam");
  lines.push("");
  lines.push(`- Rijksoverheid bewindspersonen: ${stats.bodies.bewindspersonen.fetched} opgehaald, ${stats.bodies.bewindspersonen.resolved} gematcht.`);
  lines.push(`- Tweede Kamer OData: ${stats.bodies.tweedeKamer.fetched} geldige leden, ${stats.bodies.tweedeKamer.resolved} gematcht.`);
  lines.push(`- Eerste Kamer: ${stats.bodies.eersteKamer.fetched} leden, ${stats.bodies.eersteKamer.resolved} gematcht.`);
  for (const key of DECENTRAL_KEYS) lines.push(`- ${DECENTRAL_LABEL[key]}: ${stats.bodies[key]?.fetched ?? 0} gelezen, ${stats.bodies[key]?.resolved ?? 0} gekoppeld${stats.bodies[key]?.stats ? ` (${JSON.stringify(stats.bodies[key].stats)})` : ""}.`);
  lines.push("");
  lines.push("Per bron:");
  lines.push("");
  lines.push(bodyStatusLine("Rijksoverheid bewindspersonen", fetched.bodies.bewindspersonen));
  lines.push(bodyStatusLine("Tweede Kamer OData", fetched.bodies.tweedeKamer));
  lines.push(bodyStatusLine("Eerste Kamer leden", fetched.bodies.eersteKamer));
  for (const key of DECENTRAL_KEYS) lines.push(bodyStatusLine(DECENTRAL_LABEL[key], fetched.bodies[key]));
  lines.push("");
  lines.push("## Uitgegeven records");
  lines.push("");
  lines.push(`- Tenures: ${stats.tenuresEmitted}.`);
  lines.push(`- Memberships: ${stats.membershipsEmitted}.`);
  lines.push(`- Nieuwe personen: ${stats.newPeople}.`);
  lines.push("");
  lines.push("## Sluitingen");
  lines.push("");
  if (stats.closures.length === 0) {
    lines.push("Geen open records gesloten.");
  } else {
    for (const closure of stats.closures) {
      lines.push(`- ${closure.record.id} -> einde ${formatDateNL(closure.record.end)} (${closure.record.source.confidence})`);
    }
  }
  lines.push("");
  lines.push("## Openingen");
  lines.push("");
  if (stats.openings.length === 0) {
    lines.push("Geen nieuwe records geopend.");
  } else {
    for (const opening of stats.openings) {
      lines.push(`- ${opening.record.id} -> start ${opening.record.start ? formatDateNL(opening.record.start) : "onbekend"}`);
    }
  }
  lines.push("");
  lines.push("## Gaps");
  lines.push("");
  lines.push(`Aantal gaps: ${gaps.length}.`);
  let number = 1;
  for (const gap of gaps) {
    lines.push(`${number}. ${gap.what} (${gap.endpoint}): ${gap.why.replace(/\.$/, "")}. Vervolg: ${gap.resume}`);
    number += 1;
  }
  lines.push("");
  lines.push("## Review");
  lines.push("");
  if (review.length === 0) lines.push("Niets om te reviewen.");
  for (const entry of review) lines.push(`- ${entry.text}`);
  lines.push("");
  lines.push("## Veiligheidscontrole");
  lines.push("");
  if (stopped.length === 0) {
    lines.push(`- Alle opgehaalde bronnen waren consistent. Resultaat: OK.`);
  } else {
    for (const entry of stopped) lines.push(`- ${entry.source}: GEBLOKKEERD. ${entry.reasons.join("; ")}.`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

// ---------- fetching ----------

export function allSources() {
  return { bewindspersonen: true, tweedeKamer: true, eersteKamer: true, ...Object.fromEntries(DECENTRAL_KEYS.map((key) => [key, true])) };
}

/**
 * Fetch the sources named in `which`. `tk.since` is the start of the read window for
 * closed rows. Failures are recorded per source, not thrown.
 */
export async function fetchOfficialSources({
  http = createHttp(),
  today,
  generatedAt = new Date().toISOString(),
  which = allSources(),
  dataset = { people: [], memberships: [] },
  state = {},
  tkSince = null,
  fractiesHtml = null,
} = {}) {
  const bodies = {};
  const rawFiles = [];
  const endpointsUsed = [];
  const gaps = [];
  const notes = {};

  function failed(key, name, url, error) {
    bodies[key] = { ok: false, status: error.status ?? null, url, items: [], error: error.message };
    gaps.push(
      makeGap(
        `${name} kon niet worden opgehaald`,
        `netwerk- of parsefout: ${error.message}`,
        url,
        "Controleer de endpoint of probeer het later opnieuw; de vorige records blijven ongewijzigd open.",
      ),
    );
  }

  for (const key of SOURCE_KEYS) if (!which[key]) bodies[key] = { ok: true, skipped: true, reason: "niet aan de beurt", items: [] };

  if (which.bewindspersonen) {
    try {
      const text = await http.getText(RIJKSOVERHEID_URL, { accept: "text/html" });
      const items = parseRijksoverheidBewindspersonen(text);
      bodies.bewindspersonen = { ok: true, status: 200, url: RIJKSOVERHEID_URL, items, cabinet: parseRijksoverheidCabinet(text) };
      rawFiles.push({ path: RAW_RIJKSOVERHEID, content: text });
      endpointsUsed.push({ url: RIJKSOVERHEID_URL, retrieved: today, notes: "Rijksoverheid bewindspersonen" });
    } catch (error) {
      failed("bewindspersonen", "Rijksoverheid bewindspersonen", RIJKSOVERHEID_URL, error);
    }
  }

  if (which.tweedeKamer) {
    try {
      const presidiumId = state.tk?.presidiumId ?? (await fetchPresidiumId(http));
      const since = tkSince ?? readWindowStart(state.tk?.cursors?.fzp, today);
      const result = await fetchTkSnapshot({ http, since, presidiumId });
      bodies.tweedeKamer = { ok: true, status: 200, url: TK_ODATA_URL, snapshot: result.snapshot, raws: result.raws, latest: result.latest, presidiumId, requests: result.requests };
      rawFiles.push({ path: RAW_TWEDE_KAMER, content: `${JSON.stringify({ value: result.rawOpen }, null, 2)}\n` });
      for (const def of Object.values(TK_SOURCE_DEFS)) endpointsUsed.push({ url: def.url, retrieved: today, notes: def.title });
      notes.presidiumId = presidiumId;
      notes.lookupClosedRow = makeClosedRowLookup({ http, presidiumId });
    } catch (error) {
      failed("tweedeKamer", "Tweede Kamer OData", TK_ODATA_URL, error);
    }
  }

  if (which.eersteKamer) {
    try {
      const index = buildPersonIndex(dataset.people);
      const openEk = new Set(
        (dataset.memberships ?? []).filter((m) => !m.end && m.organization === EK_ORG).map((m) => m.person),
      );
      const full = await fetchEkFull({
        http,
        fractiesHtml,
        parseMembers: parseEersteKamerLeden,
        selectNeedSince: (items) =>
          items
            .filter((item) => {
              const found = resolvePerson(item.name, index);
              return found.status !== "matched" || !openEk.has(found.id);
            })
            .map((item) => item.slug),
      });
      bodies.eersteKamer = {
        ok: true,
        status: 200,
        url: EERSTE_KAMER_URL,
        items: full.items,
        fracties: full.fracties,
        boards: full.boards,
        voorzitter: full.voorzitter,
        memberSince: full.memberSince,
        gaps: full.gaps,
      };
      rawFiles.push({ path: RAW_EERSTE_KAMER, content: full.leden });
      endpointsUsed.push({ url: EERSTE_KAMER_URL, retrieved: today, notes: "Eerste Kamer alle leden" });
      endpointsUsed.push({ url: EK_URLS.fracties, retrieved: today, notes: "Eerste Kamer fracties en fractiebesturen" });
    } catch (error) {
      failed("eersteKamer", "Eerste Kamer alle leden", EERSTE_KAMER_URL, error);
    }
  }

  const sharedDecentral = {};
  for (const key of DECENTRAL_KEYS) {
    if (!which[key]) continue;
    try {
      const body = await fetchDecentral({ http, key, today, shared: sharedDecentral });
      bodies[key] = body;
      endpointsUsed.push(...body.endpointsUsed);
    } catch (error) {
      bodies[key] = { ok: false, status: error.status ?? null, url: null, items: [], error: error.message };
      gaps.push(failureGap(key, error));
    }
  }

  return { generatedAt, bodies, rawFiles, endpointsUsed, gaps, notes };
}

function resolveRoot(root) {
  return root ?? REPO_ROOT;
}

async function readPrevEnvelope(root) {
  try {
    return JSON.parse(await readFile(join(root, "research", "P-live-ambtsdragers.json"), "utf8"));
  } catch {
    return null;
  }
}

export async function runRefresh(options = {}) {
  const now = options.now ?? new Date();
  const today = options.today ?? now.toISOString().slice(0, 10);
  const root = resolveRoot(options.root);
  const io = { writeFile, mkdir, ...(options.io ?? {}) };
  const log = options.log ?? console.log;
  const dataset = options.dataset ?? (await loadDataset(join(root, "data")));
  const state = options.state ?? (await loadState(root));

  const fetched =
    options.fetched ??
    (await fetchOfficialSources({
      http: options.http,
      today,
      generatedAt: now.toISOString(),
      which: options.which ?? allSources(),
      dataset,
      state,
      tkSince: options.tkSince ?? null,
      fractiesHtml: options.fractiesHtml ?? null,
    }));

  const prevEnvelope = options.prevEnvelope === undefined ? await readPrevEnvelope(root) : options.prevEnvelope;
  const plan = await planRefresh({
    fetched,
    dataset,
    today,
    state,
    prevEnvelope,
    lookupClosedRow: options.lookupClosedRow ?? fetched.notes?.lookupClosedRow ?? (async () => null),
    registeredFractieKeys: options.registeredFractieKeys ?? null,
    extraSources: options.extraSources ?? [],
    options: { decentral: options.decentral ?? {} },
  });

  const stoppedSources = new Set(plan.stopped.map((entry) => entry.source));
  for (const file of fetched.rawFiles ?? []) {
    const key = file.path === RAW_RIJKSOVERHEID ? "bewindspersonen" : file.path === RAW_EERSTE_KAMER ? "eersteKamer" : "tweedeKamer";
    if (stoppedSources.has(key)) continue;
    const full = join(root, file.path);
    await io.mkdir(dirname(full), { recursive: true });
    await io.writeFile(full, file.content, "utf8");
  }

  const envelopePath = join(root, "research", "P-live-ambtsdragers.json");
  const reportPath = join(root, "research", "P-live-ambtsdragers.md");
  const qaDir = join(root, "research", "qa");
  const qaPath = join(qaDir, `refresh-official-${formatDateNL(today)}.md`);
  const allGaps = plan.envelope.gaps;

  let envelopeChanged = false;
  if (plan.planned.length > 0 || (options.extraSources ?? []).length > 0) {
    const nextEnvelope = `${JSON.stringify(plan.envelope, null, 2)}\n`;
    let currentEnvelope = null;
    try {
      currentEnvelope = await readFile(envelopePath, "utf8");
    } catch {
      currentEnvelope = null;
    }
    envelopeChanged = currentEnvelope !== nextEnvelope;
    if (envelopeChanged) {
      await io.mkdir(dirname(envelopePath), { recursive: true });
      await io.writeFile(envelopePath, nextEnvelope, "utf8");
    }
    const nextReport = renderReport({ stats: plan.stats, fetched, today, gaps: allGaps });
    let currentReport = null;
    try {
      currentReport = await readFile(reportPath, "utf8");
    } catch {
      currentReport = null;
    }
    if (currentReport !== nextReport) await io.writeFile(reportPath, nextReport, "utf8");
  }
  await io.mkdir(qaDir, { recursive: true });
  await io.writeFile(
    qaPath,
    renderQaReport({ stats: plan.stats, fetched, today, stopped: plan.stopped, gaps: allGaps, review: plan.review }),
    "utf8",
  );

  log(
    `refresh-official: bewindspersonen ${plan.stats.bodies.bewindspersonen.fetched}, ` +
      `TK ${plan.stats.bodies.tweedeKamer.fetched}, EK ${plan.stats.bodies.eersteKamer.fetched}; ` +
      `tenures ${plan.stats.tenuresEmitted}, memberships ${plan.stats.membershipsEmitted}, ` +
      `geopend ${plan.stats.opened}, gesloten ${plan.stats.closed}, gestopt ${plan.stats.stopped}, gaps ${plan.stats.gaps}.`,
  );
  for (const entry of plan.stopped) log(`refresh-official: ${entry.source} gestopt door de bewaking: ${entry.reasons.join("; ")}`);

  return {
    envelopePath,
    reportPath,
    qaPath,
    stats: plan.stats,
    fetched,
    plan,
    stopped: plan.stopped,
    envelopeChanged,
  };
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--root") options.root = argv[(i += 1)];
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = resolveRoot(options.root);
  try {
    const state = await loadState(root);
    const result = await runRefresh({ ...options, state });
    // learn the Persoon.Id map so the next run keys on ids
    if (Object.keys(result.plan.personMapUpdates).length > 0) {
      Object.assign(state.tk.personMap, result.plan.personMapUpdates);
      await saveState(root, state);
    }
    if (result.stopped.length > 0) process.exitCode = 2;
  } catch (error) {
    console.error(`refresh-official failed: ${error.message}`);
    process.exitCode = 1;
  }
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main();
}
