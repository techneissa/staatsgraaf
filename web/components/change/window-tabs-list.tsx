"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useT } from "@/components/i18n/use-t";
import { SlidingIndicator } from "@/components/motion/sliding-indicator";

/**
 * The 7/30/90 day switch: a small segmented control for the top right of a
 * section header. Lives inside a `Tabs.Root`. Compact with a mouse, 44 px tall
 * on touch.
 */
export function WindowTabsList({ windows }: { windows: readonly { value: string; days: number }[] }) {
  const t = useT("home");
  return (
    <Tabs.List
      aria-label={t("windowTabsLabel")}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-sm border border-line bg-surface-inset p-0.5"
    >
      <SlidingIndicator className="rounded-xs bg-surface shadow-sm" />
      {windows.map((window) => (
        <Tabs.Trigger
          key={window.value}
          value={window.value}
          aria-label={t("windowOptionAria", { n: window.days })}
          className="inline-flex min-h-7 min-w-9 items-center justify-center whitespace-nowrap rounded-xs px-2 text-xs font-medium tabular-nums text-ink-muted transition-fast hover:text-ink data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm pointer-coarse:min-h-11 pointer-coarse:min-w-11"
        >
          {window.days}d
        </Tabs.Trigger>
      ))}
    </Tabs.List>
  );
}
