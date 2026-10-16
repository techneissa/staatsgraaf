/**
 * Geometry for the party seat history chart: coordinates, label side
 * (above or below the point) and text anchors so digits stay off the line.
 * Vertical scale follows the series min and max, so a party that stays
 * around a few seats does not leave an empty band down to zero.
 */

export type SparklinePoint = {
  date: string;
  seats: number;
  total: number;
};

export const SPARK_WIDTH = 480;
export const SPARK_HEIGHT = 112;
export const SPARK_PAD_X = 28;
export const SPARK_PAD_TOP = 30;
export const SPARK_PAD_BOTTOM = 38;
/** Baseline offset above a point, in viewBox units. */
export const SPARK_LABEL_UP = 20;
/** Baseline offset below a point, in viewBox units. */
export const SPARK_LABEL_DOWN = 24;
/** Flip the next flat label when two points sit closer than this. */
const CLOSE_DX = 22;
/** Neighbour must differ by more than this to count as a peak or valley. */
const EXTREME_DY = 8;

export type SparklinePlot = {
  xs: number[];
  ys: number[];
  labelYs: number[];
  path: string;
  /** "up" draws the digit above the point, "down" below it. */
  sides: ("up" | "down")[];
  anchors: ("start" | "middle" | "end")[];
};

export function sparklinePlot(points: SparklinePoint[]): SparklinePlot {
  const seats = points.map((point) => point.seats);
  const hi = Math.max(...seats);
  const lo = Math.min(...seats);
  const range = Math.max(1, hi - lo);
  const first = Date.parse(points[0].date);
  const last = Date.parse(points[points.length - 1].date);
  const span = Math.max(1, last - first);
  const plotH = SPARK_HEIGHT - SPARK_PAD_TOP - SPARK_PAD_BOTTOM;
  const plotW = SPARK_WIDTH - 2 * SPARK_PAD_X;
  const midY = SPARK_PAD_TOP + plotH * 0.45;
  const xs = points.map((point) => SPARK_PAD_X + ((Date.parse(point.date) - first) / span) * plotW);
  const ys = points.map((point) => SPARK_PAD_TOP + ((hi - point.seats) / range) * plotH);
  const sides: ("up" | "down")[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const y = ys[index];
    const prev = ys[index - 1] ?? y;
    const next = ys[index + 1] ?? y;
    const isPeak = y < prev - EXTREME_DY && y < next - EXTREME_DY;
    const isValley = y > prev + EXTREME_DY && y > next + EXTREME_DY;
    let side: "up" | "down";
    let locked = false;
    if (isValley) {
      // Sit under the V, not inside it on the stroke.
      side = "down";
      locked = true;
    } else if (isPeak && y <= SPARK_PAD_TOP + 2) {
      // A peak at the top of the box has no room above.
      side = "down";
      locked = true;
    } else if (isPeak) {
      side = "up";
    } else {
      side = y < midY ? "down" : "up";
    }
    if (
      !locked &&
      index > 0 &&
      Math.abs(xs[index] - xs[index - 1]) < CLOSE_DX &&
      sides[index - 1] === side
    ) {
      side = side === "up" ? "down" : "up";
    }
    sides.push(side);
  }
  const lastIndex = points.length - 1;
  const anchors = points.map((_, index) => (index === 0 ? "start" : index === lastIndex ? "end" : "middle") as "start" | "middle" | "end");
  const labelYs = ys.map((y, index) => (sides[index] === "up" ? y - SPARK_LABEL_UP : y + SPARK_LABEL_DOWN));
  const path = points.map((_, index) => `${index === 0 ? "M" : "L"} ${xs[index].toFixed(1)} ${ys[index].toFixed(1)}`).join(" ");
  return { xs, ys, labelYs, path, sides, anchors };
}
