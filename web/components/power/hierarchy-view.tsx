"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, X } from "lucide";
import { Morph } from "@/components/icons/morph";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { PartyPill } from "@/components/party-pill";
import { useT } from "@/components/i18n/use-t";
import { orgEnGloss } from "@/lib/name-gloss";
import { arcPath, edgePoint, layoutRadial, radialFits, type RadialLayout } from "@/lib/hierarchy-layout";
import type { HierarchyBundle, HierarchyHub, HierarchyPerson, HierarchyTree, HierarchyTreeId } from "@/lib/hierarchy";
import { EntityMark } from "./parts";
import { HubIcon, PersonRow, SourceIconLink, hubColor, hubName, personInfo, roleText } from "./hierarchy-parts";

export const TREE_KEYS: Record<HierarchyTreeId, string> = {
  kabinet: "treeKabinet",
  "tweede-kamer": "treeTweedeKamer",
  "eerste-kamer": "treeEersteKamer",
};

/** Portraits shown around a hub before the rest wait for the hub to open. */
const SATELLITES: Record<HierarchyHub["kind"], number> = { ministry: 4, fractie: 1 };

/**
 * The hierarchy form of Verbanden: the head of a structure in the centre, its
 * parts as hubs on a ring, and the people of each part around its hub. A hub
 * opens into a card with everyone in it; a person opens their focus through
 * the selection store (`onPick`). Below `radialFits` it is a stacked list.
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
  const tree = bundle.trees.find((entry) => entry.id === treeId) ?? bundle.trees[0];
  const [barRef, barHeight] = useHeight<HTMLDivElement>();
  if (!tree) return null;
  const chartHeight = Math.max(0, height - barHeight);
  const radial = radialFits(width, chartHeight);
  const coalition = tree.parties ?? [];

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div ref={barRef} className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 px-3 pb-1 pt-1.5 sm:px-4">
        <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-ink-muted">
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
      </div>
      <div className="relative min-h-0 flex-1">
        {radial ? (
          <Radial
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
          <Stacked key={tree.id} bundle={bundle} tree={tree} locale={locale} highlighted={highlighted} onPick={onPick} initial={expanded} />
        )}
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
  /** With `compact`, the label shows from the sm breakpoint and is read by screen readers below it. */
  options: { value: string; label: string; icon?: React.ReactNode; compact?: boolean }[];
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
            title={option.compact ? option.label : undefined}
            onClick={() => onChange(option.value)}
            className={`tap-target flex items-center justify-center gap-1.5 rounded-[3px] px-2.5 py-1 text-xs font-medium transition-colors ${
              on ? "bg-surface-raised text-ink shadow-[inset_0_0_0_1px_var(--t-color-line-strong)]" : "text-ink-muted hover:text-ink"
            }`}
          >
            {option.icon}
            <span className={option.compact ? "max-sm:sr-only" : undefined}>{option.label}</span>
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

function headMeta(person: HierarchyPerson | null | undefined, locale: "nl" | "en"): string | null {
  return person ? roleText(person, locale) : null;
}

const MOTION_CSS = `
@keyframes hv-pop { from { opacity: 0; transform: scale(.72); } to { opacity: 1; transform: none; } }
@keyframes hv-in { from { opacity: 0; transform: translate(var(--fx, 0px), var(--fy, 0px)) scale(.6); } to { opacity: 1; transform: none; } }
@keyframes hv-fade { from { opacity: 0; } to { opacity: 1; } }
.hv-pop { animation: hv-pop 280ms var(--t-ease-decelerate) both; }
.hv-in { animation: hv-in 340ms var(--t-ease-decelerate) both; }
.hv-fade { animation: hv-fade 320ms var(--t-ease-standard) both; }
.hv-lift { transition: transform var(--t-duration-fast) var(--t-ease-standard), opacity var(--t-duration-base) var(--t-ease-standard); }
@media (prefers-reduced-motion: reduce) {
  .hv-pop, .hv-in, .hv-fade { animation: none; }
  .hv-lift { transition: none; }
}`;

