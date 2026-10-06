/**
 * How the lines of the hierarchy chart (lib/hierarchy-layout.ts) are drawn.
 * Pure geometry, so tests and a later Swift client draw the same joins. The
 * line language itself (a soft, bowed, tapering brush stroke) lives in
 * lib/sketch-line.ts and is shared with the person focus.
 *
 * A line in the chart runs between two circles: the ring and a hub, or a hub
 * and one of its people. Each runs on under the outline of the circle it
 * reaches, which has the same colour, so no hairline, stub or flat end shows.
 * A line swells a little where it meets a circle, and tapers toward the far
 * end, so the joins read as grown and not as pasted on.
 *
 * A hub's line to the ring is a spoke: it leaves the ring along the radius,
 * arrives at the hub heading for its centre, and bends in one soft S between
 * them when the hub does not sit on the same radius. On the radius it is a
 * gently bowed stroke.
 */

import {
  brushStroke,
  cubicAt,
  sketchBetween,
  sketchCurve,
  type Bounds,
  type Cubic,
  type Pt,
} from "./sketch-line";

export type { Pt };
type Disc = Pt & { r: number };

const TAU = Math.PI * 2;
const round = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** A stroke that starts this far inside the shape it leaves, so the two overlap without a seam. */
const OVERLAP = 0.6;

export type Spoke = {
  /** The centreline's path, from just inside the ring to just inside the hub's outline. */
  d: string;
  /** Its length in px. */
  length: number;
  /** The same line as a polyline, for collision checks and for placing a chip on it. */
  points: Pt[];
  /** The unit direction the line leaves the ring in (radial). */
  leave: Pt;
  /** The unit direction it arrives at the hub in: toward the hub's centre. */
  arrive: Pt;
  /** The centreline as a cubic Bezier. */
  cubic: Cubic;
};

/**
 * The spoke from the ring to a hub: leaves the ring radially at `angle`,
 * arrives at the hub heading for its centre, and ends `inset` px inside the
 * hub's edge (under its outline). One soft S when the hub is off the radius,
 * a gentle bow when it is on it. The seed (default from the geometry) fixes
 * the bow's side and the wobble, so the same chart draws the same lines.
 */
export function spokeCurve(o: { centre: Pt; ringOuter: number; angle: number; hub: Disc; inset: number; seed?: string }): Spoke {
  const leave = { x: Math.cos(o.angle), y: Math.sin(o.angle) };
  const p0 = { x: o.centre.x + (o.ringOuter - OVERLAP) * leave.x, y: o.centre.y + (o.ringOuter - OVERLAP) * leave.y };
  const dx = o.hub.x - p0.x;
  const dy = o.hub.y - p0.y;
  const dist = Math.hypot(dx, dy) || 1;
  const arrive = { x: dx / dist, y: dy / dist };
  const reach = Math.max(0, o.hub.r - o.inset);
  const p3 = { x: o.hub.x - arrive.x * reach, y: o.hub.y - arrive.y * reach };
  const bend = Math.abs(leave.x * arrive.y - leave.y * arrive.x);
  const seed = o.seed ?? `spoke:${round(o.angle * 1000)}:${round(o.hub.x)}:${round(o.hub.y)}`;
  // Off the radius the S already bends the line; on it, a bow stands in.
  const cubic = sketchCurve(p0, p3, {
    seed,
    startDir: leave,
    endDir: arrive,
    bowScale: 1 - clamp(bend * 7, 0, 1),
    bowMax: 5,
    bowFrac: 0.045,
    handle: bend > 0.004 ? 0.38 : undefined,
  });
  const steps = 20;
  const points: Pt[] = [];
  for (let i = 0; i <= steps; i += 1) points.push(i === 0 ? p0 : i === steps ? p3 : cubicAt(cubic, i / steps));
  const length = polylineLength(points);
  return {
    d: `M${round(p0.x)} ${round(p0.y)} C${round(cubic.p1.x)} ${round(cubic.p1.y)} ${round(cubic.p2.x)} ${round(cubic.p2.y)} ${round(p3.x)} ${round(p3.y)}`,
    length: Math.max(1, Math.round(length)),
    points,
    leave,
    arrive,
    cubic,
  };
}

export function polylineLength(points: readonly Pt[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i += 1) sum += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return sum;
}

/** The point at fraction `t` (0 to 1) of a polyline's length. */
export function pointAt(points: readonly Pt[], t: number): Pt {
  const total = polylineLength(points);
  let want = clamp(t, 0, 1) * total;
  for (let i = 1; i < points.length; i += 1) {
    const step = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    if (want <= step || i === points.length - 1) {
      const f = step === 0 ? 0 : clamp(want / step, 0, 1);
      return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * f, y: points[i - 1].y + (points[i].y - points[i - 1].y) * f };
    }
    want -= step;
  }
  return points[0];
}

