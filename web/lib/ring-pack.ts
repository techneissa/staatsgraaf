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

/** An item as it rests: its ring and angle, and its extents. */
export type RestItem = RingItem & { angle: number; radius: number };

/**
 * Open one item in place. The members take the ring the item rests on,
 * centred where it was, and only the neighbours on that ring move: each is
 * pushed just far enough along the ring to clear the next, out to the ends of
 * the arc. Nothing on another ring moves and nothing moves that does not have
 * to. Returns null when the ring's arc cannot hold everything, in which case
 * the caller packs the sector again from scratch.
 */
export function pushPack(
  rest: readonly RestItem[],
  openId: string,
  members: readonly RingItem[],
  arc: { start: number; end: number },
  gap = GLYPH_GAP,
): RingPlacement[] | null {
  const open = rest.find((item) => item.id === openId);
  if (!open) return null;
  if (!arc) return null;
  const radius = open.radius;
  const onRing = rest
    .filter((item) => Math.abs(item.radius - radius) < 0.5 && item.angle >= arc.start - 1e-9 && item.angle <= arc.end + 1e-9)
    .sort((a, b) => a.angle - b.angle);

  // Desired centres in arc length: rest for the neighbours, the members laid
  // side by side around the open item's centre.
  type Slot = { id: string; centre: number; halfWidth: number; halfHeight: number };
  const slots: Slot[] = [];
  for (const item of onRing) {
    if (item.id !== openId) {
      slots.push({ id: item.id, centre: item.angle * radius, halfWidth: item.halfWidth, halfHeight: item.halfHeight });
      continue;
    }
    const total = members.reduce((sum, member) => sum + 2 * member.halfWidth, 0) + gap * Math.max(0, members.length - 1);
    let cursor = open.angle * radius - total / 2;
    for (const member of members) {
      slots.push({ id: member.id, centre: cursor + member.halfWidth, halfWidth: member.halfWidth, halfHeight: member.halfHeight });
      cursor += 2 * member.halfWidth + gap;
    }
  }

  const lo = arc.start * radius;
  const hi = arc.end * radius;
  const widths = slots.reduce((sum, slot) => sum + 2 * slot.halfWidth, 0) + gap * Math.max(0, slots.length - 1);
  if (widths > hi - lo + 1e-9) return null;

  // Push right where slots overlap, then push back left from the far wall,
  // then check the near wall: two sweeps settle a line of intervals.
  const centres = slots.map((slot) => slot.centre);
  for (let i = 0; i < slots.length; i += 1) {
    const min = i === 0 ? lo + slots[i].halfWidth : centres[i - 1] + slots[i - 1].halfWidth + gap + slots[i].halfWidth;
    if (centres[i] < min) centres[i] = min;
  }
  for (let i = slots.length - 1; i >= 0; i -= 1) {
    const max = i === slots.length - 1 ? hi - slots[i].halfWidth : centres[i + 1] - slots[i + 1].halfWidth - gap - slots[i].halfWidth;
    if (centres[i] > max) centres[i] = max;
  }
  for (let i = 0; i < slots.length; i += 1) {
    const min = i === 0 ? lo + slots[i].halfWidth : centres[i - 1] + slots[i - 1].halfWidth + gap + slots[i].halfWidth;
    if (centres[i] < min - 1e-6) return null;
  }

  const moved = new Map(slots.map((slot, index) => [slot.id, centres[index] / radius]));
  const placed: RingPlacement[] = [];
  for (const item of rest) {
    if (item.id === openId) continue;
    const angle = moved.get(item.id);
    placed.push({ id: item.id, angle: angle ?? item.angle, radius: item.radius });
  }
  for (const member of members) {
    const angle = moved.get(member.id);
    if (angle === undefined) return null;
    placed.push({ id: member.id, angle, radius });
  }
  return placed;
}

/**
 * Open one item as a compact block. The members take a few rows across the
 * ring and columns along it, centred where the item was and kept inside the
 * radial band the sector may use, so a group of fifty reads as one patch
 * instead of a long arc. Only the neighbours the block overlaps move: each
 * on its own ring, pushed away from the block just far enough to clear it
 * and the next one, never past the ends of the sector. Nothing on a ring the
 * block does not reach moves at all.
 *
 * The block tries the most compact shape first and, when a ring cannot make
 * room, a taller one (more rows, fewer columns), then the same shape moved
 * toward the side with more room. Returns null when nothing fits, in which
 * case the caller falls back to `pushPack` or a full re-pack.
 */
