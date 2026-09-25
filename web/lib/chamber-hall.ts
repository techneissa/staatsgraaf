/**
 * The plenary hall of a Kamer as the chamber form of Verbanden draws it
 * (ADR 0018, amendment 3): the seats where the chamber's own floor plan puts
 * them, each seat the member who holds it, the chair, and the kabinet facing
 * the benches.
 *
 * The plans are sourced (data/chamber-plans.json, workstream S addendum of
 * 25-09-2026):
 *
 * - The Eerste Kamer names the member in every seat ("person" basis).
 * - The Tweede Kamer publishes which fractie sits where, not which member
 *   ("fractie" basis). Members fill their fractie's seats in the stable order
 *   of lib/seats.ts, front row first, and the chart says so.
 * - When a plan no longer matches the sitting members (someone left, a
 *   fractie split), the plan's seats are kept and refilled by fractie blocks,
 *   largest first ("blocks" basis), and the chart says the plan is out of date.
 *
 * Only the kabinet's place is sourced (vak-K in the Tweede Kamer, the
 * regeringstafel opposite the chair in the Eerste Kamer); who sits where on
 * it is not published, so the bench is drawn schematically: the
 * minister-president first, then the ministers, then the staatssecretarissen.
 *
 * Pure and deterministic; runs once at build time inside `buildHierarchy`.
 * Coordinates are in seat pitches (one pitch between neighbouring seats), with
 * y down; the client only scales them.
 */

export type PlanPoint = { x: number; y: number };

export type PlanSeat = {
  x: number;
  y: number;
  fractie: string;
  person?: string | null;
  block?: "left" | "right" | "chair";
  chair?: boolean;
};

export type ChamberPlan = {
  id: string;
  organization: string;
  asOf: string;
  coordinates: "pdf-points" | "grid";
  seatBasis: "fractie" | "person";
  seats: readonly PlanSeat[];
  places: {
    chair?: PlanPoint;
    clerk?: PlanPoint;
    rostrum?: PlanPoint;
    cabinet?: readonly { from: PlanPoint; to: PlanPoint }[];
  };
  source?: { source: string; retrieved?: string | null } | null;
};

/** One seat as drawn. `person` is null for an unfilled seat. */
export type HallSeat = {
  x: number;
  y: number;
  /** Hub id of the fractie (`fractie:<tree>:<label>`). */
  hub: string;
  person: string | null;
  /** The chair's own seat (Eerste Kamer), or the chair's empty fractie seat (Tweede Kamer). */
  chair?: true;
};

/** One bewindspersoon on the kabinet bench, with their ministry hub id. */
export type HallBenchSeat = { x: number; y: number; person: string; hub: string };

export type ChamberHall = {
  plan: string;
  /** Date of the plan's edition, or the retrieval date of a live page. */
  asOf: string;
  /** Index into `HierarchyBundle.sources`. */
  src: number;
  /** How members are placed: named per seat, by fractie seats, or refilled by blocks. */
  basis: "person" | "fractie" | "blocks";
  width: number;
  height: number;
  /** Seat radius, in pitches. */
  r: number;
  seats: HallSeat[];
  /** The chair at the desk (Tweede Kamer); in the Eerste Kamer the chair's seat is in `seats`. */
  chair: { x: number; y: number; r: number; person: string | null } | null;
  cabinet: { r: number; seats: HallBenchSeat[]; label: PlanPoint };
  total: number;
  majority: number;
};

export type HallMember = { person: string; fractie: string; name: string };

export type HallInput = {
  plan: ChamberPlan;
  src: number;
  /** Sitting members of the chamber with their fractie as memberships name it. */
  members: readonly HallMember[];
  /** Hub id of a fractie name. */
  hubOf: (fractie: string) => string;
  /** The chair of the chamber, or null. */
  chair: string | null;
  /** The kabinet in bench order (minister-president first), with their ministry hub. */
  cabinet: readonly { person: string; hub: string }[];
  /** Members in seat order (lib/seats.ts). */
  seatOrder: <T extends { id: string; name: string }>(members: readonly T[]) => T[];
};

const round = (value: number) => Math.round(value * 100) / 100;

/** Median distance from each seat to its nearest neighbour. */
function pitchOf(points: readonly PlanPoint[]): number {
  if (points.length < 2) return 1;
  const nearest = points
    .map((a) => Math.min(...points.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y))))
    .sort((a, b) => a - b);
  return nearest[Math.floor(nearest.length / 2)] || 1;
}

function countBy<T>(items: readonly T[], key: (item: T) => string): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of items) out.set(key(item), (out.get(key(item)) ?? 0) + 1);
  return out;
}

function sameCounts(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) if (b.get(key) !== value) return false;
  return true;
}

