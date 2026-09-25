"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Building2, ChevronDown, ChevronUp, Landmark, Newspaper, X } from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { Morph } from "@/components/icons/morph";
import { useT } from "@/components/i18n/use-t";
import { partyByDataset } from "@/lib/parties";
import { edgePoint, focusSidesFits, layoutFocusSides, FOCUS_CHAIN_MAX, type Circle } from "@/lib/hierarchy-layout";
import { focusGroups, type FocusGroup, type HierarchyBundle, type HierarchyHub, type HierarchySource } from "@/lib/hierarchy";
import type { EntityInfo, GroupView } from "./model";
import { PartyChip } from "./parts";
import {
  CLUSTER_CSS,
  ExpandHint,
  MOTION_CSS,
  HubIcon,
  KIND_COLOR,
  RingBadge,
  RingPortrait,
  SourceIconLink,
  hubColor,
  hubName,
  partyStroke,
  rememberTap,
  shortRole,
  takeTap,
} from "./hierarchy-parts";

type T = (key: string, vars?: Record<string, string | number>) => string;

/** A focus group, resolved for drawing: its colour, title and head. */
type ResolvedGroup = {
  group: FocusGroup;
  title: string;
  color: string;
  hub: HierarchyHub | null;
  /** The head as a person, or null for an icon head. */
  headInfo: EntityInfo | null;
  headRole: string | null;
};

function resolveGroups(
  bundle: HierarchyBundle,
  groups: readonly FocusGroup[],
  infoOf: (id: string) => EntityInfo,
  labelOf: (kind: GroupView["kind"]) => string,
  t: T,
  locale: "nl" | "en",
): ResolvedGroup[] {
  const hubs = new Map(bundle.trees.flatMap((tree) => tree.hubs.map((hub) => [hub.id, hub] as const)));
  return groups.map((group) => {
    const hub = group.hub ? hubs.get(group.hub) ?? null : null;
    let title: string;
    let color: string;
    if (group.kind === "fractie") {
      title = t("reasonFractie", { fractie: group.party ?? "" });
      color = partyStroke(hub?.color ?? partyByDataset(group.party ?? null)?.color ?? null);
    } else if (group.kind === "party") {
      title = t("partyInCabinet", { party: group.party ?? "" });
      color = partyStroke(partyByDataset(group.party ?? null)?.color ?? null);
    } else if (group.kind === "ministry") {
      title = hub ? hubName(hub, locale) : "";
      color = hub ? hubColor(hub) : KIND_COLOR.office;
    } else {
      title = labelOf(group.kind);
      color = KIND_COLOR[group.kind];
    }
    const headInfo = group.head.type === "person" ? infoOf(group.head.id) : null;
    let headRole: string | null = null;
    if (headInfo) {
      headRole =
        group.kind === "fractie"
          ? `${t("leader")} ${group.party ?? ""}`.trim()
          : shortRole(headInfo.meta) ?? headInfo.meta;
    }
    return { group, title, color, hub, headInfo, headRole };
  });
}

/** The label beside a head: the lead's name and role, or a short group name and its size. */
function headLabel(entry: ResolvedGroup, t: T): { name: string; role: string | null } {
  if (entry.headInfo) return { name: entry.headInfo.name, role: entry.headRole };
  const n = entry.group.members.length;
  if (entry.group.kind === "party") return { name: entry.group.party ?? entry.title, role: t("partyInCabinetN", { n }) };
  if (entry.group.kind === "ministry") return { name: entry.title.replace(/^(Ministerie van|Ministry of( the)?) /, ""), role: t("ministryN", { n }) };
  return { name: entry.title, role: t("tieCount", { n }) };
}

function HeadGlyph({ entry, size }: { entry: ResolvedGroup; size: number }) {
  const { group, hub } = entry;
  if (group.head.type === "ministry" && hub) return <HubIcon hub={hub} size={Math.round(size * 0.5)} strokeWidth={2} />;
  if (group.head.type === "party")
    return (
      <span className="max-w-[80%] truncate font-bold text-ink" style={{ fontSize: Math.max(10, Math.round(size * (group.party && group.party.length > 4 ? 0.2 : 0.26))) }}>
        {group.party}
      </span>
    );
  const icon = group.kind === "news" ? Newspaper : group.kind === "cabinet" ? Landmark : Building2;
  return <LucideIcon icon={icon} size={Math.round(size * 0.46)} strokeWidth={2} />;
}