export function bloomPack(
  rest: readonly RestItem[],
  openId: string,
  members: readonly RingItem[],
  arc: { start: number; end: number },
  band: { inner: number; outer: number },
  gap = GLYPH_GAP,
): RingPlacement[] | null {
  const open = rest.find((item) => item.id === openId);
  if (!open || members.length === 0) return null;
  const half = members.reduce((max, member) => Math.max(max, member.halfWidth, member.halfHeight), 0);
  const pitch = 2 * half + gap;
  const count = members.length;
  const rowsMax = Math.max(1, Math.floor((band.outer - band.inner - 2 * half) / pitch) + 1);
  // Along the ring a block reads well about twice as long as it is deep.
  const rowsIdeal = Math.max(1, Math.min(rowsMax, Math.ceil(Math.sqrt(count / 2.2))));
  const others = rest.filter((item) => item.id !== openId);

  const attempt = (rows: number, shift: number): RingPlacement[] | null => {
    const cols = Math.ceil(count / rows);
    const depth = (rows - 1) * pitch;
    const lowest = band.inner + half;
    const highest = band.outer - half - depth;
    if (highest < lowest - 1e-9) return null;
    const r0 = Math.min(highest, Math.max(lowest, open.radius - depth / 2));
    const r1 = r0 + depth;
    // Angular half span of the block, measured on its innermost row (the widest in angle).
    const halfAngle = ((cols - 1) * pitch) / 2 / r0 + half / r0;
    const centre = Math.min(arc.end - halfAngle, Math.max(arc.start + halfAngle, open.angle + shift));
    if (arc.end - arc.start < 2 * halfAngle) return null;

    const placed: RingPlacement[] = [];
    members.forEach((member, index) => {
      const col = Math.floor(index / rows);
      const row = index % rows;
      const inCol = Math.min(rows, count - col * rows);
      const radius = r0 + (row + (rows - inCol) / 2) * pitch;
      const along = (col - (cols - 1) / 2) * pitch;
      placed.push({ id: member.id, angle: centre + along / radius, radius });
    });

    // Every neighbour whose band the block reaches is on a ring that must make room.
    const rings = new Map<number, RestItem[]>();
    const moved = new Map<string, number>();
    for (const item of others) {
      const reaches = item.radius + item.halfHeight > r0 - half - gap && item.radius - item.halfHeight < r1 + half + gap;
      if (!reaches) continue;
      const key = Math.round(item.radius * 2) / 2;
      rings.set(key, [...(rings.get(key) ?? []), item]);
    }
    for (const [radius, items] of rings) {
      const blockLo = (centre - halfAngle) * radius - gap;
      const blockHi = (centre + halfAngle) * radius + gap;
      const lo = arc.start * radius;
      const hi = arc.end * radius;
      const left = items.filter((item) => item.angle < centre).sort((a, b) => b.angle - a.angle);
      const right = items.filter((item) => item.angle >= centre).sort((a, b) => a.angle - b.angle);
      let wall = blockLo;
      for (const item of left) {
        const at = Math.min(item.angle * radius, wall - item.halfWidth);
        if (at - item.halfWidth < lo - 1e-6) return null;
        moved.set(item.id, at / radius);
        wall = at - item.halfWidth - gap;
      }
      wall = blockHi;
      for (const item of right) {
        const at = Math.max(item.angle * radius, wall + item.halfWidth);
        if (at + item.halfWidth > hi + 1e-6) return null;
        moved.set(item.id, at / radius);
        wall = at + item.halfWidth + gap;
      }
    }
    for (const item of others) placed.push({ id: item.id, angle: moved.get(item.id) ?? item.angle, radius: item.radius });
    return placed;
  };

  for (let rows = rowsIdeal; rows <= rowsMax; rows += 1) {
    const placed = attempt(rows, 0);
    if (placed) return placed;
  }
  // Moved toward either side, in growing steps, at the ideal shape and then the tallest.
  const span = arc.end - arc.start;
  for (const rows of [rowsIdeal, rowsMax]) {
    for (let step = 1; step <= 8; step += 1) {
      for (const sign of [1, -1]) {
        const placed = attempt(rows, (sign * step * span) / 16);
        if (placed) return placed;
      }
    }
  }
  return null;
}
