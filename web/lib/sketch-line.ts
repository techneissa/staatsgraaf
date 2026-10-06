/**
 * The line language of the hierarchy chart and the person focus: a soft,
 * hand-drawn-feeling stroke between two circles. Pure geometry, so tests and a
 * later Swift client draw the same lines.
 *
 * A line is a centreline and a width profile.
 *
 * - The centreline is one cubic Bezier with a gentle bow. The bow is about 6%
 *   of the length, capped, and bends the way a hash of the line's id says (or
 *   toward a given point), so a line looks the same on every render, on the
 *   server and on the client. A tiny seeded wobble of the two control points
 *   (never more than `WOBBLE_MAX` px at the curve) keeps the ruler out of it.
 * - The width tapers from the start to the end, and swells a little where the
 *   line meets a circle, like ink pooling at a root. The ends run on under the
 *   circle's outline, so no flat edge, stub or gap shows.
 *
 * The outline is a closed path, a filled brush stroke with round ends. Reveal
 * it with a mask that strokes the centreline (see `SketchLine`).
 */

export type Pt = { x: number; y: number };
export type Disc = Pt & { r: number };
export type Cubic = { p0: Pt; p1: Pt; p2: Pt; p3: Pt };
export type Bounds = { x: number; y: number; w: number; h: number };

/** The most a hand wobble moves the curve, in px. */
export const WOBBLE_MAX = 1.2;
/** The thinnest a line is ever drawn, in px. */
export const MIN_WIDTH = 0.8;

const round = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const fmt = (p: Pt) => `${round(p.x)} ${round(p.y)}`;
const add = (a: Pt, b: Pt, k = 1): Pt => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function unit(v: Pt, fallback: Pt = { x: 1, y: 0 }): Pt {
  const d = Math.hypot(v.x, v.y);
  return d > 1e-9 ? { x: v.x / d, y: v.y / d } : fallback;
}

/** Four numbers in [0, 1) from a string: FNV-1a, then a small xorshift. Same input, same numbers. */
export function seeded(seed: string): [number, number, number, number] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0 || 0x9e3779b9;
  const next = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  next();
  return [next(), next(), next(), next()];
}

export function cubicAt(c: Cubic, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * c.p0.x + 3 * u * u * t * c.p1.x + 3 * u * t * t * c.p2.x + t * t * t * c.p3.x,
    y: u * u * u * c.p0.y + 3 * u * u * t * c.p1.y + 3 * u * t * t * c.p2.y + t * t * t * c.p3.y,
  };
}

/** The unit tangent at t; falls back to the chord when the derivative vanishes. */
export function cubicTangent(c: Cubic, t: number): Pt {
  const u = 1 - t;
  const d = {
    x: 3 * u * u * (c.p1.x - c.p0.x) + 6 * u * t * (c.p2.x - c.p1.x) + 3 * t * t * (c.p3.x - c.p2.x),
    y: 3 * u * u * (c.p1.y - c.p0.y) + 6 * u * t * (c.p2.y - c.p1.y) + 3 * t * t * (c.p3.y - c.p2.y),
  };
  return unit(d, unit({ x: c.p3.x - c.p0.x, y: c.p3.y - c.p0.y }));
}

export function sampleCubic(c: Cubic, steps: number): Pt[] {
  const n = Math.max(1, Math.round(steps));
  const out: Pt[] = [];
  for (let i = 0; i <= n; i += 1) out.push(cubicAt(c, i / n));
  return out;
}

export function polyLength(points: readonly Pt[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i += 1) sum += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return sum;
}

