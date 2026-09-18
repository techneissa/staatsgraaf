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
import { EntityConnections } from "@/components/entity/entity-connections";
import { EntityFacts, type EntityFact } from "@/components/entity/entity-facts";
import { MemberList } from "@/components/entity/member-list";
import { SeatGrid } from "@/components/entity/seat-grid";
import { TenureTimeline } from "@/components/entity/tenure-timeline";
import {
  getCurrentTenuresForOrganization,
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
import { canonical } from "@/lib/site";
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
  return {
    title: organization.name,
    description,
    alternates: canonical(`/organisaties/${organization.slug}/`),
    openGraph: { title: organization.name, description },
  };
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

  const facts: EntityFact[] = [
    { label: "Type", value: ORG_SUBTYPE_LABELS[organization.subtype] },
    { label: "Branche", value: ORG_BRANCH_LABELS[organization.branch] },
    { label: "Niveau", value: ORG_LEVEL_LABELS[organization.level] },
    { label: "Aliassen", value: aliases.length > 0 ? aliases.join(", ") : null },
    {
      label: "Opgericht",
      value:
        organization.established != null ? (
          <time dateTime={organization.established}>{formatDate(organization.established)}</time>
        ) : null,
    },
    {
      label: "Opgeheven",
      value:
        organization.dissolved != null ? (
          <time dateTime={organization.dissolved}>{formatDate(organization.dissolved)}</time>
        ) : null,
    },
    { label: "Zetels", value: seatsCount !== null ? formatCount(seatsCount) : null },
    { label: "Medewerkers", value: employeeValue(organization) },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "GovernmentOrganization",
          name: organization.name,
          ...(description !== null ? { description } : {}),
          ...(website !== null ? { url: website } : {}),
        }}
      />

      <Breadcrumb
        items={[
          { label: "NL Overheid Graph", href: "/" },
          { label: ORG_BRANCH_LABELS[organization.branch] },
          { label: organization.name },
        ]}
      />

      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{organization.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <KindBadge tone="accent">{ORG_SUBTYPE_LABELS[organization.subtype]}</KindBadge>
          <span className="text-xs text-ink-faint">{ORG_BRANCH_LABELS[organization.branch]}</span>
        </div>
        {description !== null ? (
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">{description}</p>
        ) : (
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
            Voor {organization.name} is nog geen Nederlandse beschrijving met bron opgenomen in de
            dataset.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {legalSource !== null ? (
            <SourceLink href={legalSource.url}>
              Wettelijke grondslag: {legalSource.label}
            </SourceLink>
          ) : (
            <span className="text-xs text-ink-faint">Geen wettelijke grondslag opgenomen.</span>
          )}
          {website !== null ? (
            <SourceLink href={website} meta={websiteHost(website)}>
              Officiële website
            </SourceLink>
          ) : (
            <span className="text-xs text-ink-faint">Geen website opgenomen.</span>
          )}
        </div>
        <EntityFacts facts={facts} />
      </header>

      {currentHolders.length > 0 ? (
        <section aria-labelledby="functionarissen-titel" className="border-b border-line py-6">
          <h2 id="functionarissen-titel" className="text-lg font-semibold tracking-tight text-ink">
            Huidige functionarissen
          </h2>
          <ul className="mt-3 space-y-3">
            {currentHolders.map((tenure) => {
              const person = getPersonById(tenure.person);
              const position = getPositionById(tenure.position);
              if (!person) return null;
              const source = getSourceById(tenure.source.source);
              return (
                <li key={tenure.id}>
                  <PersonCard
                    person={person}
                    positionTitle={position?.title ?? null}
                    startedAt={tenure.start}
                    acting={tenure.acting}
                  />
                  {source ? (
                    <p className="mt-1 pl-1">
                      <SourceLink href={source.url} meta={source.publisher}>
                        Bron
                      </SourceLink>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {members.length > 0 ? (
        <section aria-labelledby="leden-titel" className="border-b border-line py-6">
          <h2 id="leden-titel" className="text-lg font-semibold tracking-tight text-ink">
            Huidige leden
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {seatsCount !== null ? `${formatCount(seatsCount)} zetels in de organisatie. ` : null}
            {formatCount(members.length)} leden met een lopend lidmaatschap in de dataset.
          </p>
          <div className="mt-4">
            <SeatGrid members={members} limit={GRID_LIMIT} />
          </div>
          {members.length > GRID_LIMIT ? (
            <details className="mt-4">
              <summary className="cursor-pointer rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm font-medium text-ink transition-fast hover:border-line-strong">
                Toon alle {formatCount(members.length)} leden
              </summary>
              <div className="mt-3">
                <MemberList members={members} />
              </div>
            </details>
          ) : (
            <div className="mt-4">
              <MemberList members={members} />
            </div>
          )}
        </section>
      ) : null}

      {currentHolders.length === 0 && members.length === 0 ? (
        <section aria-labelledby="geen-bekleders-titel" className="border-b border-line py-6">
          <h2 id="geen-bekleders-titel" className="text-lg font-semibold tracking-tight text-ink">
            Huidige functionarissen en leden
          </h2>
          <div className="mt-3">
            <EmptyState
              title="Geen lopende functies of lidmaatschappen"
              description={`Voor ${organization.name} is in de dataset nog geen lopende benoeming of lidmaatschap met bron opgenomen.`}
            />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="onderdeel-titel" className="border-b border-line py-6">
        <h2 id="onderdeel-titel" className="text-lg font-semibold tracking-tight text-ink">
          Onderdeel van
        </h2>
        {partOfOrganizations.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {partOfOrganizations.map((parent) => (
              <li key={parent.id}>
                <EntityChip href={`/organisaties/${parent.slug}/`}>{parent.name}</EntityChip>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-faint">
            Geen bovenliggende organisatie met bron opgenomen.
          </p>
        )}
      </section>

      <section aria-labelledby="functiegeschiedenis-titel" className="border-b border-line py-6">
        <h2
          id="functiegeschiedenis-titel"
          className="text-lg font-semibold tracking-tight text-ink"
        >
          Functiegeschiedenis
        </h2>
        {organizationTenures.length > 0 ? (
          <div className="mt-3">
            <TenureTimeline
              tenures={organizationTenures}
              variant="organization"
              label="Functiegeschiedenis"
            />
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState
              title="Geen functiegeschiedenis"
              description={`Voor ${organization.name} zijn in de dataset nog geen benoemingen met datum en bron opgenomen.`}
            />
          </div>
        )}
      </section>

      <EntityTabs
        news={
          <div>
            <h2 id="nieuws-paneel-titel" className="text-lg font-semibold tracking-tight text-ink">
              Nieuws
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
              className="text-lg font-semibold tracking-tight text-ink"
            >
              Wie is verbonden?
            </h2>
            <div className="mt-3">
              <EntityConnections connections={connections} />
            </div>
          </div>
        }
      />

      <SourceList sources={organization.sources} />
    </>
  );
}
