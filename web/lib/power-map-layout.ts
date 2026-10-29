/**
 * Layout and grouping for the connections view (Verbanden), the view with the
 * internal id `power`. Pure and deterministic, so the web and a later Swift
 * client draw the same picture from the same `power-map.json`.
 *
 * Two shapes:
 *
 * - The overview ranks the most connected people by the summed strength of
 * their ties (lib/power-connections.ts) and groups them by role: the
 * cabinet, the Kamers, and everyone else.
 * - The focus is an ego network. The picked person or body sits in the
 * centre; its ties are grouped by kind (office and body, cabinet, party and
 * fractie, shared news) into labelled columns on the left and the right.
 * A stronger tie sits closer to the centre and gets a heavier line.
 *
 * Columns instead of a circle keep every label horizontal and one row apart,
 * so names never collide at any width the diagram is drawn at. Below that
 * width the view shows the same groups as a list (`egoFits`).
 */

import type { PowerLink, PowerReason } from "./power-connections";

export const TIE_KINDS = ["office", "cabinet", "party", "news"] as const;
export type TieKind = (typeof TIE_KINDS)[number];

export type Tie = { other: string; link: PowerLink };
export type TieGroup = { kind: TieKind; ties: Tie[] };

/** The group a tie belongs to: its most structural reason wins. */
export function tieKind(reasons: readonly PowerReason[]): TieKind {
  if (reasons.includes("tenure")) return "office";
  if (reasons.includes("kabinet")) return "cabinet";
  if (reasons.includes("fractie")) return "party";
  if (reasons.includes("organisation")) return "office";
  return "news";
}

/** Tie strength on a five step scale, for the meter and the line weight. */
export const STRENGTH_STEPS = [0.5, 0.9, 1.4, 2.4] as const;
export function strengthLevel(weight: number): 1 | 2 | 3 | 4 | 5 {
  let level = 1;
  for (const step of STRENGTH_STEPS) if (weight >= step) level += 1;
  return level as 1 | 2 | 3 | 4 | 5;
}

/** Every tie in its group, groups in the fixed order of `TIE_KINDS`, strongest first. */
export function groupTies(ties: readonly Tie[]): TieGroup[] {
  const byKind = new Map<TieKind, Tie[]>();
  for (const tie of ties) {
    const kind = tieKind(tie.link.reasons);
    const list = byKind.get(kind) ?? [];
    list.push(tie);
    byKind.set(kind, list);
  }
  return TIE_KINDS.filter((kind) => byKind.has(kind)).map((kind) => ({
    kind,
    ties: [...(byKind.get(kind) ?? [])].sort(
      (x, y) => y.link.weight - x.link.weight || (x.other < y.other ? -1 : x.other > y.other ? 1 : 0),
    ),
  }));
}

export type EgoOptions = {
  width: number;
  height: number;
  /** Diameter of a neighbour's portrait. */
  node?: number;
  /** Radius of the focus portrait. */
  focusRadius?: number;
  /** Width kept for a neighbour's name and reason beside its portrait. */
  label?: number;
  /** Height of one neighbour row; never less than a 44 px touch target. */
  row?: number;
  /** Width of the focus's name and title under its portrait, kept clear of the neighbours. */
  centreText?: number;
  /** Height of a group heading. */
  heading?: number;
  pad?: number;
};

export type EgoNode = { id: string; kind: TieKind; side: -1 | 1; x: number; y: number; level: number };
export type EgoHeading = { kind: TieKind; side: -1 | 1; x: number; y: number; shown: number; hidden: number };
export type EgoLayout = {
  centre: { x: number; y: number };
  nodes: EgoNode[];
  headings: EgoHeading[];
};

const EGO_DEFAULTS = { node: 36, focusRadius: 40, label: 148, centreText: 144, row: 46, heading: 26, pad: 12 };

