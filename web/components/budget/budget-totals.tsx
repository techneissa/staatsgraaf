import type { ReactNode } from "react";
import { Building2, HandCoins, Scale, Wallet } from "lucide";
import { Amount } from "./amount";
import { ChangeIndicator } from "./change-indicator";
import { StatTile } from "./stat-tile";
import { DisclosureChevron } from "./disclosure-chevron";
import { T } from "@/components/i18n/t";
import type { BudgetOverview, BudgetTotals as Totals } from "@/lib/budget";

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
 * The summed totals of the ministry budgets as four headline tiles: spending
 * with its change, revenue, spending minus revenue and the number of
 * ministries. The year sits in the heading above, so the tiles do not repeat
 * it. The long explanations (what the sum includes, how the net is
 * calculated, last year's realized spending) sit in one disclosure.
 */
export function BudgetTotals({ overview }: { overview: BudgetOverview }) {
  const { totals, previousTotals, spendingDelta, unit, previousFiscalYear } = overview;
  const partial = totals.spendingBudgetCounted < totals.expected;

  return (
    <div className="@container">
      <dl className="grid grid-cols-2 gap-2 @[44rem]:grid-cols-4 @[44rem]:gap-3">
        <StatTile
          icon={Wallet}
          tone="sector-regering"
          label={<T area="news" k="budgetSpendingLabel" />}
          value={totalValue(totals, "spendingBudget", unit)}
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
          icon={HandCoins}
          tone="sector-decentraal-provinciaal"
          label={<T area="news" k="budgetRevenueLabel" />}
          value={totalValue(totals, "revenue", unit)}
        />
        <StatTile
          icon={Scale}
          tone="sector-hoge-colleges"
          label={<T area="news" k="budgetNetLabel" />}
          value={totalValue(totals, "net", unit)}
        />
        <StatTile
          icon={Building2}
          tone="sector-waterschap"
          label={<T area="news" k="budgetMinistriesCountLabel" />}
          value={<span className="tabular-nums">{totals.expected}</span>}
          caption={<T area="news" k="budgetMinistriesCountCaption" />}
        />
      </dl>

      <details className="group mt-2">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-accent-text [&::-webkit-details-marker]:hidden">
          <DisclosureChevron />
          <T area="news" k="budgetAboutTotals" />
        </summary>
        <div className="space-y-2 pb-2 text-xs leading-relaxed text-ink-faint">
          <p>
            <T area="news" k="budgetSpendingActualLabel" /> {previousFiscalYear}:{" "}
            <span className="font-medium text-ink-muted">{totalValue(previousTotals, "spendingActual", unit)}</span>
          </p>
          <p>
            <T area="news" k="budgetTotalsNote" /> <T area="news" k="budgetNetNote" />
            {partial ? (
              <>
                {" "}
                <T area="news" k="budgetTotalsPartialNote" />
              </>
            ) : null}
          </p>
        </div>
      </details>
    </div>
  );
}
