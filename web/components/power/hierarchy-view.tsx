"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Armchair, Briefcase, ChevronDown, ChevronUp, CircleUserRound, LayoutList, X } from "lucide";
import { Morph } from "@/components/icons/morph";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { PartyPill } from "@/components/party-pill";
import { useT } from "@/components/i18n/use-t";
import { orgEnGloss } from "@/lib/name-gloss";
import { chartConnectors, memberKey } from "@/lib/hierarchy-connectors";
import { arcPath, layoutOrgChart, orgChartFits, type OrgChartLayout } from "@/lib/hierarchy-layout";
import {
  MINISTRY_CLUSTERS,
  clusterOf,
  clusterVar,
  interleaveBySize,
  orderByCluster,
  type HierarchyBundle,
  type HierarchyHub,
  type HierarchyPerson,
  type HierarchyTree,
  type HierarchyTreeId,
} from "@/lib/hierarchy";
import {
  CLUSTER_CSS,
  ExpandHint,
  MOTION_CSS,
  HubIcon,
  PersonRow,
  RingBadge,
  RingPortrait,
  SourceIconLink,
  hubColor,
  hubName,
  personInfo,
  rememberTap,
  roleText,
  shortRole,
} from "./hierarchy-parts";
import { ChamberHallView } from "./chamber-hall";

/**
 * Icons for the three structures: a briefcase for the kabinet, and the two
 * halls as they are drawn: the Tweede Kamer's dome of seats and the Eerste
 * Kamer's two blocks facing each other.
 */
export function TreeIcon({ tree, size = 16 }: { tree: HierarchyTreeId; size?: number }) {
  if (tree === "kabinet") return <LucideIcon icon={Briefcase} size={size} />;
  const dot = (cx: number, cy: number) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.35} fill="currentColor" />;
  const dots =
    tree === "tweede-kamer"
      ? [0, 1, 2, 3, 4, 5, 6].flatMap((i) => {
          const angle = Math.PI - (i * Math.PI) / 6;
          return [dot(10 + 8 * Math.cos(angle), 15 - 8 * Math.sin(angle)), ...(i % 2 === 0 ? [dot(10 + 4.4 * Math.cos(angle), 15 - 4.4 * Math.sin(angle))] : [])];
        })
      : [4, 8, 12, 16].flatMap((y) => [dot(3, y), dot(6.6, y), dot(13.4, y), dot(17, y)]);
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width={size} height={size}>
      {dots}
    </svg>
  );
}

export const TREE_KEYS: Record<HierarchyTreeId, string> = {
  kabinet: "treeKabinet",
  "tweede-kamer": "treeTweedeKamer",
  "eerste-kamer": "treeEersteKamer",
};

/** Where the reader's choice between the hall and the overview is remembered. */
const HALL_KEY = "staatsgraaf.chamber-view";

/**
 * The chamber form: the hall where it fits, the overview (ring or cards)
 * where it does not, unless the reader chose; the choice is remembered in
 * the browser and applies to both Kamers.
 */
function useHallChoice() {
  const [choice, setChoice] = useState<"hall" | "list" | null>(null);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HALL_KEY);
      if (stored === "hall" || stored === "list") setChoice(stored);
    } catch {
      // Storage can be blocked; the default applies.
    }
  }, []);
  const choose = (value: "hall" | "list") => {
    setChoice(value);
    try {
      window.localStorage.setItem(HALL_KEY, value);
    } catch {
      // Remembering is a convenience only.
    }
  };
  return [choice, choose] as const;
}

/** Where the reader's choice of faces or dots on the seats is remembered. */
const PHOTOS_KEY = "staatsgraaf.chamber-photos";

/** Faces on the seats by default; the reader can switch to dots, remembered in the browser. */
function usePhotos() {
  const [photos, setPhotos] = useState(true);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(PHOTOS_KEY) === "off") setPhotos(false);
    } catch {
      // Storage can be blocked; faces stay on.
    }
  }, []);
  const toggle = () =>
    setPhotos((current) => {
      try {
        window.localStorage.setItem(PHOTOS_KEY, current ? "off" : "on");
      } catch {
        // Remembering is a convenience only.
      }
      return !current;
    });
  return [photos, toggle] as const;
}

/** People placed around a hub before the rest wait behind its "+n". */
const AROUND: Record<HierarchyHub["kind"], number> = { ministry: 4, fractie: 1 };

