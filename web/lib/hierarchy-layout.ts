/**
 * Geometry for the hierarchy form of the connections view (lib/hierarchy.ts)
 * and its person focus. Pure and deterministic, so tests and a later Swift
 * client draw the same picture from the same numbers.
 *
 * - `layoutRadial`: the head in a centre circle, a ring of segments around it,
 *   one hub per ministry or fractie on an orbit, and each hub's people as
 *   small portraits just outside it. Everything scales with the box; hub labels
 *   drop out when they would touch and the canvas falls back to tooltips.
 * - `layoutFocus`: a picked person in the centre and their ties as portrait
 *   tiles on an ellipse, grouped by kind with a gap between groups.
 *
 * Below `radialFits` / `focusFits` the view uses a stacked list instead.
 */

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;

export function rectsOverlap(a: Rect, b: Rect, gap = 0): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

/** Whether a circle touches a rectangle. */
export function circleHitsRect(c: Point, r: number, rect: Rect): boolean {
  const nx = clamp(c.x, rect.x, rect.x + rect.w);
  const ny = clamp(c.y, rect.y, rect.y + rect.h);
  return Math.hypot(c.x - nx, c.y - ny) < r;
}

/** Rough width of a label in px at the canvas label size (11 to 12 px). */
export function labelWidth(text: string, charWidth = 6.4, padding = 12): number {
  return Math.round(text.length * charWidth + padding);
}

/** Whether the radial form fits; below this the stacked list is used. */
export function radialFits(width: number, height: number): boolean {
  return width >= 440 && height >= 400;
}

export type RadialHubInput = {
  id: string;
  /** Relative size of the hub (seats of a fractie); 1 for equal hubs. */
  weight: number;
  /** People to show around the hub. */
  satellites: number;
  /** Text of the hub's label chip. */
  label: string;
};

export type RadialHub = {
  id: string;
  x: number;
  y: number;
  r: number;
  /** Angle in radians, 0 to the right, clockwise, -π/2 at the top. */
  angle: number;
  /** Centre of the label chip, on the spoke between the ring and the hub. */
  label: Point;
  /** Portrait centres around the hub; fewer than asked when the slot is too narrow. */
  satellites: Point[];
  /** Ring segment of the hub, as angles. */
  start: number;
  end: number;
  /** Whether the hub's label chip is drawn; when not, it lives in the tooltip. */
  showLabel: boolean;
};

export type RadialLayout = {
  centre: Point & { r: number };
  ring: { r: number; width: number };
  hubs: RadialHub[];
  /** Diameter of a satellite portrait. */
  sat: number;
  /** Whether any hub label is drawn. */
  labels: boolean;
  /** The head of state's small circle, behind and above the centre. */
  crown: Point & { r: number };
};

/**
 * The radial chart. Hubs sit at equal angles from the top, clockwise, in the
 * given order; a heavier hub is bigger (area follows weight).
 */
