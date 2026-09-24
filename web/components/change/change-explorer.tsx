"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useT } from "@/components/i18n/use-t";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import { useSettled } from "@/components/motion/use-settled";
import { ChangeHistogram } from "./change-histogram";
import { ChangeDay } from "./change-day";
import type { ChangeDisplayKind } from "@/lib/changes";
import type { ChangeKind } from "@/lib/types";

export type HistogramBucket = { date: string; count: number };

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
  label: string;
  total: number;
  histogram: HistogramBucket[];
  groups: ChangeGroupData[];
};

type FilterValue = "all" | "appointment" | "departure" | "vacancy" | "acting";

const FILTERS: { value: FilterValue; key: string }[] = [
  { value: "all", key: "filterAll" },
  { value: "appointment", key: "filterAppointments" },
  { value: "departure", key: "filterDepartures" },
  { value: "vacancy", key: "filterVacancies" },
  { value: "acting", key: "filterActing" },
];

const INITIAL_VISIBLE = 10;

function countByKind(pane: ChangePane, kind: ChangeKind): number {
  return pane.groups.reduce(
    (sum, group) => sum + group.items.filter((item) => item.kind === kind).length,
    0,
  );
}

function filterGroups(groups: ChangeGroupData[], filter: FilterValue): ChangeGroupData[] {
  if (filter === "all") return groups;
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.kind === filter) }))
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

/** Tabs and filter pills: 44 px tall on touch, compact with a mouse. */
const CONTROL = "inline-flex shrink-0 items-center min-h-8 pointer-coarse:min-h-11";

export function ChangeExplorer({
  panes,
  reference,
  vacancies,
  vacancyCount,
  acting,
  actingCount,
}: {
  panes: ChangePane[];
  reference: string;
  vacancies: ReactNode;
  vacancyCount: number;
  acting: ReactNode;
  actingCount: number;
}) {
  const t = useT("home");
  const [activeDays, setActiveDays] = useState(
    String(panes.find((pane) => pane.days === 30)?.days ?? panes[0]?.days ?? 30),
  );
  const [filter, setFilter] = useState<FilterValue>("all");
  const [expanded, setExpanded] = useState(false);
  const settled = useSettled();

  useEffect(() => {
    setExpanded(false);
  }, [activeDays, filter]);

  return (
    <Tabs.Root value={activeDays} onValueChange={setActiveDays} data-settled={settled ? "" : undefined}>
      <Tabs.List
        aria-label={t("periodTabsAria")}
        className="inline-flex gap-1 rounded-sm border border-line bg-surface-inset p-0.5"
      >
        <SlidingIndicator className="rounded-xs bg-accent-soft" />
        {panes.map((pane) => (
          <Tabs.Trigger
            key={pane.days}
            value={String(pane.days)}
            className={`${CONTROL} rounded-xs px-3.5 text-sm font-medium tabular-nums text-ink-muted transition-fast hover:text-ink data-[state=active]:bg-accent-soft data-[state=active]:text-accent-text`}
          >
            {pane.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {panes.map((pane) => {
        const filtered = filterGroups(pane.groups, filter);
        const total = countItems(filtered);
        const visible = expanded ? filtered : limitGroups(filtered, INITIAL_VISIBLE);
        return (
          <Tabs.Content
            key={pane.days}
            value={String(pane.days)}
            className="motion-panel mt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <ChangeHistogram buckets={pane.histogram} days={pane.days} total={pane.total} />

            <div role="group" aria-label={t("filterGroupAria")} className="scroll-row -mx-4 mt-4 gap-2 px-4 lg:mx-0 lg:flex-wrap lg:px-0 lg:[mask-image:none]">
              <SlidingIndicator variant="ring" className="rounded-pill border border-accent/40" />
              {FILTERS.map((option) => {
                const active = filter === option.value;
                let count: number | null = null;
                if (option.value === "all") count = pane.total;
                else if (option.value === "appointment" || option.value === "departure") {
                  count = countByKind(pane, option.value);
                } else if (option.value === "vacancy") count = vacancyCount;
                else count = actingCount;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(option.value)}
                    className={`${CONTROL} whitespace-nowrap rounded-pill border px-3 text-sm font-medium transition-fast ${
                      active
                        ? "border-accent/40 bg-accent-soft text-accent-text"
                        : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    {t(option.key)}
                    {count !== null ? (
                      <span className="ml-1.5 tabular-nums text-ink-faint">{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              {filter === "vacancy" ? (
                vacancies
              ) : filter === "acting" ? (
                acting
              ) : visible.length === 0 ? (
                <p className="border-y border-line py-6 text-center text-sm text-ink-faint">
                  {t("kindFilteredEmpty")}
                </p>
              ) : (
                <div className="space-y-4">
                  {visible.map((group) => (
                    <ChangeDay
                      key={group.date}
                      date={group.date}
                      reference={reference}
                      items={group.items}
                      count={filtered.find((full) => full.date === group.date)?.items.length}
                      sticky
                    />
                  ))}
                </div>
              )}

              {filter === "all" || filter === "appointment" || filter === "departure" ? (
                total > INITIAL_VISIBLE ? (
                  <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className={`${CONTROL} mt-4 w-full justify-center rounded-sm border border-line px-3 text-sm font-medium text-ink transition-fast hover:border-line-strong sm:w-auto`}
                  >
                    {expanded ? t("showFewer") : t("showAllChanges", { n: total })}
                  </button>
                ) : null
              ) : null}
            </div>
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
}
