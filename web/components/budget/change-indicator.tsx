"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { useDict } from "@/components/i18n/use-t";
import { formatBudgetAmount, formatPercent } from "@/lib/budget-format";

/** Up and down share the branch tokens: leaf green for growth, deep red for decline. */
const TONE: Record<"up" | "down" | "flat", string> = {
  up: "var(--t-color-sector-adviescolleges)",
  down: "var(--t-color-sector-staten-generaal)",
  flat: "var(--t-color-ink-faint)",
};

function TrendArrow({ direction }: { direction: "up" | "down" | "flat" }) {
  const path =
    direction === "up"
      ? "M8 11V2.5M3.5 6.5 8 2l4.5 4.5"
      : direction === "down"
        ? "M8 1v8.5M3.5 5.5 8 10l4.5-4.5"
        : "M3 6h10";
  return (
    <svg aria-hidden="true" viewBox="0 0 16 12" width="12" height="12" className="shrink-0">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The change against an earlier year: an arrow, a signed percentage in the
 * reader's locale and the colour of the direction, so colour never carries
 * the meaning alone. `showSince` adds the visible "t.o.v. 2025"; screen
 * readers always hear the comparison year.
 */
export function ChangeIndicator({
  absolute,
  percent,
  unit,
  since,
  labelKey = "budgetChangeIndicatorDefault",
  showSince = true,
  className = "mt-2",
}: {
  /** Absolute change in the unit of the source. */
  absolute: number;
  /** Relative change in percent, or null when it cannot be computed. */
  percent: number | null;
  unit: string | null;
  since: number | string;
  labelKey?: "budgetChangeIndicatorDefault" | "budgetChangeIndicatorLabel" | "budgetTotalsChangeLabel";
  showSince?: boolean;
  className?: string;
}) {
  const t = useDict("news");
  const locale = useLocale() === "en" ? "en" : "nl";
  const direction: "up" | "down" | "flat" =
    percent !== null
      ? Math.round(percent * 10) === 0
        ? "flat"
        : percent > 0
          ? "up"
          : "down"
      : absolute > 0
        ? "up"
        : absolute < 0
          ? "down"
          : "flat";
  const sign = absolute > 0 ? "+" : absolute < 0 ? "−" : "";
  const amount =
    percent !== null
      ? formatPercent(percent, locale, { signed: true })
      : (() => {
          const formatted = formatBudgetAmount(Math.abs(absolute), unit, locale);
          return formatted !== null ? `${sign}${formatted}` : t("budgetChangeUnknown");
        })();
  const srKey =
    direction === "up" ? "budgetChangeSrUp" : direction === "down" ? "budgetChangeSrDown" : "budgetChangeSrFlat";

  return (
    <p className={`flex flex-wrap items-center gap-x-1.5 text-xs ${className}`} style={{ color: TONE[direction] }}>
      <span className="sr-only">{t(srKey, { label: t(labelKey), amount, year: since })}</span>
      <TrendArrow direction={direction} />
      <span aria-hidden="true" className="font-medium tabular-nums">
        {amount}
      </span>
      {showSince ? (
        <span aria-hidden="true" className="text-ink-faint">
          {t("budgetChangeSince", { year: since })}
        </span>
      ) : null}
    </p>
  );
}
