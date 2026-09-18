import { getS } from "@/lib/i18n/server-strings";
import { formatBudgetAmount, formatBudgetPercent, type BudgetDelta } from "@/lib/budget";
import { interpolate } from "@/lib/i18n/locales";

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
  delta,
  unit,
  since,
  label = "de uitgaven",
}: {
  delta: BudgetDelta;
  unit: string | null | undefined;
  since: string;
  label?: string;
}) {
  const direction = delta.absolute > 0 ? "up" : delta.absolute < 0 ? "down" : "flat";
  const directionWord =
    direction === "up"
      ? getS("news", "budgetChangeUp")
      : direction === "down"
        ? getS("news", "budgetChangeDown")
        : getS("news", "budgetChangeFlat");
  const sign = direction === "up" ? "+" : direction === "down" ? "−" : "";
  const percent =
    delta.percent !== null ? `${sign}${formatBudgetPercent(delta.percent)}` : null;
  const absolute = formatBudgetAmount(delta.absolute, unit) ?? "onbekend";

  return (
    <p
      className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs"
      style={{ color: TONE[direction] }}
    >
      <span className="sr-only">
        {label} zijn {directionWord} met {percent ?? absolute} ten opzichte van {since}:
      </span>
      <TrendArrow direction={direction} />
      <span className="font-medium tabular-nums">{percent ?? absolute}</span>
      <span className="text-ink-faint">
        {interpolate(getS("news", "budgetChangeSince"), { year: since })}
      </span>
    </p>
  );
}