export function layoutRadial(input: readonly RadialHubInput[], box: { width: number; height: number; pad?: number }): RadialLayout {
  const pad = box.pad ?? 12;
  const S = Math.min(box.width, box.height);
  const half = S / 2 - pad;
  const cx = box.width / 2;
  const cy = box.height / 2;
  const n = Math.max(1, input.length);
  const sat = Math.round(clamp(S * 0.05, 24, 34));
  const maxSat = Math.max(0, ...input.map((hub) => hub.satellites));
  let rhMax = clamp(S * 0.045, 16, 26);
  // The orbit leaves room for the portraits outside the hubs.
  const orbit = half - rhMax - (maxSat > 0 ? 4 + sat : 6);
  // Neighbouring hubs never touch.
  const chord = 2 * orbit * Math.sin(Math.PI / n);
  rhMax = Math.min(rhMax, Math.max(8, chord / 2 - 3));
  const rhMin = rhMax * 0.5;
  const wMax = Math.max(0.001, ...input.map((hub) => hub.weight));
  const rc = clamp(S * 0.09, 30, 56);
  const ringR = rc + clamp(S * 0.04, 12, 24);
  const ringWidth = clamp(S * 0.008, 3, 6);
  const step = (2 * Math.PI) / n;
  const gapAngle = Math.min(step * 0.18, 4 / ringR);

  const place = (labelRadius: (index: number) => number) =>
    input.map((hub, index) => {
      const angle = -Math.PI / 2 + index * step;
      const r = input.every((other) => other.weight === input[0].weight) ? rhMax : rhMin + (rhMax - rhMin) * Math.sqrt(hub.weight / wMax);
      const x = cx + orbit * Math.cos(angle);
      const y = cy + orbit * Math.sin(angle);
      // The chip sits just inside the hub, its own half extent along the spoke clear of it.
      const w = labelWidth(hub.label);
      const extent = Math.abs(Math.cos(angle)) * (w / 2) + Math.abs(Math.sin(angle)) * 9;
      const lr = orbit - rhMax - 5 - extent - labelRadius(index);
      const satR = orbit + rhMax + 4 + sat / 2;
      const satStep = (sat + 3) / satR;
      const fit = Math.max(0, Math.floor((step * 0.94) / satStep));
      const shown = Math.min(hub.satellites, fit);
      const satellites: Point[] = [];
      for (let i = 0; i < shown; i += 1) {
        const a = angle + (i - (shown - 1) / 2) * satStep;
        satellites.push({ x: round(cx + satR * Math.cos(a)), y: round(cy + satR * Math.sin(a)) });
      }
      return {
        id: hub.id,
        x: round(x),
        y: round(y),
        r: round(r),
        angle: round(angle * 1000) / 1000,
        label: { x: round(cx + lr * Math.cos(angle)), y: round(cy + lr * Math.sin(angle)) },
        satellites,
        start: angle - step / 2 + gapAngle / 2,
        end: angle + step / 2 - gapAngle / 2,
        showLabel: false,
      } satisfies RadialHub;
    });

  const chipRect = (hub: RadialHub, text: string): Rect => {
    const w = labelWidth(text);
    return { x: hub.label.x - w / 2, y: hub.label.y - 9, w, h: 18 };
  };
  /**
   * Which labels can be drawn: the heaviest hubs first, each only when its
   * chip clears the centre, the ring, every hub and every chip already kept.
   */
  const choose = (hubs: RadialHub[]): boolean[] => {
    const rects = hubs.map((hub, index) => chipRect(hub, input[index].label));
    const centreBox: Rect = { x: cx - rc - 30, y: cy - rc, w: 2 * rc + 60, h: 2 * rc + 24 };
    const order = hubs.map((_, index) => index).sort((a, b) => input[b].weight - input[a].weight || a - b);
    const kept: number[] = [];
    const show = hubs.map(() => false);
    for (const i of order) {
      const rect = rects[i];
      if (rectsOverlap(rect, centreBox)) continue;
      if (Math.hypot(hubs[i].label.x - cx, hubs[i].label.y - cy) - rect.w / 2 <= ringR + ringWidth) continue;
      if (hubs.some((hub) => circleHitsRect(hub, hub.r + 1, rect))) continue;
      if (kept.some((k) => rectsOverlap(rect, rects[k], 2))) continue;
      kept.push(i);
      show[i] = true;
    }
    return show;
  };

  const plain = place(() => 0);
  const plainShow = choose(plain);
  // Stagger every other label a step further in when that lets more labels show.
  const staggered = place((index) => (index % 2 === 0 ? 0 : 22));
  const staggeredShow = choose(staggered);
  const count = (show: boolean[]) => show.filter(Boolean).length;
  const useStagger = count(staggeredShow) > count(plainShow);
  const hubs = (useStagger ? staggered : plain).map((hub, index) => ({ ...hub, showLabel: (useStagger ? staggeredShow : plainShow)[index] }));
  const labels = hubs.some((hub) => hub.showLabel);
  // The head of state: a small circle overlapping the centre's upper left, in front of it.
  const crownR = rc * 0.36;
  const crownAt = -Math.PI * 0.75;
  return {
    centre: { x: round(cx), y: round(cy), r: round(rc) },
    ring: { r: round(ringR), width: round(ringWidth) },
    hubs,
    sat,
    labels,
    crown: { x: round(cx + (rc + crownR * 0.35) * Math.cos(crownAt)), y: round(cy + (rc + crownR * 0.35) * Math.sin(crownAt)), r: round(crownR) },
  };
}

/** An SVG arc path along a circle from `start` to `end` (radians, clockwise). */
export function arcPath(centre: Point, r: number, start: number, end: number): string {
  const a = { x: round(centre.x + r * Math.cos(start)), y: round(centre.y + r * Math.sin(start)) };
  const b = { x: round(centre.x + r * Math.cos(end)), y: round(centre.y + r * Math.sin(end)) };
  const large = end - start > Math.PI ? 1 : 0;
  return `M${a.x} ${a.y} A${round(r)} ${round(r)} 0 ${large} 1 ${b.x} ${b.y}`;
}

// ---------------------------------------------------------------------------
// Person focus

