"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, RefObject } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * A draggable bottom sheet with two resting heights and a dismiss.
 *
 * The sheet is a column: a chrome part (handle, header) that never scrolls,
 * then `scroller`, whose child `inner` holds the content. Heights are
 * measured, never guessed: `detents` turns the chrome height, the natural
 * height of the whole sheet and the viewport height into the "peek" and
 * "expanded" heights in px.
 *
 * A drag starts on the element that gets `dragProps` (the handle and the
 * header, `touch-action: none`), so the content keeps native scrolling. On
 * release the sheet snaps to the detent nearest to where the fling would
 * carry it; a fling or drag well below the peek height dismisses. Under
 * reduced motion the snap has no transition. The handle is a button: a click
 * or Enter toggles, the arrow keys step between detents.
 */

export type Detent = "peek" | "expanded";
export type SheetMetrics = { chrome: number; natural: number; viewport: number };
export type SheetHeights = { peek: number; expanded: number };

/** Below this travel a press on the handle is a click, not a drag. */
const DRAG_SLOP = 5;
/** How far ahead (ms) a fling is projected before picking a detent. */
const FLING_MS = 180;
/** Two detents closer than this are one height: the handle goes. */
const MIN_TRAVEL = 32;

type Drag = {
  pointer: number;
  startY: number;
  startHeight: number;
  heights: SheetHeights;
  engaged: boolean;
  lastY: number;
  lastT: number;
  velocity: number;
};

export function useBottomSheet({
  panelRef,
  scrollerRef,
  innerRef,
  detents,
  onDismiss,
}: {
  panelRef: RefObject<HTMLElement | null>;
  scrollerRef: RefObject<HTMLElement | null>;
  innerRef: RefObject<HTMLElement | null>;
  detents: (metrics: SheetMetrics) => SheetHeights;
  /** Called when a drag carries the sheet down past the peek height. */
  onDismiss: () => void;
}) {
  const [detent, setDetent] = useState<Detent>("peek");
  const [heights, setHeights] = useState<SheetHeights | null>(null);
  /** The live height while a finger or pointer holds the sheet. */
  const [live, setLive] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  /** False until the first measured height has painted: the first placement never animates. */
  const [settled, setSettled] = useState(false);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const detentsRef = useRef(detents);
  detentsRef.current = detents;

  const measure = useCallback((): SheetHeights | null => {
    const panel = panelRef.current;
    const scroller = scrollerRef.current;
    const inner = innerRef.current;
    if (!panel || !scroller || !inner) return null;
    // The chrome is everything but the scroller: summed, not subtracted, so
    // a sheet clipped to its header still measures true.
    const box = getComputedStyle(panel);
    let chrome =
      parseFloat(box.paddingTop) + parseFloat(box.paddingBottom) + parseFloat(box.borderTopWidth) + parseFloat(box.borderBottomWidth);
    for (const child of panel.children) {
      if (child === scroller || !(child instanceof HTMLElement)) continue;
      const own = getComputedStyle(child);
      chrome += child.offsetHeight + parseFloat(own.marginTop) + parseFloat(own.marginBottom);
    }
    const style = getComputedStyle(scroller);
    const padding =
      parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const natural = chrome + inner.offsetHeight + padding;
    const next = detentsRef.current({ chrome, natural, viewport: window.innerHeight });
    return { peek: Math.round(next.peek), expanded: Math.round(Math.max(next.peek, next.expanded)) };
  }, [panelRef, scrollerRef, innerRef]);

  useLayoutEffect(() => {
    const update = () => {
      if (drag.current?.engaged) return;
      const next = measure();
      if (next) setHeights((prev) => (prev && prev.peek === next.peek && prev.expanded === next.expanded ? prev : next));
    };
    update();
    const observer = new ResizeObserver(update);
    if (innerRef.current) observer.observe(innerRef.current);
    for (const child of panelRef.current?.children ?? []) {
      if (child !== scrollerRef.current) observer.observe(child);
    }
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [measure, innerRef, panelRef, scrollerRef]);

  useEffect(() => {
    if (heights === null || settled) return;
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, [heights, settled]);

  const canExpand = heights !== null && heights.expanded - heights.peek >= MIN_TRAVEL;

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !heights) return;
    const panel = panelRef.current;
    if (!panel) return;
    drag.current = {
      pointer: event.pointerId,
      startY: event.clientY,
      startHeight: panel.offsetHeight,
      heights,
      engaged: false,
      lastY: event.clientY,
      lastT: event.timeStamp,
      velocity: 0,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    const dy = event.clientY - state.startY;
    if (!state.engaged) {
      if (Math.abs(dy) < DRAG_SLOP) return;
      state.engaged = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const dt = event.timeStamp - state.lastT;
    if (dt > 0) {
      // Smoothed: a single late event does not decide the fling.
      const instant = (event.clientY - state.lastY) / dt;
      state.velocity = state.velocity * 0.3 + instant * 0.7;
    }
    state.lastY = event.clientY;
    state.lastT = event.timeStamp;
    setLive(state.startHeight - dy);
  };

  const end = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    drag.current = null;
    if (!state.engaged) return;
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
    const height = state.startHeight - (event.clientY - state.startY);
    // A pause before release is no fling.
    const velocity = event.timeStamp - state.lastT > 80 ? 0 : state.velocity;
    const projected = height - velocity * FLING_MS;
    const { peek, expanded } = state.heights;
    if (event.type !== "pointercancel" && projected < peek * 0.55) {
      setDismissed(true);
      setLive(Math.min(height, peek));
      onDismiss();
      return;
    }
    setLive(null);
    if (expanded - peek < MIN_TRAVEL) setDetent("peek");
    else setDetent(projected > (peek + expanded) / 2 ? "expanded" : "peek");
  };

  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const toggle = () => setDetent((value) => (value === "expanded" || !canExpand ? "peek" : "expanded"));

  const onHandleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowUp" && canExpand) {
      event.preventDefault();
      setDetent("expanded");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setDetent("peek");
    }
  };

  let style: CSSProperties = {};
  if (heights) {
    const { peek, expanded } = heights;
    if (live !== null) {
      if (live >= peek) {
        // Past the tallest detent the sheet resists: a fifth of the travel.
        const height = live > expanded ? expanded + (live - expanded) * 0.2 : live;
        style = { height, transform: "translateY(0)" };
      } else {
        style = { height: peek, transform: `translateY(${Math.max(0, peek - live)}px)` };
      }
    } else {
      style = { height: detent === "expanded" && canExpand ? expanded : peek, transform: "translateY(0)" };
    }
    if (settled && live === null && !dismissed && !prefersReducedMotion()) {
      style.transition = "height 320ms var(--ease-out), transform 320ms var(--ease-out)";
    }
  }

  return {
    detent: canExpand ? detent : ("peek" as Detent),
    canExpand,
    dragging: live !== null && !dismissed,
    style,
    toggle,
    dragProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onClickCapture,
      style: { touchAction: "none" } as CSSProperties,
    },
    onHandleKeyDown,
  };
}
