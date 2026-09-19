import type { OrgBranch, OrgLevel, OrgSubtype, OrgType } from "./types";

/**
 * Layout `nl-tiers-v1`: the concentric tier layout (spec: web/lib/graph-layout.md,
 * decision: docs/adr/0015-graph-rebuild.md, plan: docs/13-graph-rebuild-plan.md).
 *
 * Six concentric tiers by statutory function radiate from the Grondwet at the
 * core; the electorate is the outer frame, so every mandate points inward from
 * the voters. Each tier is divided into sectors, one per group of organs, and
 * each sector fills its whole arc with evenly spread rings: a ring never bunches
 * its marks at one end while the rest of the arc stays empty. A gemeente,
 * provincie, waterschap or openbaar lichaam is one mark carrying its raad and
 * its commissie as orbit marks that fly out on focus. The two Kamers are drawn
 * as ∩ arches in the politieke kern.
 *
 * Deterministic: no randomness, no time, no dependence on object key order.
 * Ties break on name, then id.
 */

export const GRAPH_SCHEMA = "nl-graph-bundle-v1";
export const GRAPH_LAYOUT = "nl-tiers-v1";

/** The Grondwet disc at the core. */
export const CORE_RADIUS = 62;
/**
 * Free band between the core disc and the first tier. It also carries the two
 * label lanes of the first tier, which is why it is wider than a tier gap.
 */
export const CORE_CLEARANCE = 46;
/** Radial gap between two tiers. Cross-sector edges travel along it. */
export const TIER_GAP = 30;
/** Angular gap between two sectors of the same tier. */
export const SECTOR_GUTTER = (3 * Math.PI) / 180;
/** Minimum edge-to-edge gap between two glyphs. */
export const GLYPH_GAP = 3;
export const MIN_RING_STEP = 15;
export const MAX_RING_STEP = 40;
/** Free band between the outermost tier and the electorate frame. */
export const FRAME_CLEARANCE = 34;
/** Margin between the frame and the viewBox edge, room for the frame label. */
export const FRAME_MARGIN = 46;
/**
 * Radial room reserved in the viewBox for the step back of an open focus, so
 * an expanded neighbourhood never leaves the canvas at zoom 1.
 */
export const PUSH_RESERVE = 96;
/** The first sector of every tier starts straight up, so tiers read as one dial. */
export const START_ANGLE = -Math.PI / 2;
/** Extra glyph radius for the focused mark. */
export const SELECTED_GROWTH = 1.5;
export const MAX_DEPTH = 6;
export const BOW = 0.14;
/** Kept for the power map, which centres its own layout on a hub radius. */
export const HUB_RADIUS = CORE_RADIUS;

/** Seat pitch of the two arches drawn inside the canvas, and their offsets. */
export const ARCH_PITCH_TK = 4.2;
export const ARCH_PITCH_EK = 3.2;
export const ARCH_TK_OFFSET = -22;
export const ARCH_EK_OFFSET = 30;

export type GlyphClass =
  | "shield"
  | "hex"
  | "capsule"
  | "diamond"
  | "triangle"
  | "seat"
  | "dot"
  | "small-dot";

export type BundleNode = {
  id: string;
  slug: string;
  name: string;
  type: OrgType;
  subtype: OrgSubtype;
  branch: OrgBranch;
  level: OrgLevel;
  degree: number;
  parent: string | null;
};

export type BundleEdge = {
  from: string;
  to: string;
  type: string;
};

export type HubNode = {
  id: string;
  slug: string;
  name: string;
};

export type PowerMapPerson = {
  person: string;
  slug: string | null;
  name: string;
  job: string | null;
  position: string | null;
  party: string | null;
  node: string | null;
  image: string | null;
  rank: number;
  total: number;
  recent: number;
  weeks: number[];
  heat: number;
  latest: { date: string | null; headline: string | null; source: string | null; url: string | null };
};

export type PowerMap = {
  windowDays: number;
  since: string | null;
  computedAt: string | null;
  articleCount: number;
  sources: string[];
  people: PowerMapPerson[];
};

export type EntityPowerPerson = {
  person: string;
  slug: string;
  name: string;
  job: string | null;
  party: string | null;
  image: string | null;
  total: number;
  recent: number;
  latest: { date: string | null; headline: string | null; source: string | null };
};

/** Per-entity lists of people in the news, ranked by mentions within the window. */
export type EntityPowerMap = Record<string, EntityPowerPerson[]>;

/** One fractie block of a chamber, resolved through the sourced party registry. */
export type ChamberSeatEntry = {
  key: string | null;
  label: string;
  color: string | null;
  splinter: boolean;
  seats: number;
};

