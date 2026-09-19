import Link from "next/link";
import { ChangeIndicator } from "./change-indicator";
import { FootnoteMarkers } from "./footnote-marker";
import { T } from "@/components/i18n/t";
import { branchColorVar } from "@/lib/branch-colors";
import { formatBudgetAmount, formatBudgetPercent, type BudgetOverviewItem } from "@/lib/budget";

export function BudgetTile({
  item,
  unit,
}: {
  item: BudgetOverviewItem;
  unit: string | null;
}) {
  const { organization, current, previous, spendingDelta, record, footnotes, sharePercent, description } = item;
  const amount = formatBudgetAmount(current.spendingBudget, unit);
  const previousYear = record.fiscalYear - 1;
  const previousAmount = formatBudgetAmount(previous?.spendingBudget ?? null, unit);

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
    <article className="flex h-full flex-col rounded-md border border-line bg-surface p-4 transition-fast hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-snug">
          <Link
            href={`/begroting/${organization.slug}/`}
            className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
          >
            {organization.name}
          </Link>
          <FootnoteMarkers numbers={footnotes} />
        </h3>
        <span
          aria-hidden="true"
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-pill"
          style={{ backgroundColor: branchColorVar(organization.branch) }}
          title={organization.name}
        />
      </div>
      {description !== null ? (
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{description}</p>
      ) : null}
      <p className="mt-3 text-[10px] font-medium uppercase tracking-widest text-ink-faint">
        <T area="news" k="budgetTileSpendingCaption" vars={{ year: record.fiscalYear }} />
      </p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">
        {amount ?? <T area="news" k="budgetNotReported" />}
      </p>
      {previousAmount !== null ? (
        <p className="mt-1 text-xs text-ink-faint tabular-nums">
          <T
            area="news"
            k="budgetPreviousYearFigure"
            vars={{ year: previousYear, amount: previousAmount }}
          />
        </p>
      ) : null}
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
      {sharePercent !== null ? (
        <p className="mt-2 text-xs text-ink-faint tabular-nums">
          <T
            area="news"
            k={Math.round(sharePercent * 10) / 10 === 0 ? "budgetShareBelowTotal" : "budgetShareOfTotal"}
            vars={{ percent: formatBudgetPercent(Math.max(sharePercent, 0.1)) }}
          />
        </p>
      ) : null}
      <p className="mt-3 text-sm">
        <Link
          href={`/begroting/${organization.slug}/`}
          className="text-accent-text underline-offset-2 hover:underline"
        >
          <T area="news" k="budgetViewLink" />
        </Link>
      </p>
    </article>
  );
}
