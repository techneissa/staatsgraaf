import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, type BreadcrumbItem } from "@/components/breadcrumb";
import { EntityTabs } from "@/components/entity-tabs";
import { JsonLd } from "@/components/json-ld";
import { DateT } from "@/components/content/local-date";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { SourceList } from "@/components/source-list";
import { NewsPanel } from "@/components/news/news-panel";
import { L, T } from "@/components/i18n/t";
import { FILL_METHOD_LABELS, POSITION_TYPE_LABELS } from "@/lib/labels";
import { EntityConnections } from "@/components/entity/entity-connections";
import { GapNote } from "@/components/entity/gap-note";
import { FactGroup } from "@/components/entity/fact-group";
import { HistoryIcon, SeatIcon } from "@/components/entity/icons";
import { PositionHeader } from "@/components/entity/position-header";
import { positionSummary } from "@/lib/entity-summary";
import { titleNamesBody } from "@/lib/changes";
import { holderState, positionDescription, positionPageTitle } from "@/lib/entity-page";
import { vacancyForPosition } from "@/lib/entity-vacancy";
import { withoutDerived } from "@/lib/entity-rows";
import { TenureTimeline } from "@/components/entity/tenure-timeline";
import {
  getDatasetDate,
  getOrganizationById,
  getPositionBySlug,
  getPositions,
  getTenuresForPosition,
} from "@/lib/data";
import {
  getConnectionsForEntity,
  getCurrentHoldersForPosition,
  getMembersForOrganization,
  positionExOfficioOf,
} from "@/lib/entity";
import { getNewsForEntity } from "@/lib/news";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { Organization, Position } from "@/lib/types";
import type { Connection } from "@/lib/entity";

export const dynamicParams = false;

