import { getDataset, getDatasetDate } from "./data";
import type {
  Change,
  ChangeKind,
  Organization,
  Person,
  Position,
  SourceRef,
  Tenure,
} from "./types";

export const CHANGE_WINDOWS = [7, 30, 90] as const;
export type ChangeWindow = (typeof CHANGE_WINDOWS)[number];

export type ChangeFilter = "all" | ChangeKind;

export type VacancySummary = {
  position: Position;
  organization: Organization | undefined;
  seats: number;
  open: number;
  vacant: number;
  source: SourceRef;
};

export type ActingOfficial = {
  tenure: Tenure;
  person: Person;
  position: Position;
  organization: Organization | undefined;
};

export type ChangeStats = {
  vacantSeats: number;
  actingOfficials: number;
  lastChangeDate: string | null;
  total: number;
  windowCounts: Record<ChangeWindow, number>;
};

export type TimelineBucket = {
  date: string;
  count: number;
};

export type ChangeGroup = {
  date: string;
  label: string;
  changes: Change[];
};

const dayMs = 86_400_000;

const weekdayFormat = new Intl.DateTimeFormat("nl-NL", { weekday: "long" });
const dayMonthFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long" });
const fullDateFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });

function toUtc(iso: string): number {
  return Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
}

export function daysBetween(later: string, earlier: string): number {
  return Math.round((toUtc(later) - toUtc(earlier)) / dayMs);
}

function shiftDate(iso: string, days: number): string {
  return new Date(toUtc(iso) + days * dayMs).toISOString().slice(0, 10);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getChangeReferenceDate(): string {
  const datasetDate = getDatasetDate();
  if (datasetDate) return datasetDate.slice(0, 10);
  const dates = getDataset()
    .changes.map((change) => change.date)
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : new Date().toISOString().slice(0, 10);
}

export function getAllChanges(): Change[] {
  return getDataset().changes;
}

export function isInWindow(date: string, days: number, reference: string): boolean {
  const offset = daysBetween(reference, date);
  return offset >= 0 && offset < days;
}

export function getWindowedChanges(days: number, reference = getChangeReferenceDate()): Change[] {
  return getAllChanges()
    .filter((change) => isInWindow(change.date, days, reference))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function filterChangesByKind(changes: Change[], filter: ChangeFilter): Change[] {
  if (filter === "all") return changes;
  return changes.filter((change) => change.kind === filter);
}

export function getWindowCounts(reference = getChangeReferenceDate()): Record<ChangeWindow, number> {
  const counts = { 7: 0, 30: 0, 90: 0 } as Record<ChangeWindow, number>;
  for (const window of CHANGE_WINDOWS) counts[window] = getWindowedChanges(window, reference).length;
  return counts;
}

export function getLastChangeDate(): string | null {
  const dates = getAllChanges().map((change) => change.date);
  if (dates.length === 0) return null;
  return dates.reduce((latest, date) => (date > latest ? date : latest));
}

export function getVacantSeats(): VacancySummary[] {
  const { positions, tenures, organizationsById } = getDataset();
  const openCount = new Map<string, number>();
  const trackedCount = new Map<string, number>();
  for (const tenure of tenures) {
    trackedCount.set(tenure.position, (trackedCount.get(tenure.position) ?? 0) + 1);
    if (tenure.end === null) openCount.set(tenure.position, (openCount.get(tenure.position) ?? 0) + 1);
  }

  const vacancies: VacancySummary[] = [];
  for (const position of positions) {
    if ((trackedCount.get(position.id) ?? 0) === 0) continue;
    const open = openCount.get(position.id) ?? 0;
    const seats = typeof position.seatsCount === "number" ? position.seatsCount : open > 0 ? open : 1;
    const vacant = Math.max(0, seats - open);
    if (vacant === 0) continue;
    const source = position.sources.find((ref) => ref && typeof ref.source === "string");
    if (!source) continue;
    vacancies.push({
      position,
      organization: organizationsById.get(position.organization),
      seats,
      open,
      vacant,
      source,
    });
  }

  return vacancies.sort((a, b) => b.vacant - a.vacant || a.position.title.localeCompare(b.position.title, "nl"));
}

export function getActingOfficials(): ActingOfficial[] {
  const { tenures, peopleById, positionsById, organizationsById } = getDataset();
  const seen = new Set<string>();
  const officials: ActingOfficial[] = [];
  for (const tenure of tenures) {
    if (!tenure.acting || tenure.end !== null) continue;
    const person = peopleById.get(tenure.person);
    const position = positionsById.get(tenure.position);
    if (!person || !position || seen.has(person.id)) continue;
    seen.add(person.id);
    officials.push({
      tenure,
      person,
      position,
      organization: organizationsById.get(position.organization),
    });
  }
  return officials.sort((a, b) => a.person.name.localeCompare(b.person.name, "nl"));
}

export function getChangeStats(reference = getChangeReferenceDate()): ChangeStats {
  const changes = getAllChanges();
  const vacancies = getVacantSeats();
  const officials = getActingOfficials();
  return {
    vacantSeats: vacancies.reduce((sum, vacancy) => sum + vacancy.vacant, 0),
    actingOfficials: officials.length,
    lastChangeDate: getLastChangeDate(),
    total: changes.length,
    windowCounts: getWindowCounts(reference),
  };
}

export function getTimeline(
  changes: Change[],
  days: number,
  reference = getChangeReferenceDate(),
): TimelineBucket[] {
  const counts = new Map<string, number>();
  for (const change of changes) counts.set(change.date, (counts.get(change.date) ?? 0) + 1);
  const buckets: TimelineBucket[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = shiftDate(reference, -offset);
    buckets.push({ date, count: counts.get(date) ?? 0 });
  }
  return buckets;
}

export function formatDayLabel(date: string, reference = getChangeReferenceDate()): string {
  const offset = daysBetween(reference, date);
  if (offset === 0) return "Vandaag";
  if (offset === 1) return "Gisteren";
  if (offset > 1 && offset < 7) return capitalize(weekdayFormat.format(new Date(toUtc(date))));
  if (date.slice(0, 4) === reference.slice(0, 4)) return dayMonthFormat.format(new Date(toUtc(date)));
  return fullDateFormat.format(new Date(toUtc(date)));
}

export function groupChangesByDay(
  changes: Change[],
  reference = getChangeReferenceDate(),
): ChangeGroup[] {
  const groups = new Map<string, Change[]>();
  for (const change of changes) {
    const list = groups.get(change.date);
    if (list) list.push(change);
    else groups.set(change.date, [change]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, label: formatDayLabel(date, reference), changes: items }));
}

export function changeAgeDays(date: string | null, reference = getChangeReferenceDate()): number | null {
  if (!date) return null;
  return Math.max(0, daysBetween(reference, date));
}
