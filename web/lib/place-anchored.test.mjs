import { test } from "node:test";
import assert from "node:assert/strict";

import { placeAnchored } from "./place-anchored.ts";

const viewport = { viewportWidth: 1440, viewportHeight: 900 };

function anchor({ left, top, width = 20, height = 20 }) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

test("opens below the trigger, aligned to its start", () => {
  const box = placeAnchored({
    anchor: anchor({ left: 100, top: 80 }),
    width: 240,
    height: 120,
    ...viewport,
  });
  assert.equal(box.flipped, false);
  assert.equal(box.top, 80 + 20 + 8);
  assert.equal(box.left, 100);
  assert.ok(box.maxHeight >= 120);
});

test("shifts left when the box would run past the right edge", () => {
  const box = placeAnchored({
    anchor: anchor({ left: 1300, top: 80 }),
    width: 240,
    height: 80,
    ...viewport,
  });
  assert.equal(box.left, 1440 - 240 - 8);
  assert.ok(box.left + 240 <= 1440 - 8);
});

test("stays on the left margin when the trigger is at the start", () => {
  const box = placeAnchored({
    anchor: anchor({ left: 4, top: 80 }),
    width: 240,
    height: 80,
    ...viewport,
  });
  assert.equal(box.left, 8);
});

test("flips above when there is no room below", () => {
  const box = placeAnchored({
    anchor: anchor({ left: 200, top: 820 }),
    width: 240,
    height: 120,
    ...viewport,
  });
  assert.equal(box.flipped, true);
  assert.ok(box.top + Math.min(120, box.maxHeight) <= 820 - 8);
  assert.ok(box.top >= 8);
});

test("stays inside a phone viewport", () => {
  const box = placeAnchored({
    anchor: anchor({ left: 300, top: 40, width: 20, height: 20 }),
    width: 240,
    height: 160,
    viewportWidth: 390,
    viewportHeight: 844,
  });
  assert.ok(box.left >= 8);
  assert.ok(box.left + Math.min(240, 390 - 16) <= 390 - 8);
  assert.ok(box.top >= 8);
  assert.ok(box.top + Math.min(160, box.maxHeight) <= 844 - 8);
});

test("caps height to the remaining viewport when the box is taller than the room", () => {
  const box = placeAnchored({
    anchor: anchor({ left: 40, top: 40 }),
    width: 240,
    height: 2000,
    viewportWidth: 390,
    viewportHeight: 200,
  });
  assert.ok(box.maxHeight <= 200 - 8 - (40 + 20 + 8));
  assert.ok(box.maxHeight >= 0);
});
