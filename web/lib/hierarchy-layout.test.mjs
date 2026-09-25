import { test } from "node:test";
import assert from "node:assert/strict";

import {
  arcPath,
  circleHitsRect,
  edgePoint,
  ellipseSampler,
  focusSidesFits,
  FOCUS_CHAIN_MAX,
  layoutFocusSides,
  layoutOrgChart,
  orgChartFits,
  rectsOverlap,
  spread,
} from "./hierarchy-layout.ts";

const names = ["Eelco Heinen", "Stientje van Veldhoven-van der Meer", "Sandra Palmen-Schlangen", "Tom Berendsen"];
const roles = ["Minister van Financiën", "Staatssecretaris Herstel Toeslagen", null, "Minister van Buitenlandse Zaken"];

/** Eleven ministries in six groups, with two to four people each, as in the cabinet. */
const cabinet = () =>
  [2, 2, 1, 3, 2, 1].flatMap((size, group) =>
    Array.from({ length: size }, (_, i) => ({
      id: `h${group}-${i}`,
      group: `g${group}`,
      weight: 1,
      label: i % 2 ? "Financiën" : "BZK",
      members: Array.from({ length: 2 + ((group + i) % 3) }, (_, m) => ({ id: `p${group}-${i}-${m}`, name: names[m], role: roles[m] })),
    })),
  );

const chamber = () =>
  [26, 22, 20, 19, 18, 9, 7, 7, 3, 3, 3, 3, 3, 3, 2, 1, 1].map((seats, i) => ({
    id: `f${i}`,
    group: `f${i}`,
    weight: seats,
    label: i === 7 ? "Groep Markuszower" : "PVV",
    members: [{ id: `l${i}`, name: names[i % names.length], role: "Fractievoorzitter" }],
  }));

const circles = (layout) => [
  { ...layout.centre, r: layout.ring.r + layout.ring.width / 2, kind: "centre" },
  ...layout.hubs.map((hub) => ({ ...hub, kind: "hub" })),
  ...layout.members.map((member) => ({ ...member, kind: "member" })),
];

const SIZES = [
  [629, 690],
  [480, 440],
  [820, 560],
  [1180, 720],
];

test("the chart needs room; smaller boxes stack", () => {
  assert.equal(orgChartFits(629, 690), true);
  assert.equal(orgChartFits(440, 640), false);
  assert.equal(orgChartFits(700, 380), false);
});

test("no two circles overlap and everything stays inside the box", () => {
  for (const [input, ring] of [
    [cabinet(), "groups"],
    [chamber(), "weight"],
  ]) {
    for (const [width, height] of SIZES) {
      const layout = layoutOrgChart(input, { width, height, ring });
      const all = circles(layout);
      for (let i = 0; i < all.length; i += 1) {
        const a = all[i];
        assert.ok(a.x - a.r >= 0 && a.y - a.r >= 0 && a.x + a.r <= width && a.y + a.r <= height, `${a.kind} ${a.id ?? ""} inside at ${width}x${height}`);
        for (let j = i + 1; j < all.length; j += 1) {
          const b = all[j];
          assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r, `${a.kind} ${a.id ?? ""} and ${b.kind} ${b.id ?? ""} apart at ${width}x${height} (${ring})`);
        }
      }
    }
  }
});

test("labels never overlap each other, a circle, or the box edge", () => {
  for (const [input, ring] of [
    [cabinet(), "groups"],
    [chamber(), "weight"],
  ]) {
    for (const [width, height] of SIZES) {
      const layout = layoutOrgChart(input, { width, height, ring });
      const labels = layout.members.filter((member) => member.label);
      const rects = [...labels.map((member) => member.label), ...layout.hubs.filter((hub) => hub.chip).map((hub) => hub.chip)];
      for (let i = 0; i < rects.length; i += 1) {
        const r = rects[i];
        assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= width && r.y + r.h <= height, `label ${i} inside at ${width}x${height}`);
        for (let j = i + 1; j < rects.length; j += 1) assert.equal(rectsOverlap(r, rects[j]), false, `labels ${i} and ${j} at ${width}x${height} (${ring})`);
      }
      for (const member of labels) {
        for (const circle of circles(layout)) {
          if (circle.id === member.id) continue;
          assert.equal(circleHitsRect(circle, circle.r, member.label), false, `label of ${member.id} clear of ${circle.kind} ${circle.id ?? ""}`);
        }
      }
      // Most people get a label; the rest keep their tooltip (and the view offers full screen).
      const share = Math.min(width, height) < 560 ? 0.55 : 0.7;
      assert.ok(labels.length >= layout.members.length * share, `${labels.length} of ${layout.members.length} labelled at ${width}x${height} (${ring})`);
    }
  }
});