/**
 * The person focus of the hierarchy form, after the second concept: the
 * person large in the centre inside a double ring, a thick bar left and right
 * to the heads of their two strongest groups (party or fractie, and ministry
 * or office), and each head's people as a chain above and below it. Further
 * groups follow as compact rows; a legend names every colour. A person
 * refocuses; a head or "+n" opens the whole group.
 */
export function FocusDiagram({
  width,
  height,
  bundle,
  ties,
  focus,
  source,
  infoOf,
  labelOf,
  highlighted,
  locale,
  onPick,
}: {
  width: number;
  height: number;
  bundle: HierarchyBundle;
  ties: readonly GroupView[];
  focus: EntityInfo;
  source: HierarchySource | null;
  infoOf: (id: string) => EntityInfo;
  labelOf: (kind: GroupView["kind"]) => string;
  highlighted: ReadonlySet<string>;
  locale: "nl" | "en";
  onPick: (id: string) => void;
}) {
  const t = useT("power");
  const groups = useMemo(
    () => focusGroups(bundle, focus.id, ties.map((group) => ({ kind: group.kind, ties: group.ties }))),
    [bundle, focus.id, ties],
  );
  const resolved = resolveGroups(bundle, groups, infoOf, labelOf, t, locale);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const narrow = !focusSidesFits(width, height);
  const open = openGroup ? resolved.find((entry) => entry.group.key === openGroup) ?? null : null;

  return (
    <div className="hv-root relative flex h-full w-full flex-col">
      <style>{CLUSTER_CSS + MOTION_CSS}</style>
      {narrow ? (
        <FocusStack resolved={resolved} focus={focus} source={source} infoOf={infoOf} highlighted={highlighted} onPick={onPick} />
      ) : (
        <FocusWide
          width={width}
          height={height}
          resolved={resolved}
          focus={focus}
          source={source}
          infoOf={infoOf}
          highlighted={highlighted}
          onPick={onPick}
          onOpen={setOpenGroup}
        />
      )}
      {open ? <GroupCard entry={open} infoOf={infoOf} onPick={onPick} onClose={() => setOpenGroup(null)} width={width} height={height} /> : null}
    </div>
  );
}

function useHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setHeight(Math.round(element.getBoundingClientRect().height));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, height] as const;
}

const delay = (ms: number): CSSProperties => ({ animationDelay: `${Math.round(ms)}ms` });

