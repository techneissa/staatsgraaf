import { L } from "@/components/i18n/t";
import { T } from "@/components/i18n/t";
import { interpolate } from "@/lib/i18n/locales";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { Amount } from "./amount";
import type { AmountSet } from "@/lib/types";

type AmountKey = "spendingBudget" | "spendingActual" | "revenue" | "net";

const ROWS: { k: string; key: AmountKey }[] = [
  { k: "budgetSpendingLabel", key: "spendingBudget" },
  { k: "budgetSpendingActualLabel", key: "spendingActual" },
  { k: "budgetRevenueLabel", key: "revenue" },
  { k: "budgetNetFormula", key: "net" },
];

function Cell({
  value,
  unit,
}: {
  value: number | null;
  unit: string | null | undefined;
}) {
  if (value === null) {
    return (
      <span className="text-ink-faint">
        <T area="news" k="budgetNotReported" />
      </span>
    );
  }
  return <Amount value={value} unit={unit} className="tabular-nums text-ink" />;
}

export function BudgetYearFigures({
  unit,
  currentYear,
  previousYear,
  current,
  previous,
}: {
  unit: string | null;
  currentYear: number;
  previousYear: number;
  current: AmountSet;
  previous: AmountSet | null;
}) {
  const captionNl = interpolate(NEWS_DICT.budgetYearFiguresCaption.nl, {
    unit: unit ?? NEWS_DICT.budgetUnknownUnit.nl,
  });
  const captionEn = interpolate(NEWS_DICT.budgetYearFiguresCaption.en, {
    unit: unit ?? NEWS_DICT.budgetUnknownUnit.en,
  });

  return (
    <div>
      <div>
        <table className="w-full border-collapse text-sm tabular-nums">
          <caption className="sr-only">
            <L nl={captionNl} en={captionEn} />
          </caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="py-2 pe-3 text-xs font-medium text-ink-faint">
                  <T area="news" k="budgetTableAmount" />
              </th>
              <th scope="col" className="py-2 pe-3 text-right text-xs font-medium text-ink-faint">
                {currentYear}
              </th>
              <th scope="col" className="py-2 text-right text-xs font-medium text-ink-faint">
                {previousYear}
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-2 pe-3 text-left font-normal text-ink-muted">
                  <T area="news" k={row.k} />
                </th>
                <td className="whitespace-nowrap py-2 pe-3 text-right">
                  <Cell value={current[row.key]} unit={unit} />
                </td>
                <td className="whitespace-nowrap py-2 text-right">
                  {previous !== null ? (
                    <Cell value={previous[row.key]} unit={unit} />
                  ) : (
                    <span className="text-ink-faint">
                      <T area="news" k="budgetNotAvailable" />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
