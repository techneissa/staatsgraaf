import { EmptyStateT } from "@/components/change/empty-state-t";
import { Card } from "@/components/card";
import { T } from "@/components/i18n/t";
import { formatCount } from "@/lib/format";
import type { ChangeWindow } from "@/lib/home";
import { ChangeCard } from "./change-card";
import { TimelineHistogram } from "./timeline-histogram";

/** lib/home emits "Vandaag" or "Gisteren" as the day label; map those to the dictionary. */
function DayHeading({ label }: { label: string }) {
  if (label === "Vandaag") return <T area="home" k="dayToday" />;
  if (label === "Gisteren") return <T area="home" k="dayYesterday" />;
  return <>{label}</>;
}

export function ChangePanel({ window }: { window: ChangeWindow }) {
  if (!window.ready) {
    return (
      <EmptyStateT
        title="noChangesYet"
        description="noChangesYetBody"
      />
    );
  }

  return (
    <div>
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
            <T area="home" k="timelineLabel" />
          </h3>
          <p className="text-xs tabular-nums text-ink-muted">
            {window.count === 1 ? (
              <T area="home" k="changesInWindowOne" />
            ) : (
              <T area="home" k="changesInWindow" vars={{ n: formatCount(window.count) }} />
            )}
          </p>
        </div>
        <TimelineHistogram buckets={window.buckets} windowDays={window.days} />
      </Card>

      {window.groups.length === 0 ? (
        <div className="mt-3">
          <EmptyStateT
            title="noChangesInWindow"
            description="noChangesInWindowBody"
          />
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {window.groups.map((group) => (
            <li key={group.date}>
              <Card className="py-4">
                <div className="flex items-baseline justify-between gap-2 border-b border-line pb-2">
                  <h3 className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                    <DayHeading label={group.label} />
                  </h3>
                  <span className="text-[10px] tabular-nums text-ink-faint">
                    {formatCount(group.changes.length)}
                  </span>
                </div>
                <ul className="mt-3 space-y-4">
                  {group.changes.map((change) => (
                    <li key={change.id}>
                      <ChangeCard change={change} date={group.date} />
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
