"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide";
import { Avatar } from "@/components/avatar";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { PartyPill } from "@/components/party-pill";
import { useT } from "@/components/i18n/use-t";
import { clusterOf, clusterVar, type HierarchyBundle, type HierarchyHub, type HierarchyPerson, type HierarchyTree } from "@/lib/hierarchy";
import { formatDutchDate } from "./model";
import { RingPortrait, SourceIconLink, hubColor, personInfo, rememberTap, roleText, shortRole } from "./hierarchy-parts";

/** Seats of at least this many pixels across show portraits; smaller ones are dots. */
export const PORTRAIT_SEAT = 24;
/** From this width the legend stands beside the hall instead of under it. */
const SIDE_LEGEND = 760;

type Spot = {
  key: string;
  kind: "seat" | "bench" | "chair";
  x: number;
  y: number;
  r: number;
  person: string | null;
  /** Fractie hub or ministry id. */
  hub: string;
  emptyChair?: boolean;
};

/**
 * The plenary hall of a Kamer (ADR 0018, amendment 3): every seat where the
 * chamber's floor plan puts it, each seat the member who holds it, the chair,
 * and the kabinet on its bench facing the members. The legend lists the
 * fracties by coalition and opposition; hovering one lights its seats, and a
 * click opens its card. A mouse click on a seat opens the member's focus; a
 * tap shows the member's face first, with a way to step through the fractie.
 */
