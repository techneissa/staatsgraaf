import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ARCH_EK,
  ARCH_PITCH_EK,
  ARCH_PITCH_TK,
  ARCH_TK,
  CLUSTER_MIN,
  CORE_RADIUS,
  GLYPH_GAP,
  GRAPH_LAYOUT,
  GRAPH_SCHEMA,
  SECTOR_GUTTER,
  START_ANGLE,
  alignRotation,
  archParams,
  archSeats,
  clusterHalfSize,
  sectorArcs,
  edgeAlive,
  glyphFootprint,
  hydrateLayout,
  routedEdgePath,
  wrapPi,
} from "./graph.ts";
import { computeLayout } from "./graph-layout.ts";

const bundle = JSON.parse(readFileSync(new URL("../public/graph.json", import.meta.url), "utf8"));
/** The packer's output, recomputed here so the shipped coordinates can be checked against it. */
const layout = computeLayout(bundle);

/** Marks actually drawn at rest: not a collapsed child, not a chamber behind an arch. */
const drawn = layout.nodes.filter((node) => !node.hidden);

test("the shipped bundle is built with the current schema and layout version", () => {
  assert.equal(bundle.schema, GRAPH_SCHEMA);
  assert.equal(bundle.layout, GRAPH_LAYOUT);
});

test("hydrating the shipped bundle gives exactly the packer's layout", () => {
  // Build time is the truth: the client hydrates the file and never packs.
  const hydrated = hydrateLayout(bundle);
  assert.equal(hydrated.nodes.length, layout.nodes.length);
  for (const node of layout.nodes) {
    const same = hydrated.byId.get(node.id);
    assert.ok(same, `${node.id} missing from the bundle`);
    for (const key of ["x", "y", "angle", "radius", "tier", "sector", "hidden", "arch", "orbit", "collapsedInto", "cluster", "glyph", "glyphRadius"]) {
      assert.deepEqual(same[key], node[key], `${node.id}.${key}`);
    }
  }
  assert.deepEqual(hydrated.tiers, layout.tiers);
  assert.deepEqual(hydrated.sectors, layout.sectors);
  assert.deepEqual(hydrated.channels, layout.channels);
  assert.equal(hydrated.frame?.radius, layout.frameRadius);
  assert.deepEqual(hydrated.viewBox, layout.viewBox);
  assert.deepEqual([...hydrated.adjacency.get(layout.nodes[0].id)], [...layout.adjacency.get(layout.nodes[0].id)]);
  // Rest-state defaults are not shipped.
  const shipped = bundle.nodes.find((node) => !node.hidden && !node.orbit);
  assert.ok(shipped && !("glyph" in shipped) && !("collapsedInto" in shipped) && !("arch" in shipped), "wire nodes carry only what the client cannot derive");
});

test("every node outside the frame is laid out exactly once", () => {
  const expected = bundle.nodes.filter((node) => node.id !== bundle.hub?.id);
  assert.equal(layout.nodes.length, expected.length);
  const ids = new Set(layout.nodes.map((node) => node.id));
  assert.equal(ids.size, expected.length);
  for (const node of expected) assert.ok(ids.has(node.id), node.id);
});

test("no two drawn glyph footprints overlap", () => {
  let overlaps = 0;
  const worst = { margin: Infinity, pair: null };
  // Bucket by position so the check stays linear in the number of marks.
  const cell = 48;
  const grid = new Map();
  for (const node of drawn) {
    const key = `${Math.floor(node.x / cell)}|${Math.floor(node.y / cell)}`;
    const list = grid.get(key);
    if (list) list.push(node);
    else grid.set(key, [node]);
  }
  for (const node of drawn) {
    const gx = Math.floor(node.x / cell);
    const gy = Math.floor(node.y / cell);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const other of grid.get(`${gx + dx}|${gy + dy}`) ?? []) {
          if (other.id <= node.id) continue;
          const distance = Math.hypot(node.x - other.x, node.y - other.y);
          const needed = glyphFootprint(node) + glyphFootprint(other);
          const margin = distance - needed;
          if (margin < -0.01) {
            overlaps += 1;
            if (margin < worst.margin) {
              worst.margin = margin;
              worst.pair = [node.id, other.id, distance, needed];
            }
          }
        }
      }
    }
  }
  assert.equal(overlaps, 0, `overlapping pairs: ${overlaps}, worst: ${JSON.stringify(worst.pair)}`);
});

