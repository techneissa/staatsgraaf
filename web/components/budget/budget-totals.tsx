import { Card } from "@/components/card";
import { ChangeIndicator } from "./change-indicator";
import {
  budgetUnitLabel,
  formatBudgetAmount,
  type BudgetOverview,
  type BudgetTotals,
} from "@/lib/budget";

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function totalValue(
  totals: BudgetTotals,
  key: "spendingBudget" | "revenue" | "net" | "spendingActual",
  unit: string | null,
): string {
  return formatBudgetAmount(totals[key], unit) ?? "Niet gerapporteerd";
}

export function BudgetTotals({ overview }: { overview: BudgetOverview }) {
  const { totals, previousTotals, spendingDelta, unit, fiscalYear, previousFiscalYear } = overview;
  const partial = totals.spendingBudgetCounted < totals.expected;

  return (
    <Card>
      <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">
        Rijk, opgeteld over de {totals.expected} begrotingen
      </h3>
      <dl className="mt-2.5 divide-y divide-line">
        <TotalRow
          label={`Uitgaven begroot ${fiscalYear}`}
          value={totalValue(totals, "spendingBudget", unit)}
        />
        <TotalRow
          label={`Uitgaven realisatie ${previousFiscalYear}`}
          value={totalValue(previousTotals, "spendingActual", unit)}
        />
        <TotalRow
          label={`Ontvangsten ${fiscalYear}`}
          value={totalValue(totals, "revenue", unit)}
        />
        <TotalRow label={`Saldo ${fiscalYear}`} value={totalValue(totals, "net", unit)} />
      </dl>

      {spendingDelta !== null ? (
        <ChangeIndicator
          delta={spendingDelta}
          unit={unit}
          since={String(previousFiscalYear)}
          label="de totale begrote uitgaven"
        />
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        {unit !== null ? `Bedragen in ${budgetUnitLabel(unit)}. ` : null}
        Deze totalen tellen de begrotingen van de afzonderlijke ministeries op zoals gerapporteerd en
        zijn niet gecorrigeerd voor overlappende stromen tussen begrotingen. Het saldo is het verschil
        tussen ontvangsten en uitgaven per begroting.
        {partial ? " Niet elke begroting heeft een volledig cijfer; het totaal is dan gedeeltelijk." : ""}
      </p>
      <p className="mt-2 text-xs text-ink-faint">
        {previousTotals.expected} van {totals.expected} begrotingen hebben een vergelijkbaar cijfer
        voor {previousFiscalYear}.
      </p>
    </Card>
  );
}