export function ChamberHallView({
  bundle,
  tree,
  width,
  height,
  locale,
  highlighted,
  onPick,
  onExpand,
  onShowKabinet,
}: {
  bundle: HierarchyBundle;
  tree: HierarchyTree;
  width: number;
  height: number;
  locale: "nl" | "en";
  highlighted: ReadonlySet<string>;
  onPick: (id: string) => void;
  onExpand: (hub: string | null) => void;
  onShowKabinet: () => void;
}) {
  const t = useT("power");
  const hall = tree.hall!;
  const kabinet = bundle.trees.find((entry) => entry.id === "kabinet") ?? null;
  const side = width >= SIDE_LEGEND;
  const [areaRef, area] = useSize<HTMLDivElement>();
  const [hot, setHot] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [card, setCard] = useState<string | null>(null);

  const hubById = useMemo(() => new Map(tree.hubs.map((hub) => [hub.id, hub])), [tree]);
  const people = useMemo(() => {
    const map = new Map<string, { person: HierarchyPerson; hub: HierarchyHub | null }>();
    for (const hub of tree.hubs) for (const person of hub.people) map.set(person.id, { person, hub });
    for (const hub of kabinet?.hubs ?? []) for (const person of hub.people) if (!map.has(person.id)) map.set(person.id, { person, hub });
    if (kabinet?.head && !map.has(kabinet.head.id)) map.set(kabinet.head.id, { person: kabinet.head, hub: null });
    if (tree.head && !map.has(tree.head.id)) map.set(tree.head.id, { person: tree.head, hub: null });
    return map;
  }, [tree, kabinet]);

  // Scale the hall into the area, centred.
  const pad = 6;
  const scale = Math.max(0, Math.min((area.width - pad * 2) / hall.width, (area.height - pad * 2) / hall.height));
  const offsetX = (area.width - hall.width * scale) / 2;
  const offsetY = (area.height - hall.height * scale) / 2;
  const px = (value: number) => value * scale;
  const at = (point: { x: number; y: number }) => ({ x: offsetX + point.x * scale, y: offsetY + point.y * scale });
  const portraits = hall.r * 2 * scale >= PORTRAIT_SEAT;
  /** A label's left edge kept inside the area, for a label about `half` pixels either side of its centre. */
  const inside = (x: number, half: number) => Math.min(Math.max(x, half + 2), Math.max(half + 2, area.width - half - 2));
  // Below the side legend the hall keeps its shape and the column scrolls to the legend.
  const stacked = !side;
  // A tall hall (the Eerste Kamer) is capped at the canvas height where there is room for it.
  const hallHeight = stacked ? Math.max(160, Math.min(Math.round(((width - 16) * hall.height) / hall.width), Math.max(height - 12, 280))) : undefined;

  const spots = useMemo<Spot[]>(() => {
    const list: Spot[] = hall.seats.map((seat, index) => ({
      key: `s${index}`,
      kind: "seat",
      x: seat.x,
      y: seat.y,
      r: seat.chair && seat.person ? hall.r * 1.25 : hall.r,
      person: seat.person,
      hub: seat.hub,
      emptyChair: Boolean(seat.chair && !seat.person),
    }));
    hall.cabinet.seats.forEach((seat, index) => list.push({ key: `k${index}`, kind: "bench", x: seat.x, y: seat.y, r: hall.cabinet.r, person: seat.person, hub: seat.hub }));
    if (hall.chair) list.push({ key: "chair", kind: "chair", x: hall.chair.x, y: hall.chair.y, r: hall.chair.r, person: hall.chair.person, hub: "chair" });
    return list;
  }, [hall]);
  const spotOf = useMemo(() => new Map(spots.filter((spot) => spot.person).map((spot) => [spot.person!, spot])), [spots]);

  const colorOf = (spot: Spot): string => {
    if (spot.kind === "bench") return clusterVar(clusterOf(spot.hub).id);
    if (spot.kind === "chair") return "var(--t-color-sector-staten-generaal)";
    const hub = hubById.get(spot.hub);
    return hub ? hubColor(hub) : "var(--t-color-line-strong)";
  };
  const litHub = (spot: Spot): boolean => {
    if (hot === null) return true;
    if (hot === "coalition") return spot.kind === "seat" && Boolean(hubById.get(spot.hub)?.coalition);
    if (hot === "kabinet") return spot.kind === "bench";
    return spot.hub === hot;
  };
  const anyLit = highlighted.size > 0;

  /** The spot nearest to a point in the area, within a seat pitch. */
  const nearest = (clientX: number, clientY: number, element: HTMLElement): Spot | null => {
    if (scale <= 0) return null;
    const box = element.getBoundingClientRect();
    const x = (clientX - box.left - offsetX) / scale;
    const y = (clientY - box.top - offsetY) / scale;
    let best: Spot | null = null;
    let bestDistance = Infinity;
    for (const spot of spots) {
      const distance = Math.hypot(spot.x - x, spot.y - y) - spot.r;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = spot;
      }
    }
    return best && bestDistance < 0.6 ? best : null;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const spot = nearest(event.clientX, event.clientY, event.currentTarget);
    setHover(spot?.person ?? null);
    setHot(spot ? (spot.kind === "seat" ? spot.hub : spot.kind === "bench" ? "kabinet" : null) : null);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const spot = nearest(event.clientX, event.clientY, event.currentTarget);
    if (!spot?.person) {
      setCard(null);
      return;
    }
    if (event.pointerType === "mouse") {
      const point = at(spot);
      rememberTap(spot.person, { x: point.x, y: point.y, r: px(spot.r) });
      onPick(spot.person);
    } else {
      setCard(spot.person);
    }
  };

  // Close the card when the chamber changes.
  const [seenTree, setSeenTree] = useState(tree.id);
  if (seenTree !== tree.id) {
    setSeenTree(tree.id);
    setCard(null);
    setHot(null);
  }

  const coalitionHubs = tree.hubs.filter((hub) => hub.coalition).sort((x, y) => (y.seats ?? 0) - (x.seats ?? 0));
  const oppositionHubs = tree.hubs.filter((hub) => !hub.coalition).sort((x, y) => (y.seats ?? 0) - (x.seats ?? 0));
  const seatsOf = (hubs: HierarchyHub[]) => hubs.reduce((sum, hub) => sum + (hub.seats ?? 0), 0);
  const source = bundle.sources[hall.src] ?? null;
  const basisText =
    hall.basis === "person"
      ? t("hallBasisPerson", { date: formatDutchDate(hall.asOf) })
      : hall.basis === "fractie"
        ? t("hallBasisFractie", { date: formatDutchDate(hall.asOf) })
        : t("hallBasisBlocks", { date: formatDutchDate(hall.asOf) });

  const labelOf = (spot: Spot) => {
    const entry = spot.person ? people.get(spot.person) : null;
    if (!entry) return spot.emptyChair ? t("hallChairSeat") : "";
    const hub = spot.kind === "seat" ? hubById.get(spot.hub) ?? null : entry.hub;
    const role = spot.kind === "chair" || (spot.kind === "seat" && spot.person === tree.head?.id) ? t("hallChair") : roleText(entry.person, locale);
    return [entry.person.name, hub?.kind === "fractie" ? hub.short : null, role].filter(Boolean).join(", ");
  };

  const legendRow = (hub: HierarchyHub) => {
    const leader = hub.people.find((person) => person.leader) ?? null;
    const color = hubColor(hub);
    return (
      <li key={hub.id}>
        <button
          type="button"
          onClick={() => onExpand(hub.id)}
          onPointerEnter={() => setHot(hub.id)}
          onPointerLeave={() => setHot((current) => (current === hub.id ? null : current))}
          onFocus={() => setHot(hub.id)}
          onBlur={() => setHot((current) => (current === hub.id ? null : current))}
          aria-label={t("hubOpen", { name: hub.name, count: hub.seats === 1 ? t("seats1") : t("seatsN", { n: hub.seats ?? 0 }) })}
          className={`tap-row flex w-full min-w-0 items-center gap-2 rounded-sm px-1.5 text-left hover:bg-surface-raised ${side ? "py-1" : "py-0.5"} ${
            hot !== null && hot !== hub.id && !(hot === "coalition" && hub.coalition) ? "opacity-50" : ""
          }`}
        >
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-pill" style={{ backgroundColor: color }} />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink" title={hub.name}>
            {hub.short}
          </span>
          {side && leader ? (
            <span className="flex min-w-0 max-w-[45%] items-center gap-1" title={`${leader.name}, ${t("leader")}`}>
              <Avatar name={leader.name} url={leader.image} color={hub.color ?? null} size={20} />
              <span className="truncate text-[11px] text-ink-faint">{leader.name}</span>
            </span>
          ) : null}
          <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-muted">{hub.seats}</span>
        </button>
      </li>
    );
  };

  const groupHeader = (key: "coalition" | "opposition", seats: number) => (
    <li key={key} className="mt-1 first:mt-0">
      <button
        type="button"
        onPointerEnter={() => key === "coalition" && setHot("coalition")}
        onPointerLeave={() => setHot((current) => (current === "coalition" ? null : current))}
        onFocus={() => key === "coalition" && setHot("coalition")}
        onBlur={() => setHot((current) => (current === "coalition" ? null : current))}
        className="flex w-full items-baseline justify-between gap-2 px-1.5 pb-0.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
      >
        <span>{key === "coalition" ? t("hallCoalition") : t("hallOpposition")}</span>
        <span className="tabular-nums">{t("hallSeatsOf", { n: seats, total: hall.total })}</span>
      </button>
    </li>
  );

  const legend = (
    <div className={side ? "flex min-h-0 w-[250px] shrink-0 flex-col border-l border-line pl-2" : "shrink-0 border-t border-line pb-2 pt-1"}>
      <p className="px-1.5 pb-1 text-xs text-ink-muted">
        <span className="font-semibold text-ink">{t("hallMajority", { n: hall.majority })}</span>
      </p>
      <ul className={side ? "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" : "grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-2"}>
        {coalitionHubs.length > 0 ? (
          <>
            {side ? groupHeader("coalition", seatsOf(coalitionHubs)) : null}
            {coalitionHubs.map(legendRow)}
            {side ? groupHeader("opposition", seatsOf(oppositionHubs)) : null}
          </>
        ) : null}
        {oppositionHubs.map(legendRow)}
      </ul>
      {!side && coalitionHubs.length > 0 ? (
        <p className="px-1.5 pt-0.5 text-[11px] text-ink-faint">
          {t("hallCoalition")} {coalitionHubs.map((hub) => hub.short).join(", ")}: {t("hallSeatsOf", { n: seatsOf(coalitionHubs), total: hall.total })}
        </p>
      ) : null}
    </div>
  );

  const cardSpot = card ? spotOf.get(card) ?? null : null;
  const hoverSpot = !cardSpot && hover ? spotOf.get(hover) ?? null : null;
  const peek = cardSpot ?? hoverSpot;
  /** Members of the peeked spot's group in seat order, for stepping through. */
  const group = useMemo(() => {
    if (!cardSpot) return [];
    return spots
      .filter((spot) => spot.person && spot.kind === cardSpot.kind && (spot.kind !== "seat" || spot.hub === cardSpot.hub))
      .map((spot) => spot.person!);
  }, [cardSpot, spots]);

  return (
    <div className={`absolute inset-0 flex ${side ? "flex-row gap-2 px-2 pb-1" : "flex-col overflow-y-auto overscroll-contain px-2"}`}>
      <div className={`flex min-w-0 flex-col ${stacked ? "shrink-0" : "min-h-0 flex-1"}`}>
        <div
          ref={areaRef}
          role="group"
          aria-label={t("hallAria", { name: tree.name, n: hall.total })}
          className={`relative min-w-0 touch-manipulation select-none ${stacked ? "shrink-0" : "min-h-0 flex-1"}`}
          style={{ height: hallHeight }}
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            setHover(null);
            setHot(null);
          }}
          onPointerUp={onPointerUp}
        >
          <svg aria-hidden="true" width={area.width} height={area.height} className="absolute inset-0">
            {spots.map((spot) => {
              const point = at(spot);
              const color = colorOf(spot);
              const lit = litHub(spot) && (!anyLit || (spot.person !== null && highlighted.has(spot.person)));
              const radius = Math.max(1.5, px(spot.r));
              if (spot.emptyChair || !spot.person) {
                return (
                  <circle
                    key={spot.key}
                    cx={point.x}
                    cy={point.y}
                    r={Math.max(1, radius - 1)}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    opacity={lit ? 1 : 0.3}
                  />
                );
              }
              if (portraits || spot.kind === "chair") return null;
              return (
                <circle
                  key={spot.key}
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  fill={color}
                  className="hv-lift"
                  opacity={lit ? 1 : 0.25}
                  stroke={peek === spot ? "var(--t-color-ink)" : "none"}
                  strokeWidth={2}
                />
              );
            })}
          </svg>
          {spots.map((spot) => {
            if (!spot.person || (!portraits && spot.kind !== "chair")) return null;
            const entry = people.get(spot.person);
            if (!entry) return null;
            const point = at(spot);
            const size = Math.max(12, Math.round(px(spot.r) * 2));
            const lit = litHub(spot) && (!anyLit || highlighted.has(spot.person));
            const tint = personInfo(entry.person, spot.kind === "seat" ? hubById.get(spot.hub) ?? null : null, locale).color;
            return (
              <span
                key={spot.key}
                aria-hidden="true"
                className="hv-lift pointer-events-none absolute"
                style={{ left: point.x - size / 2, top: point.y - size / 2, opacity: lit ? 1 : 0.3, transform: peek === spot ? "scale(1.12)" : undefined }}
              >
                <RingPortrait name={entry.person.name} image={entry.person.image} size={size} color={colorOf(spot)} stroke={Math.max(1.5, size * 0.09)} tint={tint} />
              </span>
            );
          })}
          {hall.chair && scale > 0 ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-ink-muted"
              style={{ left: inside(at(hall.chair).x, 34), top: at(hall.chair).y + px(hall.chair.r) + 2 }}
            >
              {t("hallChair")}
            </span>
          ) : null}
          {!hall.chair && scale > 0
            ? hall.seats
                .filter((seat) => seat.chair && seat.person)
                .map((seat) => (
                  <span
                    key="chair-label"
                    aria-hidden="true"
                    className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-ink-muted"
                    style={{ left: inside(at(seat).x, 34), top: at(seat).y + px(hall.r * 1.25) + 2 }}
                  >
                    {t("hallChair")}
                  </span>
                ))
            : null}
          {scale > 0 && hall.cabinet.seats.length > 0 ? (
            <button
              type="button"
              onClick={onShowKabinet}
              onPointerUp={(event) => event.stopPropagation()}
              onPointerEnter={() => setHot("kabinet")}
              onPointerLeave={() => setHot((current) => (current === "kabinet" ? null : current))}
              title={t("hallMinistriesTitle")}
              className="tap-target absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-pill border border-line-strong bg-surface px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted hover:border-accent hover:text-ink"
              style={{ left: inside(at(hall.cabinet.label).x, 48), top: at(hall.cabinet.label).y }}
            >
              {t("hallBench")}
              <LucideIcon icon={ChevronRight} size={12} />
            </button>
          ) : null}
          {peek?.person ? (
            <SeatCard
              key={peek.person}
              spot={peek}
              person={people.get(peek.person)?.person ?? null}
              hub={peek.kind === "seat" ? hubById.get(peek.hub) ?? null : people.get(peek.person)?.hub ?? null}
              chair={peek.kind === "chair" || peek.person === tree.head?.id}
              sticky={Boolean(cardSpot)}
              anchor={at(peek)}
              radius={px(peek.r)}
              area={area}
              color={colorOf(peek)}
              locale={locale}
              position={group.indexOf(peek.person)}
              count={group.length}
              onStep={(delta) => {
                const index = group.indexOf(peek.person!);
                const next = group[(index + delta + group.length) % group.length];
                if (next) setCard(next);
              }}
              onOpen={() => {
                const point = at(peek);
                rememberTap(peek.person!, { x: point.x, y: point.y, r: px(peek.r) });
                onPick(peek.person!);
              }}
              onClose={() => setCard(null)}
            />
          ) : null}
          <ul className="sr-only">
            {spots
              .filter((spot) => spot.person)
              .map((spot) => (
                <li key={spot.key}>
                  <button type="button" tabIndex={-1} onClick={() => onPick(spot.person!)}>
                    {labelOf(spot)}
                  </button>
                </li>
              ))}
          </ul>
        </div>
        <p className="flex shrink-0 items-start gap-1 px-1 pb-1 pt-0.5 text-[11px] leading-snug text-ink-faint">
          <span className="min-w-0 flex-1">
            {basisText} {t("hallBenchNote")}
          </span>
          <SourceIconLink source={source} />
        </p>
      </div>
      {legend}
    </div>
  );
}