test("no glyph enters the core disc", () => {
  const violations = [];
  for (const node of drawn) {
    const reach = Math.hypot(node.x, node.y) - glyphFootprint(node);
    if (reach < CORE_RADIUS - 0.01) violations.push([node.id, reach]);
  }
  assert.deepEqual(violations, []);
});

test("every node sits in exactly one tier and one sector, and the counts add up", () => {
  const tierIds = new Set(layout.tiers.map((tier) => tier.id));
  const sectorIds = new Set(layout.sectors.map((sector) => sector.id));
  for (const node of layout.nodes) {
    assert.ok(tierIds.has(node.tier), `${node.id} has tier ${node.tier}`);
    assert.ok(sectorIds.has(node.sector), `${node.id} has sector ${node.sector}`);
  }
  // Sector counts cover every standing mark; collapsed children ride on a parent.
  const standing = layout.nodes.filter((node) => node.collapsedInto === null);
  const total = layout.sectors.reduce((sum, sector) => sum + sector.count, 0);
  assert.equal(total, standing.length);
  for (const sector of layout.sectors) assert.ok(sector.count > 0, `${sector.id} is empty`);
});

test("sectors of a tier never overlap and keep their gutter", () => {
  for (const tier of layout.tiers) {
    const sorted = [...tier.sectors].sort((a, b) => a.startAngle - b.startAngle);
    for (let i = 0; i < sorted.length; i += 1) {
      const sector = sorted[i];
      assert.ok(sector.endAngle > sector.startAngle, `${sector.id} has no span`);
      const next = sorted[(i + 1) % sorted.length];
      if (sorted.length === 1) continue;
      const gap = i === sorted.length - 1
        ? next.startAngle + 2 * Math.PI - sector.endAngle
        : next.startAngle - sector.endAngle;
      assert.ok(gap >= SECTOR_GUTTER - 0.001, `${sector.id} to ${next.id} gap ${gap}`);
    }
    const span = tier.sectors.reduce((sum, sector) => sum + (sector.endAngle - sector.startAngle), 0);
    if (tier.sectors.length > 0) {
      assert.ok(span <= 2 * Math.PI + 0.001, `${tier.id} spans more than a circle`);
    }
  }
});

test("tiers are ordered outward and never overlap", () => {
  const live = layout.tiers.filter((tier) => tier.count > 0);
  for (let i = 0; i < live.length - 1; i += 1) {
    assert.ok(
      live[i + 1].innerRadius > live[i].outerRadius,
      `${live[i].id} outer ${live[i].outerRadius} reaches ${live[i + 1].id} inner ${live[i + 1].innerRadius}`,
    );
  }
  for (const tier of live) {
    for (const node of layout.nodes) {
      if (node.tier !== tier.id || node.hidden) continue;
      assert.ok(node.radius >= tier.innerRadius - 0.01, `${node.id} sits inside its tier`);
      assert.ok(node.radius <= tier.outerRadius + 0.01, `${node.id} sits outside its tier`);
    }
  }
});


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

/** The items of a sector as packed: marks and cluster grids, with their half widths along the ring. */
function ringItemsOf(sector) {
  const items = [];
  for (const node of layout.nodes) {
    if (node.sector !== sector.id || node.hidden) continue;
    items.push({ id: node.id, angle: node.angle, radius: node.radius, halfWidth: glyphFootprint(node) });
  }
  for (const cluster of layout.clusters) {
    if (cluster.sector !== sector.id) continue;
    items.push({ id: cluster.id, angle: cluster.angle, radius: cluster.radius, halfWidth: clusterHalfSize(cluster.members.length).halfWidth });
  }
  return items;
}

