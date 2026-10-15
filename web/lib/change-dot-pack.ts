import type { BarKind } from "./change-bar-kinds";
import { BAR_KINDS } from "./change-bar-kinds";
import type { ChangeFilterValue } from "./change-url-state";

/** Mark size. Pitch with `DOT_GAP_PX` must fit `STRIP_ROWS` into `STRIP_PX`. */
export const DOT_PX = 8;
export const DOT_GAP_PX = 2;
/** Chart height. 9 rows of 8 px dots with 2 px gaps is 88 px, plus a little air. */
export const STRIP_PX = 96;
export const STRIP_ROWS = 9;

/**
 * Pack a day's entries into columns that grow up from the baseline. Extra
 * columns open to the right; the renderer centres the cluster on the day.
 * One person's changes in one role are one mark, so a bulk day is a cluster
 * of people, not a bar that swallows the scale.
 */
export function packDayDots(byKind: Record<BarKind, number>, rows: number = STRIP_ROWS): BarKind[][] {
  const height = Math.max(1, rows);
  const columns: BarKind[][] = [];
  let i = 0;
  for (const kind of BAR_KINDS) {
    const n = byKind[kind] ?? 0;
    for (let k = 0; k < n; k += 1, i += 1) {
      const col = Math.floor(i / height);
      (columns[col] ??= []).push(kind);
    }
  }
  return columns;
}

/** Keep only the kind the legend has selected; `all` leaves the day intact. */
export function filterByKind(byKind: Record<BarKind, number>, kind: ChangeFilterValue): Record<BarKind, number> {
  if (kind === "all") return byKind;
  const next: Record<BarKind, number> = { appointment: 0, acting: 0, departure: 0, vacancy: 0, other: 0 };
  next[kind] = byKind[kind];
  return next;
}

export function packedCount(columns: readonly BarKind[][]): number {
  let n = 0;
  for (const col of columns) n += col.length;
  return n;
}
