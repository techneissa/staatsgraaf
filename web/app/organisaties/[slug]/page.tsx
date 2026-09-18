import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { EntityChip } from "@/components/entity-chip";
import { EntityTabs } from "@/components/entity-tabs";
import { JsonLd } from "@/components/json-ld";
import { KindBadge } from "@/components/kind-badge";
import { NewsCard } from "@/components/news-card";
import { PersonCard } from "@/components/person-card";
import { SourceLink } from "@/components/source-link";
import { SourceList } from "@/components/source-list";
import { T } from "@/components/i18n/t";
import { EntityConnections } from "@/components/entity/entity-connections";
import { EntityDot } from "@/components/entity/entity-dot";
import { EntityFacts } from "@/components/entity/entity-facts";
import { FactGroup } from "@/components/entity/fact-group";
import { HistoryIcon, PeopleIcon, SeatIcon } from "@/components/entity/icons";
import { MemberList } from "@/components/entity/member-list";
import { SeatGrid } from "@/components/entity/seat-grid";
import { TenureTimeline } from "@/components/entity/tenure-timeline";
import {
  getCurrentTenuresForOrganization,
  getDatasetDate,
  getOrganizationById,
  getOrganizationBySlug,
  getOrganizations,
  getPersonById,
  getPositionById,
  getSourceById,
} from "@/lib/data";
import {
  ORG_LEVEL_LABELS,
  getConnectionsForEntity,
  getMembersForOrganization,
  getNewsForEntity,
  getTenuresForOrganization,
  organizationAliases,
  organizationParentId,
  organizationPartOf,
} from "@/lib/entity";
import { formatCount, formatDate } from "@/lib/format";
import { ORG_BRANCH_LABELS, ORG_SUBTYPE_LABELS } from "@/lib/labels";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { Organization } from "@/lib/types";

export const dynamicParams = false;

const GRID_LIMIT = 24;

