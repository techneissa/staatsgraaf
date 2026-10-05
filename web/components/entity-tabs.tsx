"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SlidingIndicator } from "./motion/sliding-indicator";
import { useSettled } from "./motion/use-settled";
import { useT } from "./i18n/use-t";

const triggerClass =
  "inline-flex shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-muted transition-fast hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus data-[state=active]:border-accent data-[state=active]:text-ink pointer-coarse:min-h-11";

const panelClass =
  "motion-panel pt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/** An extra section tab after the default two, for example a person's proposals and motions. */
export type EntityExtraTab = { value: string; label: ReactNode; content: ReactNode };

export type EntityTabValue = "nieuws" | "verbindingen" | (string & {});

/**
 * Tabs for the news and the connections of an entity. A tab with nothing to
 * show is left out (`hasNews`, `hasConnections`); when both are empty the
 * `empty` note stands in their place. The selected tab lives in the URL hash
 * (`#verbindingen`), so a tab can be linked and the back button restores it.
 * `first` picks the default tab and the tab order: connections lead on pages
 * where structure matters more than news.
 */
export function EntityTabs({
  news,
  connections,
  extra = [],
  hasNews = true,
  hasConnections = true,
  first = "nieuws",
  empty = null,
}: {
  news: ReactNode;
  connections: ReactNode;
  extra?: EntityExtraTab[];
  hasNews?: boolean;
  hasConnections?: boolean;
  first?: "nieuws" | "verbindingen";
  empty?: ReactNode;
}) {
  const t = useT("entity");
  const settled = useSettled();

  const tabs: { value: EntityTabValue; label: ReactNode; content: ReactNode }[] = [];
  const newsTab = hasNews ? { value: "nieuws", label: t("tabNews"), content: news } : null;
  const connectionsTab = hasConnections
    ? { value: "verbindingen", label: t("whosConnected"), content: connections }
    : null;
  for (const tab of first === "verbindingen" ? [connectionsTab, newsTab] : [newsTab, connectionsTab]) {
    if (tab !== null) tabs.push(tab);
  }
  for (const tab of extra) tabs.push(tab);

  const values = tabs.map((tab) => tab.value);
  const fallback = values[0] ?? "nieuws";
  const [value, setValue] = useState<EntityTabValue>(fallback);
  const valuesKey = values.join("|");

  // Read the hash after hydration (the server cannot see it) and follow back/forward.
  useEffect(() => {
    const fromHash = () => {
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      setValue(values.includes(hash) ? hash : fallback);
    };
    fromHash();
    window.addEventListener("popstate", fromHash);
    window.addEventListener("hashchange", fromHash);
    return () => {
      window.removeEventListener("popstate", fromHash);
      window.removeEventListener("hashchange", fromHash);
    };
    // values is derived from valuesKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey, fallback]);

  const select = useCallback(
    (next: string) => {
      setValue(next);
      const url = `${window.location.pathname}${window.location.search}#${next}`;
      if (window.location.hash !== `#${next}`) window.history.pushState(window.history.state, "", url);
    },
    [],
  );

  if (tabs.length === 0) return empty === null ? null : <div className="mt-6">{empty}</div>;

  return (
    <Tabs.Root value={value} onValueChange={select} className="mt-6" data-settled={settled ? "" : undefined}>
      <Tabs.List aria-label={t("panelLabel")} className="scroll-row items-stretch gap-1 border-b border-line">
        <SlidingIndicator variant="underline" className="bg-accent" />
        {tabs.map((tab) => (
          <Tabs.Trigger key={tab.value} value={tab.value} className={triggerClass}>
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Content key={tab.value} value={tab.value} className={panelClass}>
          {tab.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
