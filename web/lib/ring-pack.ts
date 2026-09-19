/**
 * Ring packing shared by the build-time packer and the client.
 *
 * A sector is a wedge between two angles, filled outward with rings. Items
 * have a width along the ring and a height across it, so a cluster grid and a
 * single mark pack with the same function. The items keep the order they are
 * given in; rings are opened outward until they hold everything, filled to
 * the same fraction, and on each ring the free arc is spread evenly between
 * the items, so a ring never bunches against one edge of the sector.
 *
 * The client runs this for one sector when a cluster opens: the same function
 * on the same item list gives the same picture the build would have given, so
 * the open state is as deterministic as the rest state in `graph.json`.
 */

import { GLYPH_GAP, MAX_RING_STEP, MIN_RING_STEP, SELECTED_GROWTH } from "./graph";

export type RingItem = {
  id: string;
  /** Half the extent along the ring, in canvas units. */
  halfWidth: number;
  /** Half the extent across the ring. */
  halfHeight: number;
};

export type RingPlacement = { id: string; angle: number; radius: number };

/** Radial distance between two rings: the tallest item plus room to grow when selected. */
export function ringStepFor(items: readonly RingItem[]): number {
  let ceiling = 0;
  for (const item of items) ceiling = Math.max(ceiling, item.halfHeight);
  const needed = 2 * ceiling + GLYPH_GAP + 2 * SELECTED_GROWTH;
  return Math.min(MAX_RING_STEP, Math.max(MIN_RING_STEP, Math.ceil(needed / 5) * 5));
}

export function packRing(
  items: readonly RingItem[],
  start: number,
  end: number,
  innerRadius: number,
  gap = GLYPH_GAP,
): { placed: RingPlacement[]; outerRadius: number } {
  const span = end - start;
  if (items.length === 0 || span <= 0.001) return { placed: [], outerRadius: innerRadius };

  let maxHalfHeight = 0;
  for (const item of items) maxHalfHeight = Math.max(maxHalfHeight, item.halfHeight);
  const step = ringStepFor(items);
  const demand = items.reduce((sum, item) => sum + 2 * item.halfWidth + gap, 0);

  type Ring = { radius: number; capacity: number; items: RingItem[]; used: number };
  const ringAt = (index: number): Ring => {
    const radius = innerRadius + maxHalfHeight + index * step;
    return { radius, capacity: span * radius, items: [], used: 0 };
  };
  let ringCount = 0;
  let capacityTotal = 0;
  for (let guard = 0; guard < 500 && capacityTotal < demand; guard += 1) {
    capacityTotal += ringAt(ringCount).capacity;
    ringCount += 1;
  }
  ringCount = Math.max(1, ringCount);

  /**
   * Each ring gets the run of items whose midpoint in the cumulative demand
   * falls inside its share of the total capacity, so the rounding error is at
   * most one item per ring and never piles up on the last ring. Items are
   * discrete, so a share can come out one item short; when that happens the
   * sector is packed again with one more ring and every ring a little emptier,
   * instead of a ninth ring holding the three that did not fit.
   */
  const attempt = (count: number): Ring[] | null => {
    const rings: Ring[] = [];
    for (let index = 0; index < count; index += 1) rings.push(ringAt(index));
    const total = rings.reduce((sum, ring) => sum + ring.capacity, 0);
    const fill = Math.min(1, demand / Math.max(1e-9, total));
    const quotaEnd: number[] = [];
    let quota = 0;
    for (const ring of rings) {
      quota += ring.capacity * fill;
      quotaEnd.push(quota);
    }
    let index = 0;
    let cumulative = 0;
    for (const item of items) {
      const width = 2 * item.halfWidth + gap;
      const mid = cumulative + width / 2;
      cumulative += width;
      while (index < rings.length - 1 && mid > quotaEnd[index] + 1e-9) index += 1;
      let ring = rings[index];
      while (ring.items.length > 0 && ring.used + width > ring.capacity + 1e-9) {
        if (index === rings.length - 1) return null;
        index += 1;
        ring = rings[index];
      }
      ring.items.push(item);
      ring.used += width;
    }
    return rings;
  };
  let rings: Ring[] | null = null;
  for (let count = ringCount; rings === null && count < ringCount + 500; count += 1) rings = attempt(count);
  if (rings === null) return { placed: [], outerRadius: innerRadius };

  const placed: RingPlacement[] = [];
  let outerRadius = innerRadius;
  for (const ring of rings) {
    if (ring.items.length === 0) continue;
    const widths = ring.items.reduce((sum, item) => sum + 2 * item.halfWidth, 0);
    const spacing = Math.max(gap, (ring.capacity - widths) / ring.items.length);
    let cursor = spacing / 2;
    for (const item of ring.items) {
      const centre = cursor + item.halfWidth;
      placed.push({ id: item.id, angle: start + centre / ring.radius, radius: ring.radius });
      cursor += 2 * item.halfWidth + spacing;
      outerRadius = Math.max(outerRadius, ring.radius + item.halfHeight);
    }
  }
  return { placed, outerRadius };
}
