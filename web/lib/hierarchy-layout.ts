/**
 * Geometry for the hierarchy form of the connections view (lib/hierarchy.ts)
 * and its person focus, after two circular organisation charts. Pure and
 * deterministic, so tests and a later Swift client draw the same picture from
 * the same numbers.
 *
 * - `layoutOrgChart`: the head in a large centre circle, a thick ring around
 *   it cut into one coloured segment per group, a solid bar from each segment
 *   out to its hub, and each hub's people as portrait circles on short bars
 *   around it, each with a name and role placed outside by a collision pass.
 * - `layoutFocusSides`: a picked person in the centre with a double ring, bars
 *   left and right to the heads of the two strongest groups, and each head's
 *   members as a chain above and below it, labels on the outer side.
 *
 * Below `orgChartFits` / `focusSidesFits` the view stacks instead.
 */

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Circle = Point & { r: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;
const TAU = Math.PI * 2;

export function rectsOverlap(a: Rect, b: Rect, gap = 0): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

/** Whether a circle touches a rectangle. */
export function circleHitsRect(c: Point, r: number, rect: Rect): boolean {
  const nx = clamp(c.x, rect.x, rect.x + rect.w);
  const ny = clamp(c.y, rect.y, rect.y + rect.h);
  return Math.hypot(c.x - nx, c.y - ny) < r;
}

/** Whether a thick segment touches a rectangle (sampled every few px). */
function segmentHitsRect(a: Point, b: Point, halfWidth: number, rect: Rect): boolean {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(length / 4));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    if (circleHitsRect({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, halfWidth + 1, rect)) return true;
  }
  return false;
}

/** Rough width of a text in px: `size` is the font size, bold text runs wider. */
export function textWidth(text: string, size: number, bold = false): number {
  return Math.ceil(text.length * size * (bold ? 0.58 : 0.52));
}

/** An SVG arc path along a circle from `start` to `end` (radians, clockwise). */
export function arcPath(centre: Point, r: number, start: number, end: number): string {
  const a = { x: round(centre.x + r * Math.cos(start)), y: round(centre.y + r * Math.sin(start)) };
  const b = { x: round(centre.x + r * Math.cos(end)), y: round(centre.y + r * Math.sin(end)) };
  const large = end - start > Math.PI ? 1 : 0;
  return `M${a.x} ${a.y} A${round(r)} ${round(r)} 0 ${large} 1 ${b.x} ${b.y}`;
}

/** Where a straight line from `from` toward `to` leaves a circle of radius `r` around `from`. */
export function edgePoint(from: Point, to: Point, r: number): Point {
  const d = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: round(from.x + ((to.x - from.x) / d) * r), y: round(from.y + ((to.y - from.y) / d) * r) };
}

