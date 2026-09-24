import type { ReactNode } from "react";
import { T } from "@/components/i18n/t";
import { changeAgeDays } from "@/lib/changes";
import { formatCount } from "@/lib/format";
import { LocalDate } from "./local-date";
import { StatStrip } from "./stat-strip";
import { TemplateT } from "./template-t";

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
    <StatStrip
      items={[
        {
          key: "vacant",
          label: <T area="home" k="statVacantLabel" />,
          value: formatCount(vacantSeats),
          sub: <T area="home" k="statVacantSub" />,
        },
        {
          key: "acting",
          label: <T area="home" k="statActingLabel" />,
          value: formatCount(actingOfficials),
          sub: <T area="home" k="statActingSub" />,
        },
        {
          key: "last",
          label: <T area="home" k="statLastChangeLabel" />,
          value: ageLabel(age),
          sub: lastChangeDate ? (
            age === 0 ? (
              <LocalDate iso={lastChangeDate} />
            ) : (
              <TemplateT k="lastChangeOn" slots={{ date: <LocalDate iso={lastChangeDate} /> }} />
            )
          ) : (
            <T area="home" k="statLastChangeNone" />
          ),
        },
      ]}
    />
  );
}