export type FocusGroupInput = { kind: string; count: number; /** Heading text, for its width. */ label?: string };

export type FocusTile = { kind: string; index: number; x: number; y: number };
export type FocusHeading = { kind: string; x: number; y: number; shown: number; hidden: number; /** False when no clear place was found; the tiles' tooltips still name the kind. */ visible: boolean };
export type FocusLayout = {
  centre: Point & { r: number };
  /** Portrait diameter of a tile. */
  portrait: number;
  tile: { w: number; h: number };
  tiles: FocusTile[];
  headings: FocusHeading[];
};

export type FocusOptions = { width: number; height: number; pad?: number; tileW?: number; tileH?: number; portrait?: number };

const FOCUS_DEFAULTS = { pad: 10, tileW: 96, tileH: 80, portrait: 40 };

function ellipseOf(o: Required<FocusOptions>) {
  // The side panels' collapse handles sit on the canvas edges; tiles keep clear of them.
  const rx = o.width / 2 - o.pad - 12 - o.tileW / 2;
  // A tile hangs below its portrait (name and role), so the bottom needs more room than the top.
  const ry = o.height / 2 - o.pad - (o.tileH - o.portrait / 2);
  return { rx, ry };
}

/** Whether the focus ellipse fits; below this the tie list is used. */
export function focusFits(width: number, height: number, options: Omit<FocusOptions, "width" | "height"> = {}): boolean {
  const o = { ...FOCUS_DEFAULTS, ...options, width, height };
  const { rx, ry } = ellipseOf(o);
  return rx >= 150 && ry >= 140;
}

/** Points on an ellipse at equal arc length, starting at the top and running clockwise. */
export function ellipseSampler(rx: number, ry: number): { perimeter: number; at: (s: number) => Point } {
  const N = 720;
  const points: Point[] = [];
  const lengths: number[] = [0];
  for (let i = 0; i <= N; i += 1) {
    const t = -Math.PI / 2 + (i / N) * 2 * Math.PI;
    points.push({ x: rx * Math.cos(t), y: ry * Math.sin(t) });
    if (i > 0) lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const perimeter = lengths[N];
  const at = (s: number): Point => {
    const target = ((s % perimeter) + perimeter) % perimeter;
    let lo = 0;
    let hi = N;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lengths[mid] <= target) lo = mid;
      else hi = mid;
    }
    const span = lengths[hi] - lengths[lo] || 1;
    const f = (target - lengths[lo]) / span;
    return { x: points[lo].x + (points[hi].x - points[lo].x) * f, y: points[lo].y + (points[hi].y - points[lo].y) * f };
  };
  return { perimeter, at };
}

/**
 * Place the ties of a focus. Groups keep their order clockwise from the top,
 * the first group centred at the top. When there are more ties than slots,
 * the longest group gives up tiles first and never drops below one.
 */
