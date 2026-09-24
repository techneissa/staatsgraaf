import type { ReactNode } from "react";
import { LocalDate } from "@/components/change/local-date";
import { StatStrip } from "@/components/change/stat-strip";
import { TemplateT } from "@/components/change/template-t";
import { T } from "@/components/i18n/t";
import { getDatasetDate } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { differenceInDays, type HomeChangeStats } from "@/lib/home";

export function ChangeStats({ stats }: { stats: HomeChangeStats }) {
  const datasetDate = getDatasetDate();
  let lastChangeValue: ReactNode = "-";
  let lastChangeSub: ReactNode = <T area="home" k="statLastChangeNone" />;
  if (stats.lastChangeDate !== null) {
    const age = datasetDate !== null ? differenceInDays(datasetDate, stats.lastChangeDate) : null;
    const date = <LocalDate iso={stats.lastChangeDate} />;
    if (age !== null && age <= 0) {
      lastChangeValue = <T area="home" k="statLastChangeToday" />;
      lastChangeSub = date;
    } else if (age !== null) {
      lastChangeValue =
        age === 1 ? <T area="home" k="ageOneDay" /> : <T area="home" k="ageDays" vars={{ n: formatCount(age) }} />;
      lastChangeSub = <TemplateT k="lastChangeOn" slots={{ date }} />;
    } else {
      lastChangeSub = date;
    }
  }

  return (
    <StatStrip
      className="mt-4"
      items={[
        {
          key: "vacant",
          label: <T area="home" k="statVacantLabel" />,
          value: stats.vacantSeats !== null ? formatCount(stats.vacantSeats) : "-",
          sub:
            stats.vacantSeats !== null ? <T area="home" k="statVacantSub" /> : <T area="home" k="statVacantUnknownSub" />,
        },
        {
          key: "acting",
          label: <T area="home" k="statActingLabel" />,
          value: formatCount(stats.actingOfficials),
          sub: <T area="home" k="statActingSub" />,
        },
        { key: "last", label: <T area="home" k="statLastChangeLabel" />, value: lastChangeValue, sub: lastChangeSub },
      ]}
    />
  );
}
