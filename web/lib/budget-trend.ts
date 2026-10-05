/**
 * Pure geometry for the spending-over-years line chart on the budget pages. No
 * dataset imports, so the client chart and the tests can use it.
 *
 * A series is one point per fiscal year. Closed years carry the realized
 * amount ("actual"), the years after them the budgeted amount ("budget"); the
 * chart draws the first as a solid line and the second as a dashed one, so the
 * difference never rests on colour. A missing year is a gap in the line, never
 * a zero.
 */

export type TrendMeasure = "actual" | "budget";

export type TrendPoint = {
  year: number;
  /** Euros, or null when the source has no figure for that year. */
  value: number | null;
  measure: TrendMeasure;
};

export type TrendSeries = {
  id: string;
  /** Ministry slug, or null for the combined total. */
  slug: string | null;
  /** Canonical Dutch name, or null for the combined total. */
  name: string | null;
  points: TrendPoint[];
};

/**
 * The combined series of several ministries. A year is only summed when every
 * ministry has a figure for it, so a missing ministry never reads as a drop;
 * leading years before that point are left out. Returns the points and the
 * ids of the series that start later than the first year any of them has.
 */
export function sumTrends(series: { id: string; points: TrendPoint[] }[]): {
  points: TrendPoint[];
  lateStarters: { id: string; from: number }[];
} {
  const years = [...new Set(series.flatMap((entry) => entry.points.filter((p) => p.value !== null).map((p) => p.year)))].sort(
    (a, b) => a - b,
  );
  const valueAt = (entry: { points: TrendPoint[] }, year: number) => entry.points.find((p) => p.year === year) ?? null;
  const complete = years.filter((year) => series.every((entry) => valueAt(entry, year)?.value != null));
  const first = complete[0];
  const points: TrendPoint[] = [];
  if (first !== undefined) {
    for (const year of years.filter((y) => y >= first)) {
      if (!complete.includes(year)) {
        points.push({ year, value: null, measure: "actual" });
        continue;
      }
      const parts = series.map((entry) => valueAt(entry, year)!);
      points.push({
        year,
        value: parts.reduce((sum, p) => sum + (p.value as number), 0),
        measure: parts.every((p) => p.measure === "actual") ? "actual" : "budget",
      });
    }
  }
  const earliest = years[0];
  const lateStarters = series
    .map((entry) => ({ id: entry.id, from: entry.points.find((p) => p.value !== null)?.year ?? Infinity }))
    .filter((entry) => earliest !== undefined && entry.from > earliest && Number.isFinite(entry.from));
  return { points, lateStarters };
}

/** The smallest round value (1, 2, 2.5, 5 times a power of ten) at or above `value`. */
export function niceCeil(value: number): number {
  if (!(value > 0) || !Number.isFinite(value)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const fraction = value / power;
  const step = [1, 2, 2.5, 5, 10].find((candidate) => fraction <= candidate + 1e-9) ?? 10;
  return step * power;
}

/** Gridline values from zero up to a round top at or above `max`: three to five lines. */
export function trendTicks(max: number): number[] {
  if (!(max > 0) || !Number.isFinite(max)) return [0, 1];
  const step = niceCeil(max / 3);
  const ticks: number[] = [];
  for (let value = 0; value < max + step * 1e-9; value += step) ticks.push(Math.round(value * 1e6) / 1e6);
  if (ticks[ticks.length - 1] < max) ticks.push(Math.round((ticks[ticks.length - 1] + step) * 1e6) / 1e6);
  return ticks;
}

export type TrendPlotPoint = { year: number; x: number; y: number; value: number; measure: TrendMeasure };

export type TrendLayout = {
  years: number[];
  top: number;
  ticks: { value: number; y: number }[];
  plotted: TrendPlotPoint[];
  /** SVG path data of the realized stretch, possibly several subpaths. */
  actualPath: string;
  /** SVG path data of the budgeted stretch; it starts at the last realized point so the line stays joined. */
  budgetPath: string;
  /** X of the boundary between the last realized and the first budgeted year, or null without both. */
  budgetFrom: number | null;
  left: number;
  right: number;
  topY: number;
  bottomY: number;
  x: (year: number) => number;
};

const fmt = (value: number) => Math.round(value * 10) / 10;

/**
 * Place a series in a box. The value axis starts at zero (the lengths of a
 * spending series carry meaning) and ends at a round top; the year axis spans
 * the first to the last year of the series.
 */
export function trendLayout({
  points,
  width,
  height,
  padLeft = 44,
  padRight = 12,
  padTop = 10,
  padBottom = 24,
  topOverride,
}: {
  points: TrendPoint[];
  width: number;
  height: number;
  padLeft?: number;
  padRight?: number;
  padTop?: number;
  padBottom?: number;
  /** Fix the top of the value axis, so two charts can share one scale. */
  topOverride?: number;
}): TrendLayout {
  const years = points.map((point) => point.year);
  const firstYear = years[0] ?? 0;
  const lastYear = years[years.length - 1] ?? firstYear;
  const values = points.map((point) => point.value).filter((value): value is number => value !== null);
  const max = Math.max(0, ...values);
  const ticksRaw = trendTicks(topOverride ?? max);
  const top = ticksRaw[ticksRaw.length - 1];
  const left = padLeft;
  const right = width - padRight;
  const topY = padTop;
  const bottomY = height - padBottom;
  const span = Math.max(1, lastYear - firstYear);
  const x = (year: number) => (years.length <= 1 ? (left + right) / 2 : left + ((year - firstYear) / span) * (right - left));
  const y = (value: number) => bottomY - (top > 0 ? value / top : 0) * (bottomY - topY);

  const plotted: TrendPlotPoint[] = points.flatMap((point) =>
    point.value === null ? [] : [{ year: point.year, x: x(point.year), y: y(point.value), value: point.value, measure: point.measure }],
  );

  const run = (measure: TrendMeasure) => {
    const parts: string[] = [];
    let open = false;
    let previous: TrendPoint | null = null;
    for (const point of points) {
      if (point.value === null) {
        open = false;
        previous = point;
        continue;
      }
      if (point.measure === measure) {
        if (!open) {
          // Join the dashed stretch to the solid one it continues.
          const join: TrendPoint | null = previous;
          if (measure === "budget" && join && join.value !== null && join.measure === "actual") {
            parts.push(`M${fmt(x(join.year))} ${fmt(y(join.value))}L${fmt(x(point.year))} ${fmt(y(point.value))}`);
          } else {
            parts.push(`M${fmt(x(point.year))} ${fmt(y(point.value))}`);
          }
          open = true;
        } else {
          parts.push(`L${fmt(x(point.year))} ${fmt(y(point.value))}`);
        }
      } else {
        open = false;
      }
      previous = point;
    }
    return parts.join("");
  };

  const firstBudget = plotted.find((point) => point.measure === "budget");
  const hasActual = plotted.some((point) => point.measure === "actual");

  return {
    years,
    top,
    ticks: ticksRaw.map((value) => ({ value, y: y(value) })),
    plotted,
    actualPath: run("actual"),
    budgetPath: run("budget"),
    budgetFrom: firstBudget && hasActual ? firstBudget.x : null,
    left,
    right,
    topY,
    bottomY,
    x,
  };
}

/** The plotted point nearest to a horizontal position, or null for an empty series. */
export function nearestPoint(plotted: TrendPlotPoint[], x: number): TrendPlotPoint | null {
  let best: TrendPlotPoint | null = null;
  for (const point of plotted) {
    if (best === null || Math.abs(point.x - x) < Math.abs(best.x - x)) best = point;
  }
  return best;
}
