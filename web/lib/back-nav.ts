/**
 * Going back, by the back button or by a swipe from left to right. Pure
 * functions only, so the rules are tested without a browser; the gesture
 * itself lives in components/swipe-back.tsx and the history store in
 * lib/nav-history.ts.
 *
 * Back means the previous page of this visit. A reader who arrived on a deep
 * page from outside the site has no previous page, so back goes one level up
 * instead (a person page to the people index, an index to the home page).
 */

/** The page one level up, or null on the home page. Every section index exists as a route. */
export function parentPath(pathname: string | null): string | null {
  if (pathname === null) return null;
  const parts = pathname.split("/").filter((part) => part !== "");
  if (parts.length === 0) return null;
  return parts.length === 1 ? "/" : `/${parts.slice(0, -1).join("/")}/`;
}

/** A touch that starts this close to the left edge belongs to the browser's own back swipe. */
export const SWIPE_EDGE_PX = 16;

/** Movement under this many pixels does not show a direction yet. */
const SWIPE_SLOP_PX = 10;

export type SwipeIntent = "pending" | "engage" | "abandon";

/**
 * What a finger that has moved (dx, dy) from where it went down is doing. A
 * move to the right that is clearly more sideways than up or down is a swipe
 * back; anything else is a scroll or a tap and is left alone.
 */
export function swipeIntent(dx: number, dy: number): SwipeIntent {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < SWIPE_SLOP_PX && ay < SWIPE_SLOP_PX) return "pending";
  if (dx > 0 && ax > ay * 1.5) return "engage";
  return "abandon";
}

/** How far the finger must travel to go back on release: a quarter of the screen, kept between 72 and 140 px. */
export function swipeThreshold(width: number): number {
  return Math.min(140, Math.max(72, width * 0.25));
}

/** 0 at the start of the swipe, 1 once release would go back. */
export function swipeProgress(dx: number, width: number): number {
  return Math.min(1, Math.max(0, dx / swipeThreshold(width)));
}

/** A quick flick goes back too, even when it did not travel the full distance. */
const FLICK_PX_PER_MS = 0.45;
const FLICK_MIN_PX = 32;

export function swipeCommits(dx: number, velocity: number, width: number): boolean {
  return dx >= swipeThreshold(width) || (velocity >= FLICK_PX_PER_MS && dx >= FLICK_MIN_PX);
}

/**
 * How far the page follows the finger: one to one at first, then with more
 * resistance, so it never leaves the screen during the drag.
 */
export function swipeOffset(dx: number, width: number): number {
  if (dx <= 0) return 0;
  const limit = width * 0.4;
  return limit * (1 - Math.exp(-dx / limit));
}
