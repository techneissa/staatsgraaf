import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { layoutPowerMap, powerMapCardBox, powerMapLinkPath } from "./power-map-layout.ts";

const bundle = JSON.parse(
  readFileSync(new URL("../public/power-map.json", import.meta.url), "utf8"),
);

const people = bundle.powerMap.people;
const layout = layoutPowerMap(people);

test("every ranked person gets a card", () => {
  assert.equal(layout.cards.length, people.length);
  assert.ok(people.length > 0, "the bundle has no power map people");
});

test("no two portrait-and-label boxes overlap", () => {
  const boxes = layout.cards.map(powerMapCardBox);
  const issues = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX > 0.01 && overlapY > 0.01) {
        issues.push([layout.cards[i].person.name, layout.cards[j].person.name, overlapX, overlapY]);
      }
    }
  }
  assert.deepEqual(issues, []);
});

test("cards form a symmetric tree with rank 1 above the hub", () => {
  const first = layout.cards[0];
  assert.equal(first.person.rank, 1);
  assert.equal(first.x, 0, "rank 1 sits on the vertical axis");
  const minY = Math.min(...layout.cards.map((card) => card.y));
  assert.ok(Math.abs(first.y - minY) < 0.001, "rank 1 is the topmost card");
  for (const card of layout.cards) {
    if (card.row === 0) {
      assert.equal(card.x, 0);
      continue;
    }
    assert.ok(card.y > 0, `${card.person.name} hangs below the hub`);
    if (card.slot % 2 === 0) assert.ok(card.x < 0, card.person.name);
    else assert.ok(card.x > 0, card.person.name);
  }
});

test("the bounds contain every card box", () => {
  for (const card of layout.cards) {
    const box = powerMapCardBox(card);
    assert.ok(box.left >= layout.bounds.minX - 0.01, card.person.name);
    assert.ok(box.right <= layout.bounds.maxX + 0.01, card.person.name);
    assert.ok(box.top >= layout.bounds.minY - 0.01, card.person.name);
    assert.ok(box.bottom <= layout.bounds.maxY + 0.01, card.person.name);
  }
});

test("the bounds contain the hub circle and its centre label", () => {
  assert.ok(layout.bounds.minY <= -36, "hub top inside bounds");
  assert.ok(layout.bounds.maxX >= 70 && layout.bounds.minX <= -70, "centre label inside bounds");
});

test("links bow toward the hub without degenerating", () => {
  for (const card of layout.cards) {
    const path = powerMapLinkPath(card.x, card.y);
    assert.match(path, /^M -?\d+(\.\d+)? -?\d+(\.\d+)? Q /, card.person.name);
    assert.match(path, / 0 0$/, card.person.name);
  }
});

test("the power map layout is deterministic", () => {
  const again = layoutPowerMap(people);
  assert.deepEqual(
    again.cards.map((card) => [card.person.person, card.x, card.y]),
    layout.cards.map((card) => [card.person.person, card.x, card.y]),
  );
});
