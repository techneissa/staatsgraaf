import type { ReactNode } from "react";
import { Card } from "../card";
import { T } from "@/components/i18n/t";
import { changeAgeDays } from "@/lib/changes";
import { formatCount, formatDate } from "@/lib/format";

function ageLabel(days: number | null): ReactNode {
  if (days === null) return <T area="home" k="ageUnknown" />;
  if (days === 0) return <T area="home" k="statLastChangeToday" />;
  if (days === 1) return <T area="home" k="ageOneDay" />;
  return <T area="home" k="ageDays" vars={{ n: formatCount(days) }} />;
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
        <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
          <T area="home" k="statVacantLabel" />
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
          {formatCount(vacantSeats)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          <T area="home" k="statVacantSub" />
        </p>
      </Card>
      <Card>
        <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
          <T area="home" k="statActingLabel" />
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
          {formatCount(actingOfficials)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          <T area="home" k="statActingSub" />
        </p>
      </Card>
      <Card>
        <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
          <T area="home" k="statLastChangeLabel" />
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
          {ageLabel(age)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {lastChangeDate ? (
            <T area="home" k="lastChangeAgoOn" vars={{ date: formatDate(lastChangeDate) }} />
          ) : (
            <T area="home" k="statLastChangeNone" />
          )}
        </p>
      </Card>
    </div>
  );
}
