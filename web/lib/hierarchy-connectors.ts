/**
 * How the lines of the hierarchy chart (lib/hierarchy-layout.ts) are drawn.
 * Pure geometry, so tests and a later Swift client draw the same joins.
 *
 * A line in the chart is a stroke between two circles: the ring and a hub, or
 * a hub and one of its people. Every join follows the same three rules.
 *
 * 1. A line meets a circle square on: it leaves the ring along the radius, and
 *    it arrives at a hub or a person heading for its centre. The flat end of
 *    the stroke then lies flush on the circle's edge, with no notch.
 * 2. The stroke runs on under the circle's outline, which has the same colour,
 *    so no hairline shows between the line and the circle, and nothing pokes
 *    out through the node.
 * 3. The two corners where the line meets the circle are rounded with a small
 *    fillet, drawn as a filled sliver beside the stroke. Where the ring
 *    segment or a neighbouring line leaves no room, the fillet shrinks or is
 *    left out; the stroke never shows beside its segment.
 *
 * A hub's line to the ring is a spoke: radial at the ring, radial at the hub,
 * and a gentle S between them when the hub does not sit on the same radius.
 */

export type Pt = { x: number; y: number };
type Disc = Pt & { r: number };

const TAU = Math.PI * 2;
const round = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const fmt = (p: Pt) => `${round(p.x)} ${round(p.y)}`;

/** A stroke that starts this far inside the shape it leaves, so the two overlap without a seam. */
const OVERLAP = 0.6;

/** The straight run a spoke keeps at each end, a little longer than a fillet reaches. */
const STUB = 9;

export type Spoke = {
  /** The stroke's path, from just inside the ring to just inside the hub's outline. */
  d: string;
  /** Its length in px, for the draw-in animation. */
  length: number;
  /** The same line as a polyline, for collision checks and for placing a chip on it. */
  points: Pt[];
  /** The unit direction the line leaves the ring in (radial). */
  leave: Pt;
  /** The unit direction it arrives at the hub in: toward the hub's centre. */
  arrive: Pt;
};

/**
 * The spoke from the ring to a hub: leaves the ring radially at `angle`,
 * arrives at the hub heading for its centre, and ends `inset` px inside the
 * hub's edge (under its outline). Straight when the hub sits on the radius.
 */
export function spokeCurve(o: { centre: Pt; ringOuter: number; angle: number; hub: Disc; inset: number }): Spoke {
  const leave = { x: Math.cos(o.angle), y: Math.sin(o.angle) };
  const p0 = { x: o.centre.x + (o.ringOuter - OVERLAP) * leave.x, y: o.centre.y + (o.ringOuter - OVERLAP) * leave.y };
  const dx = o.hub.x - p0.x;
  const dy = o.hub.y - p0.y;
  const dist = Math.hypot(dx, dy) || 1;
  const arrive = { x: dx / dist, y: dy / dist };
  const reach = Math.max(0, o.hub.r - o.inset);
  const p3 = { x: o.hub.x - arrive.x * reach, y: o.hub.y - arrive.y * reach };
  const length = Math.hypot(p3.x - p0.x, p3.y - p0.y);
  const bend = Math.abs(leave.x * arrive.y - leave.y * arrive.x);
  if (bend < 0.004) {
    return { d: `M${fmt(p0)} L${fmt(p3)}`, length: Math.max(1, Math.round(length)), points: [p0, p3], leave, arrive };
  }
  // A straight run at each end, as long as the fillets reach, then the S between them.
  const stub = Math.min(STUB, length * 0.25);
  const q0 = { x: p0.x + leave.x * stub, y: p0.y + leave.y * stub };
  const q3 = { x: p3.x - arrive.x * stub, y: p3.y - arrive.y * stub };
  const k = Math.hypot(q3.x - q0.x, q3.y - q0.y) * 0.38;
  const q1 = { x: q0.x + leave.x * k, y: q0.y + leave.y * k };
  const q2 = { x: q3.x - arrive.x * k, y: q3.y - arrive.y * k };
  const points: Pt[] = [p0];
  const steps = 16;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    points.push({
      x: u * u * u * q0.x + 3 * u * u * t * q1.x + 3 * u * t * t * q2.x + t * t * t * q3.x,
      y: u * u * u * q0.y + 3 * u * u * t * q1.y + 3 * u * t * t * q2.y + t * t * t * q3.y,
    });
  }
  points.push(p3);
  return { d: `M${fmt(p0)} L${fmt(q0)} C${fmt(q1)} ${fmt(q2)} ${fmt(q3)} L${fmt(p3)}`, length: Math.max(1, Math.round(polylineLength(points))), points, leave, arrive };
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

/**
 * The two fillets where a straight stroke of `width` leaves the outside of a
 * circle along `dir` (a unit vector from the circle's centre): one sliver per
 * side, filling the cusp between the circle and the stroke up to a quarter
 * round of radius `f`. `room` is how far, in px beyond the stroke's own edge,
 * each side may reach (a ring segment ends, a neighbour is near). Returns an
 * empty string when the fillet would be smaller than a pixel.
 */
