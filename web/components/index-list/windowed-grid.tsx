"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * A long grid list that mounts its items in chunks as they near the screen.
 *
 * One `ul` holds the whole list. A chunk that is not mounted yet is a single
 * `li` that spans the grid and has the height its rows will have, so the page
 * keeps its length, the scrollbar is honest and a jump to a later heading
 * lands in the right place. The height comes from the grid itself: the column
 * count read from the computed style and the average row height of the tiles
 * that are mounted. A chunk mounts when its placeholder comes within a screen
 * and a half and stays mounted. Which chunks were mounted is remembered per
 * list, so coming Back to the page rebuilds the same height and the browser's
 * scroll restoration lands where the reader left.
 */

const MOUNTED_MEMORY = new Map<string, Set<number>>();
const MARGIN = "1400px 0px";

/**
 * The element that scrolls the list: the nearest ancestor with a scrolling
 * overflow, or null when the page itself scrolls. An observer needs it as its
 * root, because a margin only widens the root: inside a scroll column the
 * column clips what the observer sees.
 */
function scrollParentOf(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") return node;
  }
  return null;
}

export type RowHeightHint = { rowHeight: number; onRowHeight: (height: number) => void };

export function WindowedGrid<Item>({
  items,
  memoryKey,
  chunk = 48,
  eager,
  hint,
  className,
  keyOf,
  render,
}: {
  items: Item[];
  /** Identifies the list and its filters, for the memory of mounted chunks. */
  memoryKey: string;
  chunk?: number;
  /** Mount the first chunk at once (the first group on the page). */
  eager: boolean;
  hint: RowHeightHint;
  className: string;
  keyOf: (item: Item) => string;
  render: (item: Item) => ReactNode;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const chunkCount = Math.ceil(items.length / chunk);
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([...(eager ? [0] : []), ...(MOUNTED_MEMORY.get(memoryKey) ?? [])]));
  const [geometry, setGeometry] = useState<{ cols: number; rowHeight: number | null; gap: number }>({ cols: 1, rowHeight: null, gap: 0 });
  const rowHeight = geometry.rowHeight ?? hint.rowHeight;
  const { onRowHeight } = hint;

  useEffect(() => {
    MOUNTED_MEMORY.set(memoryKey, mounted);
  }, [memoryKey, mounted]);

  // Columns, gap and the average row height of what is mounted.
  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const style = getComputedStyle(list);
    const cols = Math.max(1, style.gridTemplateColumns.split(" ").filter(Boolean).length);
    const gap = Number.parseFloat(style.rowGap) || 0;
    // The first run of mounted tiles, up to one chunk: a placeholder ends it.
    const tiles: HTMLElement[] = [];
    for (const child of list.children) {
      const placeholder = (child as HTMLElement).hasAttribute("data-chunk");
      if (placeholder && tiles.length > 0) break;
      if (!placeholder && tiles.length < chunk) tiles.push(child as HTMLElement);
    }
    let measured: number | null = null;
    if (tiles.length > 0) {
      const used = Math.min(tiles.length, chunk);
      const rows = Math.ceil(used / cols);
      const top = tiles[0].getBoundingClientRect().top;
      const bottom = tiles[used - 1].getBoundingClientRect().bottom;
      if (bottom > top) measured = (bottom - top + gap) / rows - gap;
    }
    setGeometry((current) =>
      current.cols === cols && Math.abs(current.gap - gap) < 0.5 && (measured === null || (current.rowHeight !== null && Math.abs(current.rowHeight - measured) < 1))
        ? current
        : { cols, gap, rowHeight: measured ?? current.rowHeight },
    );
    if (measured !== null) onRowHeight(measured);
  }, [chunk, onRowHeight]);

  useLayoutEffect(() => {
    measure();
  }, [measure, mounted, items]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    let width = list.clientWidth;
    const observer = new ResizeObserver(() => {
      if (Math.abs(list.clientWidth - width) < 1) return;
      width = list.clientWidth;
      measure();
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure]);

  // Mount a chunk when its placeholder comes near the screen.
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => setScrollRoot((current) => {
      const next = scrollParentOf(list);
      return next === current ? current : next;
    });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list || mounted.size >= chunkCount || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const add: number[] = [];
        for (const entry of entries) {
          if (entry.isIntersecting) add.push(Number((entry.target as HTMLElement).dataset.chunk));
        }
        if (add.length > 0) setMounted((current) => new Set([...current, ...add]));
      },
      { root: scrollRoot, rootMargin: MARGIN },
    );
    for (const placeholder of list.querySelectorAll("[data-chunk]")) observer.observe(placeholder);
    return () => observer.disconnect();
  }, [mounted, chunkCount, items, scrollRoot]);

  const children: ReactNode[] = [];
  for (let index = 0; index < chunkCount; index += 1) {
    const slice = items.slice(index * chunk, (index + 1) * chunk);
    if (mounted.has(index)) {
      for (const item of slice) children.push(<Fragment key={keyOf(item)}>{render(item)}</Fragment>);
      continue;
    }
    const rows = Math.ceil(slice.length / geometry.cols);
    children.push(
      <li
        key={`chunk-${index}`}
        aria-hidden="true"
        data-chunk={index}
        className="pointer-events-none col-[1/-1]"
        style={{ height: Math.max(0, rows * rowHeight + (rows - 1) * geometry.gap) }}
      />,
    );
  }

  return (
    <ul ref={listRef} role="list" className={className}>
      {children}
    </ul>
  );
}
