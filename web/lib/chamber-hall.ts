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
    furniture?: readonly { kind: "desk" | "rostrum" | "cabinet" | "other"; points: readonly PlanPoint[] }[];
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
  cabinet: { r: number; seats: HallBenchSeat[] };
  /** The hall's furniture as polygons (desks, rostrum, vak-K), drawn faintly under the seats. */
  furniture: { kind: "desk" | "rostrum" | "cabinet" | "other"; points: PlanPoint[] }[];
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

/**
 * The kabinet at its tables (vak-K): the plan draws each table as a strip, and
 * the bewindspersonen sit in rows along them, a row either side of every
 * table, so the people stay on the outline the plan draws instead of beside
 * it. The rows run the way their table runs, are centred on it, and fill from
 * the row nearest the chair, from the end of the table nearest the chair. When
 * the tables stand two or more seat widths apart the rows sit a quarter of
 * that gap off each table, which makes the rows evenly spaced across both.
 */
function benchAtTables(
  people: readonly { person: string; hub: string }[],
  tables: readonly (readonly PlanPoint[])[],
  chair: PlanPoint | null,
  pitch: number,
): HallBenchSeat[] {
  const mid = (a: PlanPoint, b: PlanPoint): PlanPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const strips = tables.map((points) => {
    // The strip's ends are its two short edges.
    const edge = (i: number) => Math.hypot(points[(i + 1) % 4].x - points[i].x, points[(i + 1) % 4].y - points[i].y);
    const ends = edge(0) + edge(2) < edge(1) + edge(3) ? [0, 2] : [1, 3];
    const a = mid(points[ends[0]], points[(ends[0] + 1) % 4]);
    const b = mid(points[ends[1]], points[(ends[1] + 1) % 4]);
    const centre = mid(a, b);
    // Run toward the end nearest the chair first.
    const toChair = (point: PlanPoint) => (chair ? Math.hypot(point.x - chair.x, point.y - chair.y) : 0);
    const [from, to] = toChair(a) <= toChair(b) ? [a, b] : [b, a];
    return { centre, along: unit({ x: to.x - from.x, y: to.y - from.y }) };
  });
  const first = strips[0];
  const sideOf = (strip: (typeof strips)[number]) => ({ x: -strip.along.y, y: strip.along.x });
  const gap =
    strips.length > 1
      ? Math.abs((strips[1].centre.x - first.centre.x) * sideOf(first).x + (strips[1].centre.y - first.centre.y) * sideOf(first).y)
      : 0;
  const offset = strips.length > 1 && gap >= 4 * 0.43 ? gap / (strips.length * 2) : 0.6;
  const rows = strips
    .flatMap((strip) => {
      const side = sideOf(strip);
      return [-offset, offset].map((d) => ({
        origin: { x: strip.centre.x + side.x * d, y: strip.centre.y + side.y * d },
        along: strip.along,
      }));
    })
    .sort((a, b) => {
      const dist = (point: PlanPoint) => (chair ? Math.hypot(point.x - chair.x, point.y - chair.y) : 0);
      return dist(a.origin) - dist(b.origin);
    });
  const base = Math.floor(people.length / rows.length);
  const extra = people.length % rows.length;
  const out: HallBenchSeat[] = [];
  let at = 0;
  rows.forEach((row, index) => {
    const count = base + (index < extra ? 1 : 0);
    for (let i = 0; i < count; i += 1) {
      const slot = (i - (count - 1) / 2) * pitch;
      out.push({ x: row.origin.x + row.along.x * slot, y: row.origin.y + row.along.y * slot, person: people[at].person, hub: people[at].hub });
      at += 1;
    }
  });
  return out;
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
  let furniture: ChamberHall["furniture"] = [];
  const benchPitch = 0.86;
  if (plan.coordinates === "pdf-points") {
    const { pitch, turn } = turnPdf(plan);
    points = plan.seats.map(turn);
    chairPoint = plan.places.chair ? turn(plan.places.chair) : null;
    furniture = (plan.places.furniture ?? []).map((item) => ({ kind: item.kind, points: item.points.map(turn) }));
    const tables = furniture.filter((item) => item.kind === "cabinet" && item.points.length === 4);
    if (tables.length > 0 && bench.length > 0) {
      cabinetSeats = benchAtTables(bench, tables.map((item) => item.points), chairPoint, benchPitch);
    } else {
      const bars = plan.places.cabinet ?? [];
      if (bars.length > 0 && bench.length > 0) {
        // No table outlines: rows start at the members' end of the front bar and
        // run along it, stacking toward the back bar.
        const front = bars[0];
        const back = bars[bars.length - 1];
        const origin = turn(front.to);
        const along = unit({ x: turn(front.from).x - origin.x, y: turn(front.from).y - origin.y });
        let across = { x: -along.y, y: along.x };
        const toBack = { x: turn(back.to).x - origin.x, y: turn(back.to).y - origin.y };
        if (across.x * toBack.x + across.y * toBack.y < 0) across = { x: -across.x, y: -across.y };
        const perRow = Math.max(4, Math.ceil(Math.hypot(front.from.x - front.to.x, front.from.y - front.to.y) / pitch / benchPitch) + 1);
        cabinetSeats = benchRows(bench, origin, along, across, perRow, benchPitch);
      }
    }
  } else {
    points = plan.seats.map(placeGrid);
    // The chair's desk with the griffie either side of it, as the page's
    // middle block draws it (griffie, chair, griffie), just in front of the chair.
    const chairIndex = plan.seats.findIndex((seat) => seat.block === "chair");
    if (chairIndex >= 0) {
      const at = points[chairIndex];
      furniture.push({
        kind: "desk",
        points: [
          { x: at.x - 1.3, y: at.y - 0.95 },
          { x: at.x + 1.3, y: at.y - 0.95 },
          { x: at.x + 1.3, y: at.y - 0.72 },
          { x: at.x - 1.3, y: at.y - 0.72 },
        ],
      });
    }
    // The regeringstafel faces the chair across the hall: an arc above the
    // aisle, the minister-president in the middle of the front row.
    const xs = points.map((point) => point.x);
    // The regeringstafel is centred on the chair's seat, which stands in the aisle.
    const centre = chairIndex >= 0 ? points[chairIndex].x : (Math.min(...xs) + Math.max(...xs)) / 2;
    const perRow = Math.max(6, Math.ceil(bench.length / 2));
    const top = Math.min(...points.map((point) => point.y));
    // Slots run from the middle of the row outward, left before right, around
    // the hall's middle: a row of an even count sits half a seat to each side
    // of the aisle, not half a seat off it.
    const order = (n: number) =>
      Array.from({ length: n }, (_, i) => i - (n - 1) / 2).sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
    cabinetSeats = bench.map((entry, index) => {
      const row = Math.floor(index / perRow);
      const inRow = Math.min(perRow, bench.length - row * perRow);
      const slot = order(inRow)[index % perRow];
      const x = centre + slot * benchPitch;
      const y = top - 2.1 - row * benchPitch + 0.018 * slot * slot;
      return { x, y, person: entry.person, hub: entry.hub };
    });
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
  // Room under the chair for its label, at the desk or in its seat.
  const chairAt = chairPoint ?? seats.find((seat) => seat.chair && seat.person) ?? null;
  const chairBox = chairAt ? [{ x: chairAt.x, y: chairAt.y + r * 2.3 + 1.1 }] : [];
  const all: PlanPoint[] = [...seats, ...cabinetSeats, ...chairBox, ...furniture.flatMap((item) => item.points)];
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
    chair: chairPoint && plan.coordinates === "pdf-points" ? { ...shift(chairPoint), r: round(r * 2.3), person: input.chair } : null,
    cabinet: { r: round(r * 0.9), seats: cabinetSeats.map((seat) => ({ ...seat, ...shift(seat) })),  },
    furniture: furniture.map((item) => ({ kind: item.kind, points: item.points.map(shift) })),
    total,
    majority,
  };
}
