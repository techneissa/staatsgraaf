// Event-aware guards for the unattended live run (ADR 0006 amended, ADR 0024).
//
// A broken page layout or a half-written API response must never look like a
// mass resignation, and a real election or merger must not need a person to
// flip a switch. The rule: the source data must be internally consistent
// (seat totals, no duplicates, every fractie adds up); small changes (at most
// MAX_QUIET_CLOSURES closures) then flow on their own; bigger ones flow only
// when an event explains them (a fractie row changed, an election day or a
// cabinet swearing-in inside the last EVENT_WINDOW_DAYS days).

import { daysBetween, normalizeName } from "./live-util.mjs";

export const SEATS_TK = 150;
export const SEATS_EK = 75;
export const BEWINDSPERSONEN_EXPECTED = 28;
export const BEWINDSPERSONEN_TOLERANCE = 3;
export const EVENT_WINDOW_DAYS = 60;
export const MAX_QUIET_CLOSURES = 5;
/** A vacancy younger than this explains a missing seat; older rows are stale source rows. */
export const FRESH_VACANCY_DAYS = 60;

export class GuardError extends Error {
  constructor(source, reasons, detail = {}) {
    const list = Array.isArray(reasons) ? reasons : [String(reasons)];
    super(`guard ${source}: ${list.join("; ")}. Er is niets geschreven voor deze bron.`);
    this.name = "GuardError";
    this.source = source;
    this.reasons = list;
    this.detail = detail;
  }
}

function failure(code, detail) {
  return { code, detail };
}

/**
 * Consistency of the Tweede Kamer snapshot. `activeRows` are open, non-deleted
 * FractieZetelPersoon rows with a seat function (Lid or Fractievoorzitter),
 * normalised: { persoonId, fractieZetelId, fractie, gewicht }.
 */
export function evaluateTkInvariants({ activeRows = [], fracties = [], vacatures = [], today }) {
  const failures = [];
  const freshVacancies = vacatures.filter(
    (vacature) =>
      vacature &&
      !vacature.totEnMet &&
      typeof vacature.van === "string" &&
      daysBetween(vacature.van, today) >= 0 &&
      daysBetween(vacature.van, today) <= FRESH_VACANCY_DAYS,
  );
  const seats = activeRows.length;
  if (seats !== SEATS_TK && seats + freshVacancies.length !== SEATS_TK) {
    failures.push(
      failure(
        "seat-total",
        `${seats} actieve zetels (met ${freshVacancies.length} recente vacatures), verwacht ${SEATS_TK}`,
      ),
    );
  }

  const zetels = new Map();
  const persons = new Map();
  const gewichten = new Map();
  for (const row of activeRows) {
    zetels.set(row.fractieZetelId, (zetels.get(row.fractieZetelId) ?? 0) + 1);
    persons.set(row.persoonId, (persons.get(row.persoonId) ?? 0) + 1);
    const key = `${row.fractie}|${row.gewicht}`;
    gewichten.set(key, (gewichten.get(key) ?? 0) + 1);
  }
  const dupZetels = [...zetels].filter(([, count]) => count > 1).map(([id]) => id);
  const dupGewichten = [...gewichten].filter(([, count]) => count > 1).map(([key]) => key);
  if (dupZetels.length > 0 || dupGewichten.length > 0) {
    failures.push(
      failure(
        "duplicate-seat",
        `dubbele zetel(s): ${[...dupZetels, ...dupGewichten.map((key) => `zetelnummer ${key}`)].slice(0, 5).join(", ")}`,
      ),
    );
  }
  const dupPersons = [...persons].filter(([, count]) => count > 1).map(([id]) => id);
  if (dupPersons.length > 0) {
    failures.push(failure("duplicate-person", `een persoon heeft meer dan een actieve zetel: ${dupPersons.slice(0, 5).join(", ")}`));
  }

  const byFractie = new Map();
  for (const row of activeRows) byFractie.set(row.fractie, (byFractie.get(row.fractie) ?? 0) + 1);
  const fractieRows = new Map(fracties.map((fractie) => [fractie.afkorting, fractie]));
  const freshByFractie = new Map();
  for (const vacature of freshVacancies) freshByFractie.set(vacature.fractie, (freshByFractie.get(vacature.fractie) ?? 0) + 1);
  for (const [afkorting, members] of byFractie) {
    const fractie = fractieRows.get(afkorting);
    if (!fractie) {
      failures.push(failure("fractie-missing", `geen Fractie-rij voor ${afkorting}`));
      continue;
    }
    const expected = fractie.aantalZetels;
    const withVacancies = members + (freshByFractie.get(afkorting) ?? 0);
    if (expected !== members && expected !== withVacancies) {
      failures.push(failure("fractie-count", `${afkorting}: ${members} actieve leden, Fractie.AantalZetels ${expected}`));
    }
  }

  return { ok: failures.length === 0, failures, stats: { seats, fracties: byFractie.size, freshVacancies: freshVacancies.length } };
}

