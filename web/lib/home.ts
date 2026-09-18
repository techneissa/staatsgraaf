import {
  getDataset,
  getDatasetDate,
  getOrganizationById,
  getPersonById,
  getPositionById,
  getTenuresForPerson,
} from "./data";
import { formatDate } from "./format";
import type { Change, NewsItem, Person, Position, Tenure } from "./types";

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

export type DailyBucket = {
  date: string;
  count: number;
  label: string | null;
};

export type ChangeDayGroup = {
  date: string;
  label: string;
  changes: Change[];
};

export type ChangeWindowKey = "7d" | "30d" | "90d";

export type ChangeWindow = {
  key: ChangeWindowKey;
  days: number;
  ready: boolean;
  count: number;
  since: string | null;
  buckets: DailyBucket[];
  groups: ChangeDayGroup[];
};

export type HomeChangeStats = {
  vacantSeats: number | null;
  actingOfficials: number;
  lastChangeDate: string | null;
};

const DAY_MS = 86_400_000;

const WINDOW_DEFS: { key: ChangeWindowKey; days: number }[] = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
];

function utc(iso: string): number {
  return Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
}

function addDays(iso: string, amount: number): string {
  return new Date(utc(iso) + amount * DAY_MS).toISOString().slice(0, 10);
}

export function differenceInDays(later: string, earlier: string): number {
  return Math.round((utc(later) - utc(earlier)) / DAY_MS);
}

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
      b.tenure.start.localeCompare(a.tenure.start)
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

export function getChangeStats(): HomeChangeStats {
  const { changes, tenures } = getDataset();
  const actingOfficials = tenures.filter(
    (tenure) => tenure.end === null && tenure.acting,
  ).length;

  let lastChangeDate: string | null = null;
  for (const change of changes) {
    if (lastChangeDate === null || change.date > lastChangeDate) lastChangeDate = change.date;
  }

  let vacantSeats: number | null = null;
  if (changes.length > 0) {
    const latestByPosition = new Map<string, Change>();
    for (const change of changes) {
      if (change.position === null) continue;
      const existing = latestByPosition.get(change.position);
      if (
        existing === undefined ||
        change.date > existing.date ||
        (change.date === existing.date && change.id > existing.id)
      ) {
        latestByPosition.set(change.position, change);
      }
    }
    vacantSeats = 0;
    for (const change of latestByPosition.values()) {
      if (change.kind === "vacancy") vacantSeats += 1;
    }
  }

  return { vacantSeats, actingOfficials, lastChangeDate };
}

function dayLabel(date: string, until: string): string {
  const diff = differenceInDays(until, date);
  if (diff === 0) return "Vandaag";
  if (diff === 1) return "Gisteren";
  return formatDate(date);
}

function buildChangeWindow(
  key: ChangeWindowKey,
  days: number,
  changes: Change[],
  until: string | null,
): ChangeWindow {
  if (until === null || changes.length === 0) {
    return { key, days, ready: false, count: 0, since: null, buckets: [], groups: [] };
  }

  const since = addDays(until, -(days - 1));
  const inWindow = changes
    .filter((change) => change.date >= since && change.date <= until)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const countByDate = new Map<string, number>();
  for (const change of inWindow) {
    countByDate.set(change.date, (countByDate.get(change.date) ?? 0) + 1);
  }

  const step = days <= 7 ? days : days <= 30 ? 10 : 15;
  const buckets: DailyBucket[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = addDays(since, index);
    const remaining = days - 1 - index;
    let label: string | null = null;
    if (index === 0) label = `${days}d`;
    else if (index === days - 1) label = "vandaag";
    else if (remaining % step === 0) label = `${remaining}d`;
    buckets.push({ date, count: countByDate.get(date) ?? 0, label });
  }

  const groupMap = new Map<string, Change[]>();
  for (const change of inWindow) {
    const list = groupMap.get(change.date);
    if (list) list.push(change);
    else groupMap.set(change.date, [change]);
  }
  const groups: ChangeDayGroup[] = [...groupMap.entries()].map(([date, dayChanges]) => ({
    date,
    label: dayLabel(date, until),
    changes: dayChanges,
  }));

  return { key, days, ready: true, count: inWindow.length, since, buckets, groups };
}

export function getChangeWindows(): ChangeWindow[] {
  const { changes } = getDataset();
  const datasetDate = getDatasetDate();
  const changeDates = changes.map((change) => change.date).sort();
  const latestChange = changeDates.length > 0 ? changeDates[changeDates.length - 1] : null;
  const until = datasetDate ?? latestChange;

  return WINDOW_DEFS.map(({ key, days }) => buildChangeWindow(key, days, changes, until));
}

export function getSubOrganizationCount(): number {
  return getDataset().organizations.filter((organization) => organization.parent !== null).length;
}
