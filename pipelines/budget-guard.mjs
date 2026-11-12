// Guard for the unattended budget refresh, in the style of live-guard.mjs: when the download
// looks broken, nothing is written and the run reports why.
//
// The rules are about shape, not about politics. A download is broken when
//   - a ministry has no figures for a year that the dataset already holds, or for the
//     newest year in the download (half a file, a renamed chapter that no rule claims);
//   - the newest year of the download is older than the newest year in the dataset;
//   - a figure of an existing year moved by more than REVISION_FACTOR (a unit change, a
//     missing block of articles), or a new year starts more than NEW_YEAR_FACTOR away from
//     the year before it, or the total of all ministries moved by more than TOTAL_TOLERANCE.
// The factors are wide on purpose: ministries are reorganised (the history shows year on year
// ratios from 0.27 to 3.3), and a legitimate move that trips the guard is a person's call.

import { amountsFor, yearsOf } from "./budget-parse.mjs";

export const REVISION_FACTOR = 2;
export const NEW_YEAR_FACTOR = 4;
export const TOTAL_TOLERANCE = 0.35;

export class BudgetGuardError extends Error {
  constructor(reasons) {
    const list = Array.isArray(reasons) ? reasons : [String(reasons)];
    super(`guard begroting: ${list.join("; ")}. Er is niets geschreven.`);
    this.name = "BudgetGuardError";
    this.reasons = list;
  }
}

function outsideFactor(next, prev, factor) {
  if (!prev || !next) return false; // nothing to compare with
  const ratio = next / prev;
  return ratio > factor || ratio < 1 / factor;
}

const FIELDS = [
  ["spendingBudget", "begroting"],
  ["spendingActual", "realisatie"],
  ["revenue", "ontvangsten"],
];

/** A figure that was set (not null, not 0) and is now null or 0: a block of rows is missing. */
function vanished(next, prev) {
  return Boolean(prev) && !next;
}

/** Reasons the download must not be applied; an empty list means it may be. */
export function evaluateBudgetDownload({ totals, existing, ministries, unmatchedChapters = [] }) {
  const reasons = [];
  // A chapter with amounts that no ministry claims would be missing from some ministry's totals.
  for (const gap of unmatchedChapters) {
    reasons.push(`hoofdstuk ${gap.chapter} (${gap.name}, ${gap.years.join(", ")}) hoort bij geen ministerie van de dataset`);
  }
  const label = (org) => org.replace(/^org:ministerie-van-/, "");

  const newestInFile = Math.max(-Infinity, ...ministries.flatMap((org) => yearsOf(totals, org)));
  const newestInData = Math.max(-Infinity, ...existing.map((record) => record.fiscalYear));
  if (!Number.isFinite(newestInFile)) return ["de download bevat geen begrotingscijfers voor de ministeries"];
  if (newestInFile < newestInData) reasons.push(`nieuwste jaar in de download is ${newestInFile}, in de dataset ${newestInData}`);

  for (const org of ministries) {
    const slots = totals.get(org);
    const required = new Set([newestInFile, ...existing.filter((record) => record.organization === org).map((record) => record.fiscalYear)]);
    const absent = [...required].filter((year) => !amountsFor(slots?.get(year))).sort();
    if (absent.length > 0) reasons.push(`${label(org)}: geen cijfers voor ${absent.join(", ")}`);
  }

  const sums = new Map(); // year -> { old, next } over the ministries that have both
  for (const org of ministries) {
    const slots = totals.get(org);
    const own = existing.filter((record) => record.organization === org);
    for (const record of own) {
      const now = amountsFor(slots?.get(record.fiscalYear));
      if (!now) continue;
      const was = record.current;
      for (const [field, name] of FIELDS) {
        if (vanished(now[field], was?.[field]) || outsideFactor(now[field], was?.[field], REVISION_FACTOR)) {
          reasons.push(`${label(org)} ${record.fiscalYear}: ${name} ${was[field]} werd ${now[field]}`);
        }
      }
      const total = sums.get(record.fiscalYear) ?? { old: 0, next: 0 };
      total.old += was?.spendingActual ?? was?.spendingBudget ?? 0;
      total.next += now.spendingActual ?? now.spendingBudget ?? 0;
      sums.set(record.fiscalYear, total);
    }
    const lastKnown = Math.max(-Infinity, ...own.map((record) => record.fiscalYear));
    for (const year of yearsOf(totals, org).filter((y) => y > lastKnown)) {
      const now = amountsFor(slots.get(year));
      const before = amountsFor(slots.get(year - 1));
      if (outsideFactor(now.spendingBudget, before?.spendingActual ?? before?.spendingBudget, NEW_YEAR_FACTOR)) {
        reasons.push(`${label(org)} ${year}: nieuw jaar wijkt te ver af van ${year - 1}`);
      }
    }
  }
  for (const [year, { old, next }] of sums) {
    if (old > 0 && Math.abs(next - old) / old > TOTAL_TOLERANCE) {
      reasons.push(`totaal van alle ministeries ${year}: ${old} werd ${next}`);
    }
  }
  return reasons;
}
