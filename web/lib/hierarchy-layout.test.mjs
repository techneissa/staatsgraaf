import { test } from "node:test";
import assert from "node:assert/strict";

import {
  arcPath,
  edgePoint,
  ellipseSampler,
  focusFits,
  layoutFocus,
  layoutRadial,
  radialFits,
  rectsOverlap,
} from "./hierarchy-layout.ts";

const hubs = (n, satellites = 2, weight = () => 1) =>
  Array.from({ length: n }, (_, i) => ({ id: `h${i}`, weight: weight(i), satellites, label: i % 2 ? "Financiën" : "BZK" }));

const inside = (point, box, margin = 0) =>
  point.x >= -margin && point.y >= -margin && point.x <= box.width + margin && point.y <= box.height + margin;

test("the radial form needs room; smaller boxes use the stacked list", () => {
  assert.equal(radialFits(460, 600), true);
  assert.equal(radialFits(390, 600), false);
  assert.equal(radialFits(700, 360), false);
});

test("hubs sit at equal angles from the top, clockwise, and never touch", () => {
  for (const [width, height] of [[460, 520], [620, 760], [700, 800]]) {
    const layout = layoutRadial(hubs(11), { width, height });
    assert.equal(layout.hubs.length, 11);
    assert.ok(Math.abs(layout.hubs[0].x - width / 2) < 0.2 && layout.hubs[0].y < height / 2, "first hub on top");
    assert.ok(layout.hubs[1].x > layout.hubs[0].x, "clockwise");
    for (let i = 0; i < layout.hubs.length; i += 1) {
      const a = layout.hubs[i];
      const b = layout.hubs[(i + 1) % layout.hubs.length];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r, `hubs ${i} and ${i + 1} apart at ${width}x${height}`);
    }
  }
});

test("everything stays inside the box, satellites included", () => {
  for (const [width, height] of [[460, 480], [560, 700], [700, 820]]) {
    const box = { width, height };
    const layout = layoutRadial(hubs(20, 1, (i) => 20 - i), box);
    for (const hub of layout.hubs) {
      assert.ok(inside({ x: hub.x - hub.r, y: hub.y - hub.r }, box) && inside({ x: hub.x + hub.r, y: hub.y + hub.r }, box));
      for (const sat of hub.satellites) assert.ok(inside(sat, box, -layout.sat / 2 + 1), `satellite inside at ${width}x${height}`);
    }
  }
});

test("a heavier hub is bigger, equal hubs are equal", () => {
  const weighted = layoutRadial(hubs(6, 1, (i) => [26, 9, 3, 1, 1, 1][i]), { width: 600, height: 600 });
  assert.ok(weighted.hubs[0].r > weighted.hubs[1].r && weighted.hubs[1].r > weighted.hubs[2].r);
  const equal = layoutRadial(hubs(6), { width: 600, height: 600 });
  assert.equal(new Set(equal.hubs.map((hub) => hub.r)).size, 1);
});

test("labels are drawn only when no two chips touch", () => {
  const roomy = layoutRadial(hubs(11), { width: 700, height: 800 });
  assert.equal(roomy.labels, true);
  const chip = (hub, text) => ({ x: hub.label.x - (text.length * 6.4 + 12) / 2, y: hub.label.y - 9, w: text.length * 6.4 + 12, h: 18 });
  assert.ok(roomy.hubs.every((hub) => hub.showLabel));
  const rects = roomy.hubs.map((hub, i) => chip(hub, i % 2 ? "Financiën" : "BZK"));
  for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) assert.equal(rectsOverlap(rects[i], rects[j]), false);
  const crowded = layoutRadial(
    Array.from({ length: 24 }, (_, i) => ({ id: `h${i}`, weight: 1, satellites: 1, label: "Fractie-Visseren-Hamakers" })),
    { width: 460, height: 460 },
  );
  assert.equal(crowded.labels, false);
});