/** Seat arithmetic of an elected chamber, computed by build-graph.mjs. */
export type ChamberSeats = {
  total: number;
  majority: number;
  entries: ChamberSeatEntry[];
};

export type GraphBundle = {
  schema: string;
  scope: string;
  snapshot: string | null;
  layout: string;
  hub: HubNode | null;
  nodes: BundleNode[];
  edges: BundleEdge[];
  powerMap: PowerMap;
  /** Maps entity ids (org:, person:, pos:) to their people-in-the-news ranking. */
  entityPowerMap: EntityPowerMap;
  /** Maps person slugs to person ids so entity pages can resolve their id. */
  personSlugs: Record<string, string>;
  /** Seat blocks per chamber organization id, for the arches. */
  chambers?: Record<string, ChamberSeats>;
};

export type TierId = "kern" | "politiek" | "ministeries" | "uitvoering" | "decentraal" | "koninkrijk";

export type ArchBlock = { angle: number; radius: number; width: number; height: number };

export type SectorInfo = {
  id: string;
  tier: TierId;
  /** Branch that colours the sector and matches the legend filter. */
  branch: OrgBranch;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  count: number;
  innerRadius: number;
  outerRadius: number;
  /** The ∩ arch block of the Staten-Generaal sector, or null. */
  block: ArchBlock | null;
};

export type TierInfo = {
  id: TierId;
  index: number;
  innerRadius: number;
  outerRadius: number;
  count: number;
  sectors: SectorInfo[];
};

export type LaidOutNode = BundleNode & {
  x: number;
  y: number;
  angle: number;
  radius: number;
  depth: number;
  glyph: GlyphClass;
  glyphRadius: number;
  tier: TierId;
  sector: string;
  subSector: string;
  /** Not drawn at rest: a collapsed child, or a chamber that the arch stands for. */
  hidden: boolean;
  /** Drawn as a ∩ arch instead of a glyph. */
  arch: boolean;
  /** How many collapsed children this mark carries as orbit marks. */
  orbit: number;
  /** The parent mark this node is collapsed into, or null. */
  collapsedInto: string | null;
};

export type LaidOutFrame = {
  id: string;
  slug: string;
  name: string;
  /** The electorate is the outer frame ring, not a centre mark. */
  radius: number;
};

export type GraphLayout = {
  nodes: LaidOutNode[];
  byId: Map<string, LaidOutNode>;
  edges: BundleEdge[];
  adjacency: Map<string, string[]>;
  /** The electorate, drawn as the frame that contains every tier. */
  frame: LaidOutFrame | null;
  tiers: TierInfo[];
  /** Every sector, in tier order then angular order. */
  sectors: SectorInfo[];
  /** Radii of the channels (tier gaps) routed edges travel along, innermost first. */
  channels: number[];
  coreRadius: number;
  frameRadius: number;
  /** Farthest glyph edge from the centre. */
  maxRadius: number;
  viewBox: { x: number; y: number; width: number; height: number };
};

export const SECTOR_ORDER: OrgBranch[] = [
  "staten-generaal",
  "regering",
  "rechterlijke-macht",
  "hoge-colleges",
  "adviescolleges",
  "decentraal-provinciaal",
  "decentraal-lokaal",
  "waterschap",
  "caribisch-nederland",
  "zelfstandig",
  "koninkrijk",
];

export const GLYPH_BY_SUBTYPE: Record<OrgSubtype, GlyphClass> = {
  ministerie: "shield",
  defensieonderdeel: "shield",
  agentschap: "hex",
  uitvoeringsorganisatie: "hex",
  inspectie: "hex",
  zbo: "capsule",
  rwt: "capsule",
  toezichthouder: "capsule",
  "rechterlijke-instantie": "diamond",
  "hoge-college": "diamond",
  kiesraad: "diamond",
  adviescollege: "triangle",
  planbureau: "triangle",
  staatscommissie: "triangle",
  "raad-van-advies": "triangle",
  "tweede-kamer": "seat",
  "eerste-kamer": "seat",
  "provinciale-staten": "seat",
  gemeenteraad: "seat",
  "algemeen-bestuur-waterschap": "seat",
  eilandsraad: "seat",
  "europees-parlement": "seat",
  "staten-land": "seat",
  gemeente: "dot",
  provincie: "dot",
  waterschap: "dot",
  veiligheidsregio: "dot",
  "openbaar-lichaam-bes": "dot",
  samenwerkingsverband: "dot",
  koninkrijksorgaan: "dot",
  "land-regering": "dot",
  "kiesgerechtigden-nederland": "dot",
  "kiezers-caribisch-nederland": "dot",
  commissie: "small-dot",
};

// ---------------------------------------------------------------------------
// The tier table: every branch and subtype has exactly one place
// ---------------------------------------------------------------------------

