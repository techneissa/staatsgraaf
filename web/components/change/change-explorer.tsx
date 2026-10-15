"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { Fragment, memo, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { T } from "@/components/i18n/t";
import { useT } from "@/components/i18n/use-t";
import { useSettled } from "@/components/motion/use-settled";
import { agoPhrase, type Recency } from "@/lib/change-clock";
import { countItems, matchesChangeFilter, visibleLimit, type EntryCounts } from "@/lib/change-feed";
import {
  dayInWindow,
  parseChangeUrlState,
  serializeChangeUrlState,
  type ChangeFilterValue,
  type ChangeViewValue,
  type NowValue,
} from "@/lib/change-url-state";
import type { ChangeDisplayKind } from "@/lib/changes";
import { ChangeDay } from "./change-day";
import { ChangeHistogram, type HistogramBucket } from "./change-histogram";
import { LastChangeLine } from "./last-change-line";
import { formatIsoDate, LocalDate } from "./local-date";
import { NowChips, type NowFigures } from "./now-chips";
import { PersonCardFilterProvider } from "./person-card-list";
import { TemplateT } from "./template-t";
import { ViewToggle } from "./view-toggle";
import { WindowTabsList } from "./window-tabs-list";

export type { HistogramBucket } from "./change-histogram";

export type ChangeItem = {
  id: string;
  displayKind: ChangeDisplayKind;
  /** The changes behind this entry: more than one for a bundle. */
  changes: number;
  personId: string | null;
  node: ReactNode;
};

export type ChangeGroupData = {
  date: string;
  items: ChangeItem[];
};

export type ChangePane = {
  days: number;
  /** The window's changes and the people they are about. */
  counts: EntryCounts;
  histogram: HistogramBucket[];
  groups: ChangeGroupData[];
  /** The per person view of this window, built on the server. */
  people: ReactNode;
};

const BUTTON =
  "inline-flex min-h-8 items-center justify-center rounded-sm border border-line px-3 text-sm font-medium text-ink transition-fast hover:border-line-strong pointer-coarse:min-h-11";

function filterGroups(groups: ChangeGroupData[], filter: ChangeFilterValue, day: string | null): ChangeGroupData[] {
  if (filter === "all" && day === null) return groups;
  return groups
    .filter((group) => day === null || group.date === day)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => matchesChangeFilter(item.displayKind, filter)),
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

function flatItems(groups: ChangeGroupData[]): ChangeItem[] {
  return groups.flatMap((group) => group.items);
}

