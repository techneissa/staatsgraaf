// Planning of the live read of provincies, gemeenten and waterschappen (ADR 0027).
//
// Pure: the fetched bodies and the dataset in, a plan out (organisations to patch or create, tenures to
// close or open, people to create, sources, review entries, gaps, guard verdict). The caller
// (refresh-official.mjs) merges the plan into the live envelope; live-apply.mjs writes it to data/.
//
// Sources per level (read by decentral-fetch.mjs):
//   gemeenten, waterschappen, provincies: the TOOI organisation set (codes, begin and end dates, herindelingen),
//     the Register van Overheidsorganisaties (bodies, seats, websites, office holders), and for gemeenten and
//     provincies the CBS table "Gebieden in Nederland <jaar>" as an independent count.
//   commissarissen: the Rijksoverheid overview of the commissarissen van de Koning.
//
// Identity: a body is keyed on its official code (gm0363, ws0654, pv22); the map from code to org id lives in the
// state file and starts from the name. A holder is matched on the holder of the same position first, then on a
// strict surname and initials match among people who hold or held a decentral office, else created.

import { holderMatchesPerson, parseHolderName } from "./decentral-names.mjs";
import { currentTooi } from "./decentral-parse.mjs";
import {
  DEFAULT_BOUNDS,
  EVENT_WINDOW_DAYS,
  decideBulk,
  evaluateBodyInvariants,
  evaluateHolderInvariants,
} from "./live-guard.mjs";
import { addDays, buildSourceRecord, daysBetween, formatDateNL, makeGap, nextId, normalizeName, slugify, sourceRef } from "./live-util.mjs";

export const DECENTRAL_LEVELS = ["gemeenten", "provincies", "waterschappen"];
export const DECENTRAL_KEYS = [...DECENTRAL_LEVELS, "commissarissen"];

/** Wethouders are 1.4 thousand more person pages on the web export (ADR 0022 file budget); off until the web owner agrees. */
export const DEFAULT_OPTIONS = { wethouders: false, bounds: DEFAULT_BOUNDS };

const LEVELS = {
  gemeenten: {
    label: "gemeenten",
    tooi: "gemeente",
    register: "Gemeenten",
    orgSubtype: "gemeente",
    councilSubtype: "gemeenteraad",
    prefix: "gm",
    headTitle: /^Burgemeester\b/,
    headFunctions: { regular: ["Burgemeester"], acting: ["Burgemeester waarnemend"] },
  },
  provincies: {
    label: "provincies",
    tooi: "provincie",
    register: "Provincies",
    orgSubtype: "provincie",
    councilSubtype: "provinciale-staten",
    prefix: "pv",
    headTitle: /^Commissaris\b/,
    headFunctions: { regular: [], acting: [] },
  },
  waterschappen: {
    label: "waterschappen",
    tooi: "waterschap",
    register: "Waterschappen",
    orgSubtype: "waterschap",
    councilSubtype: "algemeen-bestuur-waterschap",
    prefix: "ws",
    headTitle: /^Dijkgraaf\b/,
    headFunctions: { regular: ["Dijkgraaf", "Watergraaf"], acting: ["Dijkgraaf(Waarnemend)", "Watergraaf(Waarnemend)"] },
  },
};

export function sourceDefs(level, cbsTable = null) {
  const cfg = LEVELS[level];
  const defs = {
    tooi: {
      id: `src:tooi-${level}`,
      url: `https://identifier.overheid.nl/tooi/id/${cfg.tooi}?format=json`,
      title: `TOOI: organisatieset ${cfg.label}`,
      publisher: "KOOP / Overheid.nl",
      type: "register",
      license: "unknown",
      notes: "Officiële organisatiecodes, begin- en einddata en herindelingen (JSON-LD). Een licentieverklaring staat niet op de set of op standaarden.overheid.nl/tooi; alleen feiten (codes, data) worden gebruikt.",
    },
    bodies: {
      id: `src:koop-${level}`,
      url: `https://organisaties.overheid.nl/export/${cfg.register}.csv`,
      title: `Register van Overheidsorganisaties: export ${cfg.label} (CSV)`,
      publisher: "KOOP / Overheid.nl",
      type: "register",
      license: "CC0-1.0",
      notes: "Officiële naam, website, aantal zetels en organisatiecode.",
    },
    people: {
      id: `src:koop-medewerkers-${level}`,
      url: `https://organisaties.overheid.nl/export-medewerkers/${cfg.register}.csv`,
      title: `Register van Overheidsorganisaties: medewerkers ${cfg.label} (CSV)`,
      publisher: "KOOP / Overheid.nl",
      type: "register",
      license: "CC0-1.0",
      notes: "Bestuurders per organisatie met functie. Het register noemt geen benoemingsdatum. Alleen personen met een gemodelleerde publieke functie worden overgenomen.",
    },
  };
  if (cbsTable) {
    defs.cbs = {
      id: `src:cbs-${String(cbsTable.id).toLowerCase()}-live`,
      url: `https://opendata.cbs.nl/ODataApi/odata/${cbsTable.id}/TypedDataSet`,
      title: `${cbsTable.title} (CBS tabel ${cbsTable.id})`,
      publisher: "CBS",
      type: "api",
      license: "CC-BY-4.0",
      notes: "Onafhankelijke telling van gemeenten en provincies met de provincie per gemeente.",
    };
  }
  return defs;
}

export const CVDK_SOURCE_DEF = {
  id: "src:rijksoverheid-cvdk-overzicht",
  url: "https://www.rijksoverheid.nl/themas/overheid-en-democratie/provincies/commissaris-van-de-koning/overzicht/commissarissen-van-de-koning",
  title: "Overzicht commissarissen van de Koning per provincie",
  publisher: "Rijksoverheid",
  type: "page",
  license: "CC0-1.0",
  notes: "Naam, partij, datum van benoeming en geboortedatum per provincie.",
};

// ---------- dataset indexes ----------

function indexDataset(dataset) {
  const orgById = new Map();
  const childrenOf = new Map();
  for (const org of dataset.organizations ?? []) {
    orgById.set(org.id, org);
    const parent = org.parent ?? org.partOf?.[0] ?? null;
    if (parent) {
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent).push(org);
    }
  }
  const positionsByOrg = new Map();
  for (const position of dataset.positions ?? []) {
    if (!positionsByOrg.has(position.organization)) positionsByOrg.set(position.organization, []);
    positionsByOrg.get(position.organization).push(position);
  }
  const openByPosition = new Map();
  const tenuresByPerson = new Map();
  for (const tenure of dataset.tenures ?? []) {
    if (!tenuresByPerson.has(tenure.person)) tenuresByPerson.set(tenure.person, []);
    tenuresByPerson.get(tenure.person).push(tenure);
    if (tenure.end) continue;
    if (!openByPosition.has(tenure.position)) openByPosition.set(tenure.position, []);
    openByPosition.get(tenure.position).push(tenure);
  }
  const peopleById = new Map((dataset.people ?? []).map((person) => [person.id, person]));
  return { orgById, childrenOf, positionsByOrg, openByPosition, tenuresByPerson, peopleById };
}

