"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import { BAR_KINDS, type BarKind, type HistogramBucket } from "@/lib/change-bar-kinds";
import { DOT_GAP_PX, DOT_PX, filterByKind, packDayDots, packedCount, STRIP_PX, STRIP_ROWS } from "@/lib/change-dot-pack";
import type { EntryCounts } from "@/lib/change-feed";
import { nearestActiveIndex } from "@/lib/change-hit";
import type { ChangeFilterValue } from "@/lib/change-url-state";
import { establishedEn } from "@/lib/name-gloss";
import { CHANGE_LABEL_TONE, CHANGE_TONE, ChangeKindGlyph } from "./change-glyph";
import { useCountsText } from "./counts-text";
import { formatIsoDate } from "./local-date";

export type { HistogramBucket } from "@/lib/change-bar-kinds";

const DISPLAY_KIND = {
  appointment: "appointment",
  acting: "acting",
  departure: "departure",
  vacancy: "vacancy",
  other: "structural",
} as const;

const KIND_LABEL: Record<BarKind, string> = {
  appointment: "filterAppointments",
  acting: "filterActing",
  departure: "filterDepartures",
  vacancy: "filterVacancies",
  other: "histKindOther",
};

/** The kinds the legend can filter on; "other" has no filter. */
const LEGEND_KINDS = ["appointment", "acting", "departure", "vacancy"] as const;

const TIP_WIDTH = 224;
const TIP_EDGE = 8;
/** Below this many pixels above the chart in the viewport, the tooltip opens underneath. */
const TIP_FLIP_SPACE = 150;

type Tip = { index: number; left: number; below: boolean };

type DayProps = {
  bucket: HistogramBucket;
  index: number;
  columns: BarKind[][];
  label: string;
  active: boolean;
  dimmed: boolean;
  tabbable: boolean;
  href: string | null;
  onPick: (date: string) => void;
  onFocusBar: (index: number) => void;
};

const COLUMN =
  "group relative z-[1] flex h-full min-w-0 flex-1 items-end justify-center overflow-visible rounded-xs outline-offset-1 hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-focus";

function Dot({ kind, delay }: { kind: BarKind; delay: number }) {
  const display = DISPLAY_KIND[kind];
  const hollow = kind === "vacancy";
  return (
    <span
      aria-hidden="true"
      className={`grow-seat block shrink-0 rounded-full ${CHANGE_TONE[display]} ${
        hollow ? "border-[1.5px] border-current bg-canvas" : "bg-current"
      }`}
      style={{ width: DOT_PX, height: DOT_PX, "--d": `${delay}ms` } as CSSProperties}
    />
  );
}

/** One day: a full-height column (the hit area) with a cluster of marks at its foot. */
const Day = memo(function Day({ bucket, index, columns, label, active, dimmed, tabbable, href, onPick, onFocusBar }: DayProps) {
  const empty = columns.length === 0;
  const cluster = empty ? null : (
    <span
      className={`absolute bottom-1 left-1/2 flex -translate-x-1/2 items-end transition-opacity duration-150 ${
        dimmed ? "opacity-35" : "group-hover:brightness-90"
      }`}
      style={{ gap: DOT_GAP_PX }}
    >
      {columns.map((col, c) => (
        <span key={c} className="flex flex-col-reverse" style={{ gap: DOT_GAP_PX }}>
          {col.map((kind, r) => (
            <Dot key={r} kind={kind} delay={Math.min(360, index * 4 + (c * STRIP_ROWS + r) * 16)} />
          ))}
        </span>
      ))}
    </span>
  );
  const ring = active ? "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-pill after:bg-ink" : "";
  if (empty) {
    // A quiet day is no control: it stays out of the tab order and the accessibility tree.
    return (
      <span aria-hidden="true" data-day={bucket.date} data-empty="" className={`${COLUMN} pointer-events-none`}>
        {cluster}
      </span>
    );
  }
  const common = {
    "data-day": bucket.date,
    "aria-label": label,
    tabIndex: tabbable ? 0 : -1,
    onFocus: () => onFocusBar(index),
    className: `${COLUMN} cursor-pointer ${ring}`,
  };
  if (href !== null) {
    return (
      <Link {...common} href={href} scroll={false}>
        {cluster}
      </Link>
    );
  }
  return (
    <button type="button" {...common} aria-pressed={active} onClick={() => onPick(bucket.date)}>
      {cluster}
    </button>
  );
});

