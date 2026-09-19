/**
 * Pose: the camera on top of the tier layout in `graph.ts`.
 *
 * `computeLayout` decides where a body lives, and a body never leaves that
 * place: selecting one highlights it, its path to the electorate and its direct
 * relations where they are. The only thing that moves is the view, and these
 * functions decide where the view goes. Every function here is pure.
 */

import type { GraphLayout } from "./graph";

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
