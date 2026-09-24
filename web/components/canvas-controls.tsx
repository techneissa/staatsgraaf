"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import { useT } from "@/components/i18n/use-t";
import { useLocale } from "@/components/i18n/language-provider";
import { branchColorVar } from "@/lib/branch-colors";
import type { GlyphClass } from "@/lib/graph";
import { BRANCH_LABELS_I18N, EDGE_TYPE_LABELS_I18N } from "@/lib/i18n/dict-graph";
import { edgeLine } from "./graph/edge-styles";
import { glyphPath } from "./graph/glyph";
import type { OrgBranch } from "@/lib/types";

const segmentClass =
  "tap-target rounded-sm px-2.5 py-1 text-xs font-medium text-ink-muted transition-fast pointer-coarse:text-sm";
const segmentActive = "bg-surface text-ink shadow-sm";

const GLYPH_LEGEND: { glyph: GlyphClass; key: string }[] = [
  { glyph: "shield", key: "shapeShield" },
  { glyph: "hex", key: "shapeHex" },
  { glyph: "capsule", key: "shapeCapsule" },
  { glyph: "diamond", key: "shapeDiamond" },
  { glyph: "triangle", key: "shapeTriangle" },
  { glyph: "seat", key: "shapeSeat" },
  { glyph: "dot", key: "shapeDot" },
  { glyph: "small-dot", key: "shapeSmallDot" },
];

export type CanvasView = "graph" | "power";

type CanvasControlsProps = {
  view: CanvasView;
  onViewChange: (view: CanvasView) => void;
  branches: { branch: OrgBranch; count: number }[];
  edgeTypes: { type: string; count: number }[];
  hiddenBranches: ReadonlySet<string>;
  onToggleBranch: (branch: OrgBranch, visible: boolean) => void;
  /** Shown only when the bundle carries dated relations. */
  asOf?: string | null;
  onAsOfChange?: (date: string | null) => void;
  datedEdges?: boolean;
  onShowAll: () => void;
  /** Display classes for the "as of" date; the frame hides it in the compact phone band. */
  asOfClassName?: string;
};

function branchLabel(locale: "nl" | "en", branch: string): string {
  const entry = BRANCH_LABELS_I18N[branch];
  if (!entry) return branch;
  return locale === "en" ? entry.en : entry.nl;
}

function edgeTypeLabel(locale: "nl" | "en", type: string): string {
  const entry = EDGE_TYPE_LABELS_I18N[type];
  if (!entry) return type;
  return locale === "en" ? entry.en : entry.nl;
}

/**
 * One sample row of the relationships legend: a short line in the style the
 * canvas draws for this type, ending in an arrowhead because every edge in
 * the data runs from maker to receiver.
 */
