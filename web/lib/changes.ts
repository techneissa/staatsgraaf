import { amsterdamDay, resolveReferenceDay } from "./change-clock";
import type { ChangeFilterValue } from "./change-url-state";
import { countItems, sortActing, type EntryCounts } from "./change-feed";
import { getDataset, getDatasetDate, getPersonById } from "./data";
import type {
  Change,
  Organization,
  Person,
  Position,
  SourceRef,
  Tenure,
} from "./types";

export const CHANGE_WINDOWS = [7, 30, 90] as const;
export type ChangeWindow = (typeof CHANGE_WINDOWS)[number];

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

/**
 * The day every relative figure counts from: the day of the build (the site is
 * rebuilt every four hours), not the dataset snapshot. `now` is a parameter so
 * a test can fix the clock.
 */
export function getChangeReferenceDate(now: Date = new Date()): string {
  return resolveReferenceDay(amsterdamDay(now), getLastChangeDate());
}

/** The date of the dataset snapshot, shown quietly as "Gegevens per". Null when the dataset has none. */
export function getSnapshotDate(): string | null {
  return getDatasetDate()?.slice(0, 10) ?? null;
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
  return sortActing(officials, "newest", actingKey);
}

function actingKey(official: ActingOfficial): { start: string | null; name: string } {
  return { start: official.tenure.start, name: official.person.name };
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

/**
 * How a change reads on screen. Acting is an appointment whose tenure is
 * acting; rename and move fold into structural for the glyph and colour but
 * keep their own label.
 */
export type ChangeDisplayKind =
  | "appointment"
  | "acting"
  | "departure"
  | "vacancy"
  | "structural"
  | "rename"
  | "move"
  | "relation";

let tenureIndex: Map<string, Tenure> | null = null;

function tenureById(id: string): Tenure | undefined {
  if (tenureIndex === null) tenureIndex = new Map(getDataset().tenures.map((tenure) => [tenure.id, tenure]));
  return tenureIndex.get(id);
}

/** True when the tenure behind a change side is an acting (waarnemend) tenure. */
export function isActingTenure(id: string | null | undefined): boolean {
  if (!id) return false;
  const tenure = tenureById(id);
  if (!tenure) return false;
  return tenure.acting === true || tenure.entryMode === "waarnemend";
}

export function changeDisplayKind(change: Change): ChangeDisplayKind {
  switch (change.kind) {
    case "appointment":
      return isActingTenure(change.in?.tenure) ? "acting" : "appointment";
    case "tenure-between":
      return "relation";
    default:
      return change.kind;
  }
}

const BODY_PREFIX =
  /^(gemeente|provincie|ministerie van|waterschap|hoogheemraadschap van|hoogheemraadschap|openbaar lichaam|regering van|het|de)\s+/;

function normalizeName(value: string): string {
  return value.toLocaleLowerCase("nl").replace(/\s+/g, " ").trim();
}

/**
 * True when a position title already names its body, so a sentence does not
 * say "Burgemeester van Eemnes bij Gemeente Eemnes".
 */
export function titleNamesBody(title: string, bodyName: string): boolean {
  const titleNorm = normalizeName(title);
  let body = normalizeName(bodyName);
  if (body.length === 0) return true;
  if (titleNorm.includes(body)) return true;
  for (let pass = 0; pass < 2; pass += 1) body = body.replace(BODY_PREFIX, "");
  return body.length >= 3 && titleNorm.includes(body);
}

/**
 * The seat counts of a vacancy, read from the fixed labels the change pipeline
 * writes ("4 van 5 zetels vervuld", "1 vacante zetel"). Null when the labels
 * do not follow that pattern, so the caller shows nothing rather than a guess.
 */
export function vacancySeatCounts(change: Change): { filled: number; seats: number; vacant: number } | null {
  if (change.kind !== "vacancy") return null;
  const before = /^(\d+) van (\d+) zetels? vervuld$/.exec(change.out?.label?.trim() ?? "");
  if (before === null) return null;
  const filled = Number(before[1]);
  const seats = Number(before[2]);
  if (!Number.isFinite(filled) || !Number.isFinite(seats) || seats < filled) return null;
  return { filled, seats, vacant: seats - filled };
}

/**
 * One line of the feed: a single change, or every change one person got on one
 * day in the same role (a bulk import of committee seats), which reads as one
 * entry that expands to its changes.
 */
export type FeedEntry = {
  key: string;
  date: string;
  displayKind: ChangeDisplayKind;
  /** The person the entry is about; null for a vacancy or a structural change. */
  personId: string | null;
  /** Newest first, as given. One change for a single entry. */
  changes: Change[];
};

function subjectPersonId(change: Change, kind: ChangeDisplayKind): string | null {
  if (kind === "departure") return change.out?.person ?? null;
  if (kind === "appointment" || kind === "acting") return change.in?.person ?? null;
  return null;
}

/**
 * Folds the changes of one person on one day, in the same role (appointment,
 * acting or departure), into one entry. Everything else stays a single entry.
 * The order of the input is kept: an entry sits where its first change was.
 */
export function groupChangesIntoEntries(changes: readonly Change[]): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const bundles = new Map<string, FeedEntry>();
  for (const change of changes) {
    const displayKind = changeDisplayKind(change);
    const personId = subjectPersonId(change, displayKind);
    if (personId === null) {
      entries.push({ key: change.id, date: change.date, displayKind, personId, changes: [change] });
      continue;
    }
    const key = `${change.date}|${personId}|${displayKind}`;
    const existing = bundles.get(key);
    if (existing) {
      existing.changes.push(change);
      continue;
    }
    const entry: FeedEntry = { key: change.id, date: change.date, displayKind, personId, changes: [change] };
    bundles.set(key, entry);
    entries.push(entry);
  }
  return entries;
}

