// Election dates from the Kiesraad type pages (research gap list: item 7).
//
// Each page holds one sentence with the date of the next election. The sentence
// is parsed only when it matches the expected phrase; any other wording is a
// named gap, never a guess. The result lives in the state file and in the small
// data file data/upcoming-elections.json (the model of data/elections.json needs
// seat results, so it cannot hold a future election without a schema change).

import { buildSourceRecord, makeGap, sourceRef } from "./live-util.mjs";
import { parseDutchDate, visibleText } from "./ek-live.mjs";

export const KIESRAAD_BASE = "https://www.kiesraad.nl/verkiezingen";
export const UPCOMING_FILE = "upcoming-elections.json";

const DATE = String.raw`(\d{1,2} [a-z]+ \d{4})`;

/** One entry per election type page. `next` extracts the date of the next election, `last` the date of the latest. */
export const ELECTION_TYPES = [
  {
    id: "tk",
    slug: "tweede-kamer",
    label: "Tweede Kamer",
    body: "org:tweede-kamer",
    next: new RegExp(String.raw`De volgende reguliere Tweede Kamerverkiezing is op ${DATE}\.`),
    last: new RegExp(String.raw`De laatste Tweede Kamerverkiezing vond plaats op ${DATE}\.`),
  },
  {
    id: "ek",
    slug: "eerste-kamer",
    label: "Eerste Kamer",
    body: "org:eerste-kamer",
    next: new RegExp(String.raw`De volgende Eerste Kamerverkiezing is op ${DATE}\.`),
  },
  {
    id: "ps",
    slug: "provinciale-staten",
    label: "Provinciale Staten",
    body: null,
    next: new RegExp(String.raw`De volgende verkiezingen voor de Provinciale Staten zijn op ${DATE}\.`),
  },
  {
    id: "ws",
    slug: "waterschappen",
    label: "Waterschappen",
    body: null,
    next: new RegExp(String.raw`De volgende waterschapsverkiezingen zijn op ${DATE}\.`),
  },
  {
    id: "ep",
    slug: "europees-parlement",
    label: "Europees Parlement",
    body: null,
    // The page gives a period (6 to 9 June) and then the Dutch voting day.
    next: new RegExp(String.raw`De volgende Europees Parlementsverkiezing is in de periode [^.]*\d{4}\.`),
    nextDay: new RegExp(String.raw`Nederland stemt dan op [a-z]+ ${DATE}\.`),
  },
  {
    id: "gr",
    slug: "gemeenteraden",
    label: "Gemeenteraden",
    body: null,
    // The page names a month, not a day: the date stays null and the month is kept.
    nextMonth: /De volgende gemeenteraadsverkiezingen zijn in ([a-z]+) (\d{4})\./,
  },
  {
    id: "her",
    slug: "herindelingen",
    label: "Herindelingsverkiezingen",
    body: null,
    next: new RegExp(String.raw`Op ${DATE} vinden herindelingsverkiezingen plaats in de gemeenten ([^.]+)\.`),
  },
];

const MONTH_NUMBER = {
  januari: "01",
  februari: "02",
  maart: "03",
  april: "04",
  mei: "05",
  juni: "06",
  juli: "07",
  augustus: "08",
  september: "09",
  oktober: "10",
  november: "11",
  december: "12",
};

export function pageUrl(type) {
  return `${KIESRAAD_BASE}/${type.slug}`;
}

export function sourceDef(type) {
  return {
    id: `src:kiesraad-verkiezingen-${type.slug}`,
    url: pageUrl(type),
    title: `Kiesraad: ${type.label}`,
    publisher: "Kiesraad",
    type: "page",
    license: "CC0-1.0",
    notes: "Typepagina van de Kiesraad met de datum van de eerstvolgende verkiezing in één zin. Voor deze website geldt de Creative Commons zero-verklaring (CC0 1.0).",
  };
}

function textOf(html) {
  return visibleText(html).replace(/\n/g, " ").replace(/\s+/g, " ");
}

/**
 * Parse one page. Returns { records, gaps }: a record per recognised sentence
 * (kind "next" or "last"), a gap when the page matches nothing.
 */