/** Points on an ellipse at equal arc length, starting at the top and running clockwise. */
export function ellipseSampler(rx: number, ry: number): { perimeter: number; at: (s: number) => Point } {
  const N = 720;
  const points: Point[] = [];
  const lengths: number[] = [0];
  for (let i = 0; i <= N; i += 1) {
    const t = -Math.PI / 2 + (i / N) * TAU;
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

// ---------------------------------------------------------------------------
// Labels

export type LabelInput = { name: string; role: string | null };

export type PlacedLabel = Rect & {
  /** Text alignment inside the box. */
  align: "start" | "end" | "middle";
  /** Two lines (name and role) or one (name only). */
  lines: 1 | 2;
};

export type LabelMetrics = { name: number; role: number; lineName: number; lineRole: number; maxW: number; minW: number };

export function labelMetrics(scale: number): LabelMetrics {
  const name = Math.round(clamp(12 * scale, 11, 14) * 2) / 2;
  const role = Math.round(clamp(10.5 * scale, 10, 12) * 2) / 2;
  return {
    name,
    role,
    lineName: Math.round(name * 1.25),
    lineRole: Math.round(role * 1.25),
    maxW: Math.round(clamp(150 * scale, 104, 190)),
    minW: 52,
  };
}

type Obstacles = { circles: Circle[]; bars: { a: Point; b: Point; w: number }[]; rects: Rect[]; box: Rect };

function clear(rect: Rect, obstacles: Obstacles, own: readonly Circle[] = []): boolean {
  const { box } = obstacles;
  if (rect.x < box.x || rect.y < box.y || rect.x + rect.w > box.x + box.w || rect.y + rect.h > box.y + box.h) return false;
  for (const circle of obstacles.circles) {
    if (own.includes(circle)) continue;
    if (circleHitsRect(circle, circle.r + 2, rect)) return false;
  }
  for (const bar of obstacles.bars) if (segmentHitsRect(bar.a, bar.b, bar.w / 2, rect)) return false;
  for (const other of obstacles.rects) if (rectsOverlap(rect, other, 3)) return false;
  return true;
}

/**
 * The label of a circle, placed on the side facing away from `away`: beside
 * it when it sits left or right, above or below when it sits at the top or
 * bottom, then the other options, then name only. Null when nothing is clear;
 * the circle's tooltip then carries the name.
 */
export function placeLabel(
  circle: Circle,
  text: LabelInput,
  away: Point,
  metrics: LabelMetrics,
  obstacles: Obstacles,
  prefer: "auto" | "side" = "auto",
): PlacedLabel | null {
  const dx = circle.x - away.x;
  const dy = circle.y - away.y;
  const sideFirst = prefer === "side" || Math.abs(dx) >= Math.abs(dy) * 0.55;
  const right = dx >= 0;
  const below = dy >= 0;
  const nameW = textWidth(text.name, metrics.name, true);
  const roleW = text.role ? textWidth(text.role, metrics.role) : 0;
  const gap = 5;
  type Option = { place: "right" | "left" | "above" | "below"; lines: 1 | 2 };
  const places: Option["place"][] = sideFirst
    ? [right ? "right" : "left", below ? "below" : "above", below ? "above" : "below"]
    : [below ? "below" : "above", right ? "right" : "left", right ? "left" : "right"];
  const options: Option[] = [];
  for (const lines of (text.role ? [2, 1] : [1]) as (1 | 2)[]) for (const place of places) options.push({ place, lines });
  // The first clear box per option; the best is the one that shows most of
  // its text, the preferred order breaking ties, two lines before one.
  let best: { label: PlacedLabel; score: number } | null = null;
  options.forEach((option, rank) => {
    const h = option.lines === 2 ? metrics.lineName + metrics.lineRole : metrics.lineName;
    const want = Math.max(nameW, option.lines === 2 ? roleW : 0) + 2;
    for (const cap of [metrics.maxW, Math.round(metrics.maxW * 0.72)]) {
      let w = Math.min(want, cap);
      let rect: Rect;
      if (option.place === "right" || option.place === "left") {
        const x = option.place === "right" ? circle.x + circle.r + gap : circle.x - circle.r - gap - w;
        // Shrink toward the edge rather than fall off it.
        const room = option.place === "right" ? obstacles.box.x + obstacles.box.w - x : circle.x - circle.r - gap - obstacles.box.x;
        if (room < w) w = Math.floor(room);
        if (w < Math.min(want, metrics.minW)) continue;
        rect = { x: option.place === "right" ? x : circle.x - circle.r - gap - w, y: circle.y - h / 2, w, h };
      } else {
        const y = option.place === "below" ? circle.y + circle.r + 3 : circle.y - circle.r - 3 - h;
        let x = circle.x - w / 2;
        x = clamp(x, obstacles.box.x, obstacles.box.x + obstacles.box.w - w);
        rect = { x, y, w, h };
      }
      if (clear(rect, obstacles, [circle])) {
        const align = option.place === "right" ? "start" : option.place === "left" ? "end" : "middle";
        const shown = Math.min(1, w / Math.max(1, nameW + 2));
        const roleShown = option.lines === 2 ? Math.min(1, w / Math.max(1, roleW + 2)) : 0;
        const score = shown * 2 + roleShown - rank * 0.04;
        if (!best || score > best.score) best = { label: { x: round(rect.x), y: round(rect.y), w: Math.round(rect.w), h: rect.h, align, lines: option.lines }, score };
        break;
      }
    }
  });
  return best ? (best as { label: PlacedLabel }).label : null;
}

// ---------------------------------------------------------------------------
// The organisation chart

/** Whether the chart fits; below this the stacked form is used. */
export function orgChartFits(width: number, height: number): boolean {
  return width >= 480 && height >= 420;
}

export type OrgMemberInput = LabelInput & { id: string };

export type OrgHubInput = {
  id: string;
  /** Ring group of the hub: a ministry cluster, or the hub itself. */
  group: string;
  /** Relative size (seats of a fractie); 1 for equal hubs. */
  weight: number;
  /** People to place around the hub, most important first. */
  members: readonly OrgMemberInput[];
  /** Short label on the hub's bar. */
  label: string;
};

export type OrgChartOptions = {
  width: number;
  height: number;
  /** `groups`: one ring segment per run of hubs in the same group. `weight`: one segment per hub, sized by weight. */
  ring: "groups" | "weight";
  pad?: number;
  /** Turns of the chart to try for the most labels (1 keeps it as laid out). */
  turns?: number;
};

export type OrgMember = Circle & {
  id: string;
  hub: string;
  index: number;
  /** The short bar from the hub's edge to the member's edge. */
  bar: { a: Point; b: Point };
  label: PlacedLabel | null;
};

export type OrgHub = Circle & {
  id: string;
  group: string;
  /** Polar angle of the hub from the centre. */
  angle: number;
  /** Where its bar leaves the ring, and where it meets the hub. */
  bar: { a: Point; b: Point };
  /** The short label chip on the bar, or null when it has no clear place. */
  chip: Rect | null;
  /** People placed around the hub; the rest wait behind the hub's "+n". */
  shown: number;
  /** Where the "+n" badge sits on the hub's rim. */
  more: Point;
};

export type OrgChartLayout = {
  centre: Circle;
  /** The ring's centre line radius and its stroke width. */
  ring: { r: number; width: number };
  segments: { group: string; start: number; end: number }[];
  hubs: OrgHub[];
  members: OrgMember[];
  /** Stroke widths of the hub bars, the member bars and the outlines. */
  stroke: { hubBar: number; memberBar: number; hub: number; member: number };
  metrics: LabelMetrics;
  /** The head of state's badge on the ring. */
  crown: Circle;
  scale: number;
};

/**
 * The chart. Hubs sit on an ellipse fitted to the box, at equal arc length
 * clockwise from the top, with a wider gap between groups (`groups`), or as
 * near as they can to the middle of their weighted ring segment (`weight`).
 */
export function layoutOrgChart(input: readonly OrgHubInput[], options: OrgChartOptions): OrgChartLayout {
  const { width: W, height: H } = options;
  // The side panels' collapse handles sit on the canvas edges; labels keep clear of them.
  const padX = options.pad ?? 24;
  const padY = options.pad ?? 8;
  const S = Math.min(W, H);
  let best: OrgChartLayout | null = null;
  // Try the full scale first; a box too small for it gets a smaller one.
  for (const shrink of [1, 0.92, 0.84, 0.76, 0.68, 0.6]) {
    const scale = clamp((S / 680) * shrink, 0.55, 1.5);
    const attempt = attemptOrgChart(input, options, scale, padX, padY, 0);
    best = attempt.layout;
    if (attempt.fits) break;
  }
  // Turn the chart to where the most people get a readable label: the top
  // and bottom are the most crowded places, so a busy hub fares better at a
  // side. No turn wins ties, so an uncrowded chart keeps its first group on top.
  const score = (layout: OrgChartLayout) =>
    layout.members.reduce((sum, member) => sum + 4 + (member.label ? (member.label.lines === 2 ? 3 : 2) : 0), 0);
  let bestScore = score(best!);
  const turns = options.turns ?? 12;
  for (let k = 1; k < turns; k += 1) {
    const turned = attemptOrgChart(input, options, best!.scale, padX, padY, k / turns).layout;
    const value = score(turned);
    if (value > bestScore) {
      best = turned;
      bestScore = value;
    }
  }
  return best!;
}

function attemptOrgChart(
  input: readonly OrgHubInput[],
  options: OrgChartOptions,
  scale: number,
  padX: number,
  padY: number,
  turn: number,
): { layout: OrgChartLayout; fits: boolean } {
  const { width: W, height: H } = options;
  const cx = W / 2;
  const cy = H / 2;
  const n = Math.max(1, input.length);
  const metrics = labelMetrics(scale);
  const rc = clamp(Math.min(66 * scale, Math.min(W, H) * 0.12), 40, 104);
  const ringWidth = clamp(rc * 0.17, 7, 15);
  const ringR = rc + 4 + ringWidth / 2;
  const ringOuter = ringR + ringWidth / 2;
  const weighted = options.ring === "weight";
  const rhMax = clamp(27 * scale, 17, 38);
  const rhMin = weighted ? rhMax * 0.52 : rhMax;
  const rm = clamp(18 * scale, 13, 26);
  const stroke = {
    hubBar: round(clamp(ringWidth * 0.62, 5, 10)),
    memberBar: round(clamp(rm * 0.22, 3, 5)),
    hub: round(clamp(rhMax * 0.16, 3.5, 6)),
    member: round(clamp(rm * 0.16, 2.5, 4)),
  };
  const labelH = metrics.lineName + metrics.lineRole;
  const reach = rhMax + 10 + 2 * rm;
  const maxMembers = Math.max(0, ...input.map((hub) => hub.members.length));
  const outer = maxMembers > 0 ? reach : rhMax;
  const sideLabel = clamp(W * 0.15, 70, metrics.maxW);
  let rx = W / 2 - padX - sideLabel - outer;
  let ry = H / 2 - padY - labelH - 4 - outer;
  const minOrbit = ringOuter + 24 + rhMax;
  const fits = rx >= minOrbit && ry >= minOrbit;
  rx = Math.max(rx, minOrbit);
  ry = Math.max(ry, minOrbit);
  // On a big canvas the hubs stay close to the ring, as in the concept, rather than run to the edges.
  const maxOrbit = ringOuter + rhMax + 2 * reach + 40;
  rx = Math.min(rx, Math.max(minOrbit, maxOrbit * 1.25));
  ry = Math.min(ry, Math.max(minOrbit, maxOrbit));
  // Very tall boxes would stretch the chart into a thin oval.
  ry = Math.min(ry, rx * 1.8);
  rx = Math.min(rx, ry * 1.6);
  const { perimeter, at } = ellipseSampler(rx, ry);
  const wMax = Math.max(0.001, ...input.map((hub) => hub.weight));
  const radiusOf = (hub: OrgHubInput) => (weighted ? rhMin + (rhMax - rhMin) * Math.sqrt(hub.weight / wMax) : rhMax);

  // Arc positions of the hubs, and the ring segments.
  const polar = (p: Point) => Math.atan2(p.y, p.x);
  const unwrap = (angle: number, from: number) => {
    let a = angle;
    while (a < from) a += TAU;
    while (a >= from + TAU) a -= TAU;
    return a;
  };
  const top = -Math.PI / 2;
  let positions: number[];
  const segments: { group: string; start: number; end: number }[] = [];
  if (!weighted) {
    const breaks = input.map((hub, index) => (index > 0 && hub.group !== input[index - 1].group ? 1 : 0) as number);
    const wrapBreak = input.length > 1 && input[0].group !== input[input.length - 1].group ? 1 : 0;
    const gaps = breaks.reduce((sum, value) => sum + value, 0) + wrapBreak;
    const gapShare = 0.45;
    const unit = perimeter / (n + gaps * gapShare);
    positions = [];
    let s = 0;
    input.forEach((_, index) => {
      if (index > 0) s += unit + breaks[index] * unit * gapShare;
      positions.push(s);
    });
    // Centre the first group on the top.
    const firstRun = input.findIndex((hub) => hub.group !== input[0].group);
    const lastFirst = firstRun < 0 ? input.length - 1 : firstRun - 1;
    const shift = firstRun < 0 ? 0 : (positions[0] + positions[lastFirst]) / 2;
    positions = positions.map((value) => value - shift + turn * perimeter);
    // Segments: from the midpoint before a run's first hub to the midpoint after its last.
    const angles = positions.map((value) => polar(at(value)));
    const unwrapped: number[] = [];
    angles.forEach((angle, index) => unwrapped.push(index === 0 ? unwrap(angle, top - Math.PI) : unwrap(angle, unwrapped[index - 1])));
    if (input.length === 1 || new Set(input.map((hub) => hub.group)).size === 1) {
      segments.push({ group: input[0]?.group ?? "", start: top, end: top + TAU });
    } else {
      const gapAngle = 3 / ringR;
      let runStart = 0;
      for (let i = 1; i <= input.length; i += 1) {
        if (i < input.length && input[i].group === input[runStart].group) continue;
        const prev = runStart === 0 ? unwrapped[input.length - 1] - TAU : unwrapped[runStart - 1];
        const next = i === input.length ? unwrapped[0] + TAU : unwrapped[i];
        const start = (prev + unwrapped[runStart]) / 2 + gapAngle / 2;
        const end = (unwrapped[i - 1] + next) / 2 - gapAngle / 2;
        segments.push({ group: input[runStart].group, start, end });
        runStart = i;
      }
    }
  } else {
    // Segments by weight, clockwise from the top.
    const total = input.reduce((sum, hub) => sum + Math.max(0, hub.weight), 0) || 1;
    const gapAngle = input.length > 1 ? 2.5 / ringR : 0;
    let a = top + turn * TAU;
    const mids: number[] = [];
    for (const hub of input) {
      const span = (Math.max(0, hub.weight) / total) * TAU;
      segments.push({ group: hub.group, start: a + gapAngle / 2, end: a + Math.max(span - gapAngle / 2, gapAngle / 2 + 0.002) });
      mids.push(a + span / 2);
      a += span;
    }
    // The arc position closest to each segment's middle, then spread so hubs keep apart.
    const samples = 720;
    const lookup: { s: number; angle: number }[] = [];
    for (let i = 0; i < samples; i += 1) {
      const s = (i / samples) * perimeter;
      lookup.push({ s, angle: unwrap(polar(at(s)), top) });
    }
    const target = mids.map((mid) => {
      const angle = unwrap(mid, top);
      let bestS = 0;
      let bestD = Infinity;
      for (const entry of lookup) {
        const d = Math.abs(entry.angle - angle);
        if (d < bestD) {
          bestD = d;
          bestS = entry.s;
        }
      }
      return bestS;
    });
    // Targets run clockwise; after a turn they may wrap past the top.
    for (let i = 1; i < target.length; i += 1) while (target[i] < target[i - 1]) target[i] += perimeter;
    positions = spread(target, perimeter, () => (perimeter / n) * 0.8);
  }

  const centre: Circle = { x: round(cx), y: round(cy), r: round(rc) };
  const hubs: OrgHub[] = input.map((hub, index) => {
    const p = at(positions[index]);
    const x = cx + p.x;
    const y = cy + p.y;
    const r = radiusOf(hub);
    const angle = polar(p);
    let anchorAngle = angle;
    if (weighted) {
      const segment = segments[index];
      const a = unwrap(angle, segment.start - Math.PI);
      const inset = Math.min((segment.end - segment.start) / 2, 1.5 / ringR);
      anchorAngle = clamp(a, segment.start + inset, segment.end - inset);
    }
    const a = { x: round(cx + ringOuter * Math.cos(anchorAngle)), y: round(cy + ringOuter * Math.sin(anchorAngle)) };
    const b = edgePoint({ x, y }, a, r);
    return {
      id: hub.id,
      group: hub.group,
      x: round(x),
      y: round(y),
      r: round(r),
      angle: round(angle * 1000) / 1000,
      bar: { a, b },
      chip: null,
      shown: 0,
      more: { x: round(x + r * 0.78), y: round(y - r * 0.78) },
    };
  });

  // Members: interleaved, so every hub gets its first person before any hub gets a second.
  const box: Rect = { x: padX - 2, y: 2, w: W - 2 * (padX - 2), h: H - 4 };
  const circles: Circle[] = [{ x: cx, y: cy, r: ringOuter + 2 }, ...hubs];
  const members: OrgMember[] = [];
  const tierStep = 2 * rm + 8;
  const depth = input.map(() => 0);
  const candidatesOf = (hub: OrgHub): Point[] => {
    const ux = (hub.x - cx) / (Math.hypot(hub.x - cx, hub.y - cy) || 1);
    const uy = (hub.y - cy) / (Math.hypot(hub.x - cx, hub.y - cy) || 1);
    const base = Math.atan2(uy, ux);
    const out: { p: Point; cost: number }[] = [];
    for (let tier = 0; tier < 3; tier += 1) {
      const d = hub.r + rm + 10 + tier * tierStep;
      const step = 2 * Math.asin(Math.min(1, (rm + 4) / d));
      for (let k = 0; k * step <= (100 * Math.PI) / 180; k += 1) {
        for (const sign of k === 0 ? [0] : [-1, 1]) {
          const phi = base + sign * k * step;
          out.push({ p: { x: hub.x + d * Math.cos(phi), y: hub.y + d * Math.sin(phi) }, cost: tier * 3 + k + (sign > 0 ? 0.1 : 0) });
        }
      }
    }
    return out.sort((x, y) => x.cost - y.cost).map((entry) => entry.p);
  };
  const candidateCache = hubs.map(candidatesOf);
  const blocked = input.map(() => false);
  for (let round_ = 0; round_ < maxMembers; round_ += 1) {
    input.forEach((hubInput, h) => {
      if (blocked[h] || round_ >= hubInput.members.length) return;
      const hub = hubs[h];
      const found = candidateCache[h].find((p) => {
        if (p.x - rm < box.x + 2 || p.x + rm > box.x + box.w - 2 || p.y - rm < box.y + 2 || p.y + rm > box.y + box.h - 2) return false;
        for (const other of circles) if (Math.hypot(other.x - p.x, other.y - p.y) < other.r + rm + 4) return false;
        // The member's bar must not cross another hub's bar or another hub.
        const bar = { a: edgePoint(hub, p, hub.r), b: edgePoint(p, hub, rm) };
        for (const other of hubs) {
          if (other === hub) continue;
          if (distanceToSegment(other, bar.a, bar.b) < other.r + 3) return false;
          if (segmentsCross(bar.a, bar.b, other.bar.a, other.bar.b)) return false;
        }
        for (const m of members) if (segmentsCross(bar.a, bar.b, m.bar.a, m.bar.b)) return false;
        // Keep clear of the ring and of every hub bar.
        for (const other of hubs) if (distanceToSegment(p, other.bar.a, other.bar.b) < rm + stroke.hubBar / 2 + 3) return false;
        return true;
      });
      if (!found) {
        blocked[h] = true;
        return;
      }
      const member = hubInput.members[round_];
      const placed: OrgMember = {
        id: member.id,
        hub: hub.id,
        index: round_,
        x: round(found.x),
        y: round(found.y),
        r: round(rm),
        bar: { a: edgePoint(hub, found, hub.r), b: edgePoint(found, hub, rm) },
        label: null,
      };
      members.push(placed);
      circles.push(placed);
      depth[h] += 1;
    });
  }
  hubs.forEach((hub, h) => {
    hub.shown = depth[h];
  });

  // Chips on the hub bars, then the member labels, most important first.
  const rects: Rect[] = [];
  const bars = [...hubs.map((hub) => ({ a: hub.bar.a, b: hub.bar.b, w: stroke.hubBar })), ...members.map((m) => ({ a: m.bar.a, b: m.bar.b, w: stroke.memberBar }))];
  const chipH = Math.round(metrics.role + 7);
  hubs.forEach((hub, h) => {
    const w = textWidth(input[h].label, metrics.role, true) + 10;
    const length = Math.hypot(hub.bar.b.x - hub.bar.a.x, hub.bar.b.y - hub.bar.a.y);
    for (let t = 0.5; t >= 0; t -= 0.1) {
      for (const tt of t === 0.5 ? [0.5] : [0.5 + (0.5 - t), t]) {
        const px = hub.bar.a.x + (hub.bar.b.x - hub.bar.a.x) * tt;
        const py = hub.bar.a.y + (hub.bar.b.y - hub.bar.a.y) * tt;
        const rect = { x: px - w / 2, y: py - chipH / 2, w, h: chipH };
        if (length <= 0) continue;
        const others = { circles, bars: bars.filter((bar) => bar.a !== hub.bar.a), rects, box };
        if (clear(rect, others)) {
          hub.chip = { x: round(rect.x), y: round(rect.y), w, h: chipH };
          rects.push(hub.chip);
          return;
        }
      }
    }
  });
  const order = [...members].sort((x, y) => x.index - y.index);
  for (const member of order) {
    const hubIndex = hubs.findIndex((hub) => hub.id === member.hub);
    const text = input[hubIndex].members[member.index];
    const label = placeLabel(member, text, { x: cx, y: cy }, metrics, { circles, bars, rects, box });
    if (label) {
      member.label = label;
      rects.push(label);
    }
  }

  const crownR = round(clamp(rc * 0.32, 14, 26));
  const crownAt = -Math.PI * 0.76;
  return {
    layout: {
      centre,
      ring: { r: round(ringR), width: round(ringWidth) },
      segments: segments.map((segment) => ({ group: segment.group, start: round(segment.start * 1000) / 1000, end: round(segment.end * 1000) / 1000 })),
      hubs,
      members,
      stroke,
      metrics,
      crown: { x: round(cx + ringR * Math.cos(crownAt)), y: round(cy + ringR * Math.sin(crownAt)), r: crownR },
      scale,
    },
    fits,
  };
}

/**
 * Positions on a closed track of length `perimeter`, as near as they can be
 * to `target` (increasing), with at least `gap(i, i + 1)` between neighbours.
 */
export function spread(target: readonly number[], perimeter: number, gap: (i: number, j: number) => number): number[] {
  const n = target.length;
  if (n <= 1) return [...target];
  const s = [...target];
  for (let iteration = 0; iteration < 400; iteration += 1) {
    let moved = false;
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      const a = s[i];
      const b = j === 0 ? s[0] + perimeter : s[j];
      const need = gap(i, j);
      const deficit = need - (b - a);
      if (deficit > 0.01) {
        s[i] -= deficit / 2;
        s[j] += deficit / 2;
        moved = true;
      }
    }
    if (!moved) break;
  }
  // Pushing around a closed track can turn the whole set; undo the net turn.
  const drift = s.reduce((sum, value, i) => sum + (value - target[i]), 0) / n;
  return s.map((value) => value - drift);
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / length, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const cross = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

// ---------------------------------------------------------------------------
// The person focus

/** Whether the side-by-side focus fits; below this the focus stacks. */
export function focusSidesFits(width: number, height: number): boolean {
  return width >= 480 && height >= 360;
}

export type FocusSideInput = {
  /** The head's own label (a person, or the group's name under an icon). */
  head: LabelInput;
  /** The chain, strongest first. */
  members: readonly LabelInput[];
};

export type FocusNode = Circle & { label: PlacedLabel | null };
export type FocusChainNode = FocusNode & { index: number; /** The node this one hangs from: the head or the member before it. */ from: Point & { r: number } };

export type FocusSide = {
  side: -1 | 1;
  head: FocusNode;
  bar: { a: Point; b: Point };
  chain: FocusChainNode[];
  /** Where the "+n" button goes, after the last member below, or null when all are shown. */
  more: Circle | null;
  hidden: number;
};

export type FocusSidesLayout = {
  centre: Circle;
  /** The soft outer ring and the coloured inner ring, as radius and width. */
  outerRing: { r: number; width: number };
  innerRing: { r: number; width: number };
  /** The name and role under the centre. */
  caption: Rect;
  sides: FocusSide[];
  stroke: { bar: number; chain: number; head: number; member: number };
  metrics: LabelMetrics;
  scale: number;
};

/** Members shown per side: two above the head and two below. */
export const FOCUS_CHAIN_MAX = 4;

/**
 * The focus. Heads sit left and right of the centre on a shared ellipse; each
 * chain continues along that ellipse, above and below the head in turn
 * (first above, then below), so the chains bend back toward the centre as in
 * the concept. Labels go on the outer side.
 */
export function layoutFocusSides(sides: readonly FocusSideInput[], options: { width: number; height: number; pad?: number }): FocusSidesLayout {
  const { width: W, height: H } = options;
  // Clear of the side panels' collapse handles on the canvas edges.
  const pad = options.pad ?? 26;
  const S = Math.min(W, H);
  const scale = clamp(Math.min(W / 760, H / 560), 0.62, 1.45);
  const metrics = labelMetrics(scale);
  const cx = W / 2;
  const captionH = metrics.lineName + metrics.lineRole + 6;
  const cy = H / 2 - captionH / 2;
  const rp = clamp(Math.min(S * 0.15, W * 0.09), 34, 104);
  const innerWidth = clamp(rp * 0.12, 4, 9);
  const outerWidth = clamp(rp * 0.28, 9, 22);
  const innerR = rp + 3 + innerWidth / 2;
  const outerR = innerR + innerWidth / 2 + outerWidth / 2;
  const rh = clamp(rp * 0.62, 26, 52);
  const rm = clamp(rp * 0.42, 18, 34);
  const stroke = {
    bar: round(clamp(rh * 0.36, 8, 18)),
    chain: round(clamp(rm * 0.22, 3, 6)),
    head: round(clamp(rh * 0.14, 4, 7)),
    member: round(clamp(rm * 0.14, 2.5, 4)),
  };
  const labelRoom = clamp(W * 0.2, 100, metrics.maxW);
  const outerEdge = outerR + outerWidth / 2;
  // Heads: far enough out for the bar, and room beyond for the head's label.
  // As in the concept the heads sit close to the centre: about 1.7 times its outer radius.
  const rx = clamp(Math.min(W / 2 - pad - labelRoom - rh - 6, outerEdge * 1.25 + rh + 30), outerEdge + rh + 28, W / 2 - pad - rh - 60);
  // The chain steps down and up by `step`, bending back toward the centre on
  // an ellipse through the head, as in the concept.
  const need = 2 * rm + metrics.lineName + metrics.lineRole + 8;
  const halfH = H / 2 - pad - rm - 2;
  const step = clamp(halfH / 2.15, need, need * 1.7);
  const ry = Math.max(2 * step * 1.22, rx * 0.8);
  const box: Rect = { x: pad - 2, y: 2, w: W - 2 * (pad - 2), h: H - 4 };
  const centre: Circle = { x: round(cx), y: round(cy), r: round(rp) };
  const caption: Rect = { x: round(cx - Math.max(outerEdge, 90)), y: round(cy + outerEdge + 4), w: Math.round(2 * Math.max(outerEdge, 90)), h: captionH };
  const circles: Circle[] = [{ x: cx, y: cy, r: outerEdge }];
  const rects: Rect[] = [caption];
  const bars: { a: Point; b: Point; w: number }[] = [];
  const out: FocusSide[] = [];
  const xAt = (dy: number) => rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2));
  sides.slice(0, 2).forEach((input, index) => {
    const side = (index === 0 ? -1 : 1) as -1 | 1;
    const head: FocusNode = { x: round(cx + side * rx), y: round(cy), r: round(rh), label: null };
    circles.push(head);
    const bar = { a: { x: round(cx + side * outerEdge), y: round(cy) }, b: { x: round(head.x - side * rh), y: round(cy) } };
    bars.push({ ...bar, w: stroke.bar });
    const chain: FocusChainNode[] = [];
    let lastUp: Point & { r: number } = head;
    let lastDown: Point & { r: number } = head;
    let ups = 0;
    let downs = 0;
    const shown = Math.min(FOCUS_CHAIN_MAX, input.members.length);
    for (let i = 0; i < shown; i += 1) {
      const above = i % 2 === 0;
      const k = (above ? ups : downs) + 1;
      const dy = (above ? -1 : 1) * k * step;
      const p = { x: cx + side * xAt(dy), y: cy + dy };
      // Stop before the chain reaches the centre column, or the box ends.
      if (Math.abs(p.x - cx) < outerEdge * 0.35 + rm || p.y - rm < box.y + 2 || p.y + rm > box.y + box.h - 2) {
        if (above) ups = 99;
        else downs = 99;
        if (ups >= 99 && downs >= 99) break;
        continue;
      }
      const from = above ? lastUp : lastDown;
      const node: FocusChainNode = { x: round(p.x), y: round(p.y), r: round(rm), label: null, index: i, from };
      chain.push(node);
      circles.push(node);
      bars.push({ a: edgePoint(from, node, from.r), b: edgePoint(node, from, rm), w: stroke.chain });
      if (above) {
        ups += 1;
        lastUp = node;
      } else {
        downs += 1;
        lastDown = node;
      }
    }
    const hidden = input.members.length - chain.length;
    let more: Circle | null = null;
    if (hidden > 0) {
      const r = clamp(rm * 0.62, 14, 20);
      // Beside the last member below, on the inner side, else on the head's rim.
      const last = lastDown;
      const candidate = { x: round(last.x - side * (last.r + r + 10)), y: round(last.y + (last === head ? rh * 0.9 : 0)), r: round(r) };
      const blocked = circles.some((c) => Math.hypot(c.x - candidate.x, c.y - candidate.y) < c.r + r + 3);
      more = blocked ? { x: round(head.x - side * rh * 0.72), y: round(head.y + rh * 0.9), r: round(r) } : candidate;
      circles.push(more);
    }
    out.push({ side, head, bar, chain, more, hidden });
  });
  // Labels: heads first, then the chains in order; all on the outer side.
  for (const [index, side] of out.entries()) {
    const input = sides[index];
    side.head.label = placeLabel(side.head, input.head, { x: cx, y: side.head.y }, metrics, { circles, bars, rects, box }, "side");
    if (side.head.label) rects.push(side.head.label);
  }
  for (const [index, side] of out.entries()) {
    const input = sides[index];
    for (const node of side.chain) {
      node.label = placeLabel(node, input.members[node.index], { x: cx, y: node.y }, metrics, { circles, bars, rects, box }, "side");
      if (node.label) rects.push(node.label);
    }
  }
  return {
    centre,
    outerRing: { r: round(outerR), width: round(outerWidth) },
    innerRing: { r: round(innerR), width: round(innerWidth) },
    caption,
    sides: out,
    stroke,
    metrics,
    scale,
  };
}
