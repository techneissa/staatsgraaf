import type { OrgBranch, OrgLevel, OrgSubtype, OrgType } from "./types";
import { BENCH_CLEARANCE, type Bench } from "./bench";
import type { SeatPerson } from "./seats";
import type { PowerLink } from "./power-connections";

export type { Bench } from "./bench";

/** Re-exported for the packer, which lives in graph-layout.ts. */
export type OrgBranchLike = OrgBranch;

/**
 * Layout `nl-tiers-v1`: the concentric tier layout (spec: web/lib/graph-layout.md,
 * decision: docs/adr/0015-graph-rebuild.md, plan: docs/13-graph-rebuild-plan.md).
 *
 * This module is what the client ships: the bundle contract, the geometry
 * constants, the glyph and edge helpers, the ∩ arch, and `hydrateLayout`, which
 * turns the precomputed bundle into a layout without running the packer. The
 * packer itself (`computeLayout`) lives in `graph-layout.ts` and runs at build
 * time in `web/scripts/build-graph.mjs`; the client never imports it.
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

export const GRAPH_SCHEMA = "nl-graph-bundle-v2";
export const GRAPH_LAYOUT = "nl-tiers-v6";

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
export const PUSH_RESERVE = 0;
/** The first sector of every tier starts straight up, so tiers read as one dial. */
export const START_ANGLE = -Math.PI / 2;
/** Extra glyph radius for the focused mark. */
export const SELECTED_GROWTH = 1.5;
/** A parent with this many standing children in one sector gets a cluster instead of marks. */
export const CLUSTER_MIN = 3;
/** Most rows an open cluster takes across the ring; the build reserves room for that many (ring-pack.ts, bloomPack). */
export const BLOOM_MAX_ROWS = 5;
/** A sector with this many standing members also clusters the members that have no parent. */
export const CLUSTER_SECTOR_MIN = 40;
/** How a cluster's members belong together. */
export type ClusterKind = "children" | "oversight" | "subtype";
/** Cluster grid: dot spacing and dot radius, in canvas units. */
export const CLUSTER_DOT_PITCH = 3.4;
export const CLUSTER_DOT_RADIUS = 1.2;
/**
 * The inner radius a sector packs its rings from: past its benches when it
 * seats a chamber, so the commissies of the Kamers ring their own chamber.
 */
export function packInnerOf(sector: Pick<SectorInfo, "innerRadius" | "benches">): number {
  let inner = sector.innerRadius;
  for (const bench of sector.benches) inner = Math.max(inner, bench.outerRadius + BENCH_CLEARANCE);
  return inner;
}
export const MAX_DEPTH = 6;
export const BOW = 0.14;
/** Kept for the power map, which centres its own layout on a hub radius. */
export const HUB_RADIUS = CORE_RADIUS;

/** Seat pitch of the two arches drawn inside the canvas, and their offsets. */
export const ARCH_PITCH_TK = 4.2;
export const ARCH_PITCH_EK = 3.2;
export const ARCH_TK_OFFSET = -26;
export const ARCH_EK_OFFSET = 34;

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
  /** Dates of the relation, present only when the data states them. */
  validFrom?: string | null;
  validTo?: string | null;
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
  /** ISO date the window and the recency are measured from: the newest news item (lib/power-connections.ts newsReferenceDate). */
  asOf?: string | null;
  articleCount: number;
  sources: string[];
  people: PowerMapPerson[];
};

/** One fractie block of a chamber, resolved through the sourced party registry. */
export type ChamberSeatEntry = {
  key: string | null;
  label: string;
  color: string | null;
  splinter: boolean;
  seats: number;
  /**
   * Person ids of the fractie's members in seat order (lib/seats.ts): member
   * `i` takes seat `i` of the block. Set in `graph.json`; the seat chart on
   * the chamber pages leaves it out.
   */
  members?: string[];
};

/** Seat arithmetic of an elected chamber, computed by build-graph.mjs. */
export type ChamberSeats = {
  total: number;
  majority: number;
  entries: ChamberSeatEntry[];
};