function FocusWide({
  width,
  height,
  resolved,
  focus,
  source,
  infoOf,
  highlighted,
  onPick,
  onOpen,
}: {
  width: number;
  height: number;
  resolved: ResolvedGroup[];
  focus: EntityInfo;
  source: HierarchySource | null;
  infoOf: (id: string) => EntityInfo;
  highlighted: ReadonlySet<string>;
  onPick: (id: string) => void;
  onOpen: (key: string) => void;
}) {
  const t = useT("power");
  const gradientId = useId().replace(/:/g, "");
  const [footRef, footHeight] = useHeight<HTMLDivElement>();
  const sides = resolved.slice(0, 2);
  const extras = resolved.slice(2);
  const chartHeight = Math.max(200, height - footHeight);
  const layout = useMemo(
    () =>
      layoutFocusSides(
        sides.map((entry) => ({
          head: headLabel(entry, t),
          members: entry.group.members.map((id) => {
            const info = infoOf(id);
            return { name: info.name, role: info.meta };
          }),
        })),
        { width, height: chartHeight },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sides.map((entry) => entry.group.key + entry.group.members.length).join("|"), width, chartHeight],
  );
  const { centre, metrics, stroke } = layout;
  const [active, setActive] = useState<string | null>(null);
  const anyLit = highlighted.size > 0;
  const innerColor = focus.color ? partyStroke(focus.color) : "var(--t-color-ink-faint)";
  // The focus arrives from where it was clicked, when it was clicked on this canvas.
  const [tap] = useState(() => takeTap(focus.id));
  const move: CSSProperties = tap
    ? {
        ["--fx" as string]: `${tap.x - centre.x}px`,
        ["--fy" as string]: `${tap.y - centre.y}px`,
        ["--fs" as string]: String(Math.max(0.2, Math.min(1, tap.r / centre.r))),
      }
    : {};
  const base = tap ? 260 : 120;
  const outerEdge = layout.outerRing.r + layout.outerRing.width / 2;

  const pick = (id: string, circle: Circle) => {
    rememberTap(id, circle);
    onPick(id);
  };
  const labelBox = (label: NonNullable<(typeof layout.sides)[number]["head"]["label"]>, name: string, role: string | null, d: CSSProperties, onClick?: () => void, dim = false) => (
    <span
      aria-hidden="true"
      onClick={onClick}
      title={[name, role].filter(Boolean).join("\n")}
      className={`hv-fade absolute leading-tight ${onClick ? "cursor-pointer" : ""}`}
      style={{
        left: label.x,
        top: label.y,
        width: label.w,
        height: label.h,
        textAlign: label.align === "middle" ? "center" : label.align === "end" ? "right" : "left",
        opacity: dim ? 0.4 : 1,
        ...d,
      }}
    >
      <span className="block truncate font-bold text-ink" style={{ fontSize: metrics.name, lineHeight: `${metrics.lineName}px` }}>
        {name}
      </span>
      {label.lines === 2 && role ? (
        <span className="block truncate text-ink-muted" style={{ fontSize: metrics.role, lineHeight: `${metrics.lineRole}px` }}>
          {role}
        </span>
      ) : null}
    </span>
  );

  return (
    <>
      <div className="relative min-h-0 flex-1">
        <svg aria-hidden="true" width={width} height={chartHeight} className="absolute inset-0">
          <defs>
            {layout.sides.map((side, index) => (
              <linearGradient key={index} id={`${gradientId}-${index}`} gradientUnits="userSpaceOnUse" x1={side.bar.a.x} y1={0} x2={side.bar.b.x} y2={0}>
                <stop offset="0%" stopColor={innerColor} />
                <stop offset="100%" stopColor={sides[index].color} />
              </linearGradient>
            ))}
          </defs>
          <circle
            cx={centre.x}
            cy={centre.y}
            r={layout.outerRing.r}
            fill="none"
            stroke="var(--t-color-line)"
            strokeWidth={layout.outerRing.width}
            className="hv-move"
            style={{ ...move, transformOrigin: `${centre.x}px ${centre.y}px` }}
          />
          <circle
            cx={centre.x}
            cy={centre.y}
            r={layout.innerRing.r}
            fill="var(--t-color-surface)"
            stroke={innerColor}
            strokeWidth={layout.innerRing.width}
            className="hv-move"
            style={{ ...move, transformOrigin: `${centre.x}px ${centre.y}px` }}
          />
          {layout.sides.map((side, index) => (
            <line
              key={`bar${index}`}
              x1={side.bar.a.x}
              y1={side.bar.a.y}
              x2={side.bar.b.x}
              y2={side.bar.b.y}
              stroke={`url(#${gradientId}-${index})`}
              strokeWidth={stroke.bar}
              className="hv-draw"
              style={{ ["--len" as string]: Math.max(1, Math.round(Math.abs(side.bar.b.x - side.bar.a.x))), ...delay(base) }}
            />
          ))}
          {layout.sides.map((side, index) =>
            side.chain.map((node) => {
              const a = edgePoint(node.from, node, node.from.r);
              const b = edgePoint(node, node.from, node.r);
              const id = sides[index].group.members[node.index];
              const lit = active === id || (anyLit && highlighted.has(id));
              return (
                <line
                  key={`c${index}-${node.index}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={sides[index].color}
                  strokeWidth={lit ? stroke.chain + 1.5 : stroke.chain}
                  strokeLinecap="round"
                  className="hv-draw"
                  style={{ ["--len" as string]: Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y))), ...delay(base + 260 + node.index * 70) }}
                />
              );
            }),
          )}
        </svg>

        <div
          className="hv-move absolute flex items-center justify-center rounded-pill"
          style={{ left: centre.x - centre.r, top: centre.y - centre.r, width: centre.r * 2, height: centre.r * 2, ...move }}
        >
          {focus.href ? (
            <Link href={focus.href} aria-label={t("openProfileOf", { name: focus.name })} className="rounded-pill">
              <RingPortrait name={focus.name} image={focus.image} size={centre.r * 2} color="transparent" stroke={0} tint={focus.color} />
            </Link>
          ) : (
            <RingPortrait name={focus.name} image={focus.image} size={centre.r * 2} color="transparent" stroke={0} tint={focus.color} />
          )}
        </div>
        <div
          className="hv-fade absolute flex flex-col items-center text-center"
          style={{ left: layout.caption.x, top: layout.caption.y, width: layout.caption.w, ...delay(base) }}
        >
          <p className="w-full truncate font-bold text-ink" style={{ fontSize: metrics.name + 2, lineHeight: `${metrics.lineName + 3}px` }} title={focus.name}>
            {focus.name}
          </p>
          <p className="flex w-full min-w-0 items-center justify-center gap-1 text-ink-muted" style={{ fontSize: metrics.role, lineHeight: `${metrics.lineRole + 2}px` }}>
            {focus.meta ? (
              <span className="truncate" title={focus.meta}>
                {focus.meta}
              </span>
            ) : null}
            <SourceIconLink source={source} />
          </p>
        </div>

        {layout.sides.map((side, index) => {
          const entry = sides[index];
          const size = side.head.r * 2;
          const hit = Math.max(44, size);
          const { name: headName, role: headRole } = headLabel(entry, t);
          const d = delay(base + 160);
          const person = entry.headInfo;
          const openAll = () => onOpen(entry.group.key);
          return (
            <div key={`head${index}`}>
              {person ? (
                <button
                  type="button"
                  onClick={() => pick(person.id, side.head)}
                  title={[person.name, entry.headRole, entry.title].filter(Boolean).join("\n")}
                  aria-label={[person.name, entry.headRole, entry.title].filter(Boolean).join(", ")}
                  className="hv-pop absolute flex items-center justify-center rounded-pill transition-transform hover:scale-[1.03]"
                  style={{ left: side.head.x - hit / 2, top: side.head.y - hit / 2, width: hit, height: hit, ...d }}
                >
                  <RingPortrait name={person.name} image={person.image} size={size} color={entry.color} stroke={stroke.head} tint={person.color} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openAll}
                  title={[entry.title, headRole].filter(Boolean).join("\n")}
                  aria-label={t("groupOpen", { name: entry.title, n: entry.group.members.length })}
                  className="hv-pop absolute flex items-center justify-center rounded-pill transition-transform hover:scale-[1.03]"
                  style={{ left: side.head.x - hit / 2, top: side.head.y - hit / 2, width: hit, height: hit, ...d }}
                >
                  <RingBadge size={size} color={entry.color} stroke={stroke.head}>
                    <HeadGlyph entry={entry} size={size} />
                  </RingBadge>
                </button>
              )}
              {side.head.label ? labelBox(side.head.label, headName, headRole ?? null, delay(base + 260), person ? () => pick(person.id, side.head) : openAll) : null}
              {side.chain.map((node) => {
                const id = entry.group.members[node.index];
                const info = infoOf(id);
                const lit = anyLit && highlighted.has(id);
                const dim = anyLit && !lit;
                const hitM = Math.max(40, node.r * 2);
                const dd = delay(base + 300 + node.index * 70);
                return (
                  <div key={id}>
                    <button
                      type="button"
                      onClick={() => pick(id, node)}
                      onPointerEnter={() => setActive(id)}
                      onPointerLeave={() => setActive((current) => (current === id ? null : current))}
                      onFocus={() => setActive(id)}
                      onBlur={() => setActive((current) => (current === id ? null : current))}
                      title={[info.name, info.meta, info.party].filter(Boolean).join("\n")}
                      aria-label={[info.name, info.meta, info.party, entry.title].filter(Boolean).join(", ")}
                      className="hv-pop absolute flex items-center justify-center rounded-pill"
                      style={{ left: node.x - hitM / 2, top: node.y - hitM / 2, width: hitM, height: hitM, ...dd }}
                    >
                      <span
                        className={`hv-lift rounded-pill ${lit ? "outline outline-2 outline-offset-2 outline-accent" : ""}`}
                        style={{ opacity: dim ? 0.4 : 1, transform: active === id ? "scale(1.07)" : undefined }}
                      >
                        {info.isOrg ? (
                          <RingBadge size={node.r * 2} color={entry.color} stroke={stroke.member}>
                            <span className="font-semibold text-ink" style={{ fontSize: Math.max(9, Math.round(node.r * 0.6)) }}>
                              {info.initials}
                            </span>
                          </RingBadge>
                        ) : (
                          <RingPortrait name={info.name} image={info.image} size={node.r * 2} color={entry.color} stroke={stroke.member} tint={info.color} />
                        )}
                      </span>
                    </button>
                    {node.label ? labelBox(node.label, info.name, info.meta, delay(base + 380 + node.index * 70), () => pick(id, node), dim) : null}
                  </div>
                );
              })}
              {side.more ? (
                <button
                  type="button"
                  onClick={openAll}
                  aria-label={t("moreIn", { n: side.hidden, name: entry.title })}
                  title={t("moreIn", { n: side.hidden, name: entry.title })}
                  className="hv-pop absolute flex items-center justify-center rounded-pill border-2 bg-surface font-semibold tabular-nums text-ink-muted hover:text-ink"
                  style={{
                    left: side.more.x - Math.max(22, side.more.r),
                    top: side.more.y - side.more.r,
                    minWidth: Math.max(44, side.more.r * 2),
                    height: side.more.r * 2,
                    fontSize: Math.max(10, Math.round(side.more.r * 0.62)),
                    borderColor: entry.color,
                    ...delay(base + 620),
                  }}
                >
                  +{side.hidden}
                </button>
              ) : null}
            </div>
          );
        })}
        {layout.sides.length === 0 ? (
          <p className="absolute inset-x-0 text-center text-sm text-ink-faint" style={{ top: centre.y + outerEdge + 50 }}>
            {t("noTies")}
          </p>
        ) : null}
      </div>

      <div ref={footRef} className="shrink-0">
        {extras.length > 0 ? (
          <ul className="flex flex-col gap-1 px-3 pt-1 sm:px-4">
            {extras.map((entry) => (
              <ExtraRow key={entry.group.key} entry={entry} width={width} infoOf={infoOf} onPick={onPick} onOpen={() => onOpen(entry.group.key)} />
            ))}
          </ul>
        ) : null}
        {resolved.length > 0 ? (
          <ul aria-label={t("focusLegend")} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-3 pb-1.5 pt-1.5 text-xs text-ink-muted">
            {resolved.map((entry) => (
              <li key={entry.group.key} className="flex min-w-0 items-center gap-1.5">
                <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-pill" style={{ backgroundColor: entry.color }} />
                <span className="truncate">{entry.title}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
}

/** A further group as one row: its head, its title, and as many people as fit. */
function ExtraRow({
  entry,
  width,
  infoOf,
  onPick,
  onOpen,
}: {
  entry: ResolvedGroup;
  width: number;
  infoOf: (id: string) => EntityInfo;
  onPick: (id: string) => void;
  onOpen: () => void;
}) {
  const t = useT("power");
  const fit = Math.max(1, Math.floor((width - 250) / 34));
  const shown = entry.group.members.slice(0, fit);
  const hidden = entry.group.members.length - shown.length;
  const person = entry.headInfo;
  return (
    <li className="hv-fade flex min-w-0 items-center gap-2" style={delay(520)}>
      <button
        type="button"
        onClick={person ? () => onPick(person.id) : onOpen}
        title={[person?.name, entry.title].filter(Boolean).join("\n")}
        aria-label={person ? [person.name, entry.headRole, entry.title].filter(Boolean).join(", ") : t("groupOpen", { name: entry.title, n: entry.group.members.length })}
        className="tap-target flex min-w-0 shrink-0 items-center gap-2 rounded-sm text-left"
        style={{ maxWidth: 190 }}
      >
        {person ? (
          <RingPortrait name={person.name} image={person.image} size={32} color={entry.color} stroke={3} tint={person.color} />
        ) : (
          <RingBadge size={32} color={entry.color} stroke={3}>
            <HeadGlyph entry={entry} size={32} />
          </RingBadge>
        )}
        <span className="truncate text-xs font-semibold text-ink">{entry.title}</span>
      </button>
      <span aria-hidden="true" className="h-1 w-3 shrink-0 rounded-pill" style={{ backgroundColor: entry.color }} />
      <ul className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
        {shown.map((id) => {
          const info = infoOf(id);
          return (
            <li key={id} className="shrink-0">
              <button
                type="button"
                onClick={() => onPick(id)}
                title={[info.name, info.meta].filter(Boolean).join("\n")}
                aria-label={[info.name, info.meta].filter(Boolean).join(", ")}
                className="flex h-9 w-8 items-center justify-center rounded-pill"
              >
                {info.isOrg ? (
                  <RingBadge size={28} color={entry.color} stroke={2}>
                    <span className="text-[9px] font-semibold text-ink">{info.initials}</span>
                  </RingBadge>
                ) : (
                  <RingPortrait name={info.name} image={info.image} size={28} color={entry.color} stroke={2} tint={info.color} />
                )}
              </button>
            </li>
          );
        })}
        {hidden > 0 ? (
          <li className="shrink-0">
            <button
              type="button"
              onClick={onOpen}
              aria-label={t("moreIn", { n: hidden, name: entry.title })}
              className="tap-target flex h-7 min-w-[28px] items-center justify-center rounded-pill border px-1.5 text-[11px] font-semibold text-ink-muted hover:text-ink"
              style={{ borderColor: entry.color }}
            >
              +{hidden}
            </button>
          </li>
        ) : null}
      </ul>
    </li>
  );
}

/** Everyone in a group, as a card over the diagram. */
function GroupCard({
  entry,
  infoOf,
  onPick,
  onClose,
  width,
  height,
}: {
  entry: ResolvedGroup;
  infoOf: (id: string) => EntityInfo;
  onPick: (id: string) => void;
  onClose: () => void;
  width: number;
  height: number;
}) {
  const t = useT("power");
  const headingId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [entry.group.key]);
  const ids = entry.headInfo ? [entry.headInfo.id, ...entry.group.members] : entry.group.members;
  return (
    <section
      role="region"
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      className="hv-pop absolute z-10 flex flex-col overflow-hidden rounded-md border border-line-strong bg-surface shadow-lg"
      style={{ left: Math.max(8, width / 2 - Math.min(170, width / 2 - 8)), width: Math.min(340, width - 16), top: 8, maxHeight: Math.min(480, height - 16) }}
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b border-line px-3 py-2">
        <RingBadge size={36} color={entry.color} stroke={3}>
          <HeadGlyph entry={entry} size={36} />
        </RingBadge>
        <h3 id={headingId} className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-tight text-ink">
          {entry.title}
          <span className="ml-1.5 font-normal text-ink-faint">{ids.length}</span>
        </h3>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("hubClose", { name: entry.title })}
          title={t("hubClose", { name: entry.title })}
          className="tap-target flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-raised hover:text-ink"
        >
          <LucideIcon icon={X} size={16} />
        </button>
      </header>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1">
        {ids.map((id) => {
          const info = infoOf(id);
          return (
            <li key={id} className="border-t border-line first:border-t-0">
              <button type="button" onClick={() => onPick(id)} className="tap-row flex w-full min-w-0 items-center gap-2.5 rounded-sm px-1 py-1.5 text-left hover:bg-surface-raised">
                <RingPortrait name={info.name} image={info.image} size={34} color={entry.color} stroke={2.5} tint={info.color} />
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-semibold text-ink">{info.name}</span>
                  {info.meta ? <span className="truncate text-xs text-ink-faint">{info.meta}</span> : null}
                </span>
                <PartyChip info={info} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The narrow focus in the same language: the person with the double ring,
 * then each group as a section in its colour, headed by its lead, with its
 * chain as rows. The first two are open.
 */
function FocusStack({
  resolved,
  focus,
  source,
  infoOf,
  highlighted,
  onPick,
}: {
  resolved: ResolvedGroup[];
  focus: EntityInfo;
  source: HierarchySource | null;
  infoOf: (id: string) => EntityInfo;
  highlighted: ReadonlySet<string>;
  onPick: (id: string) => void;
}) {
  const t = useT("power");
  const [closed, setClosed] = useState<Set<string>>(() => new Set(resolved.slice(2).map((entry) => entry.group.key)));
  const [full, setFull] = useState<Set<string>>(() => new Set());
  const baseId = useId();
  const innerColor = focus.color ? partyStroke(focus.color) : "var(--t-color-ink-faint)";
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain px-3 pb-3 sm:px-4">
      <ExpandHint />
      <div className="hv-pop flex flex-col items-center pt-2 text-center">
        <span className="flex items-center justify-center rounded-pill" style={{ width: 108, height: 108, boxShadow: "inset 0 0 0 9px var(--t-color-line)" }}>
          <span className="flex items-center justify-center rounded-pill bg-surface" style={{ width: 90, height: 90, boxShadow: `inset 0 0 0 5px ${innerColor}` }}>
            <RingPortrait name={focus.name} image={focus.image} size={76} color="transparent" stroke={0} tint={focus.color} />
          </span>
        </span>
        <p className="mt-1.5 max-w-full truncate text-base font-bold text-ink">{focus.name}</p>
        {focus.meta ? <p className="line-clamp-2 max-w-full text-xs text-ink-muted">{focus.meta}</p> : null}
        <span className="mt-1 flex items-center gap-1.5">
          <PartyChip info={focus} />
          <SourceIconLink source={source} />
        </span>
      </div>
      {resolved.length === 0 ? <p className="mt-3 text-center text-sm text-ink-faint">{t("noTies")}</p> : null}
      <ul className="mt-3 flex flex-col gap-2">
        {resolved.map((entry, index) => {
          const isOpen = !closed.has(entry.group.key);
          const all = full.has(entry.group.key);
          const members = all ? entry.group.members : entry.group.members.slice(0, FOCUS_CHAIN_MAX);
          const panelId = `${baseId}-${index}`;
          const person = entry.headInfo;
          return (
            <li
              key={entry.group.key}
              className="hv-fade overflow-hidden rounded-md border bg-surface"
              style={{ borderColor: `color-mix(in oklab, ${entry.color} 55%, var(--t-color-line))`, ...delay(80 + index * 40) }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  setClosed((current) => {
                    const next = new Set(current);
                    if (next.has(entry.group.key)) next.delete(entry.group.key);
                    else next.add(entry.group.key);
                    return next;
                  })
                }
                className="tap-row flex w-full min-w-0 items-center gap-2.5 px-2.5 py-2 text-left hover:bg-surface-raised"
                style={{ boxShadow: `inset 4px 0 0 ${entry.color}` }}
              >
                {person ? (
                  <RingPortrait name={person.name} image={person.image} size={42} color={entry.color} stroke={3.5} tint={person.color} />
                ) : (
                  <RingBadge size={42} color={entry.color} stroke={3.5}>
                    <HeadGlyph entry={entry} size={42} />
                  </RingBadge>
                )}
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-semibold text-ink">{person ? person.name : entry.title}</span>
                  <span className="truncate text-xs text-ink-faint">
                    {person ? [entry.headRole, entry.title].filter(Boolean).join(" · ") : t("tieCount", { n: entry.group.members.length })}
                  </span>
                </span>
                <Morph icon={isOpen ? ChevronUp : ChevronDown} size={16} className="shrink-0 text-ink-faint" />
              </button>
              <div id={panelId} hidden={!isOpen}>
                {isOpen ? (
                  <ul className="relative border-t border-line py-1 pl-2.5 pr-2">
                    {person ? (
                      <li className="pb-0.5">
                        <button type="button" onClick={() => onPick(person.id)} className="tap-row text-xs font-medium text-accent-text hover:underline">
                          {t("focusOn", { name: person.name })}
                        </button>
                      </li>
                    ) : null}
                    {members.map((id, i) => {
                      const info = infoOf(id);
                      const dim = highlighted.size > 0 && !highlighted.has(id);
                      return (
                        <li key={id} className={`relative flex min-w-0 items-center ${dim ? "opacity-40" : ""}`}>
                          {/* The chain: a short bar in the group colour between the circles. */}
                          <span
                            aria-hidden="true"
                            className="absolute left-[19px] w-[3px] rounded-pill"
                            style={{ top: i === 0 ? "50%" : 0, bottom: i === members.length - 1 ? "50%" : 0, backgroundColor: entry.color }}
                          />
                          <button type="button" onClick={() => onPick(id)} className="tap-row relative flex min-w-0 flex-1 items-center gap-2.5 rounded-sm py-1 text-left hover:bg-surface-raised">
                            <RingPortrait name={info.name} image={info.image} size={40} color={entry.color} stroke={3} tint={info.color} />
                            <span className="flex min-w-0 flex-1 flex-col leading-tight">
                              <span className="truncate text-sm font-bold text-ink">{info.name}</span>
                              {info.meta ? <span className="truncate text-xs text-ink-faint">{info.meta}</span> : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                    {entry.group.members.length > FOCUS_CHAIN_MAX ? (
                      <li>
                        <button
                          type="button"
                          onClick={() =>
                            setFull((current) => {
                              const next = new Set(current);
                              if (next.has(entry.group.key)) next.delete(entry.group.key);
                              else next.add(entry.group.key);
                              return next;
                            })
                          }
                          className="tap-row px-1 py-1 text-xs font-medium text-accent-text hover:underline"
                        >
                          {all ? t("showFewer") : t("showAll", { n: entry.group.members.length })}
                        </button>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
