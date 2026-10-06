import Link from "next/link";
import { Amount } from "./amount";
import { BudgetOrgName } from "./budget-org-name";
import { ShareLabel } from "./budget-bits";
import { ChangeIndicator } from "./change-indicator";
import { T } from "@/components/i18n/t";
import { MinistryIcon } from "@/components/icons/ministry-icon";
import { branchColorVar } from "@/lib/branch-colors";
import type { BudgetOverviewItem } from "@/lib/budget";

type Row = {
  key: string;
  value: number;
  share: number | null;
  item: BudgetOverviewItem;
};

/** Bar and share, the same in every row. */
function BarLine({
  value,
  max,
  share,
  color,
  trailing,
}: {
  value: number;
  max: number;
  share: number | null;
  color: string;
  trailing: React.ReactNode;
}) {
  const width = max > 0 ? Math.max(1.5, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="mt-1.5 flex items-center gap-2 ps-8">
      <span aria-hidden="true" className="block h-2 min-w-0 flex-1 overflow-hidden rounded-pill bg-surface-inset">
        <span
          className="block h-full origin-left rounded-pill transition-transform duration-150 group-hover:scale-y-125 group-focus-within:scale-y-125"
          style={{
            width: `${width}%`,
            backgroundColor: color,
          }}
        />
      </span>
      {share !== null ? <ShareLabel share={share} className="w-12 shrink-0 text-end text-[11px] text-ink-muted" /> : null}
      {trailing}
    </div>
  );
}

function MinistryRow({ row, max, unit, previousYear }: { row: Row; max: number; unit: string | null; previousYear: number }) {
  const { item } = row;
  const { organization, spendingDelta, previous } = item;
  const color = branchColorVar(organization.branch);
  const previousValue = previous?.spendingBudget ?? null;
  return (
    <li className="group relative">
      <Link
        href={`/begroting/${organization.slug}/`}
        title={organization.name}
        className="block min-h-11 rounded-md px-2 py-2 transition-fast hover:bg-surface-inset focus-visible:bg-surface-inset"
      >
        <div className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-sm"
            style={{ color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
          >
            <MinistryIcon orgId={organization.id} size={14} />
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-ink group-hover:text-accent-text">
            <BudgetOrgName name={organization.name} variant="plain" />
          </span>
          <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-ink">
            <Amount value={row.value} unit={unit} />
          </span>
        </div>
        <BarLine
          value={row.value}
          max={max}
          share={row.share}
          color={color}
          trailing={
            <span className="flex w-[4.75rem] shrink-0 justify-end">
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
              ) : null}
            </span>
          }
        />
      </Link>
      {/* Hover and keyboard focus: the Dutch name and last year's budget. Decorative; the table has the figures. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute start-10 top-full z-20 -mt-0.5 hidden w-max max-w-[calc(100%-2.5rem)] rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-xs leading-snug text-ink-muted opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100 pointer-fine:block"
      >
        <span className="block font-medium text-ink">{organization.name}</span>
        {previousValue !== null ? (
          <span className="block tabular-nums">
            <T area="news" k="budgetBarsPrevious" vars={{ year: previousYear }} />: <Amount value={previousValue} unit={unit} />
          </span>
        ) : null}
      </span>
    </li>
  );
}

/**
 * Budgeted spending per ministry as a ranked bar chart: sorted large to small,
 * one hue (all twelve sit in one branch), the amount written at the end of each
 * name, bars on one shared scale that starts at zero. Every ministry has its
 * own row, so each bar means one ministry and nothing is rolled up. A text
 * alternative is the table next to it.
 */
export function MinistryBars({
  items,
  unit,
  previousYear,
  labelledBy,
}: {
  items: BudgetOverviewItem[];
  unit: string | null;
  previousYear: number;
  /** Id of the heading that names the chart and its year. */
  labelledBy: string;
}) {
  const rows: Row[] = items.flatMap((item) =>
    item.current.spendingBudget === null
      ? []
      : [{ key: item.organization.id, value: item.current.spendingBudget, share: item.sharePercent, item }],
  );
  const missing = items.length - rows.length;
  const max = Math.max(0, ...rows.map((row) => row.value));

  return (
    <div>
      <ul aria-labelledby={labelledBy} className="-mx-2 space-y-0.5">
        {rows.map((row) => (
          <MinistryRow key={row.key} row={row} max={max} unit={unit} previousYear={previousYear} />
        ))}
      </ul>

      <p className="mt-2 text-xs leading-relaxed text-ink-faint">
        <T area="news" k="budgetBarsNote" />
        {missing > 0 ? (
          <>
            {" "}
            <T area="news" k="budgetTotalsPartialNote" />
          </>
        ) : null}
      </p>
    </div>
  );
}
