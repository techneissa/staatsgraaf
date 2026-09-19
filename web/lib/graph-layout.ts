/**
 * The packer for layout `nl-tiers-v1` (spec: web/lib/graph-layout.md).
 *
 * This runs at build time in `web/scripts/build-graph.mjs` and in the tests. It
 * never ships to the browser: the client reads the coordinates it writes into
 * `graph.json` and hydrates them with `hydrateLayout` in `graph.ts`. Keeping
 * the packer out of the client is what makes "every client draws the same
 * picture from the same file" true by construction rather than by discipline.
 *
 * Deterministic: no randomness, no time, no dependence on object key order.
 * Ties break on name, then id.
 */

import {
  ARCH_EK,
  ARCH_EK_OFFSET,
  ARCH_PITCH_EK,
  ARCH_PITCH_TK,
  ARCH_TK,
  ARCH_BLOCK_CLEARANCE,
  ARCH_TK_OFFSET,
  CLUSTER_MIN,
  CORE_CLEARANCE,
  CORE_RADIUS,
  FRAME_CLEARANCE,
  FRAME_MARGIN,
  GLYPH_BY_SUBTYPE,
  GLYPH_GAP,
  MAX_DEPTH,
  PUSH_RESERVE,
  SECTOR_GUTTER,
  START_ANGLE,
  TIER_GAP,
  archSize,
  clusterDotPosition,
  clusterGrid,
  clusterHalfSize,
  compareNames,
  glyphFootprint,
  glyphRadiusForDegree,
  type ArchBlock,
  type BundleEdge,
  type BundleNode,
  type ClusterInfo,
  type GraphLayout,
  type HubNode,
  type LaidOutNode,
  type OrgBranchLike,
  type SectorInfo,
  type TierId,
  type TierInfo,
} from "./graph";
import { packRing, type RingItem } from "./ring-pack";

export { compareNames };

/** What the packer needs: the plain nodes, the edges, and the electorate. */
export type LayoutInput = {
  hub: HubNode | null;
  nodes: BundleNode[];
  edges: BundleEdge[];
};

// ---------------------------------------------------------------------------
// The tier table: every branch and subtype has exactly one place
// ---------------------------------------------------------------------------

type SectorDef = {
  id: string;
  branch: OrgBranchLike;
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

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * One thing to pack on a ring: a standing mark, or a cluster of the standing
 * children of one parent in this sector.
 */
export type SectorItem =
  | { kind: "node"; id: string; node: BundleNode }
  | { kind: "cluster"; id: string; parent: BundleNode; members: BundleNode[] };

export function clusterId(sectorId: string, parentId: string): string {
  return `cluster:${sectorId}:${parentId}`;
}

/**
 * Group a sector's members into items. A parent with `CLUSTER_MIN` or more
 * standing children here gets one cluster; everything else stays a mark. The
 * items are ordered by the angle of the parent when the parent is already laid
 * out on an inner tier, so a ministry's bodies sit near the ministry, then by
 * name, so the order is the same on every run.
 */
export function sectorItems(
  sectorId: string,
  members: BundleNode[],
  standingIds: ReadonlySet<string>,
  byId: ReadonlyMap<string, BundleNode>,
  parentAngle: (parentId: string) => number | null,
): SectorItem[] {
  const byParent = new Map<string, BundleNode[]>();
  for (const node of members) {
    if (!node.parent || !standingIds.has(node.parent) || !byId.has(node.parent)) continue;
    const list = byParent.get(node.parent) ?? [];
    list.push(node);
    byParent.set(node.parent, list);
  }
  const clustered = new Set<string>();
  const items: SectorItem[] = [];
  for (const [parentId, list] of byParent) {
    if (list.length < CLUSTER_MIN) continue;
    const parent = byId.get(parentId) as BundleNode;
    const sorted = [...list].sort((a, b) => compareNames(a.name, b.name, a.id, b.id));
    for (const node of sorted) clustered.add(node.id);
    items.push({ kind: "cluster", id: clusterId(sectorId, parentId), parent, members: sorted });
  }
  for (const node of members) {
    if (!clustered.has(node.id)) items.push({ kind: "node", id: node.id, node });
  }
  const key = (item: SectorItem) => {
    const parentId = item.kind === "cluster" ? item.parent.id : item.node.parent;
    const angle = parentId ? parentAngle(parentId) : null;
    const name = item.kind === "cluster" ? item.parent.name : item.node.name;
    return { angle: angle ?? Number.POSITIVE_INFINITY, name, id: item.id };
  };
  return items.sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka.angle !== kb.angle) return ka.angle - kb.angle;
    return compareNames(ka.name, kb.name, ka.id, kb.id);
  });
}

