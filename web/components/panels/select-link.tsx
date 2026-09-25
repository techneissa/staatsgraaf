"use client";

import type { MouseEvent, ReactNode } from "react";
import { useSelection } from "@/components/selection/selection-provider";
import type { Selection, SelectionSurface } from "@/lib/selection";

/**
 * The pick an entity id stands for, or null for an id the selection cannot
 * hold (a position). Organisations and people keep the surface the reader is
 * on; news items and topics live on the power map.
 */
export function selectionFor(id: string, surface: SelectionSurface): Selection | null {
  if (id.startsWith("org:")) return { kind: "org", id, surface };
  if (id.startsWith("person:")) return { kind: "person", id, surface };
  if (id.startsWith("news:")) return { kind: "news", id, surface: "power" };
  if (id.startsWith("topic:")) return { kind: "topic", id, surface: "power" };
  return null;
}

/**
 * A link in a panel. A plain click picks the thing in place, so the canvas
 * and both panels follow; a click with a modifier key, a middle click, or no
 * JavaScript follows the href to the full page like any link.
 */
export function SelectLink({
  selection,
  href,
  children,
  className = "",
  title,
  ariaLabel,
}: {
  selection: Selection | null;
  /** The full page; without one the pick is a button (a group of dots or a sector has no page). */
  href?: string;
  children: ReactNode;
  className?: string;
  title?: string;
  ariaLabel?: string;
}) {
  const { select } = useSelection();
  if (href === undefined) {
    return (
      <button
        type="button"
        onClick={() => selection && select(selection)}
        className={`text-start ${className}`.trim()}
        title={title}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    );
  }
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (selection === null) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    select(selection);
  };
  return (
    <a href={href} onClick={onClick} className={className} title={title} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
