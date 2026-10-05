import { History } from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";
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
 * Realized spending and revenue per year as a plain table. The page puts it in
 * a disclosure with the other exact figures, so it carries its own small
 * heading and no folding of its own.
 */
export function BudgetHistory({ history, unit }: { history: BudgetHistoryRow[]; unit: string | null }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        <T area="news" k="budgetHistoryEmptyDescription" />
      </p>
    );
  }

  const from = history[0].fiscalYear;
  const to = history[history.length - 1].fiscalYear;
  const captionNl = interpolate(NEWS_DICT.budgetHistoryCaptionSr.nl, {
    unit: unit ?? NEWS_DICT.budgetUnknownUnit.nl,
  });
  const captionEn = interpolate(NEWS_DICT.budgetHistoryCaptionSr.en, {
    unit: unit ?? NEWS_DICT.budgetUnknownUnit.en,
  });

  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <LucideIcon icon={History} size={15} className="shrink-0 text-ink-muted" />
        <T area="news" k="budgetHistorySummary" vars={{ from, to }} />
      </h3>
      <table className="mt-1 w-full border-collapse text-sm tabular-nums">
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
            <th scope="col" className="py-2 text-right text-xs font-medium text-ink-faint">
              <T area="news" k="budgetRevenueLabel" />
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((row) => (
            <tr key={row.fiscalYear} className="border-b border-line last:border-b-0">
              <th scope="row" className="py-1.5 pe-3 text-left font-normal text-ink-muted">
                {row.fiscalYear}
              </th>
              <td className="py-1.5 pe-3 text-right text-ink">
                <Cell value={row.spendingActual} unit={unit} />
              </td>
              <td className="py-1.5 text-right text-ink">
                <Cell value={row.revenue} unit={unit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
