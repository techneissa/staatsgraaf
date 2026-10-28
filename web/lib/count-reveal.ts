/**
 * When a count or a card on the Dataset page counts up or rises in. Anything
 * with a pixel on screen is revealed: a root margin that shrank the viewport
 * left cards in its bottom band visible but stuck at 0 (techneissa, 2026-10-28).
 */
export const REVEAL_ROOT_MARGIN = "0px";

/** True when a box with these viewport offsets has a pixel on screen. */
export function isOnScreen(top: number, bottom: number, viewportHeight: number): boolean {
  return top < viewportHeight && bottom > 0;
}
