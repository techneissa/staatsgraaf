import { Card } from "@/components/card";
import { getDatasetDate } from "@/lib/data";
import { formatCount, formatDate } from "@/lib/format";
import { getHomeString } from "@/lib/home";
import { differenceInDays, type HomeChangeStats } from "@/lib/home";

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
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
  let lastChangeValue = "—";
  let lastChangeSub = getHomeString("statLastChangeNone");
  if (stats.lastChangeDate !== null) {
    const age = datasetDate !== null ? differenceInDays(datasetDate, stats.lastChangeDate) : null;
    if (age !== null) {
      lastChangeValue = age <= 0 ? getHomeString("statLastChangeToday") : `${age}d`;
      lastChangeSub =
        age <= 0
          ? formatDate(stats.lastChangeDate)
          : getHomeString("statLastChangeAgoSub", {
              date: formatDate(stats.lastChangeDate),
            });
    } else {
      lastChangeSub = formatDate(stats.lastChangeDate);
    }
  }

  return (
    <dl className="mt-4 grid gap-2 sm:grid-cols-3">
      <StatTile
        label={getHomeString("statVacantLabel")}
        value={stats.vacantSeats !== null ? formatCount(stats.vacantSeats) : "—"}
        sub={
          stats.vacantSeats !== null
            ? getHomeString("statVacantSub")
            : getHomeString("statVacantUnknownSub")
        }
      />
      <StatTile
        label={getHomeString("statActingLabel")}
        value={formatCount(stats.actingOfficials)}
        sub={getHomeString("statActingSub")}
      />
      <StatTile label={getHomeString("statLastChangeLabel")} value={lastChangeValue} sub={lastChangeSub} />
    </dl>
  );
}
