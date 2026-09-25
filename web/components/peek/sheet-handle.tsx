"use client";

import type { KeyboardEvent } from "react";
import { useT } from "@/components/i18n/use-t";

/**
 * The grip at the top of a bottom sheet, as a real control: a full-width,
 * 44 px tall button. A click or Enter toggles between the peek and the
 * expanded height; the arrow keys step; dragging is handled by the drag zone
 * around it (use-bottom-sheet.ts).
 */
export function SheetHandle({
  expanded,
  onToggle,
  onKeyDown,
  controls,
}: {
  expanded: boolean;
  onToggle: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  controls?: string;
}) {
  const t = useT("common");
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={expanded ? t("sheetShrink") : t("sheetExpand")}
      onClick={onToggle}
      onKeyDown={onKeyDown}
      className="group -mb-3 flex h-11 w-full cursor-grab items-start justify-center pt-2 outline-none active:cursor-grabbing"
    >
      <span
        aria-hidden="true"
        className="h-1 w-10 rounded-pill bg-line-strong transition-fast group-hover:bg-ink-faint group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-focus"
      />
    </button>
  );
}
