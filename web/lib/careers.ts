import { getOrganizationById, getSourceById, readOptionalDataFile } from "./data";
import type { CareerEntry, CareerKind } from "./types";

/**
 * A person's career from data/careers.json: political posts, jobs, side
 * positions and education, each with a source. A missing file means no
 * career section, never a build failure.
 */

/** Occupations (beroep) come first: they render as a row of tags, not as steps. */
export const CAREER_KINDS: CareerKind[] = ["beroep", "politiek", "loopbaan", "nevenfunctie", "opleiding"];

export type CareerSourceView = { url: string; publisher: string; retrieved: string | null };

export type CareerItemView = {
  id: string;
  title: string;
  organization: string | null;
  /** Set only when the organisation exists in the dataset, so the link resolves. */
  organizationId: string | null;
  kind: CareerKind;
  current: boolean;
  years: { nl: string; en: string } | null;
  source: CareerSourceView | null;
  sortKey: string;
};

export type CareerGroupView = { kind: CareerKind; items: CareerItemView[] };

let byPerson: Map<string, CareerEntry[]> | null = null;

function index(): Map<string, CareerEntry[]> {
  if (byPerson) return byPerson;
  byPerson = new Map();
  for (const entry of readOptionalDataFile<CareerEntry>("careers.json")) {
    if (!entry || typeof entry.person !== "string" || typeof entry.title !== "string" || entry.title.trim() === "") continue;
    if (!CAREER_KINDS.includes(entry.kind)) continue;
    const list = byPerson.get(entry.person);
    if (list) list.push(entry);
    else byPerson.set(entry.person, [entry]);
  }
  return byPerson;
}

function year(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})/.exec(value);
  return match ? match[1] : null;
}

/** "2017 – 2021", "sinds 2023", "2019", "tot 2021", in both languages. */
export function careerYears(
  start: string | null | undefined,
  end: string | null | undefined,
  current: boolean,
): { nl: string; en: string } | null {
  const from = year(start);
  const to = year(end);
  if (from !== null && to !== null) {
    const text = from === to ? from : `${from} – ${to}`;
    return { nl: text, en: text };
  }
  if (from !== null) {
    return current ? { nl: `sinds ${from}`, en: `since ${from}` } : { nl: from, en: from };
  }
  if (to !== null) return { nl: `tot ${to}`, en: `until ${to}` };
  return current ? { nl: "nu", en: "now" } : null;
}

function resolveSource(source: CareerEntry["source"], fallbackRetrieved: string | null): CareerSourceView | null {
  if (source === null || source === undefined) return null;
  if (typeof source === "string") {
    if (/^https?:\/\//.test(source)) {
      let host = source;
      try {
        host = new URL(source).hostname.replace(/^www\./, "");
      } catch {
        /* keep the raw URL */
      }
      return { url: source, publisher: host, retrieved: fallbackRetrieved };
    }
    const record = getSourceById(source);
    return record ? { url: record.url, publisher: record.publisher, retrieved: record.retrieved } : null;
  }
  if ("source" in source && typeof source.source === "string") {
    const record = getSourceById(source.source);
    return record ? { url: record.url, publisher: record.publisher, retrieved: source.retrieved ?? record.retrieved } : null;
  }
  if ("url" in source && typeof source.url === "string") {
    const publisher = source.publisher ?? source.title ?? source.url;
    return { url: source.url, publisher, retrieved: source.retrieved ?? null };
  }
  return null;
}

/** The career of a person grouped by kind, newest first; empty when nothing is on record. */
export function getCareerForPerson(personId: string): CareerGroupView[] {
  const entries = index().get(personId) ?? [];
  const groups = new Map<CareerKind, CareerItemView[]>();
  for (const entry of entries) {
    const current = entry.current === true;
    const organizationId =
      typeof entry.organizationId === "string" && getOrganizationById(entry.organizationId) !== undefined
        ? entry.organizationId
        : null;
    const item: CareerItemView = {
      id: typeof entry.id === "string" ? entry.id : `${entry.person}-${entry.kind}-${entry.title}`,
      title: entry.title.trim(),
      organization: typeof entry.organization === "string" && entry.organization.trim() !== "" ? entry.organization.trim() : null,
      organizationId,
      kind: entry.kind,
      current,
      years: careerYears(entry.start, entry.end, current),
      source: resolveSource(entry.source ?? null, null),
      // Dated entries first (current, then the latest end and start); entries
      // with no dates at all go last in their group.
      sortKey:
        entry.start == null && entry.end == null && !current
          ? "!"
          : `${current ? "1" : "0"}${entry.end ?? "9999"}${entry.start ?? "0000"}`,
    };
    const list = groups.get(entry.kind);
    if (list) list.push(item);
    else groups.set(entry.kind, [item]);
  }
  return CAREER_KINDS.filter((kind) => groups.has(kind)).map((kind) => ({
    kind,
    items: (groups.get(kind) ?? []).sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0)),
  }));
}
