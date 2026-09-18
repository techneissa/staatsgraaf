"use client";

import { useDict } from "@/components/i18n/use-t";

/** Up and down share the branch tokens: leaf green for growth, deep red for decline. */
const TONE: Record<"up" | "down" | "flat", string> = {
  up: "var(--t-color-sector-adviescolleges)",
  down: "var(--t-color-sector-staten-generaal)",
  flat: "var(--t-color-ink-faint)",
};

function TrendArrow({ direction }: { direction: "up" | "down" | "flat" }) {
  const path =
    direction === "up"
      ? "M3 8.5 8 3.5l5 5"
      : direction === "down"
        ? "M3 3.5 8 8.5l5-5"
        : "M3 6h10";
  return (
    <svg aria-hidden="true" viewBox="0 0 16 12" width="12" height="12" className="shrink-0">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChangeIndicator({
  direction,
  percent,
  absolute,
  since,
  labelKey = "budgetChangeIndicatorDefault",
}: {
  direction: "up" | "down" | "flat";
  /** Signed percentage with sign, for example "+2,1%", or null when not computable. */
  percent: string | null;
  /** Formatted absolute change, or null when it could not be formatted. */
  absolute: string | null;
  since: string;
  labelKey?: "budgetChangeIndicatorDefault" | "budgetChangeIndicatorLabel" | "budgetTotalsChangeLabel";
}) {
  const t = useDict("news");
  const amount = percent ?? (absolute !== null ? absolute : t("budgetChangeUnknown"));
  const srKey =
    direction === "up"
      ? "budgetChangeSrUp"
      : direction === "down"
        ? "budgetChangeSrDown"
        : "budgetChangeSrFlat";

  return (
    <p
      className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs"
      style={{ color: TONE[direction] }}
    >
      <span className="sr-only">
        {t(srKey, { label: t(labelKey), amount, year: since })}
      </span>
      <TrendArrow direction={direction} />
      <span className="font-medium tabular-nums">{amount}</span>
      <span className="text-ink-faint">{t("budgetChangeSince", { year: since })}</span>
    </p>
  );
}
