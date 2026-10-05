import { countEntries, getTimeline, groupChangesIntoEntries, type FeedEntry } from "./changes";
import { getPersonById, getPositionById } from "./data";
import type { BarKind, HistogramBucket } from "./change-bar-kinds";
import type { Change } from "./types";

const NAME_LIMIT = 3;

function barKind(entry: FeedEntry): BarKind {
  switch (entry.displayKind) {
    case "appointment":
    case "acting":
    case "departure":
    case "vacancy":
      return entry.displayKind;
    default:
      return "other";
  }
}

/** The name an entry is about, or null when its records are missing. */
function entryName(entry: FeedEntry): string | null {
  if (entry.displayKind === "vacancy") {
    const position = entry.changes[0].position;
    return (position !== null ? getPositionById(position)?.title : null) ?? null;
  }
  return (entry.personId ? getPersonById(entry.personId)?.name : null) ?? null;
}

/**
 * One bucket per day of the window, oldest first, with the counts per kind
 * and the first names for the tooltip. Days without changes stay in, as
 * empty buckets. A person's changes of one day in one role count as one
 * entry for the bar, and as their real number in the text.
 */
export function buildHistogramBuckets(changes: Change[], days: number, reference: string): HistogramBucket[] {
  const byDate = new Map<string, FeedEntry[]>();
  for (const entry of groupChangesIntoEntries(changes)) {
    const list = byDate.get(entry.date);
    if (list) list.push(entry);
    else byDate.set(entry.date, [entry]);
  }
  return getTimeline(changes, days, reference).map(({ date }) => {
    const entries = byDate.get(date) ?? [];
    const byKind: Record<BarKind, number> = { appointment: 0, acting: 0, departure: 0, vacancy: 0, other: 0 };
    const changesByKind: Record<BarKind, number> = { appointment: 0, acting: 0, departure: 0, vacancy: 0, other: 0 };
    const names: string[] = [];
    for (const entry of entries) {
      byKind[barKind(entry)] += 1;
      changesByKind[barKind(entry)] += entry.changes.length;
      const name = entryName(entry);
      if (name !== null && !names.includes(name)) names.push(name);
    }
    const counts = countEntries(entries);
    return {
      date,
      count: entries.length,
      changes: counts.changes,
      people: counts.people,
      byKind,
      changesByKind,
      names: names.slice(0, NAME_LIMIT),
      more: Math.max(0, names.length - NAME_LIMIT),
    };
  });
}