export function generateStaticParams() {
  return getOrganizations().map((organization) => ({ slug: organization.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const organization = getOrganizationBySlug(slug);
  if (!organization) return {};
  const description =
    organization.description ??
    `Overzicht van ${organization.name}: wettelijke grondslag, website en openbare functionarissen, met een bron per gegeven.`;
  return pageMetadata({
    title: organization.name,
    description,
    path: `/organisaties/${organization.slug}/`,
    snapshotDate: getDatasetDate(),
  });
}

function positionRank(title: string): number {
  return title.startsWith("Minister") ? 0 : 1;
}

function websiteHost(url: string | null | undefined): string | null {
  if (url === null || url === undefined) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function employeeValue(organization: Organization): string | null {
  const employeeCount = organization.employeeCount ?? null;
  if (employeeCount === null) return null;
  const count = employeeCount.actual ?? employeeCount.budgeted ?? null;
  if (count === null) return null;
  return employeeCount.year !== null ? `${formatCount(count)} (${employeeCount.year})` : formatCount(count);
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const organization = getOrganizationBySlug(slug);
  if (!organization) notFound();

  const currentHolders = getCurrentTenuresForOrganization(organization.id).sort((a, b) => {
    const titleA = getPositionById(a.position)?.title ?? "";
    const titleB = getPositionById(b.position)?.title ?? "";
    return positionRank(titleA) - positionRank(titleB) || titleA.localeCompare(titleB, "nl");
  });
  const members = getMembersForOrganization(organization.id);
  const organizationTenures = getTenuresForOrganization(organization.id);
  const connections = getConnectionsForEntity(organization.id);
  const news = getNewsForEntity(organization.id);

  const parentIds = [organizationParentId(organization), ...organizationPartOf(organization)].filter(
    (id): id is string => typeof id === "string",
  );
  const partOfOrganizations = [...new Set(parentIds)]
    .map((id) => getOrganizationById(id))
    .filter((item): item is Organization => item !== undefined);

  const description = organization.description ?? null;
  const legalSource = organization.legalSource ?? null;
  const website = organization.website ?? null;
  const seatsCount = organization.seatsCount ?? null;
  const aliases = organizationAliases(organization);
  const memberCount = members.length;

  const pageUrl = absoluteUrl(`/organisaties/${organization.slug}/`);
  const parentId = organizationParentId(organization);
  const parentOrganization = parentId !== null ? getOrganizationById(parentId) : undefined;

  const facts = [
    { label: <T area="entity" k="factType" />, value: ORG_SUBTYPE_LABELS[organization.subtype] },
    { label: <T area="entity" k="factBranch" />, value: ORG_BRANCH_LABELS[organization.branch] },
    { label: <T area="entity" k="factLevel" />, value: ORG_LEVEL_LABELS[organization.level] },
    {
      label: <T area="entity" k="factAliases" />,
      value: aliases.length > 0 ? aliases.join(", ") : null,
    },
    {
      label: <T area="entity" k="factEstablished" />,
      value:
        organization.established != null ? (
          <time dateTime={organization.established}>{formatDate(organization.established)}</time>
        ) : null,
    },
    {
      label: <T area="entity" k="factDissolved" />,
      value:
        organization.dissolved != null ? (
          <time dateTime={organization.dissolved}>{formatDate(organization.dissolved)}</time>
        ) : null,
    },
    {
      label: <T area="entity" k="factSeats" />,
      value: seatsCount !== null ? formatCount(seatsCount) : null,
    },
    { label: <T area="entity" k="factEmployees" />, value: employeeValue(organization) },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "GovernmentOrganization",
          name: organization.name,
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
          ...(description !== null ? { description } : {}),
          ...(website !== null ? { sameAs: website } : {}),
          ...(parentOrganization !== undefined
            ? {
                parentOrganization: {
                  "@type": "GovernmentOrganization",
                  name: parentOrganization.name,
                },
              }
            : {}),
        }}
      />

      <Breadcrumb
        items={[
          { label: SITE_NAME, href: "/" },
          { label: ORG_BRANCH_LABELS[organization.branch] },
          { label: organization.name },
        ]}
      />

      <header className="mt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <KindBadge tone="accent">{ORG_SUBTYPE_LABELS[organization.subtype]}</KindBadge>
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
            <EntityDot kind="organization" id={organization.id} />
            {ORG_BRANCH_LABELS[organization.branch]}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink border-l-4 border-line pl-3">
          {organization.name}
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
          {description !== null
            ? description
            : `Voor ${organization.name} is nog geen Nederlandse beschrijving met bron opgenomen in de dataset.`}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {legalSource !== null ? (
            <SourceLink href={legalSource.url}>
              <T area="entity" k="legalSourceLabel" />: {legalSource.label}
            </SourceLink>
          ) : (
            <span className="text-xs text-ink-faint">
              <T area="entity" k="noLegalSourceLabel" />
            </span>
          )}
          {website !== null ? (
            <SourceLink href={website} meta={websiteHost(website)}>
              <T area="entity" k="websiteLabel" />
            </SourceLink>
          ) : (
            <span className="text-xs text-ink-faint">
              <T area="entity" k="noWebsiteLabel" />
            </span>
          )}
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <EntityTabs
            news={
              <div>
                <h2 id="nieuws-paneel-titel" className="text-base font-semibold tracking-tight text-ink">
                  <T area="entity" k="tabNews" />
                </h2>
                {news.length > 0 ? (
                  <ol className="mt-3 space-y-3">
                    {news.map((item) => (
                      <li key={item.id}>
                        <NewsCard item={item} />
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="mt-3">
                    <EmptyState
                      title="Nog geen nieuws"
                      description={`Er zijn nog geen nieuwsberichten met ${organization.name} opgenomen in de dataset.`}
                    />
                  </div>
                )}
              </div>
            }
            connections={
              <div>
                <h2
                  id="verbindingen-paneel-titel"
                  className="text-base font-semibold tracking-tight text-ink"
                >
                  <T area="entity" k="whosConnected" />
                </h2>
                <div className="mt-3">
                  <EntityConnections connections={connections} />
                </div>
              </div>
            }
          />

          {memberCount > 0 ? (
            <FactGroup
              icon={<SeatIcon />}
              title={<T area="entity" k="membersTitle" />}
              count={memberCount}
            >
              {seatsCount !== null ? (
                <p className="text-sm tabular-nums text-ink-muted">
                  <T
                    area="common"
                    k="seatsCountLabel"
                    vars={{ n: memberCount, total: seatsCount }}
                  />
                </p>
              ) : (
                <p className="text-sm text-ink-muted">
                  <T area="entity" k="membersCountLine" vars={{ n: formatCount(memberCount) }} />
                </p>
              )}
              <div className="mt-3">
                <SeatGrid members={members} limit={GRID_LIMIT} />
              </div>
              {memberCount > GRID_LIMIT ? (
                <details className="mt-3">
                  <summary className="cursor-pointer list-none rounded-sm border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink transition-fast hover:border-line-strong">
                    <T area="common" k="seeAll" vars={{ n: memberCount }} />
                  </summary>
                  <div className="mt-3">
                    <MemberList members={members} />
                  </div>
                </details>
              ) : (
                <div className="mt-3">
                  <MemberList members={members} />
                </div>
              )}
            </FactGroup>
          ) : (
            <FactGroup
              icon={<SeatIcon />}
              title={<T area="entity" k="membersTitle" />}
              count={seatsCount ?? undefined}
            >
              {seatsCount !== null ? (
                <p className="text-sm tabular-nums text-ink-muted">
                  <T area="common" k="seatsOfLabel" vars={{ n: seatsCount }} />
                </p>
              ) : null}
              <p className="text-sm text-ink-faint">
                {seatsCount !== null ? null : "Geen lopende leden met bron opgenomen in de dataset."}
              </p>
            </FactGroup>
          )}

          {currentHolders.length > 0 ? (
            <FactGroup
              icon={<PeopleIcon />}
              title={<T area="entity" k="currentOfficials" />}
              count={currentHolders.length}
            >
              <ul className="space-y-2">
                {currentHolders.map((tenure) => {
                  const person = getPersonById(tenure.person);
                  const position = getPositionById(tenure.position);
                  const source = getSourceById(tenure.source.source);
                  if (!person) return null;
                  return (
                    <li key={tenure.id} className="space-y-1">
                      <PersonCard
                        person={person}
                        positionTitle={position?.title ?? null}
                        startedAt={tenure.start}
                        acting={tenure.acting}
                      />
                      {source ? (
                        <p className="pl-1">
                          <SourceLink href={source.url} meta={source.publisher}>
                            <T area="entity" k="sourceLabel" />
                          </SourceLink>
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </FactGroup>
          ) : (
            <FactGroup title={<T area="entity" k="currentOfficials" />}>
              <EmptyState
                title="Geen lopende functies of lidmaatschappen"
                description={`Voor ${organization.name} is in de dataset nog geen lopende benoeming of lidmaatschap met bron opgenomen.`}
              />
            </FactGroup>
          )}

          <FactGroup icon={<HistoryIcon />} title={<T area="entity" k="historyTitle" />}>
            {organizationTenures.length > 0 ? (
              <TenureTimeline
                tenures={organizationTenures}
                variant="organization"
                label="Functiegeschiedenis"
              />
            ) : (
              <EmptyState
                title="Geen functiegeschiedenis"
                description={`Voor ${organization.name} zijn in de dataset nog geen benoemingen met datum en bron opgenomen.`}
              />
            )}
          </FactGroup>
        </div>

        <aside className="min-w-0 space-y-4">
          <EntityFacts
            facts={facts}
            className="rounded-md border border-line bg-surface p-4"
          />

          <FactGroup title={<T area="entity" k="partOfTitle" />}>
            {partOfOrganizations.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {partOfOrganizations.map((parent) => (
                  <li key={parent.id}>
                    <EntityChip
                      href={`/organisaties/${parent.slug}/`}
                      dot={<EntityDot kind="organization" id={parent.id} />}
                    >
                      {parent.name}
                    </EntityChip>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-faint">
                <T area="entity" k="partOfNone" />
              </p>
            )}
          </FactGroup>
        </aside>
      </div>

      <SourceList sources={organization.sources} />
    </>
  );
}
