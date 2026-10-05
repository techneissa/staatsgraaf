import { describe, expect, test } from "bun:test";
import { niceCeil, nearestPoint, sumTrends, trendLayout, trendTicks } from "./budget-trend";

const pt = (year, value, measure = "actual") => ({ year, value, measure });

describe("niceCeil and trendTicks", () => {
  test("rounds up to 1, 2, 2.5, 5 times a power of ten", () => {
    expect(niceCeil(110)).toBe(200);
    expect(niceCeil(4.6)).toBe(5);
    expect(niceCeil(2.2)).toBe(2.5);
    expect(niceCeil(0)).toBe(1);
  });
  test("ticks start at zero and cover the maximum", () => {
    const ticks = trendTicks(14.7e9);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(14.7e9);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.length).toBeLessThanOrEqual(6);
  });
});

describe("sumTrends", () => {
  test("sums only the years where every series has a figure", () => {
    const a = { id: "a", points: [pt(2018, 1), pt(2019, 2), pt(2020, 3), pt(2021, 4, "budget")] };
    const b = { id: "b", points: [pt(2019, 10), pt(2020, 20), pt(2021, 30, "budget")] };
    const { points, lateStarters } = sumTrends([a, b]);
    expect(points.map((p) => [p.year, p.value, p.measure])).toEqual([
      [2019, 12, "actual"],
      [2020, 23, "actual"],
      [2021, 34, "budget"],
    ]);
    expect(lateStarters).toEqual([{ id: "b", from: 2019 }]);
  });
  test("an interior gap stays a gap, never a zero", () => {
    const a = { id: "a", points: [pt(2019, 1), pt(2020, 2), pt(2021, 3)] };
    const b = { id: "b", points: [pt(2019, 1), pt(2020, null), pt(2021, 3)] };
    const { points } = sumTrends([a, b]);
    expect(points.map((p) => p.value)).toEqual([2, null, 6]);
  });
  test("no complete year gives no points", () => {
    expect(sumTrends([{ id: "a", points: [pt(2019, 1)] }, { id: "b", points: [pt(2020, 1)] }]).points).toEqual([]);
  });
});

describe("trendLayout", () => {
  const points = [pt(2022, 100), pt(2023, 200), pt(2024, 150), pt(2025, 160, "budget"), pt(2026, 170, "budget")];
  const layout = trendLayout({ points, width: 300, height: 150 });
  test("spans the plot area and puts a bigger value higher", () => {
    expect(layout.x(2022)).toBe(layout.left);
    expect(layout.x(2026)).toBe(layout.right);
    const [a, b] = layout.plotted;
    expect(b.y).toBeLessThan(a.y);
    expect(layout.ticks[0].y).toBe(layout.bottomY);
  });
  test("the dashed stretch starts at the last solid point", () => {
    expect(layout.actualPath.startsWith("M")).toBe(true);
    const lastActual = layout.plotted[2];
    expect(layout.budgetPath.startsWith(`M${Math.round(lastActual.x * 10) / 10} ${Math.round(lastActual.y * 10) / 10}L`)).toBe(true);
    expect(layout.budgetFrom).toBe(layout.x(2025));
  });
  test("a null year breaks the line", () => {
    const gap = trendLayout({ points: [pt(2020, 1), pt(2021, null), pt(2022, 3)], width: 300, height: 150 });
    expect(gap.actualPath.match(/M/g)?.length).toBe(2);
    expect(gap.plotted.length).toBe(2);
  });
  test("an empty series does not throw", () => {
    const empty = trendLayout({ points: [], width: 300, height: 150 });
    expect(empty.plotted).toEqual([]);
    expect(empty.actualPath).toBe("");
  });
  test("nearestPoint picks the closest year", () => {
    expect(nearestPoint(layout.plotted, layout.x(2024) + 3)?.year).toBe(2024);
    expect(nearestPoint([], 5)).toBeNull();
  });
});
