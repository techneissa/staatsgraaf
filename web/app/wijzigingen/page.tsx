import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { ChangeExplorer } from "@/components/change/change-explorer";
import { PersonChangesView } from "@/components/change/person-changes-view";
import { getChangeFigures } from "@/components/change/change-figures";
import { EntryRow } from "@/components/change/entry-row";
import { ActingList } from "@/components/change/acting-list";
import { VacancyList } from "@/components/change/vacancy-list";
import { T } from "@/components/i18n/t";
import { JsonLd } from "@/components/json-ld";
import { buildHistogramBuckets } from "@/lib/change-buckets";
import {
  CHANGE_WINDOWS,
  countEntries,
  getActingOfficials,
  getChangeReferenceDate,
  getVacantSeats,
  getWindowedChanges,
  groupChangesByPerson,
  groupChangesIntoEntries,
  groupEntriesByDay,
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
  const figures = getChangeFigures(getChangeReferenceDate());
  const { reference } = figures;
  const vacancies = getVacantSeats();
  const officials = getActingOfficials();
  const pageUrl = absoluteUrl("/wijzigingen/");

  const panes = CHANGE_WINDOWS.map((days) => {
    const changes = getWindowedChanges(days, reference);
    const entries = groupChangesIntoEntries(changes);
    const histogram = buildHistogramBuckets(changes, days, reference);
    const groups = groupEntriesByDay(entries).map((day) => ({
      date: day.date,
      items: day.entries.map((entry) => ({
        id: entry.key,
        displayKind: entry.displayKind,
        changes: entry.changes.length,
        personId: entry.personId,
        node: <EntryRow key={entry.key} entry={entry} />,
      })),
    }));
    const people = <PersonChangesView groups={groupChangesByPerson(changes)} reference={reference} />;
    return { days, counts: countEntries(entries), histogram, groups, people };
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

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: <T area="home" k="changesPageTitle" /> }]} />

      <ChangeExplorer
        panes={panes}
        reference={reference}
        vacancies={<VacancyList vacancies={vacancies} />}
        acting={<ActingList officials={officials} />}
        now={figures.now}
        recency={figures.recency}
        snapshot={figures.snapshot}
        heading={
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            <T area="home" k="changesPageTitle" />
          </h1>
        }
      />
    </>
  );
}
