"use client";

import Link from "next/link";
import { useDict } from "@/components/i18n/use-t";

/**
 * A numbered source marker, for example ^1, linking to the matching numbered
 * entry in the source list at the bottom of the budget page.
 */
export function FootnoteMarker({ number }: { number: number }) {
  const t = useDict("news");
  return (
    <sup className="ms-0.5 align-super text-[10px] font-semibold leading-none text-accent-text">
      <Link
        href={`#bron-${number}`}
        className="no-underline hover:underline"
        aria-label={t("budgetFootnoteAria", { number })}
      >
        ^{number}
      </Link>
    </sup>
  );
}

/** The markers for one budget category, in source-list order. */
export function FootnoteMarkers({ numbers }: { numbers: number[] }) {
  if (numbers.length === 0) return null;
  return (
    <span className="inline-flex items-baseline gap-0.5">
      {numbers.map((number) => (
        <FootnoteMarker key={number} number={number} />
      ))}
    </span>
  );
}
