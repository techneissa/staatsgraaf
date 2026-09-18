import Link from "next/link";
import { T } from "@/components/i18n/t";
import { partySlug } from "@/lib/parties";
import type { SeatTally } from "@/lib/parliament";

/**
 * The seat arithmetic of an elected chamber: one stacked bar of seats by
 * faction in the registry colours, a marker at the majority threshold, and a
 * legend that links each party to its /partijen/ page. Pure: it renders a
 * resolved tally from web/lib/parliament.ts and touches no data.
 */
export function SeatTally({ tally }: { tally: SeatTally }) {
  const majorityPercent = (tally.majority / tally.total) * 100;

  return (
    <div className="mt-3">
      <p className="text-sm font-medium text-ink-muted">
        <T area="entity" k="seatTallyLabel" />
      </p>
      <div
        role="img"
        aria-label={`${tally.entries.map((entry) => `${entry.label} ${entry.seats}`).join(", ")}`}
        className="relative mt-2"
      >
        <div className="flex h-4 w-full overflow-hidden rounded-pill border border-line">
          {tally.entries.map((entry) => (
            <span
              key={entry.label}
              style={{
                flexBasis: `${(entry.seats / tally.total) * 100}%`,
                backgroundColor: entry.color ?? "var(--t-color-line-strong)",
              }}
              className="h-full min-w-[2px]"
            />
          ))}
        </div>
        <span
          aria-hidden="true"
          className="absolute -top-1 bottom-[-4px] w-0.5 bg-ink"
          style={{ left: `${majorityPercent}%` }}
        />
        <span className="sr-only">
          <T area="entity" k="seatTallyMajorityMarker" vars={{ n: tally.majority }} />
        </span>
      </div>
      <p className="mt-1.5 text-xs text-ink-muted">
        <T area="entity" k="seatTallyMajorityLine" vars={{ n: tally.majority, total: tally.total }} />
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {tally.entries.map((entry) => (
          <li key={entry.label} className="text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-line"
                style={{ backgroundColor: entry.color ?? "var(--t-color-line-strong)" }}
              />
              {entry.party !== null ? (
                <Link
                  href={`/partijen/${partySlug(entry.party)}/`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {entry.label}
                </Link>
              ) : (
                <span>{entry.label}</span>
              )}
              <span className="tabular-nums text-ink-faint">{entry.seats}</span>
              {entry.splinter ? (
                <span className="text-[10px] text-ink-faint">
                  <T area="entity" k="seatTallySplinter" />
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
