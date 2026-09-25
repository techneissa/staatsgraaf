import type { PowerMapPerson } from "./graph";
import { positionEn } from "./name-gloss";

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
 * within a row the cards spread axis-outward with a slot gap between
 * neighbouring cards, sized by each card's own half width, and rows are
 * stacked with a vertical gap that accounts for the tallest card in each row.
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

export function powerMapMeta(
  person: PowerMapPerson,
  locale: "nl" | "en" = "nl",
): string {
  // In English, swap the Dutch position title for its established English
  // gloss when one exists; unknown titles keep the Dutch text (honest gap).
  // Titles are never truncated: the card boxes grow to fit the full text.
  const job =
    locale === "en" ? positionEn(person.job) ?? person.job : person.job;
  return [person.party, job].filter(Boolean).join(" · ");
}

export function powerMapCountLabel(total: number, locale: "nl" | "en"): string {
  if (total === 1) return locale === "en" ? "1 article" : "1 artikel";
  return locale === "en" ? `${total} articles` : `${total} artikelen`;
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

function planFor(person: PowerMapPerson, locale: "nl" | "en", thirdLine?: (person: PowerMapPerson) => string): CardPlan {
  const radius = powerMapPortraitRadius(person.rank);
  const name = person.name;
  const meta = powerMapMeta(person, locale);
  const count = thirdLine ? thirdLine(person) : powerMapCountLabel(person.total, locale);
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

export function layoutPowerMap(
  people: PowerMapPerson[],
  locale: "nl" | "en" = "nl",
  /** The card's third line when it is not the article count, so the card is wide enough for it. */
  thirdLine?: (person: PowerMapPerson) => string,
): {
  cards: PowerMapCard[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
} {
  const plans = people.map((person) => planFor(person, locale, thirdLine));

  const cards: PowerMapCard[] = [];
  let cursor = POWER_HUB_RADIUS + POWER_HUB_CLEARANCE;
  let start = 0;
  const capacities = rowCapacities(people.length);
  for (const [row, capacity] of capacities.entries()) {
    const members = plans.slice(start, start + capacity);
    if (members.length === 0) break;
    const maxRadius = Math.max(...members.map((plan) => plan.radius));

    let rowY: number;
    if (row === 0) {
      rowY = -(POWER_HUB_RADIUS + POWER_HUB_CLEARANCE + plans[0].labelBottom);
    } else {
      rowY = cursor + maxRadius + POWER_BOX_TOP_PAD;
      cursor = rowY + Math.max(...members.map((plan) => plan.labelBottom)) + POWER_ROW_GAP;
    }

    // Full titles change every card's width, so each side of the row places
    // its cards axis-outward with a slot gap between neighbours instead of a
    // fixed pitch sized by the widest card.
    const positions: number[] = new Array(members.length);
    if (members.length === 1) {
      positions[0] = 0;
    } else {
      for (const side of [-1, 1]) {
        for (let slot = side === -1 ? 0 : 1; slot < members.length; slot += 2) {
          const width = members[slot].halfWidth;
          positions[slot] =
            slot <= 1
              ? side * (width + POWER_SLOT_GAP / 2)
              : side * (Math.abs(positions[slot - 2]) + members[slot - 2].halfWidth + POWER_SLOT_GAP + width);
        }
      }
    }

    for (let slot = 0; slot < members.length; slot += 1) {
      cards.push({
        person: people[start + slot],
        x: members.length === 1 ? 0 : positions[slot],
        y: rowY,
        radius: members[slot].radius,
        halfWidth: members[slot].halfWidth,
        labelTop: members[slot].labelTop,
        labelBottom: members[slot].labelBottom,
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

export const NEWS_BUBBLE_RADIUS = 4.5;
export const NEWS_BUBBLES_PER_CARD = 6;
/** Gap between a portrait's edge and the centre of its news bubbles. */
export const NEWS_BUBBLE_OFFSET = 8;

export type BubbleAnchor = { id: string; x: number; y: number; radius: number };
export type PlacedBubble = { id: string; owner: string; x: number; y: number };

/**
 * News bubbles beside the cards they belong to. An item sits at the first card
 * on the map (in the order given, so the highest ranked) that it names; the
 * other people and bodies it names get their lines only when it is picked.
 * Bubbles run clockwise over a card's upper right shoulder, clear of the name
 * below it, at most `NEWS_BUBBLES_PER_CARD` per card in the order the items
 * come (newest first). Items that name no card on the map are left out.
 */
export function placeNewsBubbles(
  anchors: readonly BubbleAnchor[],
  items: readonly { id: string; people: readonly string[]; bodies: readonly string[] }[],
): PlacedBubble[] {
  const order = new Map(anchors.map((anchor, index) => [anchor.id, index]));
  const perOwner = new Map<string, number>();
  const placed: PlacedBubble[] = [];
  for (const item of items) {
    let owner: BubbleAnchor | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const id of [...item.people, ...item.bodies]) {
      const index = order.get(id);
      if (index !== undefined && index < best) {
        best = index;
        owner = anchors[index];
      }
    }
    if (!owner) continue;
    const k = perOwner.get(owner.id) ?? 0;
    if (k >= NEWS_BUBBLES_PER_CARD) continue;
    perOwner.set(owner.id, k + 1);
    const angle = -Math.PI / 2 + 0.55 + k * 0.36;
    const distance = owner.radius + NEWS_BUBBLE_OFFSET;
    const round = (value: number) => Math.round(value * 100) / 100;
    placed.push({
      id: item.id,
      owner: owner.id,
      x: round(owner.x + Math.cos(angle) * distance),
      y: round(owner.y + Math.sin(angle) * distance),
    });
  }
  return placed;
}