type SectorDef = {
  id: string;
  branch: OrgBranch;
  member: (node: BundleNode) => boolean;
  /** Chambers this sector draws as ∩ arches instead of glyphs. */
  archAnchor?: (node: BundleNode) => boolean;
};

type TierDef = { id: TierId; sectors: SectorDef[] };

export const TIER_TABLE: readonly TierDef[] = [
  {
    id: "kern",
    sectors: [
      { id: "hoge-colleges", branch: "hoge-colleges", member: (n) => n.branch === "hoge-colleges" },
      { id: "rechterlijke-macht", branch: "rechterlijke-macht", member: (n) => n.branch === "rechterlijke-macht" },
    ],
  },
  {
    id: "politiek",
    sectors: [
      {
        id: "staten-generaal",
        branch: "staten-generaal",
        member: (n) => n.branch === "staten-generaal",
        archAnchor: (n) => n.subtype === "tweede-kamer" || n.subtype === "eerste-kamer",
      },
      {
        id: "regering",
        branch: "regering",
        member: (n) => n.branch === "regering" && (n.subtype === "land-regering" || n.subtype === "commissie"),
      },
    ],
  },
  {
    id: "ministeries",
    sectors: [
      { id: "ministeries", branch: "regering", member: (n) => n.branch === "regering" && n.subtype === "ministerie" },
    ],
  },
  {
    id: "uitvoering",
    sectors: [
      {
        id: "uitvoering",
        branch: "regering",
        member: (n) => n.branch === "regering" && (n.subtype === "agentschap" || n.subtype === "uitvoeringsorganisatie"),
      },
      { id: "inspecties", branch: "regering", member: (n) => n.branch === "regering" && n.subtype === "inspectie" },
      { id: "zelfstandig", branch: "zelfstandig", member: (n) => n.branch === "zelfstandig" },
      { id: "advies", branch: "adviescolleges", member: (n) => n.branch === "adviescolleges" },
    ],
  },
  {
    id: "decentraal",
    sectors: [
      { id: "provincies", branch: "decentraal-provinciaal", member: (n) => n.branch === "decentraal-provinciaal" },
      { id: "gemeenten", branch: "decentraal-lokaal", member: (n) => n.branch === "decentraal-lokaal" },
      { id: "waterschappen", branch: "waterschap", member: (n) => n.branch === "waterschap" },
      { id: "caribisch", branch: "caribisch-nederland", member: (n) => n.branch === "caribisch-nederland" },
    ],
  },
  {
    id: "koninkrijk",
    sectors: [{ id: "koninkrijk", branch: "koninkrijk", member: (n) => n.branch === "koninkrijk" }],
  },
];

/** A branch the table misses becomes its own sector in this tier, never dropped. */
const FALLBACK_TIER: TierId = "koninkrijk";