/**
 * A node as it travels in `graph.json`: the plain node plus its position and
 * place. Fields that are false, zero or null at rest are left out, and fields
 * the client can derive (glyph, glyph radius, depth) are not shipped at all;
 * `hydrateLayout` fills them in. That keeps the bundle near its size budget
 * without making the client compute a position.
 */
export type WireNode = BundleNode & {
  x: number;
  y: number;
  angle: number;
  radius: number;
  tier: TierId;
  sector: string;
  hidden?: boolean;
  arch?: boolean;
  orbit?: number;
  collapsedInto?: string | null;
  cluster?: string;
};

/** A cluster on the wire: its members are the nodes whose `cluster` names it. */
export type WireCluster = {
  id: string;
  sector: string;
  kind: ClusterKind;
  /** The body the members hang under: their parent, or the body that oversees them; null for a subtype group. */
  parent: string | null;
  /** Subtype of the members, for a subtype group. */
  subtype?: string;
  angle: number;
  radius: number;
  rows: number;
  cols: number;
};

/**
 * `graph.json`: the laid-out graph. Coordinates are computed at build time by
 * `computeLayout` in `graph-layout.ts` and shipped, so every client (web, later
 * Swift) draws the same picture from the same file and none of them runs the
 * packer. The electorate is `hub`, drawn as the frame; it is also present in
 * `nodes` with a placeholder position so lists and slug lookups still find it.
 */
export type GraphBundle = {
  schema: string;
  scope: string;
  snapshot: string | null;
  layout: string;
  hub: HubNode | null;
  nodes: WireNode[];
  edges: BundleEdge[];
  clusters: WireCluster[];
  /** Seat blocks per chamber organization id, for the arches. */
  chambers: Record<string, ChamberSeats>;
  /** Name, slug and portrait of every person seated in `chambers`, by person id. */
  seatPeople: Record<string, SeatPerson>;
  /** Short name (an abbreviation such as BZK or IGJ, from the organisation's aliases) by id, where one exists. */
  shortNames?: Record<string, string>;
  tiers: TierInfo[];
  /** Radii of the channels (tier gaps) routed edges travel along, innermost first. */
  channels: number[];
  coreRadius: number;
  frameRadius: number;
  maxRadius: number;
  viewBox: { x: number; y: number; width: number; height: number };
};

/** A person the power map names: a ranked person, a neighbour, or someone a news item mentions. */
export type PowerPerson = {
  name: string;
  slug: string;
  /** Title of a current position, when one is on record. */
  job: string | null;
  party: string | null;
  image: string | null;
};

/** A body the power map names. */
export type PowerBody = { name: string; slug: string; branch: OrgBranch };

/** A news item on the power map: a bubble beside the people it names. */
export type PowerNewsItem = {
  id: string;
  title: string;
  /** Machine translation of the title (docs/adr/0016), when there is one. */
  titleEn?: string;
  publisher: string | null;
  /** ISO date of publication. */
  date: string | null;
  url: string | null;
  /** Person ids and organization ids the item names. */
  people: string[];
  bodies: string[];
};

/** `power-map.json`: the machtskaart, loaded only by the views that show it. */
export type PowerMapBundle = {
  schema: string;
  snapshot: string | null;
  powerMap: PowerMap;
  /** Every person the bundle mentions, by id. */
  people: Record<string, PowerPerson>;
  /** Every body the bundle mentions, by id. */
  bodies: Record<string, PowerBody>;
  /** News items in the window that name a ranked person, newest first. */
  news: PowerNewsItem[];
  /** Ties between people and bodies with their reasons and evidence (lib/power-connections.ts). */
  links: PowerLink[];
  /** The sitting cabinet, which names the `kabinet` ties. */
  kabinet: { id: string; name: string; start: string } | null;
};

