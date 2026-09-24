import { Amount } from "./amount";
import { L } from "@/components/i18n/t";
import { DictEmptyState } from "./dict-empty-state";
import { T } from "@/components/i18n/t";
import { interpolate } from "@/lib/i18n/locales";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { type BudgetHistoryRow } from "@/lib/budget";
import { toSourceNoteItems } from "./source-note-data";
import { SourceNote } from "./source-note";
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
      <DictEmptyState
        titleKey="budgetHistoryEmptyTitle"
        descriptionKey="budgetHistoryEmptyDescription"
      />
    );
  }

  const max = history.reduce(
    (value, row) => (row.spendingActual !== null && row.spendingActual > value ? row.spendingActual : value),
    0,
  );
  const earliest = history[0].fiscalYear;

  const captionNl = interpolate(NEWS_DICT.budgetHistoryCaptionSr.nl, {
    unit: unit ?? NEWS_DICT.budgetUnknownUnit.nl,
  });
  const captionEn = interpolate(NEWS_DICT.budgetHistoryCaptionSr.en, {
    unit: unit ?? NEWS_DICT.budgetUnknownUnit.en,
  });

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="motion-grow w-full border-collapse text-xs tabular-nums sm:min-w-[32rem] sm:text-sm" data-reveal="pending">
          <caption className="sr-only">
            <L nl={captionNl} en={captionEn} />
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
                <span className="sr-only">
                  <T area="news" k="budgetTableComparison" />
                </span>
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
                    {row.spendingActual !== null && row.spendingActual !== undefined ? <Amount value={row.spendingActual} unit={unit} /> : (
                      <span className="text-ink-faint">
                        <T area="news" k="budgetNotReported" />
                      </span>
                    )}
                  </td>
                  <td className="py-2 pe-3 text-right tabular-nums text-ink">
                    {row.revenue !== null && row.revenue !== undefined ? <Amount value={row.revenue} unit={unit} /> : (
                      <span className="text-ink-faint">
                        <T area="news" k="budgetNotReported" />
                      </span>
                    )}
                  </td>
                  <td className="py-2" aria-hidden="true">
                    <span className="block h-2 w-full rounded-pill bg-surface-inset">
                      <span
                        className="grow-x block h-2 rounded-pill bg-accent"
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

      <SourceNote items={toSourceNoteItems(sources)} />
    </div>
  );
}