test("every sector spreads its items evenly over each of its arcs", () => {
  for (const sector of layout.sectors) {
    for (const arc of sectorArcs(sector)) {
    const byRing = new Map();
    for (const item of ringItemsOf(sector)) {
      if (item.angle < arc.start - 1e-9 || item.angle > arc.end + 1e-9) continue;
      const key = item.radius.toFixed(2);
      const list = byRing.get(key);
      if (list) list.push(item);
      else byRing.set(key, [item]);
    }
    for (const [radius, ring] of byRing) {
      if (ring.length < 3) continue;
      const r = Number(radius);
      const sorted = [...ring].sort((a, b) => a.angle - b.angle);
      // Edge-to-edge gaps: items have different widths, so centre spacing is not the measure.
      const gaps = [];
      for (let i = 1; i < sorted.length; i += 1) {
        gaps.push((sorted[i].angle - sorted[i - 1].angle) * r - sorted[i].halfWidth - sorted[i - 1].halfWidth);
      }
      const first = gaps[0];
      // Angles are stored rounded to a thousandth of a radian, which is up to half a unit of arc here.
      const epsilon = 2e-3 * r + 0.02;
      for (const gap of gaps) {
        assert.ok(Math.abs(gap - first) < epsilon, `${sector.id} ring ${radius}: uneven gaps ${gap} and ${first}`);
      }
      const lead = (sorted[0].angle - arc.start) * r - sorted[0].halfWidth;
      const trail = (arc.end - sorted[sorted.length - 1].angle) * r - sorted[sorted.length - 1].halfWidth;
      assert.ok(Math.abs(lead - trail) < epsilon, `${sector.id} ring ${radius} is not centred in its arc`);
      assert.ok(Math.abs(lead - first / 2) < epsilon, `${sector.id} ring ${radius} leaves ${lead} at the start instead of ${first / 2}`);
    }
    }
  }
});

test("rings of a sector are filled to a comparable fraction of their capacity", () => {
  for (const sector of layout.sectors) {
    const items = ringItemsOf(sector);
    if (items.length < 20) continue;
    const span = sector.endAngle - sector.startAngle;
    const byRing = new Map();
    for (const item of items) {
      const key = item.radius.toFixed(2);
      byRing.set(key, (byRing.get(key) ?? 0) + 2 * item.halfWidth + GLYPH_GAP);
    }
    const fills = [...byRing.entries()].map(([radius, used]) => used / (span * Number(radius)));
    const min = Math.min(...fills);
    const max = Math.max(...fills);
    assert.ok(max - min < 0.2, `${sector.id} fills rings unevenly: ${min.toFixed(2)} to ${max.toFixed(2)}`);
  }
});