/**
 * The Tweede Kamer plan in display space: turned half a circle so the benches
 * form a dome at the top and the chair and vak-K sit in the opening below,
 * facing them (the owner's choice of 25-09-2026). Rotating, never mirroring,
 * keeps vak-K on the chair's left as the chamber draws it.
 */
function turnPdf(plan: ChamberPlan) {
  const pitch = pitchOf(plan.seats);
  const turn = (point: PlanPoint): PlanPoint => ({ x: -point.x / pitch, y: -point.y / pitch });
  return { pitch, turn };
}

/** The Eerste Kamer grid in display space: an aisle between the blocks, bench pairs a little apart. */
function placeGrid(seat: PlanSeat): PlanPoint {
  const gap = 0.28 * Math.floor(seat.y / 2);
  const y = seat.y + gap;
  if (seat.block === "chair") return { x: 5.05, y };
  if (seat.block === "right") return { x: 6.9 + (seat.x - 5) * 1.12, y };
  return { x: seat.x * 1.12, y };
}

/** Bench seats in rows along a direction, row after row away from the benches. */
function benchRows(
  people: readonly { person: string; hub: string }[],
  origin: PlanPoint,
  along: PlanPoint,
  across: PlanPoint,
  perRow: number,
  pitch: number,
): HallBenchSeat[] {
  return people.map((entry, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    return {
      x: origin.x + along.x * col * pitch + across.x * row * pitch,
      y: origin.y + along.y * col * pitch + across.y * row * pitch,
      person: entry.person,
      hub: entry.hub,
    };
  });
}

function unit(v: PlanPoint): PlanPoint {
  const length = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / length, y: v.y / length };
}