/** Staggered entrance: the centre, then the ring, then hubs, then people. */
const delay = (ms: number): CSSProperties => ({ animationDelay: `${Math.round(ms)}ms` });

function Radial({
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
  const layout: RadialLayout = useMemo(
    () =>
      layoutRadial(
        tree.hubs.map((hub) => ({
          id: hub.id,
          weight: hub.kind === "fractie" ? hub.seats ?? 1 : 1,
          // A fractie shows its leader; without one on record it shows nobody rather than a stand-in.
          satellites: hub.kind === "fractie" ? (hub.people[0]?.leader ? 1 : 0) : Math.min(SATELLITES[hub.kind], hub.people.length),
          label: hub.short,
        })),
        { width, height },
      ),
    [tree, width, height],
  );
  const { centre, ring } = layout;
  const anyLit = highlighted.size > 0;
  const openHub = expanded ? tree.hubs.find((hub) => hub.id === expanded) ?? null : null;
  const n = tree.hubs.length;
  const hubDelay = (index: number) => 160 + (index / Math.max(1, n)) * 260;
  const head = tree.head;
  const headInfo = head ? personInfo(head, null, locale) : null;
  const king = tree.headOfState ?? null;
  const focusDim = (hubId: string) => (hot !== null && hot !== hubId) || (openHub !== null && openHub.id !== hubId);

  return (
    <div
      className="absolute inset-0"
      role="group"
      aria-label={t("hierarchyAria", { name: tree.name, head: head?.name ?? "", n })}
    >
      <style>{MOTION_CSS}</style>
      <svg aria-hidden="true" width={width} height={height} className="absolute inset-0">
        {layout.hubs.map((placed, index) => {
          const hub = tree.hubs[index];
          const color = hubColor(hub);
          const from = edgePoint(centre, placed, ring.r + ring.width / 2 + 1);
          const to = edgePoint(placed, centre, placed.r + 2);
          const dim = focusDim(hub.id);
          return (
            <g key={hub.id} className="hv-fade hv-lift" style={{ ...delay(90 + (index / n) * 200), opacity: dim ? 0.35 : 1 }}>
              <path d={arcPath(centre, ring.r, placed.start, placed.end)} fill="none" stroke={color} strokeWidth={ring.width} strokeLinecap="butt" />
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={color}
                strokeOpacity={hot === hub.id || openHub?.id === hub.id ? 0.95 : 0.45}
                strokeWidth={hot === hub.id ? 1.6 : 1}
              />
            </g>
          );
        })}
      </svg>

      {king ? (
        <button
          type="button"
          onClick={() => onPick(king.id)}
          title={[king.name, roleText(king, locale), t("headOfState")].filter(Boolean).join("\n")}
          aria-label={[king.name, t("headOfState")].join(", ")}
          className="hv-pop hv-lift absolute flex items-center justify-center rounded-pill hover:scale-105"
          style={{ left: layout.crown.x - 22, top: layout.crown.y - 22, width: 44, height: 44, ...delay(60) }}
        >
          <span className="rounded-pill" style={{ boxShadow: "0 0 0 2px var(--t-color-surface-inset), 0 0 0 3px var(--t-color-line-strong)" }}>
            <EntityMark info={personInfo(king, null, locale)} size={Math.round(layout.crown.r * 2)} />
          </span>
        </button>
      ) : null}

      {head && headInfo ? (
        <>
          <button
            type="button"
            onClick={() => onPick(head.id)}
            title={[head.name, headMeta(head, locale)].filter(Boolean).join("\n")}
            aria-label={[head.name, headMeta(head, locale)].filter(Boolean).join(", ")}
            className="hv-pop hv-lift absolute rounded-pill hover:scale-[1.03]"
            style={{ left: centre.x - centre.r, top: centre.y - centre.r, width: centre.r * 2, height: centre.r * 2 }}
          >
            <span
              className="block rounded-pill"
              style={{ boxShadow: `0 0 0 3px var(--t-color-surface-inset), 0 0 0 4.5px ${tree.id === "kabinet" ? "var(--t-color-sector-regering)" : "var(--t-color-sector-staten-generaal)"}` }}
            >
              <EntityMark info={{ ...headInfo, color: null }} size={Math.round(centre.r * 2)} />
            </span>
          </button>
          <p
            className="hv-fade pointer-events-none absolute max-w-[11rem] -translate-x-1/2 truncate rounded-sm bg-surface-inset px-1.5 text-center text-xs font-semibold leading-5 text-ink"
            style={{ left: centre.x, top: centre.y + centre.r + 5, ...delay(80) }}
          >
            {head.name}
          </p>
        </>
      ) : null}

      {layout.labels
        ? layout.hubs.map((placed, index) => {
            const hub = tree.hubs[index];
            if (!placed.showLabel) return null;
            return (
              <span
                key={hub.id}
                aria-hidden="true"
                className="hv-fade hv-lift pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm bg-surface-inset px-1 text-[11px] font-medium leading-4 text-ink-muted"
                style={{ left: placed.label.x, top: placed.label.y, opacity: focusDim(hub.id) ? 0.35 : 1, ...delay(hubDelay(index) + 60) }}
              >
                {hub.short}
              </span>
            );
          })
        : null}

      {layout.hubs.map((placed, index) => {
        const hub = tree.hubs[index];
        const color = hubColor(hub);
        const open = openHub?.id === hub.id;
        const name = hubName(hub, locale);
        const count = countText(t, hub);
        const size = placed.r * 2;
        const fx = centre.x - placed.x;
        const fy = centre.y - placed.y;
        return (
          <button
            key={hub.id}
            type="button"
            aria-expanded={open}
            aria-label={t("hubOpen", { name, count })}
            title={`${name}\n${count}`}
            onClick={() => onExpand(open ? null : hub.id)}
            onPointerEnter={() => setHot(hub.id)}
            onPointerLeave={() => setHot((current) => (current === hub.id ? null : current))}
            onFocus={() => setHot(hub.id)}
            onBlur={() => setHot((current) => (current === hub.id ? null : current))}
            className="hv-in absolute flex items-center justify-center"
            style={{
              left: placed.x - Math.max(22, placed.r),
              top: placed.y - Math.max(22, placed.r),
              width: Math.max(44, size),
              height: Math.max(44, size),
              ["--fx" as string]: `${fx * 0.5}px`,
              ["--fy" as string]: `${fy * 0.5}px`,
              ...delay(hubDelay(index)),
            }}
          >
            <span
              className="hv-lift flex items-center justify-center rounded-pill border-2 text-ink"
              style={{
                width: size,
                height: size,
                borderColor: color,
                backgroundColor: `color-mix(in oklab, ${color} ${open || hot === hub.id ? 30 : 16}%, var(--t-color-surface))`,
                transform: hot === hub.id || open ? "scale(1.08)" : undefined,
                opacity: focusDim(hub.id) ? 0.4 : 1,
              }}
            >
              {hub.kind === "ministry" ? (
                <HubIcon hub={hub} size={Math.max(12, Math.round(placed.r * 0.95))} />
              ) : size >= 26 ? (
                <span className="text-[11px] font-semibold tabular-nums">{hub.seats}</span>
              ) : null}
            </span>
          </button>
        );
      })}

      {layout.hubs.map((placed, index) => {
        const hub = tree.hubs[index];
        return placed.satellites.map((point, i) => {
          const person = hub.people[i];
          if (!person) return null;
          const info = personInfo(person, hub, locale);
          const lit = anyLit && highlighted.has(person.id);
          const dim = (anyLit && !lit) || focusDim(hub.id);
          const hit = Math.max(44, layout.sat + 6);
          const role = person.leader ? t("leader") : roleText(person, locale);
          return (
            <button
              key={`${hub.id}${person.id}`}
              type="button"
              onClick={() => onPick(person.id)}
              onPointerEnter={() => setHot(hub.id)}
              onPointerLeave={() => setHot((current) => (current === hub.id ? null : current))}
              title={[person.name, role, info.party].filter(Boolean).join("\n")}
              aria-label={[person.name, role, info.party].filter(Boolean).join(", ")}
              className="hv-in absolute flex items-center justify-center rounded-pill"
              style={{
                left: point.x - hit / 2,
                top: point.y - hit / 2,
                width: hit,
                height: hit,
                ["--fx" as string]: `${(placed.x - point.x) * 0.8}px`,
                ["--fy" as string]: `${(placed.y - point.y) * 0.8}px`,
                ...delay(hubDelay(index) + 180 + i * 40),
              }}
            >
              <span
                className={`hv-lift rounded-pill ${lit ? "outline outline-2 outline-offset-2 outline-accent" : ""}`}
                style={{ opacity: dim ? 0.35 : 1, transform: hot === hub.id ? "scale(1.1)" : undefined }}
              >
                <EntityMark info={info} size={layout.sat} />
              </span>
            </button>
          );
        });
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
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border-2 text-ink"
          style={{ borderColor: color, backgroundColor: `color-mix(in oklab, ${color} 20%, var(--t-color-surface))` }}
        >
          {hub.kind === "ministry" ? <HubIcon hub={hub} size={16} /> : <span className="text-[11px] font-semibold tabular-nums">{hub.seats}</span>}
        </span>
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

/** The narrow form: the head as a card, then each hub as a section that opens. */
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
  const card = (person: HierarchyPerson, size: number, label?: string) => {
    const info = personInfo(person, null, locale);
    return (
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onPick(person.id)}
          className="tap-row flex min-w-0 flex-1 items-center gap-3 rounded-sm px-1 py-1.5 text-left hover:bg-surface-raised"
        >
          <EntityMark info={{ ...info, color: null }} size={size} />
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            {label ? <span className="text-xs text-ink-faint">{label}</span> : null}
            <span className={`truncate font-semibold text-ink ${size > 40 ? "text-base" : "text-sm"}`}>{person.name}</span>
            {info.meta ? <span className="line-clamp-2 text-xs text-ink-muted">{info.meta}</span> : null}
          </span>
        </button>
        <SourceIconLink source={bundle.sources[person.src] ?? null} />
      </div>
    );
  };
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain px-3 pb-3 sm:px-4">
      <style>{MOTION_CSS}</style>
      <div className="hv-fade rounded-md border border-line bg-surface px-2 py-1.5">
        {king ? card(king, 32, t("headOfState")) : null}
        {head ? <div className={king ? "border-t border-line" : ""}>{card(head, 52)}</div> : null}
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {tree.hubs.map((hub, index) => {
          const isOpen = open.has(hub.id);
          const color = hubColor(hub);
          const panelId = `${baseId}-${index}`;
          const name = hubName(hub, locale);
          return (
            <li key={hub.id} className="hv-fade rounded-md border border-line bg-surface" style={delay(60 + index * 25)}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(hub.id)}
                className="tap-row flex w-full min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-surface-raised"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border-2 text-ink"
                  style={{ borderColor: color, backgroundColor: `color-mix(in oklab, ${color} 18%, var(--t-color-surface))` }}
                >
                  {hub.kind === "ministry" ? <HubIcon hub={hub} size={15} /> : <span className="text-[11px] font-semibold tabular-nums">{hub.seats}</span>}
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-ink">{hub.kind === "ministry" ? name.replace(/^(Ministerie van|Ministry of( the)?) /, "") : hub.short}</span>
                  <span className="truncate text-xs text-ink-faint">
                    {hub.kind === "fractie" && hub.people[0]?.leader ? `${hub.people[0].name} · ${countText(t, hub)}` : countText(t, hub)}
                  </span>
                </span>
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
    </div>
  );
}
