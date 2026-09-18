"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ChangeHistogram } from "./change-histogram";
import type { ChangeKind } from "@/lib/types";

export type HistogramBucket = { date: string; count: number };

export type ChangeItem = {
  id: string;
  kind: ChangeKind;
  node: ReactNode;
};

export type ChangeGroupData = {
  date: string;
  label: string;
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

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Alles" },
  { value: "appointment", label: "Aanstellingen" },
  { value: "departure", label: "Vertrekken" },
  { value: "vacancy", label: "Vacatures" },
  { value: "acting", label: "Waarnemend" },
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

export function ChangeExplorer({
  panes,
  vacancies,
  vacancyCount,
  acting,
  actingCount,
}: {
  panes: ChangePane[];
  vacancies: ReactNode;
  vacancyCount: number;
  acting: ReactNode;
  actingCount: number;
}) {
  const [activeDays, setActiveDays] = useState(
    String(panes.find((pane) => pane.days === 30)?.days ?? panes[0]?.days ?? 30),
  );
  const [filter, setFilter] = useState<FilterValue>("all");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [activeDays, filter]);

  return (
    <Tabs.Root value={activeDays} onValueChange={setActiveDays}>
      <Tabs.List
        aria-label="Periode"
        className="inline-flex gap-1 rounded-sm border border-line bg-surface-inset p-1"
      >
        {panes.map((pane) => (
          <Tabs.Trigger
            key={pane.days}
            value={String(pane.days)}
            className="rounded-xs px-3 py-1.5 text-sm font-medium text-ink-muted transition-fast hover:text-ink data-[state=active]:bg-accent-soft data-[state=active]:text-accent-text"
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
            className="mt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <ChangeHistogram buckets={pane.histogram} days={pane.days} total={pane.total} />

            <div role="group" aria-label="Filter op soort" className="mt-3 flex flex-wrap gap-2">
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
                    className={`rounded-pill border px-3 py-1 text-sm font-medium transition-fast ${
                      active
                        ? "border-accent/40 bg-accent-soft text-accent-text"
                        : "border-line bg-surface-raised text-ink-muted hover:text-ink"
                    }`}
                  >
                    {option.label}
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
                <p className="rounded-md border border-dashed border-line bg-surface-inset p-5 text-center text-sm text-ink-faint">
                  Geen wijzigingen van dit soort in dit venster.
                </p>
              ) : (
                <div className="space-y-6">
                  {visible.map((group) => (
                    <section key={group.date} aria-labelledby={`dag-${group.date}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 id={`dag-${group.date}`} className="text-sm font-semibold text-ink">
                          {group.label}
                        </h3>
                        <span className="text-xs tabular-nums text-ink-faint">{group.items.length}</span>
                      </div>
                      <ol className="mt-3 space-y-2">
                        {group.items.map((item) => (
                          <li key={item.id}>{item.node}</li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>
              )}

              {filter === "all" || filter === "appointment" || filter === "departure" ? (
                total > INITIAL_VISIBLE ? (
                  <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="mt-4 rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm font-medium text-ink transition-fast hover:border-line-strong"
                  >
                    {expanded
                      ? "Toon minder wijzigingen"
                      : `Toon alle ${total} wijzigingen`}
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
