"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import { BAR_KINDS, type BarKind, type HistogramBucket } from "@/lib/change-bar-kinds";
import type { ChangeFilterValue } from "@/lib/change-url-state";
import { CHANGE_TONE, ChangeKindGlyph } from "./change-glyph";
import { formatIsoDate } from "./local-date";

export type { HistogramBucket } from "@/lib/change-bar-kinds";

const DISPLAY_KIND = {
  appointment: "appointment",
  departure: "departure",
  vacancy: "vacancy",
  other: "structural",
} as const;

const KIND_LABEL: Record<BarKind, string> = {
  appointment: "filterAppointments",
  departure: "filterDepartures",
  vacancy: "filterVacancies",
  other: "histKindOther",
};

/** The kinds the legend can filter on; "other" has no filter. */
const LEGEND_KINDS = ["appointment", "departure", "vacancy"] as const;

const TIP_WIDTH = 224;
const TIP_EDGE = 8;
/** Below this many pixels above the chart in the viewport, the tooltip opens underneath. */
const TIP_FLIP_SPACE = 150;

type Tip = { index: number; left: number; below: boolean };

type BarProps = {
  bucket: HistogramBucket;
  index: number;
  max: number;
  gutter: string;
  label: string;
  active: boolean;
  dimmed: boolean;
  tabbable: boolean;
  href: string | null;
  onPick: (date: string) => void;
  onFocusBar: (index: number) => void;
};

const COLUMN =
  "group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-xs outline-offset-1 focus-visible:outline-2 focus-visible:outline-focus";

/** One day: a full-height column (the hit area) with the stacked bar at its foot. */
const Bar = memo(function Bar({ bucket, index, max, gutter, label, active, dimmed, tabbable, href, onPick, onFocusBar }: BarProps) {
  const empty = bucket.count === 0;
  const stack = (
    <span
      className={`grow-y flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-xs transition-opacity duration-150 ${gutter} ${
        dimmed ? "opacity-35" : "group-hover:brightness-90"
      }`}
      style={
        {
          height: empty ? "2px" : `max(4px, ${(bucket.count / max) * 100}%)`,
          "--d": `${Math.min(280, index * 4)}ms`,
        } as CSSProperties
      }
    >
      {empty ? (
        <span className="h-full w-full bg-line" />
      ) : (
        BAR_KINDS.map((kind) =>
          bucket.byKind[kind] > 0 ? (
            <span
              key={kind}
              className={`block w-full bg-current ${CHANGE_TONE[DISPLAY_KIND[kind]]}`}
              style={{ flexGrow: bucket.byKind[kind], flexBasis: 0 }}
            />
          ) : null,
        )
      )}
    </span>
  );
  const ring = active ? "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-pill after:bg-ink" : "";
  if (empty) {
    // A quiet day is no control: it stays out of the tab order and the accessibility tree.
    return (
      <span aria-hidden="true" data-day={bucket.date} data-empty="" className={COLUMN}>
        {stack}
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
        {stack}
      </Link>
    );
  }
  return (
    <button type="button" {...common} aria-pressed={active} onClick={() => onPick(bucket.date)}>
      {stack}
    </button>
  );
});

/**
 * Changes per day as stacked bars by kind. A bar is a column that spans the
 * chart height, so a thin bar still has a tall target and the columns touch;
 * hover, focus or a finger dragged along the chart opens a tooltip with the
 * date, the counts and the first names. Selecting a bar sets the day filter,
 * selecting it again clears it; the legend filters by kind. With `linkBase`
 * the bars and legend are links to the changes page instead (home page).
 */
