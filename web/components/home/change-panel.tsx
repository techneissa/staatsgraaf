import Link from "next/link";
import { ChangeDay } from "@/components/change/change-day";
import { getChangeFigures } from "@/components/change/change-figures";
import { ChangeHistogram } from "@/components/change/change-histogram";
import { EmptyStateT } from "@/components/change/empty-state-t";
import { EntryRow } from "@/components/change/entry-row";
import { NowChips } from "@/components/change/now-chips";
import { T } from "@/components/i18n/t";
import { buildHistogramBuckets } from "@/lib/change-buckets";
import {
  countEntries,
  getAllChanges,
  getChangeReferenceDate,
  getNewestEntries,
  getWindowedChanges,
  groupChangesIntoEntries,
  groupEntriesByDay,
} from "@/lib/changes";

/** The home page shows the newest few; the full feed lives on /wijzigingen/. */
const HOME_LIMIT = 3;
/** The chart covers one fixed window; the period switch lives on the feed page. */
const HOME_WINDOW = 30;

/**
 * The home page's changes block, kept short: what holds right now, the
 * last 30 days as a chart, the three newest entries whatever their age, and
 * one link to the feed. Every relative figure counts from the build day.
 */
export function ChangePanel() {
  if (getAllChanges().length === 0) return <EmptyStateT title="noChangesYet" />;

  const figures = getChangeFigures(getChangeReferenceDate());
  const { reference } = figures;
  const windowed = getWindowedChanges(HOME_WINDOW, reference);
  const newest = getNewestEntries(HOME_LIMIT);
  const days = groupEntriesByDay(newest).map((day) => {
    const whole = groupChangesIntoEntries(getAllChanges().filter((change) => change.date === day.date));
    return { date: day.date, entries: day.entries, counts: countEntries(whole) };
  });

  return (
    <div>
      <NowChips figures={figures.now} className="mt-3" />

      {windowed.length > 0 ? (
        <div className="mt-4">
          <ChangeHistogram
            buckets={buildHistogramBuckets(windowed, HOME_WINDOW, reference)}
            days={HOME_WINDOW}
            counts={countEntries(groupChangesIntoEntries(windowed))}
            linkBase="/wijzigingen/"
          />
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {days.map((day) => (
          <ChangeDay
            key={day.date}
            date={day.date}
            reference={reference}
            counts={day.counts}
            items={day.entries.map((entry) => ({
              id: entry.key,
              displayKind: entry.displayKind,
              node: <EntryRow entry={entry} compact />,
            }))}
          />
        ))}
      </div>

      <p className="mt-3">
        <Link
          href="/wijzigingen/"
          className="inline-flex min-h-8 items-center gap-1 text-sm font-medium text-accent-text underline-offset-2 hover:underline pointer-coarse:min-h-11"
        >
          <T area="home" k="seeChangesPage" />
          <span aria-hidden="true">→</span>
        </Link>
      </p>
    </div>
  );
}
