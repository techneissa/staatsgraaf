/**
 * Which mark an arrow key moves to: the nearest one in that direction on the
 * reader's screen, not the next one in a list. Pure, in the layout's own
 * coordinates; `rotation` is the canvas's current turn in radians, so "right"
 * stays right after the map has been turned.
 */

export type Arrow = "left" | "right" | "up" | "down";

export type Point = { x: number; y: number };
export type Placed = Point & { id: string };

const UNIT: Record<Arrow, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

/** Sideways offset counts this much more than distance straight ahead: an arrow prefers the mark in line with it. */
const LATERAL_WEIGHT = 2;

export function nearestInDirection(
  from: Point,
  candidates: readonly Placed[],
  arrow: Arrow,
  rotation = 0,
  excludeId: string | null = null,
): string | null {
  // First the marks inside a 45 degree cone of the arrow; only when there are
  // none, the whole half plane, so no mark is out of reach of the arrows.
  return pick(from, candidates, arrow, rotation, excludeId, 1) ?? pick(from, candidates, arrow, rotation, excludeId, Number.POSITIVE_INFINITY);
}

function pick(
  from: Point,
  candidates: readonly Placed[],
  arrow: Arrow,
  rotation: number,
  excludeId: string | null,
  cone: number,
): string | null {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const direction = UNIT[arrow];
  let best: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    if (candidate.id === excludeId) continue;
    const dx = candidate.x - from.x;
    const dy = candidate.y - from.y;
    // The offset as the reader sees it, after the canvas's turn.
    const sx = cos * dx - sin * dy;
    const sy = sin * dx + cos * dy;
    const ahead = sx * direction.x + sy * direction.y;
    if (ahead <= 1e-9) continue;
    const aside = Math.abs(sx * direction.y - sy * direction.x);
    if (aside >= ahead * cone) continue;
    const score = ahead * ahead + LATERAL_WEIGHT * aside * aside;
    if (score < bestScore || (score === bestScore && best !== null && candidate.id < best)) {
      bestScore = score;
      best = candidate.id;
    }
  }
  return best;
}

/** The arrow keys' names for the event's `key`, or null for any other key. */
export function arrowOf(key: string): Arrow | null {
  switch (key) {
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    default:
      return null;
  }
}