/** The nearest a neighbour's centre may come to the focus's centre, horizontally. */
function innerReach(o: typeof EGO_DEFAULTS): number {
  return Math.max(o.focusRadius + 48, o.centreText / 2 + o.node / 2 + 16);
}

/** Whether the diagram fits the box; below this the list form is used. */
export function egoFits(width: number, height: number, options: Omit<EgoOptions, "width" | "height"> = {}): boolean {
  const o = { ...EGO_DEFAULTS, ...options };
  const half = width / 2;
  const reach = half - o.pad - o.label - o.node / 2;
  return reach - innerReach(o) >= 8 && height >= o.heading + o.row * 4 + o.pad * 2;
}

/**
 * Split groups over the left and right column so the taller column is as
 * short as possible; ties keep the order of `TIE_KINDS`, top to bottom.
 */
export function assignSides(sizes: readonly number[], headingRows = 0.6): (-1 | 1)[] {
  const n = sizes.length;
  let best: (-1 | 1)[] = sizes.map(() => 1);
  let bestScore = Infinity;
  for (let mask = 0; mask < 1 << n; mask += 1) {
    const sides = sizes.map((_, index) => ((mask >> index) & 1 ? 1 : -1) as -1 | 1);
    let left = 0;
    let right = 0;
    sizes.forEach((size, index) => {
      if (sides[index] === -1) left += size + headingRows;
      else right += size + headingRows;
    });
    // Prefer the first group on the right, where the eye starts after the centre.
    const score = Math.max(left, right) * 100 + Math.abs(left - right) + (sides[0] === 1 ? 0 : 0.5);
    if (score < bestScore - 1e-9) {
      bestScore = score;
      best = sides;
    }
  }
  return best;
}

/** Place the neighbours of a focus in labelled columns. */
export function layoutEgo(input: readonly TieGroup[], options: EgoOptions): EgoLayout {
  const o = { ...EGO_DEFAULTS, ...options };
  const centre = { x: o.width / 2, y: o.height / 2 };
  // One group alone would fill one side; it splits over both, alternating so each side gets strong ties.
  const groups: TieGroup[] =
    input.length === 1 && input[0].ties.length > 3
      ? [
          { kind: input[0].kind, ties: input[0].ties.filter((_, index) => index % 2 === 0) },
          { kind: input[0].kind, ties: input[0].ties.filter((_, index) => index % 2 === 1) },
        ]
      : [...input];
  const usable = Math.max(0, o.height - o.pad * 2);
  const sides = assignSides(groups.map((group) => group.ties.length));

  // How many rows each side can hold after its headings; groups share what is left, strongest first.
  const shownPerGroup = groups.map((group) => group.ties.length);
  for (const side of [-1, 1] as const) {
    const indexes = groups.map((_, index) => index).filter((index) => sides[index] === side);
    const capacity = Math.max(indexes.length, Math.floor((usable - indexes.length * o.heading) / o.row));
    let total = indexes.reduce((sum, index) => sum + shownPerGroup[index], 0);
    while (total > capacity) {
      // Trim the longest group on this side, never below one row.
      let longest = -1;
      for (const index of indexes) if (shownPerGroup[index] > 1 && (longest < 0 || shownPerGroup[index] > shownPerGroup[longest])) longest = index;
      if (longest < 0) break;
      shownPerGroup[longest] -= 1;
      total -= 1;
    }
  }

  // The inner limit keeps the focus's name and title under its portrait clear.
  const floor = innerReach(o);
  const reachMax = Math.max(floor, o.width / 2 - o.pad - o.label - o.node / 2);
  const reachMin = Math.min(reachMax, floor + Math.max(0, (reachMax - floor) * 0.25));
  const maxWeight = Math.max(0.001, ...groups.flatMap((group) => group.ties.map((tie) => tie.link.weight)));

  const nodes: EgoNode[] = [];
  const headings: EgoHeading[] = [];
  for (const side of [-1, 1] as const) {
    const indexes = groups.map((_, index) => index).filter((index) => sides[index] === side);
    const height = indexes.reduce((sum, index) => sum + o.heading + shownPerGroup[index] * o.row, 0);
    let y = centre.y - height / 2;
    for (const index of indexes) {
      const group = groups[index];
      const shown = shownPerGroup[index];
      // Headings sit at the outer edge, clear of the lines, aligned outward.
      const edgeX = side === 1 ? o.width - o.pad : o.pad;
      headings.push({ kind: group.kind, side, x: edgeX, y: y + o.heading / 2, shown, hidden: group.ties.length - shown });
      y += o.heading;
      for (const tie of group.ties.slice(0, shown)) {
        const rowY = y + o.row / 2;
        const strength = Math.sqrt(tie.link.weight / maxWeight);
        // Strong ties come in toward the centre; rows far above or below bend in a little, like an arc.
        const bend = Math.min(1, Math.abs(rowY - centre.y) / Math.max(1, usable / 2));
        const reach = reachMax - (reachMax - reachMin) * strength - (reachMax - reachMin) * 0.35 * bend * bend;
        nodes.push({
          id: tie.other,
          kind: group.kind,
          side,
          x: Math.round((centre.x + side * Math.max(floor, reach)) * 10) / 10,
          y: Math.round(rowY * 10) / 10,
          level: strengthLevel(tie.link.weight),
        });
        y += o.row;
      }
    }
  }
  return { centre, nodes, headings };
}