test("the cabinet places everyone at a roomy size and its ring has one segment per group", () => {
  const input = cabinet();
  const layout = layoutOrgChart(input, { width: 1180, height: 720, ring: "groups" });
  assert.equal(layout.members.length, input.reduce((sum, hub) => sum + hub.members.length, 0));
  assert.equal(new Set(layout.segments.map((segment) => segment.group)).size, 6);
  for (const segment of layout.segments) assert.ok(segment.end > segment.start);
  // Each hub's bar leaves the ring inside its own group's segment.
  for (const hub of layout.hubs) {
    const segment = layout.segments.find((entry) => entry.group === hub.group);
    const angle = Math.atan2(hub.bar.a.y - layout.centre.y, hub.bar.a.x - layout.centre.x);
    const within = [-2, -1, 0, 1, 2].some((k) => angle + k * 2 * Math.PI >= segment.start - 0.01 && angle + k * 2 * Math.PI <= segment.end + 0.01);
    assert.ok(within, `${hub.id} leaves its segment`);
  }
});

test("chamber segments follow the seats and heavier hubs are bigger", () => {
  const input = chamber();
  const layout = layoutOrgChart(input, { width: 820, height: 640, ring: "weight" });
  const total = input.reduce((sum, hub) => sum + hub.weight, 0);
  const span = (segment) => segment.end - segment.start;
  const d66 = span(layout.segments[0]);
  const small = span(layout.segments[16]);
  assert.ok(Math.abs(d66 / (2 * Math.PI) - 26 / total) < 0.02);
  assert.ok(d66 > small * 10);
  assert.ok(layout.hubs[0].r > layout.hubs[16].r);
});

test("the layout is deterministic", () => {
  const box = { width: 640, height: 700, ring: "groups" };
  assert.deepEqual(layoutOrgChart(cabinet(), box), layoutOrgChart(cabinet(), box));
});

test("spread keeps order and the minimum gap on a closed track", () => {
  const out = spread([0, 1, 2, 50], 100, () => 10);
  for (let i = 0; i < out.length; i += 1) {
    const next = i === out.length - 1 ? out[0] + 100 : out[i + 1];
    assert.ok(next - out[i] >= 9.9, `gap after ${i}`);
  }
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

const sideInput = (n) => ({
  head: { name: "VVD", role: "8 in het kabinet" },
  members: Array.from({ length: n }, (_, i) => ({ name: names[i % names.length], role: roles[i % roles.length] })),
});

test("the focus puts two heads left and right of the centre, chains above and below", () => {
  for (const [width, height] of [[629, 560], [820, 420], [1180, 700]]) {
    assert.equal(focusSidesFits(width, height), true);
    const layout = layoutFocusSides([sideInput(7), sideInput(2)], { width, height });
    const [left, right] = layout.sides;
    assert.ok(left.head.x < layout.centre.x && right.head.x > layout.centre.x);
    assert.equal(left.head.y, layout.centre.y);
    assert.ok(left.chain.length <= FOCUS_CHAIN_MAX && left.chain.length >= 2, `left chain at ${width}x${height}`);
    assert.equal(left.hidden, 7 - left.chain.length);
    assert.ok(left.more);
    assert.equal(right.chain.length, 2);
    assert.equal(right.hidden, 0);
    // First above, then below; the chain bends back toward the centre.
    assert.ok(left.chain[0].y < left.head.y && left.chain[1].y > left.head.y);
    const second = left.chain.find((node) => node.index === 2);
    if (second) assert.ok(second.y < left.chain[0].y && second.x > left.chain[0].x);
    // Labels on the outer side.
    for (const node of [left.head, ...left.chain]) if (node.label && node.label.align !== "middle") assert.equal(node.label.align, "end");
    for (const node of [right.head, ...right.chain]) if (node.label && node.label.align !== "middle") assert.equal(node.label.align, "start");
    const nodes = [layout.centre, left.head, right.head, ...left.chain, ...right.chain];
    for (let i = 0; i < nodes.length; i += 1)
      for (let j = i + 1; j < nodes.length; j += 1) assert.ok(Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) >= nodes[i].r + nodes[j].r, `nodes ${i} ${j}`);
    const rects = [left.head, right.head, ...left.chain, ...right.chain].map((node) => node.label).filter(Boolean);
    for (let i = 0; i < rects.length; i += 1) {
      assert.ok(rects[i].x >= 0 && rects[i].x + rects[i].w <= width, `label ${i} inside`);
      for (let j = i + 1; j < rects.length; j += 1) assert.equal(rectsOverlap(rects[i], rects[j]), false);
    }
  }
});

test("the focus stacks below the side-by-side width", () => {
  assert.equal(focusSidesFits(390, 700), false);
  assert.equal(focusSidesFits(700, 300), false);
});
