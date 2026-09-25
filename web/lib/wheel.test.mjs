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

test("a gemeente's ties include the voters, its provincie and no tie to itself", async () => {
  const { wheelLinks, WHEEL_VOTERS } = await import("./wheel.ts");
  const drawn = new Set(wheel.cells.flatMap((cell) => [cell.id, ...cell.items.map((item) => item.id)]));
  const gemeente = bundle.nodes.find((node) => node.subtype === "gemeente");
  const { self, links } = wheelLinks(bundle, gemeente.id, drawn);
  assert.equal(self, gemeente.id);
  assert.ok(links.some((link) => link.other === WHEEL_VOTERS && link.type === "elects" && !link.outgoing));
  assert.ok(links.some((link) => link.type === "oversees" && !link.outgoing && bundle.nodes.find((node) => node.id === link.other)?.subtype === "provincie"));
  assert.ok(links.every((link) => link.other !== self));
});

test("a hidden body stands in for the body it belongs to", async () => {
  const { wheelLinks } = await import("./wheel.ts");
  const drawn = new Set(wheel.cells.flatMap((cell) => [cell.id, ...cell.items.map((item) => item.id)]));
  const raad = bundle.nodes.find((node) => node.subtype === "gemeenteraad");
  assert.equal(wheelLinks(bundle, raad.id, drawn).self, raad.parent);
});

test("a ministry is tied to the bodies it oversees", async () => {
  const { wheelLinks } = await import("./wheel.ts");
  const drawn = new Set(wheel.cells.flatMap((cell) => [cell.id, ...cell.items.map((item) => item.id)]));
  const { links } = wheelLinks(bundle, "org:ministerie-van-financien", drawn);
  assert.ok(links.filter((link) => link.type === "oversees" && link.outgoing).length >= 5);
});
