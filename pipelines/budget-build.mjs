// Turns the aggregated Begrotingsstaten into the records of data/budgets.json.
//
// An existing record whose figures are unchanged is returned as it is, so its `retrieved`
// date stays and an unchanged download writes the same bytes. A record whose figures changed
// (a year closed and got its realised figures, a later phase was published) or a new fiscal
// year gets the source of this download. New years are added for every ministry that has data.

import { SOURCE_UNIT, MINISTRIES, amountsFor, historyBefore, yearsOf } from "./budget-parse.mjs";

const FILE_PATTERN = /Begrotingsstaten_(\d{4})-(\d{4})\.json$/;

/** `src:rijksfinancien-begrotingsstaten-2013-2027` and its fiscal year range, from a download URL. */
export function sourceIdFor(url) {
  const match = FILE_PATTERN.exec(new URL(url).pathname);
  if (!match) throw new Error(`geen Begrotingsstaten-bestand: ${url}`);
  return { id: `src:rijksfinancien-begrotingsstaten-${match[1]}-${match[2]}`, from: Number(match[1]), to: Number(match[2]) };
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function compareRecords(a, b) {
  return a.organization < b.organization ? -1 : a.organization > b.organization ? 1 : a.fiscalYear - b.fiscalYear;
}

/**
 * @param {object} args
 * @param {object[]} args.existing  the records of data/budgets.json
 * @param {Map} args.totals         aggregate(...).totals
 * @param {string} args.sourceId    source id of this download
 * @param {string} args.today       ISO date of the run
 * @returns {{ records: object[], added: object[], changed: object[], missing: object[] }}
 */
export function buildRecords({ existing, totals, sourceId, today }) {
  const records = [];
  const added = [];
  const changed = [];
  const missing = []; // existing records that the download can no longer produce
  const orgs = new Set([...MINISTRIES.map((ministry) => ministry.id), ...existing.map((record) => record.organization)]);

  for (const org of orgs) {
    const own = existing.filter((record) => record.organization === org);
    const slots = totals.get(org);
    const lastKnown = own.reduce((max, record) => Math.max(max, record.fiscalYear), -Infinity);
    const firstKnown = own.reduce((min, record) => Math.min(min, record.fiscalYear), Infinity);
    const fresh = yearsOf(totals, org).filter((year) => year > lastKnown);
    const years = [...new Set([...own.map((record) => record.fiscalYear), ...fresh])].sort((a, b) => a - b);

    for (const year of years) {
      const old = own.find((record) => record.fiscalYear === year);
      const current = amountsFor(slots?.get(year));
      if (!current) {
        if (old) {
          records.push(old);
          missing.push(old);
        }
        continue;
      }
      const previous = amountsFor(slots.get(year - 1));
      const core = {
        unit: SOURCE_UNIT,
        current,
        previous,
        // The history sits on the first record of a ministry only, as in the first import.
        history: year === firstKnown ? historyBefore(totals, org, year) : [],
      };
      if (old && sameJson({ unit: old.unit, current: old.current, previous: old.previous, history: old.history }, core)) {
        records.push(old);
        continue;
      }
      const record = {
        organization: org,
        fiscalYear: year,
        ...core,
        sources: [{ source: sourceId, retrieved: today, confidence: "high" }],
      };
      records.push(record);
      (old ? changed : added).push(record);
    }
  }
  records.sort(compareRecords);
  return { records, added, changed, missing };
}

/**
 * The sources list with the source of this download. A new file name (a new fiscal year range)
 * becomes a new source, copied from the newest begrotingsstaten source; the same name only moves
 * `retrieved`, and only when a record was written from it.
 */
export function updateSources({ sources, sourceId, url, from, to, today, used }) {
  if (!used) return sources;
  const index = sources.findIndex((source) => source.id === sourceId);
  if (index >= 0) {
    if (sources[index].retrieved === today) return sources;
    const next = sources.slice();
    next[index] = { ...sources[index], url, retrieved: today };
    return next;
  }
  const base = sources.filter((source) => /^src:rijksfinancien-begrotingsstaten-/.test(source.id)).at(-1);
  if (!base) throw new Error("geen bestaande begrotingsstaten-bron om van te kopiëren");
  const entry = {
    ...base,
    id: sourceId,
    url,
    title: base.title.replace(/\d{4}-\d{4}/, `${from}-${to}`),
    retrieved: today,
  };
  return [...sources, entry];
}
