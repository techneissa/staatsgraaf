"use client";

import { useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

export type IndicatorVariant = "fill" | "underline" | "ring";

const ACTIVE = ':scope > [data-state="active"], :scope > [aria-pressed="true"], :scope > [aria-current="page"]';

type Box = { x: number; y: number; w: number; h: number };

/**
 * The active mark of a tab bar, segmented control or filter row, drawn once
 * and moved rather than redrawn on each item, so a switch shows where the
 * selection went.
 *
 * Render it as the first child of the list. It finds the active item itself
 * (Radix `data-state="active"`, `aria-pressed="true"` or
 * `aria-current="page"`), so the list needs no extra state. Until it has
 * measured, the items keep their own active styling; once it has, the list
 * gets `data-indicator` and globals.css hands the fill, underline or ring to
 * the indicator. The move is a FLIP on transform only: the indicator takes the
 * new box at once and is scaled back from the old one.
 *
 * - `fill`: a background behind the active item (segmented controls).
 * - `underline`: a 2 px bar along the bottom edge (entity tabs).
 * - `ring`: an outline that glides over separate pills whose own fill fades.
 */
export function SlidingIndicator({
  variant = "fill",
  className = "",
}: {
  variant?: IndicatorVariant;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    const list = element?.parentElement;
    if (!element || !list) return;
    let previous: Box | null = null;

    const measure = (animate: boolean) => {
      const active = list.querySelector<HTMLElement>(ACTIVE);
      if (!active || active === element || active.offsetWidth === 0) {
        element.style.opacity = "0";
        previous = null;
        return;
      }
      const box: Box = {
        x: active.offsetLeft,
        y: active.offsetTop,
        w: active.offsetWidth,
        h: active.offsetHeight,
      };
      if (variant === "underline") {
        box.y = box.y + box.h - 2;
        box.h = 2;
      }
      const moved =
        previous !== null &&
        (previous.x !== box.x || previous.y !== box.y || previous.w !== box.w || previous.h !== box.h);
      const target = `translate(${box.x}px, ${box.y}px)`;
      element.style.width = `${box.w}px`;
      element.style.height = `${box.h}px`;
      element.style.opacity = "1";
      if (moved && animate && previous && !prefersReducedMotion()) {
        // FLIP: start where the old item was, then let the transition carry it home.
        element.style.transition = "none";
        element.style.transform = `translate(${previous.x}px, ${previous.y}px) scale(${previous.w / box.w}, ${previous.h / box.h})`;
        void element.offsetWidth;
        element.style.transition = "";
        element.style.transform = target;
      } else {
        // A first placement or a resize: jump, without a transition.
        element.style.transition = "none";
        element.style.transform = target;
        void element.offsetWidth;
        element.style.transition = "";
      }
      previous = box;
    };

    // The list becomes the positioning context first, so offsets are relative to it.
    list.setAttribute("data-indicator", variant);
    measure(false);

    const mutations = new MutationObserver(() => measure(true));
    mutations.observe(list, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-pressed", "aria-current"],
    });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => measure(false));
    resize?.observe(list);

    return () => {
      mutations.disconnect();
      resize?.disconnect();
      list.removeAttribute("data-indicator");
    };
  }, [variant]);

  return <span ref={ref} aria-hidden="true" className={`sg-indicator ${className}`.trim()} />;
}