/** Distance from a point to a polyline. */
export function distanceToPolyline(p: Pt, points: readonly Pt[]): number {
  let best = Infinity;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = dx * dx + dy * dy;
    const t = len === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len, 0, 1);
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

// ---------------------------------------------------------------------------
// The chart's connectors

type LayoutLike = {
  centre: Disc;
  ring: { r: number; width: number };
  segments: readonly { group: string; start: number; end: number }[];
  hubs: readonly (Disc & { id: string; spoke: Spoke; bar: { a: Pt; b: Pt } })[];
  members: readonly (Disc & { id: string; hub: string; bar: { a: Pt; b: Pt } })[];
  stroke: { hubBar: number; memberBar: number; hub: number; member: number };
};

export type Connector = {
  /** The brush stroke: a closed outline to fill. */
  d: string;
  /** The centreline, for the reveal mask that draws the stroke in. */
  centre: string;
  /** The centreline's length, for the draw-in animation. */
  length: number;
  /** The widest the stroke is; the reveal mask strokes the centreline wider than this. */
  widest: number;
  /** A box around the stroke and its halo, for the mask's region. */
  bounds: Bounds;
};

export type ChartConnectors = {
  /** By hub id. */
  hubs: Map<string, Connector>;
  /** By hub id, then member id. */
  members: Map<string, Connector>;
};

const memberKey = (hub: string, member: string) => `${hub}\u0000${member}`;
export { memberKey };

/** Angles brought into [from, from + TAU). */
const wrapFrom = (angle: number, from: number) => {
  let a = angle;
  while (a < from) a += TAU;
  while (a >= from + TAU) a -= TAU;
  return a;
};

/**
 * The brush strokes for every hub spoke and every member line of a layout.
 * Spokes taper from the ring to the hub, member lines from the hub to the
 * person; both swell a little where they meet a circle.
 */
export function chartConnectors(layout: LayoutLike): ChartConnectors {
  const { stroke } = layout;
  const hubs = new Map<string, Connector>();
  const members = new Map<string, Connector>();

  for (const hub of layout.hubs) {
    const brush = brushStroke(hub.spoke.cubic, {
      widthA: stroke.hubBar,
      widthB: stroke.hubBar * 0.72,
      insetA: OVERLAP,
      insetB: stroke.hub / 2,
      flareA: 0.2,
      flareB: 0.24,
      flareLength: 12,
    });
    hubs.set(hub.id, { d: brush.d, centre: brush.centre, length: brush.length, widest: brush.widest, bounds: brush.bounds });
  }

  const hubById = new Map(layout.hubs.map((hub) => [hub.id, hub]));
  for (const member of layout.members) {
    const hub = hubById.get(member.hub);
    if (!hub) continue;
    const brush = sketchBetween(hub, member, {
      seed: `${member.hub}>${member.id}`,
      widthA: stroke.memberBar * 1.05,
      widthB: stroke.memberBar * 0.75,
      insetA: stroke.hub / 2,
      insetB: stroke.member / 2,
      flareA: 0.22,
      flareB: 0.28,
      flareLength: 9,
      bowMax: 4,
      bowFrac: 0.07,
      wobble: 0.7,
    });
    members.set(memberKey(member.hub, member.id), { d: brush.d, centre: brush.centre, length: brush.length, widest: brush.widest, bounds: brush.bounds });
  }
  return { hubs, members };
}

/**
 * Segment spans (radians) for weights around a closed ring: proportional to
 * the weight, but never below `floor`, so a one-seat party still has a
 * segment wide enough for its spoke. The others give up the difference in
 * proportion. Sums to `total`.
 */
export function segmentSpans(weights: readonly number[], total: number, floor: number): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const w = weights.map((value) => Math.max(0, value));
  if (floor * n >= total) return w.map(() => total / n);
  const locked = new Array<boolean>(n).fill(false);
  const spans = new Array<number>(n).fill(0);
  for (let pass = 0; pass <= n; pass += 1) {
    const free = w.reduce((sum, value, i) => sum + (locked[i] ? 0 : value), 0);
    const room = total - locked.reduce((sum, isLocked) => sum + (isLocked ? floor : 0), 0);
    let changed = false;
    for (let i = 0; i < n; i += 1) {
      if (locked[i]) {
        spans[i] = floor;
        continue;
      }
      spans[i] = free > 0 ? (w[i] / free) * room : room / Math.max(1, locked.filter((x) => !x).length);
      if (spans[i] < floor) {
        locked[i] = true;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return spans;
}
