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
  /** On the dome (true) or on a leg (false); `t` is 0 left to 1 right along the dome. */
  arc: boolean;
  t: number;
};

export type ArchLayout = {
  marks: ArchMark[];
  seatRadius: number;
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
      marks.push({ x, y, color: entry.color, label: entry.label, splinter: entry.splinter, index: i, arc: seat.arc, t: seat.t });
      cursor += 1;
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
    entries: chamber.entries,
    total: chamber.total,
    majoritySeats: chamber.majority,
    box: { minX, minY, maxX, maxY },
  };
}
