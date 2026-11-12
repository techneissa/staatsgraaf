"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * The list of the people strip. It tells each bubble which half of the strip it
 * sits in (`data-side`), measured, because the strip wraps: a bubble that is
 * late in the list can still start a new line at the left edge, and its
 * callout must open to the right there, whatever its index.
 */
export function PeopleStripList({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const mark = () => {
      const box = list.getBoundingClientRect();
      const middle = box.left + box.width / 2;
      for (const item of list.children) {
        const rect = item.getBoundingClientRect();
        item.setAttribute("data-side", rect.left + rect.width / 2 > middle ? "right" : "left");
      }
    };
    mark();
    const observer = new ResizeObserver(mark);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);
  return (
    <ul ref={ref} className="flex flex-wrap items-center">
      {children}
    </ul>
  );
}
