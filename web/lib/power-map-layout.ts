import type { PowerMapPerson } from "./graph";

/**
 * Radial tree layout for the power map (Machtskaart).
 *
 * The centre of the coordinate system is the power-map hub card. Rank 1 sits
 * centred on the vertical axis above the hub; the remaining people are placed
 * in horizontal, top-axis-symmetric rows below the hub, each row filled from
 * the axis outward (left, right, then further out, mirroring the CivLab
 * "double tree" ranking). Connecting links are slight quadratic bows from each
 * card to the hub.
 *
 * The layout is deterministic and guarantees that no two card boxes overlap:
 * within a row the slot pitch always exceeds the sum of the two neighbouring
 * half widths plus a slot gap, and rows are stacked with a vertical gap that
 * accounts for the tallest card in each row.
 */

export const POWER_HUB_RADIUS = 36;
export const POWER_HUB_CLEARANCE = 46;
export const POWER_ROW_GAP = 20;
export const POWER_SLOT_GAP = 30;
export const POWER_PORTRAIT_RADIUS = 30;
export const POWER_MIN_PORTRAIT_RADIUS = 19;
export const POWER_BOX_TOP_PAD = 3;
export const POWER_NAME_CHAR = 6.9;
export const POWER_META_CHAR = 5.7;
export const POWER_MAX_NAME_CHARS = 20;
export const POWER_MAX_META_CHARS = 24;
export const POWER_LINK_BOW = 0.14;

export type PowerMapCard = {
  person: PowerMapPerson;
  x: number;
  y: number;
  /** Portrait circle radius; larger for the top-ranked people. */
  radius: number;
  halfWidth: number;
  /** Offset from the card centre to the first text line. */
  labelTop: number;
  /** Offset from the card centre to the bottom of the text block. */
  labelBottom: number;
  /** Row below the hub, 0 is the single card above the hub. */
  row: number;
  /** Slot index in the row, axis-outward order. */
  slot: number;
};

export function truncateForPowerMap(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function powerMapMeta(person: PowerMapPerson): string {
  return truncateForPowerMap(
    [person.party, person.job].filter(Boolean).join(" · "),
    POWER_MAX_META_CHARS,
  );
}

export function powerMapCountLabel(total: number): string {
  return total === 1 ? "1 artikel" : `${total} artikelen`;
}

export function powerMapPortraitRadius(rank: number): number {
  if (rank === 1) return 30;
  if (rank === 2) return 27;
  if (rank === 3) return 25;
  return Math.max(
    POWER_MIN_PORTRAIT_RADIUS,
    22 - Math.floor(Math.max(0, rank - 4) / 4),
  );
}

type CardPlan = {
  radius: number;
  halfWidth: number;
  labelTop: number;
  labelBottom: number;
};

function planFor(person: PowerMapPerson): CardPlan {
  const radius = powerMapPortraitRadius(person.rank);
  const name = truncateForPowerMap(person.name, POWER_MAX_NAME_CHARS);
  const meta = powerMapMeta(person);
  const count = powerMapCountLabel(person.total);
  const halfWidth = Math.max(
    radius,
    (name.length * POWER_NAME_CHAR) / 2,
    (meta.length * POWER_META_CHAR) / 2,
    (count.length * POWER_META_CHAR) / 2,
  );
  const labelTop = radius + 13;
  const labelBottom = labelTop + 38;
  return { radius, halfWidth, labelTop, labelBottom };
}

/** Row capacities for the axis-symmetric tree below the hub. */
function rowCapacities(count: number): number[] {
  const capacities: number[] = [];
  let filled = 0;
  let index = 0;
  const base = [1, 2, 2];
  while (filled < count) {
    const capacity = index < base.length ? base[index] : 4 + 2 * Math.floor((index - base.length) / 2);
    capacities.push(capacity);
    filled += capacity;
    index += 1;
  }
  return capacities;
}

export function powerMapCardBox(card: PowerMapCard): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  return {
    left: card.x - card.halfWidth,
    right: card.x + card.halfWidth,
    top: card.y - card.radius - POWER_BOX_TOP_PAD,
    bottom: card.y + card.labelBottom,
  };
}

/** Slight bow toward the outside so links fan out to the hub like CivLab's. */
export function powerMapLinkPath(x: number, y: number): string {
  const length = Math.hypot(x, y);
  if (length < 0.001) return `M 0 0 L 0 0`;
  const midX = x / 2;
  const midY = y / 2;
  const normal = { x: y / length, y: -x / length };
  const side = x >= 0 ? 1 : -1;
  const controlX = midX + normal.x * side * length * POWER_LINK_BOW;
  const controlY = midY + normal.y * side * length * POWER_LINK_BOW;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return `M ${round(x)} ${round(y)} Q ${round(controlX)} ${round(controlY)} 0 0`;
}

function includesHub(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  centreTextWidth: number,
): void {
  bounds.minX = Math.min(bounds.minX, -centreTextWidth);
  bounds.maxX = Math.max(bounds.maxX, centreTextWidth);
  bounds.minY = Math.min(bounds.minY, -POWER_HUB_RADIUS);
  bounds.maxY = Math.max(bounds.maxY, POWER_HUB_RADIUS + POWER_HUB_CLEARANCE - 10);
}

export function layoutPowerMap(people: PowerMapPerson[]): {
  cards: PowerMapCard[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
} {
  const plans = people.map(planFor);

  const cards: PowerMapCard[] = [];
  let cursor = POWER_HUB_RADIUS + POWER_HUB_CLEARANCE;
  let start = 0;
  const capacities = rowCapacities(people.length);
  for (const [row, capacity] of capacities.entries()) {
    const members = plans.slice(start, start + capacity);
    if (members.length === 0) break;
    const maxRadius = Math.max(...members.map((plan) => plan.radius));
    const maxHalfWidth = Math.max(...members.map((plan) => plan.halfWidth));
    const pitch = maxHalfWidth * 2 + POWER_SLOT_GAP;

    let rowY: number;
    if (row === 0) {
      rowY = -(POWER_HUB_RADIUS + POWER_HUB_CLEARANCE + plans[0].labelBottom);
    } else {
      rowY = cursor + maxRadius + POWER_BOX_TOP_PAD;
      cursor = rowY + Math.max(...members.map((plan) => plan.labelBottom)) + POWER_ROW_GAP;
    }

    for (let slot = 0; slot < members.length; slot += 1) {
      const side = slot % 2 === 0 ? -1 : 1;
      const level = Math.floor(slot / 2) + 0.5;
      const x = members.length === 1 ? 0 : side * level * pitch;
      const plan = members[slot];
      cards.push({
        person: people[start + slot],
        x,
        y: rowY,
        radius: plan.radius,
        halfWidth: plan.halfWidth,
        labelTop: plan.labelTop,
        labelBottom: plan.labelBottom,
        row,
        slot,
      });
    }
    start += members.length;
  }

  let bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const card of cards) {
    const box = powerMapCardBox(card);
    bounds.minX = Math.min(bounds.minX, box.left);
    bounds.maxX = Math.max(bounds.maxX, box.right);
    bounds.minY = Math.min(bounds.minY, box.top);
    bounds.maxY = Math.max(bounds.maxY, box.bottom);
  }
  includesHub(bounds, 78);
  return { cards, bounds: { ...bounds } };
}
