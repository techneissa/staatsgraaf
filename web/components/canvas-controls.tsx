"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const segmentClass =
  "rounded-sm px-2.5 py-1 text-xs font-medium text-ink-muted transition-fast disabled:cursor-not-allowed disabled:opacity-60";

export function CanvasControls() {
  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label="Weergave van de grafiek"
        className="flex items-center rounded-sm border border-line bg-surface-inset p-0.5"
      >
        <button type="button" disabled aria-pressed="true" className={`${segmentClass} bg-surface text-ink`}>
          Grafiek
        </button>
        <button type="button" disabled aria-pressed="false" className={segmentClass}>
          Machtskaart
        </button>
      </div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          disabled
          aria-label="Legenda"
          title="Legenda is binnenkort beschikbaar"
          className="flex items-center gap-1 rounded-sm border border-line px-2.5 py-1 text-xs font-medium text-ink-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          Legenda
          <svg aria-hidden="true" viewBox="0 0 20 20" width="10" height="10">
            <path
              d="m5.5 7.5 4.5 4.5 4.5-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </DropdownMenu.Trigger>
      </DropdownMenu.Root>
    </div>
  );
}
