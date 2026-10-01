import { HandCoins, Wallet } from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { Amount } from "./amount";
import { L } from "@/components/i18n/t";
import { DictEmptyState } from "./dict-empty-state";
import { T } from "@/components/i18n/t";
import { interpolate } from "@/lib/i18n/locales";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { type BudgetBreakdownRow } from "@/lib/budget";

const TYPE_LABELS = {
  spending: "budgetBreakdownSpending",
  revenue: "budgetBreakdownRevenue",
} as const;

export function BudgetBreakdown({
  breakdown,
  unit,
}: {
  breakdown: BudgetBreakdownRow[];
  unit: string | null;
}) {
  if (breakdown.length === 0) {
    return (
      <DictEmptyState
        titleKey="budgetBreakdownEmptyTitle"
        descriptionKey="budgetBreakdownEmptyDescription"
      />
    );
  }

  const groups = (["spending", "revenue"] as const)
    .map((type) => ({ type, rows: breakdown.filter((row) => row.type === type) }))
    .filter((group) => group.rows.length > 0);

  const groupMax = (rows: BudgetBreakdownRow[]) =>
    rows.reduce((value, row) => (row.amount !== null && row.amount > value ? row.amount : value), 0);

  const caption = (type: keyof typeof TYPE_LABELS) => {
    const label = {
      nl: NEWS_DICT[TYPE_LABELS[type]].nl,
      en: NEWS_DICT[TYPE_LABELS[type]].en,
    };
    return {
      nl: interpolate(NEWS_DICT.budgetBreakdownCaption.nl, {
        label: label.nl,
        unit: unit ?? NEWS_DICT.budgetUnknownUnit.nl,
      }),
      en: interpolate(NEWS_DICT.budgetBreakdownCaption.en, {
        label: label.en,
        unit: unit ?? NEWS_DICT.budgetUnknownUnit.en,
      }),
    };
  };

  return (
    <div>
      {groups.map((group) => {
        const heading = TYPE_LABELS[group.type];
        const captionText = caption(group.type);
        return (
          <div key={group.type} className="mb-5 last:mb-0">
            <h3 className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
              <LucideIcon icon={group.type === "spending" ? Wallet : HandCoins} size={14} className="shrink-0" />
              <T area="news" k={heading} />
            </h3>
            <table className="motion-grow mt-2 w-full border-collapse text-sm" data-reveal="pending">
              <caption className="sr-only">
                <L nl={captionText.nl} en={captionText.en} />
              </caption>
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="py-2 pe-3 text-xs font-medium text-ink-faint">
                    <T area="news" k="budgetTableCategory" />
                  </th>
                  <th scope="col" className="py-2 text-right text-xs font-medium text-ink-faint">
                    <T area="news" k="budgetTableAmount" />
                  </th>
                  <th scope="col" className="w-24 py-2 pl-3 font-medium text-ink-faint">
                    <span className="sr-only">
                      <T area="news" k="budgetTableShareAria" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={`${group.type}-${row.category}`} className="border-b border-line last:border-b-0">
                    <th scope="row" className="py-2 pe-3 text-left font-normal text-ink-muted">
                      {row.category}
                    </th>
                    <td className="py-2 text-right tabular-nums text-ink">
                      {row.amount !== null && row.amount !== undefined ? <Amount value={row.amount} unit={unit} /> : (
                        <span className="text-ink-faint">
                          <T area="news" k="budgetNotReported" />
                        </span>
                      )}
                    </td>
                    <td className="w-24 py-2 pl-3" aria-hidden="true">
                      <span className="block h-2 w-full rounded-pill bg-surface-inset">
                        <span
                          className="grow-x block h-2 rounded-pill bg-accent"
                          style={{
                            width:
                              groupMax(group.rows) > 0 && row.amount !== null
                                ? `${Math.max(2, Math.round((row.amount / groupMax(group.rows)) * 100))}%`
                                : "0%",
                          }}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
