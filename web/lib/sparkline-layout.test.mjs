import { test } from "node:test";
import assert from "node:assert/strict";

import {
  sparklinePlot,
  SPARK_HEIGHT,
  SPARK_LABEL_DOWN,
  SPARK_LABEL_UP,
  SPARK_PAD_TOP,
} from "./sparkline-layout.ts";

test("a peak at the top of the chart puts its digit below the point", () => {
  const plot = sparklinePlot([
    { date: "2000-01-01", seats: 1, total: 150 },
    { date: "2010-01-01", seats: 10, total: 150 },
    { date: "2020-01-01", seats: 2, total: 150 },
  ]);
  assert.equal(plot.sides[1], "down");
  assert.ok(plot.ys[1] < plot.ys[0]);
  assert.ok(plot.ys[1] >= SPARK_PAD_TOP);
  assert.equal(plot.labelYs[1], plot.ys[1] + SPARK_LABEL_DOWN);
});

test("a valley puts its digit below the point, outside the V", () => {
  const plot = sparklinePlot([
    { date: "2000-01-01", seats: 10, total: 75 },
    { date: "2010-01-01", seats: 1, total: 75 },
    { date: "2020-01-01", seats: 10, total: 75 },
  ]);
  assert.equal(plot.sides[1], "down");
  assert.ok(plot.ys[1] > plot.ys[0]);
  assert.equal(plot.labelYs[1], plot.ys[1] + SPARK_LABEL_DOWN);
  assert.ok(plot.labelYs[1] < SPARK_HEIGHT);
});

test("a flat line at the top alternates sides so close digits do not overlap", () => {
  const plot = sparklinePlot([
    { date: "2020-01-01", seats: 3, total: 75 },
    { date: "2020-01-08", seats: 3, total: 75 },
    { date: "2020-01-15", seats: 3, total: 75 },
    { date: "2024-01-01", seats: 3, total: 75 },
  ]);
  assert.equal(plot.sides[0], "down");
  assert.equal(plot.sides[1], "up");
  assert.equal(plot.sides[2], "down");
  assert.equal(plot.anchors[0], "start");
  assert.equal(plot.anchors[3], "end");
  assert.equal(plot.labelYs[1], plot.ys[1] - SPARK_LABEL_UP);
  assert.ok(plot.labelYs[1] > 0);
});
