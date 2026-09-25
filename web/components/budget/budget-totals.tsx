import type { ReactNode } from "react";
import { Amount } from "./amount";
import { ChangeIndicator } from "./change-indicator";
import { T } from "@/components/i18n/t";
import type { BudgetOverview, BudgetTotals as Totals } from "@/lib/budget";

/**
 * One total. The amount never breaks across lines; the tiles reflow by the
 * width of the column they sit in (container queries), not the screen, so a
 * 32rem page column beside the canvas gets two tiles a row, like a phone.
 */
function StatTile({
  label,
  value,
  caption,
  extra,
}: {
  label: ReactNode;
  value: ReactNode;
  caption: string | null;
  extra?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-md border border-line bg-surface px-3 py-2.5 @[40rem]:px-4 @[40rem]:py-3">
      <dt className="text-xs leading-snug text-ink-muted">
        {label}
        {caption !== null ? <span className="text-ink-faint"> · {caption}</span> : null}
      </dt>
      <dd className="mt-1 whitespace-nowrap text-lg font-semibold tracking-tight text-ink @[26rem]:text-xl">
        {value}
      </dd>
      {extra !== undefined ? <dd>{extra}</dd> : null}
    </div>
  );
}

function totalValue(
  totals: Totals,
  key: "spendingBudget" | "revenue" | "net" | "spendingActual",
  unit: string | null,
): ReactNode {
  const value = totals[key];
  return value !== null && value !== undefined ? (
    <Amount value={value} unit={unit} />
  ) : (
    <span className="text-sm font-normal text-ink-faint">
      <T area="news" k="budgetNotReported" />
    </span>
  );
}

/**
 * The summed totals of the ministry budgets. Where a heading above already
 * names the budget year, pass `yearInHeading` so the tiles only mark the one
 * figure from another year.
 */
export function BudgetTotals({
  overview,
  yearInHeading = false,
}: {
  overview: BudgetOverview;
  yearInHeading?: boolean;
}) {
  const { totals, previousTotals, spendingDelta, unit, fiscalYear, previousFiscalYear } = overview;
  const partial = totals.spendingBudgetCounted < totals.expected;
  const currentCaption = yearInHeading ? null : String(fiscalYear);

  return (
    <div className="@container">
      <dl className="grid grid-cols-1 gap-2 @[18rem]:grid-cols-2 @[44rem]:grid-cols-4 @[44rem]:gap-3">
        <StatTile
          label={<T area="news" k="budgetSpendingLabel" />}
          value={totalValue(totals, "spendingBudget", unit)}
          caption={currentCaption}
          extra={
            spendingDelta !== null ? (
              <ChangeIndicator
                absolute={spendingDelta.absolute}
                percent={spendingDelta.percent}
                unit={unit}
                since={previousFiscalYear}
                labelKey="budgetTotalsChangeLabel"
                className="mt-1"
              />
            ) : undefined
          }
        />
        <StatTile
          label={<T area="news" k="budgetSpendingActualLabel" />}
          value={totalValue(previousTotals, "spendingActual", unit)}
          caption={String(previousFiscalYear)}
        />
        <StatTile
          label={<T area="news" k="budgetRevenueLabel" />}
          value={totalValue(totals, "revenue", unit)}
          caption={currentCaption}
        />
        <StatTile
          label={<T area="news" k="budgetNetLabel" />}
          value={totalValue(totals, "net", unit)}
          caption={currentCaption}
        />
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        <T area="news" k="budgetTotalsNote" />
        {partial ? (
          <>
            {" "}
            <T area="news" k="budgetTotalsPartialNote" />
          </>
        ) : null}
      </p>
    </div>
  );
}
