"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { useT } from "@/components/i18n/use-t";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";
import { useSettled } from "@/components/motion/use-settled";

export type ChangeWindowPanel = {
  value: string;
  label: ReactNode;
  content: ReactNode;
};

const triggerClass =
  "inline-flex min-h-7 items-center whitespace-nowrap rounded-pill px-3 text-xs font-medium tabular-nums pointer-coarse:min-h-11 pointer-coarse:px-4 text-ink-muted transition-fast hover:text-ink data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm";

export function ChangeWindowTabs({
  panels,
  defaultValue,
}: {
  panels: ChangeWindowPanel[];
  defaultValue: string;
}) {
  const t = useT("home");
  const settled = useSettled();
  return (
    <Tabs.Root defaultValue={defaultValue} data-settled={settled ? "" : undefined}>
      <Tabs.List
        aria-label={t("windowTabsLabel")}
        className="inline-flex items-center gap-0.5 rounded-pill border border-line bg-surface-inset p-0.5"
      >
        <SlidingIndicator className="rounded-pill bg-surface shadow-sm" />
        {panels.map((panel) => (
          <Tabs.Trigger key={panel.value} value={panel.value} className={triggerClass}>
            {panel.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {panels.map((panel) => (
        <Tabs.Content
          key={panel.value}
          value={panel.value}
          className="motion-panel pt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {panel.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