export function parseElectionPage(type, html, { today, sourceId }) {
  const text = textOf(html);
  const records = [];
  const gaps = [];
  const ref = sourceRef(sourceId, today);
  const quote = (match) => match[0].trim();

  if (type.next) {
    const match = type.next.exec(text);
    if (match) {
      let date = type.id === "ep" ? null : parseDutchDate(match[1]);
      let used = match;
      if (type.nextDay) {
        const day = type.nextDay.exec(text);
        if (day) {
          date = parseDutchDate(day[1]);
          used = { 0: `${match[0]} ${day[0]}` };
        }
      }
      if (date) {
        records.push({
          id: `upcoming:${type.id}-${date}`,
          type: type.id,
          label: type.label,
          body: type.body,
          kind: "next",
          date,
          month: null,
          quote: quote(used),
          url: pageUrl(type),
          source: ref,
          ...(type.id === "her" ? { scope: match[2].trim() } : {}),
        });
      }
    }
  }
  if (type.nextMonth) {
    const match = type.nextMonth.exec(text);
    if (match && MONTH_NUMBER[match[1]]) {
      records.push({
        id: `upcoming:${type.id}-${match[2]}-${MONTH_NUMBER[match[1]]}`,
        type: type.id,
        label: type.label,
        body: type.body,
        kind: "next",
        date: null,
        month: `${match[2]}-${MONTH_NUMBER[match[1]]}`,
        quote: quote(match),
        url: pageUrl(type),
        source: ref,
      });
    }
  }
  if (type.last) {
    const match = type.last.exec(text);
    const date = match ? parseDutchDate(match[1]) : null;
    if (date) {
      records.push({
        id: `upcoming:${type.id}-last-${date}`,
        type: type.id,
        label: type.label,
        body: type.body,
        kind: "last",
        date,
        month: null,
        quote: quote(match),
        url: pageUrl(type),
        source: ref,
      });
    }
  }
  const expectsNext = Boolean(type.next || type.nextMonth);
  if (expectsNext && !records.some((record) => record.kind === "next")) {
    gaps.push(
      makeGap(
        `Verkiezingsdatum ${type.label}`,
        "de Kiesraad-pagina bevat de verwachte zin over de volgende verkiezing niet meer (andere formulering of andere paginaopbouw)",
        pageUrl(type),
        "Controleer de pagina en pas het patroon in pipelines/election-dates.mjs aan; tot die tijd blijft de vorige datum staan.",
      ),
    );
  }
  return { records, gaps };
}

/** Fetch all type pages (one request per second) and parse them. A failing page is a gap, not an error. */
export async function fetchElectionDates({ http, today, existingSources = [] }) {
  const records = [];
  const gaps = [];
  const sources = [];
  for (const type of ELECTION_TYPES) {
    const def = sourceDef(type);
    try {
      const html = await http.getText(pageUrl(type), { accept: "text/html" });
      const source = buildSourceRecord(def, existingSources, today);
      const parsed = parseElectionPage(type, html, { today, sourceId: source.id });
      if (parsed.records.length > 0) sources.push(source);
      records.push(...parsed.records);
      gaps.push(...parsed.gaps);
    } catch (error) {
      gaps.push(makeGap(`Verkiezingsdatum ${type.label}`, `pagina niet bereikbaar (${error.message})`, pageUrl(type), "De vorige datum blijft staan."));
    }
  }
  return { records, gaps, sources };
}

/**
 * Merge a fresh read into the previous one: a type whose page no longer parses keeps its
 * previous records (the gap says so); a type that parsed replaces its previous records.
 */
export function mergeElectionRecords(previous = [], fresh = [], gaps = []) {
  const failed = new Set(
    gaps
      .map((gap) => ELECTION_TYPES.find((type) => gap.what === `Verkiezingsdatum ${type.label}`)?.id)
      .filter(Boolean),
  );
  const parsedTypes = new Set(fresh.map((record) => record.type));
  const kept = previous.filter((record) => failed.has(record.type) || !parsedTypes.has(record.type));
  return [...kept, ...fresh].sort((a, b) => a.type.localeCompare(b.type) || String(a.date ?? a.month).localeCompare(String(b.date ?? b.month)) || a.kind.localeCompare(b.kind));
}

/**
 * Election days that count as events for the guards even before the results are in data/elections.json:
 * the date the Kiesraad page named (the last, or an announced one that has now passed).
 */
export function electionEventsFromState(items = [], today, windowDays = 60) {
  const events = [];
  for (const item of items) {
    if (!item || !item.date || !item.body) continue;
    if (item.date > today) continue;
    const age = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${item.date}T00:00:00Z`)) / 86_400_000);
    if (age >= 0 && age <= windowDays) events.push({ id: item.id, body: item.body, date: item.date });
  }
  return events;
}