test("when not every label fits, the heaviest hubs keep theirs", () => {
  const input = Array.from({ length: 20 }, (_, i) => ({ id: `h${i}`, weight: 20 - i, satellites: 1, label: i < 3 ? "PRO" : "Fractie-Van de Sanden" }));
  const layout = layoutRadial(input, { width: 620, height: 640 });
  assert.equal(layout.hubs[0].showLabel, true);
  assert.ok(layout.hubs.some((hub) => !hub.showLabel));
});

test("satellites fan out beyond their hub and are dropped when the slot is too narrow", () => {
  const layout = layoutRadial(hubs(11, 4), { width: 700, height: 800 });
  const centre = layout.centre;
  for (const hub of layout.hubs) {
    assert.equal(hub.satellites.length, 4);
    const hubDist = Math.hypot(hub.x - centre.x, hub.y - centre.y);
    for (const sat of hub.satellites) assert.ok(Math.hypot(sat.x - centre.x, sat.y - centre.y) > hubDist);
  }
  const tight = layoutRadial(hubs(30, 6), { width: 460, height: 460 });
  assert.ok(tight.hubs.every((hub) => hub.satellites.length < 6));
});

test("the layout is deterministic", () => {
  assert.deepEqual(layoutRadial(hubs(11, 3), { width: 640, height: 700 }), layoutRadial(hubs(11, 3), { width: 640, height: 700 }));
});

test("arcs and edge points are well formed", () => {
  assert.match(arcPath({ x: 0, y: 0 }, 10, 0, Math.PI / 2), /^M10 0 A10 10 0 0 1 0 10$/);
  assert.deepEqual(edgePoint({ x: 0, y: 0 }, { x: 10, y: 0 }, 4), { x: 4, y: 0 });
});

test("the ellipse sampler starts at the top and runs clockwise at equal arc length", () => {
  const { perimeter, at } = ellipseSampler(100, 50);
  const top = at(0);
  assert.ok(Math.abs(top.x) < 0.5 && Math.abs(top.y + 50) < 0.5);
  const quarter = at(perimeter / 4);
  assert.ok(Math.abs(quarter.x - 100) < 1 && Math.abs(quarter.y) < 1);
});

test("focus tiles never overlap, stay inside, and keep their group order", () => {
  for (const [width, height] of [[460, 560], [620, 700], [700, 820]]) {
    assert.equal(focusFits(width, height), true);
    const box = { width, height };
    const layout = layoutFocus(
      [
        { kind: "office", count: 3 },
        { kind: "cabinet", count: 23 },
        { kind: "party", count: 5 },
        { kind: "news", count: 9 },
      ],
      box,
    );
    const rects = layout.tiles.map((tile) => ({ x: tile.x - layout.tile.w / 2, y: tile.y - layout.portrait / 2, w: layout.tile.w, h: layout.tile.h }));
    for (let i = 0; i < rects.length; i += 1) {
      assert.ok(rects[i].x >= 0 && rects[i].y >= 0 && rects[i].x + rects[i].w <= width && rects[i].y + rects[i].h <= height, `tile ${i} inside`);
      for (let j = i + 1; j < rects.length; j += 1) assert.equal(rectsOverlap(rects[i], rects[j]), false, `tiles ${i} and ${j} at ${width}x${height}`);
    }
    assert.deepEqual([...new Set(layout.tiles.map((tile) => tile.kind))], ["office", "cabinet", "party", "news"]);
    const hidden = layout.headings.reduce((sum, heading) => sum + heading.hidden, 0);
    assert.equal(layout.tiles.length + hidden, 40);
    assert.ok(layout.headings.every((heading) => heading.shown >= 1));
  }
});

test("the first group is centred at the top", () => {
  const layout = layoutFocus([{ kind: "office", count: 3 }, { kind: "news", count: 2 }], { width: 600, height: 700 });
  const office = layout.tiles.filter((tile) => tile.kind === "office");
  assert.ok(Math.abs(office[1].x - 300) < 4 && office[1].y < 350);
});

test("a small box falls back to the list", () => {
  assert.equal(focusFits(390, 600), false);
  assert.equal(focusFits(600, 300), false);
});
