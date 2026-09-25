"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { SlidingIndicator } from "./motion/sliding-indicator";
import { useSettled } from "./motion/use-settled";
import { useT } from "./i18n/use-t";

const triggerClass =
  "inline-flex shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-muted transition-fast hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus data-[state=active]:border-accent data-[state=active]:text-ink pointer-coarse:min-h-11";

const panelClass =
  "motion-panel pt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/** An extra section tab after the default two, for example a person's proposals and motions. */
export type EntityExtraTab = { value: string; label: ReactNode; content: ReactNode };

export function EntityTabs({
  news,
  connections,
  extra = [],
}: {
  news: ReactNode;
  connections: ReactNode;
  extra?: EntityExtraTab[];
}) {
  const t = useT("entity");
  const settled = useSettled();
  return (
    <Tabs.Root defaultValue="nieuws" className="mt-6" data-settled={settled ? "" : undefined}>
      <Tabs.List aria-label={t("panelLabel")} className="scroll-row items-stretch gap-1 border-b border-line">
        <SlidingIndicator variant="underline" className="bg-accent" />
        <Tabs.Trigger value="nieuws" className={triggerClass}>
          {t("tabNews")}
        </Tabs.Trigger>
        <Tabs.Trigger value="verbindingen" className={triggerClass}>
          {t("whosConnected")}
        </Tabs.Trigger>
        {extra.map((tab) => (
          <Tabs.Trigger key={tab.value} value={tab.value} className={triggerClass}>
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="nieuws" className={panelClass}>
        {news}
      </Tabs.Content>
      <Tabs.Content value="verbindingen" className={panelClass}>
        {connections}
      </Tabs.Content>
      {extra.map((tab) => (
        <Tabs.Content key={tab.value} value={tab.value} className={panelClass}>
          {tab.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
