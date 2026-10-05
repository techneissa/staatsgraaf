import Link from "next/link";
import { ChangeDay } from "@/components/change/change-day";
import { ChangeHistogram } from "@/components/change/change-histogram";
import { EmptyStateT } from "@/components/change/empty-state-t";
import { T } from "@/components/i18n/t";
import { buildHistogramBuckets } from "@/lib/change-buckets";
import { changeDisplayKind } from "@/lib/changes";
import { DateT } from "@/components/content/local-date";
import type { ChangeWindow } from "@/lib/home";
import { ChangeCard } from "./change-card";

/** The home page shows the newest few; the full feed lives on /wijzigingen/. */
const HOME_LIMIT = 5;

export function ChangePanel({ window }: { window: ChangeWindow }) {
  if (!window.ready || window.until === null) {
    return <EmptyStateT title="noChangesYet" />;
  }
  const reference = window.until;
  const buckets = buildHistogramBuckets(
    window.groups.flatMap((group) => group.changes),
    window.days,
    reference,
  );

  let remaining = HOME_LIMIT;
  const groups = [];
  for (const group of window.groups) {
    if (remaining <= 0) break;
    const changes = group.changes.slice(0, remaining);
    remaining -= changes.length;
    groups.push({ date: group.date, total: group.changes.length, changes });
  }

  return (
    <div>
      <ChangeHistogram
        buckets={buckets}
        days={window.days}
        total={window.count}
        linkBase="/wijzigingen/"
      />

      {groups.length === 0 ? (
        <div className="mt-4">
          <EmptyStateT title="noChangesInWindow" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {groups.map((group) => (
            <ChangeDay
              key={group.date}
              date={group.date}
              reference={reference}
              count={group.total}
              items={group.changes.map((change) => ({
                id: change.id,
                displayKind: changeDisplayKind(change),
                node: <ChangeCard change={change} />,
              }))}
            />
          ))}
        </div>
      )}

      <p className="mt-3">
        <Link
          href="/wijzigingen/"
          className="inline-flex min-h-8 items-center gap-1 text-sm font-medium text-accent-text underline-offset-2 hover:underline pointer-coarse:min-h-11"
        >
          {window.count > HOME_LIMIT ? (
            <DateT area="home" k="seeAllChanges" counts={{ n: window.count }} />
          ) : (
            <T area="home" k="seeChangesPage" />
          )}
          <span aria-hidden="true">→</span>
        </Link>
      </p>
    </div>
  );
}
