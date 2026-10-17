/** Viewport padding so a popover does not sit on the edge. */
export const ANCHOR_MARGIN = 8;
/** Gap between the trigger and the popover. */
export const ANCHOR_GAP = 8;

export type AnchorRect = { top: number; right: number; bottom: number; left: number; width: number; height: number };

export type AnchoredBox = {
  top: number;
  left: number;
  maxHeight: number;
  /** True when the box sits above the trigger. */
  flipped: boolean;
};

/**
 * Place a popover next to a trigger: below when it fits, otherwise above,
 * then shift horizontally so the box stays inside the viewport. Used by the
 * (i) notes so a parent with overflow-x-hidden cannot clip them.
 */
export function placeAnchored({
  anchor,
  width,
  height,
  viewportWidth,
  viewportHeight,
  gap = ANCHOR_GAP,
  margin = ANCHOR_MARGIN,
}: {
  anchor: AnchorRect;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  gap?: number;
  margin?: number;
}): AnchoredBox {
  const maxWidth = Math.max(0, viewportWidth - 2 * margin);
  const boxWidth = Math.min(width, maxWidth);
  const left = Math.min(Math.max(margin, anchor.left), Math.max(margin, viewportWidth - boxWidth - margin));

  const below = viewportHeight - anchor.bottom - gap - margin;
  const above = anchor.top - gap - margin;
  const flipped = below < height && above > below;
  const top = flipped ? Math.max(margin, anchor.top - gap - Math.min(height, above)) : anchor.bottom + gap;
  const room = flipped ? anchor.top - gap - margin : viewportHeight - top - margin;
  const maxHeight = Math.max(0, room);

  return { top, left, maxHeight, flipped };
}
