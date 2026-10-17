"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, ChevronDown, ChevronUp, ChevronsUpDown, Landmark, Users } from "lucide";
import type { IconNode } from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { useT } from "@/components/i18n/use-t";
import { branchColorVar } from "@/lib/branch-colors";
import type { PositionRow, PositionSortDir, PositionSortKey } from "@/lib/index-lists";
import type { OrgType } from "@/lib/types";
import { IconTile } from "./org-visual";
import { WindowedGrid, type RowHeightHint } from "./windowed-grid";

const LIST_ID = "posities-lijst";
const HEADER_COLS = "grid-cols-[minmax(0,1.8fr)_minmax(0,0.95fr)_minmax(0,0.75fr)]";
const ROW_COLS = "grid-cols-1 @min-[24rem]:grid-cols-[minmax(0,1.8fr)_minmax(0,0.95fr)_minmax(0,0.75fr)]";
const ROW_HEIGHT_MEMORY = new Map<string, number>();

const TYPE_ICON: Record<OrgType, IconNode> = {
  elected: Landmark,
  dept_head: BriefcaseBusiness,
  commission: Users,
  department: BriefcaseBusiness,
  advisory: Users,
  constituency: Landmark,
};

const COLUMNS: { key: PositionSortKey; label: "idxColPosition" | "idxColBody" | "idxColHolder" }[] = [
  { key: "title", label: "idxColPosition" },
  { key: "org", label: "idxColBody" },
  { key: "holder", label: "idxColHolder" },
];

const SORT_BTN =
  "inline-flex min-h-11 min-w-0 items-center gap-1 text-start text-xs font-medium text-ink-muted transition-fast hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function SortMark({ active, dir }: { active: boolean; dir: PositionSortDir }) {
  const icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
  return <LucideIcon icon={icon} size={12} strokeWidth={2.2} className={active ? "text-ink" : "text-ink-faint"} />;
}

/**
 * Column headers of the positions table: one button per column, the active
 * one named with its direction. Lives in the sticky filter bar so it stays
 * on screen while the rows scroll.
 */
export function PositionSortHeader({
  sort,
  dir,
  onSort,
}: {
  sort: PositionSortKey;
  dir: PositionSortDir;
  onSort: (key: PositionSortKey) => void;
}) {
  const t = useT("entity");
  return (
    <div className={`mt-2 grid ${HEADER_COLS} gap-x-3 border-t border-line/70 px-0.5 pt-0.5`}>
      {COLUMNS.map((column) => {
        const active = sort === column.key;
        const label = t(column.label);
        const nextDir = active && dir === "asc" ? t("idxSortDesc") : t("idxSortAsc");
        return (
          <div key={column.key} className="flex min-w-0 items-center gap-2">
            {column.key === "title" ? <span aria-hidden="true" className="hidden w-5 shrink-0 @min-[24rem]:block" /> : null}
            <button
              type="button"
              aria-pressed={active}
              aria-label={t("idxSortColumn", { col: label, dir: nextDir })}
              className={`${SORT_BTN} ${active ? "text-ink" : ""}`}
              onClick={() => onSort(column.key)}
            >
              <span className="truncate">{label}</span>
              <SortMark active={active} dir={dir} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function holderLine(row: PositionRow): string | null {
  if (row.h == null) return null;
  return row.hc != null && row.hc > 0 ? `${row.h} +${row.hc}` : row.h;
}

function PositionTableRow({ row }: { row: PositionRow }) {
  const t = useT("entity");
  const color = row.b != null ? branchColorVar(row.b) : branchColorVar("zelfstandig");
  const holder = holderLine(row);
  const tooltip = [row.n, row.o, row.h != null && row.hc != null && row.hc > 0 ? t("idxMoreHolders", { name: row.h, n: row.hc }) : row.h]
    .filter((part): part is string => typeof part === "string" && part !== "")
    .join("\n");
  const cell = "min-w-0 truncate text-[13px] leading-snug text-ink-muted @max-[24rem]:mt-0.5";
  return (
    <li className={`relative grid min-h-11 min-w-0 items-center gap-x-2 border-b border-line/80 py-1.5 hover:bg-surface @min-[24rem]:gap-x-3 ${ROW_COLS}`}>
      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
        <IconTile color={color} icon={TYPE_ICON[row.t] ?? BriefcaseBusiness} size="xs" />
        <Link
          href={`/posities/${row.s}/`}
          prefetch={false}
          title={tooltip}
          className="min-w-0 flex-1 truncate text-[13px] font-medium leading-snug text-ink underline-offset-2 outline-none after:absolute after:inset-0 hover:text-accent-text hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-focus"
        >
          {row.n}
        </Link>
      </div>
      <div lang="nl" title={row.o ?? undefined} className={`${cell} ${row.o ? "" : "@max-[24rem]:hidden"}`}>
        <span className="hidden text-[11px] text-ink-faint @max-[24rem]:inline">{t("idxColBody")} </span>
        {row.o ?? ""}
      </div>
      <div title={holder ?? undefined} className={`${cell} ${holder ? "" : "@max-[24rem]:hidden"}`}>
        <span className="hidden text-[11px] text-ink-faint @max-[24rem]:inline">{t("idxColHolder")} </span>
        {holder ?? ""}
      </div>
    </li>
  );
}

/**
 * Windowed table of positions. Each row is one link to the position (ADR
 * 0017). On a narrow column the three cells stack under the title; the sort
 * buttons stay in the sticky bar above.
 */
export function PositionTable({ rows, signature }: { rows: PositionRow[]; signature: string }) {
  const t = useT("entity");
  const [rowHeight, setRowHeight] = useState(() => ROW_HEIGHT_MEMORY.get(LIST_ID) ?? 44);
  const onRowHeight = useCallback((height: number) => {
    ROW_HEIGHT_MEMORY.set(LIST_ID, height);
    setRowHeight((current) => (Math.abs(current - height) < 1 ? current : height));
  }, []);
  const hint = useMemo<RowHeightHint>(() => ({ rowHeight, onRowHeight }), [rowHeight, onRowHeight]);
  return (
    <div id={LIST_ID} role="region" aria-label={t("idxPositionsTable")} className="isolate min-w-0 [overflow-anchor:none]">
      <WindowedGrid
        memoryKey={`${LIST_ID}|${signature}`}
        items={rows}
        chunk={48}
        eager
        hint={hint}
        className="mt-1 grid min-w-0 list-none grid-cols-1 p-0"
        keyOf={(row) => row.s}
        render={(row) => <PositionTableRow row={row} />}
      />
    </div>
  );
}
