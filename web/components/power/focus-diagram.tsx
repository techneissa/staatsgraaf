"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/use-t";
import { edgePoint, layoutFocus } from "@/lib/hierarchy-layout";
import { tieWidth } from "@/lib/power-map-layout";
import type { HierarchySource } from "@/lib/hierarchy";
import type { EntityInfo, GroupView, TieView } from "./model";
import { EntityMark, PartyChip } from "./parts";
import { SourceIconLink } from "./hierarchy-parts";

const MOTION_CSS = `
@keyframes fd-in { from { opacity: 0; transform: translate(var(--fx, 0px), var(--fy, 0px)) scale(.5); } to { opacity: 1; transform: none; } }
@keyframes fd-pop { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: none; } }
@keyframes fd-fade { from { opacity: 0; } to { opacity: 1; } }
.fd-in { animation: fd-in 360ms var(--t-ease-decelerate) both; }
.fd-pop { animation: fd-pop 260ms var(--t-ease-decelerate) both; }
.fd-fade { animation: fd-fade 300ms var(--t-ease-standard) both; }
.fd-lift { transition: transform var(--t-duration-fast) var(--t-ease-standard), opacity var(--t-duration-base) var(--t-ease-standard); }
@media (prefers-reduced-motion: reduce) {
  .fd-in, .fd-pop, .fd-fade { animation: none; }
  .fd-lift { transition: none; }
}`;

/**
 * The person focus of the hierarchy form, after a photo org chart: the focus
 * large in the centre, its ties as portrait tiles around it with a name and a
 * one-line role, grouped by kind, each linked to the centre by a thin line.
 * A heavier line is a stronger tie. A tile refocuses; a group that did not
 * fit offers the full list.
 */
