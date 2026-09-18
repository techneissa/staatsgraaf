"use client";

import type { ReactNode } from "react";
import { Timeline } from "@/components/timeline";
import { useT } from "@/components/i18n/use-t";

/** Timeline wrapper for server components: the list label is locale-aware. */
export function TimelineT({
  items,
  area = "entity",
  labelKey,
  className,
}: {
  items: Parameters<typeof Timeline>[0]["items"];
  area?: "entity" | "common";
  labelKey: string;
  className?: string;
}) {
  const t = useT(area);
  return <Timeline items={items} label={t(labelKey)} />;
}
