import Link from "next/link";
import { ChangeIndicator } from "./change-indicator";
import { FootnoteMarkers } from "./footnote-marker";
import { T } from "@/components/i18n/t";
import { branchColorVar } from "@/lib/branch-colors";
import { formatBudgetAmount, formatBudgetPercent, type BudgetOverviewItem } from "@/lib/budget";
import { Amount } from "./amount";

export function BudgetTile({
  item,
  unit,
}: {
  item: BudgetOverviewItem;
  unit: string | null;
}) {
  const { organization, current, previous, spendingDelta, record, footnotes, sharePercent, description } = item;
  const previousYear = record.fiscalYear - 1;
  const previousValue = previous?.spendingBudget ?? null;

  const delta =
    spendingDelta !== null
      ? (() => {
          const direction: "up" | "down" | "flat" =
            spendingDelta.absolute > 0
              ? "up"
              : spendingDelta.absolute < 0
                ? "down"
                : "flat";
          const sign = direction === "up" ? "+" : direction === "down" ? "−" : "";
          return {
            direction,
            percent:
              spendingDelta.percent !== null
                ? `${sign}${formatBudgetPercent(spendingDelta.percent)}`
                : null,
            absolute: formatBudgetAmount(spendingDelta.absolute, unit),
          };
        })()
      : null;

  return (
    <article className="relative flex h-full min-w-0 flex-col rounded-md border border-line bg-surface p-3 transition-fast hover:border-line-strong sm:p-4">
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className="mt-[5px] h-2 w-2 shrink-0 rounded-pill"
          style={{ backgroundColor: branchColorVar(organization.branch) }}
        />
        <h3 className="min-w-0 text-[13px] font-semibold leading-snug sm:text-sm">
          <Link
            href={`/begroting/${organization.slug}/`}
            className="text-ink underline-offset-2 after:absolute after:inset-0 after:content-[''] hover:text-accent-text hover:underline"
          >
            {organization.name.replace(/^Ministerie van /, "")}
          </Link>
          <span className="relative z-10">
            <FootnoteMarkers numbers={footnotes} />
          </span>
        </h3>
      </div>
      {description !== null ? (
        <p className="mt-1.5 hidden text-xs leading-relaxed text-ink-muted line-clamp-2 sm:block">{description}</p>
      ) : null}
      <p className="mt-3 text-[10px] font-medium text-ink-faint">
        <T area="news" k="budgetTileSpendingCaption" vars={{ year: record.fiscalYear }} />
      </p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-ink sm:text-2xl">
        {current.spendingBudget !== null && current.spendingBudget !== undefined ? (
          <Amount value={current.spendingBudget} unit={unit} />
        ) : (
          <T area="news" k="budgetNotReported" />
        )}
      </p>
      {delta !== null ? (
        <ChangeIndicator
          direction={delta.direction}
          percent={delta.percent}
          absolute={delta.absolute}
          since={String(previousYear)}
        />
      ) : (
        <p className="mt-2 text-xs text-ink-faint">
          <T area="news" k="budgetNoComparison" vars={{ year: previousYear }} />
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 pt-3 text-[11px] text-ink-faint tabular-nums">
        {previousValue !== null ? (
          <span>
            {previousYear}: <Amount value={previousValue} unit={unit} />
          </span>
        ) : null}
        {sharePercent !== null ? (
          <span>
            <T
              area="news"
              k={Math.round(sharePercent * 10) / 10 === 0 ? "budgetShareBelowTotalShort" : "budgetShareOfTotalShort"}
              vars={{ percent: formatBudgetPercent(Math.max(sharePercent, 0.1)) }}
            />
          </span>
        ) : null}
      </div>
    </article>
  );
}
