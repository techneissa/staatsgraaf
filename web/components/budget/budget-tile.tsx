import Link from "next/link";
import { ChangeIndicator } from "./change-indicator";
import { getS } from "@/lib/i18n/server-strings";
import { branchColorVar } from "@/lib/branch-colors";
import { formatBudgetAmount, type BudgetOverviewItem } from "@/lib/budget";
import { interpolate } from "@/lib/i18n/locales";

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
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-snug">
          <Link
            href={`/begroting/${organization.slug}/`}
            className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
          >
            {organization.name}
          </Link>
        </h3>
        <span
          aria-hidden="true"
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-pill"
          style={{ backgroundColor: branchColorVar(organization.branch) }}
          title={organization.name}
        />
      </div>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-widest text-ink-faint">
        {interpolate(getS("news", "budgetYearCaption"), { year: record.fiscalYear })}
      </p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">
        {amount ?? getS("news", "budgetNotReported")}
      </p>
      <p className="mt-1 text-xs text-ink-faint">
        {getS("news", "budgetSpendingLabel")}
      </p>
      {spendingDelta !== null ? (
        <ChangeIndicator delta={spendingDelta} unit={unit} since={String(previousYear)} />
      ) : (
        <p className="mt-2 text-xs text-ink-faint">
          {interpolate(getS("news", "budgetNoComparison"), { year: previousYear })}
        </p>
      )}
      <p className="mt-3 text-sm">
        <Link
          href={`/begroting/${organization.slug}/`}
          className="text-accent-text underline-offset-2 hover:underline"
        >
          {getS("news", "budgetViewLink")}
        </Link>
      </p>
    </article>
  );
}
