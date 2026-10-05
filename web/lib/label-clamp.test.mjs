import { test } from "node:test";
import assert from "node:assert/strict";
import { clampLabelToBounds } from "./label-clamp.ts";

const bounds = { x0: 0, y0: 0, x1: 300, y1: 200 };

test("a label that fits stays where it was placed", () => {
  const slot = { x: 100, y: 50, anchor: "start" };
  assert.deepEqual(clampLabelToBounds(slot, 80, 14, bounds), slot);
});

test("a label running off the right edge is pulled back inside", () => {
  const out = clampLabelToBounds({ x: 280, y: 50, anchor: "start" }, 120, 14, bounds, 4);
  assert.equal(out.x + 120, 296);
  assert.equal(out.anchor, "start");
});

test("an end-anchored label past the left edge is pushed right", () => {
  const out = clampLabelToBounds({ x: 30, y: 50, anchor: "end" }, 120, 14, bounds, 4);
  assert.equal(out.x - 120, 4);
});

test("a centred label near a corner is clamped on both axes", () => {
  const out = clampLabelToBounds({ x: 290, y: 195, anchor: "middle" }, 100, 14, bounds, 4);
  assert.equal(out.x + 50, 296);
  assert.equal(out.y + 7, 196);
});

test("a label wider than the view starts at the left edge", () => {
  const out = clampLabelToBounds({ x: 150, y: 50, anchor: "middle" }, 500, 14, bounds, 4);
  assert.equal(out.x - 250, 4);
});
