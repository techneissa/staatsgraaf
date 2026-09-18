import { ChangeIndicator } from "./change-indicator";
import { getS } from "@/lib/i18n/server-strings";
import {
  budgetUnitLabel,
  formatBudgetAmount,
  type BudgetOverview,
  type BudgetTotals,
} from "@/lib/budget";
import { interpolate } from "@/lib/i18n/locales";

function StatTile({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <h4 className="text-[10px] font-medium uppercase tracking-widest text-ink-faint">{label}</h4>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-faint">{caption}</p>
    </div>
  );
}

function totalValue(
  totals: BudgetTotals,
  key: "spendingBudget" | "revenue" | "net" | "spendingActual",
  unit: string | null,
): string {
  return formatBudgetAmount(totals[key], unit) ?? getS("news", "budgetNotReported");
}

export function BudgetTotals({ overview }: { overview: BudgetOverview }) {
  const { totals, previousTotals, spendingDelta, unit, fiscalYear, previousFiscalYear } = overview;
  const partial = totals.spendingBudgetCounted < totals.expected;
  const unitLabel = budgetUnitLabel(unit);

  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">
        {interpolate(getS("news", "budgetTotalsCaption"), { count: totals.expected })}
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={getS("news", "budgetSpendingLabel")}
          value={totalValue(totals, "spendingBudget", unit)}
          caption={String(fiscalYear)}
        />
        <StatTile
          label={getS("news", "budgetSpendingActualLabel")}
          value={totalValue(previousTotals, "spendingActual", unit)}
          caption={String(previousFiscalYear)}
        />
        <StatTile
          label={getS("news", "budgetRevenueLabel")}
          value={totalValue(totals, "revenue", unit)}
          caption={String(fiscalYear)}
        />
        <StatTile
          label={getS("news", "budgetNetLabel")}
          value={totalValue(totals, "net", unit)}
          caption={String(fiscalYear)}
        />
      </div>

      {spendingDelta !== null ? (
        <ChangeIndicator
          delta={spendingDelta}
          unit={unit}
          since={String(previousFiscalYear)}
          label={getS("news", "budgetTotalsChangeLabel")}
        />
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        {unitLabel !== null
          ? `${interpolate(getS("news", "budgetUnitNote"), { unit: unitLabel })} `
          : null}
        Deze totalen tellen de begrotingen van de afzonderlijke ministeries op zoals gerapporteerd en
        zijn niet gecorrigeerd voor overlappende stromen tussen begrotingen. Het saldo is het verschil
        tussen ontvangsten en uitgaven per begroting.
        {partial ? " Niet elke begroting heeft een volledig cijfer; het totaal is dan gedeeltelijk." : ""}
      </p>
      <p className="mt-2 text-xs text-ink-faint">
        {previousTotals.expected} van {totals.expected} begrotingen hebben een vergelijkbaar cijfer
        voor {previousFiscalYear}.
      </p>
    </div>
  );
}