/**
 * The hierarchy form of Verbanden, after a circular organisation chart: the
 * head of a structure in a large centre circle, a thick ring cut into one
 * coloured segment per group (ministry cluster or fractie by seats), a solid
 * bar from each segment to its hub, and each hub's people around it on short
 * bars with their name and role. A hub opens into a card with everyone in it;
 * a person opens their focus through the selection store (`onPick`). Below
 * `orgChartFits` it stacks into cards.
 */
export function HierarchyView({
  bundle,
  tree: treeId,
  width,
  height,
  locale,
  expanded,
  onExpand,
  highlighted,
  onPick,
}: {
  bundle: HierarchyBundle;
  tree: HierarchyTreeId;
  width: number;
  height: number;
  locale: "nl" | "en";
  expanded: string | null;
  onExpand: (hub: string | null) => void;
  highlighted: ReadonlySet<string>;
  onPick: (id: string) => void;
}) {
  const t = useT("power");
  const tg = useT("graph");
  const [hallChoice, chooseHall] = useHallChoice();
  const [photos, togglePhotos] = usePhotos();
  const raw = bundle.trees.find((entry) => entry.id === treeId) ?? bundle.trees[0];
  const tree = useMemo<HierarchyTree | undefined>(
    () => (raw ? { ...raw, hubs: raw.id === "kabinet" ? orderByCluster(raw.hubs) : interleaveBySize(raw.hubs) } : raw),
    [raw],
  );
  const [barRef, barHeight] = useHeight<HTMLDivElement>();
  const [legendRef, legendHeight] = useHeight<HTMLDivElement>();
  if (!tree) return null;
  const chartHeight = Math.max(0, height - barHeight - legendHeight);
  const chart = orgChartFits(width, chartHeight);
  const hasHall = Boolean(tree.hall);
  const hall = hasHall && (hallChoice ?? (chart ? "hall" : "list")) === "hall";
  const hallHub = hall && expanded ? tree.hubs.find((hub) => hub.id === expanded) ?? null : null;
  const coalition = tree.parties ?? [];
  const clusters = tree.id === "kabinet" ? MINISTRY_CLUSTERS.filter((cluster) => tree.hubs.some((hub) => clusterOf(hub.id).id === cluster.id)) : [];

  return (
    <div className="hv-root flex h-full min-h-0 w-full flex-col">
      <style>{CLUSTER_CSS + MOTION_CSS}</style>
      <div ref={barRef} className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 px-3 pb-1 pt-1.5 sm:px-4">
        <p className="flex min-w-0 flex-1 basis-40 flex-wrap items-center gap-1.5 text-xs text-ink-muted">
          {tree.id === "kabinet" ? (
            <>
              <span className="font-medium text-ink">{tree.name}</span>
              {coalition.map((party) => (
                <PartyPill key={party} party={party} />
              ))}
              <SourceIconLink source={tree.src !== undefined ? bundle.sources[tree.src] : null} />
            </>
          ) : (
            <>
              <span className="font-medium text-ink">{locale === "en" ? orgEnGloss(tree.name) ?? tree.name : tree.name}</span>
              <span className="tabular-nums">{t("seatsN", { n: tree.seats ?? 0 })}</span>
            </>
          )}
        </p>
        {hasHall ? (
          <>
            {hall ? (
              <button
                type="button"
                onClick={togglePhotos}
                aria-pressed={photos}
                aria-label={t("hallPhotos")}
                title={t("hallPhotos")}
                className={`tap-target flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-sm border px-2 text-xs font-medium transition-colors max-md:px-0 ${
                  photos ? "border-line-strong bg-surface-raised text-ink" : "border-line bg-surface text-ink-faint hover:text-ink"
                }`}
              >
                <LucideIcon icon={CircleUserRound} size={16} />
                <span className="hidden md:inline">{tg("hallPhotosShort")}</span>
              </button>
            ) : null}
            <Segmented
              label={t("hallLabel")}
              value={hall ? "hall" : "list"}
              options={[
                { value: "hall", label: t("hallShow"), icon: <LucideIcon icon={Armchair} size={16} />, iconOnly: true },
                { value: "list", label: t("hallList"), icon: <LucideIcon icon={LayoutList} size={16} />, iconOnly: true },
              ]}
              onChange={(value) => {
                onExpand(null);
                chooseHall(value as "hall" | "list");
                // Where the hall does not fit (a phone's canvas band), choosing it opens the canvas full screen.
                if (value === "hall" && !chart) window.dispatchEvent(new Event("staatsgraaf:canvas-expand"));
              }}
            />
          </>
        ) : null}
      </div>
      <div className="relative min-h-0 flex-1">
        {hall ? (
          <>
            <ChamberHallView
              key={tree.id}
              bundle={bundle}
              tree={tree}
              width={width}
              height={chartHeight}
              locale={locale}
              highlighted={highlighted}
              onPick={onPick}
              onExpand={onExpand}
              photos={photos}
            />
            {hallHub ? (
              <HubCard
                bundle={bundle}
                hub={hallHub}
                locale={locale}
                highlighted={highlighted}
                onPick={onPick}
                onClose={() => onExpand(null)}
                style={{
                  left: Math.max(8, width / 2 - Math.min(170, width / 2 - 8)),
                  width: Math.min(340, width - 16),
                  top: 8,
                  maxHeight: Math.min(460, chartHeight - 16),
                }}
              />
            ) : null}
          </>
        ) : chart ? (
          <OrgChart
            key={tree.id}
            bundle={bundle}
            tree={tree}
            width={width}
            height={chartHeight}
            locale={locale}
            expanded={expanded}
            onExpand={onExpand}
            highlighted={highlighted}
            onPick={onPick}
          />
        ) : (
          <Stacked key={tree.id} bundle={bundle} tree={tree.id === "kabinet" || !raw ? tree : raw} locale={locale} highlighted={highlighted} onPick={onPick} initial={expanded} />
        )}
      </div>
      <div ref={legendRef} className={chart && !hall ? "shrink-0" : "hidden"}>
        {hall ? null : chart && tree.id === "kabinet" ? (
          <ul aria-label={t("clusterLegend")} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 pb-1.5 pt-1 text-xs text-ink-muted">
            {clusters.map((cluster) => (
              <li key={cluster.id} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-pill" style={{ backgroundColor: clusterVar(cluster.id) }} />
                {locale === "en" ? cluster.en : cluster.nl}
              </li>
            ))}
          </ul>
        ) : chart ? (
          <p className="px-3 pb-1.5 pt-1 text-center text-xs text-ink-faint">{t("seatsRingNote")}</p>
        ) : null}
      </div>
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

/** A small segmented control: one pressed button per option. */
export function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  /**
   * With `compact`, the label shows from the sm breakpoint and is read by screen readers below it.
   * With `iconOnly`, only the icon shows below md (the label is the tooltip and the accessible name there); from md the label shows too.
   */
  options: { value: string; label: string; icon?: React.ReactNode; compact?: boolean; iconOnly?: boolean }[];
  onChange: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 rounded-sm border border-line bg-surface p-0.5">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            title={option.compact || option.iconOnly ? option.label : undefined}
            onClick={() => onChange(option.value)}
            className={`tap-target flex items-center justify-center gap-1.5 rounded-[3px] px-2.5 py-1 text-xs font-medium transition-colors ${
              on ? "bg-surface-raised text-ink shadow-[inset_0_0_0_1px_var(--t-color-line-strong)]" : "text-ink-muted hover:text-ink"
            }`}
          >
            {option.icon}
            <span className={option.iconOnly ? "max-md:sr-only" : option.compact ? "max-sm:sr-only" : undefined}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function countText(t: (key: string, vars?: Record<string, string | number>) => string, hub: HierarchyHub): string {
  if (hub.kind === "fractie") return hub.seats === 1 ? t("seats1") : t("seatsN", { n: hub.seats ?? 0 });
  return hub.people.length === 1 ? t("people1") : t("peopleN", { n: hub.people.length });
}

/** The role shown beside a person in the chart. */
function memberRole(person: HierarchyPerson, hub: HierarchyHub, locale: "nl" | "en", leader: string): string | null {
  if (person.leader) return hub.kind === "fractie" ? `${leader} ${hub.short}` : leader;
  return roleText(person, locale);
}



const delay = (ms: number): CSSProperties => ({ animationDelay: `${Math.round(ms)}ms` });

function OrgChart({
  bundle,
  tree,
  width,
  height,
  locale,
  expanded,
  onExpand,
  highlighted,
  onPick,
}: {
  bundle: HierarchyBundle;
  tree: HierarchyTree;
  width: number;
  height: number;
  locale: "nl" | "en";
  expanded: string | null;
  onExpand: (hub: string | null) => void;
  highlighted: ReadonlySet<string>;
  onPick: (id: string) => void;
}) {
  const t = useT("power");
  const [hot, setHot] = useState<string | null>(null);
  const leaderWord = t("leader");
  const layout: OrgChartLayout = useMemo(
    () =>
      layoutOrgChart(
        tree.hubs.map((hub) => {
          // A fractie shows its leader; without one on record it shows nobody rather than a stand-in.
          const around = hub.kind === "fractie" ? hub.people.filter((person) => person.leader).slice(0, 1) : hub.people.slice(0, AROUND.ministry);
          return {
            id: hub.id,
            group: hub.kind === "ministry" ? clusterOf(hub.id).id : hub.id,
            weight: hub.kind === "fractie" ? hub.seats ?? 1 : 1,
            label: hub.short,
            members: around.map((person) => ({ id: person.id, name: person.name, role: memberRole(person, hub, locale, leaderWord) })),
          };
        }),
        { width, height, ring: tree.id === "kabinet" ? "groups" : "weight" },
      ),
    [tree, width, height, locale, leaderWord],
  );
  const { centre, ring, metrics, stroke } = layout;
  const connectors = useMemo(() => chartConnectors(layout), [layout]);
  const hubById = useMemo(() => new Map(tree.hubs.map((hub) => [hub.id, hub])), [tree]);
  const colorOfGroup = (group: string) =>
    tree.id === "kabinet" ? clusterVar(group as Parameters<typeof clusterVar>[0]) : hubColor(hubById.get(group) ?? tree.hubs[0]);
  const groupOrder = useMemo(() => {
    const order = new Map<string, number>();
    layout.hubs.forEach((hub) => {
      if (!order.has(hub.group)) order.set(hub.group, order.size);
    });
    return order;
  }, [layout]);
  const groups = Math.max(1, groupOrder.size);
  // The timeline: centre, ring segments, bars, hubs by group, then people by group.
  const segmentDelay = (index: number) => 140 + (index / Math.max(1, layout.segments.length)) * 320;
  const groupDelay = (group: string) => 420 + ((groupOrder.get(group) ?? 0) / groups) * 360;
  const anyLit = highlighted.size > 0;
  const openHub = expanded ? hubById.get(expanded) ?? null : null;
  const head = tree.head;
  const king = tree.headOfState ?? null;
  const dimHub = (hubId: string) => (hot !== null && hot !== hubId) || (openHub !== null && openHub.id !== hubId);
  const portrait = Math.round(centre.r * 1.12);
  const headRole = head ? shortRole(roleText(head, locale)) : null;
  const centreColor = tree.id === "kabinet" ? "var(--t-color-sector-regering)" : "var(--t-color-sector-staten-generaal)";

  return (
    <div className="absolute inset-0" role="group" aria-label={t("hierarchyAria", { name: tree.name, head: head?.name ?? "", n: tree.hubs.length })}>
      <svg aria-hidden="true" width={width} height={height} className="absolute inset-0">
        {layout.segments.map((segment, index) => {
          const full = segment.end - segment.start >= Math.PI * 2 - 0.001;
          const length = Math.max(1, Math.round(ring.r * (segment.end - segment.start)));
          const color = colorOfGroup(segment.group);
          const dim = hot !== null && !layout.hubs.some((hub) => hub.group === segment.group && hub.id === hot);
          return full ? (
            <circle key={segment.group + index} cx={centre.x} cy={centre.y} r={ring.r} fill="none" stroke={color} strokeWidth={ring.width} className="hv-fade" />
          ) : (
            <path
              key={segment.group + index}
              d={arcPath(centre, ring.r, segment.start, segment.end)}
              fill="none"
              stroke={color}
              strokeWidth={ring.width}
              className="hv-draw hv-lift"
              style={{ ["--len" as string]: length, ...delay(segmentDelay(index)), opacity: dim ? 0.4 : 1 }}
            />
          );
        })}
        {layout.hubs.map((placed) => {
          const hub = hubById.get(placed.id)!;
          const color = hubColor(hub);
          const spoke = connectors.hubs.get(placed.id);
          if (!spoke) return null;
          const start = groupDelay(placed.group);
          return (
            <g key={placed.id} className="hv-lift" style={{ opacity: dimHub(placed.id) ? 0.4 : 1 }}>
              <path d={spoke.d} fill="none" stroke={color} strokeWidth={stroke.hubBar} className="hv-draw" style={{ ["--len" as string]: spoke.length, ...delay(start - 120) }} />
              {spoke.fillets ? <path d={spoke.fillets} fill={color} className="hv-fade" style={delay(start + 120)} /> : null}
              {layout.members
                .filter((member) => member.hub === placed.id)
                .map((member) => {
                  const bar = connectors.members.get(memberKey(member.hub, member.id));
                  if (!bar) return null;
                  const at = start + 140 + member.index * 40;
                  return (
                    <g key={member.id}>
                      <path d={bar.d} fill="none" stroke={color} strokeWidth={stroke.memberBar} className="hv-draw" style={{ ["--len" as string]: bar.length, ...delay(at) }} />
                      {bar.fillets ? <path d={bar.fillets} fill={color} className="hv-fade" style={delay(at + 200)} /> : null}
                    </g>
                  );
                })}
            </g>
          );
        })}
      </svg>

      {head ? (
        <button
          type="button"
          onClick={() => {
            rememberTap(head.id, centre);
            onPick(head.id);
          }}
          title={[head.name, roleText(head, locale)].filter(Boolean).join("\n")}
          aria-label={[head.name, roleText(head, locale)].filter(Boolean).join(", ")}
          className="hv-pop absolute flex flex-col items-center overflow-hidden rounded-pill bg-surface text-center shadow-sm transition-transform hover:scale-[1.02]"
          style={{
            left: centre.x - centre.r,
            top: centre.y - centre.r,
            width: centre.r * 2,
            height: centre.r * 2,
            paddingTop: Math.round(centre.r * 0.13),
            boxShadow: `0 0 0 1px var(--t-color-line), 0 1px 3px rgb(0 0 0 / .12)`,
          }}
        >
          <RingPortrait name={head.name} image={head.image} size={portrait} color={centreColor} stroke={Math.max(3, stroke.member)} />
          <span
            className="mt-0.5 block w-[78%] truncate font-bold leading-tight text-ink"
            style={{ fontSize: metrics.name, lineHeight: `${metrics.lineName}px` }}
          >
            {head.name}
          </span>
          {headRole ? (
            <span className="block w-[70%] truncate text-ink-muted" style={{ fontSize: metrics.role - 0.5, lineHeight: `${metrics.lineRole}px` }}>
              {headRole}
            </span>
          ) : null}
        </button>
      ) : null}

      {king ? (
        <button
          type="button"
          onClick={() => {
            rememberTap(king.id, layout.crown);
            onPick(king.id);
          }}
          title={[king.name, roleText(king, locale), t("headOfState")].filter(Boolean).join("\n")}
          aria-label={[king.name, t("headOfState")].join(", ")}
          className="hv-pop absolute flex items-center justify-center rounded-pill transition-transform hover:scale-105"
          style={{ left: layout.crown.x - 22, top: layout.crown.y - 22, width: 44, height: 44, ...delay(90) }}
        >
          <RingPortrait name={king.name} image={king.image} size={layout.crown.r * 2} color="var(--t-color-line-strong)" stroke={2.5} />
        </button>
      ) : null}

      {layout.hubs.map((placed) => {
        const hub = hubById.get(placed.id)!;
        const color = hubColor(hub);
        const open = openHub?.id === hub.id;
        const name = hubName(hub, locale);
        const count = countText(t, hub);
        const size = placed.r * 2;
        const hidden = hub.people.length - placed.shown;
        const hit = Math.max(44, size);
        return (
          <div key={hub.id}>
            <button
              type="button"
              aria-expanded={open}
              aria-label={t("hubOpen", { name, count })}
              title={`${name}\n${count}`}
              onClick={() => onExpand(open ? null : hub.id)}
              onPointerEnter={() => setHot(hub.id)}
              onPointerLeave={() => setHot((current) => (current === hub.id ? null : current))}
              onFocus={() => setHot(hub.id)}
              onBlur={() => setHot((current) => (current === hub.id ? null : current))}
              className="hv-pop absolute flex items-center justify-center rounded-pill"
              style={{ left: placed.x - hit / 2, top: placed.y - hit / 2, width: hit, height: hit, ...delay(groupDelay(placed.group)) }}
            >
              <RingBadge
                size={size}
                color={color}
                stroke={stroke.hub}
                className="hv-lift"
                style={{
                  transform: hot === hub.id || open ? "scale(1.08)" : undefined,
                  opacity: dimHub(hub.id) ? 0.45 : 1,
                  backgroundColor: open || hot === hub.id ? `color-mix(in oklab, ${color} 14%, var(--t-color-surface))` : undefined,
                }}
              >
                {hub.kind === "ministry" ? (
                  <HubIcon hub={hub} size={Math.round(placed.r * 1.02)} strokeWidth={2} />
                ) : (
                  <span className="font-bold tabular-nums text-ink" style={{ fontSize: Math.max(10, Math.round(placed.r * 0.72)) }}>
                    {hub.seats}
                  </span>
                )}
              </RingBadge>
            </button>
            {hidden > 0 && placed.r >= 12 ? (
              <button
                type="button"
                onClick={() => onExpand(hub.id)}
                aria-label={t("moreIn", { n: hidden, name })}
                title={t("moreIn", { n: hidden, name })}
                className="hv-pop absolute flex items-center justify-center rounded-pill border bg-surface px-1 font-semibold tabular-nums text-ink-muted hover:text-ink"
                style={{
                  left: placed.more.x - 12,
                  top: placed.more.y - 9,
                  minWidth: 24,
                  height: 18,
                  fontSize: 10,
                  borderColor: color,
                  ...delay(groupDelay(placed.group) + 200),
                }}
              >
                +{hidden}
              </button>
            ) : null}
            {placed.chip ? (
              <span
                aria-hidden="true"
                className="hv-fade pointer-events-none absolute flex items-center justify-center truncate rounded-sm border bg-surface px-1 font-semibold text-ink"
                style={{
                  left: placed.chip.x,
                  top: placed.chip.y,
                  width: placed.chip.w,
                  height: placed.chip.h,
                  fontSize: metrics.role,
                  borderColor: color,
                  opacity: dimHub(hub.id) ? 0.4 : 1,
                  ...delay(groupDelay(placed.group) + 120),
                }}
              >
                {hub.short}
              </span>
            ) : null}
          </div>
        );
      })}

      {layout.members.map((member) => {
        const hub = hubById.get(member.hub)!;
        const placed = layout.hubs.find((entry) => entry.id === member.hub)!;
        const person = hub.people.find((entry) => entry.id === member.id)!;
        const color = hubColor(hub);
        const role = memberRole(person, hub, locale, leaderWord);
        const info = personInfo(person, hub, locale);
        const lit = anyLit && highlighted.has(person.id);
        const dim = (anyLit && !lit) || dimHub(hub.id);
        const hit = Math.max(40, member.r * 2);
        const tip = [person.name, role, info.party].filter(Boolean).join("\n");
        const d = delay(groupDelay(placed.group) + 200 + member.index * 45);
        const pick = () => {
          rememberTap(person.id, member);
          onPick(person.id);
        };
        const label = member.label;
        return (
          <div key={`${hub.id}${person.id}`}>
            <button
              type="button"
              onClick={pick}
              onPointerEnter={() => setHot(hub.id)}
              onPointerLeave={() => setHot((current) => (current === hub.id ? null : current))}
              title={tip}
              aria-label={[person.name, role, info.party].filter(Boolean).join(", ")}
              className="hv-pop absolute flex items-center justify-center rounded-pill"
              style={{ left: member.x - hit / 2, top: member.y - hit / 2, width: hit, height: hit, ...d }}
            >
              <span
                className={`hv-lift rounded-pill ${lit ? "outline outline-2 outline-offset-2 outline-accent" : ""}`}
                style={{ opacity: dim ? 0.4 : 1, transform: hot === hub.id ? "scale(1.06)" : undefined }}
              >
                <RingPortrait name={person.name} image={person.image} size={member.r * 2} color={color} stroke={stroke.member} tint={info.color} />
              </span>
            </button>
            {label ? (
              <span
                aria-hidden="true"
                onClick={pick}
                title={tip}
                className="hv-fade absolute cursor-pointer leading-tight"
                style={{
                  left: label.x,
                  top: label.y,
                  width: label.w,
                  height: label.h,
                  textAlign: label.align === "middle" ? "center" : label.align === "end" ? "right" : "left",
                  opacity: dim ? 0.4 : 1,
                  ...delay(groupDelay(placed.group) + 320 + member.index * 45),
                }}
              >
                <span className="block truncate font-bold text-ink" style={{ fontSize: metrics.name, lineHeight: `${metrics.lineName}px` }}>
                  {person.name}
                </span>
                {label.lines === 2 && role ? (
                  <span className="block truncate text-ink-muted" style={{ fontSize: metrics.role, lineHeight: `${metrics.lineRole}px` }}>
                    {role}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        );
      })}

      {openHub ? (
        <HubCard
          bundle={bundle}
          hub={openHub}
          locale={locale}
          highlighted={highlighted}
          onPick={onPick}
          onClose={() => onExpand(null)}
          style={{
            left: Math.max(8, centre.x - Math.min(170, width / 2 - 8)),
            width: Math.min(340, width - 16),
            top: Math.max(8, centre.y - Math.min(230, height / 2 - 8)),
            maxHeight: Math.min(460, height - 16),
          }}
        />
      ) : null}
    </div>
  );
}

function HubCard({
  bundle,
  hub,
  locale,
  highlighted,
  onPick,
  onClose,
  style,
}: {
  bundle: HierarchyBundle;
  hub: HierarchyHub;
  locale: "nl" | "en";
  highlighted: ReadonlySet<string>;
  onPick: (id: string) => void;
  onClose: () => void;
  style: CSSProperties;
}) {
  const t = useT("power");
  const headingId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const name = hubName(hub, locale);
  const color = hubColor(hub);
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [hub.id]);
  return (
    <section
      key={hub.id}
      role="region"
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      className="hv-pop absolute z-10 flex flex-col overflow-hidden rounded-md border border-line-strong bg-surface shadow-lg"
      style={style}
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b border-line px-3 py-2">
        <RingBadge size={36} color={color} stroke={3}>
          {hub.kind === "ministry" ? <HubIcon hub={hub} size={17} /> : <span className="text-[11px] font-semibold tabular-nums text-ink">{hub.seats}</span>}
        </RingBadge>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 id={headingId} className="line-clamp-2 text-sm font-semibold leading-tight text-ink">
            {hub.kind === "ministry" && hub.slug ? (
              <Link href={`/organisaties/${hub.slug}/`} className="hover:underline">
                {name}
              </Link>
            ) : (
              name
            )}
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-ink-faint">
            {hub.kind === "fractie" ? <PartyPill party={hub.name} /> : null}
            <span>{countText(t, hub)}</span>
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("hubClose", { name })}
          title={t("hubClose", { name })}
          className="tap-target flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-raised hover:text-ink"
        >
          <LucideIcon icon={X} size={16} />
        </button>
      </header>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1">
        {hub.people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            hub={hub}
            source={bundle.sources[person.src] ?? null}
            locale={locale}
            dim={highlighted.size > 0 && !highlighted.has(person.id)}
            onPick={onPick}
          />
        ))}
      </ul>
      {hub.kind === "fractie" && !hub.people.some((person) => person.leader) ? (
        <p className="shrink-0 border-t border-line px-3 py-1.5 text-xs text-ink-faint">{t("noLeader")}</p>
      ) : null}
    </section>
  );
}

/** A conic gradient of the ring's segments, for the stacked form's centre card. */
function ringGradient(tree: HierarchyTree): string {
  if (tree.hubs.length === 0) return "var(--t-color-line-strong)";
  const stops: string[] = [];
  if (tree.id === "kabinet") {
    const counts = new Map<string, number>();
    for (const hub of tree.hubs) counts.set(clusterOf(hub.id).id, (counts.get(clusterOf(hub.id).id) ?? 0) + 1);
    let at = 0;
    for (const cluster of MINISTRY_CLUSTERS) {
      const n = counts.get(cluster.id);
      if (!n) continue;
      const end = at + (n / tree.hubs.length) * 360;
      stops.push(`${clusterVar(cluster.id)} ${at + 1.5}deg ${end - 1.5}deg`, `transparent ${end - 1.5}deg ${end}deg`);
      at = end;
    }
  } else {
    const total = tree.hubs.reduce((sum, hub) => sum + (hub.seats ?? 0), 0) || 1;
    let at = 0;
    for (const hub of tree.hubs) {
      const end = at + ((hub.seats ?? 0) / total) * 360;
      stops.push(`${hubColor(hub)} ${at}deg ${Math.max(at, end - 0.8)}deg`, `transparent ${Math.max(at, end - 0.8)}deg ${end}deg`);
      at = end;
    }
  }
  return `conic-gradient(${stops.join(", ")})`;
}

/**
 * The narrow form, in the same language: the head in a card with the
 * segmented ring, then each hub as a card in its colour with its icon and a
 * row of its people, which opens into the full list.
 */
function Stacked({
  bundle,
  tree,
  locale,
  highlighted,
  onPick,
  initial,
}: {
  bundle: HierarchyBundle;
  tree: HierarchyTree;
  locale: "nl" | "en";
  highlighted: ReadonlySet<string>;
  onPick: (id: string) => void;
  initial: string | null;
}) {
  const t = useT("power");
  const [open, setOpen] = useState<Set<string>>(() => new Set(initial ? [initial] : []));
  const head = tree.head;
  const king = tree.headOfState ?? null;
  const baseId = useId();
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain px-3 pb-3 sm:px-4">
      <ExpandHint />
      {head ? (
        <div className="hv-pop flex min-w-0 items-center gap-3 rounded-md border border-line bg-surface p-2">
          <button type="button" onClick={() => onPick(head.id)} className="relative shrink-0 rounded-pill" aria-label={[head.name, roleText(head, locale)].filter(Boolean).join(", ")}>
            <span className="flex h-[68px] w-[68px] items-center justify-center rounded-pill" style={{ background: ringGradient(tree) }}>
              <span className="flex h-[56px] w-[56px] items-center justify-center rounded-pill bg-surface">
                <RingPortrait name={head.name} image={head.image} size={50} color="var(--t-color-line)" stroke={1} />
              </span>
            </span>
          </button>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <button type="button" onClick={() => onPick(head.id)} className="tap-row min-w-0 text-left">
              <span className="block truncate text-base font-bold text-ink">{head.name}</span>
              <span className="line-clamp-2 text-xs text-ink-muted">{roleText(head, locale)}</span>
            </button>
            {king ? (
              <button type="button" onClick={() => onPick(king.id)} className="tap-row mt-1 flex min-w-0 items-center gap-1.5 text-left text-xs text-ink-faint">
                <RingPortrait name={king.name} image={king.image} size={24} color="var(--t-color-line-strong)" stroke={1.5} />
                <span className="truncate">
                  {t("headOfState")}: {king.name}
                </span>
              </button>
            ) : null}
          </span>
          <SourceIconLink source={bundle.sources[head.src] ?? null} />
        </div>
      ) : null}
      <ul className="mt-2 flex flex-col gap-1.5">
        {tree.hubs.map((hub, index) => {
          const isOpen = open.has(hub.id);
          const color = hubColor(hub);
          const panelId = `${baseId}-${index}`;
          const name = hubName(hub, locale);
          const preview = hub.people.slice(0, hub.kind === "fractie" ? 3 : 4);
          return (
            <li
              key={hub.id}
              className="hv-fade overflow-hidden rounded-md border bg-surface"
              style={{ borderColor: `color-mix(in oklab, ${color} 55%, var(--t-color-line))`, ...delay(60 + index * 25) }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(hub.id)}
                className="tap-row flex w-full min-w-0 items-center gap-2.5 px-2.5 py-1.5 text-left hover:bg-surface-raised"
                style={{ boxShadow: `inset 4px 0 0 ${color}` }}
              >
                <RingBadge size={36} color={color} stroke={3.5}>
                  {hub.kind === "ministry" ? (
                    <HubIcon hub={hub} size={17} strokeWidth={2} />
                  ) : (
                    <span className="text-xs font-bold tabular-nums text-ink">{hub.seats}</span>
                  )}
                </RingBadge>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-semibold text-ink">
                    {hub.kind === "ministry" ? name.replace(/^(Ministerie van|Ministry of( the)?) /, "") : hub.short}
                  </span>
                  <span className="truncate text-xs text-ink-faint">{countText(t, hub)}</span>
                </span>
                {/* Who sits there, as a small stack of faces in the header, so a collapsed card is one row and the list shows many of them. */}
                {!isOpen ? (
                  <span aria-hidden="true" className="flex shrink-0 -space-x-2">
                    {preview.slice(0, 3).map((person) => (
                      <RingPortrait key={person.id} name={person.name} image={person.image} size={28} color={color} stroke={2} />
                    ))}
                  </span>
                ) : null}
                <Morph icon={isOpen ? ChevronUp : ChevronDown} size={16} className="shrink-0 text-ink-faint" />
              </button>
              <div id={panelId} hidden={!isOpen}>
                {isOpen ? (
                  <ul className="border-t border-line px-2 py-0.5">
                    {hub.people.map((person) => (
                      <PersonRow
                        key={person.id}
                        person={person}
                        hub={hub}
                        source={bundle.sources[person.src] ?? null}
                        locale={locale}
                        dim={highlighted.size > 0 && !highlighted.has(person.id)}
                        onPick={onPick}
                      />
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {tree.id === "kabinet" ? (
        <ul aria-label={t("clusterLegend")} className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
          {MINISTRY_CLUSTERS.filter((cluster) => tree.hubs.some((hub) => clusterOf(hub.id).id === cluster.id)).map((cluster) => (
            <li key={cluster.id} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-pill" style={{ backgroundColor: clusterVar(cluster.id) }} />
              {locale === "en" ? cluster.en : cluster.nl}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
