import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildWheel, shortLabel, WHEEL_RINGS } from "./wheel.ts";

const bundle = JSON.parse(readFileSync(new URL("../public/graph.json", import.meta.url), "utf8"));
const wheel = buildWheel(bundle);

test("cells that share a ring never overlap", () => {
  for (let i = 0; i < wheel.cells.length; i += 1) {
    for (let j = i + 1; j < wheel.cells.length; j += 1) {
      const a = wheel.cells[i];
      const b = wheel.cells[j];
      const radial = a.r0 < b.r1 - 1e-6 && b.r0 < a.r1 - 1e-6;
      const angular = a.a0 < b.a1 - 1e-6 && b.a0 < a.a1 - 1e-6;
      assert.ok(!(radial && angular), `${a.id} overlaps ${b.id}`);
    }
  }
});

test("every cell stays inside the wheel and within its ring band", () => {
  for (const cell of wheel.cells) {
    assert.ok(cell.r0 >= WHEEL_RINGS.core && cell.r1 <= WHEEL_RINGS.frame[0], cell.id);
    assert.ok(cell.a1 > cell.a0, cell.id);
  }
});

test("a body is named in at most one cell", () => {
  const seen = new Map();
  for (const cell of wheel.cells) {
    for (const item of cell.items) {
      assert.ok(!seen.has(item.id), `${item.id} in ${cell.id} and ${seen.get(item.id)}`);
      seen.set(item.id, cell.id);
    }
  }
});

test("every gemeente sits in the cell of the provincie that oversees it", () => {
  const gemeenten = bundle.nodes.filter((node) => node.subtype === "gemeente");
  const named = new Set(wheel.cells.filter((cell) => cell.id.startsWith("cluster:gemeenten:oversight")).flatMap((cell) => cell.items.map((item) => item.id)));
  const overseen = new Set(bundle.edges.filter((edge) => edge.type === "oversees").map((edge) => edge.to));
  for (const node of gemeenten) if (overseen.has(node.id)) assert.ok(named.has(node.id), node.id);
});

test("a short label prefers the abbreviation and otherwise drops the type prefix", () => {
  assert.equal(shortLabel({ id: "org:x", name: "Gemeente Tilburg" }, {}), "Tilburg");
  assert.equal(shortLabel({ id: "org:x", name: "Ministerie van Defensie" }, { "org:x": "DEF" }), "DEF");
});

test("the wheel is deterministic", () => {
  assert.deepEqual(buildWheel(bundle), wheel);
});
