/**
 * How an already-open peek reacts to the next pointer or click
 * (components/peek/peek-provider.tsx). Closing and opening again replays the
 * pop and the sheet slide; a replace keeps the chrome and only swaps content.
 */

/** A plain click on a peek link: the same link closes, another replaces. */
export function peekClickAction(
  currentAnchor: EventTarget | null | undefined,
  nextAnchor: EventTarget,
): "close" | "open" | "replace" {
  if (!currentAnchor) return "open";
  return currentAnchor === nextAnchor ? "close" : "replace";
}

type NodeBox = { contains(node: Node): boolean };

/**
 * An outside pointerdown closes unless it landed in the peek or on the open
 * link. A link on the page behind is outside: the peek dismisses and the
 * click is swallowed so the page does not navigate or open another peek.
 */
export function peekOutsidePointerCloses(
  target: EventTarget | null,
  panel: NodeBox | null | undefined,
  anchor: NodeBox | null | undefined,
): boolean {
  if (target == null) return false;
  const node = target as Node;
  return !(panel?.contains(node) || anchor?.contains(node));
}

/**
 * Eat the click that follows an outside pointerdown, so a link under the
 * finger does not navigate or open a peek after this one has started to close.
 * Listen on window in capture: that runs before Next.js's document click
 * listener, which would otherwise follow the link behind the overlay.
 */
export function swallowNextClick(
  root: EventTarget = typeof window !== "undefined" ? window : globalThis,
  later: (fn: () => void) => void = (fn) => window.setTimeout(fn, 500),
): () => void {
  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
  root.addEventListener("click", swallow, true);
  root.addEventListener("pointerup", swallow, true);
  const lift = () => {
    root.removeEventListener("click", swallow, true);
    root.removeEventListener("pointerup", swallow, true);
  };
  later(lift);
  return lift;
}
