import type { ReactNode } from "react";
import { Card } from "@/components/card";
import { T } from "@/components/i18n/t";
import { getDatasetDate } from "@/lib/data";
import { formatCount, formatDate } from "@/lib/format";
import { differenceInDays, type HomeChangeStats } from "@/lib/home";

function StatTile({
  label,
  value,
  sub,
}: {
  label: ReactNode;
  value: ReactNode;
  sub: ReactNode;
}) {
  return (
    <Card as="div" className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd>
        <span className="block text-3xl font-semibold leading-tight tabular-nums text-ink">
          {value}
        </span>
        <span className="mt-0.5 block text-xs text-ink-faint">{sub}</span>
      </dd>
    </Card>
  );
}

export function ChangeStats({ stats }: { stats: HomeChangeStats }) {
  const datasetDate = getDatasetDate();
  let lastChangeValue: ReactNode = "—";
  let lastChangeSub: ReactNode = <T area="home" k="statLastChangeNone" />;
  if (stats.lastChangeDate !== null) {
    const age = datasetDate !== null ? differenceInDays(datasetDate, stats.lastChangeDate) : null;
    if (age !== null) {
      lastChangeValue =
        age <= 0 ? <T area="home" k="statLastChangeToday" /> : `${age}d`;
      lastChangeSub =
        age <= 0
          ? formatDate(stats.lastChangeDate)
          : (
              <T
                area="home"
                k="statLastChangeAgoSub"
                vars={{ date: formatDate(stats.lastChangeDate) }}
              />
            );
    } else {
      lastChangeSub = formatDate(stats.lastChangeDate);
    }
  }

  return (
    <dl className="mt-4 grid gap-2 sm:grid-cols-3">
      <StatTile
        label={<T area="home" k="statVacantLabel" />}
        value={stats.vacantSeats !== null ? formatCount(stats.vacantSeats) : "—"}
        sub={
          stats.vacantSeats !== null
            ? <T area="home" k="statVacantSub" />
            : <T area="home" k="statVacantUnknownSub" />
        }
      />
      <StatTile
        label={<T area="home" k="statActingLabel" />}
        value={formatCount(stats.actingOfficials)}
        sub={<T area="home" k="statActingSub" />}
      />
      <StatTile
        label={<T area="home" k="statLastChangeLabel" />}
        value={lastChangeValue}
        sub={lastChangeSub}
      />
    </dl>
  );
}
