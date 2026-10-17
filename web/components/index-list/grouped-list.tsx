"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { WindowedGrid } from "./windowed-grid";

const ROW_HEIGHT_MEMORY = new Map<string, number>();

export type ListGroup<Item> = {
  key: string;
  /** The id of the heading, the target of a jump link. */
  anchor: string;
  heading: ReactNode;
  items: Item[];
};

/**
 * Groups with a real heading each and a windowed grid under it
 * (windowed-grid.tsx). Only groups that have items are rendered, so a filter
 * leaves no empty heading behind. The first group mounts its first chunk at
 * once; every other chunk waits until it nears the screen.
 */
export function GroupedList<Item>({
  listId,
  signature,
  groups,
  defaultRowHeight,
  chunk,
  sectionClassName,
  headingClassName,
  gridClassName,
  keyOf,
  render,
}: {
  listId: string;
  /** The active filters, so each filter state remembers its own mounted chunks. */
  signature: string;
  groups: ListGroup<Item>[];
  defaultRowHeight: number;
  chunk?: number;
  sectionClassName: string;
  headingClassName: string;
  gridClassName: string;
  keyOf: (item: Item) => string;
  render: (item: Item) => ReactNode;
}) {
  const [rowHeight, setRowHeight] = useState(() => ROW_HEIGHT_MEMORY.get(listId) ?? defaultRowHeight);
  const onRowHeight = useCallback(
    (height: number) => {
      ROW_HEIGHT_MEMORY.set(listId, height);
      setRowHeight((current) => (Math.abs(current - height) < 1 ? current : height));
    },
    [listId],
  );
  const hint = useMemo(() => ({ rowHeight, onRowHeight }), [rowHeight, onRowHeight]);

  return (
    <div className="isolate [overflow-anchor:none]">
      {groups.map((group, index) => (
        <section key={group.key} data-group={group.key} aria-labelledby={group.anchor} className={sectionClassName}>
          <h2 id={group.anchor} className={headingClassName}>
            {group.heading}
          </h2>
          <WindowedGrid
            memoryKey={`${listId}|${signature}|${group.key}`}
            items={group.items}
            chunk={chunk}
            eager={index === 0}
            hint={hint}
            className={gridClassName}
            keyOf={keyOf}
            render={render}
          />
        </section>
      ))}
    </div>
  );
}
