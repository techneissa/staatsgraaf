/**
 * Geometry for the party seat history chart: coordinates, label side
 * (above or below the point) and text anchors so digits stay inside the box.
 */

export type SparklinePoint = {
  date: string;
  seats: number;
  total: number;
};

export const SPARK_WIDTH = 480;
export const SPARK_HEIGHT = 180;
export const SPARK_PAD_X = 28;
export const SPARK_PAD_TOP = 26;
export const SPARK_PAD_BOTTOM = 30;
/** Flip the next label when two points sit closer than this, in viewBox units. */
const CLOSE_DX = 22;

export type SparklinePlot = {
  xs: number[];
  ys: number[];
  path: string;
  /** "up" draws the digit above the point, "down" below it. */
  sides: ("up" | "down")[];
  anchors: ("start" | "middle" | "end")[];
};

export function sparklinePlot(points: SparklinePoint[]): SparklinePlot {
  const max = Math.max(1, ...points.map((point) => point.seats));
  const first = Date.parse(points[0].date);
  const last = Date.parse(points[points.length - 1].date);
  const span = Math.max(1, last - first);
  const plotH = SPARK_HEIGHT - SPARK_PAD_TOP - SPARK_PAD_BOTTOM;
  const plotW = SPARK_WIDTH - 2 * SPARK_PAD_X;
  const midY = SPARK_PAD_TOP + plotH * 0.45;
  const xs = points.map((point) => SPARK_PAD_X + ((Date.parse(point.date) - first) / span) * plotW);
  const ys = points.map((point) => SPARK_PAD_TOP + (1 - point.seats / max) * plotH);
  const sides: ("up" | "down")[] = [];
  for (let index = 0; index < points.length; index += 1) {
    let side: "up" | "down" = ys[index] < midY ? "down" : "up";
    if (index > 0 && Math.abs(xs[index] - xs[index - 1]) < CLOSE_DX && sides[index - 1] === side) {
      side = side === "up" ? "down" : "up";
    }
    sides.push(side);
  }
  const lastIndex = points.length - 1;
  const anchors = points.map((_, index) => (index === 0 ? "start" : index === lastIndex ? "end" : "middle") as "start" | "middle" | "end");
  const path = points.map((_, index) => `${index === 0 ? "M" : "L"} ${xs[index].toFixed(1)} ${ys[index].toFixed(1)}`).join(" ");
  return { xs, ys, path, sides, anchors };
}