export function layoutHall(input: HallInput): ChamberHall {
  const { plan } = input;
  const byId = new Map(input.members.map((member) => [member.person, member]));
  const total = input.members.length;
  const majority = Math.floor(total / 2) + 1;

  // Which basis still holds: a person plan names exactly the sitting members;
  // a fractie plan has as many seats per fractie as the fractie has members.
  let basis: ChamberHall["basis"] = "blocks";
  if (plan.seatBasis === "person") {
    const named = plan.seats.map((seat) => seat.person).filter((id): id is string => Boolean(id));
    if (named.length === total && new Set(named).size === total && named.every((id) => byId.has(id))) basis = "person";
  } else if (plan.seats.length === total && sameCounts(countBy(plan.seats, (seat) => seat.fractie), countBy(input.members, (member) => member.fractie))) {
    basis = "fractie";
  }

  // Seat positions in display space.
  const bench = input.cabinet;
  let points: PlanPoint[];
  let chairPoint: PlanPoint | null = null;
  let cabinetSeats: HallBenchSeat[] = [];
  let cabinetLabel: PlanPoint = { x: 0, y: 0 };
  const benchPitch = 0.86;
  if (plan.coordinates === "pdf-points") {
    const { pitch, turn } = turnPdf(plan);
    points = plan.seats.map(turn);
    chairPoint = plan.places.chair ? turn(plan.places.chair) : null;
    const bars = plan.places.cabinet ?? [];
    if (bars.length > 0 && bench.length > 0) {
      // Rows start at the members' end of the front bar and run along it,
      // stacking toward the back bar.
      const front = bars[0];
      const back = bars[bars.length - 1];
      const origin = turn(front.to);
      const along = unit({ x: turn(front.from).x - origin.x, y: turn(front.from).y - origin.y });
      let across = { x: -along.y, y: along.x };
      const toBack = { x: turn(back.to).x - origin.x, y: turn(back.to).y - origin.y };
      if (across.x * toBack.x + across.y * toBack.y < 0) across = { x: -across.x, y: -across.y };
      const perRow = Math.max(4, Math.ceil(Math.hypot(front.from.x - front.to.x, front.from.y - front.to.y) / pitch / benchPitch) + 1);
      cabinetSeats = benchRows(bench, origin, along, across, perRow, benchPitch);
      // The label sits past the far end of the rows, centred across them.
      const rows = Math.ceil(bench.length / perRow);
      const reach = (perRow + 0.6) * benchPitch;
      const middle = ((rows - 1) / 2) * benchPitch;
      cabinetLabel = { x: origin.x + along.x * reach + across.x * middle, y: origin.y + along.y * reach + across.y * middle + 0.35 };
    }
  } else {
    points = plan.seats.map(placeGrid);
    // The regeringstafel faces the chair across the hall: an arc above the
    // aisle, the minister-president in the middle of the front row.
    const xs = points.map((point) => point.x);
    const centre = (Math.min(...xs) + Math.max(...xs)) / 2;
    const perRow = Math.max(6, Math.ceil(bench.length / 2));
    const top = Math.min(...points.map((point) => point.y));
    const rows = Math.ceil(bench.length / perRow);
    const order = (n: number) => Array.from({ length: n }, (_, i) => (i % 2 === 0 ? i / 2 : -(i + 1) / 2));
    cabinetSeats = bench.map((entry, index) => {
      const row = Math.floor(index / perRow);
      const inRow = Math.min(perRow, bench.length - row * perRow);
      const slot = order(inRow)[index % perRow];
      const x = centre + slot * benchPitch;
      const y = top - 2.1 - row * benchPitch + 0.018 * slot * slot;
      return { x, y, person: entry.person, hub: entry.hub };
    });
    cabinetLabel = { x: centre, y: top - 2.1 - rows * benchPitch - 0.7 };
  }

  // Who sits where.
  const seats: HallSeat[] = plan.seats.map((seat, index) => ({
    x: points[index].x,
    y: points[index].y,
    hub: input.hubOf(seat.fractie),
    person: null,
    ...(seat.chair ? { chair: true as const } : {}),
  }));
  // Front to back, left to right: largest y first in display space.
  const reading = (a: number, b: number) => round(seats[b].y) - round(seats[a].y) || seats[a].x - seats[b].x;
  if (basis === "person") {
    plan.seats.forEach((seat, index) => {
      const member = byId.get(seat.person!)!;
      seats[index].person = member.person;
      seats[index].hub = input.hubOf(member.fractie);
    });
  } else {
    // By fractie: the plan's seats per fractie, or, for blocks, the seats
    // left to right handed out to fracties largest first.
    const groups = new Map<string, HallMember[]>();
    for (const member of input.members) groups.set(member.fractie, [...(groups.get(member.fractie) ?? []), member]);
    const seatsOf = new Map<string, number[]>();
    if (basis === "fractie") {
      plan.seats.forEach((seat, index) => seatsOf.set(seat.fractie, [...(seatsOf.get(seat.fractie) ?? []), index]));
    } else {
      const byAngle = seats.map((_, index) => index).sort((a, b) => seats[a].x - seats[b].x || seats[b].y - seats[a].y);
      const sizes = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "nl"));
      let at = 0;
      for (const [fractie, list] of sizes) {
        seatsOf.set(fractie, byAngle.slice(at, at + list.length));
        at += list.length;
      }
      for (const seat of seats) delete seat.chair;
    }
    for (const [fractie, list] of groups) {
      const slots = [...(seatsOf.get(fractie) ?? [])].sort(reading);
      const ordered = input.seatOrder(list.map((member) => ({ id: member.person, name: member.name })));
      // The chair of the Tweede Kamer sits at the desk; their fractie seat stays empty.
      const seated = plan.coordinates === "pdf-points" ? ordered.filter((member) => member.id !== input.chair) : ordered;
      slots.forEach((slot, i) => {
        seats[slot].hub = input.hubOf(fractie);
        seats[slot].person = seated[i]?.id ?? null;
        if (!seated[i] && plan.coordinates === "pdf-points" && input.chair && byId.get(input.chair)?.fractie === fractie) seats[slot].chair = true;
      });
    }
  }

  // Normalise to a box starting at a margin, in pitches.
  const r = 0.43;
  const margin = 0.75;
  // The label is a chip about a pitch tall and three wide: keep room for it.
  const labelBox = [-1.5, 1.5].flatMap((dx) => [-0.9, 0.9].map((dy) => ({ x: cabinetLabel.x + dx, y: cabinetLabel.y + dy })));
  // Room under the chair for its label, at the desk or in its seat.
  const chairAt = chairPoint ?? seats.find((seat) => seat.chair && seat.person) ?? null;
  const chairBox = chairAt ? [{ x: chairAt.x, y: chairAt.y + r * 1.5 + 1.1 }] : [];
  const all: PlanPoint[] = [...seats, ...cabinetSeats, ...chairBox, ...labelBox];
  const minX = Math.min(...all.map((point) => point.x)) - margin;
  const minY = Math.min(...all.map((point) => point.y)) - margin;
  const maxX = Math.max(...all.map((point) => point.x)) + margin;
  const maxY = Math.max(...all.map((point) => point.y)) + margin;
  const shift = (point: PlanPoint) => ({ x: round(point.x - minX), y: round(point.y - minY) });

  return {
    plan: plan.id,
    asOf: plan.asOf,
    src: input.src,
    basis,
    width: round(maxX - minX),
    height: round(maxY - minY),
    r,
    seats: seats.map((seat) => ({ ...seat, ...shift(seat) })),
    chair: chairPoint && plan.coordinates === "pdf-points" ? { ...shift(chairPoint), r: round(r * 1.5), person: input.chair } : null,
    cabinet: { r: round(r * 0.9), seats: cabinetSeats.map((seat) => ({ ...seat, ...shift(seat) })), label: shift(cabinetLabel) },
    total,
    majority,
  };
}
