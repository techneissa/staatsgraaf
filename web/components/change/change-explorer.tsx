"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import { useSettled } from "@/components/motion/use-settled";
import {
  dayInWindow,
  parseChangeUrlState,
  serializeChangeUrlState,
  type ChangeFilterValue,
} from "@/lib/change-url-state";
import { ChangeDay } from "./change-day";
import { ChangeHistogram, type HistogramBucket } from "./change-histogram";
import { formatIsoDate } from "./local-date";
import { ChangeStatTiles, type ChangeTileFigures, type ChipId } from "./stat-tiles";
import { WindowTabsList } from "./window-tabs-list";
import type { ChangeDisplayKind } from "@/lib/changes";
import type { ChangeKind } from "@/lib/types";

export type { HistogramBucket } from "./change-histogram";

export type ChangeItem = {
  id: string;
  kind: ChangeKind;
  displayKind: ChangeDisplayKind;
  node: ReactNode;
};

export type ChangeGroupData = {
  date: string;
  items: ChangeItem[];
};

export type ChangePane = {
  days: number;
  total: number;
  histogram: HistogramBucket[];
  groups: ChangeGroupData[];
};

const INITIAL_VISIBLE = 10;
/** The appointments chip counts this many days back, so it also sets this window. */
const APPOINTMENT_WINDOW = 30;

function filterGroups(groups: ChangeGroupData[], filter: ChangeFilterValue, day: string | null): ChangeGroupData[] {
  if (filter === "all" && day === null) return groups;
  return groups
    .filter((group) => day === null || group.date === day)
    .map((group) => ({
      ...group,
      items: filter === "all" ? group.items : group.items.filter((item) => item.kind === (filter as ChangeKind)),
    }))
    .filter((group) => group.items.length > 0);
}

function limitGroups(groups: ChangeGroupData[], limit: number): ChangeGroupData[] {
  let remaining = limit;
  const visible: ChangeGroupData[] = [];
  for (const group of groups) {
    if (remaining <= 0) break;
    const items = group.items.slice(0, remaining);
    remaining -= items.length;
    if (items.length > 0) visible.push({ ...group, items });
  }
  return visible;
}

function countItems(groups: ChangeGroupData[]): number {
  return groups.reduce((sum, group) => sum + group.items.length, 0);
}

const BUTTON =
  "inline-flex min-h-8 items-center justify-center rounded-sm border border-line px-3 text-sm font-medium text-ink transition-fast hover:border-line-strong pointer-coarse:min-h-11";

/** The list of days. Memoised: hovering the chart never re-renders it. */
const ChangeList = memo(function ChangeList({
  groups,
  reference,
  day,
  filter,
  vacancies,
  acting,
}: {
  groups: ChangeGroupData[];
  reference: string;
  day: string | null;
  filter: ChangeFilterValue;
  vacancies: ReactNode;
  acting: ReactNode;
}) {
  const t = useT("home");
  const [expanded, setExpanded] = useState(false);
  const total = countItems(groups);
  const visible = expanded ? groups : limitGroups(groups, INITIAL_VISIBLE);

  useEffect(() => {
    setExpanded(false);
  }, [day, filter]);

  if (filter === "vacancy") return <>{vacancies}</>;
  if (filter === "acting") return <>{acting}</>;
  if (groups.length === 0) {
    return (
      <p className="border-y border-line py-6 text-center text-sm text-ink-faint">
        {filter === "all" && day === null ? t("noChangesInWindow") : t("kindFilteredEmpty")}
      </p>
    );
  }
  return (
    <>
      <div className="space-y-4">
        {visible.map((group) => (
          <ChangeDay
            key={group.date}
            date={group.date}
            reference={reference}
            items={group.items}
            count={groups.find((full) => full.date === group.date)?.items.length}
            sticky
          />
        ))}
      </div>
      {total > INITIAL_VISIBLE ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={`${BUTTON} mt-4 w-full sm:w-auto`}
        >
          {expanded ? t("showFewer") : t("showAllChanges", { n: total })}
        </button>
      ) : null}
    </>
  );
});