function EdgeTypeSample({ type }: { type: string }) {
  const line = edgeLine(type);
  return (
    <svg aria-hidden="true" viewBox="0 0 34 10" width={34} height={10} className="shrink-0">
      <line
        x1={0}
        y1={5}
        x2={25}
        y2={5}
        stroke={line.color}
        strokeWidth={line.width * 1.8}
        strokeOpacity={Math.min(1, line.opacity + 0.2)}
        strokeLinecap="round"
      />
      <path
        d="M 26 1.8 L 33 5 L 26 8.2"
        fill="none"
        stroke={line.color}
        strokeWidth={line.width * 1.8}
        strokeOpacity={Math.min(1, line.opacity + 0.2)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CanvasControls({
  view,
  onViewChange,
  branches,
  edgeTypes,
  hiddenBranches,
  onToggleBranch,
  onShowAll,
  asOf = null,
  onAsOfChange,
  datedEdges = false,
  asOfClassName = "flex",
}: CanvasControlsProps) {
  const t = useT("common");
  const tg = useT("graph");
  const locale = useLocale();

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
      <div
        role="group"
        aria-label={tg("viewToggleGroup")}
        className="flex items-center rounded-sm border border-line bg-surface-inset p-0.5"
      >
        <SlidingIndicator className="rounded-sm bg-surface shadow-sm" />
        <button
          type="button"
          aria-pressed={view === "graph"}
          onClick={() => onViewChange("graph")}
          className={`${segmentClass} ${view === "graph" ? segmentActive : "hover:text-ink"}`}
        >
          {t("viewGraph")}
        </button>
        <button
          type="button"
          aria-pressed={view === "power"}
          onClick={() => onViewChange("power")}
          className={`${segmentClass} ${view === "power" ? segmentActive : "hover:text-ink"}`}
        >
          {t("viewPower")}
        </button>
      </div>

      {datedEdges && onAsOfChange ? (
        <label className={`${asOf !== null ? "flex" : asOfClassName} items-center gap-1.5 text-xs text-ink-muted`}>
          <span>{t("asOfLabel")}</span>
          <input
            type="date"
            value={asOf ?? ""}
            min="1945-01-01"
            onChange={(event) => onAsOfChange(event.target.value === "" ? null : event.target.value)}
            disabled={view !== "graph"}
            aria-label={t("asOfLabel")}
            className="tap-row rounded-sm border border-line bg-surface px-1.5 py-0.5 text-xs text-ink disabled:opacity-60 pointer-coarse:text-base"
          />
          {asOf !== null ? (
            <button
              type="button"
              onClick={() => onAsOfChange(null)}
              className="tap-target rounded-sm border border-line px-1.5 py-0.5 text-[11px] text-ink-muted hover:text-ink pointer-coarse:text-sm"
            >
              {t("asOfClear")}
            </button>
          ) : null}
        </label>
      ) : null}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          disabled={view !== "graph"}
          aria-label={t("legendAndFilters")}
          className="tap-target flex items-center justify-center gap-1 rounded-sm border border-line px-2.5 py-1 text-xs font-medium text-ink-muted disabled:cursor-not-allowed disabled:opacity-60 pointer-coarse:text-sm"
        >
          {t("legendLabel")}
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
              collisionPadding={8}
              className="motion-menu z-50 max-h-[min(26rem,var(--radix-dropdown-menu-content-available-height))] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-md border border-line bg-surface p-1 shadow-xl"
            >
            <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {t("layerTitle")}
            </DropdownMenu.Label>
            {branches.map(({ branch, count }) => (
              <DropdownMenu.CheckboxItem
                key={branch}
                checked={!hiddenBranches.has(branch)}
                onCheckedChange={(checked) => onToggleBranch(branch, checked === true)}
                onSelect={(event) => event.preventDefault()}
                className="tap-row flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-xs text-ink-muted outline-none pointer-coarse:text-sm data-[highlighted]:bg-surface-raised data-[highlighted]:text-ink data-[state=unchecked]:opacity-55"
              >
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="w-3 shrink-0 text-center text-accent-text">
                    <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
                  </span>
                  <svg aria-hidden="true" viewBox="-11 -11 22 22" width={11} height={11}>
                    <circle r={8} fill={branchColorVar(branch)} />
                  </svg>
                  {branchLabel(locale, branch)}
                </span>
                <span className="text-ink-faint">{count}</span>
              </DropdownMenu.CheckboxItem>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item
              onSelect={onShowAll}
              className="tap-row flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-xs text-ink-muted outline-none pointer-coarse:text-sm data-[highlighted]:bg-surface-raised data-[highlighted]:text-ink"
            >
              {t("showAllLayers")}
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {tg("entityLegendTitle")}
            </DropdownMenu.Label>
            <div
              role="list"
              aria-label={tg("entityLegendTitle")}
              className="px-2 pb-1.5 pt-0.5"
            >
              {GLYPH_LEGEND.map(({ glyph, key }) => (
                <div
                  key={glyph}
                  role="listitem"
                  className="flex items-center gap-2 py-0.5 text-xs text-ink-muted"
                >
                  <svg aria-hidden="true" viewBox="-12 -12 24 24" width={14} height={14} className="shrink-0">
                    <path d={glyphPath(glyph, 9)} fill={glyph === "dot" || glyph === "small-dot" ? undefined : "currentColor"} stroke="currentColor" strokeWidth={glyph === "dot" || glyph === "small-dot" ? 2 : undefined} fillOpacity={0.95} />
                  </svg>
                  <span className="truncate">{tg(key)}</span>
                </div>
              ))}
            </div>
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {tg("relationshipLegendTitle")}
            </DropdownMenu.Label>
            <div
              role="list"
              aria-label={tg("relationshipLegendTitle")}
              className="px-2 pb-1.5 pt-0.5"
            >
              {edgeTypes.map(({ type, count }) => (
                <div
                  key={type}
                  role="listitem"
                  className="flex items-center gap-2 py-0.5 text-xs text-ink-muted"
                >
                  <EdgeTypeSample type={type} />
                  <span className="truncate">{edgeTypeLabel(locale, type)}</span>
                  <span className="ml-auto shrink-0 text-ink-faint">{count}</span>
                </div>
              ))}
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
