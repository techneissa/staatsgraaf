import { Card } from "@/components/card";
import { getDatasetDate } from "@/lib/data";
import { formatCount, formatDate } from "@/lib/format";
import { differenceInDays, type HomeChangeStats } from "@/lib/home";

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card as="div" className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd>
        <span className="block text-2xl font-semibold tabular-nums text-ink">{value}</span>
        <span className="mt-0.5 block text-xs text-ink-faint">{sub}</span>
      </dd>
    </Card>
  );
}

export function ChangeStats({ stats }: { stats: HomeChangeStats }) {
  const datasetDate = getDatasetDate();
  let lastChangeValue = "—";
  let lastChangeSub = "nog geen wijzigingen";
  if (stats.lastChangeDate !== null) {
    const age = datasetDate !== null ? differenceInDays(datasetDate, stats.lastChangeDate) : null;
    lastChangeValue = age === null ? "—" : age <= 0 ? "vandaag" : `${age}d`;
    lastChangeSub = `geleden, op ${formatDate(stats.lastChangeDate)}`;
  }

  return (
    <dl className="mt-4 grid gap-2 sm:grid-cols-3">
      <StatTile
        label="Vacante zetels"
        value={stats.vacantSeats !== null ? formatCount(stats.vacantSeats) : "—"}
        sub={stats.vacantSeats !== null ? "geen huidige bekleder" : "nog geen vacaturegegevens"}
      />
      <StatTile
        label="Waarnemers"
        value={formatCount(stats.actingOfficials)}
        sub="waarnemend, niet benoemd"
      />
      <StatTile label="Laatste wijziging" value={lastChangeValue} sub={lastChangeSub} />
    </dl>
  );
}
