import { Amount } from "./amount";
import { L, T } from "@/components/i18n/t";
import { interpolate } from "@/lib/i18n/locales";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { type BudgetHistoryRow } from "@/lib/budget";

function Cell({ value, unit }: { value: number | null | undefined; unit: string | null }) {
  if (value === null || value === undefined) {
    return (
      <span className="text-ink-faint">
        <T area="news" k="budgetNotReported" />
      </span>
    );
  }
  return <Amount value={value} unit={unit} />;
}

/**
 * Realized amounts per year, collapsed by default: the section heading is the
 * disclosure, and it names the years the series covers.
 */
export function BudgetHistory({ history, unit }: { history: BudgetHistoryRow[]; unit: string | null }) {
  if (history.length === 0) {
    return (
      <div className="py-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          <T area="news" k="budgetHistoryHeading" />
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          <T area="news" k="budgetHistoryEmptyDescription" />
        </p>
      </div>
    );
  }

  const max = history.reduce(
    (value, row) => (row.spendingActual !== null && row.spendingActual > value ? row.spendingActual : value),
    0,
  );
  const from = history[0].fiscalYear;
  const to = history[history.length - 1].fiscalYear;
  const captionNl = interpolate(NEWS_DICT.budgetHistoryCaptionSr.nl, {
    unit: unit ?? NEWS_DICT.budgetUnknownUnit.nl,
  });
  const captionEn = interpolate(NEWS_DICT.budgetHistoryCaptionSr.en, {
    unit: unit ?? NEWS_DICT.budgetUnknownUnit.en,
  });

  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          width="14"
          height="14"
          className="shrink-0 text-ink-muted transition-fast group-open:rotate-90"
        >
          <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          <T area="news" k="budgetHistorySummary" vars={{ from, to }} />
        </h2>
      </summary>
      <table className="mt-2 w-full border-collapse text-sm tabular-nums">
        <caption className="sr-only">
          <L nl={captionNl} en={captionEn} />
        </caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="py-2 pe-3 text-xs font-medium text-ink-faint">
              <T area="news" k="budgetTableYear" />
            </th>
            <th scope="col" className="py-2 pe-3 text-right text-xs font-medium text-ink-faint">
              <T area="news" k="budgetSpendingShort" />
            </th>
            <th scope="col" className="py-2 pe-3 text-right text-xs font-medium text-ink-faint">
              <T area="news" k="budgetRevenueLabel" />
            </th>
            <th scope="col" className="w-[22%] py-2">
              <span className="sr-only">
                <T area="news" k="budgetTableComparison" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((row) => {
            const share =
              max > 0 && row.spendingActual !== null ? Math.max(2, Math.round((row.spendingActual / max) * 100)) : 0;
            return (
              <tr key={row.fiscalYear} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-2 pe-3 text-left font-normal text-ink-muted">
                  {row.fiscalYear}
                </th>
                <td className="whitespace-nowrap py-2 pe-3 text-right text-ink">
                  <Cell value={row.spendingActual} unit={unit} />
                </td>
                <td className="whitespace-nowrap py-2 pe-3 text-right text-ink">
                  <Cell value={row.revenue} unit={unit} />
                </td>
                <td className="py-2" aria-hidden="true">
                  <span className="block h-1 w-full rounded-pill bg-surface-inset">
                    <span className="block h-1 rounded-pill bg-accent" style={{ width: `${share}%` }} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </details>
  );
}