export function ChangeHistogram({
  buckets,
  days,
  total,
  activeDay = null,
  onSelectDay,
  activeKind = "all",
  onSelectKind,
  linkBase,
}: {
  buckets: HistogramBucket[];
  days: number;
  total: number;
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

  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const gutter = days <= 14 ? "px-1.5" : days <= 45 ? "px-0.5" : "px-px";
  const kindTotals = useMemo(() => {
    const sums: Record<BarKind, number> = { appointment: 0, departure: 0, vacancy: 0, other: 0 };
    for (const bucket of buckets) for (const kind of BAR_KINDS) sums[kind] += bucket.byKind[kind];
    return sums;
  }, [buckets]);

  // The one bar in the tab order: the chosen day, else the newest day with changes.
  const tabIndex = useMemo(() => {
    if (roving !== null && buckets[roving]?.count) return roving;
    const chosen = activeDay === null ? -1 : buckets.findIndex((bucket) => bucket.date === activeDay);
    if (chosen >= 0) return chosen;
    for (let i = buckets.length - 1; i >= 0; i -= 1) if (buckets[i].count > 0) return i;
    return -1;
  }, [roving, activeDay, buckets]);

  const labels = useMemo(
    () =>
      buckets.map((bucket) => {
        const date = formatIsoDate(bucket.date, locale, "short");
        if (bucket.count === 0) return `${date}: ${t("histEmptyDay")}`;
        const head = bucket.count === 1 ? t("srChangesEntryOne", { date }) : t("srChangesEntry", { date, n: bucket.count });
        const names = bucket.names.join(", ");
        return names === "" ? head : `${head}. ${names}${bucket.more > 0 ? ` ${t("vacancyCalloutMore", { n: bucket.more })}` : ""}`;
      }),
    [buckets, locale, t],
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
      if (!wrap || !bucket || bucket.count === 0) {
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
    [buckets],
  );

  const onFocusBar = useCallback(
    (index: number) => {
      setRoving(index);
      showTip(index);
    },
    [showTip],
  );

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const index = Math.floor(((event.clientX - rect.left) / rect.width) * buckets.length);
    showTip(Math.min(buckets.length - 1, Math.max(0, index)));
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

  const legendClass = (pressed: boolean) =>
    `inline-flex min-h-8 items-center gap-1.5 rounded-pill border px-2.5 text-xs font-medium tabular-nums transition-fast pointer-coarse:min-h-11 ${
      pressed ? "border-accent/40 bg-accent-soft text-accent-text" : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
    }`;

  return (
    <figure className="min-w-0">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-sm tabular-nums text-ink-muted">
          {total === 1 ? t("dayCountOne") : t("dayCount", { n: total })}
        </span>
        <div role="group" aria-label={t("filterGroupAria")} className="flex flex-wrap gap-1.5">
          {LEGEND_KINDS.map((kind) => {
            const pressed = activeKind === kind;
            const content = (
              <>
                <ChangeKindGlyph kind={DISPLAY_KIND[kind]} size={12} />
                <span>{t(KIND_LABEL[kind])}</span>
                <span className="text-ink-faint">{kindTotals[kind]}</span>
              </>
            );
            return linkBase !== undefined ? (
              <Link key={kind} href={hrefFor(`&kind=${kind}`) ?? linkBase} className={legendClass(false)}>
                {content}
              </Link>
            ) : (
              <button
                key={kind}
                type="button"
                aria-pressed={pressed}
                onClick={() => onSelectKind?.(pressed ? "all" : kind)}
                className={legendClass(pressed)}
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
          className="motion-grow flex h-16 touch-pan-y items-end border-b border-line"
          data-reveal="pending"
          onKeyDown={onKeyDown}
          onPointerEnter={onPointer}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setTip(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setTip(null);
          }}
        >
          {buckets.map((bucket, index) => (
            <Bar
              key={bucket.date}
              bucket={bucket}
              index={index}
              max={max}
              gutter={gutter}
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
            <ul className="mt-1 space-y-0.5">
              {BAR_KINDS.filter((kind) => tipBucket.byKind[kind] > 0).map((kind) => (
                <li key={kind} className="flex items-center gap-1.5 text-ink-muted">
                  <ChangeKindGlyph kind={DISPLAY_KIND[kind]} size={11} />
                  <span className="min-w-0 flex-1 truncate">{t(KIND_LABEL[kind])}</span>
                  <span className="tabular-nums text-ink">{tipBucket.byKind[kind]}</span>
                </li>
              ))}
            </ul>
            {tipBucket.names.length > 0 ? (
              <p className="mt-1.5 border-t border-line pt-1.5 text-ink-muted [overflow-wrap:anywhere]">
                {tipBucket.names.join(", ")}
                {tipBucket.more > 0 ? ` ${t("vacancyCalloutMore", { n: tipBucket.more })}` : ""}
              </p>
            ) : null}
            <p className="mt-1.5 text-ink-faint">{t("histPickHint")}</p>
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