/** Children folded onto their body's mark. */
export const COLLAPSE_CHILD: ReadonlySet<string> = new Set([
  "gemeenteraad",
  "provinciale-staten",
  "algemeen-bestuur-waterschap",
  "eilandsraad",
  "commissie",
]);
export const COLLAPSE_PARENT: ReadonlySet<string> = new Set([
  "gemeente",
  "provincie",
  "waterschap",
  "openbaar-lichaam-bes",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function compareNames(a: string, b: string, aId: string, bId: string): number {
  if (a !== b) return a < b ? -1 : 1;
  if (aId !== bId) return aId < bId ? -1 : 1;
  return 0;
}

export function computeDepths(nodes: BundleNode[]): Map<string, number> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  const walk = (node: BundleNode): number => {
    const cached = memo.get(node.id);
    if (cached !== undefined) return cached;
    if (!node.parent || node.parent === node.id) {
      memo.set(node.id, 0);
      return 0;
    }
    const parent = byId.get(node.parent);
    if (!parent || visiting.has(node.id)) {
      memo.set(node.id, 0);
      return 0;
    }
    visiting.add(node.id);
    const depth = Math.min(MAX_DEPTH, 1 + walk(parent));
    visiting.delete(node.id);
    memo.set(node.id, depth);
    return depth;
  };

  for (const node of nodes) walk(node);
  return memo;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

/**
 * Proportional spans with minimums. Entries below their minimum are raised and
 * the excess is taken from the others in proportion to their headroom. If the
 * minimums alone exceed the total, every minimum is scaled by one factor, so
 * the layout degrades evenly instead of dropping a sector.
 */
export function allocateSpans(weights: number[], minimums: number[], total: number): number[] {
  const count = weights.length;
  if (count === 0) return [];
  const minimumTotal = minimums.reduce((sum, value) => sum + value, 0);
  if (minimumTotal >= total) {
    const scale = total / Math.max(1e-9, minimumTotal);
    return minimums.map((value) => value * scale);
  }
  const weightTotal = Math.max(1e-9, weights.reduce((sum, value) => sum + value, 0));
  let spans = weights.map((weight, index) => Math.max(minimums[index], (weight / weightTotal) * total));
  for (let pass = 0; pass < count + 2; pass += 1) {
    const excess = spans.reduce((sum, value) => sum + value, 0) - total;
    if (excess <= 1e-9) break;
    const headroomTotal = spans.reduce((sum, value, index) => sum + Math.max(0, value - minimums[index]), 0);
    if (headroomTotal <= 1e-9) break;
    spans = spans.map((value, index) => {
      const headroom = Math.max(0, value - minimums[index]);
      return Math.max(minimums[index], value - (excess * headroom) / headroomTotal);
    });
  }
  return spans;
}

export function glyphRadiusForDegree(degree: number, selected = false): number {
  const base = Math.min(10, Math.max(5, 5 + Math.sqrt(Math.max(0, degree)) * 1.1));
  return selected ? base + SELECTED_GROWTH : base;
}

export function glyphFootprint(node: Pick<BundleNode, "subtype" | "degree">): number {
  const radius = glyphRadiusForDegree(node.degree, false);
  switch (GLYPH_BY_SUBTYPE[node.subtype] ?? "dot") {
    case "small-dot":
      return radius * 0.68;
    case "capsule":
      return Math.hypot(radius, radius * 0.6);
    case "seat":
      return Math.hypot(radius, radius * 0.38);
    default:
      return radius;
  }
}

/** Quadratic curve bowing away from the centre, for an edge inside one sector. */
export function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return `M ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)}`;
  const nx = -dy / len;
  const ny = dx / len;
  const side = midX * nx + midY * ny >= 0 ? 1 : -1;
  const ctrlX = midX + nx * side * len * BOW;
  const ctrlY = midY + ny * side * len * BOW;
  return `M ${round(x1)} ${round(y1)} Q ${round(ctrlX)} ${round(ctrlY)} ${round(x2)} ${round(y2)}`;
}

/** Signed angle in (-pi, pi]. */
export function wrapPi(angle: number): number {
  const turn = 2 * Math.PI;
  const wrapped = ((angle % turn) + turn) % turn;
  return wrapped > Math.PI ? wrapped - turn : wrapped;
}

/**
 * An edge between two sectors: radially to the channel between the two tiers,
 * along the channel the short way round, then radially to the target. It never
 * crosses the core, and edges bundle inside the tier gaps instead of spraying
 * chords over the whole canvas.
 */
export function routedEdgePath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  channels: readonly number[],
): string {
  const ra = Math.hypot(a.x, a.y);
  const rb = Math.hypot(b.x, b.y);
  const ta = Math.atan2(a.y, a.x);
  const tb = Math.atan2(b.y, b.x);
  const inner = Math.min(ra, rb);
  const outer = Math.max(ra, rb);
  let channel: number | undefined = channels.find((value) => value > inner && value < outer);
  if (channel === undefined) {
    for (let i = channels.length - 1; i >= 0; i -= 1) {
      if (channels[i] < inner) {
        channel = channels[i];
        break;
      }
    }
  }
  if (channel === undefined) channel = Math.max(CORE_RADIUS + 6, inner - TIER_GAP / 2);
  const delta = wrapPi(tb - ta);
  const sweep = delta > 0 ? 1 : 0;
  const point = (r: number, t: number) => `${round(Math.cos(t) * r)} ${round(Math.sin(t) * r)}`;
  return (
    `M ${round(a.x)} ${round(a.y)} L ${point(channel, ta)} ` +
    `A ${round(channel)} ${round(channel)} 0 0 ${sweep} ${point(channel, tb)} ` +
    `L ${round(b.x)} ${round(b.y)}`
  );
}

// ---------------------------------------------------------------------------
// The ∩ arch
// ---------------------------------------------------------------------------

export type ArchParams = { rows: number; r0Steps: number; legRows: number; arc: number; total: number };

export type ArchSeat = {
  x: number;
  y: number;
  row: number;
  /** Position along the path: left leg bottom, up, over the arch, down the right leg. */
  path: number;
  arc: boolean;
  /** For an arc seat: 0 at the left end, 1 at the right end. */
  t: number;
};

/**
 * Arch parameters that give exactly `total` seats. Throws instead of rounding,
 * so a wrong chamber size fails the build rather than drawing 149 seats.
 */
