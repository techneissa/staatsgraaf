"use client";

import type { ReactNode } from "react";
import { useDict } from "@/components/i18n/use-t";

/** A list whose accessible name comes from the news dictionary and swaps with the stored locale. */
export function LabeledList({
  labelKey,
  className,
  children,
}: {
  labelKey: string;
  className: string;
  children: ReactNode;
}) {
  const t = useDict("news");
  return (
    <ul className={className} aria-label={t(labelKey)}>
      {children}
    </ul>
  );
}