export function filletPath(circle: Disc, dir: Pt, width: number, f: number, room: readonly [number, number] = [Infinity, Infinity]): string {
  const half = width / 2;
  const R = circle.r;
  if (half >= R - 1) return "";
  const normal = { x: -dir.y, y: dir.x };
  const parts: string[] = [];
  [-1, 1].forEach((side, index) => {
    const size = Math.min(f, room[index]);
    if (!(size >= 1)) return;
    const at = (u: number, v: number): Pt => ({ x: circle.x + dir.x * u + normal.x * side * v, y: circle.y + dir.y * u + normal.y * side * v });
    const vc = half + size;
    const uc = Math.sqrt(Math.max(0, (R + size) ** 2 - vc * vc));
    const tangentStroke = at(uc, half);
    const k = R / (R + size);
    const tangentCircle = at(uc * k, vc * k);
    const corner = at(Math.sqrt(R * R - half * half), half);
    // Tuck the two ends that rest on the circle a hair inside it, so no seam shows.
    const tuck = (p: Pt): Pt => {
      const d = Math.hypot(p.x - circle.x, p.y - circle.y) || 1;
      const s = (R - OVERLAP) / d;
      return { x: circle.x + (p.x - circle.x) * s, y: circle.y + (p.y - circle.y) * s };
    };
    const sweep = (centre: Pt, from: Pt, to: Pt) => ((from.x - centre.x) * (to.y - centre.y) - (from.y - centre.y) * (to.x - centre.x) > 0 ? 1 : 0);
    const c1 = tuck(corner);
    const c2 = tuck(tangentCircle);
    const fc = at(uc, vc);
    parts.push(
      `M${fmt(c1)} A${round(R - OVERLAP)} ${round(R - OVERLAP)} 0 0 ${sweep(circle, c1, c2)} ${fmt(c2)}` +
        ` A${round(size)} ${round(size)} 0 0 ${sweep(fc, tangentCircle, tangentStroke)} ${fmt(tangentStroke)} Z`,
    );
  });
  return parts.join(" ");
}

/** The fillet size for a stroke of this width. */
export const filletFor = (width: number) => round(clamp(width * 0.55, 1.8, 4.5));

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
  /** The stroke path. */
  d: string;
  /** Its length, for the draw-in animation. */
  length: number;
  /** The fillets at both ends, as one filled path; empty when there are none. */
  fillets: string;
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
 * The strokes and fillets for every hub spoke and every member bar of a
 * layout. A spoke's fillets at the ring reach no further than its ring
 * segment or halfway to the next spoke on the same segment.
 */
export function chartConnectors(layout: LayoutLike): ChartConnectors {
  const { centre, ring, stroke } = layout;
  const ringOuter = ring.r + ring.width / 2;
  const hubs = new Map<string, Connector>();
  const members = new Map<string, Connector>();

  // Where each spoke meets the ring, with the room each side of it.
  const anchors = layout.hubs.map((hub) => {
    const angle = Math.atan2(hub.bar.a.y - centre.y, hub.bar.a.x - centre.x);
    const segment = layout.segments.find((entry) => wrapFrom(angle, entry.start - 0.005) <= entry.end + 0.005);
    return { hub, angle, segment };
  });
  const half = stroke.hubBar / 2;
  const f = filletFor(stroke.hubBar);
  anchors.forEach(({ hub, angle, segment }, index) => {
    const room: [number, number] = [f, f];
    if (segment) {
      const a = wrapFrom(angle, segment.start - 0.005);
      room[0] = Math.min(room[0], (a - segment.start) * ringOuter - half - 0.5);
      room[1] = Math.min(room[1], (segment.end - a) * ringOuter - half - 0.5);
    }
    anchors.forEach((other, otherIndex) => {
      if (otherIndex === index || other.segment !== segment) return;
      const delta = wrapFrom(other.angle - angle + Math.PI, 0) - Math.PI;
      const side = delta < 0 ? 0 : 1;
      room[side] = Math.min(room[side], (Math.abs(delta) * ringOuter - stroke.hubBar) / 2 - 0.5);
    });
    const ringFillets = filletPath({ x: centre.x, y: centre.y, r: ringOuter }, hub.spoke.leave, stroke.hubBar, f, room);
    // At the hub the spoke arrives heading for its centre, so the fillets sit square to the rim.
    const hubFillets = filletPath(hub, { x: -hub.spoke.arrive.x, y: -hub.spoke.arrive.y }, stroke.hubBar, f);
    hubs.set(hub.id, { d: hub.spoke.d, length: hub.spoke.length, fillets: [ringFillets, hubFillets].filter(Boolean).join(" ") });
  });

  const hubById = new Map(layout.hubs.map((hub) => [hub.id, hub]));
  const fm = filletFor(stroke.memberBar);
  for (const member of layout.members) {
    const hub = hubById.get(member.hub);
    if (!hub) continue;
    const out = unit({ x: member.x - hub.x, y: member.y - hub.y });
    const a = { x: hub.x + out.x * (hub.r - stroke.hub / 2), y: hub.y + out.y * (hub.r - stroke.hub / 2) };
    const b = { x: member.x - out.x * (member.r - stroke.member / 2), y: member.y - out.y * (member.r - stroke.member / 2) };
    const fillets = [filletPath(hub, out, stroke.memberBar, fm), filletPath(member, { x: -out.x, y: -out.y }, stroke.memberBar, fm)].filter(Boolean).join(" ");
    members.set(memberKey(member.hub, member.id), {
      d: `M${fmt(a)} L${fmt(b)}`,
      length: Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y))),
      fillets,
    });
  }
  return { hubs, members };
}

function unit(v: Pt): Pt {
  const d = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / d, y: v.y / d };
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