export type CurveOptions = {
  seed: string;
  /** Direction the curve leaves `a` in, and arrives at `b` in (unit vectors). Default: along the chord. */
  startDir?: Pt;
  endDir?: Pt;
  /** The largest bow of the centreline from the chord, in px. Default 7. */
  bowMax?: number;
  /** The bow as a fraction of the length. Default 0.06. */
  bowFrac?: number;
  /** Scales the bow down (0 to 1), for a curve that already bends. Default 1. */
  bowScale?: number;
  /** Bend toward the side of the chord this point is on. Default: by the seed. */
  bowToward?: Pt;
  /** The wobble in px at the curve. Default `WOBBLE_MAX`, and never more than 2.5% of the length. */
  wobble?: number;
  /** How far the control points sit from the ends, as a fraction of the length. Default 1/3; larger rounds an S. */
  handle?: number;
};

/**
 * The centreline from `a` to `b`: a cubic Bezier with a gentle bow and a
 * slight seeded wobble. The end points are exactly `a` and `b`.
 */
export function sketchCurve(a: Pt, b: Pt, o: CurveOptions): Cubic {
  const chord = { x: b.x - a.x, y: b.y - a.y };
  const length = Math.hypot(chord.x, chord.y);
  const dir = unit(chord);
  const n = { x: -dir.y, y: dir.x };
  const [h1, h2, h3, h4] = seeded(o.seed);
  let sign = h1 < 0.5 ? -1 : 1;
  if (o.bowToward) {
    const side = n.x * (o.bowToward.x - (a.x + b.x) / 2) + n.y * (o.bowToward.y - (a.y + b.y) / 2);
    if (Math.abs(side) > 1e-6) sign = side < 0 ? -1 : 1;
  }
  // A cubic with both inner control points offset by d peaks at 0.75 d.
  const bow = clamp(length * (o.bowFrac ?? 0.06), 0, o.bowMax ?? 7) * clamp(o.bowScale ?? 1, 0, 1);
  const wobble = Math.min(o.wobble ?? WOBBLE_MAX, WOBBLE_MAX, length * 0.025);
  const s1 = (bow * sign * (0.85 + 0.3 * h2)) / 0.75 + ((h3 * 2 - 1) * wobble) / 0.75;
  const s2 = (bow * sign * (0.85 + 0.3 * h3)) / 0.75 + ((h4 * 2 - 1) * wobble) / 0.75;
  const k = length * (o.handle ?? 1 / 3);
  const startDir = o.startDir ? unit(o.startDir, dir) : dir;
  const endDir = o.endDir ? unit(o.endDir, dir) : dir;
  const p1 = add(add(a, startDir, k), n, s1);
  const p2 = add(add(b, endDir, -k), n, s2);
  return { p0: a, p1, p2, p3: b };
}

export type Profile = {
  /** Width at the start and at the end, before swelling. */
  widthA: number;
  widthB: number;
  /** How far the line runs on under the circle at each end (px), so the swell starts at the visible edge. */
  insetA?: number;
  insetB?: number;
  /** The swell at each end as a fraction of the width (0.25 is a quarter wider at the circle). Default 0.22. */
  flareA?: number;
  flareB?: number;
  /** The length the swell fades over, in px. Default 11. */
  flareLength?: number;
};

export type Brush = {
  /** The closed outline, to fill. */
  d: string;
  /** The centreline, to stroke inside the reveal mask. */
  centre: string;
  /** The centreline's length in px. */
  length: number;
  /** The centreline as a polyline. */
  points: Pt[];
  /** The widest the line is, in px (mask stroke width needs more than this). */
  widest: number;
  /** A box around the whole outline, with room for the halo. */
  bounds: Bounds;
};

/** The width at distance `s` along a line of length `len`. */
export function widthAt(s: number, len: number, p: Profile): number {
  const t = len > 0 ? clamp(s / len, 0, 1) : 0;
  const L = Math.max(1, Math.min(p.flareLength ?? 11, len * 0.35));
  const swell = (dist: number, amount: number) => {
    if (dist <= 0) return 1 + amount;
    const f = 1 - clamp(dist / L, 0, 1);
    return 1 + amount * f * f;
  };
  const body = p.widthA + (p.widthB - p.widthA) * t;
  const w = body * swell(s - (p.insetA ?? 0), p.flareA ?? 0.22) * swell(len - s - (p.insetB ?? 0), p.flareB ?? 0.22);
  return Math.max(MIN_WIDTH, w);
}