/** The ring footprint of an item: a mark is square, a cluster is its dot grid. */
export function ringItemFor(item: SectorItem): RingItem {
  if (item.kind === "node") {
    const foot = glyphFootprint(item.node);
    return { id: item.id, halfWidth: foot, halfHeight: foot };
  }
  return { id: item.id, ...clusterHalfSize(item.members.length) };
}

/** The item list with one cluster unpacked into its members, in place. */
export function itemsWithOpen(items: readonly SectorItem[], openId: string | null): SectorItem[] {
  if (!openId) return [...items];
  const result: SectorItem[] = [];
  for (const item of items) {
    if (item.kind === "cluster" && item.id === openId) {
      for (const node of item.members) result.push({ kind: "node", id: node.id, node });
    } else {
      result.push(item);
    }
  }
  return result;
}

export function computeLayout(bundle: LayoutInput): GraphLayout {
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
  const clusters: ClusterInfo[] = [];
  const standingIds = new Set(standing.map((node) => node.id));
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
    const itemsBySector = new Map<string, SectorItem[]>();
    for (const sector of live) {
      const members = membersBySector.get(sector.id) ?? [];
      const packable = sector.archAnchor ? members.filter((node) => !sector.archAnchor?.(node)) : members;
      const items = sectorItems(sector.id, packable, standingIds, byBundleId, (parentId) => laidOut.get(parentId)?.angle ?? null);
      itemsBySector.set(sector.id, items);
      // Arc demand, square-rooted: a sector of a thousand marks stays larger
      // than a sector of ten without swallowing the ring. The demand is what
      // the sector packs at rest or with its largest cluster open, whichever
      // is wider, so an open cluster has an arc to unpack onto.
      const arcOf = (list: SectorItem[]) => list.reduce((sum, item) => sum + 2 * ringItemFor(item).halfWidth + GLYPH_GAP, 0);
      let demand = arcOf(items);
      for (const item of items) {
        if (item.kind === "cluster") demand = Math.max(demand, arcOf(itemsWithOpen(items, item.id)));
      }
      weights.push(Math.sqrt(Math.max(1, demand)));
      let widest = 0;
      for (const item of items) widest = Math.max(widest, 2 * ringItemFor(item).halfWidth + GLYPH_GAP);
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
              cluster: null,
            });
          }
          packInner = tierInner + blockHeight + ARCH_BLOCK_CLEARANCE;
          rest = members.filter((node) => !sector.archAnchor?.(node));
        }
      }

      const items = itemsBySector.get(sector.id) ?? [];
      const { placed, outerRadius } = packRing(items.map(ringItemFor), start, end, packInner);
      const placedById = new Map(placed.map((entry) => [entry.id, entry]));
      const nodeAt = (node: BundleNode, angle: number, radius: number, cluster: string | null): LaidOutNode => ({
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
        hidden: cluster !== null,
        arch: false,
        orbit: orbitCount.get(node.id) ?? 0,
        collapsedInto: null,
        cluster,
      });
      for (const item of items) {
        const at = placedById.get(item.id);
        if (!at) continue;
        if (item.kind === "node") {
          laidOut.set(item.node.id, nodeAt(item.node, at.angle, at.radius, null));
          continue;
        }
        const { rows, cols } = clusterGrid(item.members.length);
        clusters.push({
          id: item.id,
          sector: sector.id,
          parent: item.parent.id,
          members: item.members.map((node) => node.id),
          angle: round(at.angle),
          radius: round(at.radius),
          // From the rounded polar pair, exactly as the client derives it.
          x: round(Math.cos(round(at.angle)) * round(at.radius)),
          y: round(Math.sin(round(at.angle)) * round(at.radius)),
          rows,
          cols,
        });
        item.members.forEach((node, index) => {
          const dot = clusterDotPosition(at.angle, at.radius, index, rows, cols);
          laidOut.set(node.id, nodeAt(node, dot.angle, dot.radius, item.id));
        });
      }

      // Room for the open state: the sector's outer radius is the farthest any
      // single open cluster reaches, so the client can unpack any one of them
      // without entering the next tier.
      let reserved = outerRadius;
      for (const item of items) {
        if (item.kind !== "cluster") continue;
        const open = packRing(itemsWithOpen(items, item.id).map(ringItemFor), start, end, packInner);
        reserved = Math.max(reserved, open.outerRadius);
      }

      const sectorOuter = Math.max(reserved, block ? tierInner + blockHeight : tierInner);
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
        // Only a sector with a cluster is ever re-packed on the client.
        items: items.some((item) => item.kind === "cluster") ? items.map((item) => item.id) : [],
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
      cluster: null,
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
    clusters,
    clusterById: new Map(clusters.map((cluster) => [cluster.id, cluster])),
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
