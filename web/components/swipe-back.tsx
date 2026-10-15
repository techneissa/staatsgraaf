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

/** How long the page waits, slid away, for the previous page before it comes back. */
const STALL_MS = 1500;

/** The ring around the arrow: radius and length of the stroke. */
const RING_R = 20;
const RING_LENGTH = 2 * Math.PI * RING_R;

/** The arrow sits this far in from the left edge once the swipe would go back. */
const ARROW_REST_X = 12;
const ARROW_SIZE = 48;

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_IN = "cubic-bezier(0.4, 0, 1, 1)";

type Gesture = {
  id: number;
  x0: number;
  y0: number;
  dx: number;
  lastX: number;
  lastT: number;
  velocity: number;
  engaged: boolean;
  armed: boolean;
  width: number;
  arrowY: number;
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

/** The page's own transform and opacity, put back to rest without a jump. */
function release(page: HTMLElement, keyframes: Keyframe[], duration: number, easing: string): Animation {
  const animation = page.animate(keyframes, { duration, easing, fill: "forwards" });
  page.style.transform = "";
  page.style.willChange = "";
  return animation;
}

/**
 * Swipe from left to right to go back, on touch screens. The page leans
 * after the finger and a ring at the left edge fills as the swipe goes on;
 * once it is full (the arrow turns solid) letting go goes back, before that
 * the page settles where it was. A quick flick goes back too, and pulling
 * back to the left before letting go cancels. Back goes where the back
 * button goes (components/use-go-back.ts).
 *
 * Smoothness: the finger only records where it is, one animation frame
 * draws, and only `transform` changes while dragging. On release the page
 * leaves and the previous one arrives through this component's own two
 * short animations; the page transition in globals.css stands aside for a
 * swipe (`data-nav="swipe"`), so the two never pull against each other.
 *
 * The page column hands only vertical panning to the browser
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
  const ring = useRef<SVGCircleElement>(null);
  const leaving = useRef<{ page: HTMLElement; exit: Animation | null } | null>(null);
  const pathname = usePathname();
  can.current = target !== null;
  back.current = goBack;

  // The previous page has rendered (into the same element when the route
  // stays within a section, else a new one): drop the exit and bring the
  // page in from the left. A layout effect, so the first painted frame of
  // the previous page is already the start of its entry.
  useLayoutEffect(() => {
    const left = leaving.current;
    if (left === null) return;
    leaving.current = null;
    left.exit?.cancel();
    left.page.style.opacity = "";
    const page = document.getElementById(PAGE_ID);
    if (page === null || reducedMotion()) return;
    page.animate(
      [
        { transform: "translate3d(-28px, 0, 0)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 280, easing: EASE_OUT },
    );
  }, [pathname]);

  useEffect(() => {
    const main = document.getElementById(MAIN_ID);
    const node = arrow.current;
    if (main === null || node === null) return;
    let g: Gesture | null = null;
    let frame = 0;

    const drawArrow = (progress: number, y: number, armed: boolean) => {
      const x = -ARROW_SIZE + progress * (ARROW_SIZE + ARROW_REST_X);
      node.style.transform = `translate3d(${x}px, ${y - ARROW_SIZE / 2}px, 0)`;
      node.style.opacity = String(Math.min(1, progress * 2.5));
      ring.current?.setAttribute("stroke-dashoffset", String(RING_LENGTH * (1 - progress)));
      if (armed) node.dataset.armed = "";
      else delete node.dataset.armed;
    };

    const draw = () => {
      frame = 0;
      if (g === null || !g.engaged) return;
      const progress = swipeProgress(g.dx, g.width);
      const armed = progress >= 1;
      if (armed && !g.armed) navigator.vibrate?.(10);
      g.armed = armed;
      if (g.page !== null) g.page.style.transform = `translate3d(${swipeOffset(g.dx, g.width)}px, 0, 0)`;
      drawArrow(progress, g.arrowY, armed);
    };

    const hideArrow = (committed: boolean) => {
      const from = node.style.transform;
      const y = /,\s*([-\d.]+)px,/.exec(from)?.[1] ?? "0";
      const keyframes: Keyframe[] = committed
        ? [
            { transform: from, opacity: 1 },
            { transform: `translate3d(${ARROW_REST_X}px, ${y}px, 0) scale(1.15)`, opacity: 0 },
          ]
        : [
            { transform: from, opacity: node.style.opacity || "0" },
            { transform: `translate3d(${-ARROW_SIZE}px, ${y}px, 0)`, opacity: 0 },
          ];
      node.animate(keyframes, { duration: committed ? 220 : 200, easing: EASE_OUT });
      node.style.opacity = "0";
      node.style.transform = `translate3d(${-ARROW_SIZE}px, ${y}px, 0)`;
      delete node.dataset.armed;
    };

    const onDown = (event: PointerEvent) => {
      g = null;
      if (event.pointerType !== "touch" || !event.isPrimary || !can.current || leaving.current !== null) return;
      if (event.clientX <= SWIPE_EDGE_PX) return;
      if (event.target instanceof Element && (event.target.closest(EXCLUDED) || inSideScroller(event.target, main))) return;
      if ((window.getSelection()?.toString() ?? "") !== "") return;
      const margin = ARROW_SIZE + 24;
      g = {
        id: event.pointerId,
        x0: event.clientX,
        y0: event.clientY,
        dx: 0,
        lastX: event.clientX,
        lastT: event.timeStamp,
        velocity: 0,
        engaged: false,
        armed: false,
        width: window.innerWidth,
        // The ring stays at the height the finger went down, inside the screen.
        arrowY: Math.min(Math.max(event.clientY, margin), window.innerHeight - margin),
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
        // Start from where the finger is now, so the page does not jump by the slop.
        g.x0 = event.clientX - 1;
        g.page = reducedMotion() ? null : document.getElementById(PAGE_ID);
        if (g.page !== null) {
          for (const animation of g.page.getAnimations()) animation.cancel();
          g.page.style.willChange = "transform";
        }
        for (const animation of node.getAnimations()) animation.cancel();
      }
      const dt = event.timeStamp - g.lastT;
      if (dt > 0) g.velocity = 0.7 * ((event.clientX - g.lastX) / dt) + 0.3 * g.velocity;
      g.lastX = event.clientX;
      g.lastT = event.timeStamp;
      g.dx = event.clientX - g.x0;
      if (frame === 0) frame = window.requestAnimationFrame(draw);
    };

    const onEnd = (event: PointerEvent) => {
      if (g === null || event.pointerId !== g.id) return;
      const gesture = g;
      g = null;
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      if (!gesture.engaged) return;
      // The finger lifted off whatever it started on; that is not a tap on it.
      const swallow = (click: MouseEvent) => {
        click.preventDefault();
        click.stopPropagation();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 400);

      // A finger resting before it lifts has no speed left.
      const velocity = event.timeStamp - gesture.lastT > 80 ? 0 : gesture.velocity;
      const dx = event.clientX - gesture.x0;
      const commit = event.type === "pointerup" && swipeCommits(dx, velocity, gesture.width);
      const page = gesture.page;
      const offset = page === null ? 0 : swipeOffset(gesture.dx, gesture.width);
      hideArrow(commit);

      if (!commit || !back.current("swipe")) {
        if (page !== null) {
          release(page, [{ transform: `translate3d(${offset}px, 0, 0)` }, { transform: "none" }], 260, EASE_OUT).finished.then(
            (done) => done.cancel(),
            () => {},
          );
        }
        return;
      }
      const exit =
        page === null
          ? null
          : release(
              page,
              [
                { transform: `translate3d(${offset}px, 0, 0)`, opacity: 1 },
                { transform: `translate3d(${offset + gesture.width * 0.2}px, 0, 0)`, opacity: 0 },
              ],
              170,
              EASE_IN,
            );
      leaving.current = { page: page ?? document.body, exit };
      // No new route after a while (the same page under another query
      // string): bring this one back.
      window.setTimeout(() => {
        const left = leaving.current;
        if (left === null || left.exit !== exit) return;
        leaving.current = null;
        exit?.cancel();
        page?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE_OUT });
      }, STALL_MS);
    };

    main.addEventListener("pointerdown", onDown, { passive: true });
    main.addEventListener("pointermove", onMove, { passive: true });
    main.addEventListener("pointerup", onEnd, { passive: true });
    main.addEventListener("pointercancel", onEnd, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      main.removeEventListener("pointerdown", onDown);
      main.removeEventListener("pointermove", onMove);
      main.removeEventListener("pointerup", onEnd);
      main.removeEventListener("pointercancel", onEnd);
    };
  }, []);

  return (
    <div ref={arrow} aria-hidden="true" className="sg-swipe-arrow">
      <svg viewBox="0 0 48 48" width={ARROW_SIZE} height={ARROW_SIZE} className="sg-swipe-ring">
        <circle cx="24" cy="24" r={RING_R} className="sg-swipe-track" />
        <circle
          ref={ring}
          cx="24"
          cy="24"
          r={RING_R}
          className="sg-swipe-progress"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH}
        />
      </svg>
      <svg viewBox="0 0 20 20" width="20" height="20" className="sg-swipe-chevron">
        <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
