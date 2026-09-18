"use client";

import type { ReactNode } from "react";
import { useDict } from "@/components/i18n/use-t";

/** The numbered source link on a news card, with a locale-aware accessible name. */
export function SourceRankLink({
  href,
  rank,
  children,
}: {
  href: string;
  rank: number;
  children: ReactNode;
}) {
  const t = useDict("news");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("sourceRankAria", { rank })}
      className="tabular-nums font-medium text-accent-text underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}
