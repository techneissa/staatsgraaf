/**
 * The clock of the changes pages. The site is a static export rebuilt every
 * four hours, so "today" is the day of the build, not the day of the dataset
 * snapshot (which is fixed until the data pipeline runs again). Every function
 * takes its inputs as parameters so a test can fix the clock; this file
 * imports nothing from the data layer.
 */

const DAY_MS = 86_400_000;

/** The calendar day of `now` in Nederland, as YYYY-MM-DD. */
export function amsterdamDay(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

/**
 * The day relative figures count from. The build day, unless a change is dated
 * later than that (a clock that runs behind), so no change ever lies in the
 * future.
 */
export function resolveReferenceDay(buildDay: string, newestChange: string | null): string {
  return newestChange !== null && newestChange > buildDay ? newestChange : buildDay;
}

export function daysBetweenDays(later: string, earlier: string): number {
  return Math.round(
    (Date.parse(`${later.slice(0, 10)}T00:00:00Z`) - Date.parse(`${earlier.slice(0, 10)}T00:00:00Z`)) / DAY_MS,
  );
}

export type Recency = {
  date: string;
  /** Whole days from the newest change to the reference day. */
  age: number;
  /** The smallest window that holds the newest change, or null when none of them does. */
  window: number | null;
};

/** How long ago the newest change is, and which window first shows it. Null without changes. */
export function describeRecency(
  newestChange: string | null,
  reference: string,
  windows: readonly number[],
): Recency | null {
  if (newestChange === null) return null;
  const age = Math.max(0, daysBetweenDays(reference, newestChange));
  const window = [...windows].sort((a, b) => a - b).find((days) => age < days) ?? null;
  return { date: newestChange.slice(0, 10), age, window };
}

/** The dictionary key and variables for "today", "yesterday" or "N days ago". */
export function agoPhrase(age: number): { key: "chgAgoToday" | "chgAgoYesterday" | "chgAgo"; vars?: { n: number } } {
  if (age <= 0) return { key: "chgAgoToday" };
  if (age === 1) return { key: "chgAgoYesterday" };
  return { key: "chgAgo", vars: { n: age } };
}