/** A soft curve from the focus to a neighbour, leaving the focus horizontally. */
export function tiePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const r = (value: number) => Math.round(value * 10) / 10;
  return `M${r(from.x)} ${r(from.y)} C${r(from.x + dx * 0.5)} ${r(from.y)} ${r(from.x + dx * 0.5)} ${r(to.y)} ${r(to.x)} ${r(to.y)}`;
}

/** Line weight in px for a strength level. */
export function tieWidth(level: number): number {
  return 0.75 + level * 0.55;
}

export const ROLES = ["cabinet", "parliament", "other"] as const;
export type Role = (typeof ROLES)[number];

/** The role group of a person in the overview, from the title of their current position. */
export function roleOf(job: string | null): Role {
  if (!job) return "other";
  if (/^(minister|staatssecretaris)/i.test(job)) return "cabinet";
  if (/^(fractievoorzitter|lid vaste commissie|lid tweede kamer|lid eerste kamer|tweede kamerlid|eerste kamerlid|voorzitter van de (tweede|eerste) kamer)/i.test(job)) {
    return "parliament";
  }
  return "other";
}

export type RankedPerson = { id: string; strength: number; ties: number };
export type RoleGroup = { role: Role; people: RankedPerson[] };

/**
 * The overview: the people with the strongest ties, the top `perRole` of each
 * role. Only the people
 * the bundle scores ties for (`anchors`) take part, so nobody ranks low just
 * because their own ties were not computed.
 */
export function rankOverview(
  links: readonly PowerLink[],
  anchors: ReadonlySet<string>,
  jobOf: (id: string) => string | null,
  perRole = 8,
): RoleGroup[] {
  const totals = new Map<string, RankedPerson>();
  for (const link of links) {
    for (const end of [link.a, link.b]) {
      if (!end.startsWith("person:") || !anchors.has(end)) continue;
      const entry = totals.get(end) ?? { id: end, strength: 0, ties: 0 };
      entry.strength += link.weight;
      entry.ties += 1;
      totals.set(end, entry);
    }
  }
  const ranked = [...totals.values()]
    .map((entry) => ({ ...entry, strength: Math.round(entry.strength * 1000) / 1000 }))
    .sort((x, y) => y.strength - x.strength || y.ties - x.ties || (x.id < y.id ? -1 : 1));
  return ROLES.map((role) => ({ role, people: ranked.filter((entry) => roleOf(jobOf(entry.id)) === role).slice(0, perRole) })).filter(
    (group) => group.people.length > 0,
  );
}