const ambiguousPositionTitles = (() => {
  const counts = new Map<string, number>();
  for (const item of getPositions()) {
    counts.set(item.title, (counts.get(item.title) ?? 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([title]) => title),
  );
})();

function positionMetadataTitle(position: Position): string {
  const organization = getOrganizationById(position.organization);
  if (!organization) return position.title;
  // A commission position is told apart by the body it belongs to, not by the commission itself.
  const parent =
    position.type === "commission" && organization.parent
      ? getOrganizationById(organization.parent)
      : undefined;
  const context = parent ?? organization;
  return positionPageTitle({
    title: position.title,
    ambiguous: ambiguousPositionTitles.has(position.title),
    bodyName: context.name,
    bodySubtype: context.subtype,
  });
}

export function generateStaticParams() {
  return getPositions().map((position) => ({ slug: position.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const position = getPositionBySlug(slug);
  if (!position) return {};
  const organization = getOrganizationById(position.organization);
  const summary = positionSummary(position);
  const tenures = getTenuresForPosition(position.id);
  return pageMetadata({
    title: positionMetadataTitle(position),
    description: positionDescription({
      title: position.title,
      bodyName: organization !== undefined && !titleNamesBody(position.title, organization.name) ? organization.name : null,
      summary: summary?.nl ?? null,
      typeLabel: POSITION_TYPE_LABELS[position.type].nl,
      fillMethodLabel: position.fillMethod != null ? (FILL_METHOD_LABELS[position.fillMethod] ?? null) : null,
      seatsCount: position.seatsCount ?? null,
      holderCount: tenures.filter((tenure) => tenure.end === null).length,
      tenureCount: tenures.length,
      vacancy: vacancyForPosition(position.id) !== null,
      memberBody: organization?.name,
      memberCount:
        organization !== undefined && /^Lid\b/.test(position.title) && tenures.every((tenure) => tenure.end !== null)
          ? getMembersForOrganization(organization.id).length
          : 0,
    }),
    path: `/posities/${position.slug}/`,
    snapshotDate: getDatasetDate(),
  });
}

export default async function PositionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const position = getPositionBySlug(slug);
  if (!position) notFound();

  const organization = getOrganizationById(position.organization);
  const currentHolders = getCurrentHoldersForPosition(position.id);
  const tenures = getTenuresForPosition(position.id);
  const news = getNewsForEntity(position.id);
  // Holders are listed in their own sections (current, then the history), so the tab keeps the sourced relations.
  const connections: Connection[] = withoutDerived(getConnectionsForEntity(position.id), ["holds_position"]);
  const vacancy = vacancyForPosition(position.id);
  const bodyMembers =
    organization !== undefined && /^Lid\b/.test(position.title) && currentHolders.length === 0
      ? getMembersForOrganization(organization.id).length
      : 0;

  const legalBasis = position.legalBasis ?? null;
  const seatsCount = position.seatsCount ?? null;

  const exOfficio = positionExOfficioOf(position)
    .map((id) => getOrganizationById(id))
    .filter((item): item is Organization => item !== undefined);

  const summary = positionSummary(position, { dateStyle: "short" });
  const lastEnded =
    currentHolders.length === 0
      ? tenures
          .map((tenure) => tenure.end)
          .filter((end): end is string => typeof end === "string")
          .sort()
          .at(-1) ?? null
      : null;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: SITE_NAME, href: "/" },
    { label: <T area="common" k="navPositions" />, href: "/posities/" },
    { label: position.title },
  ];
  const state = holderState({ currentHolders: currentHolders.length, lastEnded, vacancy: vacancy !== null, memberCount: bodyMembers });

  const organizationUrl = organization
    ? absoluteUrl(`/organisaties/${organization.slug}/`)
    : undefined;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Occupation",
          name: position.title,
          ...(organization
            ? {
                occupationLocation: {
                  "@type": "GovernmentOrganization",
                  name: organization.name,
                  ...(organizationUrl !== undefined ? { url: organizationUrl } : {}),
                },
              }
            : {}),
        }}
      />

      <Breadcrumb items={breadcrumbItems} />

      <PositionHeader
        position={position}
        organization={organization}
        summary={summary}
        legalBasis={legalBasis}
        holders={currentHolders}
        seatsCount={seatsCount}
        holdersFallback={
          state.kind === "holders" && seatsCount !== null && currentHolders.length > seatsCount ? (
            <p className="mt-2 text-sm text-ink-faint">
              <T area="entity" k="moreHoldersThanSeats" />
            </p>
          ) : state.kind === "holders" && vacancy !== null ? (
            <GapNote sources={[vacancy.source]} className="mt-2">
              <T area="entity" k="holdersVacant" /> <L nl={vacancy.label.nl} en={vacancy.label.en} />.
            </GapNote>
          ) : state.kind === "vacant" && vacancy !== null ? (
            <GapNote sources={[vacancy.source]}>
              <T area="entity" k="holdersVacant" /> <L nl={vacancy.label.nl} en={vacancy.label.en} />.
            </GapNote>
          ) : state.kind === "members" && organization ? (
            <GapNote sources={organization.sources}>
              <T area="entity" k="holdersViaMembers" vars={{ n: state.count, body: organization.name }} />{" "}
              <a href={`/organisaties/${organization.slug}/#leden`} className="font-medium text-accent-text underline-offset-2 hover:underline">
                <T area="entity" k="holdersViaMembersLink" />
              </a>
            </GapNote>
          ) : state.kind === "ended" ? (
            <GapNote sources={position.sources}>
              <DateT area="entity" k="holdersNoneEnded" dates={{ date: state.date }} short />
            </GapNote>
          ) : state.kind === "holders" ? null : (
            <GapNote sources={position.sources}>
              <T area="entity" k="holdersNoneUnknown" />
            </GapNote>
          )
        }
      />

      <div className="mt-6 min-w-0 space-y-4">
        <EntityTabs
          first="verbindingen"
          hasNews={news.length > 0}
          hasConnections={connections.length > 0}
          news={
            <div>
              <div className="mt-3">
                <NewsPanel scope="custom" items={news} initialLimit={4} />
              </div>
            </div>
          }
          connections={
            <div>
              <div className="mt-3">
                <EntityConnections connections={connections} selfId={position.id} contextId={position.organization} />
              </div>
            </div>
          }
        />

        {/* The history repeats the current holders unless it holds someone who left. */}
        {tenures.some((tenure) => tenure.end !== null) ? (
          <FactGroup icon={<HistoryIcon />} title={<T area="entity" k="tenureHistoryTitle" />} count={tenures.length}>
            <TenureTimeline tenures={tenures} variant="position" labelKey="tenureHistoryTitle" limit={6} />
          </FactGroup>
        ) : null}

        {/* The tab already lists these bodies when the sourced relation says the same. */}
        {exOfficio.some((item) => !connections.some((connection) => connection.type === "ex_officio" && connection.other.id === item.id)) ? (
          <FactGroup icon={<SeatIcon />} title={<T area="entity" k="exOfficioTitle" />} count={exOfficio.length}>
            <ul className="space-y-1.5 text-sm">
              {exOfficio.map((item) => (
                <li key={item.id}>
                  <EntityPeekLink id={item.id} glyph />
                </li>
              ))}
            </ul>
          </FactGroup>
        ) : null}
      </div>

      <SourceList sources={position.sources} />
    </>
  );
}
