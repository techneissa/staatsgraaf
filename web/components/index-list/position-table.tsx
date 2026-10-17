"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, ChevronDown, ChevronUp, ChevronsUpDown, Landmark, TextWrap, Users } from "lucide";
import type { IconNode } from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { useT } from "@/components/i18n/use-t";
import { branchColorVar } from "@/lib/branch-colors";
import type { PositionRow, PositionSortDir, PositionSortKey } from "@/lib/index-lists";
import type { OrgType } from "@/lib/types";
import { IconTile } from "./org-visual";
import { WindowedGrid, type RowHeightHint } from "./windowed-grid";

const LIST_ID = "posities-lijst";
const COLS = "grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]";
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
  "inline-flex min-h-11 min-w-0 items-center gap-0.5 text-start text-xs font-medium text-ink-muted transition-fast hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

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
  wrap,
  onSort,
  onWrap,
}: {
  sort: PositionSortKey;
  dir: PositionSortDir;
  wrap: boolean;
  onSort: (key: PositionSortKey) => void;
  onWrap: (value: boolean) => void;
}) {
  const t = useT("entity");
  return (
    <div className="mt-2 border-t border-line/70 px-0.5 pt-0.5">
      <button
        type="button"
        aria-pressed={wrap}
        aria-label={t("idxWrapLinesHint")}
        title={t("idxWrapLinesHint")}
        onClick={() => onWrap(!wrap)}
        className={`mb-0.5 inline-flex min-h-11 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
          wrap ? "border-ink bg-surface-raised text-ink" : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"
        }`}
      >
        <LucideIcon icon={TextWrap} size={14} strokeWidth={2} />
        <span>{t("idxWrapLines")}</span>
      </button>
      <div className={`grid ${COLS} gap-x-2 @min-[40rem]:gap-x-3`}>
        {COLUMNS.map((column) => {
          const active = sort === column.key;
          const label = t(column.label);
          const nextDir = active && dir === "asc" ? t("idxSortDesc") : t("idxSortAsc");
          return (
            <div key={column.key} className="flex min-w-0 items-center gap-1.5">
              {column.key === "title" ? <span aria-hidden="true" className="w-5 shrink-0" /> : null}
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
    </div>
  );
}

function holderLine(row: PositionRow): string | null {
  if (row.h == null) return null;
  return row.hc != null && row.hc > 0 ? `${row.h} +${row.hc}` : row.h;
}

function PositionTableRow({ row, wrap }: { row: PositionRow; wrap: boolean }) {
  const t = useT("entity");
  const color = row.b != null ? branchColorVar(row.b) : branchColorVar("zelfstandig");
  const holder = holderLine(row);
  const tooltip = [row.n, row.o, row.h != null && row.hc != null && row.hc > 0 ? t("idxMoreHolders", { name: row.h, n: row.hc }) : row.h]
    .filter((part): part is string => typeof part === "string" && part !== "")
    .join("\n");
  const flow = wrap ? "break-words" : "truncate";
  const cell = `min-w-0 ${flow} text-[11px] leading-snug text-ink-muted`;
  return (
    <li className={`relative grid min-h-11 min-w-0 overflow-hidden gap-x-2 border-b border-line/80 py-1.5 hover:bg-surface @min-[40rem]:gap-x-3 ${wrap ? "items-start" : "items-center"} ${COLS}`}>
      <div className={`flex min-w-0 gap-1.5 ${wrap ? "items-start" : "items-center overflow-hidden"}`}>
        <IconTile color={color} icon={TYPE_ICON[row.t] ?? BriefcaseBusiness} size="xs" className={wrap ? "mt-px" : ""} />
        <Link
          href={`/posities/${row.s}/`}
          prefetch={false}
          title={tooltip}
          className={`min-w-0 flex-1 ${flow} text-[11px] font-medium leading-snug text-ink underline-offset-2 outline-none after:absolute after:inset-0 hover:text-accent-text hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-focus`}
        >
          {row.n}
        </Link>
      </div>
      <div lang="nl" title={row.o ?? undefined} className={cell}>
        {row.o ?? ""}
      </div>
      <div title={holder ?? undefined} className={cell}>
        {holder ?? ""}
      </div>
    </li>
  );
}

/**
 * Windowed table of positions. Three columns at every width: title, body,
 * holder. Each row is one link to the position (ADR 0017). Wrap mode lets
 * names use extra lines; the other mode keeps each cell to one line.
 */
export function PositionTable({ rows, wrap, signature }: { rows: PositionRow[]; wrap: boolean; signature: string }) {
  const t = useT("entity");
  const memoryId = `${LIST_ID}|${wrap ? "wrap" : "line"}`;
  const [rowHeight, setRowHeight] = useState(() => ROW_HEIGHT_MEMORY.get(memoryId) ?? (wrap ? 56 : 44));
  const onRowHeight = useCallback(
    (height: number) => {
      ROW_HEIGHT_MEMORY.set(memoryId, height);
      setRowHeight((current) => (Math.abs(current - height) < 1 ? current : height));
    },
    [memoryId],
  );
  const hint = useMemo<RowHeightHint>(() => ({ rowHeight, onRowHeight }), [rowHeight, onRowHeight]);
  return (
    <div id={LIST_ID} role="region" aria-label={t("idxPositionsTable")} className="isolate min-w-0 [overflow-anchor:none]">
      <WindowedGrid
        memoryKey={`${memoryId}|${signature}`}
        items={rows}
        chunk={48}
        eager
        hint={hint}
        className="mt-1 grid min-w-0 list-none grid-cols-1 p-0"
        keyOf={(row) => row.s}
        render={(row) => <PositionTableRow row={row} wrap={wrap} />}
      />
    </div>
  );
}
