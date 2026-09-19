/**
 * Pose: what moves on top of the tier layout in `graph.ts`.
 *
 * `computeLayout` decides where a body lives. A body leaves that place for
 * one reason only: the cluster it is a dot of is opened, and its sector is
 * packed again with that cluster unpacked into marks. The re-pack is the same
 * `packRing` the build ran, on the item list the build shipped, so the open
 * state is as deterministic as the rest state. Every function here is pure:
 * a pose is a function of (layout, open cluster), never of elapsed time, and
 * the renderer interpolates rest to pose with one scalar so the motion can be
 * interrupted or reversed without leaving state behind.
 */

import {
  clusterDotPosition,
  clusterHalfSize,
  glyphFootprint,
  packInnerOf,
  sectorArcs,
  wrapPi,
  type ClusterInfo,
  type GraphLayout,
  type LaidOutNode,
} from "./graph";
import { packSectorArcs, pushPack, type RestItem, type RingItem, type RingPlacement } from "./ring-pack";

export type PolarTarget = { angle: number; radius: number };

export type SectorPose = {
  sectorId: string;
  /** The cluster that is unpacked. */
  openId: string;
  /** Where every mark of the sector sits while the cluster is open, singles and dots included. */
  target: Map<string, PolarTarget>;
  /** Where the other clusters' grids move to. */
  clusterTarget: Map<string, PolarTarget>;
  /** Farthest mark edge from the centre while open. */
  outerRadius: number;
};

function memberItems(layout: GraphLayout, cluster: ClusterInfo): RingItem[] {
  const items: RingItem[] = [];
  for (const memberId of cluster.members) {
    const node = layout.byId.get(memberId);
    if (!node) continue;
    const foot = glyphFootprint(node);
    items.push({ id: node.id, halfWidth: foot, halfHeight: foot });
  }
  return items;
}

/** The sector's items as they rest, and as ring items with one cluster unpacked. */
function sectorRest(layout: GraphLayout, sector: { items: string[] }, openId: string): { rest: RestItem[]; open: RingItem[]; index: number; count: number } {
  const rest: RestItem[] = [];
  const open: RingItem[] = [];
  let index = -1;
  let count = 0;
  for (const id of sector.items) {
    const cluster = layout.clusterById.get(id);
    if (cluster) {
      const half = clusterHalfSize(cluster.members.length);
      rest.push({ id, angle: cluster.angle, radius: cluster.radius, ...half });
      if (cluster.id === openId) {
        index = rest.length - 1;
        count = cluster.members.length;
        open.push(...memberItems(layout, cluster));
      } else {
        open.push({ id, ...half });
      }
      continue;
    }
    const node = layout.byId.get(id);
    if (!node) continue;
    const foot = glyphFootprint(node);
    rest.push({ id: node.id, angle: node.angle, radius: node.radius, halfWidth: foot, halfHeight: foot });
    open.push({ id: node.id, halfWidth: foot, halfHeight: foot });
  }
  return { rest, open, index, count };
}

/**
 * The sector with one cluster open, or null when the cluster is unknown.
 * The members are opened in place first: on the grid's own ring, pushing only
 * the neighbours that are in the way. When that ring cannot hold them the
 * sector is packed again from scratch, which is what the build reserved room
 * for.
 */
export function sectorPose(layout: GraphLayout, openId: string): SectorPose | null {
  const cluster = layout.clusterById.get(openId);
  if (!cluster) return null;
  const sector = layout.sectors.find((entry) => entry.id === cluster.sector);
  if (!sector || sector.items.length === 0) return null;

  const arcs = sectorArcs(sector);
  const { rest, open, index, count } = sectorRest(layout, sector, openId);
  let placed: RingPlacement[] | null = pushPack(rest, openId, memberItems(layout, cluster), arcs);
  let outerRadius = 0;
  if (placed) {
    for (const entry of placed) {
      const item = open.find((candidate) => candidate.id === entry.id);
      outerRadius = Math.max(outerRadius, entry.radius + (item?.halfHeight ?? 0));
    }
  } else {
    const split = arcs.length > 1 ? Math.ceil(rest.length / 2) : null;
    const openSplit = split === null ? null : index < split ? split + count - 1 : split;
    const packed = packSectorArcs(open, arcs, packInnerOf(sector), undefined, openSplit);
    placed = packed.placed;
    outerRadius = packed.outerRadius;
  }

  const target = new Map<string, PolarTarget>();
  const clusterTarget = new Map<string, PolarTarget>();
  let reach = outerRadius;
  for (const entry of placed) {
    const other = layout.clusterById.get(entry.id);
    if (!other) {
      target.set(entry.id, { angle: entry.angle, radius: entry.radius });
      continue;
    }
    clusterTarget.set(other.id, { angle: entry.angle, radius: entry.radius });
    other.members.forEach((memberId, position) => {
      const dot = clusterDotPosition(entry.angle, entry.radius, position, other.rows, other.cols);
      target.set(memberId, { angle: dot.angle, radius: dot.radius });
      reach = Math.max(reach, dot.radius);
    });
  }
  return { sectorId: sector.id, openId, target, clusterTarget, outerRadius: reach };
}

/**
 * Where a mark sits at interpolation scalar `open`. Angles take the short arc,
 * so a mark slides along the ring it already belongs to instead of cutting
 * across the core.
 */
export function posePosition(
  node: Pick<LaidOutNode, "angle" | "radius" | "x" | "y">,
  target: PolarTarget | undefined,
  open: number,
): { x: number; y: number } {
  if (!target || open <= 0) return { x: node.x, y: node.y };
  const angle = node.angle + wrapPi(target.angle - node.angle) * open;
  const radius = node.radius + (target.radius - node.radius) * open;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
