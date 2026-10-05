// Tweede Kamer change planner (ADR 0006 amended, ADR 0024).
//
// Pure planning on a normalised snapshot of the Tweede Kamer OData
// gegevensmagazijn: the open FractieZetelPersoon rows, the closed rows that
// changed since the cursor, the Fractie rows, open FractieZetelVacature rows
// and the Presidium rows. Identity is keyed on Persoon.Id (the personMap in
// research/P-live-state.json), never on a name alone. Nothing is deleted: a
// record that is no longer current is closed with the official end date of the
// row that closed it (TotEnMet) or, when no row can be found, with the
// retrieval date at medium confidence and a review entry.

import {
  addDays,
  buildPersonIndex,
  buildSourceRecord,
  daysBetween,
  isoDate,
  makeGap,
  nextId,
  normalizeName,
  resolvePerson,
  slugify,
  sourceRef,
} from "./live-util.mjs";
import { EVENT_WINDOW_DAYS, decideBulk, evaluateTkInvariants, recentEvents } from "./live-guard.mjs";

export const TK_BASE = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0";
export const TK_ORG = "org:tweede-kamer";
export const TK_SEAT_FUNCTIES = new Set(["Lid", "Fractievoorzitter"]);

/** The query behind the primary source record; kept as it was so ids and urls do not churn. */
export const TK_OPEN_URL =
  `${TK_BASE}/FractieZetelPersoon` +
  "?$filter=TotEnMet eq null&$expand=Persoon,FractieZetel($expand=Fractie)&$format=json&$top=250";

export const TK_SOURCE_DEFS = {
  open: {
    id: "src:tk-odata-fractiezetelpersonen-expand",
    url: TK_OPEN_URL,
    title: "FractieZetelPersoon (huidige leden, met Persoon en Fractie)",
    publisher: "Tweede Kamer OData API",
    type: "api",
    license: "CC0-1.0",
    notes:
      "OData v4, $filter=TotEnMet eq null met $expand=Persoon,FractieZetel($expand=Fractie). De filter alleen levert ook 7 verwijderde tombstones; die worden overgeslagen.",
  },
  closed: {
    id: "src:tk-odata-fractiezetelpersoon-gesloten",
    url: `${TK_BASE}/FractieZetelPersoon?$filter=TotEnMet ne null&$orderby=ApiGewijzigdOp desc`,
    title: "FractieZetelPersoon (gesloten rijen, laatst gewijzigd eerst)",
    publisher: "Tweede Kamer OData API",
    type: "api",
    license: "CC0-1.0",
    notes:
      "OData v4. Gesloten rijen met TotEnMet (de officiële einddatum van een zetel of fractievoorzitterschap), opgehaald op de wijzigingsmarkering ApiGewijzigdOp, niet op Van.",
  },
  fractie: {
    id: "src:tk-odata-fractie",
    url: `${TK_BASE}/Fractie?$filter=DatumInactief eq null`,
    title: "Fractie (actieve fracties met AantalZetels)",
    publisher: "Tweede Kamer OData API",
    type: "api",
    license: "CC0-1.0",
    notes: "OData v4. Fractie.AantalZetels is de controle op de leden per fractie; AantalStemmen en NaamNL komen uit dezelfde rij.",
  },
  presidium: {
    id: "src:tk-odata-presidium",
    url: `${TK_BASE}/CommissieZetelVastPersoon?$filter=CommissieZetel/Commissie/Afkorting eq 'PRES'`,
    title: "Presidium (Voorzitter en ondervoorzitters van de Tweede Kamer)",
    publisher: "Tweede Kamer OData API",
    type: "api",
    license: "CC0-1.0",
    notes: "OData v4. De commissie PRES (Presidium); Functie Voorzitter, EersteOndVzTk en TweedeOndVzTk, met Van en TotEnMet.",
  },
};

export const PRESIDIUM_POSITIONS = {
  Voorzitter: {
    id: "pos:voorzitter-tweede-kamer",
    title: "Voorzitter van de Tweede Kamer der Staten-Generaal",
    tenurePrefix: "tenure:voorzitter-tweede-kamer",
  },
  EersteOndVzTk: {
    id: "pos:eerste-ondervoorzitter-tweede-kamer",
    title: "Eerste ondervoorzitter van de Tweede Kamer der Staten-Generaal",
    tenurePrefix: "tenure:eerste-ondervoorzitter-tweede-kamer",
  },
  TweedeOndVzTk: {
    id: "pos:tweede-ondervoorzitter-tweede-kamer",
    title: "Tweede ondervoorzitter van de Tweede Kamer der Staten-Generaal",
    tenurePrefix: "tenure:tweede-ondervoorzitter-tweede-kamer",
  },
};

