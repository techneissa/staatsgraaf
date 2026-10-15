"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { SWIPE_EDGE_PX, swipeCommits, swipeIntent, swipeOffset, swipeProgress } from "@/lib/back-nav";
import { PAGE_ID } from "@/lib/nav-history";
import { useGoBack } from "./use-go-back";

/** The page column (app/layout.tsx); a swipe that starts anywhere in it goes back. */
const MAIN_ID = "inhoud";

/** Where a swipe never starts: fields, and anything that asks to keep its own gestures. */
const EXCLUDED = "input, textarea, select, [contenteditable], [data-no-swipe-back]";

/** How long the page waits, slid away, for the previous page before it slides back. */
const STALL_MS = 1200;

type Gesture = {
  id: number;
  x0: number;
  y0: number;
  lastX: number;
  lastT: number;
  velocity: number;
  engaged: boolean;
  armed: boolean;
  width: number;
  page: HTMLElement | null;
};

/** A row that scrolls sideways (the filter chips, the alphabet) keeps its own swipes. */
function inSideScroller(node: Element, stop: Element): boolean {
  for (let el: Element | null = node; el !== null && el !== stop; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
  }
  return false;
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function settle(page: HTMLElement | null) {
  if (page === null) return;
  page.style.transition = "transform var(--motion-base) var(--ease-out), opacity var(--motion-base) var(--ease-out)";
  page.style.transform = "";
  page.style.opacity = "";
  page.addEventListener("transitionend", () => (page.style.transition = ""), { once: true });
}

/**
 * Swipe from left to right to go back, on touch screens. The page follows
 * the finger with growing resistance and an arrow fills in at the left edge;
 * let go past the mark (or flick) and the previous page slides in, let go
 * before it and the page springs back. Back goes where the back button goes
 * (components/use-go-back.ts).
 *
 * The page column only allows vertical panning to the browser
 * (`touch-action: pan-y pinch-zoom` in globals.css), so a sideways move
 * reaches this listener instead of starting a scroll, and a vertical scroll
 * never waits on script. The first 16 px from the edge stay with the
 * browser's own back swipe on iOS and Android.
 */
export function SwipeBack() {
  const { target, goBack } = useGoBack();
  const can = useRef(false);
  const back = useRef(goBack);
  const arrow = useRef<HTMLDivElement>(null);
  const leaving = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  can.current = target !== null;
  back.current = goBack;

  // The page element stays when the route changes within a section, so put
  // it back in place as the previous page renders into it. A layout effect:
  // the transition has taken its picture of the old page by now and takes
  // the new one after this.
  useLayoutEffect(() => {
    const page = leaving.current;
    if (page === null) return;
    leaving.current = null;
    page.style.transition = "";
    page.style.transform = "";
    page.style.opacity = "";
  }, [pathname]);

  useEffect(() => {
    const main = document.getElementById(MAIN_ID);
    if (main === null) return;
    let g: Gesture | null = null;

    const showArrow = (y: number, progress: number, armed: boolean) => {
      const node = arrow.current;
      if (node === null) return;
      node.style.transform = `translate3d(${-48 + progress * 64}px, ${y - 20}px, 0) scale(${0.6 + progress * 0.4})`;
      node.style.opacity = String(Math.min(1, progress * 1.6));
      if (armed) node.dataset.armed = "";
      else delete node.dataset.armed;
    };
    const hideArrow = () => {
      const node = arrow.current;
      if (node === null) return;
      node.style.transition = "transform var(--motion-base) var(--ease-out), opacity var(--motion-base) var(--ease-out)";
      node.style.opacity = "0";
      node.style.transform = node.style.transform.replace(/translate3d\([^,]+,/, "translate3d(-48px,");
      delete node.dataset.armed;
      node.addEventListener("transitionend", () => (node.style.transition = ""), { once: true });
    };

    const onDown = (event: PointerEvent) => {
      g = null;
      if (event.pointerType !== "touch" || !event.isPrimary || !can.current) return;
      if (event.clientX <= SWIPE_EDGE_PX) return;
      if (event.target instanceof Element && (event.target.closest(EXCLUDED) || inSideScroller(event.target, main))) return;
      if ((window.getSelection()?.toString() ?? "") !== "") return;
      g = {
        id: event.pointerId,
        x0: event.clientX,
        y0: event.clientY,
        lastX: event.clientX,
        lastT: event.timeStamp,
        velocity: 0,
        engaged: false,
        armed: false,
        width: window.innerWidth,
        page: null,
      };
    };

    const onMove = (event: PointerEvent) => {
      if (g === null || event.pointerId !== g.id) return;
      const dx = event.clientX - g.x0;
      if (!g.engaged) {
        const intent = swipeIntent(dx, event.clientY - g.y0);
        if (intent === "abandon") g = null;
        if (intent !== "engage" || g === null) return;
        g.engaged = true;
        g.page = reducedMotion() ? null : document.getElementById(PAGE_ID);
        if (g.page !== null) g.page.style.transition = "none";
        if (arrow.current) arrow.current.style.transition = "none";
      }
      const dt = event.timeStamp - g.lastT;
      if (dt > 0) g.velocity = 0.6 * ((event.clientX - g.lastX) / dt) + 0.4 * g.velocity;
      g.lastX = event.clientX;
      g.lastT = event.timeStamp;
      const progress = swipeProgress(dx, g.width);
      const armed = progress >= 1;
      if (armed && !g.armed) navigator.vibrate?.(8);
      g.armed = armed;
      if (g.page !== null) {
        g.page.style.transform = `translate3d(${swipeOffset(dx, g.width)}px, 0, 0)`;
        g.page.style.opacity = String(1 - progress * 0.2);
      }
      showArrow(event.clientY, progress, armed);
    };

    const onEnd = (event: PointerEvent) => {
      if (g === null || event.pointerId !== g.id) return;
      const gesture = g;
      g = null;
      if (!gesture.engaged) return;
      // The finger lifted off whatever it started on; that is not a tap on it.
      const swallow = (click: MouseEvent) => {
        click.preventDefault();
        click.stopPropagation();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 400);

      const dx = event.clientX - gesture.x0;
      const commit = event.type === "pointerup" && swipeCommits(dx, gesture.velocity, gesture.width);
      hideArrow();
      if (!commit || !back.current("swipe")) {
        settle(gesture.page);
        return;
      }
      const page = gesture.page;
      if (page === null) return;
      page.style.transition = "transform var(--motion-fast) var(--ease-out), opacity var(--motion-fast) var(--ease-out)";
      page.style.transform = `translate3d(${gesture.width * 0.4}px, 0, 0)`;
      page.style.opacity = "0.6";
      leaving.current = page;
      // No new route after a while (the same page under another query
      // string): bring this one back.
      window.setTimeout(() => {
        if (leaving.current !== page) return;
        leaving.current = null;
        settle(page);
      }, STALL_MS);
    };

    main.addEventListener("pointerdown", onDown, { passive: true });
    main.addEventListener("pointermove", onMove, { passive: true });
    main.addEventListener("pointerup", onEnd, { passive: true });
    main.addEventListener("pointercancel", onEnd, { passive: true });
    return () => {
      main.removeEventListener("pointerdown", onDown);
      main.removeEventListener("pointermove", onMove);
      main.removeEventListener("pointerup", onEnd);
      main.removeEventListener("pointercancel", onEnd);
    };
  }, []);

  return (
    <div ref={arrow} aria-hidden="true" className="sg-swipe-arrow">
      <svg viewBox="0 0 20 20" width="20" height="20">
        <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
