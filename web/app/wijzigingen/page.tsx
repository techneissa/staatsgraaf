import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { ChangeRow } from "@/components/change-row";
import { ChangeExplorer } from "@/components/change/change-explorer";
import { Callout } from "@/components/change/callout";
import { ChangeKindGlyph } from "@/components/change/change-glyph";
import { PersonChangesView } from "@/components/change/person-changes-view";
import { getChangeTileFigures } from "@/components/change/change-figures";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { ActingList } from "@/components/change/acting-list";
import { VacancyList } from "@/components/change/vacancy-list";
import { T } from "@/components/i18n/t";
import { JsonLd } from "@/components/json-ld";
import { buildHistogramBuckets } from "@/lib/change-buckets";
import {
  CHANGE_WINDOWS,
  changeDisplayKind,
  getActingOfficials,
  getChangeReferenceDate,
  getVacantSeats,
  getWindowedChanges,
  groupChangesByDay,
  groupChangesByPerson,
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

/** Vacant positions named in the callout before "and N more". */
const CALLOUT_LIMIT = 3;

export default function ChangesPage() {
  const reference = getChangeReferenceDate();
  const vacancies = getVacantSeats();
  const officials = getActingOfficials();
  const pageUrl = absoluteUrl("/wijzigingen/");
  const shownVacancies = vacancies.slice(0, CALLOUT_LIMIT);

  const panes = CHANGE_WINDOWS.map((days) => {
    const changes = getWindowedChanges(days, reference);
    const histogram = buildHistogramBuckets(changes, days, reference);
    const groups = groupChangesByDay(changes, reference).map((group) => ({
      date: group.date,
      items: group.changes.map((change) => ({
        id: change.id,
        kind: change.kind,
        displayKind: changeDisplayKind(change),
        node: <ChangeRow key={change.id} change={change} />,
      })),
    }));
    const people = <PersonChangesView groups={groupChangesByPerson(changes)} reference={reference} />;
    return { days, total: changes.length, histogram, groups, people };
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
        figures={getChangeTileFigures(reference)}
        heading={
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            <T area="home" k="changesPageTitle" />
          </h1>
        }
        afterChips={
          shownVacancies.length > 0 ? (
            <Callout icon={<ChangeKindGlyph kind="vacancy" size={16} />} className="mt-3">
              <span className="font-medium">
                <T area="home" k="vacancyCallout" />:
              </span>{" "}
              {shownVacancies.map((vacancy, index) => (
                <span key={vacancy.position.id}>
                  {index > 0 ? ", " : null}
                  <EntityPeekLink id={vacancy.position.id} />
                </span>
              ))}
              {vacancies.length > shownVacancies.length ? (
                <span className="text-ink-muted">
                  {" "}
                  <T area="home" k="vacancyCalloutMore" vars={{ n: vacancies.length - shownVacancies.length }} />
                </span>
              ) : null}
            </Callout>
          ) : null
        }
      />
    </>
  );
}
