import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CORE_RADIUS, glyphFootprint, hydrateLayout } from "./graph.ts";
import { MAX_HALO, expansionFor, framePose, frameFor, posePosition } from "./pose.ts";

const bundle = JSON.parse(readFileSync(new URL("../public/graph.json", import.meta.url), "utf8"));
// The client's layout: hydrated from the shipped coordinates, never packed here.
const layout = hydrateLayout(bundle);

/** A spread of focus nodes: one per sector, plus the busiest node overall. */
const samples = (() => {
  const picked = [];
  const seen = new Set();
  for (const node of layout.nodes) {
    if (node.hidden || seen.has(node.sector)) continue;
    seen.add(node.sector);
    picked.push(node);
  }
  const busiest = [...layout.nodes]
    .filter((node) => !node.hidden)
    .sort((a, b) => (layout.adjacency.get(b.id)?.length ?? 0) - (layout.adjacency.get(a.id)?.length ?? 0))[0];
  if (busiest) picked.push(busiest);
  return picked;
})();

/** Position of every visible mark at a given open scalar. */
function posed(expansion, open) {
  const points = [];
  for (const node of layout.nodes) {
    if (node.hidden && !expansion.target.has(node.id)) continue;
    points.push({ node, ...posePosition(node, expansion.target.get(node.id), open) });
  }
  return points;
}

test("an expansion is a pure function of the layout and the focus", () => {
  for (const node of samples) {
    const a = expansionFor(layout, node.id);
    const b = expansionFor(layout, node.id);
    assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), node.id);
  }
});

test("the halo never summons more than the cap and never summons the focus", () => {
  for (const node of samples) {
    const expansion = expansionFor(layout, node.id);
    if (!expansion) continue;
    assert.ok(expansion.halo.length <= MAX_HALO, node.id);
    assert.ok(!expansion.halo.some((member) => member.id === node.id), node.id);
    const ids = new Set(expansion.halo.map((member) => member.id));
    assert.equal(ids.size, expansion.halo.length, `${node.id} summons a mark twice`);
  }
});

test("at scalar zero every mark is exactly at rest", () => {
  for (const node of samples) {
    const expansion = expansionFor(layout, node.id);
    if (!expansion) continue;
    for (const { node: mark, x, y } of posed(expansion, 0)) {
      assert.equal(x, mark.x, mark.id);
      assert.equal(y, mark.y, mark.id);
    }
  }
});

test("the step back is uniform in angle and monotone in radius", () => {
  for (const node of samples) {
    const expansion = expansionFor(layout, node.id);
    if (!expansion || expansion.push === 0) continue;
    const halo = new Set(expansion.halo.map((member) => member.id));
    for (const [id, target] of expansion.target) {
      if (halo.has(id)) continue;
      const mark = layout.byId.get(id);
      assert.equal(target.angle, mark.angle, `${id} changed angle while stepping back`);
      assert.ok(
        Math.abs(target.radius - (mark.radius + expansion.push)) < 1e-9,
        `${id} stepped back by a different amount`,
      );
      assert.ok(mark.radius > expansion.pushFrom, `${id} stepped back from inside the focused tier`);
    }
    for (const mark of layout.nodes) {
      if (mark.hidden || expansion.target.has(mark.id) || mark.id === node.id) continue;
      assert.ok(mark.radius <= expansion.pushFrom + 1e-9, `${mark.id} beyond the tier did not step back`);
    }
  }
});

test("an open halo overlaps nothing", () => {
  for (const node of samples) {
    const expansion = expansionFor(layout, node.id);
    if (!expansion) continue;
    const points = posed(expansion, 1);
    const halo = new Set(expansion.halo.map((member) => member.id));
    const haloPoints = points.filter((point) => halo.has(point.node.id));
    for (let i = 0; i < haloPoints.length; i += 1) {
      for (const other of points) {
        if (other.node.id === haloPoints[i].node.id) continue;
        if (!halo.has(other.node.id) && other.node.id === node.id) continue;
        const distance = Math.hypot(haloPoints[i].x - other.x, haloPoints[i].y - other.y);
        const needed = glyphFootprint(haloPoints[i].node) + glyphFootprint(other.node);
        assert.ok(
          distance >= needed - 0.01,
          `${node.id}: ${haloPoints[i].node.id} overlaps ${other.node.id} (${distance.toFixed(2)} < ${needed.toFixed(2)})`,
        );
      }
    }
  }
});

test("nothing enters the core while a halo is open", () => {
  for (const node of samples) {
    const expansion = expansionFor(layout, node.id);
    if (!expansion) continue;
    for (const point of posed(expansion, 1)) {
      const reach = Math.hypot(point.x, point.y) - glyphFootprint(point.node);
      assert.ok(reach >= CORE_RADIUS - 0.01, `${point.node.id} enters the core`);
    }
  }
});

test("a summoned mark travels along an arc, never through the core", () => {
  for (const node of samples.slice(0, 6)) {
    const expansion = expansionFor(layout, node.id);
    if (!expansion) continue;
    for (const member of expansion.halo) {
      const mark = layout.byId.get(member.id);
      for (let step = 0; step <= 10; step += 1) {
        const point = posePosition(mark, expansion.target.get(member.id), step / 10);
        assert.ok(
          Math.hypot(point.x, point.y) >= Math.min(mark.radius, member.radius) - 0.01,
          `${member.id} dips inside both its endpoints mid-flight`,
        );
      }
    }
  }
});

test("the frame grows with the step back and returns", () => {
  const expansion = samples.map((node) => expansionFor(layout, node.id)).find((entry) => entry && entry.push > 0);
  assert.ok(expansion, "no sample needs a step back");
  assert.equal(framePose(layout, expansion, 0), layout.frameRadius);
  assert.ok(framePose(layout, expansion, 1) > layout.frameRadius);
  assert.equal(framePose(layout, null, 1), layout.frameRadius);
});

test("the auto frame keeps the core and the focus on screen", () => {
  const half = layout.viewBox.width / 2;
  for (const node of samples) {
    const view = frameFor(layout, { angle: node.angle, radius: node.radius, reach: 120 }, 0);
    const project = (x, y) => ({ x: x * view.k + view.x, y: y * view.k + view.y });
    const core = project(0, 0);
    const focus = project(node.x, node.y);
    assert.ok(Math.hypot(core.x, core.y) <= half, `${node.id} pushes the core off screen`);
    assert.ok(Math.hypot(focus.x, focus.y) <= half, `${node.id} is framed off screen`);
    assert.ok(view.k >= 1 && view.k <= 3, `${node.id} zoom ${view.k}`);
  }
});
