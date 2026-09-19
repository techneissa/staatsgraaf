import { test } from "node:test";
import assert from "node:assert/strict";

import { GLYPH_GAP } from "./graph.ts";
import { packRing } from "./ring-pack.ts";

const item = (id, halfWidth = 5, halfHeight = halfWidth) => ({ id, halfWidth, halfHeight });

function arcGaps(placed, items, start, end) {
  const byRing = new Map();
  for (const p of placed) {
    const list = byRing.get(p.radius) ?? [];
    list.push(p);
    byRing.set(p.radius, list);
  }
  const gaps = [];
  for (const [radius, ring] of byRing) {
    const sorted = [...ring].sort((a, b) => a.angle - b.angle);
    const hw = (p) => items.find((it) => it.id === p.id).halfWidth;
    gaps.push(sorted[0].angle * radius - start * radius - hw(sorted[0]));
    for (let i = 1; i < sorted.length; i += 1) {
      gaps.push((sorted[i].angle - sorted[i - 1].angle) * radius - hw(sorted[i]) - hw(sorted[i - 1]));
    }
    gaps.push(end * radius - sorted[sorted.length - 1].angle * radius - hw(sorted[sorted.length - 1]));
  }
  return gaps;
}

test("items keep their order, never overlap and share the free arc evenly", () => {
  const items = [];
  for (let i = 0; i < 30; i += 1) items.push(item(`n${i}`, i % 5 === 0 ? 15 : 5, i % 5 === 0 ? 7 : 5));
  const { placed } = packRing(items, 0, Math.PI / 2, 200);
  assert.equal(placed.length, items.length);
  assert.deepEqual(placed.map((p) => p.id), items.map((it) => it.id));
  const gaps = arcGaps(placed, items, 0, Math.PI / 2);
  for (const gap of gaps) assert.ok(gap >= GLYPH_GAP - 1e-6, `gap ${gap}`);
  const byRing = new Map();
  for (const p of placed) byRing.set(p.radius, [...(byRing.get(p.radius) ?? []), p]);
  for (const ring of byRing.values()) {
    const g = arcGaps(ring, items, 0, Math.PI / 2);
    // Half a gap at each end, a full gap between neighbours.
    const inner = g.slice(1, -1);
    for (const gap of inner) assert.ok(Math.abs(gap - inner[0]) < 1e-6, `uneven ${gap} vs ${inner[0]}`);
    assert.ok(Math.abs(g[0] - inner[0] / 2) < 1e-6 || inner.length === 0);
  }
});

test("rings open outward and are filled to a comparable fraction", () => {
  const items = Array.from({ length: 120 }, (_, i) => item(`n${i}`, 6));
  const { placed, outerRadius } = packRing(items, 0, 1, 150);
  const radii = [...new Set(placed.map((p) => p.radius))].sort((a, b) => a - b);
  assert.ok(radii.length > 1);
  for (let i = 1; i < radii.length; i += 1) assert.ok(radii[i] > radii[i - 1]);
  const fills = radii.map((r) => placed.filter((p) => p.radius === r).length * (12 + GLYPH_GAP) / (1 * r));
  assert.ok(Math.max(...fills) - Math.min(...fills) < 0.25, `fills ${fills.map((f) => f.toFixed(2))}`);
  assert.ok(outerRadius >= radii[radii.length - 1] + 6);
});

test("a wide item that fits no ring's remainder opens a ring of its own", () => {
  const items = [item("a", 40), item("b", 40), item("c", 40)];
  const { placed } = packRing(items, 0, 0.5, 100);
  assert.equal(placed.length, 3);
  assert.equal(new Set(placed.map((p) => p.radius)).size, 3);
});

test("packing is deterministic and empty input is a no-op", () => {
  const items = Array.from({ length: 12 }, (_, i) => item(`n${i}`, 4 + (i % 3)));
  assert.deepEqual(packRing(items, 0.2, 1.4, 90), packRing(items, 0.2, 1.4, 90));
  assert.deepEqual(packRing([], 0, 1, 90), { placed: [], outerRadius: 90 });
});
