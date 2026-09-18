import { EmptyState } from "@/components/empty-state";
import { T } from "@/components/i18n/t";
import { SourceLink } from "@/components/source-link";
import { getSourceById } from "@/lib/data";
import { formatBudgetAmount, type BudgetHistoryRow } from "@/lib/budget";
import type { SourceRef } from "@/lib/types";

const HISTORY_START_YEAR = 2013;

export function BudgetHistory({
  history,
  unit,
  sources,
}: {
  history: BudgetHistoryRow[];
  unit: string | null;
  sources: SourceRef[];
}) {
  if (history.length === 0) {
    return (
      <EmptyState
        title="Geen reeks beschikbaar"
        description="Voor deze organisatie bevat de bron geen reeks van gerealiseerde uitgaven per jaar."
      />
    );
  }

  const max = history.reduce(
    (value, row) => (row.spendingActual !== null && row.spendingActual > value ? row.spendingActual : value),
    0,
  );
  const earliest = history[0].fiscalYear;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <caption className="sr-only">
            Gerealiseerde uitgaven en ontvangsten per jaar, in {unit ?? "onbekende eenheid"}
          </caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="py-2 pe-3 text-xs uppercase tracking-wider font-medium text-ink-faint">
                <T area="news" k="budgetTableYear" />
              </th>
              <th scope="col" className="py-2 pe-3 text-right text-xs uppercase tracking-wider font-medium text-ink-faint">
                <T area="news" k="budgetSpendingActualLabel" />
              </th>
              <th scope="col" className="py-2 pe-3 text-right text-xs uppercase tracking-wider font-medium text-ink-faint">
              <T area="news" k="budgetRevenueLabel" />
              </th>
              <th scope="col" className="w-24 py-2 text-xs uppercase tracking-wider font-medium text-ink-faint">
                <span className="sr-only">Vergelijking</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => {
              const share =
                max > 0 && row.spendingActual !== null
                  ? Math.max(2, Math.round((row.spendingActual / max) * 100))
                  : 0;
              return (
                <tr key={row.fiscalYear} className="border-b border-line last:border-b-0">
                  <th scope="row" className="py-2 pe-3 text-left font-normal tabular-nums text-ink-muted">
                    {row.fiscalYear}
                  </th>
                  <td className="py-2 pe-3 text-right tabular-nums text-ink">
                    {formatBudgetAmount(row.spendingActual, unit) ?? (
                      <span className="text-ink-faint">Niet gerapporteerd</span>
                    )}
                  </td>
                  <td className="py-2 pe-3 text-right tabular-nums text-ink">
                    {formatBudgetAmount(row.revenue, unit) ?? (
                      <span className="text-ink-faint">Niet gerapporteerd</span>
                    )}
                  </td>
                  <td className="py-2" aria-hidden="true">
                    <span className="block h-2 w-full rounded-pill bg-surface-inset">
                      <span
                        className="block h-2 rounded-pill bg-accent"
                        style={{ width: `${share}%` }}
                      />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {earliest > HISTORY_START_YEAR ? (
        <p className="mt-2 text-xs text-ink-faint">
          <T area="news" k="budgetHistoryStartNote" vars={{ year: earliest }} />
        </p>
      ) : null}

      {sources.length > 0 ? (
        <p className="mt-2 text-xs text-ink-faint">
          Bron:{" "}
          {sources.map((ref, index) => {
            const source = getSourceById(ref.source);
            return (
              <span key={ref.source}>
                {index > 0 ? ", " : null}
                {source ? (
                  <SourceLink href={source.url}>{source.title}</SourceLink>
                ) : (
                  <span>Onbekende bron ({ref.source})</span>
                )}
              </span>
            );
          })}
        </p>
      ) : null}
    </div>
  );
}