/** Eerste Kamer: 75 members, a fractie seat sum of 75, every fractie total equals its member count. */
export function evaluateEkInvariants({ members = [], fracties = [] }) {
  const failures = [];
  if (members.length !== SEATS_EK) {
    failures.push(failure("member-total", `${members.length} leden op alle_leden, verwacht ${SEATS_EK}`));
  }
  const sum = fracties.reduce((total, fractie) => total + (Number(fractie.seats) || 0), 0);
  if (sum !== SEATS_EK) failures.push(failure("seat-total", `de fractiepagina telt ${sum} zetels, verwacht ${SEATS_EK}`));
  const counts = new Map();
  for (const member of members) {
    const key = normalizeName(member.party);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const fractie of fracties) {
    const key = normalizeName(fractie.label);
    const found = counts.get(key) ?? 0;
    if (found !== fractie.seats) failures.push(failure("fractie-count", `${fractie.label}: ${found} leden, ${fractie.seats} zetels`));
    counts.delete(key);
  }
  for (const [key, count] of counts) failures.push(failure("fractie-count", `${key}: ${count} leden zonder fractieregel`));
  return { ok: failures.length === 0, failures, stats: { members: members.length, seats: sum } };
}

export function evaluateBewindspersonenInvariants({ count }) {
  const failures = [];
  const low = BEWINDSPERSONEN_EXPECTED - BEWINDSPERSONEN_TOLERANCE;
  const high = BEWINDSPERSONEN_EXPECTED + BEWINDSPERSONEN_TOLERANCE;
  if (count < low || count > high) {
    failures.push(failure("list-size", `${count} bewindspersonen, verwacht ${BEWINDSPERSONEN_EXPECTED} plus of min ${BEWINDSPERSONEN_TOLERANCE}`));
  }
  return { ok: failures.length === 0, failures, stats: { count } };
}

/**
 * Election days (data/elections.json) and cabinet swearing-ins (the start of
 * a coalition in data/coalitions.json) that lie inside the window before today.
 */