/** The decentral orgs: the bodies of the three levels and what hangs under them. */
function decentralOrgIds(dataset, idx) {
  const roots = (dataset.organizations ?? []).filter((org) => ["gemeente", "provincie", "waterschap"].includes(org.subtype));
  const ids = new Set();
  for (const root of roots) {
    ids.add(root.id);
    for (const child of idx.childrenOf.get(root.id) ?? []) ids.add(child.id);
  }
  return ids;
}

/** People who hold or held an office at a decentral body: the pool a mover is looked up in. */
function holderPool(dataset, idx, orgIds, extra = []) {
  const positionIds = new Set((dataset.positions ?? []).filter((position) => orgIds.has(position.organization)).map((position) => position.id));
  const ids = new Set(extra);
  for (const tenure of dataset.tenures ?? []) if (positionIds.has(tenure.position)) ids.add(tenure.person);
  return ids;
}

function nameKeys(name) {
  const base = normalizeName(name).replace(/^(gemeente|provincie|waterschap|hoogheemraadschap|hhs) /, "");
  const keys = new Set([base]);
  const bare = base.replace(/^(?:(?:van|de|het) )+/, "");
  if (bare !== "") keys.add(bare);
  return keys;
}

function orgKeys(org) {
  const keys = new Set();
  for (const name of [org.name, ...(org.aliases ?? [])]) for (const key of nameKeys(name)) keys.add(key);
  return keys;
}

function clone(value) {
  return structuredClone(value);
}

function addSourceRef(record, sourceId, today) {
  if (!Array.isArray(record.sources)) record.sources = [];
  const have = record.sources.find((ref) => ref && ref.source === sourceId);
  if (have) {
    have.retrieved = today;
    return;
  }
  record.sources.push(sourceRef(sourceId, today));
}

// ---------- the plan of one level ----------

function emptyResult() {
  return {
    guard: { allowed: true, bulk: false, event: null, reasons: [] },
    organizations: [],
    positions: [],
    relations: [],
    tenures: [],
    people: [],
    touched: new Map(),
    sources: [],
    closures: [],
    openings: [],
    gaps: [],
    review: [],
    stateUpdate: {},
    stats: {},
    sourceUpgrades: [],
  };
}

function refuse(reasons, review = []) {
  const result = emptyResult();
  result.guard = { allowed: false, bulk: false, event: null, reasons };
  result.review = review;
  return result;
}

