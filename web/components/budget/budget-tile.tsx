import Link from "next/link";
import { ChangeIndicator } from "./change-indicator";
import { formatBudgetAmount, type BudgetOverviewItem } from "@/lib/budget";

export function BudgetTile({
  item,
  unit,
}: {
  item: BudgetOverviewItem;
  unit: string | null;
}) {
  const { organization, current, spendingDelta, record } = item;
  const amount = formatBudgetAmount(current.spendingBudget, unit);
  const previousYear = record.fiscalYear - 1;

  return (
    <article className="flex h-full flex-col rounded-md border border-line bg-surface p-4 transition-fast hover:border-line-strong">
      <h3 className="text-sm font-semibold">
        <Link
          href={`/begroting/${organization.slug}/`}
          className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
        >
          {organization.name}
        </Link>
      </h3>
      <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-ink">
        {amount ?? "Niet gerapporteerd"}
      </p>
      <p className="mt-0.5 text-xs text-ink-faint">Uitgaven begroot {record.fiscalYear}</p>
      {spendingDelta !== null ? (
        <ChangeIndicator delta={spendingDelta} unit={unit} since={String(previousYear)} />
      ) : (
        <p className="mt-2 text-xs text-ink-faint">Geen vergelijking met {previousYear} beschikbaar.</p>
      )}
      <p className="mt-3 text-sm">
        <Link
          href={`/begroting/${organization.slug}/`}
          className="text-accent-text underline-offset-2 hover:underline"
        >
          Bekijk begroting
        </Link>
      </p>
    </article>
  );
}
