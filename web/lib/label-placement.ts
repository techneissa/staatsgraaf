/**
 * Label placement for the graph canvas: pure, deterministic, per frame.
 *
 * Every labelled mark offers four slots (right, left, above, below). Labels
 * are placed in priority order and a slot is taken only when it overlaps no
 * mark and no label placed before it. A label that fits nowhere is hidden
 * rather than drawn on top of another: a name that cannot be read is worth
 * less than the gap it would fill. Coordinates are screen coordinates, so the
 * caller decides how big a label is on the reader's screen and this module
 * never has to know about zoom.
 */

export type LabelItem = {
  id: string;
  /** Centre of the mark on screen. */
  x: number;
  y: number;
  /** Radius of the mark on screen; labels keep clear of it. */
  r: number;
  /** Size of the label's text box on screen. */
  width: number;
  height: number;
  /** Higher goes first; ties break on id so a frame is reproducible. */
  priority: number;
};

export type LabelSlot = {
  /** Anchor point of the text on screen. */
  x: number;
  y: number;
  anchor: "start" | "end" | "middle";
};

type Rect = { x0: number; y0: number; x1: number; y1: number };

function overlaps(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

/** Slots in preference order: reading to the right of the mark first. */
function candidates(item: LabelItem, gap: number): { slot: LabelSlot; rect: Rect }[] {
  const { x, y, r, width, height } = item;
  const half = height / 2;
  return [
    {
      slot: { x: x + r + gap, y, anchor: "start" },
      rect: { x0: x + r + gap, y0: y - half, x1: x + r + gap + width, y1: y + half },
    },
    {
      slot: { x: x - r - gap, y, anchor: "end" },
      rect: { x0: x - r - gap - width, y0: y - half, x1: x - r - gap, y1: y + half },
    },
    {
      slot: { x, y: y - r - gap - half, anchor: "middle" },
      rect: { x0: x - width / 2, y0: y - r - gap - height, x1: x + width / 2, y1: y - r - gap },
    },
    {
      slot: { x, y: y + r + gap + half, anchor: "middle" },
      rect: { x0: x - width / 2, y0: y + r + gap, x1: x + width / 2, y1: y + r + gap + height },
    },
  ];
}

/**
 * Place as many labels as fit. Returns a slot per placed id; an id that is
 * missing from the map did not fit and must not be drawn.
 */
export function placeLabels(items: readonly LabelItem[], gap = 3): Map<string, LabelSlot> {
  const ordered = [...items].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  // Every labelled mark is an obstacle from the start, so a label never sits
  // on a mark that has not been placed yet.
  const taken: Rect[] = ordered.map((item) => ({
    x0: item.x - item.r,
    y0: item.y - item.r,
    x1: item.x + item.r,
    y1: item.y + item.r,
  }));
  const placed = new Map<string, LabelSlot>();
  for (const item of ordered) {
    for (const candidate of candidates(item, gap)) {
      if (taken.some((rect) => overlaps(rect, candidate.rect))) continue;
      taken.push(candidate.rect);
      placed.set(item.id, candidate.slot);
      break;
    }
  }
  return placed;
}
