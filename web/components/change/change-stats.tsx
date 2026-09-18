import { Card } from "../card";
import { changeAgeDays } from "@/lib/changes";
import { formatCount, formatDate } from "@/lib/format";

function ageLabel(days: number | null): string {
  if (days === null) return "onbekend";
  if (days === 0) return "vandaag";
  if (days === 1) return "1 dag";
  return `${formatCount(days)} dagen`;
}

export function ChangeStats({
  vacantSeats,
  actingOfficials,
  lastChangeDate,
  reference,
}: {
  vacantSeats: number;
  actingOfficials: number;
  lastChangeDate: string | null;
  reference: string;
}) {
  const age = changeAgeDays(lastChangeDate, reference);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card>
        <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">Zetels vacant</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
          {formatCount(vacantSeats)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">zonder zittende functionaris</p>
      </Card>
      <Card>
        <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
          Waarnemende functionarissen
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
          {formatCount(actingOfficials)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">nog niet definitief benoemd</p>
      </Card>
      <Card>
        <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">Laatste wijziging</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
          {ageLabel(age)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {lastChangeDate ? (
            <>
              geleden, op <time dateTime={lastChangeDate}>{formatDate(lastChangeDate)}</time>
            </>
          ) : (
            "nog geen wijziging bekend"
          )}
        </p>
      </Card>
    </div>
  );
}