test("clusters hold every standing child of their parent in the sector, and hydrate exactly", () => {
  assert.ok(layout.clusters.length > 0);
  // The gemeenten are grouped by the provincie that oversees them, never by an invented parent.
  const gemeenteClusters = layout.clusters.filter((cluster) => cluster.sector === "gemeenten");
  assert.ok(gemeenteClusters.some((cluster) => cluster.kind === "oversight"));
  assert.ok(gemeenteClusters.every((cluster) => cluster.kind !== "children"));
  const hydrated = hydrateLayout(bundle);
  for (const cluster of layout.clusters) {
    assert.ok(cluster.members.length >= CLUSTER_MIN, cluster.id);
    for (const id of cluster.members) {
      const node = layout.byId.get(id);
      if (cluster.kind === "children") assert.equal(node.parent, cluster.parent);
      if (cluster.kind === "oversight") {
        assert.equal(node.parent, null);
        assert.ok(layout.edges.some((edge) => edge.type === "oversees" && edge.from === cluster.parent && edge.to === id), `${id} is not overseen by ${cluster.parent}`);
      }
      if (cluster.kind === "subtype") assert.equal(node.subtype, cluster.subtype);
      assert.equal(node.sector, cluster.sector);
      assert.equal(node.cluster, cluster.id);
      assert.ok(node.hidden);
    }
    if (cluster.kind === "children") {
      const sameParent = layout.nodes.filter((node) => node.parent === cluster.parent && node.sector === cluster.sector && node.collapsedInto === null && !node.arch);
      assert.equal(sameParent.length, cluster.members.length, `${cluster.id} misses children`);
    }
    const twin = hydrated.clusterById.get(cluster.id);
    assert.ok(twin, `${cluster.id} not on the wire`);
    for (const key of ["sector", "kind", "parent", "subtype", "angle", "radius", "rows", "cols", "x", "y"]) {
      assert.ok(Math.abs(Number(twin[key]) - Number(cluster[key])) < 1e-9 || twin[key] === cluster[key], `${cluster.id} ${key}`);
    }
    assert.deepEqual(twin.members, cluster.members);
    const sector = layout.sectors.find((entry) => entry.id === cluster.sector);
    assert.ok(sector.items.includes(cluster.id));
  }
  // A cluster grid never overlaps a drawn mark or another grid.
  for (const grid of layout.clusters) {
    const half = clusterHalfSize(grid.members.length);
    for (const node of drawn) {
      assert.ok(!gridOverlapsMark(grid, half, node, glyphFootprint(node)), `${grid.id} overlaps ${node.id}`);
    }
    for (const other of layout.clusters) {
      if (other.id <= grid.id) continue;
      assert.ok(!gridOverlapsGrid(grid, half, other, clusterHalfSize(other.members.length)), `${grid.id} overlaps ${other.id}`);
    }
  }
});

test("a routed edge never enters the core disc", () => {
  const samples = [];
  for (const edge of layout.edges) {
    const from = layout.byId.get(edge.from);
    const to = layout.byId.get(edge.to);
    if (!from || !to || from.sector === to.sector) continue;
    samples.push([from, to]);
  }
  assert.ok(samples.length > 0, "no cross-sector edges to check");
  for (const [from, to] of samples) {
    const path = routedEdgePath(from, to, layout.channels);
    // The channel radius is the arc radius in the path; it must clear the core.
    const match = path.match(/A ([0-9.]+) /);
    assert.ok(match, `no arc in ${path}`);
    assert.ok(Number(match[1]) >= CORE_RADIUS, `channel ${match[1]} enters the core`);
  }
});

test("the arch parameters give exactly the seats of each chamber", () => {
  assert.equal(ARCH_TK.total, 150);
  assert.equal(ARCH_EK.total, 75);
  assert.equal(archSeats(ARCH_TK, ARCH_PITCH_TK).length, 150);
  assert.equal(archSeats(ARCH_EK, ARCH_PITCH_EK).length, 75);
  assert.throws(() => archParams(151, 5, 2.5), /leaves/);
});

test("arch seats never overlap and the arch has straight legs", () => {
  for (const [params, pitch] of [
    [ARCH_TK, ARCH_PITCH_TK],
    [ARCH_EK, ARCH_PITCH_EK],
  ]) {
    const seats = archSeats(params, pitch);
    const radius = pitch * 0.36;
    for (let i = 0; i < seats.length; i += 1) {
      for (let j = i + 1; j < seats.length; j += 1) {
        const distance = Math.hypot(seats[i].x - seats[j].x, seats[i].y - seats[j].y);
        assert.ok(distance > 2 * radius - 0.01, `seats ${i} and ${j} overlap at ${distance}`);
      }
    }
    // Legs: the same x on a column, stepping down by exactly the pitch.
    const legs = seats.filter((seat) => !seat.arc && seat.x < 0);
    assert.ok(legs.length === params.rows * params.legRows, "left leg seat count");
    const columns = new Set(legs.map((seat) => seat.x.toFixed(4)));
    assert.equal(columns.size, params.rows, "each row continues as one straight column");
  }
});

