import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  GRAPH_LAYOUT,
  HUB_RADIUS,
  LABEL_CLEARANCE,
  glyphFootprint,
  computeLayout,
} from "./graph.ts";

const bundle = JSON.parse(
  readFileSync(new URL("../public/graph.json", import.meta.url), "utf8"),
);

const layout = computeLayout(bundle);

test("the shipped bundle is built with the current layout version", () => {
  assert.equal(bundle.layout, GRAPH_LAYOUT);
});

test("every non-hub node is laid out exactly once", () => {
  const expected = bundle.nodes.filter((node) => node.id !== bundle.hub?.id);
  assert.equal(layout.nodes.length, expected.length);
  const ids = new Set(layout.nodes.map((node) => node.id));
  assert.equal(ids.size, expected.length);
  for (const node of expected) assert.ok(ids.has(node.id), node.id);
});

test("no two glyph footprints overlap", () => {
  const worst = { distance: Infinity, pair: null };
  let overlaps = 0;
  const nodes = layout.nodes;
  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    const fa = glyphFootprint(a);
    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = nodes[j];
      const fb = glyphFootprint(b);
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const needed = fa + fb;
      if (distance < needed - 0.01) {
        overlaps += 1;
        const margin = distance - needed;
        if (margin < worst.distance) {
          worst.distance = margin;
          worst.pair = [a.id, b.id, distance, needed];
        }
      }
    }
  }
  assert.equal(
    overlaps,
    0,
    `overlapping pairs: ${overlaps}, worst: ${JSON.stringify(worst.pair)}`,
  );
});

test("no glyph enters the hub clearance band", () => {
  const violations = [];
  for (const node of layout.nodes) {
    const reach = Math.hypot(node.x, node.y) - glyphFootprint(node);
    if (reach < HUB_RADIUS - 0.01) violations.push([node.id, reach]);
  }
  assert.deepEqual(violations, []);
});

const labelBox = (sector) => {
  const mid = (sector.startAngle + sector.endAngle) / 2;
  const halfW = sector.labelWidth / 2;
  const halfH = sector.labelHeight / 2;
  return {
    cx: Math.cos(mid) * sector.labelRadius,
    cy: Math.sin(mid) * sector.labelRadius,
    halfW,
    halfH,
    reach:
      Math.abs(Math.cos(mid)) * sector.labelRadius + halfW,
    reachY:
      Math.abs(Math.sin(mid)) * sector.labelRadius + halfH,
  };
};

const rectCircleGap = (box, x, y) => {
  const dx = Math.max(Math.abs(x - box.cx) - box.halfW, 0);
  const dy = Math.max(Math.abs(y - box.cy) - box.halfH, 0);
  return Math.hypot(dx, dy);
};

test("sector labels clear every glyph footprint and every other label", () => {
  const boxes = layout.sectors.map(labelBox);
  const issues = [];
  layout.sectors.forEach((sector, index) => {
    for (const node of layout.nodes) {
      const gap = rectCircleGap(boxes[index], node.x, node.y) - glyphFootprint(node);
      if (gap < 0) issues.push([sector.branch, node.id, gap]);
    }
  });
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (
        Math.abs(a.cx - b.cx) < a.halfW + b.halfW &&
        Math.abs(a.cy - b.cy) < a.halfH + b.halfH
      ) {
        issues.push([layout.sectors[i].branch, layout.sectors[j].branch, "label-label"]);
      }
    }
  }
  assert.deepEqual(issues, []);
});

test("labels and every glyph sit inside the viewBox", () => {
  const half = layout.viewBox.width / 2;
  let reach = HUB_RADIUS;
  for (const node of layout.nodes) {
    reach = Math.max(reach, Math.hypot(node.x, node.y) + glyphFootprint(node));
  }
  assert.ok(reach <= half + 0.01, "glyphs leave the viewBox");
  for (const sector of layout.sectors) {
    const box = labelBox(sector);
    const mid = (sector.startAngle + sector.endAngle) / 2;
    const support = box.halfW * Math.abs(Math.cos(mid)) + box.halfH * Math.abs(Math.sin(mid));
    assert.ok(
      sector.labelRadius >= reach + support + LABEL_CLEARANCE - 0.01,
      `${sector.branch} label radius too small`,
    );
    assert.ok(box.reach <= half + 0.01, `${sector.branch} label leaves the viewBox horizontally`);
    assert.ok(box.reachY <= half + 0.01, `${sector.branch} label leaves the viewBox vertically`);
  }
});

test("sector counts match the bundle and cover every node", () => {
  const total = layout.sectors.reduce((sum, sector) => sum + sector.count, 0);
  assert.equal(total, bundle.nodes.length - 1);
  for (const sector of layout.sectors) {
    assert.ok(sector.count > 0);
    assert.ok(sector.endAngle > sector.startAngle);
    for (const sub of sector.subSectors) {
      assert.ok(sub.endAngle > sub.startAngle);
      assert.ok(sub.startAngle >= sector.startAngle - 0.0001);
      assert.ok(sub.endAngle <= sector.endAngle + 0.0001);
    }
  }
});

test("the layout is deterministic", () => {
  const again = computeLayout(bundle);
  const pick = (nodes) =>
    nodes.map((node) => [node.id, node.x, node.y, node.angle, node.radius]);
  assert.deepEqual(pick(again.nodes), pick(layout.nodes));
  assert.equal(again.maxRadius, layout.maxRadius);
  assert.equal(again.labelRadius, layout.labelRadius);
});
