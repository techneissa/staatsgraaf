import type { PowerMapPerson } from "./graph";

export const POWER_GOLDEN_ANGLE = 2.399963229728653;
export const POWER_PORTRAIT_RADIUS = 26;
export const POWER_LABEL_TOP = 40;
export const POWER_LABEL_BOTTOM = 74;
export const POWER_NAME_CHAR = 7;
export const POWER_META_CHAR = 5.8;
export const POWER_MAX_NAME_CHARS = 20;
export const POWER_MAX_META_CHARS = 24;

export type PowerMapCard = {
  person: PowerMapPerson;
  seedX: number;
  seedY: number;
  x: number;
  y: number;
  halfWidth: number;
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

function seedFor(index: number): { x: number; y: number } {
  if (index === 0) return { x: 0, y: 0 };
  const angle = index * POWER_GOLDEN_ANGLE;
  const radius = 40 + 26 * Math.sqrt(index);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

export function powerMapCountLabel(total: number): string {
  return total === 1 ? "1 artikel" : `${total} artikelen`;
}

function textHalfWidth(person: PowerMapPerson): number {
  const name = truncateForPowerMap(person.name, POWER_MAX_NAME_CHARS).length * POWER_NAME_CHAR;
  const meta = powerMapMeta(person).length * POWER_META_CHAR;
  const count = powerMapCountLabel(person.total).length * POWER_META_CHAR;
  return Math.max(POWER_PORTRAIT_RADIUS, name / 2, meta / 2, count / 2);
}

const CARD_HALF_HEIGHT =
  (POWER_LABEL_BOTTOM + POWER_PORTRAIT_RADIUS) / 2;
const CARD_CENTER_OFFSET =
  (POWER_LABEL_BOTTOM - POWER_PORTRAIT_RADIUS) / 2;

export function layoutPowerMap(people: PowerMapPerson[]): {
  cards: PowerMapCard[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
} {
  const cards: PowerMapCard[] = people.map((person, index) => {
    const seed = seedFor(index);
    return {
      person,
      seedX: seed.x,
      seedY: seed.y,
      x: seed.x,
      y: seed.y,
      halfWidth: textHalfWidth(person),
    };
  });

  const radii = cards.map((card) => Math.hypot(card.halfWidth, CARD_HALF_HEIGHT));

  const separate = () => {
    for (let i = 0; i < cards.length; i += 1) {
      for (let j = i + 1; j < cards.length; j += 1) {
        const a = cards[i];
        const b = cards[j];
        const ay = a.y + CARD_CENTER_OFFSET;
        const by = b.y + CARD_CENTER_OFFSET;
        let dx = b.x - a.x;
        let dy = by - ay;
        let distance = Math.hypot(dx, dy);
        const needed = radii[i] + radii[j] + 2;
        if (distance >= needed) continue;
        if (distance < 0.001) {
          const angle = i * POWER_GOLDEN_ANGLE + j;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }
        const push = (needed - distance) / distance;
        const shiftX = dx * push;
        const shiftY = dy * push;
        if (i === 0) {
          b.x += shiftX;
          b.y += shiftY;
        } else {
          a.x -= shiftX / 2;
          a.y -= shiftY / 2;
          b.x += shiftX / 2;
          b.y += shiftY / 2;
        }
      }
    }
  };

  for (let pass = 0; pass < 240; pass += 1) {
    separate();
    for (let index = 1; index < cards.length; index += 1) {
      const card = cards[index];
      card.x += (card.seedX - card.x) * 0.05;
      card.y += (card.seedY - card.y) * 0.05;
    }
  }
  for (let pass = 0; pass < 120; pass += 1) separate();

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const card of cards) {
    minX = Math.min(minX, card.x - card.halfWidth);
    maxX = Math.max(maxX, card.x + card.halfWidth);
    minY = Math.min(minY, card.y - POWER_PORTRAIT_RADIUS);
    maxY = Math.max(maxY, card.y + POWER_LABEL_BOTTOM);
  }

  return { cards, bounds: { minX, minY, maxX, maxY } };
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
    top: card.y - POWER_PORTRAIT_RADIUS,
    bottom: card.y + POWER_LABEL_BOTTOM,
  };
}