/** The brush stroke along a centreline: a closed outline with a tapering, swelling width and round ends. */
export function brushStroke(c: Cubic, p: Profile): Brush {
  const rough = polyLength(sampleCubic(c, 24));
  const steps = clamp(Math.ceil(rough / 7), 10, 44);
  const points = sampleCubic(c, steps);
  // Arc length at each sample, so the width profile follows the distance and not the parameter.
  const arc: number[] = [0];
  for (let i = 1; i < points.length; i += 1) arc.push(arc[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  const length = arc[arc.length - 1];
  const left: Pt[] = [];
  const right: Pt[] = [];
  let widest = 0;
  points.forEach((point, i) => {
    const tangent = cubicTangent(c, i / steps);
    const w = widthAt(arc[i], length, p);
    widest = Math.max(widest, w);
    const n = { x: -tangent.y, y: tangent.x };
    left.push(add(point, n, w / 2));
    right.push(add(point, n, -w / 2));
  });
  const smooth = (pts: readonly Pt[]) => {
    let out = "";
    for (let i = 1; i < pts.length - 1; i += 1) out += ` Q${fmt(pts[i])} ${fmt(mid(pts[i], pts[i + 1]))}`;
    return out + ` L${fmt(pts[pts.length - 1])}`;
  };
  const cap = (from: Pt, to: Pt, forward: Pt, w: number) => {
    const k = w * 0.667;
    return ` C${fmt(add(from, forward, k))} ${fmt(add(to, forward, k))} ${fmt(to)}`;
  };
  const last = points.length - 1;
  const tStart = cubicTangent(c, 0);
  const tEnd = cubicTangent(c, 1);
  const rl = [...right].reverse();
  const d =
    `M${fmt(left[0])}${smooth(left)}` +
    cap(left[last], right[last], tEnd, widthAt(length, length, p)) +
    smooth(rl) +
    cap(right[0], left[0], { x: -tStart.x, y: -tStart.y }, widthAt(0, length, p)) +
    " Z";
  const all = [...left, ...right];
  const pad = widest * 0.5 + 6;
  const minX = Math.min(...all.map((q) => q.x)) - pad;
  const minY = Math.min(...all.map((q) => q.y)) - pad;
  const maxX = Math.max(...all.map((q) => q.x)) + pad;
  const maxY = Math.max(...all.map((q) => q.y)) + pad;
  return {
    d,
    centre: `M${fmt(c.p0)} C${fmt(c.p1)} ${fmt(c.p2)} ${fmt(c.p3)}`,
    length: Math.max(1, Math.round(length)),
    points,
    widest: round(widest),
    bounds: { x: round(minX), y: round(minY), w: round(maxX - minX), h: round(maxY - minY) },
  };
}

/** The curve and the profile together; `insetA` and `insetB` say how far under each circle's edge the line ends. */
export type BetweenOptions = CurveOptions & Profile;

/**
 * A line between two circles: leaves `from` along the chord and arrives at
 * `to` heading for its centre, each end `inset` px under the circle's edge.
 * `start` and `end` in the result are the exact end points of the centreline.
 */
export function sketchBetween(from: Disc, to: Disc, o: BetweenOptions): Brush & { start: Pt; end: Pt; cubic: Cubic } {
  const dir = unit({ x: to.x - from.x, y: to.y - from.y });
  const start = add(from, dir, Math.max(0, from.r - (o.insetA ?? 0)));
  const end = add(to, dir, -Math.max(0, to.r - (o.insetB ?? 0)));
  const cubic = sketchCurve(start, end, o);
  return { ...brushStroke(cubic, o), start, end, cubic };
}
