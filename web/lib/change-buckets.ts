import { changeDisplayKind, getTimeline } from "./changes";
import { getPersonById, getPositionById } from "./data";
import { BAR_KINDS, type BarKind, type HistogramBucket } from "./change-bar-kinds";
import type { Change } from "./types";

const NAME_LIMIT = 3;

function barKind(change: Change): BarKind {
  switch (changeDisplayKind(change)) {
    case "appointment":
    case "acting":
      return "appointment";
    case "departure":
      return "departure";
    case "vacancy":
      return "vacancy";
    default:
      return "other";
  }
}

/** The name a change is about, or null when its records are missing. */
function changeName(change: Change): string | null {
  const kind = barKind(change);
  if (kind === "vacancy") return (change.position !== null ? getPositionById(change.position)?.title : null) ?? null;
  const personId = kind === "departure" ? change.out?.person : kind === "appointment" ? change.in?.person : null;
  return (personId ? getPersonById(personId)?.name : null) ?? null;
}

/**
 * One bucket per day of the window, oldest first, with the counts per kind
 * and the first names for the tooltip. Days without changes stay in, as
 * empty buckets.
 */
export function buildHistogramBuckets(changes: Change[], days: number, reference: string): HistogramBucket[] {
  const byDate = new Map<string, Change[]>();
  for (const change of changes) {
    const list = byDate.get(change.date);
    if (list) list.push(change);
    else byDate.set(change.date, [change]);
  }
  return getTimeline(changes, days, reference).map(({ date, count }) => {
    const byKind: Record<BarKind, number> = { appointment: 0, departure: 0, vacancy: 0, other: 0 };
    const names: string[] = [];
    for (const change of byDate.get(date) ?? []) {
      byKind[barKind(change)] += 1;
      const name = changeName(change);
      if (name !== null && !names.includes(name)) names.push(name);
    }
    return { date, count, byKind, names: names.slice(0, NAME_LIMIT), more: Math.max(0, names.length - NAME_LIMIT) };
  });
}