export type TierId = "kern" | "politiek" | "ministeries" | "uitvoering" | "decentraal" | "koninkrijk";

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
  /** Seats of the chambers this sector holds, drawn on its own rings. */
  benches: Bench[];
  /** Node and cluster ids in packing order; the client re-packs from this when a cluster opens. */
  items: string[];
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
  /** The cluster this node is a dot of at rest, or null. */
  cluster: string | null;
};

/**
 * A cluster: the standing children of one parent in one sector, drawn as a
 * grid of dots at rest. Its members carry their dot position as their rest
 * position and fly to full marks when the cluster opens.
 */
export type ClusterInfo = {
  id: string;
  sector: string;
  kind: ClusterKind;
  parent: string | null;
  subtype: string | null;
  /** Member ids in grid order, which is name order. */
  members: string[];
  angle: number;
  radius: number;
  x: number;
  y: number;
  rows: number;
  cols: number;
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
  clusters: ClusterInfo[];
  clusterById: Map<string, ClusterInfo>;
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

/**
 * Every body is a circle (owner, 25-09-2026): the icon inside it says what
 * kind of body it is (lib/graph-icons.ts) and the colour says the branch. A
 * commissie stays a small plain dot.
 */
export const GLYPH_BY_SUBTYPE: Record<OrgSubtype, GlyphClass> = {
  ministerie: "dot",
  defensieonderdeel: "dot",
  agentschap: "dot",
  uitvoeringsorganisatie: "dot",
  inspectie: "dot",
  zbo: "dot",
  rwt: "dot",
  toezichthouder: "dot",
  "rechterlijke-instantie": "dot",
  "hoge-college": "dot",
  kiesraad: "dot",
  adviescollege: "dot",
  planbureau: "dot",
  staatscommissie: "dot",
  "raad-van-advies": "dot",
  "tweede-kamer": "dot",
  "eerste-kamer": "dot",
  "provinciale-staten": "dot",
  gemeenteraad: "dot",
  "algemeen-bestuur-waterschap": "dot",
  eilandsraad: "dot",
  "europees-parlement": "dot",
  "staten-land": "dot",
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

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function glyphRadiusForDegree(degree: number, selected = false): number {
  const base = Math.min(11, Math.max(6, 6 + Math.sqrt(Math.max(0, degree)) * 1.1));
  return selected ? base + SELECTED_GROWTH : base;
}

export function compareNames(a: string, b: string, aId: string, bId: string): number {
  if (a !== b) return a < b ? -1 : 1;
  return aId < bId ? -1 : aId > bId ? 1 : 0;
}

/** Rows across the ring and columns along it for a cluster of `count` dots. */
export function clusterGrid(count: number): { rows: number; cols: number } {
  const rows = count <= 6 ? 2 : count <= 15 ? 3 : count <= 32 ? 4 : 5;
  return { rows, cols: Math.max(1, Math.ceil(count / rows)) };
}

/** Half extents of a cluster grid: width along the ring, height across it. */
export function clusterHalfSize(count: number): { halfWidth: number; halfHeight: number } {
  const { rows, cols } = clusterGrid(count);
  return { halfWidth: (cols * CLUSTER_DOT_PITCH) / 2, halfHeight: (rows * CLUSTER_DOT_PITCH) / 2 };
}

/**
 * Where dot `index` of a cluster sits, given the cluster's centre in polar
 * coordinates. Columns run along the ring, rows outward, so the grid reads as
 * a block that follows the curve of its tier.
 */
export function clusterDotPosition(
  angle: number,
  radius: number,
  index: number,
  rows: number,
  cols: number,
): { x: number; y: number; angle: number; radius: number } {
  const col = Math.floor(index / rows);
  const row = index % rows;
  const along = (col - (cols - 1) / 2) * CLUSTER_DOT_PITCH;
  const across = (row - (rows - 1) / 2) * CLUSTER_DOT_PITCH;
  const cx = Math.cos(angle) * radius;
  const cy = Math.sin(angle) * radius;
  const x = cx + Math.cos(angle) * across - Math.sin(angle) * along;
  const y = cy + Math.sin(angle) * across + Math.cos(angle) * along;
  return { x, y, angle: Math.atan2(y, x), radius: Math.hypot(x, y) };
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

/**
 * Whether an edge is in force on a date. An edge without dates is the current
 * state and is always drawn: the dataset knows when a dated relation started,
 * not that an undated one did not exist. `asOf` null means today.
 */
export function edgeAlive(edge: Pick<BundleEdge, "validFrom" | "validTo">, asOf: string | null): boolean {
  if (asOf === null) return true;
  if (edge.validFrom && edge.validFrom > asOf) return false;
  if (edge.validTo && edge.validTo <= asOf) return false;
  return true;
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

/**
 * The layout the client draws, built from the precomputed bundle. Nothing is
 * packed here: positions, tiers and channels come from the file, and this only
 * builds the lookup structures the renderer needs. The frame node is taken out
 * of `nodes` and exposed as `frame`.
 */
export function hydrateLayout(bundle: GraphBundle): GraphLayout {
  const frameId = bundle.hub?.id ?? null;
  const nodes: LaidOutNode[] = bundle.nodes
    .filter((node) => node.id !== frameId)
    .map((node) => ({
      ...node,
      depth: 0,
      glyph: GLYPH_BY_SUBTYPE[node.subtype] ?? "dot",
      glyphRadius: Math.round(glyphRadiusForDegree(node.degree, false) * 1000) / 1000,
      subSector: node.subtype,
      hidden: node.hidden === true,
      arch: node.arch === true,
      orbit: node.orbit ?? 0,
      collapsedInto: node.collapsedInto ?? null,
      cluster: node.cluster ?? null,
    }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const membersByCluster = new Map<string, LaidOutNode[]>();
  for (const node of nodes) {
    if (!node.cluster) continue;
    const list = membersByCluster.get(node.cluster) ?? [];
    list.push(node);
    membersByCluster.set(node.cluster, list);
  }
  const clusters: ClusterInfo[] = (bundle.clusters ?? []).map((cluster) => ({
    ...cluster,
    subtype: cluster.subtype ?? null,
    x: round(Math.cos(cluster.angle) * cluster.radius),
    y: round(Math.sin(cluster.angle) * cluster.radius),
    members: (membersByCluster.get(cluster.id) ?? [])
      .sort((a, b) => compareNames(a.name, b.name, a.id, b.id))
      .map((node) => node.id),
  }));
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  const edges: BundleEdge[] = [];
  for (const edge of bundle.edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) continue;
    edges.push(edge);
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }
  for (const list of adjacency.values()) list.sort();
  return {
    nodes,
    byId,
    edges,
    adjacency,
    clusters,
    clusterById: new Map(clusters.map((cluster) => [cluster.id, cluster])),
    frame: bundle.hub ? { ...bundle.hub, radius: bundle.frameRadius } : null,
    tiers: bundle.tiers,
    sectors: bundle.tiers.flatMap((tier) => tier.sectors),
    channels: bundle.channels,
    coreRadius: bundle.coreRadius,
    frameRadius: bundle.frameRadius,
    maxRadius: bundle.maxRadius,
    viewBox: bundle.viewBox,
  };
}

/** The wire form of a laid-out node: derivable fields dropped, rest-state defaults omitted. */
export function toWireNode(node: LaidOutNode): WireNode {
  const wire: WireNode = {
    id: node.id,
    slug: node.slug,
    name: node.name,
    type: node.type,
    subtype: node.subtype,
    branch: node.branch,
    level: node.level,
    degree: node.degree,
    parent: node.parent,
    x: node.x,
    y: node.y,
    angle: node.angle,
    radius: node.radius,
    tier: node.tier,
    sector: node.sector,
  };
  if (node.hidden) wire.hidden = true;
  if (node.arch) wire.arch = true;
  if (node.orbit > 0) wire.orbit = node.orbit;
  if (node.collapsedInto) wire.collapsedInto = node.collapsedInto;
  if (node.cluster) wire.cluster = node.cluster;
  return wire;
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
