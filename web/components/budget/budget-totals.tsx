import type { ReactNode } from "react";
import { ChangeIndicator } from "./change-indicator";
import { T } from "@/components/i18n/t";
import { Amount } from "./amount";
import {
  formatBudgetAmount,
  formatBudgetPercent,
  type BudgetDelta,
  type BudgetOverview,
  type BudgetTotals,
} from "@/lib/budget";

/**
 * One total. The amount never breaks across lines; the tiles reflow by the
 * width of the column they sit in (container queries), not the screen, so a
 * 32rem page column beside the canvas gets two tiles a row, like a phone.
 */
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
    <div className="flex min-w-0 flex-col rounded-md border border-line bg-surface px-3 py-2.5 @[40rem]:px-4 @[40rem]:py-3">
      <dt className="text-xs leading-snug text-ink-muted">{label}</dt>
      <dd className="order-last mt-0.5 text-xs tabular-nums text-ink-faint">{caption}</dd>
      <dd className="mt-1 whitespace-nowrap text-lg font-semibold tabular-nums tracking-tight text-ink @[26rem]:text-xl">{value}</dd>
    </div>
  );
}

function totalValue(
  totals: BudgetTotals,
  key: "spendingBudget" | "revenue" | "net" | "spendingActual",
  unit: string | null,
): ReactNode {
  const value = totals[key];
  return value !== null && value !== undefined ? <Amount value={value} unit={unit} /> : <T area="news" k="budgetNotReported" />;
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

  return (
    <div className="@container">
      <h3 className="text-[13px] font-medium text-ink-muted">
        <T area="news" k="budgetTotalsCaption" vars={{ count: totals.expected }} />
      </h3>
      <dl className="mt-2.5 grid grid-cols-1 gap-2 @[18rem]:grid-cols-2 @[44rem]:grid-cols-4 @[44rem]:gap-3">
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
      </dl>

      {spendingDelta !== null ? (
        <ChangeIndicator
          {...changeView(spendingDelta, unit)}
          since={String(previousFiscalYear)}
          labelKey="budgetTotalsChangeLabel"
        />
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
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
