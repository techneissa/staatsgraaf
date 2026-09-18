"use client";

import type { ReactNode } from "react";
import { useT } from "@/components/i18n/use-t";

/** Nav wrapper for server components: the accessible name is locale-aware. */
export function LabelledNav({
  area = "entity",
  k,
  className,
  children,
}: {
  area?: "entity" | "common";
  k: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useT(area);
  return (
    <nav aria-label={t(k)} className={className}>
      {children}
    </nav>
  );
}