// ---------- normalisation of raw OData rows ----------

function fullName(person) {
  if (!person) return "";
  return [person.Voornamen, person.Tussenvoegsel, person.Achternaam]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function callName(person) {
  if (!person) return "";
  const first = typeof person.Roepnaam === "string" && person.Roepnaam.trim() !== "" ? person.Roepnaam.trim() : "";
  if (first === "") return "";
  return [first, person.Tussenvoegsel, person.Achternaam]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function normalizePerson(person, fallbackId) {
  return {
    persoonId: person?.Id ?? fallbackId ?? null,
    nummer: person?.Nummer ?? null,
    name: fullName(person),
    callName: callName(person),
    initialen: person?.Initialen ?? null,
    geboortedatum: isoDate(person?.Geboortedatum ?? null),
  };
}

export function normalizeFzpRow(row) {
  if (!row) return null;
  const person = normalizePerson(row.Persoon, row.Persoon_Id);
  const zetel = row.FractieZetel ?? {};
  const fractie = zetel.Fractie ?? {};
  return {
    id: row.Id ?? null,
    ...person,
    functie: row.Functie ?? null,
    van: isoDate(row.Van),
    totEnMet: isoDate(row.TotEnMet),
    verwijderd: row.Verwijderd === true,
    fractieZetelId: row.FractieZetel_Id ?? zetel.Id ?? null,
    gewicht: zetel.Gewicht ?? null,
    fractieId: zetel.Fractie_Id ?? fractie.Id ?? null,
    fractie: fractie.Afkorting ?? row.Persoon?.Fractielabel ?? null,
    fractieNaam: fractie.NaamNL ?? null,
    apiGewijzigdOp: row.ApiGewijzigdOp ?? null,
  };
}

export function normalizeFractie(row) {
  if (!row) return null;
  return {
    id: row.Id ?? null,
    afkorting: row.Afkorting ?? null,
    naamNL: row.NaamNL ?? row.Afkorting ?? null,
    aantalZetels: typeof row.AantalZetels === "number" ? row.AantalZetels : null,
    datumActief: isoDate(row.DatumActief),
    datumInactief: isoDate(row.DatumInactief),
    verwijderd: row.Verwijderd === true,
    apiGewijzigdOp: row.ApiGewijzigdOp ?? null,
  };
}

export function normalizeVacature(row) {
  if (!row) return null;
  const fractie = row.FractieZetel?.Fractie ?? {};
  return {
    id: row.Id ?? null,
    fractie: fractie.Afkorting ?? null,
    functie: row.Functie ?? null,
    van: isoDate(row.Van),
    totEnMet: isoDate(row.TotEnMet),
    gewicht: row.FractieZetel?.Gewicht ?? null,
    verwijderd: row.Verwijderd === true,
    apiGewijzigdOp: row.ApiGewijzigdOp ?? null,
  };
}

export function normalizePresidiumRow(row) {
  if (!row) return null;
  return {
    id: row.Id ?? null,
    ...normalizePerson(row.Persoon, row.Persoon_Id),
    functie: row.Functie ?? null,
    van: isoDate(row.Van),
    totEnMet: isoDate(row.TotEnMet),
    verwijderd: row.Verwijderd === true,
    apiGewijzigdOp: row.ApiGewijzigdOp ?? null,
  };
}

// ---------- helpers ----------

function compactDate(iso) {
  return typeof iso === "string" ? iso.replace(/-/g, "") : "onbekend";
}

function maxIso(values) {
  return values.filter(Boolean).sort().pop() ?? null;
}

function surnameKey(name) {
  const normalized = normalizeName(name);
  const parts = normalized.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : normalized;
}

/**
 * Plan the Tweede Kamer part of a live run.
 *
 * @param snapshot { rows, fracties, vacatures, presidium } normalised, see the normalize* functions.
 *   rows holds every open row and the closed rows that changed since the cursor.
 * @param dataset { people, positions, tenures, memberships, sources, relations }
 * @param state research/P-live-state.json (state.tk.personMap)
 * @param lookupClosedRow async ({ kind, persoonId }) => closed row | null, for an official end date the snapshot lacks
 * @param registeredFractieKeys Set of fractie keys the party registry knows (colour)
 */
export async function planTweedeKamer({
  snapshot,
  dataset,
  state = {},
  today,
  elections = [],
  coalitions = [],
  extraEvents = [],
  lookupClosedRow = async () => null,
  registeredFractieKeys = null,
}) {
  const gaps = [];
  const review = [];
  const warnings = [];

  const activeRows = (snapshot.rows ?? []).filter(
    (row) => row && !row.verwijderd && !row.totEnMet && TK_SEAT_FUNCTIES.has(row.functie) && row.persoonId && row.name !== "",
  );
  const closedRows = (snapshot.rows ?? []).filter((row) => row && !row.verwijderd && row.totEnMet);
  const fracties = (snapshot.fracties ?? []).filter((fractie) => fractie && !fractie.verwijderd);
  const activeFracties = fracties.filter((fractie) => !fractie.datumInactief);
  const vacatures = snapshot.vacatures ?? [];

  const invariants = evaluateTkInvariants({
    activeRows,
    fracties: activeFracties,
    vacatures,
    today,
  });
  const events = [...recentEvents({ today, elections, coalitions }), ...extraEvents];

  const empty = {
    memberships: [],
    tenures: [],
    people: [],
    positions: [],
    relations: [],
    sources: [],
    closures: [],
    openings: [],
    gaps,
    review,
    personMap: {},
    stats: { activeSeats: activeRows.length, closed: 0, opened: 0, newPeople: 0, newPositions: 0, membershipsCarried: 0, tenuresCarried: 0 },
  };

  if (!invariants.ok) {
    return {
      ...empty,
      invariants,
      events,
      guard: {
        allowed: false,
        bulk: false,
        event: null,
        reasons: invariants.failures.map((entry) => `${entry.code}: ${entry.detail}`),
      },
    };
  }

  // ----- sources -----
  const existingSources = dataset.sources ?? [];
  const sources = {};
  for (const key of Object.keys(TK_SOURCE_DEFS)) sources[key] = buildSourceRecord(TK_SOURCE_DEFS[key], existingSources, today);
  const refOpen = sourceRef(sources.open.id, today);
  const refClosed = (confidence = "high") => sourceRef(sources.closed.id, today, confidence);
  const refPresidium = sourceRef(sources.presidium.id, today);

  // ----- identity -----
  const index = buildPersonIndex(dataset.people);
  const allPersonIds = new Set((dataset.people ?? []).map((person) => person.id));
  const personMap = new Map(Object.entries(state.tk?.personMap ?? {}));
  const personMapUpdates = {};
  const newPeople = [];
  const surnameIndex = new Map();
  for (const person of dataset.people ?? []) {
    const key = surnameKey(person.name);
    if (!surnameIndex.has(key)) surnameIndex.set(key, []);
    surnameIndex.get(key).push(person);
  }
  let unresolved = 0;

  function learn(persoonId, personId) {
    if (personMap.get(persoonId) !== personId) {
      personMap.set(persoonId, personId);
      personMapUpdates[persoonId] = personId;
    }
  }

  function resolveTkPerson(row, sourceRefForNew) {
    const mapped = personMap.get(row.persoonId);
    if (mapped && index.byId.has(mapped)) return { status: "matched", id: mapped, via: "personMap" };
    const forms = [row.name, row.callName].filter(Boolean);
    for (const form of forms) {
      const found = resolvePerson(form, index);
      if (found.status === "matched") {
        const person = index.byId.get(found.id);
        if (person.birthDate && row.geboortedatum && person.birthDate !== row.geboortedatum) {
          review.push({
            kind: "identity-conflict",
            key: `identity-conflict|${row.persoonId}`,
            text: `${row.name} (TK Persoon ${row.persoonId}) heeft dezelfde naam als ${found.id} maar een andere geboortedatum; een nieuwe persoon is aangemaakt.`,
          });
          continue;
        }
        learn(row.persoonId, found.id);
        return { status: "matched", id: found.id, via: "name" };
      }
      if (found.status === "ambiguous") {
        const byBirth = row.geboortedatum
          ? found.candidates.filter((id) => index.byId.get(id).birthDate === row.geboortedatum)
          : [];
        if (byBirth.length === 1) {
          learn(row.persoonId, byBirth[0]);
          return { status: "matched", id: byBirth[0], via: "name+birthdate" };
        }
        review.push({
          kind: "identity-ambiguous",
          key: `identity-ambiguous|${row.persoonId}`,
          text: `${row.name} (TK Persoon ${row.persoonId}) komt overeen met meerdere personen (${found.candidates.join(", ")}).`,
        });
        return { status: "ambiguous", candidates: found.candidates };
      }
    }
    // No match: create a sourced person (ADR 0006 point 4), and list near misses for review.
    const base = `person:${slugify(row.name)}`;
    const id = nextId(base, allPersonIds);
    const record = {
      id,
      slug: id.replace(/^person:/, ""),
      name: row.name,
      aliases: [...new Set([row.callName, row.initialen ? `${row.initialen} ${row.name.split(" ").slice(1).join(" ")}`.trim() : null].filter(Boolean))],
      birthDate: row.geboortedatum ?? null,
      sources: [sourceRefForNew],
    };
    if (record.aliases.length === 0) delete record.aliases;
    if (record.birthDate === null) delete record.birthDate;
    index.byId.set(id, record);
    index.byNormalized.set(normalizeName(row.name), new Set([id]));
    newPeople.push(record);
    learn(row.persoonId, id);
    const near = (surnameIndex.get(surnameKey(row.name)) ?? []).filter(
      (person) => normalizeName(person.name).charAt(0) === normalizeName(row.name).charAt(0),
    );
    review.push({
      kind: "new-person",
      key: `new-person|${row.persoonId}`,
      text:
        `Nieuwe persoon ${id} aangemaakt uit de Tweede Kamer-bron (TK Persoon ${row.persoonId}, ${row.name}).` +
        (near.length > 0 ? ` Mogelijke dubbele: ${near.map((person) => person.id).join(", ")}.` : ""),
    });
    return { status: "created", id };
  }

  const positionsById = new Map((dataset.positions ?? []).map((position) => [position.id, position]));
  const allMembershipIds = new Set((dataset.memberships ?? []).map((membership) => membership.id));
  const allTenureIds = new Set((dataset.tenures ?? []).map((tenure) => tenure.id));
  const relationIds = new Set((dataset.relations ?? []).map((relation) => relation.id));
  const newPositions = [];
  const newRelations = [];

  // Resolve every active member first: all or nothing.
  const memberIds = new Map(); // persoonId -> personId
  for (const row of activeRows) {
    const result = resolveTkPerson(row, refOpen);
    if (result.status === "ambiguous") {
      unresolved += 1;
      continue;
    }
    memberIds.set(row.persoonId, result.id);
  }
  if (unresolved > 0) {
    return {
      ...empty,
      invariants,
      events,
      review,
      guard: {
        allowed: false,
        bulk: false,
        event: null,
        reasons: [`unresolved-person: ${unresolved} actieve leden konden niet eenduidig aan een persoon worden gekoppeld`],
      },
    };
  }

  // ----- official end dates -----
  const closedByPersoon = new Map();
  for (const row of closedRows) {
    if (!closedByPersoon.has(row.persoonId)) closedByPersoon.set(row.persoonId, []);
    closedByPersoon.get(row.persoonId).push(row);
  }
  const presidiumClosed = (snapshot.presidium ?? []).filter((row) => row && !row.verwijderd && row.totEnMet);
  const reversePersonMap = new Map();
  for (const [persoonId, personId] of personMap) reversePersonMap.set(personId, persoonId);

  // A person who left before the personMap knew them (first run): find the closed row by the exact full name,
  // then key everything on the Persoon.Id it carries. Only an exact, unique name counts, and it is listed for review.
  const closedNames = new Map();
  for (const row of [...closedRows, ...presidiumClosed]) {
    const key = normalizeName(row.name);
    if (!closedNames.has(key)) closedNames.set(key, new Set());
    closedNames.get(key).add(row.persoonId);
  }
  function linkByClosedName(personId) {
    const person = index.byId.get(personId);
    const found = person ? closedNames.get(normalizeName(person.name)) : null;
    if (!found || found.size !== 1) return null;
    const persoonId = [...found][0];
    if (memberIds.has(persoonId)) return null;
    learn(persoonId, personId);
    reversePersonMap.set(personId, persoonId);
    review.push({
      kind: "identity-conflict",
      key: `identity-by-name|${persoonId}`,
      text: `${personId} is aan TK Persoon ${persoonId} gekoppeld op de exacte naam van een gesloten rij (de koppeling ontbrak nog); de einddatum komt uit die rij.`,
    });
    return persoonId;
  }

  async function officialEnd({ personId, kind, functie, fractie, before }) {
    const persoonId = reversePersonMap.get(personId) ?? linkByClosedName(personId);
    if (!persoonId) return null;
    const pool = kind === "presidium" ? presidiumClosed : closedByPersoon.get(persoonId) ?? [];
    const matches = pool
      .filter((row) => row.persoonId === persoonId)
      .filter((row) => (functie ? row.functie === functie : true))
      .filter((row) => (fractie ? row.fractie === fractie : true))
      .filter((row) => (before ? row.totEnMet <= before : true))
      .sort((a, b) => b.totEnMet.localeCompare(a.totEnMet));
    if (matches.length > 0) return { end: matches[0].totEnMet, confidence: "high", via: "snapshot" };
    const looked = await lookupClosedRow({ kind, persoonId, functie, fractie });
    if (looked && looked.totEnMet) return { end: looked.totEnMet, confidence: "high", via: "lookup" };
    return null;
  }

  const closures = [];
  const openings = [];

  function closeRecord(entity, record, end, confidence, why, note) {
    const closed = { ...record, end, source: confidence === "high" ? refClosed("high") : refClosed("medium") };
    closures.push({ entity, record: closed, why, endIsOfficial: confidence === "high" });
    if (confidence !== "high") {
      review.push({
        kind: "closed-without-official-end",
        key: `closed-without-official-end|${record.id}`,
        text: `${record.id} is gesloten op de ophaaldatum ${today}: de bron gaf geen einddatum. ${note ?? ""}`.trim(),
      });
    }
    return closed;
  }

  // ----- fractie bookkeeping -----
  const datasetFractieLabels = new Set(
    (dataset.memberships ?? [])
      .filter((membership) => membership.organization === TK_ORG && !membership.end && membership.fractie)
      .map((membership) => membership.fractie),
  );
  const activeLabels = new Set(activeRows.map((row) => row.fractie));
  const newFracties = [...activeLabels].filter((label) => !datasetFractieLabels.has(label)).sort();
  const goneFracties = [...datasetFractieLabels].filter((label) => !activeLabels.has(label)).sort();
  // A Fractie row that became active or inactive inside the event window is a change as well (a new party after an
  // election, a split or a merger), even when the labels in the dataset happen to be the same.
  const recentFractieRows = fracties.filter(
    (fractie) =>
      [fractie.datumActief, fractie.datumInactief].some(
        (date) => typeof date === "string" && daysBetween(date, today) >= 0 && daysBetween(date, today) <= EVENT_WINDOW_DAYS,
      ),
  );
  const fractieChanged = newFracties.length > 0 || goneFracties.length > 0 || recentFractieRows.length > 0;
  const fractieByLabel = new Map(activeFracties.map((fractie) => [fractie.afkorting, fractie]));
  for (const label of newFracties) {
    const fractie = fractieByLabel.get(label);
    const registered = registeredFractieKeys ? registeredFractieKeys.has(label) : null;
    review.push({
      kind: "new-fractie",
      key: `new-fractie|${label}`,
      text:
        `Nieuwe fractie ${label}${fractie?.naamNL && fractie.naamNL !== label ? ` (${fractie.naamNL})` : ""} in de Tweede Kamer-bron` +
        `${fractie?.datumActief ? `, actief sinds ${fractie.datumActief}` : ""}. ` +
        (registered === false
          ? "Geen partijkleur in web/lib/parties.ts: de fractie krijgt het neutrale grijs tot een gesourcete kleur is toegevoegd."
          : registered === true
            ? "De partijkleur staat in web/lib/parties.ts."
            : "Controleer of web/lib/parties.ts een kleur heeft."),
    });
  }
  for (const label of goneFracties) {
    review.push({
      kind: "fractie-gone",
      key: `fractie-gone|${label}`,
      text: `Fractie ${label} komt niet meer voor onder de actieve leden van de Tweede Kamer-bron.`,
    });
  }

  // ----- memberships -----
  const openByPerson = new Map();
  for (const membership of dataset.memberships ?? []) {
    if (membership.end || membership.organization !== TK_ORG) continue;
    if (!openByPerson.has(membership.person)) openByPerson.set(membership.person, membership);
  }

  function chainStart(row) {
    // A Lid row that turns into a Fractievoorzitter row (or the reverse) in the same fractie is one membership.
    let start = row.van;
    const mine = (closedByPersoon.get(row.persoonId) ?? []).filter((candidate) => candidate.fractie === row.fractie);
    let moved = true;
    while (moved) {
      moved = false;
      for (const candidate of mine) {
        if (candidate.van && start && candidate.van < start && daysBetween(candidate.totEnMet, start) <= 1 && daysBetween(candidate.totEnMet, start) >= 0) {
          start = candidate.van;
          moved = true;
        }
      }
    }
    return start;
  }

  const memberships = [];
  const targetPersons = new Set();
  let membershipsCarried = 0;
  for (const row of activeRows) {
    const personId = memberIds.get(row.persoonId);
    targetPersons.add(personId);
    const existing = openByPerson.get(personId);
    if (existing && existing.fractie === row.fractie) {
      memberships.push({ ...existing, source: refOpen });
      membershipsCarried += 1;
      continue;
    }
    if (existing) {
      const official = await officialEnd({ personId, kind: "fzp", fractie: existing.fractie, before: addDays(row.van, 1) });
      const end = official?.end ?? today;
      memberships.push(closeRecord("memberships", existing, end, official ? "high" : "medium", "fractie-change", `${existing.person} verliet fractie ${existing.fractie}.`));
    }
    const start = chainStart(row);
    // A person without an earlier membership keeps the plain id the dataset uses; a return or a fractie change gets a dated id.
    const plainId = `membership:tweede-kamer-${slugify(index.byId.get(personId).name)}`;
    const id = allMembershipIds.has(plainId) ? nextId(`${plainId}-${compactDate(start)}`, allMembershipIds) : nextId(plainId, allMembershipIds);
    const opened = {
      id,
      organization: TK_ORG,
      person: personId,
      seatNumber: null,
      fractie: row.fractie,
      start,
      end: null,
      source: refOpen,
    };
    memberships.push(opened);
    openings.push({ entity: "memberships", record: opened, why: existing ? "fractie-change" : "new-member" });
  }
  for (const membership of dataset.memberships ?? []) {
    if (membership.end || membership.organization !== TK_ORG) continue;
    if (targetPersons.has(membership.person)) continue;
    const official = await officialEnd({ personId: membership.person, kind: "fzp" });
    const end = official?.end ?? today;
    const closed = closeRecord("memberships", membership, end, official ? "high" : "medium", "left-kamer", `${membership.person} staat niet meer onder de actieve Tweede Kamerleden.`);
    memberships.push(closed);
  }

  // ----- seats held by one person: fractievoorzitters, Voorzitter, ondervoorzitters -----
  const tenures = [];
  let tenuresCarried = 0;

  function ensurePosition({ id, title, sourceRefForPosition, type = "elected", exOfficioOf = [], aliases = [] }) {
    if (positionsById.has(id)) return id;
    const record = {
      id,
      slug: id.replace(/^pos:/, ""),
      title,
      organization: TK_ORG,
      type,
      fillMethod: "benoeming-door-college",
      entryModes: ["gekozen"],
      termLengthMonths: null,
      seatsCount: 1,
      exOfficioOf,
      sources: [sourceRefForPosition],
      aliases: [...new Set([title, ...aliases])],
    };
    positionsById.set(id, record);
    newPositions.push(record);
    const relationId = type === "dept_head" ? `rel:dept-head-${record.slug}` : `rel:office-${record.slug}`;
    if (!relationIds.has(relationId)) {
      relationIds.add(relationId);
      newRelations.push({
        id: relationId,
        from: id,
        to: TK_ORG,
        type: type === "dept_head" ? "dept_head" : "office",
        metadata: {},
        seatsAppointed: 0,
        source: sourceRefForPosition,
      });
    }
    review.push({ kind: "new-position", key: `new-position|${id}`, text: `Nieuwe positie ${id} (${title}) aangemaakt uit ${sourceRefForPosition.source}.` });
    return id;
  }

  async function reconcileSeat({ positionId, holders, tenurePrefix, kind, functie, ref, label }) {
    const openTenures = (dataset.tenures ?? []).filter((tenure) => tenure.position === positionId && !tenure.end);
    const keep = new Set();
    const holderPersons = holders.map((holder) => ({ holder, personId: memberIds.get(holder.persoonId) ?? presidiumPersonIds.get(holder.persoonId) }));
    const closedHere = [];
    for (const { holder, personId } of holderPersons) {
      const match = openTenures.find((tenure) => tenure.person === personId);
      if (match) {
        keep.add(match.id);
        tenures.push({ ...match, source: ref });
        tenuresCarried += 1;
      }
    }
    for (const tenure of openTenures) {
      if (keep.has(tenure.id)) continue;
      const official = await officialEnd({ personId: tenure.person, kind, functie });
      const end = official?.end ?? today;
      const closed = closeRecord("tenures", tenure, end, official ? "high" : "medium", `${label}-change`, `${label}: ${tenure.person} is niet meer de huidige houder.`);
      closedHere.push(closed);
    }
    const added = [];
    for (const { holder, personId } of holderPersons) {
      if (openTenures.some((tenure) => tenure.person === personId)) continue;
      const personSlug = personId.replace(/^person:/, "");
      const id = nextId(`${tenurePrefix}-${personSlug}-${compactDate(holder.van)}`, allTenureIds);
      const tenure = {
        id,
        person: personId,
        position: positionId,
        seat: null,
        start: holder.van,
        end: null,
        acting: false,
        entryMode: "gekozen",
        appointedBy: null,
        predecessor: null,
        successor: null,
        endReason: null,
        source: ref,
      };
      added.push(tenure);
    }
    if (added.length === 1 && closedHere.length === 1) {
      added[0].predecessor = closedHere[0].id;
      closedHere[0].successor = added[0].id;
    }
    for (const closed of closedHere) tenures.push(closed);
    for (const tenure of added) {
      tenures.push(tenure);
      openings.push({ entity: "tenures", record: tenure, why: `${label}-new-holder` });
    }
  }

  const presidiumPersonIds = new Map();

  // fractievoorzitters, one per active fractie
  const rowsByFractie = new Map();
  for (const row of activeRows) {
    if (!rowsByFractie.has(row.fractie)) rowsByFractie.set(row.fractie, []);
    rowsByFractie.get(row.fractie).push(row);
  }
  const seenChairPositions = new Set();
  for (const [label, rows] of [...rowsByFractie].sort((a, b) => a[0].localeCompare(b[0]))) {
    const chairs = rows.filter((row) => row.functie === "Fractievoorzitter");
    const fractie = fractieByLabel.get(label);
    const positionId = `pos:fractievoorzitter-${slugify(label)}`;
    seenChairPositions.add(positionId);
    if (chairs.length !== 1) {
      gaps.push(
        makeGap(
          `Fractievoorzitter van ${label}`,
          chairs.length === 0 ? "de bron noemt geen fractievoorzitter voor deze fractie" : `de bron noemt ${chairs.length} fractievoorzitters voor deze fractie`,
          TK_SOURCE_DEFS.open.url,
          "Geen actie: de bestaande tenure blijft staan tot de bron één fractievoorzitter noemt.",
        ),
      );
      continue;
    }
    ensurePosition({
      id: positionId,
      title: `Fractievoorzitter ${fractie?.naamNL ?? label}`,
      sourceRefForPosition: refOpen,
    });
    await reconcileSeat({
      positionId,
      holders: [chairs[0]],
      tenurePrefix: `tenure:fvp-fractievoorzitter-${slugify(label)}`,
      kind: "fzp",
      functie: "Fractievoorzitter",
      ref: refOpen,
      label: "fractievoorzitter",
    });
  }
  // a fractievoorzitter of a fractie that no longer exists (merger, dissolved) is closed
  for (const tenure of dataset.tenures ?? []) {
    if (tenure.end || !tenure.position.startsWith("pos:fractievoorzitter-")) continue;
    const position = positionsById.get(tenure.position);
    if (!position || position.organization !== TK_ORG) continue;
    if (seenChairPositions.has(tenure.position)) continue;
    const official = await officialEnd({ personId: tenure.person, kind: "fzp", functie: "Fractievoorzitter" });
    const end = official?.end ?? today;
    tenures.push(closeRecord("tenures", tenure, end, official ? "high" : "medium", "fractie-gone", `${tenure.position} hoort bij een fractie die niet meer bestaat.`));
  }

  // Presidium
  const presidiumRows = (snapshot.presidium ?? []).filter((row) => row && !row.verwijderd && !row.totEnMet && PRESIDIUM_POSITIONS[row.functie]);
  for (const functie of Object.keys(PRESIDIUM_POSITIONS)) {
    const rows = presidiumRows.filter((row) => row.functie === functie);
    const def = PRESIDIUM_POSITIONS[functie];
    if (rows.length !== 1) {
      if (snapshot.presidium && snapshot.presidium.length > 0) {
        gaps.push(
          makeGap(
            def.title,
            rows.length === 0 ? "het Presidium noemt geen houder" : `het Presidium noemt ${rows.length} houders voor een positie met één zetel`,
            TK_SOURCE_DEFS.presidium.url,
            "Geen actie: de bestaande tenure blijft staan tot de bron één houder noemt.",
          ),
        );
      }
      continue;
    }
    const holder = rows[0];
    const resolved = memberIds.get(holder.persoonId) ?? resolveTkPerson(holder, refPresidium).id;
    presidiumPersonIds.set(holder.persoonId, resolved);
    if (functie === "Voorzitter") ensurePosition({ id: def.id, title: def.title, sourceRefForPosition: refPresidium, type: "dept_head", exOfficioOf: [TK_ORG] });
    else ensurePosition({ id: def.id, title: def.title, sourceRefForPosition: refPresidium });
    await reconcileSeat({
      positionId: def.id,
      holders: [holder],
      tenurePrefix: def.tenurePrefix,
      kind: "presidium",
      functie,
      ref: refPresidium,
      label: functie === "Voorzitter" ? "voorzitter" : "ondervoorzitter",
    });
  }

  // ----- people touched this run -----
  const involved = new Set([...memberIds.values(), ...presidiumPersonIds.values()]);
  const people = [];
  for (const personId of [...involved].sort()) {
    const record = index.byId.get(personId);
    if (!record) continue;
    if (newPeople.some((person) => person.id === personId)) {
      people.push(record);
      continue;
    }
    const refs = Array.isArray(record.sources) ? record.sources : [];
    if (refs.some((ref) => ref && ref.source === sources.open.id)) continue;
    const clone = structuredClone(record);
    clone.sources = [...refs, refOpen];
    people.push(clone);
  }

  // ----- guard -----
  const bulk = decideBulk({ closures: closures.length, fractieChanged, events });
  const guard = {
    allowed: bulk.allowed,
    bulk: bulk.bulk,
    event: bulk.event,
    fractieChanged,
    reasons: bulk.allowed ? [] : [bulk.reason],
  };
  if (bulk.allowed && bulk.bulk) {
    review.push({
      kind: "bulk-event",
      key: `bulk-event|${today}|${bulk.event}|${closures.length}`,
      text: `Bulkwijziging toegepast (${bulk.event}): ${closures.length} sluitingen en ${openings.length} openingen in de Tweede Kamer-bron op ${today}. Nieuwe fracties: ${newFracties.join(", ") || "geen"}; verdwenen fracties: ${goneFracties.join(", ") || "geen"}.`,
    });
  }

  const seatsByFractie = Object.fromEntries([...rowsByFractie].map(([label, rows]) => [label, rows.length]).sort());
  const byIdSort = (records) => records.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const usedSources = Object.values(sources);
  const allClosuresTouched = closures.length > 0 || openings.length > 0;

  return {
    memberships: byIdSort(memberships),
    tenures: byIdSort(tenures),
    people: byIdSort(people),
    positions: byIdSort(newPositions),
    relations: byIdSort(newRelations),
    sources: byIdSort(usedSources),
    closures,
    openings,
    gaps,
    review,
    personMap: personMapUpdates,
    invariants,
    events,
    guard,
    newFracties,
    goneFracties,
    seatsByFractie,
    changed: allClosuresTouched,
    maxApiGewijzigdOp: maxIso([...(snapshot.rows ?? []).map((row) => row.apiGewijzigdOp)]),
    stats: {
      activeSeats: activeRows.length,
      closed: closures.length,
      opened: openings.length,
      newPeople: newPeople.length,
      newPositions: newPositions.length,
      membershipsCarried,
      tenuresCarried,
      warnings: warnings.length,
    },
  };
}
