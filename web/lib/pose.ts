/**
 * Pose: the interaction layer on top of the tier layout in `graph.ts`.
 *
 * `computeLayout` decides where a body lives. Pose decides where it goes while
 * the reader is looking at something. Every function here is pure: a pose is a
 * function of (layout, focus, visibility), never of elapsed time and never of a
 * previous animation. The renderer interpolates between the rest layout and the
 * pose with a single scalar, so an interaction can be interrupted, reversed or
 * replayed without leaving state behind.
 *
 * Two motions, and no others:
 *
 * 1. Gather. The focused body's collapsed children, its children in the data
 *    and its direct relations are summoned onto a halo arc centred on the focus
 *    just outside its tier, in the order of their home angle so the tethers
 *    never cross. Anything summoned from far away leaves a ghost at home.
 * 2. Step back. Every mark beyond the focused tier moves outward by one
 *    distance. That map is monotone in radius and constant in angle, so no two
 *    marks can approach each other: every gap is unchanged or wider. It is what
 *    makes the halo band provably free, at any body, with no angular window to
 *    tune and no edge case where the window ends.
 *
 * Collapse is the same functions at scalar 0, which is the rest layout itself.
 */

import {
  GLYPH_GAP,
  TIER_GAP,
  glyphFootprint,
  wrapPi,
  type GraphLayout,
  type LaidOutNode,
} from "./graph";

/** Radial gap between the focused tier and the first halo ring. */
export const HALO_GAP = 16;
/** Radial distance between two halo rings when one arc is not enough. */
export const HALO_RING_STEP = 30;
/** Cap on summoned marks, so one large body cannot summon a thousand. */
export const MAX_HALO = 36;
/** Widest arc a single halo ring may use. */
export const HALO_MAX_SPAN = (150 * Math.PI) / 180;
/** Edge-to-edge gap between two halo marks. */
export const HALO_SPACING = GLYPH_GAP + 3;
/** A summoned mark farther than this from its slot gets a ghost and a tether. */
export const TETHER_MIN_TRAVEL = 60;

export type PoseTarget = { angle: number; radius: number };

export type HaloMember = {
  id: string;
  angle: number;
  radius: number;
  /** Distance from home to slot, in canvas units. */
  travel: number;
  /** Invisible at rest: a collapsed child or a chamber behind an arch. */
  fromHidden: boolean;
};

export type Expansion = {
  focusId: string;
  focusAngle: number;
  focusRadius: number;
  /** Summoned marks, in placement order. */
  halo: HaloMember[];
  /** Every mark that moves: the halo and everything stepping back. */
  target: Map<string, PoseTarget>;
  /** Marks beyond this radius step back. */
  pushFrom: number;
  /** How far they step. */
  push: number;
  /** Farthest halo edge from the centre, for framing. */
  outerRadius: number;
};