export function archParams(total: number, rows: number, r0Steps: number): ArchParams {
  let arc = 0;
  for (let row = 0; row < rows; row += 1) arc += Math.max(1, Math.round(Math.PI * (r0Steps + row)));
  const legRows = (total - arc) / (2 * rows);
  if (!Number.isInteger(legRows) || legRows < 1) {
    throw new Error(
      `arch(${total}, rows ${rows}, r0 ${r0Steps}) leaves ${total - arc} leg seats, not divisible by ${2 * rows}`,
    );
  }
  return { rows, r0Steps, legRows, arc, total };
}

/** Tweede Kamer: 5 rows, 70 arc seats, legs of 8 per row per side. */
export const ARCH_TK: ArchParams = archParams(150, 5, 2.5);
/** Eerste Kamer: 3 rows, 33 arc seats, legs of 7 per row per side. */
export const ARCH_EK: ArchParams = archParams(75, 3, 2.5);

/**
 * Seats of a ∩ arch around its centre of curvature: concentric arcs over the
 * top continued as straight legs, the shape of the plenary hall, never a plain
 * semicircle. Seat pitch is the same along the arc and down the legs. Seats
 * come back sorted along the path, so filling them in order gives one
 * contiguous block per fractie. The dome is at negative y; `flip` mirrors it.
 */
export function archSeats(params: ArchParams, step: number, flip = false): ArchSeat[] {
  const seats: ArchSeat[] = [];
  const sign = flip ? -1 : 1;
  for (let row = 0; row < params.rows; row += 1) {
    const radius = (params.r0Steps + row) * step;
    const count = Math.max(1, Math.round((Math.PI * radius) / step));
    for (let seat = 0; seat < count; seat += 1) {
      const t = count === 1 ? 0.5 : seat / (count - 1);
      const angle = Math.PI + t * Math.PI;
      seats.push({ x: Math.cos(angle) * radius, y: sign * Math.sin(angle) * radius, row, path: 1 + t, arc: true, t });
    }
    for (let k = 1; k <= params.legRows; k += 1) {
      const y = sign * k * step;
      seats.push({ x: -radius, y, row, path: 1 - k / (params.legRows + 1), arc: false, t: 0 });
      seats.push({ x: radius, y, row, path: 2 + k / (params.legRows + 1), arc: false, t: 1 });
    }
  }
  seats.sort((a, b) => a.path - b.path || a.row - b.row);
  return seats;
}

