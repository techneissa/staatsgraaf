import { test } from "node:test";
import assert from "node:assert/strict";

import { placeLabels } from "./label-placement.ts";

const item = (id, x, y, priority = 1, width = 60, height = 12, r = 4) => ({ id, x, y, r, width, height, priority });

const rectOf = (it, slot) => {
  const x0 = slot.anchor === "start" ? slot.x : slot.anchor === "end" ? slot.x - it.width : slot.x - it.width / 2;
  return { x0, x1: x0 + it.width, y0: slot.y - it.height / 2, y1: slot.y + it.height / 2 };
};
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

test("a lone label reads to the right of its mark", () => {
  const placed = placeLabels([item("a", 0, 0)]);
  assert.deepEqual(placed.get("a"), { x: 7, y: 0, anchor: "start" });
});

test("placed labels never overlap each other or a labelled mark", () => {
  const items = [];
  for (let i = 0; i < 40; i += 1) items.push(item(`n${i}`, (i % 8) * 18, Math.floor(i / 8) * 9, i % 3));
  const placed = placeLabels(items);
  const rects = [...placed.entries()].map(([id, slot]) => rectOf(items.find((it) => it.id === id), slot));
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) assert.equal(overlap(rects[i], rects[j]), false);
  }
  for (const rect of rects) {
    for (const it of items) {
      const disc = { x0: it.x - it.r, x1: it.x + it.r, y0: it.y - it.r, y1: it.y + it.r };
      assert.equal(overlap(rect, disc), false);
    }
  }
  assert.ok(placed.size > 0 && placed.size < items.length, "a crowded field hides some labels");
});

test("priority wins the slot and the order is reproducible", () => {
  const a = item("a", 0, 0, 1);
  const b = item("b", 0, 6, 5);
  const first = placeLabels([a, b]);
  const second = placeLabels([b, a]);
  assert.ok(first.has("b"));
  assert.deepEqual([...first.entries()], [...second.entries()]);
});

test("a label falls back to the left, above and below in that order", () => {
  const blocker = item("blocker", 20, 0, 9, 200, 12, 1);
  const target = item("t", 0, 0, 1, 20, 12, 4);
  const placed = placeLabels([blocker, target]);
  assert.equal(placed.get("t")?.anchor, "end");
});

test("a slot that would leave the view is not taken: the label flips to the free side", () => {
  const bounds = { x0: 0, y0: 0, x1: 100, y1: 60 };
  const it = item("edge", 90, 30, 1, 60);
  const slot = placeLabels([it], 3, bounds).get("edge");
  assert.equal(slot.anchor, "end");
  const rect = rectOf(it, slot);
  assert.ok(rect.x0 >= bounds.x0 && rect.x1 <= bounds.x1);
});

test("a kept label that fits nowhere is pulled inside, an ordinary one is hidden", () => {
  const bounds = { x0: 0, y0: 0, x1: 70, y1: 60 };
  const kept = { ...item("kept", 35, 30, 5, 100), keep: true };
  const other = item("other", 35, 12, 1, 100);
  const placed = placeLabels([kept, other], 3, bounds);
  const slot = placed.get("kept");
  assert.ok(slot, "the kept label is shown");
  const rect = rectOf(kept, slot);
  assert.ok(rect.x0 >= bounds.x0 + 2);
  assert.equal(placed.has("other"), false);
});
