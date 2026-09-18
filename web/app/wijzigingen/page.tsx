import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { ChangeRow } from "@/components/change-row";
import { ChangeExplorer } from "@/components/change/change-explorer";
import { ChangeStats } from "@/components/change/change-stats";
import { ActingList } from "@/components/change/acting-list";
import { VacancyList } from "@/components/change/vacancy-list";
import { T } from "@/components/i18n/t";
import { JsonLd } from "@/components/json-ld";
import {
  CHANGE_WINDOWS,
  getActingOfficials,
  getChangeReferenceDate,
  getChangeStats,
  getTimeline,
  getVacantSeats,
  getWindowedChanges,
  groupChangesByDay,
} from "@/lib/changes";
import { getDatasetDate } from "@/lib/data";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Wijzigingen",
  description:
    "Alle gedateerde aanstellingen, vertrekken en vacatures in de Nederlandse rijksoverheid, elk met een bron die aantoont waar het feit vandaan komt.",
  path: "/wijzigingen/",
  snapshotDate: getDatasetDate(),
});

export default function ChangesPage() {
  const reference = getChangeReferenceDate();
  const stats = getChangeStats(reference);
  const vacancies = getVacantSeats();
  const officials = getActingOfficials();
  const pageUrl = absoluteUrl("/wijzigingen/");

  const panes = CHANGE_WINDOWS.map((days) => {
    const changes = getWindowedChanges(days, reference);
    const histogram = getTimeline(changes, days, reference);
    const groups = groupChangesByDay(changes, reference).map((group) => ({
      date: group.date,
      label: group.label,
      items: group.changes.map((change) => ({
        id: change.id,
        kind: change.kind,
        node: <ChangeRow key={change.id} change={change} />,
      })),
    }));
    return { days, label: `${days}D`, total: changes.length, histogram, groups };
  });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Wijzigingen · ${SITE_NAME}`,
          description:
            "Gedateerde aanstellingen, vertrekken en vacatures in de Nederlandse rijksoverheid, elk met bron.",
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: "Wijzigingen" }]} />

      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          <T area="home" k="changesPageTitle" />
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
          <T area="home" k="changesPageIntro" />
        </p>
      </header>

      <section aria-labelledby="cijfers-titel" className="border-b border-line py-6">
        <h2 id="cijfers-titel" className="sr-only">
          <T area="home" k="keyFigures" />
        </h2>
        <ChangeStats
          vacantSeats={stats.vacantSeats}
          actingOfficials={stats.actingOfficials}
          lastChangeDate={stats.lastChangeDate}
          reference={reference}
        />
      </section>

      <section aria-labelledby="feed-titel" className="py-6">
        <h2 id="feed-titel" className="text-lg font-semibold tracking-tight text-ink">
          <T area="home" k="feedTitle" />
        </h2>
        <div className="mt-4">
          <ChangeExplorer
            panes={panes}
            vacancies={<VacancyList vacancies={vacancies} />}
            vacancyCount={vacancies.reduce((sum, vacancy) => sum + vacancy.vacant, 0)}
            acting={<ActingList officials={officials} />}
            actingCount={officials.length}
          />
        </div>
      </section>
    </>
  );
}
