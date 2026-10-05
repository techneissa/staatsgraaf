import {
  getDataset,
  getOrganizationById,
  getPersonById,
  getPositionById,
  getTenuresForPerson,
} from "./data";
import { pick } from "./i18n/dicts";
import { DICTS } from "./i18n/dict-registry";
import { DEFAULT_LOCALE } from "./i18n/locales";
import type { NewsItem, Person, Position, Tenure } from "./types";

/** Server-side home string in the default (Dutch) locale, with {vars} support. */
export function getHomeString(
  key: string,
  vars?: Record<string, string | number>,
): string {
  return pick(DICTS.home, key, DEFAULT_LOCALE, vars);
}

export type Portrait = {
  url: string;
  credit: string;
  license: string;
};

export type FocusPerson = {
  person: Person;
  positionTitle: string | null;
  organizationName: string | null;
  startedAt: string | null;
  acting: boolean;
  portrait: Portrait | null;
};

export function getMediaPortrait(id: string | null): Portrait | null {
  if (id === null) return null;
  const item = getDataset().media.find((media) => media.id === id);
  if (!item) return null;
  return { url: item.url, credit: item.credit, license: item.license };
}

export function getHomeNews(limit = 6): NewsItem[] {
  return [...getDataset().news]
    .sort((a, b) => b.published.localeCompare(a.published))
    .slice(0, limit);
}

function focusRank(position: Position | undefined): number {
  if (!position) return 5;
  const title = position.title.toLowerCase();
  if (title.startsWith("minister")) return 0;
  if (title.includes("staatssecretaris")) return 1;
  if (position.type === "dept_head") return 2;
  if (position.type === "elected") return 3;
  return 4;
}

function buildFocusPerson(person: Person): FocusPerson {
  const tenures = getTenuresForPerson(person.id);
  const current = tenures.find((tenure) => tenure.end === null);
  const chosen = current ?? tenures[0];
  const position = chosen ? getPositionById(chosen.position) : undefined;
  const organization = position ? getOrganizationById(position.organization) : undefined;
  return {
    person,
    positionTitle: position?.title ?? null,
    organizationName: organization?.name ?? null,
    startedAt: chosen?.start ?? null,
    acting: chosen?.acting ?? false,
    portrait: getMediaPortrait(person.portrait),
  };
}

export function getFocusPeople(limit = 10): FocusPerson[] {
  const { news, tenures } = getDataset();
  const mentions = new Map<string, number>();
  for (const item of news) {
    for (const id of item.entities) {
      if (id.startsWith("person:")) mentions.set(id, (mentions.get(id) ?? 0) + 1);
    }
  }

  const result: FocusPerson[] = [];
  const seen = new Set<string>();

  if (mentions.size > 0) {
    const ranked = [...mentions.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    for (const [id] of ranked) {
      const person = getPersonById(id);
      if (!person || seen.has(person.id)) continue;
      seen.add(person.id);
      result.push(buildFocusPerson(person));
      if (result.length >= limit) return result;
    }
  }

  type Candidate = { tenure: Tenure; person: Person; position: Position | undefined };
  const candidates: Candidate[] = [];
  for (const tenure of tenures) {
    if (tenure.end !== null) continue;
    const person = getPersonById(tenure.person);
    if (!person) continue;
    candidates.push({ tenure, person, position: getPositionById(tenure.position) });
  }

  candidates.sort((a, b) => {
    const portraitA = a.person.portrait !== null ? 0 : 1;
    const portraitB = b.person.portrait !== null ? 0 : 1;
    return (
      portraitA - portraitB ||
      focusRank(a.position) - focusRank(b.position) ||
      (b.tenure.start ?? "").localeCompare(a.tenure.start ?? "")
    );
  });

  for (const candidate of candidates) {
    if (seen.has(candidate.person.id)) continue;
    seen.add(candidate.person.id);
    result.push(buildFocusPerson(candidate.person));
    if (result.length >= limit) break;
  }

  return result;
}

export function getSubOrganizationCount(): number {
  return getDataset().organizations.filter((organization) => organization.parent !== null).length;
}
