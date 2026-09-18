import { EmptyState } from "@/components/empty-state";
import { SourceLink } from "@/components/source-link";
import { getSourceById } from "@/lib/data";
import { formatBudgetAmount, type BudgetBreakdownRow } from "@/lib/budget";
import type { SourceRef } from "@/lib/types";

const TYPE_LABELS: Record<BudgetBreakdownRow["type"], string> = {
  spending: "Uitgaven",
  revenue: "Ontvangsten",
};

export function BudgetBreakdown({
  breakdown,
  unit,
  fiscalYear,
  sources,
}: {
  breakdown: BudgetBreakdownRow[];
  unit: string | null;
  fiscalYear: number | null;
  sources: SourceRef[];
}) {
  if (breakdown.length === 0) {
    return (
      <EmptyState
        title="Geen uitsplitsing naar categorie beschikbaar"
        description="De bron voor deze begroting bevat nog geen categorieën met bedragen. Dit is een bekend gat: er wordt geen uitsplitsing getoond die niet in de bron staat."
      />
    );
  }

  const groups = (["spending", "revenue"] as const)
    .map((type) => ({ type, rows: breakdown.filter((row) => row.type === type) }))
    .filter((group) => group.rows.length > 0);

  return (
    <div>
      {groups.map((group) => (
        <div key={group.type} className="mb-5 last:mb-0">
          <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">
            {TYPE_LABELS[group.type]}
            {fiscalYear !== null ? ` ${fiscalYear}` : ""}
          </h3>
          <table className="mt-2 w-full border-collapse text-sm">
            <caption className="sr-only">
              {TYPE_LABELS[group.type]} per categorie, in {unit ?? "onbekende eenheid"}
            </caption>
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="py-2 pe-3 font-medium text-ink-faint">
                  Categorie
                </th>
                <th scope="col" className="py-2 text-right font-medium text-ink-faint">
                  Bedrag
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
                    {formatBudgetAmount(row.amount, unit) ?? (
                      <span className="text-ink-faint">Niet gerapporteerd</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

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