/** The underlying changes in some entries, and how many different people they are about. */
export function countEntries(entries: readonly FeedEntry[]): EntryCounts {
  return countItems(entries.map((entry) => ({ changes: entry.changes.length, personId: entry.personId })));
}

/**
 * Changes per chip, for one window: every chip counts the changes shown under
 * its own label, so a chip, the caption and the list always agree.
 */
export function countChangesByFilter(entries: readonly FeedEntry[]): Record<ChangeFilterValue, number> {
  const counts: Record<ChangeFilterValue, number> = { all: 0, appointment: 0, acting: 0, departure: 0, vacancy: 0 };
  for (const entry of entries) {
    counts.all += entry.changes.length;
    if (entry.displayKind === "appointment" || entry.displayKind === "acting" || entry.displayKind === "departure" || entry.displayKind === "vacancy") {
      counts[entry.displayKind] += entry.changes.length;
    }
  }
  return counts;
}

export type EntryDay = { date: string; entries: FeedEntry[] };

/** Entries per day, newest day first; entries keep their order within a day. */
export function groupEntriesByDay(entries: readonly FeedEntry[]): EntryDay[] {
  const days = new Map<string, FeedEntry[]>();
  for (const entry of entries) {
    const list = days.get(entry.date);
    if (list) list.push(entry);
    else days.set(entry.date, [entry]);
  }
  return [...days.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, list]) => ({ date, entries: list }));
}

/** The newest `limit` entries, whatever their age, with bundles kept whole. */
export function getNewestEntries(limit: number): FeedEntry[] {
  const newest = [...getAllChanges()].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  return groupChangesIntoEntries(newest).slice(0, limit);
}

export type PersonChangeGroup = {
  key: string;
  kind: "person" | "seat";
  personId: string | null;
  positionId: string | null;
  /** Newest first. */
  events: Change[];
};

function newestFirst(a: Change, b: Change): number {
  return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
}

/**
 * Groups changes by the person they are about (in or out), newest event first.
 * A change whose people do not resolve in the dataset, or that has none (a
 * vacancy), goes to a seat group keyed by its position; with no position it
 * gets a group of its own keyed `unknown:<change id>`. A handover between two
 * people appears under both. Groups sort by their newest event.
 */
export function groupChangesByPerson(changes: Change[]): PersonChangeGroup[] {
  const groups = new Map<string, PersonChangeGroup>();
  const add = (key: string, group: Omit<PersonChangeGroup, "key" | "events">, change: Change) => {
    const existing = groups.get(key);
    if (existing) existing.events.push(change);
    else groups.set(key, { key, ...group, events: [change] });
  };
  for (const change of changes) {
    const ids = new Set<string>();
    for (const id of [change.in?.person, change.out?.person]) {
      if (id && getPersonById(id)) ids.add(id);
    }
    if (ids.size > 0) {
      for (const id of ids) add(`person:${id}`, { kind: "person", personId: id, positionId: change.position }, change);
    } else if (change.position) {
      add(`seat:${change.position}`, { kind: "seat", personId: null, positionId: change.position }, change);
    } else {
      add(`unknown:${change.id}`, { kind: "seat", personId: null, positionId: null }, change);
    }
  }
  const result = [...groups.values()];
  for (const group of result) group.events.sort(newestFirst);
  return result.sort((a, b) => newestFirst(a.events[0], b.events[0]));
}

/**
 * The appointment that fills a vacant seat, only when the data holds one: the
 * earliest appointment to the same position dated after the seat's earliest
 * vacancy record, taken from the person groups. Null otherwise; nothing is
 * inferred from seat counts.
 */
export function findSeatFiller(seat: PersonChangeGroup, groups: PersonChangeGroup[]): Change | null {
  if (seat.kind !== "seat" || seat.positionId === null) return null;
  const vacancyDates = seat.events.filter((event) => event.kind === "vacancy").map((event) => event.date);
  if (vacancyDates.length === 0) return null;
  const since = vacancyDates.reduce((earliest, date) => (date < earliest ? date : earliest));
  let filler: Change | null = null;
  for (const group of groups) {
    if (group.kind !== "person") continue;
    for (const event of group.events) {
      if (event.kind !== "appointment" || event.position !== seat.positionId) continue;
      if (!event.in?.person || event.date <= since) continue;
      if (filler === null || event.date < filler.date) filler = event;
    }
  }
  return filler;
}
