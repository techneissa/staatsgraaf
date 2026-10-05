"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { WindowTabsList } from "@/components/change/window-tabs-list";
import { useSettled } from "@/components/motion/use-settled";

export type ChangeWindowPanel = {
  value: string;
  days: number;
  content: ReactNode;
};

/**
 * The section header with the 7/30/90 switch top right, level with the title,
 * then an optional row (the figure chips) and the panel of the chosen window.
 */
export function ChangeWindowTabs({
  heading,
  chips,
  panels,
  defaultValue,
}: {
  heading: ReactNode;
  chips?: ReactNode;
  panels: ChangeWindowPanel[];
  defaultValue: string;
}) {
  const settled = useSettled();
  return (
    <Tabs.Root defaultValue={defaultValue} data-settled={settled ? "" : undefined}>
      <div className="flex items-center justify-between gap-3">
        {heading}
        <WindowTabsList windows={panels} />
      </div>
      {chips}
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
