"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

export type ChangeWindowPanel = {
  value: string;
  label: string;
  content: ReactNode;
};

const triggerClass =
  "rounded-pill px-3 py-1 text-xs font-medium uppercase tracking-wide text-ink-muted data-[state=active]:bg-surface data-[state=active]:text-ink";

export function ChangeWindowTabs({
  panels,
  defaultValue,
}: {
  panels: ChangeWindowPanel[];
  defaultValue: string;
}) {
  return (
    <Tabs.Root defaultValue={defaultValue}>
      <Tabs.List
        aria-label="Wijzigingsperiode"
        className="inline-flex items-center gap-0.5 rounded-pill border border-line bg-surface-inset p-0.5"
      >
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
          className="pt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {panel.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
