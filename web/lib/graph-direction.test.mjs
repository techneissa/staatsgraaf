import { test } from "node:test";
import assert from "node:assert/strict";
import { arrowOf, nearestInDirection } from "./graph-direction.ts";

const marks = [
  { id: "c", x: 0, y: 0 },
  { id: "r", x: 50, y: 4 },
  { id: "r-far", x: 120, y: 0 },
  { id: "l", x: -40, y: -3 },
  { id: "u", x: 2, y: -60 },
  { id: "d", x: -3, y: 70 },
  { id: "diag", x: 30, y: 30 },
];
const centre = marks[0];

test("each arrow goes to the nearest mark that way", () => {
  assert.equal(nearestInDirection(centre, marks, "right", 0, "c"), "r");
  assert.equal(nearestInDirection(centre, marks, "left", 0, "c"), "l");
  assert.equal(nearestInDirection(centre, marks, "up", 0, "c"), "u");
  assert.equal(nearestInDirection(centre, marks, "down", 0, "c"), "d");
});

test("nothing that way means nothing: the selection stays", () => {
  assert.equal(nearestInDirection(marks[2], marks, "right", 0, "r-far"), null);
});

test("a mark in line wins over a nearer one far off to the side", () => {
  const only = [{ id: "a", x: 0, y: 0 }, { id: "side", x: 40, y: 60 }, { id: "line", x: 90, y: 2 }];
  assert.equal(nearestInDirection(only[0], only, "right", 0, "a"), "line");
});

test("when nothing is in line, the half plane still reaches every mark", () => {
  const only = [{ id: "a", x: 0, y: 0 }, { id: "b", x: 10, y: 100 }];
  assert.equal(nearestInDirection(only[0], only, "right", 0, "a"), "b");
  assert.equal(nearestInDirection(only[0], only, "left", 0, "a"), null);
});

test("a turned canvas keeps the arrows on screen directions", () => {
  // Turn the map a quarter turn clockwise: what was right on the layout is now down on screen.
  assert.equal(nearestInDirection(centre, marks, "down", Math.PI / 2, "c"), "r");
  assert.equal(nearestInDirection(centre, marks, "left", Math.PI / 2, "c"), "d");
});

test("ties break by id so the walk is deterministic", () => {
  const tie = [{ id: "o", x: 0, y: 0 }, { id: "b", x: 10, y: 0 }, { id: "a", x: 10, y: 0 }];
  assert.equal(nearestInDirection(tie[0], tie, "right", 0, "o"), "a");
});

test("arrowOf names only the four arrows", () => {
  assert.equal(arrowOf("ArrowLeft"), "left");
  assert.equal(arrowOf("ArrowDown"), "down");
  assert.equal(arrowOf("Enter"), null);
});
