import {
  archSeats,
  type ArchParams,
  type ArchSeat,
  type ChamberSeatEntry,
  type ChamberSeats,
} from "@/lib/graph";

/**
 * Seat marks of a chamber drawn as a ∩ arch: concentric arcs over the top
 * continued as straight legs, the shape of the plenary hall. Fractie blocks are
 * laid along the path from the left leg, over the arch, down the right leg, so
 * every fractie is one contiguous block (the H6 order of the plan: blocks by
 * size until the zaalindeling is sourced). Colours come from the sourced party
 * registry through the bundle; a fractie without a sourced colour renders
 * neutral and never gets an invented one.
 */

export type ArchMark = {
  x: number;
  y: number;
  color: string | null;
  label: string;
  splinter: boolean;
  /** Index in the fractie's own block, for the accessible label. */
  index: number;
};

export type ArchLayout = {
  marks: ArchMark[];
  seatRadius: number;
  /** Line marking the majority threshold. */
  majority: { x1: number; y1: number; x2: number; y2: number } | null;
  entries: ChamberSeatEntry[];
  total: number;
  majoritySeats: number;
  /** Bounding box in local coordinates. */
  box: { minX: number; minY: number; maxX: number; maxY: number };
};

function seatPosition(seat: ArchSeat): { x: number; y: number } {
  return { x: seat.x, y: seat.y };
}

export function layoutArch(
  chamber: ChamberSeats,
  params: ArchParams,
  pitch: number,
  flip = false,
): ArchLayout {
  const seats = archSeats(params, pitch, flip);
  const marks: ArchMark[] = [];
  let cursor = 0;
  for (const entry of chamber.entries) {
    for (let i = 0; i < entry.seats && cursor < seats.length; i += 1) {
      const seat = seats[cursor];
      const { x, y } = seatPosition(seat);
      marks.push({ x, y, color: entry.color, label: entry.label, splinter: entry.splinter, index: i });
      cursor += 1;
    }
  }

  const sign = flip ? -1 : 1;
  const rowBase = params.r0Steps * pitch;
  const inner = rowBase - pitch * 0.9;
  const outer = rowBase + params.rows * pitch - pitch * 0.1;
  const boundary = seats[chamber.majority - 1];
  const before = seats[chamber.majority - 2];
  let majority: ArchLayout["majority"] = null;
  if (boundary) {
    if (!boundary.arc && before && !before.arc && Math.sign(boundary.x) === Math.sign(before.x)) {
      const y = (boundary.y + before.y) / 2;
      const side = Math.sign(boundary.x) || 1;
      majority = { x1: side * inner, y1: y, x2: side * outer, y2: y };
    } else {
      const ta = boundary.arc ? boundary.t : before?.t ?? boundary.t;
      const tb = before ? (before.arc ? before.t : boundary.t) : ta;
      const angle = Math.PI + ((ta + tb) / 2) * Math.PI;
      majority = {
        x1: Math.cos(angle) * inner,
        y1: sign * Math.sin(angle) * inner,
        x2: Math.cos(angle) * outer,
        y2: sign * Math.sin(angle) * outer,
      };
    }
  }

  const seatRadius = pitch * 0.36;
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  for (const mark of marks) {
    minX = Math.min(minX, mark.x - seatRadius);
    minY = Math.min(minY, mark.y - seatRadius);
    maxX = Math.max(maxX, mark.x + seatRadius);
    maxY = Math.max(maxY, mark.y + seatRadius);
  }

  return {
    marks,
    seatRadius,
    majority,
    entries: chamber.entries,
    total: chamber.total,
    majoritySeats: chamber.majority,
    box: { minX, minY, maxX, maxY },
  };
}