export function FocusDiagram({
  width,
  height,
  groups,
  focus,
  source,
  infoOf,
  labelOf,
  highlighted,
  onPick,
  onShowAll,
}: {
  width: number;
  height: number;
  groups: readonly GroupView[];
  focus: EntityInfo;
  source: HierarchySource | null;
  infoOf: (id: string) => EntityInfo;
  labelOf: (kind: GroupView["kind"]) => string;
  highlighted: ReadonlySet<string>;
  onPick: (id: string) => void;
  onShowAll: () => void;
}) {
  const t = useT("power");
  const [active, setActive] = useState<string | null>(null);
  const labelKey = groups.map((group) => labelOf(group.kind)).join("\u0000");
  const layout = useMemo(
    () => {
      const labels = labelKey.split("\u0000");
      // Smaller tiles in a smaller box, so more ties fit before the list takes over.
      const small = Math.min(width, height) < 560;
      const tiles = small ? { tileW: 86, tileH: 72, portrait: 34 } : {};
      return layoutFocus(groups.map((group, index) => ({ kind: group.kind, count: group.ties.length, label: labels[index] })), { width, height, ...tiles });
    },
    [groups, width, height, labelKey],
  );
  const byKind = useMemo(() => new Map(groups.map((group) => [group.kind, group.ties])), [groups]);
  const { centre, portrait, tile } = layout;
  const anyLit = highlighted.size > 0;
  const placed = layout.tiles
    .map((entry, order) => ({ ...entry, order, tie: byKind.get(entry.kind as GroupView["kind"])?.[entry.index] }))
    .filter((entry): entry is typeof entry & { tie: TieView } => Boolean(entry.tie));
  const stagger = (order: number): CSSProperties => ({ animationDelay: `${Math.min(420, 120 + order * 16)}ms` });

  return (
    <div className="relative h-full w-full">
      <style>{MOTION_CSS}</style>
      <svg aria-hidden="true" width={width} height={height} className="absolute inset-0">
        {placed.map((entry) => {
          const from = edgePoint(centre, entry, centre.r + 3);
          const to = edgePoint(entry, centre, portrait / 2 + 3);
          const lit = active === entry.tie.other || (anyLit && highlighted.has(entry.tie.other));
          const dim = (active !== null && !lit) || (anyLit && !highlighted.has(entry.tie.other));
          return (
            <line
              key={`${entry.kind}${entry.tie.other}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={lit ? "var(--t-color-accent)" : "var(--t-color-line-strong)"}
              strokeWidth={tieWidth(entry.tie.level) * 0.6}
              strokeLinecap="round"
              className="fd-fade fd-lift"
              style={{ ...stagger(entry.order), opacity: dim ? 0.25 : 1 }}
            />
          );
        })}
      </svg>

      {layout.headings.some((heading) => !heading.visible && heading.hidden > 0) ? (
        <button
          type="button"
          onClick={onShowAll}
          className="tap-target absolute bottom-2 right-3 rounded-sm border border-line bg-surface px-2 py-1 text-xs font-medium text-accent-text hover:border-line-strong"
        >
          {t("focusMore", { n: groups.reduce((sum, group) => sum + group.ties.length, 0) })}
        </button>
      ) : null}

      {layout.headings.filter((heading) => heading.visible).map((heading) => (
        <p
          key={heading.kind}
          className="fd-fade absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-sm bg-surface-inset px-1.5 text-[11px] font-semibold leading-5 text-ink-muted"
          style={{ left: heading.x, top: heading.y, animationDelay: "200ms" }}
        >
          <span>{labelOf(heading.kind as GroupView["kind"])}</span>
          {heading.hidden > 0 ? (
            <button
              type="button"
              onClick={onShowAll}
              aria-label={t("focusMore", { n: heading.shown + heading.hidden })}
              title={t("focusMore", { n: heading.shown + heading.hidden })}
              className="tap-target rounded-sm px-1 font-medium text-accent-text hover:underline"
            >
              {t("moreCount", { n: heading.hidden })}
            </button>
          ) : (
            <span className="font-normal text-ink-faint">{heading.shown}</span>
          )}
        </p>
      ))}

      {placed.map((entry) => {
        const tie = entry.tie;
        const info = infoOf(tie.other);
        const reason = tie.reasons.map((item) => item.text).join(" · ");
        const evidence = tie.reasons.map((item) => item.evidence).filter(Boolean).join("\n");
        const role = info.meta ?? reason;
        const lit = anyLit && highlighted.has(tie.other);
        const dim = anyLit && !lit;
        return (
          <button
            key={`${entry.kind}${tie.other}`}
            type="button"
            onClick={() => onPick(tie.other)}
            onPointerEnter={() => setActive(tie.other)}
            onPointerLeave={() => setActive((current) => (current === tie.other ? null : current))}
            onFocus={() => setActive(tie.other)}
            onBlur={() => setActive((current) => (current === tie.other ? null : current))}
            title={[info.name, info.meta, reason, evidence, t("strength", { level: tie.level })].filter(Boolean).join("\n")}
            aria-label={[info.name, info.meta, reason, t("strength", { level: tie.level })].filter(Boolean).join(", ")}
            className="fd-in absolute flex flex-col items-center rounded-md px-0.5 pt-0 text-center"
            style={{
              left: entry.x - tile.w / 2,
              top: entry.y - portrait / 2,
              width: tile.w,
              height: tile.h,
              ["--fx" as string]: `${(centre.x - entry.x) * 0.55}px`,
              ["--fy" as string]: `${(centre.y - entry.y) * 0.55}px`,
              ...stagger(entry.order),
            }}
          >
            <span
              className={`fd-lift shrink-0 rounded-pill ${lit ? "outline outline-2 outline-offset-2 outline-accent" : ""}`}
              style={{ transform: active === tie.other ? "scale(1.08)" : undefined, opacity: dim ? 0.4 : 1 }}
            >
              <EntityMark info={info} size={portrait} />
            </span>
            <span className={`fd-lift mt-1 w-full rounded-sm bg-surface-inset/80 leading-tight ${dim ? "opacity-40" : ""}`}>
              <span className="block truncate text-xs font-medium text-ink">{info.name}</span>
              <span className="block truncate text-[11px] text-ink-faint">{role}</span>
            </span>
          </button>
        );
      })}

      <div
        className="fd-pop absolute flex flex-col items-center text-center"
        style={{ left: centre.x - 84, top: centre.y - centre.r, width: 168 }}
      >
        {focus.href ? (
          <Link href={focus.href} aria-label={t("openProfileOf", { name: focus.name })} className="rounded-pill">
            <EntityMark info={focus} size={centre.r * 2} />
          </Link>
        ) : (
          <EntityMark info={focus} size={centre.r * 2} />
        )}
        <p className="mt-1.5 line-clamp-2 rounded-sm bg-surface-inset px-1 text-sm font-semibold leading-tight text-ink">{focus.name}</p>
        {focus.meta ? <p className="line-clamp-2 rounded-sm bg-surface-inset px-1 text-xs leading-tight text-ink-faint">{focus.meta}</p> : null}
        <span className="mt-0.5 flex items-center gap-1">
          <PartyChip info={focus} />
          <SourceIconLink source={source} />
        </span>
      </div>
    </div>
  );
}
