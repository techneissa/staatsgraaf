import { test } from "node:test";
import assert from "node:assert/strict";

import { nearestActiveIndex } from "./change-hit.ts";

// 10 days over 100 px: 10 px per day.
const COUNTS = [0, 0, 3, 0, 0, 0, 0, 1, 0, 0];

test("a pointer on a bar picks that bar", () => {
  assert.equal(nearestActiveIndex(COUNTS, 25, 100, 22), 2);
});

test("a pointer within reach of a bar picks it, beyond reach picks nothing", () => {
  assert.equal(nearestActiveIndex(COUNTS, 40, 100, 22), 2);
  assert.equal(nearestActiveIndex(COUNTS, 52, 100, 5), null);
});

test("between two bars the closer one wins", () => {
  assert.equal(nearestActiveIndex(COUNTS, 40, 100, 100), 2);
  assert.equal(nearestActiveIndex(COUNTS, 60, 100, 100), 7);
});

test("a chart without changes or width picks nothing", () => {
  assert.equal(nearestActiveIndex([0, 0, 0], 10, 100, 22), null);
  assert.equal(nearestActiveIndex(COUNTS, 10, 0, 22), null);
});

test("a pointer outside the chart clamps to the edge before the reach check", () => {
  assert.equal(nearestActiveIndex([1, 0, 0, 0], -5, 40, 22), 0);
  assert.equal(nearestActiveIndex([1, 0, 0, 0], 500, 40, 22), null);
});