export function recentEvents({ today, elections = [], coalitions = [], windowDays = EVENT_WINDOW_DAYS }) {
  const events = [];
  for (const election of elections) {
    if (!election || typeof election.date !== "string") continue;
    const age = daysBetween(election.date, today);
    if (age >= 0 && age <= windowDays) events.push({ kind: "election", id: election.id, date: election.date });
  }
  for (const coalition of coalitions) {
    if (!coalition || typeof coalition.start !== "string") continue;
    const age = daysBetween(coalition.start, today);
    if (age >= 0 && age <= windowDays) events.push({ kind: "cabinet-start", id: coalition.id, date: coalition.start });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
}

/** Quiet changes pass; bulk closures need an event. */
export function decideBulk({ closures, fractieChanged = false, events = [], maxQuiet = MAX_QUIET_CLOSURES }) {
  if (closures <= maxQuiet) return { allowed: true, bulk: false, event: null, reason: null };
  if (fractieChanged) return { allowed: true, bulk: true, event: "fractie-changed", reason: null };
  if (events.length > 0) {
    const newest = events[events.length - 1];
    return { allowed: true, bulk: true, event: `${newest.kind}@${newest.date}`, reason: null };
  }
  return {
    allowed: false,
    bulk: true,
    event: null,
    reason:
      `${closures} sluitingen zonder gebeurtenis (geen gewijzigde fractie, geen verkiezing of beëdiging in de laatste ${EVENT_WINDOW_DAYS} dagen); ` +
      `de drempel is ${maxQuiet}`,
  };
}

// ---------- provincies, gemeenten, waterschappen (ADR 0027) ----------

/** Plausible counts of current bodies per level; a source outside its range writes nothing. */
export const DEFAULT_BOUNDS = Object.freeze({
  gemeenten: [300, 400],
  provincies: [12, 12],
  waterschappen: [15, 30],
});

function difference(a, b) {
  return [...a].filter((value) => !b.has(value)).sort();
}

/**
 * The bodies of one level must agree across independent reads: the TOOI set (codes with no end date),
 * the register export and, for gemeenten and provincies, the CBS table. The same codes, a count in the plausible
 * range, and for gemeenten the same province in TOOI and CBS.
 */
export function evaluateBodyInvariants({ level, tooiCodes, registerCodes, cbsCodes = null, tooiProvince = null, cbsProvince = null, bounds = DEFAULT_BOUNDS[level] }) {
  const failures = [];
  const tooi = new Set(tooiCodes);
  const register = new Set(registerCodes);
  const [low, high] = bounds;
  if (tooi.size < low || tooi.size > high) failures.push(failure("count-range", `${tooi.size} ${level} in TOOI, verwacht ${low === high ? low : `${low} tot en met ${high}`}`));
  const regOnly = difference(register, tooi);
  const tooiOnly = difference(tooi, register);
  if (regOnly.length + tooiOnly.length > 0) {
    failures.push(failure("register-vs-tooi", `TOOI en het register noemen niet dezelfde ${level} (alleen register: ${regOnly.slice(0, 5).join(", ") || "geen"}; alleen TOOI: ${tooiOnly.slice(0, 5).join(", ") || "geen"})`));
  }
  if (cbsCodes) {
    const cbs = new Set(cbsCodes);
    const cbsOnly = difference(cbs, tooi);
    const tooiNotCbs = difference(tooi, cbs);
    if (cbsOnly.length + tooiNotCbs.length > 0) {
      failures.push(failure("cbs-vs-tooi", `CBS en TOOI noemen niet dezelfde ${level} (alleen CBS: ${cbsOnly.slice(0, 5).join(", ") || "geen"}; alleen TOOI: ${tooiNotCbs.slice(0, 5).join(", ") || "geen"}); rond 1 januari kan een van beide een paar dagen voorlopen`));
    }
  }
  if (tooiProvince && cbsProvince) {
    const wrong = [];
    for (const [code, province] of cbsProvince) if (tooiProvince.get(code) && province && tooiProvince.get(code) !== province) wrong.push(code);
    if (wrong.length > 0) failures.push(failure("province", `${wrong.length} gemeenten met een andere provincie in TOOI dan in CBS (${wrong.slice(0, 5).join(", ")})`));
  }
  return { ok: failures.length === 0, failures, stats: { tooi: tooi.size, register: register.size, cbs: cbsCodes ? new Set(cbsCodes).size : null } };
}

/** The register file must name a head (burgemeester, dijkgraaf) for nearly every body, or it is truncated or restructured. */
export function evaluateHolderInvariants({ level, bodies, withHead, expectsHeads = true, minRatio = 0.97 }) {
  const failures = [];
  if (expectsHeads && bodies > 0 && withHead / bodies < minRatio) {
    failures.push(failure("heads-missing", `het register noemt een hoofd voor ${withHead} van ${bodies} ${level}; ten minste ${Math.round(minRatio * 100)} procent is nodig`));
  }
  return { ok: failures.length === 0, failures, stats: { bodies, withHead } };
}
