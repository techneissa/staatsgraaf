import { SourceLink } from "@/components/source-link";
import { getSourceById } from "@/lib/data";
import { formatBudgetAmount } from "@/lib/budget";
import type { AmountSet, SourceRef } from "@/lib/types";

type AmountKey = "spendingBudget" | "spendingActual" | "revenue" | "net";

const ROWS: { label: string; key: AmountKey }[] = [
  { label: "Uitgaven begroot", key: "spendingBudget" },
  { label: "Uitgaven realisatie", key: "spendingActual" },
  { label: "Ontvangsten", key: "revenue" },
  { label: "Saldo (ontvangsten min uitgaven)", key: "net" },
];

function Cell({
  value,
  unit,
}: {
  value: number | null;
  unit: string | null | undefined;
}) {
  const formatted = formatBudgetAmount(value, unit);
  if (formatted === null) {
    return <span className="text-ink-faint">Niet gerapporteerd</span>;
  }
  return <span className="tabular-nums text-ink">{formatted}</span>;
}

export function BudgetYearFigures({
  unit,
  currentYear,
  previousYear,
  current,
  previous,
  sources,
}: {
  unit: string | null;
  currentYear: number;
  previousYear: number;
  current: AmountSet;
  previous: AmountSet | null;
  sources: SourceRef[];
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <caption className="sr-only">
            Begrote en gerealiseerde bedragen per jaar, in {unit ?? "onbekende eenheid"}
          </caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="py-2 pe-3 font-medium text-ink-faint">
                Bedrag
              </th>
              <th scope="col" className="py-2 pe-3 text-right font-medium text-ink-faint">
                {currentYear}
              </th>
              <th scope="col" className="py-2 text-right font-medium text-ink-faint">
                {previousYear}
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-2 pe-3 text-left font-normal text-ink-muted">
                  {row.label}
                </th>
                <td className="py-2 pe-3 text-right">
                  <Cell value={current[row.key]} unit={unit} />
                </td>
                <td className="py-2 text-right">
                  {previous !== null ? (
                    <Cell value={previous[row.key]} unit={unit} />
                  ) : (
                    <span className="text-ink-faint">Niet beschikbaar</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
