"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/use-t";
import { layoutEgo, tiePath, tieWidth, type TieGroup } from "@/lib/power-map-layout";
import type { EntityInfo, GroupView, TieView } from "./model";
import { EntityMark, PartyChip } from "./parts";

const NODE = 36;
const FOCUS_RADIUS = 40;
const LABEL = 148;
/** Width of the focus's name and title under its portrait. */
const CENTRE_TEXT = 144;

/**
 * The ego network: the focus in the centre, its ties in labelled groups on
 * the left and the right. A stronger tie sits closer in and has a heavier
 * line. Every neighbour is a real button with a 44 px row, its name and its
 * reason beside it; hovering or focusing one lights its line.
 */
export function EgoDiagram({
  width,
  height,
  raw,
  groups,
  focus,
  infoOf,
  labelOf,
  highlighted,
  onPick,
}: {
  width: number;
  height: number;
  raw: readonly TieGroup[];
  groups: readonly GroupView[];
  focus: EntityInfo;
  infoOf: (id: string) => EntityInfo;
  labelOf: (kind: GroupView["kind"]) => string;
  highlighted: ReadonlySet<string>;
  onPick: (id: string) => void;
}) {
  const t = useT("power");
  const [active, setActive] = useState<string | null>(null);
  const layout = useMemo(
    () => layoutEgo(raw, { width, height, node: NODE, focusRadius: FOCUS_RADIUS, label: LABEL, centreText: CENTRE_TEXT }),
    [raw, width, height],
  );
  const tieById = useMemo(() => {
    const map = new Map<string, TieView>();
    for (const group of groups) for (const tie of group.ties) map.set(tie.other, tie);
    return map;
  }, [groups]);
  const { centre } = layout;
  const anyHighlight = highlighted.size > 0;

  return (
    <div className="relative h-full w-full">
      <svg aria-hidden="true" width={width} height={height} className="absolute inset-0">
        {layout.nodes.map((node) => {
          const lit = active === node.id || (anyHighlight && highlighted.has(node.id));
          const dim = (active !== null && active !== node.id) || (anyHighlight && !highlighted.has(node.id));
          const end = { x: node.x - node.side * (NODE / 2 + 2), y: node.y };
          return (
            <path
              key={node.id}
              d={tiePath({ x: centre.x + node.side * (FOCUS_RADIUS + 2), y: centre.y }, end)}
              fill="none"
              stroke={lit ? "var(--t-color-accent)" : "var(--t-color-line-strong)"}
              strokeWidth={tieWidth(node.level)}
              strokeLinecap="round"
              opacity={dim ? 0.3 : lit ? 1 : 0.75}
            />
          );
        })}
      </svg>

      {layout.headings.map((heading) => (
        <p
          key={`${heading.kind}${heading.side}`}
          className="absolute flex items-baseline gap-1.5 text-xs font-semibold text-ink-muted"
          style={{
            top: heading.y - 9,
            ...(heading.side === 1 ? { right: width - heading.x } : { left: heading.x }),
          }}
        >
          <span>{labelOf(heading.kind)}</span>
          <span className="font-normal text-ink-faint">{heading.hidden > 0 ? t("moreCount", { n: heading.hidden }) : heading.shown}</span>
        </p>
      ))}

      {layout.nodes.map((node) => {
        const info = infoOf(node.id);
        const tie = tieById.get(node.id);
        const dim = anyHighlight && !highlighted.has(node.id);
        const lit = anyHighlight && highlighted.has(node.id);
        const reason = tie?.reasons.map((item) => item.text).join(" · ") || info.meta || "";
        const evidence = tie?.reasons.map((item) => item.evidence).filter(Boolean).join("\n");
        const left = node.side === 1 ? node.x - NODE / 2 - 4 : node.x + NODE / 2 + 4 - (NODE + 8 + LABEL);
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onPick(node.id)}
            onPointerEnter={() => setActive(node.id)}
            onPointerLeave={() => setActive((current) => (current === node.id ? null : current))}
            onFocus={() => setActive(node.id)}
            onBlur={() => setActive((current) => (current === node.id ? null : current))}
            title={[info.name, info.meta, reason !== info.meta ? reason : null, evidence, tie ? t("strength", { level: tie.level }) : null]
              .filter(Boolean)
              .join("\n")}
            aria-label={[info.name, info.meta, reason !== info.meta ? reason : null, tie ? t("strength", { level: tie.level }) : null]
              .filter(Boolean)
              .join(", ")}
            className={`ego-node absolute flex h-11 items-center gap-2 rounded-md px-1 text-left transition-opacity hover:bg-surface-raised ${
              node.side === -1 ? "flex-row-reverse text-right" : ""
            } ${dim ? "opacity-40" : ""}`}
            style={{ left, top: node.y - 22, width: NODE + 8 + LABEL }}
          >
            <span className={`shrink-0 rounded-pill ${lit ? "outline outline-2 outline-offset-2 outline-accent" : ""}`}>
              <EntityMark info={info} size={NODE} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-[13px] font-medium text-ink">{info.name}</span>
              <span className="truncate text-xs text-ink-faint">{reason}</span>
            </span>
          </button>
        );
      })}

      <div
        className="absolute flex flex-col items-center text-center"
        style={{ left: centre.x - CENTRE_TEXT / 2, top: centre.y - FOCUS_RADIUS, width: CENTRE_TEXT }}
      >
        {focus.href ? (
          <Link href={focus.href} aria-label={t("openProfileOf", { name: focus.name })} className="rounded-pill">
            <EntityMark info={focus} size={FOCUS_RADIUS * 2} />
          </Link>
        ) : (
          <EntityMark info={focus} size={FOCUS_RADIUS * 2} />
        )}
        <p className="mt-1.5 line-clamp-2 rounded-sm bg-surface-inset px-1 text-sm font-semibold leading-tight text-ink">{focus.name}</p>
        {focus.meta ? <p className="line-clamp-2 rounded-sm bg-surface-inset px-1 text-xs leading-tight text-ink-faint">{focus.meta}</p> : null}
        <span className="mt-1">
          <PartyChip info={focus} />
        </span>
      </div>
    </div>
  );
}
