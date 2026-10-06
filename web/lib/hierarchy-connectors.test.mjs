import { test } from "node:test";
import assert from "node:assert/strict";

import { chartConnectors, distanceToPolyline, memberKey, pointAt, segmentSpans, spokeCurve } from "./hierarchy-connectors.ts";
import { layoutOrgChart } from "./hierarchy-layout.ts";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const nums = (d) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

test("a spoke on the radius is a gently bowed line from the ring to under the hub's outline", () => {
  const centre = { x: 100, y: 100 };
  const hub = { x: 100, y: 20, r: 20 };
  const spoke = spokeCurve({ centre, ringOuter: 50, angle: -Math.PI / 2, hub, inset: 4 });
  assert.match(spoke.d, /^M[\d. -]+ C[\d. -]+$/);
  const [first, last] = [spoke.points[0], spoke.points[spoke.points.length - 1]];
  assert.ok(Math.abs(dist(centre, first) - 49.4) < 0.2, "starts a hair inside the ring's edge");
  assert.ok(Math.abs(dist(hub, last) - 16) < 0.2, "ends inside the outline of the hub");
  // The bow is small: the line never strays more than 5 px from the chord.
  for (const p of spoke.points) assert.ok(Math.abs(p.x - 100) <= 5.5, `bow stays small (${p.x})`);
});

test("a spoke gives the same line for the same input, and another for another seed", () => {
  const args = { centre: { x: 0, y: 0 }, ringOuter: 60, angle: -1.2, hub: { x: 100, y: -140, r: 24 }, inset: 3 };
  assert.deepEqual(spokeCurve(args), spokeCurve({ ...args }));
  assert.notEqual(spokeCurve({ ...args, angle: -Math.PI / 2, hub: { x: 0, y: -140, r: 24 }, seed: "a" }).d, spokeCurve({ ...args, angle: -Math.PI / 2, hub: { x: 0, y: -140, r: 24 }, seed: "b" }).d);
});

test("a spoke off the radius leaves the ring square and arrives heading for the hub's centre", () => {
  const centre = { x: 0, y: 0 };
  const hub = { x: 160, y: -120, r: 24 };
  const angle = -Math.PI / 2 + 0.2;
  const spoke = spokeCurve({ centre, ringOuter: 60, angle, hub, inset: 3 });
  assert.match(spoke.d, /^M[\d. -]+ C[\d. -]+$/);
  const p = spoke.points;
  // The first stretch runs along the radius.
  const first = { x: p[1].x - p[0].x, y: p[1].y - p[0].y };
  const along = (first.x * Math.cos(angle) + first.y * Math.sin(angle)) / Math.hypot(first.x, first.y);
  assert.ok(along > 0.97, `leaves radially (${along})`);
  // The last stretch points at the hub's centre.
  const end = p[p.length - 1];
  const prev = p[p.length - 2];
  const heading = { x: end.x - prev.x, y: end.y - prev.y };
  const toCentre = { x: hub.x - end.x, y: hub.y - end.y };
  const cos = (heading.x * toCentre.x + heading.y * toCentre.y) / (Math.hypot(heading.x, heading.y) * Math.hypot(toCentre.x, toCentre.y));
  assert.ok(cos > 0.98, `arrives toward the centre (${cos})`);
  assert.ok(Math.abs(spoke.length - p.slice(1).reduce((sum, q, i) => sum + dist(q, p[i]), 0)) < 1);
  assert.deepEqual(pointAt(p, 0), p[0]);
  assert.ok(dist(pointAt(p, 1), p[p.length - 1]) < 1e-9);
  assert.ok(distanceToPolyline(pointAt(p, 0.5), p) < 1e-9);
});

test("a connector is a closed brush outline with a centreline to reveal it by", () => {
  const layout = layoutOrgChart(chamber(), { width: 820, height: 560, ring: "weight" });
  const connectors = chartConnectors(layout);
  for (const connector of [...connectors.hubs.values(), ...connectors.members.values()]) {
    assert.match(connector.d, /^M[\d. -]+(?: [QLC][\d. -]+)+ Z$/);
    assert.ok(!/NaN|Infinity/.test(connector.d + connector.centre));
    assert.ok(connector.widest > 0 && connector.length >= 1);
    assert.ok(connector.bounds.w > 0 && connector.bounds.h > 0);
  }
});

