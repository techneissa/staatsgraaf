// Tweede Kamer OData fetching for the live run: change counts by the
// ApiGewijzigdOp cursor, the snapshot the planner needs, and targeted
// look-ups of an official end date. All requests go through live-http.

import { addDays } from "./live-util.mjs";
import {
  TK_BASE,
  normalizeFractie,
  normalizeFzpRow,
  normalizePresidiumRow,
  normalizeVacature,
} from "./tk-changes.mjs";

export const PAGE_SIZE = 250;
const PERSOON_SELECT = "Id,Nummer,Initialen,Tussenvoegsel,Achternaam,Voornamen,Roepnaam,Geboortedatum,Fractielabel";
const FZP_EXPAND = `Persoon($select=${PERSOON_SELECT}),FractieZetel($expand=Fractie)`;
const CURSOR_ENTITIES = ["fzp", "fractie", "vacature", "presidium"];

function encodeValue(value) {
  return encodeURIComponent(value)
    .replace(/%24/g, "$")
    .replace(/%2C/g, ",")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%3A/g, ":")
    .replace(/%2F/g, "/")
    .replace(/%27/g, "'");
}

export function tkUrl(entity, params = {}) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${encodeValue(String(value))}`)
    .join("&");
  return `${TK_BASE}/${entity}${query ? `?${query}` : ""}`;
}

/** Filter fragment: rows that changed after the cursor. The cursor is an ApiGewijzigdOp value as the API wrote it. */
export function changedAfter(cursor) {
  return `ApiGewijzigdOp gt ${cursor}`;
}

export function countUrl(entity, cursor, presidiumId) {
  const filters = [changedAfter(cursor)];
  if (entity === "CommissieZetelVastPersoon" && presidiumId) filters.unshift(`CommissieZetel/Commissie_Id eq ${presidiumId}`);
  return tkUrl(entity, { $filter: filters.join(" and "), $count: "true", $top: 0 });
}

const COUNT_ENTITY = {
  fzp: "FractieZetelPersoon",
  fractie: "Fractie",
  vacature: "FractieZetelVacature",
  presidium: "CommissieZetelVastPersoon",
};

/**
 * One cheap count per entity since its cursor. An entity without a cursor
 * counts as changed (first run). Returns { counts, changed }.
 */
export async function fetchTkCounts({ http, cursors = {}, presidiumId = null }) {
  const counts = {};
  let changed = false;
  for (const key of CURSOR_ENTITIES) {
    const cursor = cursors[key];
    if (!cursor || (key === "presidium" && !presidiumId)) {
      counts[key] = null;
      changed = true;
      continue;
    }
    const json = await http.getJson(countUrl(COUNT_ENTITY[key], cursor, presidiumId));
    const count = Number(json["@odata.count"]);
    counts[key] = Number.isFinite(count) ? count : null;
    if (counts[key] === null || counts[key] > 0) changed = true;
  }
  return { counts, changed };
}

export async function fetchAllPages(http, firstUrl) {
  const value = [];
  let url = firstUrl;
  let pages = 0;
  while (url) {
    const json = await http.getJson(url);
    if (Array.isArray(json.value)) value.push(...json.value);
    pages += 1;
    url = json["@odata.nextLink"] ?? null;
    if (pages > 40) throw new Error(`te veel paginas voor ${firstUrl}`);
  }
  return { value, pages };
}

export async function fetchPresidiumId(http) {
  const json = await http.getJson(tkUrl("Commissie", { $filter: "Afkorting eq 'PRES'", $select: "Id,Afkorting,NaamNL" }));
  const row = Array.isArray(json.value) ? json.value[0] : null;
  if (!row || !row.Id) throw new Error("de commissie PRES (Presidium) staat niet in de bron");
  return row.Id;
}

/** The read window starts a day before the cursor, so a row that became visible slightly late is read twice rather than missed. */
export function readWindowStart(cursor, fallback) {
  const base = cursor ?? fallback;
  const day = String(base).slice(0, 10);
  return `${addDays(day, -1)}T00:00:00Z`;
}

/**
 * Where the read window starts on a first run, with no cursor: a week before the
 * newest retrieval of a Tweede Kamer source in the dataset (rows changed since the
 * dataset was last built), or 60 days back when the dataset names none.
 */
export function bootstrapSince(sources = [], today) {
  const dates = (sources ?? [])
    .filter((source) => source && typeof source.id === "string" && source.id.startsWith("src:tk-odata") && typeof source.retrieved === "string")
    .map((source) => source.retrieved)
    .sort();
  const newest = dates[dates.length - 1] ?? addDays(today, -53);
  return `${addDays(newest, -7)}T00:00:00Z`;
}

/**
 * The newest ApiGewijzigdOp of each entity, read before the snapshot so a change made while the
 * snapshot is read is still counted next time. The cursor must come from the whole entity, not from
 * the rows read: the open vacancy rows are old while closed vacancy rows keep changing.
 */
export async function fetchLatestChanges({ http, presidiumId }) {
  const latest = {};
  const targets = {
    fzp: tkUrl("FractieZetelPersoon", { $orderby: "ApiGewijzigdOp desc", $top: 1, $select: "ApiGewijzigdOp" }),
    fractie: tkUrl("Fractie", { $orderby: "ApiGewijzigdOp desc", $top: 1, $select: "ApiGewijzigdOp" }),
    vacature: tkUrl("FractieZetelVacature", { $orderby: "ApiGewijzigdOp desc", $top: 1, $select: "ApiGewijzigdOp" }),
    presidium: tkUrl("CommissieZetelVastPersoon", {
      $filter: `CommissieZetel/Commissie_Id eq ${presidiumId}`,
      $orderby: "ApiGewijzigdOp desc",
      $top: 1,
      $select: "ApiGewijzigdOp",
    }),
  };
  for (const [key, url] of Object.entries(targets)) {
    const json = await http.getJson(url);
    latest[key] = Array.isArray(json.value) && json.value[0] ? json.value[0].ApiGewijzigdOp ?? null : null;
  }
  return latest;
}

export function computeCursors(previous = {}, raws = {}, latest = {}) {
  const next = { ...previous };
  for (const key of CURSOR_ENTITIES) {
    const seen = [...(raws[key] ?? []).map((row) => row?.ApiGewijzigdOp), latest[key]].filter(Boolean).sort();
    const top = seen[seen.length - 1] ?? null;
    if (top && (!next[key] || top > next[key])) next[key] = top;
  }
  return next;
}

/**
 * Everything the planner needs, in a small number of requests:
 * open seat rows, seat rows closed since the cursor, Fractie rows, open vacancies, Presidium rows.
 * `since` is the start of the read window for closed and changed rows.
 */
export async function fetchTkSnapshot({ http, since, presidiumId }) {
  const latest = await fetchLatestChanges({ http, presidiumId });
  const open = await fetchAllPages(
    http,
    tkUrl("FractieZetelPersoon", {
      $filter: "TotEnMet eq null and Verwijderd eq false",
      $expand: FZP_EXPAND,
      $top: PAGE_SIZE,
    }),
  );
  const closed = await fetchAllPages(
    http,
    tkUrl("FractieZetelPersoon", {
      $filter: `TotEnMet ne null and Verwijderd eq false and ${changedAfter(since)}`,
      $expand: FZP_EXPAND,
      $top: PAGE_SIZE,
    }),
  );
  const fractie = await fetchAllPages(
    http,
    tkUrl("Fractie", {
      $filter: `Verwijderd eq false and (DatumInactief eq null or ${changedAfter(since)})`,
      $top: PAGE_SIZE,
    }),
  );
  const vacature = await fetchAllPages(
    http,
    tkUrl("FractieZetelVacature", {
      $filter: "TotEnMet eq null and Verwijderd eq false",
      $expand: "FractieZetel($expand=Fractie)",
      $top: PAGE_SIZE,
    }),
  );
  const presidium = await fetchAllPages(
    http,
    tkUrl("CommissieZetelVastPersoon", {
      $filter: `CommissieZetel/Commissie_Id eq ${presidiumId} and Verwijderd eq false and (TotEnMet eq null or ${changedAfter(since)})`,
      $expand: `Persoon($select=${PERSOON_SELECT})`,
      $top: PAGE_SIZE,
    }),
  );
  const raws = {
    fzp: [...open.value, ...closed.value],
    fractie: fractie.value,
    vacature: vacature.value,
    presidium: presidium.value,
  };
  return {
    snapshot: {
      rows: raws.fzp.map(normalizeFzpRow),
      fracties: raws.fractie.map(normalizeFractie),
      vacatures: raws.vacature.map(normalizeVacature),
      presidium: raws.presidium.map(normalizePresidiumRow),
    },
    raws,
    latest,
    rawOpen: open.value,
    requests: open.pages + closed.pages + fractie.pages + vacature.pages + presidium.pages,
  };
}

/** The newest closed row of one person, for the official end date a snapshot does not carry. */
export function makeClosedRowLookup({ http, presidiumId }) {
  return async function lookupClosedRow({ kind, persoonId, functie }) {
    if (!persoonId) return null;
    let url;
    if (kind === "presidium") {
      if (!presidiumId) return null;
      const filter = [
        `Persoon_Id eq ${persoonId}`,
        `CommissieZetel/Commissie_Id eq ${presidiumId}`,
        "TotEnMet ne null",
        "Verwijderd eq false",
        functie ? `Functie eq '${functie}'` : null,
      ]
        .filter(Boolean)
        .join(" and ");
      url = tkUrl("CommissieZetelVastPersoon", { $filter: filter, $orderby: "TotEnMet desc", $top: 1 });
    } else {
      const filter = [
        `Persoon_Id eq ${persoonId}`,
        "TotEnMet ne null",
        "Verwijderd eq false",
        functie ? `Functie eq '${functie}'` : null,
      ]
        .filter(Boolean)
        .join(" and ");
      url = tkUrl("FractieZetelPersoon", { $filter: filter, $orderby: "TotEnMet desc", $top: 1 });
    }
    const json = await http.getJson(url);
    const row = Array.isArray(json.value) ? json.value[0] : null;
    return row ? { totEnMet: String(row.TotEnMet).slice(0, 10) } : null;
  };
}
