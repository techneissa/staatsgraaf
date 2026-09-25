import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assignSides,
  egoFits,
  groupTies,
  layoutEgo,
  rankOverview,
  roleOf,
  strengthLevel,
  tieKind,
  tiePath,
  TIE_KINDS,
} from "./power-map-layout.ts";
import { connectionsOf } from "./power-connections.ts";

const bundle = JSON.parse(readFileSync(new URL("../public/power-map.json", import.meta.url), "utf8"));

test("a tie's group follows its most structural reason", () => {
  assert.equal(tieKind(["tenure", "news"]), "office");
  assert.equal(tieKind(["news", "kabinet", "organisation"]), "cabinet");
  assert.equal(tieKind(["fractie", "organisation"]), "party");
  assert.equal(tieKind(["organisation"]), "office");
  assert.equal(tieKind(["news"]), "news");
});

test("strength levels run from 1 to 5 and never fall as the weight rises", () => {
  let last = 0;
  for (let weight = 0; weight <= 6; weight += 0.05) {
    const level = strengthLevel(weight);
    assert.ok(level >= 1 && level <= 5);
    assert.ok(level >= last);
    last = level;
  }
});

test("groups come in the fixed order, strongest tie first", () => {
  const ties = connectionsOf(bundle.links, bundle.powerMap.people[0].person, Infinity);
  const groups = groupTies(ties);
  const order = groups.map((group) => TIE_KINDS.indexOf(group.kind));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  for (const group of groups) {
    for (let i = 1; i < group.ties.length; i += 1) assert.ok(group.ties[i - 1].link.weight >= group.ties[i].link.weight);
  }
  assert.equal(groups.reduce((sum, group) => sum + group.ties.length, 0), ties.length);
});

test("sides balance the columns", () => {
  const sides = assignSides([8, 2, 1, 5]);
  const left = [8, 2, 1, 5].reduce((sum, size, index) => sum + (sides[index] === -1 ? size : 0), 0);
  const right = 16 - left;
  assert.ok(Math.abs(left - right) <= 4, `${left} against ${right}`);
});

const boxes = [
  { width: 1180, height: 700 },
  { width: 820, height: 520 },
  { width: 680, height: 420 },
];

for (const box of boxes) {
  test(`every focus lays out without overlap in ${box.width} by ${box.height}`, () => {
    const focusIds = new Set(bundle.links.flatMap((link) => [link.a, link.b]));
    for (const id of focusIds) {
      if (!egoFits(box.width, box.height)) continue;
      const groups = groupTies(connectionsOf(bundle.links, id, Infinity));
      const layout = layoutEgo(groups, box);
      for (const node of layout.nodes) {
        assert.ok(node.y - 22 >= 0 && node.y + 22 <= box.height, `${id}: ${node.id} inside the box vertically`);
        const far = node.side === 1 ? node.x + 18 + 4 + 148 : node.x - 18 - 4 - 148;
        assert.ok(far >= -0.5 && far <= box.width + 0.5, `${id}: ${node.id} label inside the box`);
        assert.ok(Math.abs(node.x - layout.centre.x) >= 40 + 18, `${id}: ${node.id} clear of the focus`);
      }
      for (const side of [-1, 1]) {
        const ys = layout.nodes.filter((node) => node.side === side).map((node) => node.y).sort((a, b) => a - b);
        for (let i = 1; i < ys.length; i += 1) assert.ok(ys[i] - ys[i - 1] >= 44, `${id}: rows at least a touch target apart`);
      }
      const shown = layout.headings.reduce((sum, heading) => sum + heading.shown, 0);
      assert.equal(shown, layout.nodes.length);
    }
  });
}

test("the diagram gives way to the list on a phone", () => {
  assert.equal(egoFits(390, 420), false);
  assert.equal(egoFits(1000, 600), true);
});

test("a tie path starts at the focus and ends at the neighbour", () => {
  const path = tiePath({ x: 100, y: 100 }, { x: 300, y: 40 });
  assert.match(path, /^M100 100 C/);
  assert.match(path, / 300 40$/);
});

test("roles come from the title of the current position", () => {
  assert.equal(roleOf("Minister van Financiën"), "cabinet");
  assert.equal(roleOf("Staatssecretaris van Defensie"), "cabinet");
  assert.equal(roleOf("Fractievoorzitter Volt"), "parliament");
  assert.equal(roleOf("Lid Vaste commissie voor Digitale Zaken"), "parliament");
  assert.equal(roleOf("Burgemeester van Utrecht"), "other");
  assert.equal(roleOf(null), "other");
});

test("the overview ranks anchors by summed strength", () => {
  const anchors = new Set(bundle.powerMap.people.map((entry) => entry.person));
  const groups = rankOverview(bundle.links, anchors, (id) => bundle.people[id]?.job ?? null);
  const everyone = groups.flatMap((group) => group.people);
  assert.ok(everyone.length > 0);
  for (const entry of everyone) assert.ok(anchors.has(entry.id));
  for (const group of groups) {
    for (let i = 1; i < group.people.length; i += 1) assert.ok(group.people[i - 1].strength >= group.people[i].strength);
  }
});