/** Why a list is empty, and the one step that leads on. */
function EmptyFeed({
  days,
  windowEmpty,
  filter,
  day,
  recency,
  onShowWindow,
  onClearKind,
  onClearDay,
}: {
  days: number;
  windowEmpty: boolean;
  filter: ChangeFilterValue;
  day: string | null;
  recency: Recency | null;
  onShowWindow: (days: number) => void;
  onClearKind: () => void;
  onClearDay: () => void;
}) {
  const t = useT("home");
  const ago = recency !== null ? agoPhrase(recency.age) : null;
  const widerWindow = windowEmpty && recency !== null && recency.window !== null && recency.window > days ? recency.window : null;
  return (
    <div className="space-y-3 border-y border-line py-6 text-center text-sm text-ink-muted">
      <p>{windowEmpty ? t("chgEmptyWindow", { days }) : t("kindFilteredEmpty")}</p>
      {windowEmpty && recency !== null && ago !== null ? (
        <p className="text-ink-faint">
          <TemplateT
            k="chgLastChange"
            slots={{ date: <LocalDate iso={recency.date} />, ago: <T area="home" k={ago.key} vars={ago.vars} /> }}
          />
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {widerWindow !== null ? (
          <button type="button" onClick={() => onShowWindow(widerWindow)} className={BUTTON}>
            {t("chgEmptyShowWindow", { days: widerWindow })}
          </button>
        ) : null}
        {!windowEmpty && filter !== "all" ? (
          <button type="button" onClick={onClearKind} className={BUTTON}>
            {t("chgClearKind")}
          </button>
        ) : null}
        {!windowEmpty && day !== null ? (
          <button type="button" onClick={onClearDay} className={BUTTON}>
            {t("dayFilterClear")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** The list of days. Memoised: hovering the chart never re-renders it. */
const ChangeList = memo(function ChangeList({
  groups,
  reference,
  day,
  filter,
}: {
  groups: ChangeGroupData[];
  reference: string;
  day: string | null;
  filter: ChangeFilterValue;
}) {
  const t = useT("home");
  const [expanded, setExpanded] = useState(false);
  const entries = flatItems(groups);
  const limit = visibleLimit(entries.length);
  const hidden = entries.length - limit;
  const visible = expanded ? groups : limitGroups(groups, limit);

  useEffect(() => {
    setExpanded(false);
  }, [day, filter]);

  return (
    <>
      <div className="space-y-4">
        {visible.map((group) => {
          const full = groups.find((candidate) => candidate.date === group.date) ?? group;
          return (
            <ChangeDay
              key={group.date}
              date={group.date}
              reference={reference}
              items={group.items}
              counts={countItems(full.items)}
              sticky
            />
          );
        })}
      </div>
      {hidden > 0 ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className={`${BUTTON} mt-4 w-full sm:w-auto`}
        >
          {expanded ? t("showFewer") : t("showAllChanges", { n: countItems(entries).changes })}
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
  now: nowFigures,
  recency,
  snapshot,
  heading,
}: {
  panes: ChangePane[];
  reference: string;
  vacancies: ReactNode;
  acting: ReactNode;
  now: NowFigures;
  recency: Recency | null;
  snapshot: string | null;
  /** The page title; the window switch sits level with it, top right. */
  heading: ReactNode;
}) {
  const t = useT("home");
  const locale = useLocale();
  const settled = useSettled();
  const validDays = useMemo(() => panes.map((pane) => pane.days), [panes]);
  const [days, setDays] = useState(() => parseChangeUrlState("", validDays).window);
  const [filter, setFilter] = useState<ChangeFilterValue>("all");
  const [day, setDay] = useState<string | null>(null);
  const [view, setView] = useState<ChangeViewValue>("chronological");
  const [now, setNow] = useState<NowValue | null>(null);
  const [synced, setSynced] = useState(false);

  // Waits for the first read of the URL, so the defaults never overwrite a deep link.
  useEffect(() => {
    if (!synced) return;
    const query = serializeChangeUrlState({ window: days, kind: filter, day, view, now });
    if (query === window.location.search) return;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query}${window.location.hash}`);
  }, [synced, days, filter, day, view, now]);

  useEffect(() => {
    const state = parseChangeUrlState(window.location.search, validDays);
    setDays(state.window);
    setFilter(state.kind);
    setView(state.view);
    setNow(state.now);
    setDay(state.now !== null ? null : dayInWindow(state.day, state.window, reference));
    setSynced(true);
  }, [validDays, reference]);

  // Choosing a period, a kind, a day or a view leaves the lists of the state right now.
  const selectDay = useCallback((date: string | null) => {
    setNow(null);
    setDay(date);
  }, []);

  const selectKind = useCallback((kind: ChangeFilterValue) => {
    setNow(null);
    setFilter(kind);
  }, []);

  const selectWindow = useCallback(
    (value: string | number) => {
      const next = Number(value);
      setNow(null);
      setDays(next);
      setDay((current) => dayInWindow(current, next, reference));
    },
    [reference],
  );

  const selectView = useCallback((value: ChangeViewValue) => {
    setNow(null);
    setView(value);
  }, []);

  const toggleNow = useCallback((id: NowValue) => setNow((current) => (current === id ? null : id)), []);

  const nowCount = now === "acting" ? nowFigures.actingOfficials : (nowFigures.vacantSeats ?? 0);
  const nowLabel =
    now === "acting"
      ? t(nowCount === 1 ? "chgActingLabelOne" : "chgActingLabel")
      : t(nowCount === 1 ? "chgVacancyLabelOne" : "chgVacancyLabel");

  return (
    <Tabs.Root value={String(days)} onValueChange={selectWindow} data-settled={settled ? "" : undefined}>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Fragment key="heading">{heading}</Fragment>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ViewToggle value={view} onChange={selectView} />
          <WindowTabsList windows={panes.map((pane) => ({ value: String(pane.days), days: pane.days }))} />
        </div>
      </div>

      <NowChips className="mt-3" figures={nowFigures} mode="control" pressed={now} onSelect={toggleNow} />
      <LastChangeLine className="mt-2" recency={recency} snapshot={snapshot} />

      <section aria-labelledby="feed-titel" className="pb-6 pt-4">
        <h2 id="feed-titel" className={now !== null ? "text-lg font-semibold tracking-tight text-ink" : "sr-only"}>
          {now === null ? t("feedTitle") : `${t("chgNowLabel")}: ${nowCount} ${nowLabel}`}
        </h2>
        {panes.map((pane) => (
          <Tabs.Content
            key={pane.days}
            value={String(pane.days)}
            className="motion-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {now !== null ? (
              <>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-muted">
                  <span>{t("chgNowNote")}</span>
                  <button type="button" onClick={() => setNow(null)} className={`${BUTTON} text-xs`}>
                    {t("chgNowClose")}
                  </button>
                </p>
                <div className="mt-3">{now === "acting" ? acting : vacancies}</div>
              </>
            ) : (
              <PaneBody
                pane={pane}
                reference={reference}
                filter={filter}
                day={day}
                view={view}
                recency={recency}
                onSelectDay={selectDay}
                onSelectKind={selectKind}
                onShowWindow={selectWindow}
                locale={locale}
              />
            )}
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
  view,
  recency,
  onSelectDay,
  onSelectKind,
  onShowWindow,
  locale,
}: {
  pane: ChangePane;
  reference: string;
  filter: ChangeFilterValue;
  day: string | null;
  view: ChangeViewValue;
  recency: Recency | null;
  onSelectDay: (date: string | null) => void;
  onSelectKind: (kind: ChangeFilterValue) => void;
  onShowWindow: (days: number) => void;
  locale: string;
}) {
  const t = useT("home");
  const groups = useMemo(() => filterGroups(pane.groups, filter, day), [pane.groups, filter, day]);
  const cardFilter = useMemo(() => ({ kind: filter, day }), [filter, day]);
  const windowEmpty = pane.counts.changes === 0;
  return (
    <>
      {windowEmpty ? null : (
        <ChangeHistogram
          buckets={pane.histogram}
          days={pane.days}
          counts={pane.counts}
          activeDay={day}
          onSelectDay={onSelectDay}
          activeKind={filter}
          onSelectKind={onSelectKind}
        />
      )}
      {day !== null ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <span>{t("dayFilterLabel", { date: formatIsoDate(day, locale, "long") })}</span>
          <button type="button" onClick={() => onSelectDay(null)} className={`${BUTTON} text-xs`}>
            {t("dayFilterClear")}
          </button>
        </p>
      ) : null}
      <div className="mt-4">
        {windowEmpty || (view === "chronological" && groups.length === 0) ? (
          <EmptyFeed
            days={pane.days}
            windowEmpty={windowEmpty}
            filter={filter}
            day={day}
            recency={recency}
            onShowWindow={onShowWindow}
            onClearKind={() => onSelectKind("all")}
            onClearDay={() => onSelectDay(null)}
          />
        ) : view === "people" ? (
          <PersonCardFilterProvider value={cardFilter}>{pane.people}</PersonCardFilterProvider>
        ) : (
          <ChangeList groups={groups} reference={reference} day={day} filter={filter} />
        )}
      </div>
    </>
  );
}
