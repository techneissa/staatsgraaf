"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { PAGE_COLUMN, PAGE_ID, installNavHistory, lastNavKind, savedPosition, type ScrollPosition } from "@/lib/nav-history";

/**
 * Where a page opens. A fresh navigation lands at the top; back and forward
 * (and a reload) return to where that entry was left. The Next router would
 * otherwise scroll its first rendered node into view, and on a page whose first
 * node sits low (or in the persistent page column, which keeps the old scroll
 * offset) the new page opened hundreds of pixels down and shifted the layout.
 * Runs in a layout effect after the page has rendered, so the first painted
 * frame is already in place.
 */

/** How long a restore keeps trying while a page grows, the same on a 60 Hz and a 120 Hz screen. */
const RESTORE_MS = 700;

/** Room kept above the page when it is brought to the top of the screen. */
const PAGE_MARGIN_PX = 16;

function resetScroll() {
  // The page column on lg and up, and any clipped ancestor a scrollIntoView
  // may have moved; the window below lg.
  const column = document.getElementById(PAGE_COLUMN);
  for (let node: HTMLElement | null = column; node; node = node.parentElement) {
    if (node.scrollTop !== 0) node.scrollTop = 0;
  }
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  // Something picked on the canvas keeps its profile above the page across
  // navigation; the new page opens at its own top, under that profile.
  const page = document.getElementById(PAGE_ID);
  if (page === null || page.previousElementSibling === null) return;
  const scrolls = column !== null && getComputedStyle(column).overflowY === "auto";
  if (scrolls) {
    column.scrollTop = Math.max(0, page.getBoundingClientRect().top - column.getBoundingClientRect().top - PAGE_MARGIN_PX);
  } else {
    window.scrollTo({ top: Math.max(0, page.getBoundingClientRect().top + window.scrollY - PAGE_MARGIN_PX), left: 0, behavior: "instant" });
  }
}

function applyPosition(position: ScrollPosition) {
  const column = document.getElementById(PAGE_COLUMN);
  if (column && column.scrollTop !== position.col) column.scrollTop = position.col;
  if (Math.abs(window.scrollY - position.y) > 1) window.scrollTo({ top: position.y, left: 0, behavior: "instant" });
}

function reached(position: ScrollPosition): boolean {
  const column = document.getElementById(PAGE_COLUMN);
  return Math.abs(window.scrollY - position.y) <= 2 && Math.abs((column?.scrollTop ?? 0) - position.col) <= 2;
}

/**
 * Put the page back where it was. A page that grows after its first paint (a
 * list that fills in) may not reach the offset at once, so it is tried again
 * for 0.7 s, until the reader scrolls themselves.
 */
function restore(position: ScrollPosition | null): () => void {
  if (position === null || (position.y === 0 && position.col === 0)) {
    resetScroll();
    return () => {};
  }
  applyPosition(position);
  let stopped = false;
  const until = performance.now() + RESTORE_MS;
  const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
  const stop = () => {
    stopped = true;
    for (const name of events) window.removeEventListener(name, stop);
  };
  for (const name of events) window.addEventListener(name, stop, { passive: true, once: true });
  const tick = () => {
    if (stopped) return;
    if (performance.now() > until) return stop();
    if (!reached(position)) applyPosition(position);
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
  return stop;
}

export function NavScroll() {
  const pathname = usePathname();
  const first = useRef(true);

  useLayoutEffect(() => {
    installNavHistory();
    let stop = () => {};
    if (first.current) {
      first.current = false;
      const type = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type;
      // A reload or a return to this document: back to where it was.
      if ((type === "reload" || type === "back_forward") && window.location.hash === "") stop = restore(savedPosition());
      return stop;
    }
    // An address with a hash is the router's to scroll to its anchor.
    if (window.location.hash !== "") return;
    stop = restore(lastNavKind() === "pop" ? savedPosition() : null);
    return stop;
  }, [pathname]);

  return null;
}
