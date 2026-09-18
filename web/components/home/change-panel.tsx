import { Card } from "@/components/card";
import { ChangeRow } from "@/components/change-row";
import { EmptyState } from "@/components/empty-state";
import { formatCount } from "@/lib/format";
import type { ChangeWindow } from "@/lib/home";
import { TimelineHistogram } from "./timeline-histogram";

export function ChangePanel({ window }: { window: ChangeWindow }) {
  if (!window.ready) {
    return (
      <EmptyState
        title="Nog geen wijzigingen"
        description="De wijzigingenfeed is nog niet gevuld. Zodra de vergelijking met een eerdere datasetversie draait, verschijnen aanstellingen, vertrekken en structuurwijzigingen hier per dag met bron."
      />
    );
  }

  return (
    <div>
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">Tijdlijn</h3>
          <p className="text-xs text-ink-muted">
            {formatCount(window.count)} wijzigingen in dit venster
          </p>
        </div>
        <TimelineHistogram buckets={window.buckets} windowDays={window.days} />
      </Card>

      {window.groups.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="Geen wijzigingen in dit venster"
            description="In deze periode is geen aanstelling, vertrek of structuurwijziging vastgelegd."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {window.groups.map((group) => (
            <section key={group.date}>
              <h3 className="flex items-baseline justify-between gap-2 text-xs font-medium uppercase tracking-wider text-ink-faint">
                <span>{group.label}</span>
                <span className="tabular-nums">{formatCount(group.changes.length)}</span>
              </h3>
              <ul className="mt-2 space-y-2">
                {group.changes.map((change) => (
                  <li key={change.id}>
                    <ChangeRow change={change} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