export function ChangeExplorer({
  panes,
  reference,
  vacancies,
  acting,
  figures,
  heading,
  afterChips,
}: {
  panes: ChangePane[];
  reference: string;
  vacancies: ReactNode;
  acting: ReactNode;
  figures: ChangeTileFigures;
  /** The page title; the window switch sits level with it, top right. */
  heading: ReactNode;
  /** Shown between the chips and the feed. */
  afterChips?: ReactNode;
}) {
  const t = useT("home");
  const locale = useLocale();
  const settled = useSettled();
  const validDays = useMemo(() => panes.map((pane) => pane.days), [panes]);
  const [days, setDays] = useState(() => parseChangeUrlState("", validDays).window);
  const [filter, setFilter] = useState<ChangeFilterValue>("all");
  const [day, setDay] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const synced = useRef(false);

  // Write first, so the first run (before the URL has been read) leaves the URL alone.
  useEffect(() => {
    if (!synced.current) return;
    const query = serializeChangeUrlState({ window: days, kind: filter, day });
    if (query === window.location.search) return;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query}${window.location.hash}`);
  }, [days, filter, day]);

  useEffect(() => {
    const state = parseChangeUrlState(window.location.search, validDays);
    const chosenDay = dayInWindow(state.day, state.window, reference);
    setDays(state.window);
    setFilter(state.kind);
    // A day only filters the change list, not the vacancy or acting lists.
    setDay(state.kind === "vacancy" || state.kind === "acting" ? null : chosenDay);
    synced.current = true;
  }, [validDays, reference]);

  const scrollToList = useCallback(() => {
    const target = listRef.current;
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => target.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" }));
  }, []);

  const selectDay = useCallback(
    (date: string | null) => {
      setDay(date);
      if (date !== null) {
        setFilter((current) => (current === "vacancy" || current === "acting" ? "all" : current));
        scrollToList();
      }
    },
    [scrollToList],
  );

  const selectKind = useCallback((kind: ChangeFilterValue) => {
    setFilter(kind);
    if (kind === "vacancy" || kind === "acting") setDay(null);
  }, []);

  const selectWindow = useCallback(
    (value: string) => {
      const next = Number(value);
      setDays(next);
      setDay((current) => dayInWindow(current, next, reference));
    },
    [reference],
  );

  const onChip = useCallback(
    (id: ChipId) => {
      if (id === "last") {
        setFilter("all");
        setDay(null);
        scrollToList();
        return;
      }
      if (id === "appointment") {
        if (filter === "appointment" && days === APPOINTMENT_WINDOW) {
          setFilter("all");
          return;
        }
        selectWindow(String(APPOINTMENT_WINDOW));
        setFilter("appointment");
        setDay(null);
        return;
      }
      selectKind(filter === id ? "all" : id);
    },
    [filter, days, selectKind, selectWindow, scrollToList],
  );

  const pressed: ChipId | null =
    filter === "vacancy" || filter === "acting"
      ? filter
      : filter === "appointment" && days === APPOINTMENT_WINDOW
        ? "appointment"
        : null;

  return (
    <Tabs.Root value={String(days)} onValueChange={selectWindow} data-settled={settled ? "" : undefined}>
      <div className="mt-4 flex items-center justify-between gap-3">
        {heading}
        <WindowTabsList windows={panes.map((pane) => ({ value: String(pane.days), days: pane.days }))} />
      </div>

      <ChangeStatTiles className="mt-3" figures={figures} mode="control" pressed={pressed} onSelect={onChip} />
      {afterChips}

      <section aria-labelledby="feed-titel" className="pb-6 pt-5">
        <h2 id="feed-titel" className="sr-only">
          {t("feedTitle")}
        </h2>
        {panes.map((pane) => (
          <Tabs.Content
            key={pane.days}
            value={String(pane.days)}
            className="motion-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <PaneBody
              pane={pane}
              reference={reference}
              filter={filter}
              day={day}
              vacancies={vacancies}
              acting={acting}
              onSelectDay={selectDay}
              onSelectKind={selectKind}
              listRef={listRef}
              locale={locale}
            />
          </Tabs.Content>
        ))}
      </section>
    </Tabs.Root>
  );
}

/** One window: the chart, the day filter note and the list. Only the active window mounts. */
function PaneBody({
  pane,
  reference,
  filter,
  day,
  vacancies,
  acting,
  onSelectDay,
  onSelectKind,
  listRef,
  locale,
}: {
  pane: ChangePane;
  reference: string;
  filter: ChangeFilterValue;
  day: string | null;
  vacancies: ReactNode;
  acting: ReactNode;
  onSelectDay: (date: string | null) => void;
  onSelectKind: (kind: ChangeFilterValue) => void;
  listRef: RefObject<HTMLDivElement | null>;
  locale: string;
}) {
  const t = useT("home");
  const groups = useMemo(() => filterGroups(pane.groups, filter, day), [pane.groups, filter, day]);
  const showLists = filter === "vacancy" || filter === "acting";
  return (
    <>
      <ChangeHistogram
        buckets={pane.histogram}
        days={pane.days}
        total={pane.total}
        activeDay={day}
        onSelectDay={onSelectDay}
        activeKind={filter}
        onSelectKind={onSelectKind}
      />
      {day !== null && !showLists ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <span>{t("dayFilterLabel", { date: formatIsoDate(day, locale, "long") })}</span>
          <button type="button" onClick={() => onSelectDay(null)} className={`${BUTTON} text-xs`}>
            {t("dayFilterClear")}
          </button>
        </p>
      ) : null}
      <div ref={listRef} className="mt-4 scroll-mt-16">
        <ChangeList
          groups={groups}
          reference={reference}
          day={day}
          filter={filter}
          vacancies={vacancies}
          acting={acting}
        />
      </div>
    </>
  );
}
