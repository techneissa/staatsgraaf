"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { useT } from "./i18n/use-t";

const triggerClass =
  "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-muted transition-fast hover:text-ink data-[state=active]:border-accent data-[state=active]:text-ink";

export function EntityTabs({ news, connections }: { news: ReactNode; connections: ReactNode }) {
  const t = useT("entity");
  return (
    <Tabs.Root defaultValue="nieuws" className="mt-6">
      <Tabs.List aria-label={t("panelLabel")} className="flex items-center gap-1 border-b border-line">
        <Tabs.Trigger value="nieuws" className={triggerClass}>
          {t("tabNews")}
        </Tabs.Trigger>
        <Tabs.Trigger value="verbindingen" className={triggerClass}>
          {t("whosConnected")}
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content
        value="nieuws"
        className="pt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {news}
      </Tabs.Content>
      <Tabs.Content
        value="verbindingen"
        className="pt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {connections}
      </Tabs.Content>
    </Tabs.Root>
  );
}
