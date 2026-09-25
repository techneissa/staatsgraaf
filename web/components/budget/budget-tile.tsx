import Link from "next/link";
import { Amount } from "./amount";
import { BudgetOrgName } from "./budget-org-name";
import { BudgetShareBar } from "./budget-share-bar";
import { ChangeIndicator } from "./change-indicator";
import { T } from "@/components/i18n/t";
import { branchColorVar } from "@/lib/branch-colors";
import { MinistryIcon } from "@/components/icons/ministry-icon";
import type { BudgetOverviewItem } from "@/lib/budget";

/**
 * One ministry on /begroting. The section heading names the measure and the
 * year, so the card carries only the ministry, the amount, the change, last
 * year's figure and its share of the total.
 */
export function BudgetTile({ item, unit }: { item: BudgetOverviewItem; unit: string | null }) {
  const { organization, current, previous, spendingDelta, record, sharePercent } = item;
  const previousYear = record.fiscalYear - 1;
  const previousValue = previous?.spendingBudget ?? null;
  const value = current.spendingBudget;

  return (
    <article className="relative flex h-full min-w-0 flex-col rounded-md border border-line bg-surface px-3.5 py-3 transition-fast hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-snug text-ink">
          <span
            aria-hidden="true"
            className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-line"
            style={{ color: branchColorVar(organization.branch) }}
          >
            <MinistryIcon orgId={organization.id} size={14} />
          </span>
          <Link
            href={`/begroting/${organization.slug}/`}
            className="underline-offset-2 after:absolute after:inset-0 after:content-[''] hover:text-accent-text hover:underline"
          >
            <BudgetOrgName name={organization.name} />
          </Link>
        </h3>
        <p className="shrink-0 whitespace-nowrap text-lg font-semibold tracking-tight text-ink">
          {value !== null && value !== undefined ? (
            <Amount value={value} unit={unit} />
          ) : (
            <span className="text-sm font-normal text-ink-faint">
              <T area="news" k="budgetNotReported" />
            </span>
          )}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2">
        {spendingDelta !== null ? (
          <ChangeIndicator
            absolute={spendingDelta.absolute}
            percent={spendingDelta.percent}
            unit={unit}
            since={previousYear}
            labelKey="budgetChangeIndicatorLabel"
            showSince={false}
            className=""
          />
        ) : (
          <span />
        )}
        {previousValue !== null ? (
          <p className="text-xs tabular-nums text-ink-faint">
            {previousYear}: <Amount value={previousValue} unit={unit} />
          </p>
        ) : null}
      </div>

      {sharePercent !== null ? (
        <BudgetShareBar share={sharePercent} color={branchColorVar(organization.branch)} className="mt-2.5" />
      ) : null}
    </article>
  );
}
