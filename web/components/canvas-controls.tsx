"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ORG_BRANCH_LABELS } from "@/lib/labels";
import type { OrgBranch } from "@/lib/types";

const segmentClass =
  "rounded-sm px-2.5 py-1 text-xs font-medium text-ink-muted transition-fast";
const segmentActive = "bg-surface text-ink shadow-sm";

export type CanvasView = "graph" | "power";

type CanvasControlsProps = {
  view: CanvasView;
  onViewChange: (view: CanvasView) => void;
  branches: { branch: OrgBranch; count: number }[];
  hiddenBranches: ReadonlySet<string>;
  onToggleBranch: (branch: OrgBranch, visible: boolean) => void;
  onShowAll: () => void;
};

export function CanvasControls({
  view,
  onViewChange,
  branches,
  hiddenBranches,
  onToggleBranch,
  onShowAll,
}: CanvasControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label="Weergave van de grafiek"
        className="flex items-center rounded-sm border border-line bg-surface-inset p-0.5"
      >
        <button
          type="button"
          aria-pressed={view === "graph"}
          onClick={() => onViewChange("graph")}
          className={`${segmentClass} ${view === "graph" ? segmentActive : "hover:text-ink"}`}
        >
          Grafiek
        </button>
        <button
          type="button"
          aria-pressed={view === "power"}
          onClick={() => onViewChange("power")}
          className={`${segmentClass} ${view === "power" ? segmentActive : "hover:text-ink"}`}
        >
          Machtskaart
        </button>
      </div>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          disabled={view !== "graph"}
          aria-label="Legenda en filters"
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
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 max-h-80 w-64 overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-xl"
          >
            <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Bestuurslagen
            </DropdownMenu.Label>
            {branches.map(({ branch, count }) => (
              <DropdownMenu.CheckboxItem
                key={branch}
                checked={!hiddenBranches.has(branch)}
                onCheckedChange={(checked) => onToggleBranch(branch, checked === true)}
                onSelect={(event) => event.preventDefault()}
                className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-xs text-ink-muted outline-none data-[highlighted]:bg-surface-raised data-[highlighted]:text-ink"
              >
                <span>{ORG_BRANCH_LABELS[branch]}</span>
                <span className="text-ink-faint">{count}</span>
              </DropdownMenu.CheckboxItem>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item
              onSelect={onShowAll}
              className="cursor-pointer rounded-sm px-2 py-1.5 text-xs text-ink-muted outline-none data-[highlighted]:bg-surface-raised data-[highlighted]:text-ink"
            >
              Alle lagen tonen
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
