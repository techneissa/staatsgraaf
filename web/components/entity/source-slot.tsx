import type { ReactNode } from "react";

/**
 * A fixed slot for a source icon beside a row. On a touch screen the slot is
 * 44 by 44 px and clips the icon's grown hit area, so the icon can never take
 * a tap meant for the name beside it. A mouse keeps the compact icon.
 */
export function SourceSlot({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center pointer-coarse:size-11 pointer-coarse:overflow-hidden">
      {children}
    </span>
  );
}
