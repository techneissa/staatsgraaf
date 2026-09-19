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

import { clusterHalfSize, glyphFootprint } from "./graph.ts";
import { clusterFocus, posePosition, sectorPose } from "./pose.ts";


/** A dot grid against a round mark: the mark's centre in the grid's frame, across the ring and along it. */
function gridOverlapsMark(grid, half, mark, foot) {
  const cos = Math.cos(grid.angle);
  const sin = Math.sin(grid.angle);
  const across = mark.x * cos + mark.y * sin - grid.radius;
  const along = -mark.x * sin + mark.y * cos;
  return Math.abs(across) < half.halfHeight + foot - 0.01 && Math.abs(along) < half.halfWidth + foot - 0.01;
}

/** Two dot grids: on one ring they need their widths, on different rings their heights. */
function gridOverlapsGrid(a, halfA, b, halfB) {
  const across = Math.abs(a.radius - b.radius);
  const along = Math.abs(((b.angle - a.angle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * Math.min(a.radius, b.radius);
  return across < halfA.halfHeight + halfB.halfHeight - 0.01 && along < halfA.halfWidth + halfB.halfWidth - 0.01;
}

test("an open cluster unpacks into marks that overlap nothing and stay inside the reserved sector", () => {
  assert.ok(layout.clusters.length > 0);
  for (const cluster of layout.clusters) {
    const pose = sectorPose(layout, cluster.id);
    assert.ok(pose, cluster.id);
    const sector = layout.sectors.find((entry) => entry.id === cluster.sector);
    assert.ok(pose.outerRadius <= sector.outerRadius + 1e-6, `${cluster.id} reaches ${pose.outerRadius} past ${sector.outerRadius}`);
    // Every mark of the sector has a target: singles, the open members, and the other grids' dots.
    const sectorNodes = layout.nodes.filter((node) => node.sector === cluster.sector && !node.arch && node.collapsedInto === null);
    for (const node of sectorNodes) assert.ok(pose.target.has(node.id), `${cluster.id} leaves ${node.id} without a target`);
    // Full marks (singles and the open members) against each other and against the other grids.
    const full = sectorNodes.filter((node) => !node.cluster || node.cluster === cluster.id).map((node) => {
      const at = pose.target.get(node.id);
      return { id: node.id, x: Math.cos(at.angle) * at.radius, y: Math.sin(at.angle) * at.radius, foot: glyphFootprint(node) };
    });
    for (let i = 0; i < full.length; i += 1) {
      for (let j = i + 1; j < full.length; j += 1) {
        const distance = Math.hypot(full[i].x - full[j].x, full[i].y - full[j].y);
        assert.ok(distance >= full[i].foot + full[j].foot - 0.01, `${cluster.id}: ${full[i].id} overlaps ${full[j].id}`);
      }
    }
    const grids = [...pose.clusterTarget.entries()].map(([otherId, at]) => ({ id: otherId, ...at, half: clusterHalfSize(layout.clusterById.get(otherId).members.length) }));
    for (const grid of grids) {
      for (const mark of full) {
        assert.ok(!gridOverlapsMark(grid, grid.half, mark, mark.foot), `${cluster.id}: grid ${grid.id} overlaps ${mark.id}`);
      }
      for (const other of grids) {
        if (other.id <= grid.id) continue;
        assert.ok(!gridOverlapsGrid(grid, grid.half, other, other.half), `${cluster.id}: grid ${grid.id} overlaps grid ${other.id}`);
      }
    }
    // Members keep their name order along the ring.
    const angles = cluster.members.map((id) => pose.target.get(id)).filter((at, i, all) => at.radius === all[0].radius).map((at) => at.angle);
    for (let i = 1; i < angles.length; i += 1) assert.ok(angles[i] > angles[i - 1], `${cluster.id} members out of order`);
  }
});

test("scalar zero is exactly the rest layout and the interpolation stays on the ring", () => {
  const cluster = layout.clusters[0];
  const pose = sectorPose(layout, cluster.id);
  for (const node of layout.nodes) {
    if (node.sector !== cluster.sector) continue;
    const rest = posePosition(node, pose.target.get(node.id), 0);
    assert.deepEqual(rest, { x: node.x, y: node.y });
    const mid = posePosition(node, pose.target.get(node.id), 0.5);
    const at = pose.target.get(node.id);
    if (!at) continue;
    const radius = Math.hypot(mid.x, mid.y);
    assert.ok(radius >= Math.min(node.radius, at.radius) - 1e-6 && radius <= Math.max(node.radius, at.radius) + 1e-6);
  }
  const focus = clusterFocus(cluster, pose);
  assert.ok(focus.reach >= MIN_REACH && focus.reach <= MAX_REACH);
});

test("the pose is deterministic and unknown clusters give null", () => {
  const cluster = layout.clusters[layout.clusters.length - 1];
  const a = sectorPose(layout, cluster.id);
  const b = sectorPose(layout, cluster.id);
  assert.deepEqual([...a.target.entries()], [...b.target.entries()]);
  assert.equal(sectorPose(layout, "cluster:nope:nope"), null);
});
