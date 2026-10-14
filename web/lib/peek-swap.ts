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
type ClosestBox = {
  closest?: (selector: string) => unknown;
  parentElement?: ClosestBox | null;
};

/**
 * An outside pointerdown closes unless it landed in the peek, on the open
 * link, or on another peek link. That last case is a replace, handled by the
 * click, so closing here would play the exit and the enter back to back.
 */
export function peekOutsidePointerCloses(
  target: EventTarget | null,
  panel: NodeBox | null | undefined,
  anchor: NodeBox | null | undefined,
): boolean {
  if (target == null) return false;
  const node = target as Node;
  if (panel?.contains(node) || anchor?.contains(node)) return false;
  return !isInsidePeekLink(target);
}

function isInsidePeekLink(target: EventTarget): boolean {
  let node: ClosestBox | null | undefined = target as ClosestBox;
  while (node) {
    if (typeof node.closest === "function") return node.closest("a[data-peek]") != null;
    node = node.parentElement;
  }
  return false;
}
