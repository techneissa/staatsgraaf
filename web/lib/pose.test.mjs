import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { hydrateLayout } from "./graph.ts";
import { MAX_REACH, MIN_REACH, focusReach, frameFor } from "./pose.ts";

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

test("the reach of a focus covers its farthest relation and stays bounded", () => {
  for (const node of samples) {
    const reach = focusReach(layout, node.id);
    assert.ok(reach >= MIN_REACH && reach <= MAX_REACH, `${node.id} reach ${reach}`);
    for (const id of layout.adjacency.get(node.id) ?? []) {
      const other = layout.byId.get(id);
      const distance = Math.hypot(other.x - node.x, other.y - node.y);
      if (distance + 40 <= MAX_REACH) assert.ok(reach >= distance, `${node.id} does not reach ${id}`);
    }
  }
  assert.equal(focusReach(layout, "org:does-not-exist"), MIN_REACH);
});

test("a filtered branch does not stretch the reach", () => {
  const branches = new Set(layout.nodes.map((node) => node.branch));
  for (const node of samples) {
    const others = new Set([...branches].filter((branch) => branch !== node.branch));
    assert.ok(focusReach(layout, node.id, others) <= focusReach(layout, node.id));
  }
});

test("the auto frame keeps the core and the focus on screen", () => {
  const half = layout.viewBox.width / 2;
  for (const node of samples) {
    const reach = focusReach(layout, node.id);
    for (const rotation of [0, 1.3, -2.6]) {
      const view = frameFor(layout, { angle: node.angle, radius: node.radius, reach }, rotation, 1, 2.4);
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const project = (x, y) => ({ x: (x * cos - y * sin) * view.k + view.x, y: (x * sin + y * cos) * view.k + view.y });
      const core = project(0, 0);
      const focus = project(node.x, node.y);
      assert.ok(Math.hypot(core.x, core.y) <= half, `${node.id} pushes the core off screen`);
      assert.ok(Math.hypot(focus.x, focus.y) <= half, `${node.id} is framed off screen`);
      assert.ok(view.k >= 1 && view.k <= 2.4, `${node.id} zoom ${view.k}`);
    }
  }
  assert.deepEqual(frameFor(layout, null, 0), { k: 1, x: 0, y: 0 });
});
