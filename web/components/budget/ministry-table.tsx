import type { ReactNode } from "react";
import Link from "next/link";
import { Amount } from "./amount";
import { BudgetOrgName } from "./budget-org-name";
import { ChangeIndicator } from "./change-indicator";
import { DisclosureChevron } from "./disclosure-chevron";
import { L, T } from "@/components/i18n/t";
import { interpolate } from "@/lib/i18n/locales";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import type { BudgetOverview } from "@/lib/budget";

/* On a narrow column every row becomes a small card of labelled cells (the @max-[34rem] variants); the rows keep their table roles. */
function Cell({ label, children, className = "" }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <td role="cell" className={`py-2 text-end align-top tabular-nums @max-[34rem]:block @max-[34rem]:text-start ${className}`}>
      <span className={`hidden text-[11px] font-normal text-ink-faint @max-[34rem]:block`}>
        {label}
      </span>
      {children}
    </td>
  );
}

function Missing() {
  return (
    <span className="text-ink-faint">
      <T area="news" k="budgetNotReported" />
    </span>
  );
}

/**
 * The exact numbers behind the overview chart, one row per ministry, in a
 * disclosure that is closed by default. Spending sits first with its change,
 * then the year before, revenue and spending minus revenue; a total row ends
 * the table.
 */
export function MinistryTable({ overview }: { overview: BudgetOverview }) {
  const { items, unit, fiscalYear, previousFiscalYear, totals } = overview;
  const caption = (locale: "nl" | "en") =>
    interpolate(NEWS_DICT.budgetTableCaptionYear[locale], { year: fiscalYear });

  const head = (children: ReactNode, end = true) => (
    <th scope="col" className={`py-2 ${end ? "text-end" : "pe-3 text-start"} text-xs font-medium text-ink-faint`}>
      {children}
    </th>
  );

  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-accent-text [&::-webkit-details-marker]:hidden">
        <DisclosureChevron />
        <T area="news" k="budgetRadarTableSummary" />
      </summary>
      <div className="@container">
        <table role="table" className={`w-full border-collapse text-sm @max-[34rem]:block`}>
          <caption className="sr-only">
            <L nl={caption("nl")} en={caption("en")} />
          </caption>
          <thead role="rowgroup" className="@max-[34rem]:hidden">
            <tr role="row" className="border-b border-line">
              {head(<T area="news" k="budgetRadarTableMinistry" />, false)}
              {head(<T area="news" k="budgetSpendingShort" />)}
              {head(<T area="news" k="budgetTablePreviousYear" vars={{ year: previousFiscalYear }} />)}
              {head(<T area="news" k="budgetRevenueLabel" />)}
              {head(<T area="news" k="budgetNetLabel" />)}
            </tr>
          </thead>
          <tbody role="rowgroup" className={`@max-[34rem]:block`}>
            {items.map((item) => {
              const { organization, current, previous, spendingDelta } = item;
              const label = <T area="news" k="budgetSpendingShort" />;
              return (
                <tr
                  key={organization.id}
                  role="row"
                  className={`border-b border-line @max-[34rem]:grid @max-[34rem]:grid-cols-2 @max-[34rem]:gap-x-3 @max-[34rem]:py-2`}
                >
                  <th
                    scope="row"
                    role="rowheader"
                    className={`py-2 pe-3 text-start align-top font-normal leading-snug @max-[34rem]:col-span-2 @max-[34rem]:block @max-[34rem]:py-0 @max-[34rem]:pb-1`}
                  >
                    <Link
                      href={`/begroting/${organization.slug}/`}
                      className="inline-block text-ink underline-offset-2 hover:text-accent-text hover:underline pointer-coarse:flex pointer-coarse:min-h-11 pointer-coarse:flex-col pointer-coarse:justify-center"
                    >
                      <BudgetOrgName name={organization.name} />
                    </Link>
                  </th>
                  <Cell label={label} className={`@max-[34rem]:py-0.5`}>
                    <span className="font-medium text-ink">
                      {current.spendingBudget !== null ? <Amount value={current.spendingBudget} unit={unit} /> : <Missing />}
                    </span>
                    {spendingDelta !== null ? (
                      <ChangeIndicator
                        absolute={spendingDelta.absolute}
                        percent={spendingDelta.percent}
                        unit={unit}
                        since={previousFiscalYear}
                        labelKey="budgetChangeIndicatorLabel"
                        showSince={false}
                        className="mt-0.5 justify-end @max-[34rem]:justify-start"
                      />
                    ) : null}
                  </Cell>
                  <Cell label={<T area="news" k="budgetTablePreviousYear" vars={{ year: previousFiscalYear }} />} className={`@max-[34rem]:py-0.5`}>
                    {previous?.spendingBudget !== null && previous?.spendingBudget !== undefined ? (
                      <Amount value={previous.spendingBudget} unit={unit} className="text-ink-muted" />
                    ) : (
                      <Missing />
                    )}
                  </Cell>
                  <Cell label={<T area="news" k="budgetRevenueLabel" />} className={`@max-[34rem]:py-0.5`}>
                    {current.revenue !== null ? <Amount value={current.revenue} unit={unit} className="text-ink-muted" /> : <Missing />}
                  </Cell>
                  <Cell label={<T area="news" k="budgetNetLabel" />} className={`@max-[34rem]:py-0.5`}>
                    {current.net !== null ? <Amount value={current.net} unit={unit} className="text-ink-muted" /> : <Missing />}
                  </Cell>
                </tr>
              );
            })}
          </tbody>
          <tfoot role="rowgroup" className={`@max-[34rem]:block`}>
            <tr role="row" className={`font-medium @max-[34rem]:grid @max-[34rem]:grid-cols-2 @max-[34rem]:gap-x-3 @max-[34rem]:pt-2`}>
              <th scope="row" role="rowheader" className={`py-2 pe-3 text-start @max-[34rem]:col-span-2 @max-[34rem]:block @max-[34rem]:py-0 @max-[34rem]:pb-1`}>
                <T area="news" k="budgetTableTotal" />
              </th>
              <Cell label={<T area="news" k="budgetSpendingShort" />} className={`text-ink @max-[34rem]:py-0.5`}>
                {totals.spendingBudget !== null ? <Amount value={totals.spendingBudget} unit={unit} /> : <Missing />}
              </Cell>
              <Cell label={<T area="news" k="budgetTablePreviousYear" vars={{ year: previousFiscalYear }} />} className={`text-ink @max-[34rem]:py-0.5`}>
                {overview.previousTotals.spendingBudget !== null ? <Amount value={overview.previousTotals.spendingBudget} unit={unit} /> : <Missing />}
              </Cell>
              <Cell label={<T area="news" k="budgetRevenueLabel" />} className={`text-ink @max-[34rem]:py-0.5`}>
                {totals.revenue !== null ? <Amount value={totals.revenue} unit={unit} /> : <Missing />}
              </Cell>
              <Cell label={<T area="news" k="budgetNetLabel" />} className={`text-ink @max-[34rem]:py-0.5`}>
                {totals.net !== null ? <Amount value={totals.net} unit={unit} /> : <Missing />}
              </Cell>
            </tr>
          </tfoot>
        </table>
      </div>
    </details>
  );
}