test("segment spans follow the weights, with a floor, and always add up", () => {
  const weights = [26, 22, 20, 19, 18, 9, 7, 7, 3, 3, 3, 3, 3, 3, 2, 1, 1];
  const total = Math.PI * 2;
  const floor = 0.045;
  const spans = segmentSpans(weights, total, floor);
  assert.ok(Math.abs(spans.reduce((a, b) => a + b, 0) - total) < 1e-9);
  spans.forEach((span) => assert.ok(span >= floor - 1e-9));
  // Above the floor the order of the weights holds, and the ratio between two big ones is kept.
  assert.ok(spans[0] > spans[1] && spans[1] > spans[2]);
  assert.ok(Math.abs(spans[0] / spans[1] - 26 / 22) < 1e-9);
  // Weights that need no floor are left proportional.
  const even = segmentSpans([1, 1, 2], total, 0.1);
  assert.ok(Math.abs(even[2] / even[0] - 2) < 1e-9);
  // Too many for the floor: equal shares.
  assert.deepEqual(segmentSpans([1, 5, 9], 3, 2), [1, 1, 1]);
  assert.deepEqual(segmentSpans([], 3, 2), []);
});

const names = ["Eelco Heinen", "Stientje van Veldhoven-van der Meer", "Sandra Palmen-Schlangen", "Tom Berendsen"];
const cabinet = () =>
  [2, 2, 1, 3, 2, 1].flatMap((size, group) =>
    Array.from({ length: size }, (_, i) => ({
      id: `h${group}-${i}`,
      group: `g${group}`,
      weight: 1,
      label: "BZK",
      members: Array.from({ length: 2 + ((group + i) % 3) }, (_, m) => ({ id: `p${group}-${i}-${m}`, name: names[m], role: "Minister" })),
    })),
  );
const chamber = () =>
  [26, 22, 20, 19, 18, 9, 7, 7, 3, 3, 3, 3, 3, 3, 2, 1, 1].map((seats, i) => ({
    id: `f${i}`,
    group: `f${i}`,
    weight: seats,
    label: "PVV",
    members: [{ id: `l${i}`, name: names[i % names.length], role: "Fractievoorzitter" }],
  }));

test("every line has a path, ends under its nodes' outlines and keeps clear of other nodes", () => {
  for (const [input, ring] of [
    [cabinet(), "groups"],
    [chamber(), "weight"],
  ]) {
    for (const [width, height] of [[629, 690], [480, 440], [820, 560], [1180, 720], [1440, 860]]) {
      const layout = layoutOrgChart(input, { width, height, ring });
      const connectors = chartConnectors(layout);
      const ringOuter = layout.ring.r + layout.ring.width / 2;
      assert.equal(connectors.hubs.size, layout.hubs.length);
      assert.equal(connectors.members.size, layout.members.length);
      for (const hub of layout.hubs) {
        const connector = connectors.hubs.get(hub.id);
        assert.ok(connector && connector.d.startsWith("M") && connector.length > 10, `${hub.id} has a spoke`);
        const points = hub.spoke.points;
        assert.ok(Math.abs(dist(layout.centre, points[0]) - (ringOuter - 0.6)) < 0.2, "spoke starts at the ring");
        assert.ok(Math.abs(dist(hub, points[points.length - 1]) - (hub.r - layout.stroke.hub / 2)) < 0.3, "spoke ends under the hub's outline");
        // The spoke stays clear of every other hub and every member.
        for (const other of layout.hubs) {
          if (other === hub) continue;
          assert.ok(distanceToPolyline(other, points) >= other.r + layout.stroke.hubBar / 2, `${hub.id} spoke clear of hub ${other.id} at ${width}x${height} (${ring})`);
        }
        for (const member of layout.members) {
          assert.ok(distanceToPolyline(member, points) >= member.r + layout.stroke.hubBar / 2, `${hub.id} spoke clear of ${member.id} at ${width}x${height} (${ring})`);
        }
        // The spoke stays inside the box.
        for (const point of points) assert.ok(point.x >= 0 && point.y >= 0 && point.x <= width && point.y <= height);
      }
      // No two spokes cross.
      for (const a of layout.hubs) {
        for (const b of layout.hubs) {
          if (a.id >= b.id) continue;
          let closest = Infinity;
          for (const p of a.spoke.points) closest = Math.min(closest, distanceToPolyline(p, b.spoke.points));
          assert.ok(closest >= layout.stroke.hubBar - 0.5, `spokes of ${a.id} and ${b.id} do not touch at ${width}x${height} (${ring}): ${closest.toFixed(1)}`);
        }
      }
      for (const member of layout.members) {
        const connector = connectors.members.get(memberKey(member.hub, member.id));
        assert.ok(connector && connector.length >= 1, `${member.id} has a bar`);
      }
    }
  }
});