/**
 * Changes per day as a strip of marks, one per person, coloured by kind.
 * Quiet days stay empty on the time axis. A cluster is a column that spans
 * the chart height, so a thin day still has a tall target; hover, focus or a
 * finger dragged along the chart opens a tooltip with the date, the counts
 * and the first names. Selecting a day sets the day filter, selecting it
 * again clears it; the legend filters by kind, each mark counting the
 * changes of its kind in the window and disabled when there are none.
 * With `linkBase` the days and legend are links to the changes page instead
 * (home page). The caption names the window; with `shown` it says how many of
 * the window's changes the list below shows.
 */
export function ChangeHistogram({
  buckets,
  days,
  counts: windowCounts,
  shown,
  activeDay = null,
  onSelectDay,
  activeKind = "all",
  onSelectKind,
  linkBase,
}: {
  buckets: HistogramBucket[];
  days: number;
  /** The window's changes and the people they are about. */
  counts: EntryCounts;
  /** The changes the list shows after a kind or day filter; omit when nothing is filtered. */
  shown?: number;
  activeDay?: string | null;
  onSelectDay?: (date: string | null) => void;
  activeKind?: ChangeFilterValue;
  onSelectKind?: (kind: ChangeFilterValue) => void;
  linkBase?: string;
}) {
  const t = useT("home");
  const locale = useLocale();
  const [tip, setTip] = useState<Tip | null>(null);
  const [roving, setRoving] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const activeDayRef = useRef(activeDay);
  activeDayRef.current = activeDay;

  const columnsByDay = useMemo(
    () => buckets.map((bucket) => packDayDots(filterByKind(bucket.byKind, activeKind))),
    [buckets, activeKind],
  );
  const counts = useMemo(() => columnsByDay.map(packedCount), [columnsByDay]);
  const kindTotals = useMemo(() => {
    const sums: Record<BarKind, number> = { appointment: 0, acting: 0, departure: 0, vacancy: 0, other: 0 };
    for (const bucket of buckets) for (const kind of BAR_KINDS) sums[kind] += bucket.changesByKind[kind];
    return sums;
  }, [buckets]);

  // The one day in the tab order: the chosen day, else the newest day with marks.
  const tabIndex = useMemo(() => {
    if (roving !== null && counts[roving]) return roving;
    const chosen = activeDay === null ? -1 : buckets.findIndex((bucket) => bucket.date === activeDay);
    if (chosen >= 0 && counts[chosen]) return chosen;
    for (let i = counts.length - 1; i >= 0; i -= 1) if (counts[i] > 0) return i;
    return -1;
  }, [roving, activeDay, buckets, counts]);

  const withPeople = useCountsText();

  const labels = useMemo(
    () =>
      buckets.map((bucket) => {
        const date = formatIsoDate(bucket.date, locale, "short");
        if (bucket.count === 0) return `${date}: ${t("histEmptyDay")}`;
        const head = `${date}: ${withPeople(bucket.changes, bucket.people)}`;
        const names = bucket.names.join(", ");
        return names === "" ? head : `${head}. ${names}${bucket.more > 0 ? ` ${t("vacancyCalloutMore", { n: bucket.more })}` : ""}`;
      }),
    [buckets, locale, t, withPeople],
  );

  const hrefFor = useCallback(
    (query: string) => (linkBase === undefined ? null : `${linkBase}?window=${days}${query}`),
    [linkBase, days],
  );

  const pick = useCallback(
    (date: string) => onSelectDay?.(date === activeDayRef.current ? null : date),
    [onSelectDay],
  );

  const showTip = useCallback(
    (index: number) => {
      const wrap = wrapRef.current;
      const bucket = buckets[index];
      if (!wrap || !bucket || counts[index] === 0) {
        setTip(null);
        return;
      }
      const rect = wrap.getBoundingClientRect();
      const width = Math.min(TIP_WIDTH, window.innerWidth - 2 * TIP_EDGE);
      const anchor = rect.left + ((index + 0.5) / buckets.length) * rect.width;
      const left = Math.min(Math.max(anchor - width / 2, TIP_EDGE), window.innerWidth - TIP_EDGE - width) - rect.left;
      const below = rect.top < TIP_FLIP_SPACE;
      setTip((previous) =>
        previous && previous.index === index && previous.left === left && previous.below === below
          ? previous
          : { index, left, below },
      );
    },
    [buckets, counts],
  );

  const onFocusBar = useCallback(
    (index: number) => {
      setRoving(index);
      showTip(index);
    },
    [showTip],
  );

  /** The day a pointer means: the nearest day with changes within a finger's reach. */
  const indexAt = (event: { clientX: number }, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    return nearestActiveIndex(counts, event.clientX - rect.left, rect.width);
  };

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const index = indexAt(event, event.currentTarget);
    if (index === null) setTip(null);
    else showTip(index);
  };

  // A thin day is a hard target, so a pointer click forwards to the nearest day
  // in reach. Keyboard activation (detail 0) and the forwarded click itself
  // already hit the right day.
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (event.detail === 0) return;
    const index = indexAt(event, event.currentTarget);
    const hit = (event.target as HTMLElement).closest<HTMLElement>("[data-day]");
    if (index === null) return;
    const wanted = groupRef.current?.querySelector<HTMLElement>(`[data-day="${buckets[index].date}"]`);
    if (!wanted || wanted === hit) return;
    event.preventDefault();
    event.stopPropagation();
    wanted.click();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      setTip(null);
      return;
    }
    const step = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
    const edge = event.key === "Home" ? "first" : event.key === "End" ? "last" : null;
    if (step === 0 && edge === null) return;
    const items = Array.from(groupRef.current?.querySelectorAll<HTMLElement>("[data-day]:not([data-empty])") ?? []);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next =
      edge === "first" ? 0 : edge === "last" ? items.length - 1 : Math.min(items.length - 1, Math.max(0, current + step));
    event.preventDefault();
    items[next]?.focus();
  };

  useEffect(() => setTip(null), [buckets]);

  const axisLabels = [
    t("timelineDaysAgo", { n: days }),
    `${Math.round((days * 2) / 3)}d`,
    `${Math.round(days / 3)}d`,
    t("timelineToday"),
  ];
  const tipBucket = tip ? buckets[tip.index] : null;

  const caption =
    shown === undefined
      ? t("chgCaptionPeriod", { counts: withPeople(windowCounts.changes, windowCounts.people), days })
      : t(windowCounts.changes === 1 ? "chgCaptionOfOne" : "chgCaptionOf", { n: shown, all: windowCounts.changes, days });
  const noneText = t("chgNoneInPeriod", { days });

  const legendClass = (pressed: boolean, idle: boolean, none: boolean) =>
    `relative inline-flex min-h-8 items-center gap-1 rounded-sm text-xs font-medium tabular-nums transition-fast pointer-coarse:min-h-11 ${
      none && !pressed ? "cursor-not-allowed opacity-40" : idle ? "opacity-40 hover:opacity-100" : "hover:opacity-80"
    }`;

  return (
    <figure className="min-w-0">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <span className="text-sm tabular-nums text-ink-muted">{caption}</span>
        <div role="group" aria-label={t("filterGroupAria")} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {LEGEND_KINDS.map((kind) => {
            const pressed = activeKind === kind;
            const none = kindTotals[kind] === 0;
            const idle = activeKind !== "all" && !pressed;
            const display = DISPLAY_KIND[kind];
            const name = t(KIND_LABEL[kind]);
            const content = (
              <>
                <ChangeKindGlyph kind={display} size={13} />
                <span className={`tabular-nums ${none ? "text-ink-faint" : CHANGE_LABEL_TONE[display]}`}>{kindTotals[kind]}</span>
                <span className="sr-only">{name}</span>
                {none ? <span className="sr-only">{noneText}</span> : null}
              </>
            );
            if (none && !pressed) {
              return (
                <button key={kind} type="button" disabled title={`${name}: ${noneText}`} className={legendClass(false, false, true)}>
                  {content}
                </button>
              );
            }
            return linkBase !== undefined ? (
              <Link key={kind} href={hrefFor(`&kind=${kind}`) ?? linkBase} title={name} className={legendClass(false, false, false)}>
                {content}
              </Link>
            ) : (
              <button
                key={kind}
                type="button"
                aria-pressed={pressed}
                title={name}
                onClick={() => onSelectKind?.(pressed ? "all" : kind)}
                className={legendClass(pressed, idle, false)}
              >
                {content}
              </button>
            );
          })}
        </div>
      </figcaption>

      <div ref={wrapRef} className="relative mt-3">
        <div
          ref={groupRef}
          role="group"
          aria-label={t("histGroupAria")}
          className="motion-grow flex touch-pan-y items-end overflow-visible border-b border-line"
          data-reveal="pending"
          style={{ height: STRIP_PX }}
          onKeyDown={onKeyDown}
          onClickCapture={onClickCapture}
          onPointerEnter={onPointer}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setTip(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setTip(null);
          }}
        >
          {buckets.map((bucket, index) => (
            <Day
              key={bucket.date}
              bucket={bucket}
              index={index}
              columns={columnsByDay[index]}
              label={labels[index]}
              active={activeDay === bucket.date}
              dimmed={activeDay !== null && activeDay !== bucket.date}
              tabbable={index === tabIndex}
              href={hrefFor(`&day=${bucket.date}`)}
              onPick={pick}
              onFocusBar={onFocusBar}
            />
          ))}
        </div>

        {tip && tipBucket ? (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute z-20 rounded-md border border-line-strong bg-surface px-3 py-2 text-xs leading-snug shadow-lg ${
              tip.below ? "top-full mt-2" : "bottom-full mb-2"
            }`}
            style={{ left: tip.left, width: `min(${TIP_WIDTH}px, calc(100vw - ${2 * TIP_EDGE}px))` }}
          >
            <p className="font-semibold text-ink">
              <time dateTime={tipBucket.date}>{formatIsoDate(tipBucket.date, locale, "long")}</time>
            </p>
            <p className="mt-0.5 text-ink-muted">{withPeople(tipBucket.changes, tipBucket.people)}</p>
            <ul className="mt-1 space-y-0.5">
              {BAR_KINDS.filter((kind) => tipBucket.changesByKind[kind] > 0).map((kind) => (
                <li key={kind} className="flex items-center gap-1.5 text-ink-muted">
                  <ChangeKindGlyph kind={DISPLAY_KIND[kind]} size={11} />
                  <span className="min-w-0 flex-1 truncate">{t(KIND_LABEL[kind])}</span>
                  <span className="tabular-nums text-ink">{tipBucket.changesByKind[kind]}</span>
                </li>
              ))}
            </ul>
            {tipBucket.names.length > 0 ? (
              <p className="mt-1.5 border-t border-line pt-1.5 text-ink-muted [overflow-wrap:anywhere]">
                {tipBucket.names.map((name) => (locale === "en" ? (establishedEn(name) ?? name) : name)).join(", ")}
                {tipBucket.more > 0 ? ` ${t("vacancyCalloutMore", { n: tipBucket.more })}` : ""}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div aria-hidden="true" className="mt-1 flex justify-between text-[11px] tabular-nums text-ink-faint">
        {axisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <ul className="sr-only">
        {buckets
          .map((bucket, index) => (bucket.count > 0 ? <li key={bucket.date}>{labels[index]}</li> : null))
          .filter(Boolean)}
      </ul>
    </figure>
  );
}