/** Bounding size of an arch at a given seat pitch. */
export function archSize(params: ArchParams, step: number): { width: number; height: number; seatRadius: number } {
  const outer = (params.r0Steps + params.rows - 1) * step;
  return {
    width: 2 * outer + step,
    height: outer + params.legRows * step + step,
    seatRadius: step * 0.36,
  };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function ringStepFor(nodes: BundleNode[]): number {
  let ceiling = 0;
  for (const node of nodes) ceiling = Math.max(ceiling, glyphFootprint(node));
  const needed = 2 * ceiling + GLYPH_GAP + 2 * SELECTED_GROWTH;
  return Math.min(MAX_RING_STEP, Math.max(MIN_RING_STEP, Math.ceil(needed / 5) * 5));
}

export type Placement = { node: BundleNode; angle: number; radius: number };

/**
 * Fill a sector with evenly spread rings.
 *
 * Rings are opened outward until they hold every node, then the nodes are
 * distributed over the rings in proportion to each ring's capacity and spread
 * evenly across the sector's whole arc. This is what keeps a ring from packing
 * its marks against one edge of the sector and leaving the rest of the arc
 * empty: the gap between two neighbours on a ring is the same everywhere, and
 * every ring of the sector is filled to the same fraction of its capacity.
 */
export function packSector(
  nodes: BundleNode[],
  start: number,
  end: number,
  innerRadius: number,
): { placed: Placement[]; outerRadius: number } {
  const span = end - start;
  if (nodes.length === 0 || span <= 0.001) return { placed: [], outerRadius: innerRadius };

  let maxFoot = 0;
  for (const node of nodes) maxFoot = Math.max(maxFoot, glyphFootprint(node));
  const pitch = 2 * maxFoot + GLYPH_GAP;
  const step = ringStepFor(nodes);

  const rings: { radius: number; capacity: number }[] = [];
  let radius = innerRadius + maxFoot;
  let capacityTotal = 0;
  for (let guard = 0; guard < 500 && capacityTotal < nodes.length; guard += 1) {
    const capacity = Math.floor((span * radius) / pitch);
    if (capacity >= 1) {
      rings.push({ radius, capacity });
      capacityTotal += capacity;
    }
    radius += step;
  }
  if (rings.length === 0) return { placed: [], outerRadius: innerRadius };

  // Largest-remainder distribution over the rings: deterministic, and it keeps
  // every ring at the same fill fraction so the sector reads as one block.
  const shares = rings.map((ring) => (nodes.length * ring.capacity) / capacityTotal);
  const counts = shares.map((share) => Math.floor(share));
  let left = nodes.length - counts.reduce((sum, value) => sum + value, 0);
  const byRemainder = shares
    .map((share, index) => ({ index, remainder: share - Math.floor(share) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const entry of byRemainder) {
    if (left <= 0) break;
    if (counts[entry.index] < rings[entry.index].capacity) {
      counts[entry.index] += 1;
      left -= 1;
    }
  }
  for (let index = 0; left > 0; index = (index + 1) % rings.length) {
    if (counts[index] < rings[index].capacity) {
      counts[index] += 1;
      left -= 1;
    }
  }

  const placed: Placement[] = [];
  let cursor = 0;
  let outerRadius = innerRadius;
  rings.forEach((ring, index) => {
    const count = counts[index];
    for (let i = 0; i < count; i += 1) {
      const node = nodes[cursor + i];
      const angle = start + (span * (i + 0.5)) / count;
      placed.push({ node, angle, radius: ring.radius });
      outerRadius = Math.max(outerRadius, ring.radius + glyphFootprint(node));
    }
    cursor += count;
  });
  return { placed, outerRadius };
}

export function computeLayout(bundle: GraphBundle): GraphLayout {
  const frameId = bundle.hub?.id ?? null;
  const byBundleId = new Map(bundle.nodes.map((node) => [node.id, node]));
  const depths = computeDepths(bundle.nodes);

  const adjacency = new Map<string, string[]>();
  for (const node of bundle.nodes) adjacency.set(node.id, []);
  for (const edge of bundle.edges) {
    if (!byBundleId.has(edge.from) || !byBundleId.has(edge.to)) continue;
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }
  for (const list of adjacency.values()) list.sort();

  const all = bundle.nodes.filter((node) => node.id !== frameId);

  const collapsedInto = new Map<string, string>();
  for (const node of all) {
    const parent = node.parent ? byBundleId.get(node.parent) : null;
    if (parent && COLLAPSE_CHILD.has(node.subtype) && COLLAPSE_PARENT.has(parent.subtype)) {
      collapsedInto.set(node.id, parent.id);
    }
  }
  const orbitCount = new Map<string, number>();
  for (const parentId of collapsedInto.values()) orbitCount.set(parentId, (orbitCount.get(parentId) ?? 0) + 1);
  const standing = all.filter((node) => !collapsedInto.has(node.id));

  const sortNodes = (list: BundleNode[]) =>
    [...list].sort((a, b) => {
      const da = depths.get(a.id) ?? 0;
      const db = depths.get(b.id) ?? 0;
      if (da !== db) return da - db;
      return compareNames(a.name, b.name, a.id, b.id);
    });

  const assigned = new Set<string>();
  const membersBySector = new Map<string, BundleNode[]>();
  const extraSectors: SectorDef[] = [];
  for (const tier of TIER_TABLE) {
    for (const sector of tier.sectors) {
      const members = standing.filter((node) => !assigned.has(node.id) && sector.member(node));
      for (const node of members) assigned.add(node.id);
      membersBySector.set(sector.id, sortNodes(members));
    }
  }
  const leftover = groupBy(standing.filter((node) => !assigned.has(node.id)), (node) => node.branch);
  for (const branch of [...leftover.keys()].sort()) {
    const id = `overig-${branch}`;
    extraSectors.push({ id, branch, member: (node) => node.branch === branch });
    membersBySector.set(id, sortNodes(leftover.get(branch) ?? []));
  }

  const archTk = archSize(ARCH_TK, ARCH_PITCH_TK);
  const archEk = archSize(ARCH_EK, ARCH_PITCH_EK);
  const blockWidth =
    Math.max(ARCH_EK_OFFSET + archEk.width / 2, ARCH_TK_OFFSET + archTk.width / 2) -
    Math.min(ARCH_TK_OFFSET - archTk.width / 2, ARCH_EK_OFFSET - archEk.width / 2) +
    8;
  const blockHeight = Math.max(archTk.height, archEk.height) + 8;

  const laidOut = new Map<string, LaidOutNode>();
  const tiers: TierInfo[] = [];
  const sectors: SectorInfo[] = [];
  const channels: number[] = [];
  let tierInner = CORE_RADIUS + CORE_CLEARANCE;
  let maxRadius = CORE_RADIUS;

  for (const tierDef of TIER_TABLE) {
    const sectorDefs = tierDef.id === FALLBACK_TIER ? [...tierDef.sectors, ...extraSectors] : tierDef.sectors;
    const live = sectorDefs.filter((sector) => (membersBySector.get(sector.id) ?? []).length > 0);
    channels.push(round(tierInner - TIER_GAP / 2));
    if (live.length === 0) {
      tiers.push({ id: tierDef.id, index: tiers.length, innerRadius: round(tierInner), outerRadius: round(tierInner), count: 0, sectors: [] });
      continue;
    }

    const usable = 2 * Math.PI - live.length * SECTOR_GUTTER;
    const weights: number[] = [];
    const minimums: number[] = [];
    for (const sector of live) {
      const members = membersBySector.get(sector.id) ?? [];
      // Arc demand, square-rooted: a sector of a thousand marks stays larger
      // than a sector of ten without swallowing the ring.
      const demand = members.reduce((sum, node) => sum + 2 * glyphFootprint(node) + GLYPH_GAP, 0);
      weights.push(Math.sqrt(Math.max(1, demand)));
      let widest = 0;
      for (const node of members) widest = Math.max(widest, 2 * glyphFootprint(node) + GLYPH_GAP);
      // Room for three of its widest marks side by side on the inner ring, or
      // for the arch block when the sector carries one.
      let minimum = (3 * widest) / (tierInner + widest);
      if (sector.archAnchor) minimum = Math.max(minimum, blockWidth / (tierInner + blockHeight / 2) + 0.05);
      minimums.push(Math.min(usable / live.length, minimum));
    }
    const spans = allocateSpans(weights, minimums, usable);

    let cursor = START_ANGLE;
    let tierOuter = tierInner;
    const tierSectors: SectorInfo[] = [];

    live.forEach((sector, index) => {
      const start = cursor + SECTOR_GUTTER / 2;
      const end = start + spans[index];
      const mid = (start + end) / 2;
      const members = membersBySector.get(sector.id) ?? [];
      let packInner = tierInner;
      let block: ArchBlock | null = null;
      let rest = members;

      if (sector.archAnchor) {
        const anchors = members.filter((node) => sector.archAnchor?.(node));
        if (anchors.length > 0) {
          block = {
            angle: round(mid),
            radius: round(tierInner + blockHeight / 2),
            width: round(blockWidth),
            height: round(blockHeight),
          };
          for (const node of anchors) {
            laidOut.set(node.id, {
              ...node,
              x: round(Math.cos(block.angle) * block.radius),
              y: round(Math.sin(block.angle) * block.radius),
              angle: block.angle,
              radius: block.radius,
              depth: depths.get(node.id) ?? 0,
              glyph: GLYPH_BY_SUBTYPE[node.subtype] ?? "dot",
              glyphRadius: round(glyphRadiusForDegree(node.degree, false)),
              tier: tierDef.id,
              sector: sector.id,
              subSector: node.subtype,
              hidden: true,
              arch: true,
              orbit: 0,
              collapsedInto: null,
            });
          }
          packInner = tierInner + blockHeight + 8;
          rest = members.filter((node) => !sector.archAnchor?.(node));
        }
      }

      const { placed, outerRadius } = packSector(rest, start, end, packInner);
      for (const { node, angle, radius } of placed) {
        laidOut.set(node.id, {
          ...node,
          x: round(Math.cos(angle) * radius),
          y: round(Math.sin(angle) * radius),
          angle: round(angle),
          radius: round(radius),
          depth: depths.get(node.id) ?? 0,
          glyph: GLYPH_BY_SUBTYPE[node.subtype] ?? "dot",
          glyphRadius: round(glyphRadiusForDegree(node.degree, false)),
          tier: tierDef.id,
          sector: sector.id,
          subSector: node.subtype,
          hidden: false,
          arch: false,
          orbit: orbitCount.get(node.id) ?? 0,
          collapsedInto: null,
        });
      }

      const sectorOuter = Math.max(outerRadius, block ? tierInner + blockHeight : tierInner);
      tierOuter = Math.max(tierOuter, sectorOuter);
      const info: SectorInfo = {
        id: sector.id,
        tier: tierDef.id,
        branch: sector.branch,
        startAngle: round(start),
        endAngle: round(end),
        midAngle: round(mid),
        count: members.length,
        innerRadius: round(tierInner),
        outerRadius: round(sectorOuter),
        block,
      };
      tierSectors.push(info);
      sectors.push(info);
      cursor = end + SECTOR_GUTTER / 2;
    });

    tiers.push({
      id: tierDef.id,
      index: tiers.length,
      innerRadius: round(tierInner),
      outerRadius: round(tierOuter),
      count: tierSectors.reduce((sum, sector) => sum + sector.count, 0),
      sectors: tierSectors,
    });
    maxRadius = Math.max(maxRadius, tierOuter);
    tierInner = tierOuter + TIER_GAP;
  }

  // A collapsed child rides just outside its body's mark, fanned outward. It is
  // hidden at rest and flies out when the body is focused.
  const siblingsByParent = new Map<string, string[]>();
  for (const [childId, parentId] of collapsedInto) {
    const list = siblingsByParent.get(parentId) ?? [];
    list.push(childId);
    siblingsByParent.set(parentId, list);
  }
  for (const list of siblingsByParent.values()) list.sort();
  for (const [childId, parentId] of collapsedInto) {
    const child = byBundleId.get(childId);
    const parent = laidOut.get(parentId);
    if (!child || !parent) continue;
    const siblings = siblingsByParent.get(parentId) ?? [];
    const index = siblings.indexOf(childId);
    const fan = (32 * Math.PI) / 180;
    const direction = parent.angle + (index - (siblings.length - 1) / 2) * fan;
    const distance = glyphFootprint(parent) + glyphFootprint(child) + 2;
    const x = parent.x + Math.cos(direction) * distance;
    const y = parent.y + Math.sin(direction) * distance;
    laidOut.set(childId, {
      ...child,
      x: round(x),
      y: round(y),
      angle: round(Math.atan2(y, x)),
      radius: round(Math.hypot(x, y)),
      depth: depths.get(childId) ?? 0,
      glyph: GLYPH_BY_SUBTYPE[child.subtype] ?? "dot",
      glyphRadius: round(glyphRadiusForDegree(child.degree, false)),
      tier: parent.tier,
      sector: parent.sector,
      subSector: child.subtype,
      hidden: true,
      arch: false,
      orbit: 0,
      collapsedInto: parentId,
    });
  }

  const frameRadius = round(maxRadius + FRAME_CLEARANCE);
  const ordered: LaidOutNode[] = [];
  for (const node of bundle.nodes) {
    const laid = laidOut.get(node.id);
    if (laid) ordered.push(laid);
  }

  const frame = bundle.hub
    ? { id: bundle.hub.id, slug: bundle.hub.slug, name: bundle.hub.name, radius: frameRadius }
    : null;

  const half = round(frameRadius + PUSH_RESERVE + FRAME_MARGIN);
  return {
    nodes: ordered,
    byId: laidOut,
    edges: bundle.edges.filter((edge) => byBundleId.has(edge.from) && byBundleId.has(edge.to)),
    adjacency,
    frame,
    tiers,
    sectors,
    channels,
    coreRadius: CORE_RADIUS,
    frameRadius,
    maxRadius: round(maxRadius),
    viewBox: { x: -half, y: -half, width: half * 2, height: half * 2 },
  };
}

export function neighborsOf(layout: GraphLayout, nodeId: string): Set<string> {
  return new Set(layout.adjacency.get(nodeId) ?? []);
}

/**
 * Shortest path from a node to the electorate over the undirected edge graph,
 * neighbours visited in id order so ties resolve the same way every time. When
 * no path exists the containment spine is used instead, because drawing an
 * edge the data does not contain would assert a relation that is not there.
 */
export function computeFocusPath(layout: GraphLayout, nodeId: string): string[] {
  if (!layout.byId.has(nodeId)) return [];
  const frameId = layout.frame?.id ?? null;

  if (frameId && frameId !== nodeId) {
    const previous = new Map<string, string>();
    const queue: string[] = [nodeId];
    const seen = new Set<string>([nodeId]);
    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (current === frameId) {
        const path: string[] = [frameId];
        let step = frameId;
        while (previous.has(step)) {
          step = previous.get(step) as string;
          path.unshift(step);
        }
        return path;
      }
      for (const next of layout.adjacency.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        previous.set(next, current);
        queue.push(next);
      }
    }
  }

  const spine: string[] = [];
  const seen = new Set<string>();
  let current = layout.byId.get(nodeId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    spine.push(current.id);
    current = current.parent ? layout.byId.get(current.parent) : undefined;
  }
  return spine;
}

/**
 * The frame rotation that brings `angle` to the reading angle (straight up),
 * expressed as the value nearest `previous` so the canvas always turns the
 * short way and never unwinds a whole circle. A turn under the tolerance is
 * not made at all, so selecting a neighbour does not nudge the whole canvas.
 */
export function alignRotation(angle: number | null, previous: number, tolerance = 0.05): number {
  const wanted = angle === null ? 0 : START_ANGLE - angle;
  const delta = wrapPi(wanted - previous);
  if (Math.abs(delta) < tolerance) return previous;
  return previous + delta;
}

export function formatAngle(angle: number): number {
  return round(angle);
}

export function labelPoint(angle: number, radius: number): { x: number; y: number } {
  return { x: round(Math.cos(angle) * radius), y: round(Math.sin(angle) * radius) };
}
