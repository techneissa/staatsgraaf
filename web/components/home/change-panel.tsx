import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { formatCount } from "@/lib/format";
import { getHomeString } from "@/lib/home";
import type { ChangeWindow } from "@/lib/home";
import { ChangeCard } from "./change-card";
import { TimelineHistogram } from "./timeline-histogram";

export function ChangePanel({ window }: { window: ChangeWindow }) {
  if (!window.ready) {
    return (
      <EmptyState
        title={getHomeString("noChangesYet")}
        description={getHomeString("noChangesYetBody")}
      />
    );
  }

  return (
    <div>
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
            {getHomeString("timelineLabel")}
          </h3>
          <p className="text-xs tabular-nums text-ink-muted">
            {getHomeString("changesInWindow", { n: formatCount(window.count) })}
          </p>
        </div>
        <TimelineHistogram buckets={window.buckets} windowDays={window.days} />
      </Card>

      {window.groups.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title={getHomeString("noChangesInWindow")}
            description={getHomeString("noChangesInWindowBody")}
          />
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {window.groups.map((group) => (
            <li key={group.date}>
              <Card className="py-4">
                <div className="flex items-baseline justify-between gap-2 border-b border-line pb-2">
                  <h3 className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                    {group.label}
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