export function layoutFocus(groups: readonly FocusGroupInput[], options: FocusOptions): FocusLayout {
  const o = { ...FOCUS_DEFAULTS, ...options } as Required<FocusOptions>;
  const cx = o.width / 2;
  const cy = o.height / 2;
  const S = Math.min(o.width, o.height);
  const centreR = clamp(S * 0.085, 34, 54);
  const { rx, ry } = ellipseOf(o);
  const { perimeter, at } = ellipseSampler(Math.max(1, rx), Math.max(1, ry));
  const apart = (a: Point, b: Point) => Math.abs(a.x - b.x) >= o.tileW + 4 || Math.abs(a.y - b.y) >= o.tileH + 4;
  /** The first arc position after `s` where a tile clears the tile at `s`. */
  const next = (s: number): number => {
    const p = at(s);
    let t = s + 8;
    while (t - s < perimeter && !apart(p, at(t))) t += 2;
    return t;
  };
  const groupGap = o.tileW * 0.45;
  const live = groups.filter((group) => group.count > 0);
  const gapAfter = live.length > 1 ? groupGap : 0;
  /**
   * Arc positions of the tiles in order from `start`: each tile at the first
   * place that clears the one before it plus `loosen`, a gap of `gap` after
   * each group. `slack` is the room left before the ring closes.
   */
  const walk = (counts: readonly number[], start: number, loosen: number, gap: number) => {
    const positions: number[] = [];
    let s = start;
    counts.forEach((count) => {
      for (let i = 0; i < count; i += 1) {
        positions.push(s);
        s = next(s) + (i < count - 1 ? loosen : 0);
      }
      s += gap;
    });
    return { positions, slack: perimeter - (s - start) };
  };
  const shown = live.map((group) => group.count);
  let plan = walk(shown, 0, 0, gapAfter);
  while (plan.slack < 0) {
    let longest = -1;
    for (let i = 0; i < shown.length; i += 1) if (shown[i] > 1 && (longest < 0 || shown[i] > shown[longest])) longest = i;
    if (longest < 0) break;
    shown[longest] -= 1;
    plan = walk(shown, 0, 0, gapAfter);
  }
  // Room that is left loosens each group a little and goes to the gaps
  // between groups, so groups stay together.
  const inGroupSteps = shown.reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const slack0 = Math.max(0, plan.slack);
  const loosenMax = inGroupSteps > 0 ? Math.min(o.tileW * 0.3, (slack0 * 0.5) / inGroupSteps) : 0;
  const gapMax = (slack0 - loosenMax * inGroupSteps) / Math.max(1, live.length);
  const firstCount = shown[0] ?? 0;
  let start = 0;
  let scale = 1;
  const fitted = () => {
    for (let tries = 0; tries < 24; tries += 1) {
      const attempt = walk(shown, start, loosenMax * scale, gapAfter + gapMax * scale);
      if (attempt.slack >= 0 || scale === 0) return attempt;
      scale = scale < 0.05 ? 0 : scale * 0.85;
    }
    return walk(shown, start, 0, gapAfter);
  };
  plan = fitted();
  // Centre the first group at the top; the walk depends on where it starts, so it is redone.
  for (let round = 0; round < 5 && firstCount > 0; round += 1) {
    const mid = (plan.positions[0] + plan.positions[firstCount - 1]) / 2;
    if (Math.abs(mid) < 0.5) break;
    start -= mid;
    plan = fitted();
  }
  const spaced = plan.positions;
  const shift = 0;
  const tiles: FocusTile[] = [];
  const headings: FocusHeading[] = [];
  let cursor = 0;
  live.forEach((group, g) => {
    const count = shown[g];
    const own = spaced.slice(cursor, cursor + count).map((s) => s - shift);
    cursor += count;
    own.forEach((s, index) => {
      const p = at(s);
      tiles.push({ kind: group.kind, index, x: round(cx + p.x), y: round(cy + p.y) });
    });
    const mid = at((own[0] + own[own.length - 1]) / 2);
    headings.push({ kind: group.kind, x: mid.x, y: mid.y, shown: count, hidden: group.count - count, visible: false });
  });

  // Each heading goes on the line from the centre toward its group, at the
  // first place inward that clears every tile, the centre and the other headings.
  const tileRects = tiles.map((tile) => ({ x: tile.x - o.tileW / 2, y: tile.y - o.portrait / 2, w: o.tileW, h: o.tileH }));
  const centreBox: Rect = { x: cx - 84, y: cy - centreR, w: 168, h: centreR * 2 + 64 };
  const placedHeadings: Rect[] = [];
  headings.forEach((heading, g) => {
    const label = live[g].label ?? live[g].kind;
    const w = labelWidth(`${label} +99`, 6.2, 16);
    const dist = Math.hypot(heading.x, heading.y) || 1;
    const ux = heading.x / dist;
    const uy = heading.y / dist;
    let found: Point | null = null;
    for (let d = dist - o.portrait / 2 - 12; d >= centreR + 20; d -= 4) {
      const x = cx + ux * d;
      const y = cy + uy * d;
      const rect = { x: x - w / 2, y: y - 10, w, h: 20 };
      if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > o.width || rect.y + rect.h > o.height) continue;
      if (tileRects.some((tile) => rectsOverlap(rect, tile, 2))) continue;
      if (rectsOverlap(rect, centreBox, 2) || placedHeadings.some((other) => rectsOverlap(rect, other, 2))) continue;
      found = { x, y };
      placedHeadings.push(rect);
      break;
    }
    const fallback = { x: cx + ux * Math.max(centreR + 40, dist - o.portrait / 2 - 22), y: cy + uy * Math.max(centreR + 40, dist - o.portrait / 2 - 22) };
    const at2 = found ?? fallback;
    heading.x = round(at2.x);
    heading.y = round(at2.y);
    heading.visible = found !== null;
  });
  return { centre: { x: round(cx), y: round(cy), r: round(centreR) }, portrait: o.portrait, tile: { w: o.tileW, h: o.tileH }, tiles, headings };
}

/** Where a straight line from `from` toward `to` leaves a circle of radius `r` around `from`. */
export function edgePoint(from: Point, to: Point, r: number): Point {
  const d = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: round(from.x + ((to.x - from.x) / d) * r), y: round(from.y + ((to.y - from.y) / d) * r) };
}
