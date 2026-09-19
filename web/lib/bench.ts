/**
 * The Kamers as benches on their ring.
 *
 * Article 51 of the Grondwet: the Staten-Generaal consist of the Tweede Kamer
 * and the Eerste Kamer. They are not a body above the two chambers, so the
 * canvas draws no mark for them: the sector's own arc is the seating, and each
 * chamber is one stretch of it. Seats sit in `rows` concentric rows and in
 * columns that run along the arc. A fractie takes a whole number of columns,
 * so every party group is one contiguous wedge with a straight edge, and two
 * chambers never blend into each other: they are separated by a gutter of
 * blank columns and carry their own labels.
 *
 * Everything here is pure and derived from the sector's arc, so a wider sector
 * gives bigger seats and the picture is the same on every run. The ∩ arch of
 * the first build stays on the chamber pages (`components/parliament`), where
 * there is room for it; on the canvas it fought the ring it sat in.
 */

import type { ChamberSeatEntry } from "./graph";

/** Rows of seats across the ring. Both chambers use the same rows, so they share their rings. */
export const BENCH_ROWS = 3;
/** Blank columns between two chambers on one ring. */
export const BENCH_GUTTER = 3;
/** Arc length of a column at the inner row: the width one seat gets. */
export const BENCH_MIN_COLUMN = 3.4;
export const BENCH_MAX_COLUMN = 6.5;
/** Radial room between the outermost seat row and the first ring packed outside it. */
export const BENCH_CLEARANCE = 10;

export type BenchPlan = { id: string; columns: number; total: number };

export type Bench = {
  /** Organization id of the chamber. */
  id: string;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  rows: number;
  columns: number;
  /** Angular width of one column, and the radial height of one row. */
  columnAngle: number;
  rowStep: number;
  seatRadius: number;
};

export type BenchSeat = {
  x: number;
  y: number;
  angle: number;
  radius: number;
  /** Index of the fractie block this seat belongs to. */
  block: number;
};

export type BenchBlock = {
  index: number;
  key: string | null;
  label: string;
  color: string | null;
  splinter: boolean;
  seats: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  columns: number;
};

/** Columns a chamber needs: every fractie takes whole columns, so its block never splits. */
export function benchColumns(entries: readonly ChamberSeatEntry[], rows = BENCH_ROWS): number {
  let columns = 0;
  for (const entry of entries) columns += Math.max(1, Math.ceil(entry.seats / rows));
  return columns;
}

export function benchPlans(
  chambers: readonly { id: string; entries: readonly ChamberSeatEntry[]; total: number }[],
  rows = BENCH_ROWS,
): BenchPlan[] {
  return chambers
    .map((chamber) => ({ id: chamber.id, columns: benchColumns(chamber.entries, rows), total: chamber.total }))
    // The larger chamber first, so the Tweede Kamer opens the sector's arc.
    .sort((a, b) => b.total - a.total || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Columns the whole bench needs, chambers and the gutters between them. */
export function benchTotalColumns(plans: readonly BenchPlan[]): number {
  if (plans.length === 0) return 0;
  return plans.reduce((sum, plan) => sum + plan.columns, 0) + BENCH_GUTTER * (plans.length - 1);
}

/** The arc a bench needs at a radius, at the narrowest column it may use. */
export function benchDemand(plans: readonly BenchPlan[], innerRadius: number): number {
  return (benchTotalColumns(plans) * BENCH_MIN_COLUMN) / Math.max(1, innerRadius);
}

/** How deep the bench is at a given column width. */
export function benchDepth(columnArc: number, rows = BENCH_ROWS): number {
  return rows * columnArc;
}

/**
 * Place the chambers on the sector's arc. Columns are the same width in every
 * chamber, so a seat means the same everywhere, and the whole bench is centred
 * in the arc when the columns hit their widest.
 */
export function layoutBenches(
  plans: readonly BenchPlan[],
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  rows = BENCH_ROWS,
): Bench[] {
  const total = benchTotalColumns(plans);
  if (plans.length === 0 || total === 0 || endAngle <= startAngle) return [];
  const span = endAngle - startAngle;
  const columnAngle = Math.min(span / total, BENCH_MAX_COLUMN / Math.max(1, innerRadius));
  const columnArc = columnAngle * innerRadius;
  const rowStep = columnArc;
  const outerRadius = innerRadius + benchDepth(columnArc, rows);
  const seatRadius = columnArc * 0.36;

  const benches: Bench[] = [];
  let cursor = startAngle + (span - total * columnAngle) / 2;
  for (const plan of plans) {
    const start = cursor;
    const end = start + plan.columns * columnAngle;
    benches.push({
      id: plan.id,
      startAngle: start,
      endAngle: end,
      midAngle: (start + end) / 2,
      innerRadius,
      outerRadius,
      rows,
      columns: plan.columns,
      columnAngle,
      rowStep,
      seatRadius,
    });
    cursor = end + BENCH_GUTTER * columnAngle;
  }
  return benches;
}

/**
 * The seats of one chamber and the fractie blocks they fall into. A fractie
 * fills its columns from the inside out; a column that is not full carries its
 * seats centred across the rows, so a one-seat fractie reads as one seat in the
 * middle of the band instead of a seat stuck against the inner ring.
 */
export function benchSeats(
  bench: Bench,
  entries: readonly ChamberSeatEntry[],
): { seats: BenchSeat[]; blocks: BenchBlock[] } {
  const seats: BenchSeat[] = [];
  const blocks: BenchBlock[] = [];
  let column = 0;
  entries.forEach((entry, index) => {
    const columns = Math.max(1, Math.ceil(entry.seats / bench.rows));
    const start = bench.startAngle + column * bench.columnAngle;
    const end = start + columns * bench.columnAngle;
    blocks.push({
      index,
      key: entry.key,
      label: entry.label,
      color: entry.color,
      splinter: entry.splinter,
      seats: entry.seats,
      startAngle: start,
      endAngle: end,
      midAngle: (start + end) / 2,
      columns,
    });
    let left = entry.seats;
    for (let c = 0; c < columns; c += 1) {
      const count = Math.min(bench.rows, left);
      const offset = (bench.rows - count) / 2;
      const angle = start + (c + 0.5) * bench.columnAngle;
      for (let k = 0; k < count; k += 1) {
        const radius = bench.innerRadius + (offset + k + 0.5) * bench.rowStep;
        seats.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          angle,
          radius,
          block: index,
        });
      }
      left -= count;
    }
    column += columns;
  });
  return { seats, blocks };
}