test("the chamber bundles match the arch sizes", () => {
  const tk = bundle.chambers?.["org:tweede-kamer"];
  const ek = bundle.chambers?.["org:eerste-kamer"];
  assert.ok(tk && ek, "the bundle carries both chambers");
  assert.equal(tk.total, ARCH_TK.total);
  assert.equal(ek.total, ARCH_EK.total);
  assert.equal(tk.majority, 76);
  assert.equal(ek.majority, 38);
  for (const chamber of [tk, ek]) {
    const sum = chamber.entries.reduce((total, entry) => total + entry.seats, 0);
    assert.equal(sum, chamber.total);
    const sorted = [...chamber.entries].every(
      (entry, index, list) => index === 0 || list[index - 1].seats >= entry.seats,
    );
    assert.ok(sorted, "fractie blocks come largest first");
  }
});

test("the turn takes the short way and brings the focus to the top", () => {
  const node = drawn[Math.floor(drawn.length / 3)];
  const rotation = alignRotation(node.angle, 0);
  assert.ok(Math.abs(rotation) <= Math.PI + 1e-9, "never turns more than half a circle");
  assert.ok(Math.abs(wrapPi(node.angle + rotation - START_ANGLE)) < 1e-9, "the focus lands straight up");
  // Continuity: from a rotation of almost a full circle it keeps turning forward.
  const next = alignRotation(node.angle, rotation + 2 * Math.PI);
  assert.ok(Math.abs(next - (rotation + 2 * Math.PI)) <= Math.PI + 1e-9);
  // A turn under the tolerance is not made at all.
  assert.equal(alignRotation(node.angle, rotation + 0.01), rotation + 0.01);
});

test("every drawn mark and the frame sit inside the viewBox", () => {
  const half = layout.viewBox.width / 2;
  for (const node of drawn) {
    assert.ok(Math.hypot(node.x, node.y) + glyphFootprint(node) <= half + 0.01, `${node.id} leaves the viewBox`);
  }
  assert.ok(layout.frameRadius <= half, "the frame leaves the viewBox");
  assert.ok(layout.frameRadius > layout.maxRadius, "the frame does not contain the tiers");
});

test("the layout is deterministic", () => {
  const again = computeLayout(bundle);
  assert.equal(again.nodes.length, layout.nodes.length);
  for (let i = 0; i < again.nodes.length; i += 1) {
    assert.equal(again.nodes[i].id, layout.nodes[i].id);
    assert.equal(again.nodes[i].x, layout.nodes[i].x);
    assert.equal(again.nodes[i].y, layout.nodes[i].y);
  }
  assert.deepEqual(again.channels, layout.channels);
  assert.equal(again.frameRadius, layout.frameRadius);
});

test("an edge is drawn on a date only while it is in force; undated edges always are", () => {
  assert.equal(edgeAlive({}, "1990-01-01"), true);
  assert.equal(edgeAlive({ validFrom: "2010-10-14" }, "2010-10-13"), false);
  assert.equal(edgeAlive({ validFrom: "2010-10-14" }, "2010-10-14"), true);
  assert.equal(edgeAlive({ validFrom: "2010-10-14", validTo: "2017-10-26" }, "2017-10-26"), false);
  assert.equal(edgeAlive({ validFrom: "2010-10-14", validTo: "2017-10-26" }, "2017-10-25"), true);
  assert.equal(edgeAlive({ validFrom: "2010-10-14" }, null), true);
  const dated = bundle.edges.filter((edge) => edge.validFrom);
  assert.ok(dated.length >= 58, `dated edges in the bundle: ${dated.length}`);
  assert.ok(dated.every((edge) => !edgeAlive(edge, "2009-01-01")), "before the first besluit no dated edge is in force");
});
