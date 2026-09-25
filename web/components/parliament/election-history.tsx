import type { CSSProperties } from "react";
import { T } from "@/components/i18n/t";
import { SourceLink } from "@/components/source-link";
import { getSourceById } from "@/lib/data";
import { electionRow, getElectionsForBody } from "@/lib/elections";
import { DateT, LocalDate } from "@/components/content/local-date";
import { SUMMARY_CLASS } from "@/components/entity/entity-connections";

const NEUTRAL = "var(--t-color-line-strong)";

/** The latest elections show; older ones sit behind a disclosure. */
const VISIBLE_ROWS = 5;

/**
 * Every election of a chamber as one stacked bar of seats, newest first, with
 * the majority marked and the source of each result linked. Bars rather than
 * arches, because twenty-five arches of 150 seats would weigh more than the
 * rest of the page. Pure: reads resolved rows from `web/lib/elections.ts`.
 */
export function ElectionHistory({ organizationId }: { organizationId: string }) {
  const rows = getElectionsForBody(organizationId).map(electionRow);
  if (rows.length === 0) return null;

  const renderRow = ({ election, majority, blocks }: (typeof rows)[number], index: number) => {
    // The size of the chamber is said once above; a row names it only where it changed.
    const showSize = index > 0 && rows[index - 1].election.seatsTotal !== election.seatsTotal;
    const source = getSourceById(election.source.source);
    const majorityPercent = (majority / election.seatsTotal) * 100;
    const label = blocks.map((block) => `${block.label} ${block.seats}`).join(", ");
    return (
      <li key={election.id}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
          <span className="font-medium tabular-nums text-ink">
            <LocalDate iso={election.date} />
            {election.kind === "vervroegd" ? (
              <span className="ms-2 font-normal text-ink-faint">
                <T area="entity" k="electionEarly" />
              </span>
            ) : null}
          </span>
          <span className="text-ink-faint">
            {showSize ? <T area="entity" k="electionSeatsLine" vars={{ total: election.seatsTotal, majority }} /> : null}
            {election.turnout !== null && election.turnout !== undefined ? (
              <>
                {showSize ? " · " : null}
                <DateT area="entity" k="electionTurnout" counts={{ pct: Math.round(election.turnout * 1000) / 10 }} />
              </>
            ) : null}
          </span>
        </div>
        <div role="img" aria-label={label} className="motion-grow relative mt-1.5" data-reveal="pending">
          <div className="grow-x flex h-3.5 w-full overflow-hidden rounded-pill border border-line">
            {blocks.map((block) => (
              <span
                key={block.key}
                title={`${block.label}: ${block.seats}`}
                style={{
                  flexBasis: `${(block.seats / election.seatsTotal) * 100}%`,
                  backgroundColor: block.color ?? NEUTRAL,
                }}
                className="h-full min-w-px"
              />
            ))}
          </div>
          <span
            aria-hidden="true"
            className="grow-fade absolute -top-1 bottom-[-4px] w-0.5 bg-ink"
            style={{ left: `${majorityPercent}%`, "--d": "240ms" } as CSSProperties}
          />
        </div>
        <p className="mt-1 text-[11px] leading-snug text-ink-muted">
          {blocks
            .filter((block) => block.seats > 0)
            .map((block) => `${block.label} ${block.seats}`)
            .join(" · ")}
        </p>
        {source ? (
          <p className="mt-0.5 text-[11px]">
            <SourceLink href={source.url} meta={source.publisher} className="text-[11px]">
              {source.title}
            </SourceLink>
          </p>
        ) : null}
      </li>
    );
  };

  return (
    <section aria-labelledby={`verkiezingen-${organizationId.replace(/[^a-z0-9]/g, "-")}`} className="mt-6">
      <h3
        id={`verkiezingen-${organizationId.replace(/[^a-z0-9]/g, "-")}`}
        className="text-sm font-medium text-ink-muted"
      >
        <T area="entity" k="electionHistoryLabel" />
      </h3>
      <p className="mt-1 text-xs text-ink-faint">
        <T area="entity" k="electionHistoryNote" />
      </p>
      <ol className="mt-3 space-y-3">{rows.slice(0, VISIBLE_ROWS).map(renderRow)}</ol>
      {rows.length > VISIBLE_ROWS ? (
        <details className="motion-disclosure mt-3">
          <summary className={SUMMARY_CLASS}>
            <T area="common" k="seeAll" vars={{ n: rows.length }} />
          </summary>
          <ol className="mt-3 space-y-3">{rows.slice(VISIBLE_ROWS).map((row, index) => renderRow(row, index + VISIBLE_ROWS))}</ol>
        </details>
      ) : null}
    </section>
  );
}