function SeatCard({
  spot,
  person,
  hub,
  chair,
  sticky,
  anchor,
  radius,
  area,
  color,
  locale,
  position,
  count,
  onStep,
  onOpen,
  onClose,
}: {
  spot: Spot;
  person: HierarchyPerson | null;
  hub: HierarchyHub | null;
  chair: boolean;
  sticky: boolean;
  anchor: { x: number; y: number };
  radius: number;
  area: { width: number; height: number };
  color: string;
  locale: "nl" | "en";
  position: number;
  count: number;
  onStep: (delta: number) => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  const t = useT("power");
  const openRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (sticky) openRef.current?.focus({ preventScroll: true });
  }, [sticky, person?.id]);
  if (!person) return null;
  const info = personInfo(person, hub?.kind === "fractie" ? hub : null, locale);
  const role = chair ? t("hallChair") : spot.kind === "seat" ? (person.leader ? t("leader") : null) : shortRole(roleText(person, locale));
  const width = Math.min(260, area.width - 16);
  const height = sticky ? 148 : 92;
  const left = Math.min(Math.max(8, anchor.x - width / 2), area.width - width - 8);
  const below = anchor.y + radius + 8;
  const top = below + height <= area.height - 4 ? below : Math.max(4, anchor.y - radius - 8 - height);
  return (
    <div
      role={sticky ? "dialog" : undefined}
      aria-label={sticky ? person.name : undefined}
      onPointerUp={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
        if (event.key === "ArrowRight") onStep(1);
        if (event.key === "ArrowLeft") onStep(-1);
      }}
      className={`hv-pop absolute z-10 flex flex-col gap-2 rounded-md border border-line-strong bg-surface p-2.5 shadow-lg ${sticky ? "" : "pointer-events-none"}`}
      style={{ left, top, width }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <RingPortrait name={person.name} image={person.image} size={56} color={color} stroke={3} tint={info.color} />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="line-clamp-2 text-sm font-semibold text-ink">{person.name}</span>
          {role ? <span className="line-clamp-2 text-xs text-ink-muted">{role}</span> : null}
          {info.party ? <PartyPill party={info.party} className="mt-1 self-start" /> : null}
        </div>
        {sticky ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("hallClose")}
            className="tap-target flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-sm text-ink-muted hover:bg-surface-raised hover:text-ink"
          >
            <LucideIcon icon={X} size={16} />
          </button>
        ) : null}
      </div>
      {sticky ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onStep(-1)}
            disabled={count < 2}
            aria-label={t("hallPrev")}
            className="tap-target flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-line text-ink-muted hover:text-ink disabled:opacity-40"
          >
            <LucideIcon icon={ChevronLeft} size={16} />
          </button>
          <button
            ref={openRef}
            type="button"
            onClick={onOpen}
            className="tap-target flex h-11 min-w-0 flex-1 items-center justify-center rounded-sm bg-accent px-2 text-xs font-semibold text-accent-ink transition-fast hover:brightness-110"
          >
            <span className="truncate">{t("hallOpen")}</span>
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            disabled={count < 2}
            aria-label={t("hallNext")}
            className="tap-target flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-line text-ink-muted hover:text-ink disabled:opacity-40"
          >
            <LucideIcon icon={ChevronRight} size={16} />
          </button>
        </div>
      ) : null}
      {sticky && count > 1 ? (
        <span className="sr-only" aria-live="polite">
          {position + 1} / {count}
        </span>
      ) : null}
    </div>
  );
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const box = element.getBoundingClientRect();
      setSize((current) =>
        Math.round(box.width) === current.width && Math.round(box.height) === current.height
          ? current
          : { width: Math.round(box.width), height: Math.round(box.height) },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}