/** Herindeling events (TOOI) and election days inside the event window. */
function eventsFor({ tooi, today, elections = [], windowDays = EVENT_WINDOW_DAYS }) {
  const events = [];
  for (const event of tooi.events ?? []) {
    const age = daysBetween(event.date, today);
    if (age >= 0 && age <= windowDays) events.push({ kind: `herindeling-${String(event.type).toLowerCase()}`, date: event.date, id: event.date });
  }
  for (const election of elections) {
    if (!election?.date) continue;
    const age = daysBetween(election.date, today);
    if (age >= 0 && age <= windowDays) events.push({ kind: "election", date: election.date, id: election.id });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function tenureIdFor(position, display, taken) {
  return nextId(`tenure:${position.slug ?? position.id.replace(/^pos:/, "")}-${slugify(display)}`, taken.tenures);
}

/**
 * The identity of the people of one planning run: match a register form to the holder of a position,
 * then to the pool, else create.
 */
function makePeople({ dataset, idx, pool, taken, sourceId, today, result }) {
  const created = new Map();
  const createdOrder = [];
  const parsedOf = new Map();
  function poolMatches(parsed) {
    const out = [];
    for (const id of pool) {
      const person = created.get(id) ?? idx.peopleById.get(id);
      if (person && holderMatchesPerson(parsed, person, { pool: true })) out.push(id);
    }
    return out;
  }
  function create(parsed, extra = {}, suffix = "") {
    const base = `person:${slugify(parsed.display)}${suffix ? `-${suffix}` : ""}`;
    const id = nextId(base, taken.persons);
    const aliases = [...new Set([parsed.raw, ...(extra.aliases ?? [])].filter((alias) => alias && alias !== parsed.display))];
    const record = { id, slug: id.replace(/^person:/, ""), name: parsed.display, ...(aliases.length > 0 ? { aliases } : {}), ...extra.fields, sources: [sourceRef(sourceId, today)] };
    created.set(id, record);
    parsedOf.set(id, parsed);
    createdOrder.push(record);
    pool.add(id);
    result.people.push(record);
    return id;
  }
  return { poolMatches, create, created, createdOrder, parsedOf };
}

function dutchList(values) {
  return values.slice(0, 6).join(", ") + (values.length > 6 ? `, en ${values.length - 6} meer` : "");
}

/** A throw-away copy of the planning context, to count closures before anything is written. */
function sandboxContext({ ctx, dataset, idx, pool, taxonomy }) {
  const taken = { ...ctx.taken, persons: new Set(ctx.taken.persons), tenures: new Set(ctx.taken.tenures) };
  const result = emptyResult();
  return { ...ctx, taken, result, peopleApi: makePeople({ dataset, idx, pool: new Set(pool), taken, sourceId: taxonomy.people, today: ctx.today, result }) };
}

/**
 * Plan the holders of one position (one head, or the set of wethouders).
 * `candidates`: [{ parsed, acting }] from the register; `existing`: the open tenures at the position.
 */
function planHolders({ position, candidates, existing, ctx, label, suffixFor = () => "" }) {
  const { today, idx, taken, peopleApi, result, mwSourceId } = ctx;
  const ref = sourceRef(mwSourceId, today);
  const refMedium = sourceRef(mwSourceId, today, "medium");
  const used = new Set();
  const closing = [];
  const opening = [];
  // 1. keep what the register confirms
  for (const candidate of candidates) {
    let found = null;
    for (const tenure of existing) {
      if (used.has(tenure.id)) continue;
      const person = idx.peopleById.get(tenure.person) ?? peopleApi.created.get(tenure.person);
      if (person && holderMatchesPerson(candidate.parsed, person)) {
        found = tenure;
        break;
      }
    }
    if (!found) {
      opening.push(candidate);
      continue;
    }
    used.add(found.id);
    const sameRole = Boolean(found.acting) === Boolean(candidate.acting);
    const upgraded = found.source?.source !== mwSourceId;
    if (!sameRole) {
      const record = {
        ...clone(found),
        acting: Boolean(candidate.acting),
        entryMode: candidate.acting ? "waarnemend" : "benoemd-bij-kb",
        source: ref,
      };
      result.tenures.push(record);
      result.touched.set(found.person, mwSourceId);
      result.review.push({
        kind: "acting-changed",
        key: `acting-changed|${found.id}|${candidate.acting ? "waarnemend" : "vast"}`,
        text: `${found.id}: het register noemt ${candidate.parsed.raw} nu ${candidate.acting ? "waarnemend" : "als vaste ambtsdrager"} voor ${label}; de bestaande tenure is aangepast, de start blijft zoals hij was.`,
      });
    } else if (upgraded) {
      result.tenures.push({ ...clone(found), source: ref });
      result.touched.set(found.person, mwSourceId);
      result.sourceUpgrades.push(found.id);
    }
  }
  // 2. close what the register no longer names
  for (const tenure of existing) {
    if (used.has(tenure.id)) continue;
    closing.push(tenure);
  }
  const closedIds = [];
  for (const tenure of closing) {
    if (tenure.start && tenure.start >= today) {
      result.review.push({
        kind: "closed-without-official-end",
        key: `future-start|${tenure.id}`,
        text: `${tenure.id} begint op ${formatDateNL(tenure.start)} en is daarom niet gesloten, ook al noemt het register de houder niet meer.`,
      });
      continue;
    }
    const record = { ...clone(tenure), end: today, source: refMedium };
    result.tenures.push(record);
    result.closures.push({ entity: "tenures", record, why: "left-office", endIsOfficial: false });
    closedIds.push(tenure.id);
    result.review.push({
      kind: "closed-without-official-end",
      key: `closed-without-official-end|${tenure.id}`,
      text: `${tenure.id} is gesloten op de ophaaldatum ${formatDateNL(today)}: het register noemt geen einddatum voor ${label}. Een Staatscourant-besluit of het gemeentebericht kan hem later dateren.`,
    });
  }
  // 3. open what is new
  for (const candidate of opening) {
    const parsed = candidate.parsed;
    const matches = peopleApi.poolMatches(parsed).filter((id) => !closing.some((tenure) => tenure.person === id));
    let personId;
    if (matches.length === 1) personId = matches[0];
    else {
      if (matches.length > 1) {
        result.review.push({
          kind: "identity-ambiguous",
          key: `identity-ambiguous|${position.id}|${slugify(parsed.raw)}`,
          text: `${parsed.raw} (${label}) past op meerdere personen met dezelfde achternaam (${matches.join(", ")}); er is een nieuwe persoon aangemaakt.`,
        });
      }
      personId = peopleApi.create(parsed, {}, suffixFor(parsed));
      result.review.push({
        kind: "new-person",
        key: `new-person|${personId}`,
        text: `Nieuwe persoon ${personId} aangemaakt uit het register (${parsed.raw}, ${label}); het register geeft alleen initialen en achternaam.`,
      });
    }
    const id = tenureIdFor(position, parsed.display, taken);
    const predecessor = closedIds.length === 1 && opening.length === 1 ? closedIds[0] : null;
    const tenure = {
      id,
      person: personId,
      position: position.id,
      seat: null,
      start: null,
      end: null,
      acting: Boolean(candidate.acting),
      entryMode: candidate.acting ? "waarnemend" : position.entryModes?.[0] ?? "benoemd",
      appointedBy: null,
      predecessor,
      successor: null,
      endReason: null,
      source: ref,
    };
    result.tenures.push(tenure);
    result.openings.push({ entity: "tenures", record: tenure, why: "new-holder" });
    result.touched.set(personId, mwSourceId);
    result.review.push({
      kind: "unknown-start",
      key: `unknown-start|${id}`,
      text: `${id}: het register noemt geen benoemingsdatum, dus de start is onbekend (ADR 0020).`,
    });
    if (predecessor) {
      const old = result.tenures.find((record) => record.id === predecessor);
      if (old) old.successor = id;
    }
  }
  return { closed: closing.length, opened: opening.length };
}

// ---------- levels ----------

/**
 * Plan one level (gemeenten, provincies or waterschappen).
 * body: { tooi: { entries, events }, register: { bodies, people }, cbs: { table, gemeenten, provincies } | null }
 */
export function planDecentral({ level, body, dataset, state = {}, today, elections = [], taken, options = {} }) {
  const cfg = LEVELS[level];
  const opts = { ...DEFAULT_OPTIONS, ...options, bounds: { ...DEFAULT_BOUNDS, ...(options.bounds ?? {}) } };
  const defs = sourceDefs(level, body.cbs?.table ?? null);
  const existingSources = dataset.sources ?? [];
  const sources = {
    tooi: buildSourceRecord(defs.tooi, existingSources, today),
    bodies: buildSourceRecord(defs.bodies, existingSources, today),
    people: buildSourceRecord(defs.people, existingSources, today),
    cbs: defs.cbs ? buildSourceRecord(defs.cbs, existingSources, today) : null,
  };
  const levelState = state.decentral?.[level] ?? {};

  const tooiCurrent = currentTooi(body.tooi.entries, today);
  const tooiEnded = body.tooi.entries.filter((entry) => entry.end && entry.end < today);
  const registerBodies = body.register.bodies.filter((entry) => !entry.end || entry.end >= today);
  const cbsRows = level === "gemeenten" ? body.cbs?.gemeenten ?? null : level === "provincies" ? body.cbs?.provincies ?? null : null;

  const invariants = evaluateBodyInvariants({
    level,
    tooiCodes: tooiCurrent.map((entry) => entry.code),
    registerCodes: registerBodies.map((entry) => entry.code),
    cbsCodes: cbsRows ? cbsRows.map((row) => row.code) : null,
    tooiProvince: new Map(tooiCurrent.map((entry) => [entry.code, entry.province])),
    cbsProvince: level === "gemeenten" && cbsRows ? new Map(cbsRows.map((row) => [row.code, row.provinceCode])) : null,
    bounds: opts.bounds[level],
  });
  if (!invariants.ok) return refuse(invariants.failures.map((failure) => `${failure.code}: ${failure.detail}`));

  const idx = indexDataset(dataset);
  const result = emptyResult();
  result.sources.push(sources.tooi, sources.bodies, sources.people);
  if (sources.cbs) result.sources.push(sources.cbs);

  // ----- identity of the bodies -----
  const codes = { ...(levelState.codes ?? {}) };
  const names = { ...(levelState.names ?? {}) };
  const datasetOrgs = (dataset.organizations ?? []).filter((org) => org.subtype === cfg.orgSubtype);
  const orgKeyIndex = new Map(datasetOrgs.map((org) => [org.id, orgKeys(org)]));
  const mappedOrgs = new Set(Object.values(codes).filter((id) => idx.orgById.has(id)));
  const cbsByCode = new Map((cbsRows ?? []).map((row) => [row.code, row]));
  const registerByCode = new Map(registerBodies.map((entry) => [entry.code, entry]));
  const tooiByCode = new Map(body.tooi.entries.map((entry) => [entry.code, entry]));
  function candidateNames(code) {
    const out = [];
    const cbs = cbsByCode.get(code);
    if (cbs) out.push(cbs.name);
    const tooi = tooiByCode.get(code);
    if (tooi) out.push(...tooi.names);
    const reg = registerByCode.get(code);
    if (reg) out.push(reg.name);
    return out;
  }
  const ambiguous = [];
  function bootstrap(code) {
    for (const name of candidateNames(code)) {
      const keys = nameKeys(name);
      const hits = datasetOrgs.filter((org) => !mappedOrgs.has(org.id) && [...keys].some((key) => orgKeyIndex.get(org.id).has(key)));
      if (hits.length === 1) {
        mappedOrgs.add(hits[0].id);
        return hits[0].id;
      }
      if (hits.length > 1) {
        ambiguous.push(`${code}: ${hits.map((org) => org.id).join(", ")}`);
        return null;
      }
    }
    return null;
  }
  const newCodes = [];
  for (const entry of tooiCurrent) {
    if (codes[entry.code] && idx.orgById.has(codes[entry.code])) continue;
    const orgId = bootstrap(entry.code);
    if (orgId) codes[entry.code] = orgId;
    else newCodes.push(entry.code);
  }
  const endedMap = new Map();
  for (const entry of tooiEnded) {
    if (codes[entry.code] && idx.orgById.has(codes[entry.code])) {
      endedMap.set(entry.code, codes[entry.code]);
      continue;
    }
    const keys = new Set(entry.names.flatMap((name) => [...nameKeys(name)]));
    const hits = datasetOrgs.filter((org) => !mappedOrgs.has(org.id) && !org.dissolved && [...keys].some((key) => orgKeyIndex.get(org.id).has(key)));
    if (hits.length === 1) {
      codes[entry.code] = hits[0].id;
      mappedOrgs.add(hits[0].id);
      endedMap.set(entry.code, hits[0].id);
    }
  }
  const currentOrgIds = new Set(tooiCurrent.map((entry) => codes[entry.code]).filter(Boolean));
  const orphans = datasetOrgs.filter((org) => !org.dissolved && !currentOrgIds.has(org.id) && ![...endedMap.values()].includes(org.id));
  const problems = [];
  if (ambiguous.length > 0) problems.push(`naam komt overeen met meerdere organisaties (${ambiguous.join("; ")})`);
  if (orphans.length > 0) problems.push(`${orphans.length} organisatie(s) in de dataset zonder code in de bron: ${dutchList(orphans.map((org) => org.id))}`);
  if (level !== "gemeenten" && newCodes.length > 0) {
    problems.push(`${newCodes.length} nieuwe ${cfg.label} in de bron zonder organisatie in de dataset (${newCodes.join(", ")}); een nieuwe ${cfg.orgSubtype} wordt alleen voor gemeenten automatisch aangemaakt`);
  }
  if (problems.length > 0) return refuse(problems);

  // ----- guard: dissolutions and creations are bulk events -----
  const dissolving = [...endedMap].filter(([, orgId]) => !idx.orgById.get(orgId).dissolved);
  const events = eventsFor({ tooi: body.tooi, today, elections });
  const changes = dissolving.length + newCodes.length;
  const decision = decideBulk({ closures: changes, fractieChanged: false, events, maxQuiet: 5 });
  if (!decision.allowed) return refuse([decision.reason.replace("sluitingen", "herindelingen")]);
  result.guard = { allowed: true, bulk: decision.bulk, event: decision.event, reasons: [] };
  if (decision.bulk) {
    result.review.push({
      kind: "bulk-event",
      key: `bulk-event|${level}|${today}|${decision.event}`,
      text: `Herindeling toegepast (${decision.event}): ${dissolving.length} opgeheven en ${newCodes.length} nieuw (${level}) op ${formatDateNL(today)}.`,
    });
  }

  const taxonomy = { tooi: sources.tooi.id, bodies: sources.bodies.id, people: sources.people.id, cbs: sources.cbs?.id ?? null };
  const touchedOrgs = new Map();
  const patchOrg = (org) => {
    if (!touchedOrgs.has(org.id)) touchedOrgs.set(org.id, clone(org));
    return touchedOrgs.get(org.id);
  };

  // ----- patches of existing bodies -----
  const stats = { bodies: tooiCurrent.length, patched: 0, renamed: 0, seatChanges: 0, established: 0, created: 0, dissolved: 0, headsOpened: 0, headsClosed: 0, wethouderChanges: 0 };
  for (const entry of tooiCurrent) {
    const orgId = codes[entry.code];
    if (!orgId) continue;
    const org = idx.orgById.get(orgId);
    const reg = registerByCode.get(entry.code);
    const cbs = cbsByCode.get(entry.code);
    // name changes: the official name moved while the code stayed
    const seenName = cbs?.name ?? reg?.name ?? entry.names[0];
    const lastName = names[entry.code];
    if (lastName && seenName && normalizeName(lastName) !== normalizeName(seenName) && ![...nameKeys(seenName)].some((key) => orgKeyIndex.get(org.id).has(key))) {
      const next = patchOrg(org);
      const label = level === "gemeenten" ? `Gemeente ${seenName}` : seenName;
      next.aliases = [...new Set([...(next.aliases ?? []), next.name, label, seenName])];
      next.name = label;
      addSourceRef(next, taxonomy.tooi, today);
      stats.renamed += 1;
      result.review.push({
        kind: "name-change",
        key: `name-change|${entry.code}|${slugify(seenName)}`,
        text: `${org.id}: de officiële naam is ${lastName} geworden ${seenName} (code ${entry.code}); de naam is aangepast en de oude naam staat als alias.`,
      });
      for (const child of idx.childrenOf.get(org.id) ?? []) {
        if (child.subtype === cfg.councilSubtype && level === "gemeenten") {
          const childNext = patchOrg(child);
          childNext.aliases = [...new Set([...(childNext.aliases ?? []), childNext.name, `Gemeenteraad ${seenName}`])];
          childNext.name = `Gemeenteraad van ${seenName}`;
        }
      }
    }
    if (seenName) names[entry.code] = seenName;
    // established, website
    const established = reg?.start ?? entry.begin ?? null;
    if (established && !org.established) {
      patchOrg(org).established = established;
      stats.established += 1;
      if (reg?.start && entry.begin && reg.start !== entry.begin) {
        result.review.push({
          kind: "source-difference",
          key: `established|${entry.code}`,
          text: `${org.id}: het register noemt ${formatDateNL(reg.start)} als startdatum, TOOI ${formatDateNL(entry.begin)}; het register is overgenomen.`,
        });
      }
    }
    if (reg?.website && !org.website) patchOrg(org).website = reg.website;
    // council seats
    if (level === "gemeenten" && reg?.seats && reg.seats >= 5 && reg.seats <= 60) {
      const council = (idx.childrenOf.get(org.id) ?? []).find((child) => child.subtype === cfg.councilSubtype);
      if (council && council.seatsCount !== reg.seats) {
        patchOrg(council).seatsCount = reg.seats;
        stats.seatChanges += 1;
        for (const position of idx.positionsByOrg.get(council.id) ?? []) {
          if (position.type === "elected" && position.seatsCount !== reg.seats) {
            const next = clone(position);
            next.seatsCount = reg.seats;
            result.positions.push(next);
          }
        }
        for (const relation of dataset.relations ?? []) {
          if (relation.type === "elects" && relation.to === council.id && relation.seatsAppointed !== reg.seats) {
            const next = clone(relation);
            next.seatsAppointed = reg.seats;
            result.relations.push(next);
          }
        }
        result.review.push({
          kind: "seat-change",
          key: `seat-change|${council.id}|${reg.seats}`,
          text: `${council.id}: het aantal zetels is ${council.seatsCount ?? "onbekend"} in de dataset en ${reg.seats} in het register; het register is overgenomen.`,
        });
      }
    }
  }

  // ----- new gemeenten -----
  if (level === "gemeenten") {
    for (const code of newCodes) createGemeente({ code, entry: tooiByCode.get(code), reg: registerByCode.get(code), cbs: cbsByCode.get(code), ctx: { dataset, idx, taken, today, result, codes, names, taxonomy, level }, touchedOrgs });
    stats.created = newCodes.length;
  }

  // ----- dissolved bodies -----
  const eventOf = (code) => (body.tooi.events ?? []).find((event) => event.predecessors.includes(code)) ?? null;
  for (const [code, orgId] of dissolving) {
    const entry = tooiByCode.get(code);
    const org = idx.orgById.get(orgId);
    const family = [org, ...(idx.childrenOf.get(orgId) ?? [])];
    for (const member of family) {
      const next = patchOrg(member);
      next.dissolved = entry.end;
      addSourceRef(next, taxonomy.tooi, today);
    }
    stats.dissolved += 1;
    const event = eventOf(code);
    for (const member of family) {
      for (const position of idx.positionsByOrg.get(member.id) ?? []) {
        for (const tenure of idx.openByPosition.get(position.id) ?? []) {
          if (tenure.start && tenure.start > entry.end) continue;
          const record = { ...clone(tenure), end: entry.end, endReason: "reorganisatie", source: sourceRef(taxonomy.tooi, today) };
          result.tenures.push(record);
          result.closures.push({ entity: "tenures", record, why: "body-dissolved", endIsOfficial: true });
        }
      }
    }
    for (const successor of event?.successors ?? []) {
      const target = codes[successor];
      if (!target) continue;
      result.relations.push({
        id: `rel:${org.slug}-succeeded-by-${idx.orgById.get(target).slug}`,
        from: org.id,
        to: target,
        type: "succeeded_by",
        metadata: { herindeling: event.type },
        validFrom: event.date,
        validTo: null,
        supersededBy: null,
        seatsAppointed: 0,
        source: sourceRef(taxonomy.tooi, today),
      });
    }
    result.review.push({
      kind: "dissolved",
      key: `dissolved|${code}|${entry.end}`,
      text: `${org.id} is opgeheven per ${formatDateNL(entry.end)} (TOOI${event ? `, ${String(event.type).toLowerCase()} van ${formatDateNL(event.date)}` : ""}); de bestuurders zijn per die datum gesloten.`,
    });
  }

  // ----- holders -----
  const peopleRows = new Map();
  for (const row of body.register.people) {
    if (!row.code) continue;
    if (!peopleRows.has(row.code)) peopleRows.set(row.code, []);
    peopleRows.get(row.code).push(row);
  }
  const orgIds = decentralOrgIds(dataset, idx);
  const levelOrgIds = new Set();
  for (const org of [...datasetOrgs, ...[...idx.orgById.values()].filter((candidate) => candidate.subtype === cfg.orgSubtype)]) {
    levelOrgIds.add(org.id);
    for (const child of idx.childrenOf.get(org.id) ?? []) levelOrgIds.add(child.id);
  }
  const pool = holderPool(dataset, idx, orgIds);
  const peopleApi = makePeople({ dataset, idx, pool, taken, sourceId: taxonomy.people, today, result });
  const ctx = { today, idx, taken, peopleApi, result, mwSourceId: taxonomy.people };

  let withHead = 0;
  const headRows = [];
  for (const entry of tooiCurrent) {
    const orgId = codes[entry.code];
    if (!orgId) continue;
    const rows = peopleRows.get(entry.code) ?? [];
    const regular = rows.filter((row) => cfg.headFunctions.regular.includes(row.function));
    const acting = rows.filter((row) => cfg.headFunctions.acting.includes(row.function));
    if (regular.length + acting.length > 0) withHead += 1;
    headRows.push({ entry, orgId, regular, acting, rows });
  }
  const holderCheck = evaluateHolderInvariants({ level, bodies: tooiCurrent.length, withHead, expectsHeads: cfg.headFunctions.regular.length > 0 });
  if (!holderCheck.ok) return refuse(holderCheck.failures.map((failure) => `${failure.code}: ${failure.detail}`));

  const headPlans = [];
  for (const { entry, orgId, regular, acting, rows } of headRows) {
    if (cfg.headFunctions.regular.length === 0) continue;
    const org = idx.orgById.get(orgId) ?? touchedOrgs.get(orgId);
    const position = (idx.positionsByOrg.get(orgId) ?? []).find((candidate) => cfg.headTitle.test(candidate.title));
    if (!position) {
      result.review.push({ kind: "new-position", key: `no-head-position|${orgId}`, text: `${orgId} heeft geen positie voor het hoofd van het bestuur; het register noemt ${[...regular, ...acting].map((row) => row.name).join(", ") || "niemand"}.` });
      continue;
    }
    const label = `${org.name}`;
    const dedupe = (list) => {
      const out = [];
      for (const row of list) {
        const parsed = parseHolderName(row.name);
        if (out.some((other) => holderMatchesPerson(parsed, { name: other.parsed.display, aliases: [other.parsed.raw] }))) continue;
        out.push({ parsed, acting: false });
      }
      return out;
    };
    let candidates = dedupe(regular);
    if (candidates.length === 0) candidates = dedupe(acting).map((candidate) => ({ ...candidate, acting: true }));
    if (candidates.length === 0) continue;
    if (candidates.length > 1) {
      result.review.push({
        kind: "identity-ambiguous",
        key: `head-ambiguous|${orgId}|${candidates.map((candidate) => slugify(candidate.parsed.display)).join("+")}`,
        text: `${label}: het register noemt ${candidates.length} verschillende personen als ${regular.length > 0 ? "vaste" : "waarnemende"} ${cfg.headTitle.source.includes("Burgemeester") ? "burgemeester" : "dijkgraaf"} (${candidates.map((candidate) => candidate.parsed.raw).join("; ")}); niets is gewijzigd.`,
      });
      continue;
    }
    headPlans.push({ position, candidates, existing: idx.openByPosition.get(position.id) ?? [], label, orgId, suffixFor: (parsed) => (parsed.hasInitials ? "" : orgId.replace(/^org:(gemeente|waterschap)-/, "")) });
    void rows;
  }

  // The bulk rule for the heads: a quiet run changes a few; a first read of a source that replaces a secondary one, a herindeling or an election day may change many.
  const bodiesCount = tooiCurrent.length;
  const quiet = Math.max(5, Math.ceil(bodiesCount * 0.05));
  const bootstrapDone = Boolean(levelState.holdersBootstrapped);
  const preview = headPlans.map((plan) => {
    const sandbox = sandboxContext({ ctx, dataset, idx, pool, taxonomy });
    const counts = planHolders({ position: plan.position, candidates: plan.candidates, existing: plan.existing, ctx: sandbox, label: plan.label, suffixFor: plan.suffixFor });
    return counts.closed;
  });
  const headClosureCount = preview.reduce((sum, count) => sum + count, 0);
  const bulkEvents = bootstrapDone ? events : [{ kind: "first-read", date: today, id: "first-read" }, ...events];
  const headDecision = decideBulk({ closures: headClosureCount, fractieChanged: false, events: bulkEvents, maxQuiet: quiet });
  if (!headDecision.allowed) return refuse([headDecision.reason]);
  if (headDecision.bulk) {
    result.review.push({
      kind: "bulk-event",
      key: `bulk-event|${level}-heads|${today}|${headDecision.event}`,
      text: `Bulkwijziging van bestuurders toegepast (${headDecision.event}): ${headClosureCount} sluitingen in de ${level}-bron op ${formatDateNL(today)}. ${bootstrapDone ? "" : "De dataset kwam uit een secundaire bron (Wikipedia, 18-09-2026); dit is de eerste lezing van het register."}`.trim(),
    });
    result.guard.bulk = true;
    result.guard.event = result.guard.event ?? headDecision.event;
  }
  for (const plan of headPlans) {
    const counts = planHolders({ position: plan.position, candidates: plan.candidates, existing: plan.existing, ctx, label: plan.label, suffixFor: plan.suffixFor });
    stats.headsClosed += counts.closed;
    stats.headsOpened += counts.opened;
  }

  // ----- wethouders (opt in) -----
  if (level === "gemeenten" && opts.wethouders) {
    const rowsAll = [];
    for (const { entry, orgId, rows } of headRows) {
      const gemeente = idx.orgById.get(orgId) ?? touchedOrgs.get(orgId);
      const college = (idx.childrenOf.get(orgId) ?? []).find((child) => /^College van/.test(child.name));
      const position = college ? (idx.positionsByOrg.get(college.id) ?? []).find((candidate) => /^Wethouder/.test(candidate.title)) : null;
      if (!position) continue;
      const candidates = [];
      for (const row of rows.filter((candidate) => candidate.function === "Wethouder")) {
        const parsed = parseHolderName(row.name);
        if (candidates.some((other) => other.parsed.raw === parsed.raw)) continue;
        candidates.push({ parsed, acting: false });
      }
      rowsAll.push({ position, candidates, existing: idx.openByPosition.get(position.id) ?? [], label: `${gemeente.name} (wethouder)`, gemeente });
      void entry;
    }
    const wethouderBootstrap = Boolean(levelState.wethoudersBootstrapped);
    const dry = rowsAll.map((plan) => {
      const sandbox = sandboxContext({ ctx, dataset, idx, pool, taxonomy });
      return planHolders({ position: plan.position, candidates: plan.candidates, existing: plan.existing, ctx: sandbox, label: plan.label, suffixFor: () => plan.gemeente.slug.replace(/^gemeente-/, "") }).closed;
    });
    const total = dry.reduce((sum, count) => sum + count, 0);
    const decision2 = decideBulk({
      closures: total,
      fractieChanged: false,
      events: wethouderBootstrap ? events : [{ kind: "first-read", date: today, id: "first-read" }, ...events],
      maxQuiet: Math.max(25, Math.ceil(bodiesCount * 0.1)),
    });
    if (!decision2.allowed) return refuse([decision2.reason]);
    for (const plan of rowsAll) {
      const counts = planHolders({ position: plan.position, candidates: plan.candidates, existing: plan.existing, ctx, label: plan.label, suffixFor: () => plan.gemeente.slug.replace(/^gemeente-/, "") });
      stats.wethouderChanges += counts.closed + counts.opened;
    }
    result.stateUpdate.wethoudersBootstrapped = levelState.wethoudersBootstrapped ?? today;
  }

  // A new holder named by surname only ("Dhr. van den Hengel") cannot be matched on initials. When exactly one person
  // left an office in this run with that surname, and holds no other office, it is that person moving: use them.
  {
    const closedPersons = new Set(result.closures.map((entry) => entry.record.person));
    const stillOpen = new Set();
    const closedIds = new Set(result.closures.map((entry) => entry.record.id));
    for (const tenure of [...(dataset.tenures ?? []).filter((record) => !record.end && !closedIds.has(record.id)), ...result.tenures.filter((record) => !record.end)]) stillOpen.add(tenure.person);
    for (const person of [...result.people]) {
      const parsed = peopleApi.parsedOf.get(person.id);
      if (!parsed || parsed.hasInitials) continue;
      const candidates = [...closedPersons].filter((id) => !stillOpen.has(id) && idx.peopleById.has(id) && holderMatchesPerson(parsed, idx.peopleById.get(id)));
      if (candidates.length !== 1) continue;
      const target = candidates[0];
      for (const tenure of result.tenures) if (tenure.person === person.id) tenure.person = target;
      result.people.splice(result.people.indexOf(person), 1);
      result.touched.delete(person.id);
      result.touched.set(target, taxonomy.people);
      result.review = result.review.filter((entry) => entry.key !== `new-person|${person.id}`);
      result.review.push({
        kind: "identity-conflict",
        key: `mover|${person.id}|${target}`,
        text: `${parsed.raw} is gekoppeld aan ${target}: die persoon verliet in deze lezing een ander ambt met dezelfde achternaam, en het register geeft hier alleen de achternaam.`,
      });
    }
  }

  // a person with two open decentral tenures after this run: a mover whose old body still lists them
  const openAfter = new Map();
  const closedNow = new Set(result.tenures.filter((record) => record.end).map((record) => record.id));
  for (const tenure of [...(dataset.tenures ?? []).filter((record) => !record.end && !closedNow.has(record.id)), ...result.tenures.filter((record) => !record.end)]) {
    const position = (dataset.positions ?? []).find((candidate) => candidate.id === tenure.position);
    if (!position || !levelOrgIds.has(position.organization) || /^Wethouder/.test(position.title)) continue;
    if (!openAfter.has(tenure.person)) openAfter.set(tenure.person, new Set());
    openAfter.get(tenure.person).add(tenure.position);
  }
  for (const [personId, positions] of openAfter) {
    if (positions.size > 1) {
      result.review.push({
        kind: "identity-conflict",
        key: `two-offices|${personId}|${[...positions].sort().join("+")}`,
        text: `${personId} heeft na deze lezing twee open ambten (${[...positions].sort().join(", ")}); het register of de koppeling van de persoon klopt op een van beide plaatsen niet.`,
      });
    }
  }

  // ----- the named gaps of this level -----
  result.gaps.push(...gapsFor(level, opts));

  // ----- organisations, state, stats -----
  for (const org of touchedOrgs.values()) {
    addSourceRef(org, taxonomy.bodies, today);
    result.organizations.push(org);
  }
  stats.patched = touchedOrgs.size;
  result.stats = stats;
  result.stateUpdate = {
    ...result.stateUpdate,
    codes,
    names,
    holdersBootstrapped: levelState.holdersBootstrapped ?? today,
    lastCounts: { tooi: tooiCurrent.length, register: registerBodies.length, cbs: cbsRows?.length ?? null },
    cbsTable: body.cbs?.table?.id ?? null,
  };
  result.fetched = tooiCurrent.length;
  result.resolved = tooiCurrent.filter((entry) => codes[entry.code]).length;
  return result;
}

function gapsFor(level, opts) {
  const registerUrl = (name) => `https://organisaties.overheid.nl/${name}/`;
  if (level === "gemeenten") {
    const gaps = [
      makeGap(
        "Leden van de gemeenteraden",
        "het register noemt 8,6 duizend raadsleden met alleen initialen en achternaam, zonder fractie of persoonsnummer; een pagina per persoon past niet in het bestandsbudget van de export (ADR 0022: 20.000 bestanden, nu ruim 9.600)",
        "https://organisaties.overheid.nl/export-medewerkers/Gemeenten.csv",
        "Neem raadsleden pas op als de web-export personen zonder eigen pagina kent, of per gemeente uit een open bron met fractie (bijvoorbeeld de Kiesraad-uitslagen).",
      ),
    ];
    if (!opts.wethouders) {
      gaps.push(
        makeGap(
          "Wethouders",
          "de bron is compleet genoeg (341 van 342 gemeenten), maar de opname staat uit: ongeveer 1,4 duizend extra personen betekenen ongeveer 2,8 duizend extra bestanden en een veel zwaardere personenlijst op de web-export",
          registerUrl("Gemeenten"),
          "Zet DEFAULT_OPTIONS.wethouders in pipelines/decentral-plan.mjs aan, of draai met STAATSGRAAF_LIVE_WETHOUDERS=1, zodra de web-eigenaar de bestandsgroei accepteert.",
        ),
      );
    }
    return gaps;
  }
  if (level === "provincies") {
    return [
      makeGap(
        "Gedeputeerden en leden van Provinciale Staten",
        "het register vult de Gedeputeerde Staten voor 7 van de 12 provincies en bevat verouderde rijen (Zuid-Holland noemt twee voorzitters); de Statenleden staan alleen voor twee provincies in het register",
        "https://organisaties.overheid.nl/export-medewerkers/Provincies.csv",
        "Zoek een volledige open bron per provincie (de provinciesites zijn niet machineleesbaar en niet als open data gelicentieerd) of wacht op een volledig register.",
      ),
    ];
  }
  return [
    makeGap(
      "Algemeen bestuur en dagelijks bestuur van de waterschappen",
      "het register noemt alleen de dijkgraaf en de secretaris-directeur; de leden van het algemeen en dagelijks bestuur staan in geen open register",
      "https://organisaties.overheid.nl/export-medewerkers/Waterschappen.csv",
      "Wacht op de Kiesraad-uitslag van de waterschapsverkiezingen of op een open bron van de waterschappen zelf.",
    ),
  ];
}

// ---------- creating a gemeente (a herindeling) ----------

function createGemeente({ code, entry, reg, cbs, ctx, touchedOrgs }) {
  const { dataset, idx, taken, today, result, codes, names, taxonomy } = ctx;
  const plainName = cbs?.name ?? reg?.name?.replace(/^Gemeente /, "") ?? entry.names[0];
  const base = slugify(plainName);
  const orgId = nextId(`org:gemeente-${base}`, taken.orgs);
  const gemeenteSlug = orgId.replace(/^org:/, "");
  const raadId = nextId(`org:gemeenteraad-${base}`, taken.orgs);
  const collegeId = nextId(`org:college-van-bw-${base}`, taken.orgs);
  const template = (subtype) => (dataset.organizations ?? []).find((org) => org.subtype === subtype);
  const refs = [taxonomy.tooi, taxonomy.bodies, ...(taxonomy.cbs ? [taxonomy.cbs] : [])].map((sourceId) => sourceRef(sourceId, today));
  const common = { branch: "decentraal-lokaal", level: "lokaal", country: "nederland", description: null, employeeCount: { budgeted: null, actual: null, year: null }, images: [], dissolved: null };
  const province = [...idx.orgById.values()].find((org) => org.subtype === "provincie" && entry.province && codes[entry.province] === org.id) ?? null;
  const provinceOrg = province ?? (dataset.organizations ?? []).find((org) => org.subtype === "provincie" && normalizeName(cbs?.provinceName ?? "") !== "" && orgKeys(org).has(normalizeName(cbs.provinceName)));
  const gemeente = {
    id: orgId,
    slug: gemeenteSlug,
    name: `Gemeente ${plainName}`,
    type: "department",
    subtype: "gemeente",
    ...common,
    aliases: [...new Set([plainName, `Gemeente ${plainName}`])],
    parent: null,
    partOf: [],
    legalSource: template("gemeente")?.legalSource ?? { label: "Gemeentewet art. 1", url: "https://wetten.overheid.nl/BWBR0005416#TiteldeelI_Artikel1" },
    website: reg?.website ?? null,
    established: reg?.start ?? entry.begin ?? null,
    seatsCount: null,
    sources: clone(refs),
  };
  const raad = {
    id: raadId,
    slug: raadId.replace(/^org:/, ""),
    name: `Gemeenteraad van ${plainName}`,
    type: "elected",
    subtype: "gemeenteraad",
    ...common,
    aliases: [`Gemeenteraad ${plainName}`, `Gemeenteraad van ${plainName}`],
    parent: orgId,
    partOf: [orgId],
    legalSource: template("gemeenteraad")?.legalSource ?? { label: "Gemeentewet art. 7 en art. 8", url: "https://wetten.overheid.nl/BWBR0005416#TiteldeelII_HoofdstukII_Artikel8" },
    website: null,
    established: null,
    seatsCount: reg?.seats ?? null,
    sources: [refs[1]].map(clone),
  };
  const college = {
    id: collegeId,
    slug: collegeId.replace(/^org:/, ""),
    name: `College van burgemeester en wethouders van ${plainName}`,
    type: "commission",
    subtype: "commissie",
    ...common,
    aliases: [`College van B&W van ${plainName}`, `College van burgemeester en wethouders van ${plainName}`],
    parent: orgId,
    partOf: [orgId],
    legalSource: { label: "Gemeentewet", url: "https://wetten.overheid.nl/BWBR0005416" },
    website: null,
    established: null,
    seatsCount: null,
    sources: [refs[0]].map(clone),
  };
  for (const org of [gemeente, raad, college]) {
    touchedOrgs.set(org.id, org);
    idx.orgById.set(org.id, org);
  }
  idx.childrenOf.set(orgId, [raad, college]);
  const positionBase = { legalBasis: { label: "Gemeentewet", url: "https://wetten.overheid.nl/BWBR0005416" }, termLengthMonths: null };
  const burgemeesterId = nextId(`pos:burgemeester-${base}`, taken.positions);
  const raadslidId = nextId(`pos:raadslid-${base}`, taken.positions);
  const wethouderId = nextId(`pos:wethouder-${base}`, taken.positions);
  const bmRef = sourceRef(taxonomy.people, today);
  result.positions.push(
    { id: burgemeesterId, slug: burgemeesterId.slice(4), title: `Burgemeester van ${plainName}`, aliases: [`Burgemeester van ${plainName}`], organization: orgId, type: "dept_head", fillMethod: "koninklijk-besluit", entryModes: ["benoemd-bij-kb"], seatsCount: 1, exOfficioOf: [raadId, collegeId], ...positionBase, sources: [bmRef, sourceRef("src:gemeentewet", today, "medium")] },
    { id: raadslidId, slug: raadslidId.slice(4), title: `Lid gemeenteraad van ${plainName}`, aliases: [`Lid gemeenteraad van ${plainName}`], organization: raadId, type: "elected", fillMethod: "verkiezing", entryModes: ["gekozen"], seatsCount: reg?.seats ?? null, exOfficioOf: [], ...positionBase, sources: [sourceRef(taxonomy.bodies, today)] },
    { id: wethouderId, slug: wethouderId.slice(4), title: "Wethouder", aliases: [`Wethouder van ${plainName}`], organization: collegeId, type: "commission", fillMethod: "benoeming-door-college", entryModes: ["benoemd"], seatsCount: null, exOfficioOf: [], ...positionBase, sources: [sourceRef("src:gemeentewet", today)] },
  );
  for (const position of result.positions.slice(-3)) {
    if (!idx.positionsByOrg.has(position.organization)) idx.positionsByOrg.set(position.organization, []);
    idx.positionsByOrg.get(position.organization).push(position);
  }
  const rel = (id, from, to, type, metadata = {}, sourceId = taxonomy.tooi) => ({ id: nextId(`rel:${id}`, taken.relations), from, to, type, metadata, validFrom: null, validTo: null, supersededBy: null, seatsAppointed: 0, source: sourceRef(sourceId, today) });
  result.relations.push(
    rel(`${gemeenteSlug}-consists-of-college`, orgId, collegeId, "consists_of"),
    rel(`${gemeenteSlug}-consists-of-raad`, orgId, raadId, "consists_of"),
    rel(`burgemeester-${base}-ex-officio-college`, burgemeesterId, collegeId, "ex_officio", { rol: "voorzitter" }),
    rel(`burgemeester-${base}-ex-officio-raad`, burgemeesterId, raadId, "ex_officio", { rol: "voorzitter" }),
  );
  if ((dataset.organizations ?? []).some((org) => org.id === "org:kiesgerechtigden-nederland")) {
    const elects = rel(`elects-kiesgerechtigden-gemeenteraad-${base}`, "org:kiesgerechtigden-nederland", raadId, "elects", { artikel: "Grondwet art. 4, art. 125 lid 1 en art. 129 lid 1; Gemeentewet art. 7" });
    elects.seatsAppointed = reg?.seats ?? 0;
    result.relations.push(elects);
  }
  if (provinceOrg) result.relations.push(rel(`${provinceOrg.slug}-oversees-${gemeenteSlug}`, provinceOrg.id, orgId, "oversees", { instrument: "interbestuurlijk toezicht" }));
  codes[code] = orgId;
  names[code] = plainName;
  result.review.push({
    kind: "new-gemeente",
    key: `new-gemeente|${code}`,
    text: `Nieuwe gemeente ${orgId} (code ${code}) aangemaakt uit TOOI, het register en CBS, met gemeenteraad, college en de drie posities. De bestuurders volgen uit het register.`,
  });
}

// ---------- commissarissen van de Koning ----------

/**
 * Plan the commissarissen from the Rijksoverheid overview. Exactly one per province, every province resolved,
 * the date a real date; the page is the only source that names the benoemingsdatum.
 */
export function planCommissarissen({ body, dataset, state = {}, today, taken, options = {} }) {
  const items = body.items ?? [];
  const bounds = (options.bounds ?? DEFAULT_BOUNDS).provincies ?? [12, 12];
  const idx = indexDataset(dataset);
  const provinces = (dataset.organizations ?? []).filter((org) => org.subtype === "provincie");
  const failures = [];
  if (items.length < bounds[0] || items.length > bounds[1]) failures.push(`${items.length} commissarissen op de overzichtspagina, verwacht ${bounds[0]} tot en met ${bounds[1]}`);
  const byProvince = new Map();
  for (const item of items) {
    const org = provinces.find((province) => orgKeys(province).has(normalizeName(item.province)) || [...nameKeys(item.province)].some((key) => orgKeys(province).has(key)));
    if (!org) {
      failures.push(`provincie "${item.province}" niet gevonden in de dataset`);
      continue;
    }
    if (byProvince.has(org.id)) failures.push(`provincie ${org.id} komt twee keer voor`);
    byProvince.set(org.id, { item, org });
    if (!item.start) failures.push(`geen benoemingsdatum voor ${item.name} (${item.province})`);
  }
  if (provinces.length > 0 && byProvince.size !== provinces.length && failures.length === 0) failures.push(`${byProvince.size} provincies gedekt, de dataset heeft er ${provinces.length}`);
  if (failures.length > 0) return refuse(failures);

  const result = emptyResult();
  const source = buildSourceRecord(CVDK_SOURCE_DEF, dataset.sources ?? [], today);
  result.sources.push(source);
  const ref = sourceRef(source.id, today);
  const orgIds = decentralOrgIds(dataset, idx);
  const pool = holderPool(dataset, idx, orgIds);
  const peopleApi = makePeople({ dataset, idx, pool, taken, sourceId: source.id, today, result });
  let closed = 0;
  let opened = 0;
  for (const { item, org } of byProvince.values()) {
    const position = (idx.positionsByOrg.get(org.id) ?? []).find((candidate) => /^Commissaris/.test(candidate.title));
    if (!position) {
      result.review.push({ kind: "new-position", key: `no-cvdk-position|${org.id}`, text: `${org.id} heeft geen positie voor de commissaris van de Koning.` });
      continue;
    }
    const parsed = parseHolderName(item.name);
    const existing = idx.openByPosition.get(position.id) ?? [];
    const same = existing.find((tenure) => {
      const person = idx.peopleById.get(tenure.person);
      return person && holderMatchesPerson(parsed, person);
    });
    if (same) continue;
    for (const tenure of existing) {
      const end = tenure.start && addDays(item.start, -1) <= tenure.start ? today : addDays(item.start, -1);
      const record = { ...clone(tenure), end, source: sourceRef(source.id, today, "medium") };
      result.tenures.push(record);
      result.closures.push({ entity: "tenures", record, why: "successor-appointed", endIsOfficial: false });
      closed += 1;
      result.review.push({
        kind: "closed-without-official-end",
        key: `closed-without-official-end|${tenure.id}`,
        text: `${tenure.id} is gesloten op ${formatDateNL(end)}, de dag voor de benoeming van ${item.name} (${formatDateNL(item.start)}); de pagina noemt geen einddatum van de voorganger.`,
      });
    }
    const matches = peopleApi.poolMatches(parsed);
    let personId;
    if (matches.length === 1) personId = matches[0];
    else {
      const fields = { ...(item.birthDate ? { birthDate: item.birthDate } : {}), ...(item.party ? { party: item.party } : {}) };
      personId = peopleApi.create(parsed, { fields });
      result.review.push({ kind: "new-person", key: `new-person|${personId}`, text: `Nieuwe persoon ${personId} aangemaakt uit het Rijksoverheid-overzicht van de commissarissen van de Koning (${item.raw}).` });
      if (item.party) {
        result.review.push({ kind: "new-position", key: `party-check|${personId}`, text: `${personId}: partij ${item.party} komt uit het overzicht; controleer of web/lib/parties.ts de partij kent.` });
      }
    }
    const id = tenureIdFor(position, parsed.display, taken);
    const tenure = {
      id,
      person: personId,
      position: position.id,
      seat: null,
      start: item.start,
      end: null,
      acting: false,
      entryMode: "benoemd-bij-kb",
      appointedBy: null,
      predecessor: existing.length === 1 ? existing[0].id : null,
      successor: null,
      endReason: null,
      source: ref,
    };
    result.tenures.push(tenure);
    result.openings.push({ entity: "tenures", record: tenure, why: "new-commissaris" });
    result.touched.set(personId, source.id);
    opened += 1;
    if (existing.length === 1) {
      const old = result.tenures.find((record) => record.id === existing[0].id);
      if (old) old.successor = id;
    }
  }
  const decision = decideBulk({ closures: closed, fractieChanged: false, events: [], maxQuiet: 3 });
  if (!decision.allowed) return refuse([decision.reason.replace("sluitingen", "wisselingen van commissaris")]);
  result.stats = { items: items.length, closed, opened };
  result.stateUpdate = { lastCounts: { items: items.length } };
  result.fetched = items.length;
  result.resolved = byProvince.size;
  void state;
  return result;
}
