import type { ReactNode } from "react";
import { ChangeIndicator } from "./change-indicator";
import { T } from "@/components/i18n/t";
import {
  budgetUnitLabel,
  formatBudgetAmount,
  formatBudgetPercent,
  type BudgetDelta,
  type BudgetOverview,
  type BudgetTotals,
} from "@/lib/budget";

function StatTile({
  label,
  value,
  caption,
}: {
  label: ReactNode;
  value: ReactNode;
  caption: string;
}) {
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <h4 className="text-[10px] font-medium uppercase tracking-widest text-ink-faint">{label}</h4>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-faint">{caption}</p>
    </div>
  );
}

function totalValue(
  totals: BudgetTotals,
  key: "spendingBudget" | "revenue" | "net" | "spendingActual",
  unit: string | null,
): ReactNode {
  return formatBudgetAmount(totals[key], unit) ?? <T area="news" k="budgetNotReported" />;
}

function changeView(delta: BudgetDelta, unit: string | null) {
  const direction =
    delta.absolute > 0 ? "up" : delta.absolute < 0 ? "down" : "flat";
  const sign = direction === "up" ? "+" : direction === "down" ? "−" : "";
  return {
    direction,
    percent:
      delta.percent !== null ? `${sign}${formatBudgetPercent(delta.percent)}` : null,
    absolute: formatBudgetAmount(delta.absolute, unit),
  } as const;
}

export function BudgetTotals({ overview }: { overview: BudgetOverview }) {
  const { totals, previousTotals, spendingDelta, unit, fiscalYear, previousFiscalYear } = overview;
  const partial = totals.spendingBudgetCounted < totals.expected;
  const unitLabel = budgetUnitLabel(unit);

  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">
        <T area="news" k="budgetTotalsCaption" vars={{ count: totals.expected }} />
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={<T area="news" k="budgetSpendingLabel" />}
          value={totalValue(totals, "spendingBudget", unit)}
          caption={String(fiscalYear)}
        />
        <StatTile
          label={<T area="news" k="budgetSpendingActualLabel" />}
          value={totalValue(previousTotals, "spendingActual", unit)}
          caption={String(previousFiscalYear)}
        />
        <StatTile
          label={<T area="news" k="budgetRevenueLabel" />}
          value={totalValue(totals, "revenue", unit)}
          caption={String(fiscalYear)}
        />
        <StatTile
          label={<T area="news" k="budgetNetLabel" />}
          value={totalValue(totals, "net", unit)}
          caption={String(fiscalYear)}
        />
      </div>

      {spendingDelta !== null ? (
        <ChangeIndicator
          {...changeView(spendingDelta, unit)}
          since={String(previousFiscalYear)}
          labelKey="budgetTotalsChangeLabel"
        />
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        {unitLabel !== null ? (
          <>
            <T area="news" k="budgetUnitNote" vars={{ unit: unitLabel }} />{" "}
          </>
        ) : null}
        <T area="news" k="budgetTotalsNote" />
        {partial ? (
          <>
            {" "}
            <T area="news" k="budgetTotalsPartialNote" />
          </>
        ) : null}
      </p>
      <p className="mt-2 text-xs text-ink-faint">
        <T
          area="news"
          k="budgetTotalsComparable"
          vars={{
            counted: previousTotals.expected,
            total: totals.expected,
            year: previousFiscalYear,
          }}
        />
      </p>
    </div>
  );
}
