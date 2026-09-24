"use client";

import type { ReactNode } from "react";
import { useT } from "@/components/i18n/use-t";

/** A labelled region whose aria-label follows the site locale. */
export function AriaLabelT({ k, vars, children }: { k: string; vars?: Record<string, string | number>; children: ReactNode }) {
  const t = useT("home");
  return (
    <div role="region" aria-label={t(k, vars)}>
      {children}
    </div>
  );
}
