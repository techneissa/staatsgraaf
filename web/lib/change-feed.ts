/**
 * Pure helpers of the changes feed that run on the client as well as on the
 * server. Kept apart from lib/changes.ts, which reads the whole dataset, so a
 * client component can import them without the dataset. Free of React.
 */
import type { ChangeFilterValue } from "./change-url-state";
import type { ChangeDisplayKind } from "./changes";

/** True when a change shown as `kind` belongs under the filter chip `filter`. */
export function matchesChangeFilter(kind: ChangeDisplayKind, filter: ChangeFilterValue): boolean {
  return filter === "all" || kind === filter;
}

/** Page size of a long list: all when only a few would be hidden, otherwise the first `initial`. */
export function visibleLimit(total: number, initial = 10, slack = 3): number {
  return total <= initial + slack ? total : initial;
}

export type EntryCounts = { changes: number; people: number };

/** The changes in some feed items, and how many different people they are about. */
export function countItems(items: readonly { changes: number; personId: string | null }[]): EntryCounts {
  const people = new Set<string>();
  let changes = 0;
  for (const item of items) {
    changes += item.changes;
    if (item.personId !== null) people.add(item.personId);
  }
  return { changes, people: people.size };
}

export type ActingSort = "newest" | "name";

/**
 * Acting officials by start date, newest first (no date last), or by name.
 * `key` reads the start date and name of an item. Never mutates its input.
 */
export function sortActing<T>(
  items: readonly T[],
  sort: ActingSort,
  key: (item: T) => { start: string | null; name: string },
): T[] {
  const byName = (a: T, b: T) => key(a).name.localeCompare(key(b).name, "nl");
  return [...items].sort((a, b) => {
    if (sort === "name") return byName(a, b);
    const sa = key(a).start;
    const sb = key(b).start;
    if (sa !== sb) {
      if (sa === null) return 1;
      if (sb === null) return -1;
      return sb.localeCompare(sa);
    }
    return byName(a, b);
  });
}
