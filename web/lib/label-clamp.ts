/**
 * Keeps a placed label inside the part of the drawing the reader can see, so a
 * name next to a mark at the edge of the canvas is shifted along instead of
 * being cut off. Pure; coordinates are the label placement's own.
 */
import type { LabelSlot } from "./label-placement";

export type Bounds = { x0: number; y0: number; x1: number; y1: number };

/** Left edge of the text for an anchor. */
function leftEdge(x: number, anchor: LabelSlot["anchor"], width: number): number {
  return anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
}

export function clampLabelToBounds(slot: LabelSlot, width: number, height: number, bounds: Bounds, pad = 3): LabelSlot {
  const minLeft = bounds.x0 + pad;
  const maxLeft = bounds.x1 - pad - width;
  let left = leftEdge(slot.x, slot.anchor, width);
  // A label wider than the view starts at the left edge; the rest is the view's loss.
  left = maxLeft < minLeft ? minLeft : Math.min(Math.max(left, minLeft), maxLeft);
  const x = slot.anchor === "start" ? left : slot.anchor === "end" ? left + width : left + width / 2;
  const half = height / 2;
  const minY = bounds.y0 + pad + half;
  const maxY = bounds.y1 - pad - half;
  const y = maxY < minY ? minY : Math.min(Math.max(slot.y, minY), maxY);
  return { x, y, anchor: slot.anchor };
}
