/**
 * Pose: what moves on top of the tier layout in `graph.ts`, and the camera.
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
  wrapPi,
  type ClusterInfo,
  type GraphLayout,
  type LaidOutNode,
} from "./graph";
import { packRing, type RingItem } from "./ring-pack";

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

function ringItemsFor(layout: GraphLayout, sector: { items: string[] }, openId: string): RingItem[] {
  const items: RingItem[] = [];
  for (const id of sector.items) {
    const cluster = layout.clusterById.get(id);
    if (cluster) {
      if (cluster.id === openId) {
        for (const memberId of cluster.members) {
          const node = layout.byId.get(memberId);
          if (!node) continue;
          const foot = glyphFootprint(node);
          items.push({ id: node.id, halfWidth: foot, halfHeight: foot });
        }
      } else {
        items.push({ id, ...clusterHalfSize(cluster.members.length) });
      }
      continue;
    }
    const node = layout.byId.get(id);
    if (!node) continue;
    const foot = glyphFootprint(node);
    items.push({ id: node.id, halfWidth: foot, halfHeight: foot });
  }
  return items;
}

/** The sector re-packed with one cluster open, or null when the cluster is unknown. */
export function sectorPose(layout: GraphLayout, openId: string): SectorPose | null {
  const cluster = layout.clusterById.get(openId);
  if (!cluster) return null;
  const sector = layout.sectors.find((entry) => entry.id === cluster.sector);
  if (!sector || sector.items.length === 0) return null;

  const items = ringItemsFor(layout, sector, openId);
  const { placed, outerRadius } = packRing(items, sector.startAngle, sector.endAngle, packInnerOf(sector));
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
    other.members.forEach((memberId, index) => {
      const dot = clusterDotPosition(entry.angle, entry.radius, index, other.rows, other.cols);
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

export type ViewTransform = { k: number; x: number; y: number };

/** Smallest and largest neighbourhood the auto frame will hold, in canvas units. */
export const MIN_REACH = 90;
export const MAX_REACH = 520;

/**
 * How far the frame has to reach from a focused body to hold its direct
 * relations too. The chambers behind an arch and the collapsed children folded
 * onto a body count; bodies of a filtered branch do not.
 */
export function focusReach(
  layout: GraphLayout,
  focusId: string,
  hiddenBranches: ReadonlySet<string> = new Set(),
): number {
  const focus = layout.byId.get(focusId);
  if (!focus) return MIN_REACH;
  let reach = 0;
  for (const id of layout.adjacency.get(focusId) ?? []) {
    const node = layout.byId.get(id);
    if (!node || hiddenBranches.has(node.branch)) continue;
    reach = Math.max(reach, Math.hypot(node.x - focus.x, node.y - focus.y));
  }
  return Math.min(MAX_REACH, Math.max(MIN_REACH, reach + 40));
}

/** The focus that frames an open cluster: its centre, and a reach that holds every unpacked member. */
export function clusterFocus(cluster: ClusterInfo, pose: SectorPose): { angle: number; radius: number; reach: number } {
  let reach = 0;
  const cx = Math.cos(cluster.angle) * cluster.radius;
  const cy = Math.sin(cluster.angle) * cluster.radius;
  for (const id of cluster.members) {
    const at = pose.target.get(id);
    if (!at) continue;
    reach = Math.max(reach, Math.hypot(Math.cos(at.angle) * at.radius - cx, Math.sin(at.angle) * at.radius - cy));
  }
  return { angle: cluster.angle, radius: cluster.radius, reach: Math.min(MAX_REACH, Math.max(MIN_REACH, reach + 40)) };
}

/**
 * A view transform that holds the core and the focused neighbourhood on screen
 * at once. Context is never dropped: the Grondwet stays in frame, because a
 * body's distance from it is the reason the canvas exists.
 */
export function frameFor(
  layout: GraphLayout,
  focus: { angle: number; radius: number; reach: number } | null,
  rotation: number,
  minZoom = 1,
  maxZoom = 3,
): ViewTransform {
  if (!focus) return { k: 1, x: 0, y: 0 };
  const angle = focus.angle + rotation;
  const x = Math.cos(angle) * focus.radius;
  const y = Math.sin(angle) * focus.radius;
  const centreX = x / 2;
  const centreY = y / 2;
  const half = Math.hypot(x, y) / 2 + focus.reach + 70;
  const viewHalf = Math.min(layout.viewBox.width, layout.viewBox.height) / 2;
  const k = Math.min(maxZoom, Math.max(minZoom, (viewHalf * 0.94) / Math.max(half, 1)));
  return { k, x: -centreX * k, y: -centreY * k };
}