function compare(a: LaidOutNode, b: LaidOutNode): number {
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Who gathers around a focused body: the children it carries as orbit marks
 * first, then its children in the data, then its direct relations. Each list is
 * sorted by name then id, so the cap cuts the same marks on every run.
 */
export function haloMembers(
  layout: GraphLayout,
  focus: LaidOutNode,
  hiddenBranches: ReadonlySet<string>,
): LaidOutNode[] {
  const seen = new Set<string>([focus.id]);
  const usable = (node: LaidOutNode | undefined): node is LaidOutNode =>
    node !== undefined && !seen.has(node.id) && !hiddenBranches.has(node.branch) && !node.arch;

  const orbit: LaidOutNode[] = [];
  const children: LaidOutNode[] = [];
  for (const node of layout.nodes) {
    if (node.collapsedInto === focus.id && usable(node)) {
      orbit.push(node);
      seen.add(node.id);
    } else if (node.parent === focus.id && usable(node)) {
      children.push(node);
      seen.add(node.id);
    }
  }
  orbit.sort(compare);
  children.sort(compare);

  const related: LaidOutNode[] = [];
  for (const id of layout.adjacency.get(focus.id) ?? []) {
    const node = layout.byId.get(id);
    if (usable(node)) {
      related.push(node);
      seen.add(node.id);
    }
  }
  related.sort(compare);

  return [...orbit, ...children, ...related].slice(0, MAX_HALO);
}

/** The tier a radius belongs to, or the outermost tier below it. */
function tierOuterFor(layout: GraphLayout, node: LaidOutNode): number {
  const tier = layout.tiers.find((entry) => entry.id === node.tier);
  return tier ? tier.outerRadius : node.radius + glyphFootprint(node);
}

/**
 * The pose for one focused body, or null when there is nothing to gather.
 * Members are placed in the order of their home angle relative to the focus, so
 * a body that lives to the left lands on the left of the halo.
 */
export function expansionFor(
  layout: GraphLayout,
  focusId: string,
  hiddenBranches: ReadonlySet<string> = new Set(),
): Expansion | null {
  const focus = layout.byId.get(focusId);
  if (!focus || hiddenBranches.has(focus.branch)) return null;

  const members = haloMembers(layout, focus, hiddenBranches);
  if (members.length === 0) return null;

  const ordered = [...members].sort((a, b) => {
    const da = wrapPi(a.angle - focus.angle);
    const db = wrapPi(b.angle - focus.angle);
    if (da !== db) return da - db;
    return compare(a, b);
  });

  const pushFrom = tierOuterFor(layout, focus);
  type Ring = { radius: number; items: { node: LaidOutNode; at: number; half: number }[]; span: number };
  let ring: Ring = { radius: pushFrom + HALO_GAP + 12, items: [], span: 0 };
  const rings: Ring[] = [];

  for (const node of ordered) {
    const reach = (glyphFootprint(node) + HALO_SPACING / 2) / ring.radius;
    if (ring.items.length > 0 && ring.span + 2 * reach > HALO_MAX_SPAN) {
      rings.push(ring);
      ring = { radius: ring.radius + HALO_RING_STEP, items: [], span: 0 };
    }
    const half = (glyphFootprint(node) + HALO_SPACING / 2) / ring.radius;
    ring.items.push({ node, at: ring.span + half, half });
    ring.span += 2 * half;
  }
  rings.push(ring);

  const halo: HaloMember[] = [];
  const target = new Map<string, PoseTarget>();
  let outerRadius = pushFrom;

  for (const current of rings) {
    const start = focus.angle - current.span / 2;
    for (const item of current.items) {
      const angle = start + item.at;
      const dx = Math.cos(angle) * current.radius - item.node.x;
      const dy = Math.sin(angle) * current.radius - item.node.y;
      halo.push({
        id: item.node.id,
        angle,
        radius: current.radius,
        travel: Math.hypot(dx, dy),
        fromHidden: item.node.hidden,
      });
      target.set(item.node.id, { angle, radius: current.radius });
      outerRadius = Math.max(outerRadius, current.radius + glyphFootprint(item.node));
    }
  }

  // The tier gap is free already; the step back only has to cover what the halo
  // needs beyond it. Uniform in angle and monotone in radius, so nothing can
  // collide: every gap is unchanged or wider.
  const push = Math.max(0, outerRadius + GLYPH_GAP - (pushFrom + TIER_GAP));
  if (push > 0) {
    for (const node of layout.nodes) {
      if (node.id === focus.id || target.has(node.id)) continue;
      if (hiddenBranches.has(node.branch)) continue;
      // A mark that is not drawn at rest has nothing to step back from: it is
      // either behind an arch or riding on a body as an orbit mark.
      if (node.hidden) continue;
      if (node.radius <= pushFrom) continue;
      target.set(node.id, { angle: node.angle, radius: node.radius + push });
    }
  }

  return {
    focusId: focus.id,
    focusAngle: focus.angle,
    focusRadius: focus.radius,
    halo,
    target,
    pushFrom,
    push,
    outerRadius,
  };
}

/**
 * Where a mark sits at interpolation scalar `open`. Angles take the short arc,
 * so a summoned mark flies along the circle it already belongs to instead of
 * cutting across the core.
 */
export function posePosition(
  node: Pick<LaidOutNode, "angle" | "radius" | "x" | "y">,
  target: PoseTarget | undefined,
  open: number,
): { x: number; y: number } {
  if (!target || open <= 0) return { x: node.x, y: node.y };
  const angle = node.angle + wrapPi(target.angle - node.angle) * open;
  const radius = node.radius + (target.radius - node.radius) * open;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/** The frame radius while an expansion is open: it grows with the step back. */
export function framePose(layout: GraphLayout, expansion: Expansion | null, open: number): number {
  if (!expansion) return layout.frameRadius;
  return layout.frameRadius + expansion.push * open;
}

export type ViewTransform = { k: number; x: number; y: number };

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
