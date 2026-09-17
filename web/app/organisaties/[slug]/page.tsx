import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { EntityChip } from "@/components/entity-chip";
import { EntityTabs } from "@/components/entity-tabs";
import { EmptyState } from "@/components/empty-state";
import { JsonLd } from "@/components/json-ld";
import { KindBadge } from "@/components/kind-badge";
import { PersonCard } from "@/components/person-card";
import { SourceLink } from "@/components/source-link";
import { SourceList } from "@/components/source-list";
import {
  getCurrentMembershipsForOrganization,
  getCurrentTenuresForOrganization,
  getOrganizationById,
  getOrganizationBySlug,
  getOrganizations,
  getPersonById,
  getPositionById,
} from "@/lib/data";
import { formatCount, formatDate } from "@/lib/format";
import { ORG_BRANCH_LABELS, ORG_SUBTYPE_LABELS } from "@/lib/labels";
import { canonical } from "@/lib/site";

export const dynamicParams = false;

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

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const organization = getOrganizationBySlug(slug);
  if (!organization) notFound();

  const positionTenures = getCurrentTenuresForOrganization(organization.id).sort((a, b) => {
    const titleA = getPositionById(a.position)?.title ?? "";
    const titleB = getPositionById(b.position)?.title ?? "";
    return positionRank(titleA) - positionRank(titleB) || titleA.localeCompare(titleB, "nl");
  });
  const currentMemberships = getCurrentMembershipsForOrganization(organization.id);
  const partOf = organization.partOf
    .map((id) => getOrganizationById(id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);
  const websiteHost =
    organization.website !== null && organization.website !== undefined
      ? new URL(organization.website).hostname.replace(/^www\./, "")
      : null;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "GovernmentOrganization",
          name: organization.name,
          ...(organization.description !== null ? { description: organization.description } : {}),
          ...(organization.website ? { url: organization.website } : {}),
        }}
      />

      <Breadcrumb
        items={[{ label: "NL Overheid Graph", href: "/" }, { label: organization.name }]}
      />

      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{organization.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <KindBadge tone="accent">{ORG_SUBTYPE_LABELS[organization.subtype]}</KindBadge>
          <span className="text-xs text-ink-faint">{ORG_BRANCH_LABELS[organization.branch]}</span>
          {organization.established !== null ? (
            <span className="text-xs text-ink-faint">
              Opgericht{" "}
              <time dateTime={organization.established}>
                {formatDate(organization.established)}
              </time>
            </span>
          ) : null}
        </div>
        {organization.description !== null ? (
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
            {organization.description}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {organization.legalSource ? (
            <SourceLink href={organization.legalSource.url}>
              Wettelijke grondslag: {organization.legalSource.label}
            </SourceLink>
          ) : null}
          {organization.website ? (
            <SourceLink href={organization.website} meta={websiteHost}>
              Officiële website
            </SourceLink>
          ) : null}
        </div>
      </header>

      {positionTenures.length > 0 ? (
        <section aria-labelledby="functionarissen-titel" className="border-b border-line py-6">
          <h2
            id="functionarissen-titel"
            className="text-lg font-semibold tracking-tight text-ink"
          >
            Huidige functionarissen
          </h2>
          <ul className="mt-3 space-y-2">
            {positionTenures.map((tenure) => {
              const person = getPersonById(tenure.person);
              const position = getPositionById(tenure.position);
              if (!person) return null;
              return (
                <li key={tenure.id}>
                  <PersonCard
                    person={person}
                    positionTitle={position?.title ?? null}
                    startedAt={tenure.start}
                    acting={tenure.acting}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : currentMemberships.length > 0 ? (
        <section aria-labelledby="leden-titel" className="border-b border-line py-6">
          <h2 id="leden-titel" className="text-lg font-semibold tracking-tight text-ink">
            Huidige leden
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {formatCount(currentMemberships.length)} leden met een lopend lidmaatschap.
          </p>
        </section>
      ) : null}

      {partOf.length > 0 ? (
        <section aria-labelledby="deel-van-titel" className="border-b border-line py-6">
          <h2 id="deel-van-titel" className="text-lg font-semibold tracking-tight text-ink">
            Onderdeel van
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {partOf.map((parent) => (
              <li key={parent.id}>
                <EntityChip href={`/organisaties/${parent.slug}/`}>{parent.name}</EntityChip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <EntityTabs
        news={
          <EmptyState
            title="Nog geen nieuws"
            description={`Berichten waarin ${organization.name} voorkomt, verschijnen hier met bron en datum.`}
          />
        }
        connections={
          <EmptyState
            title="Nog geen verbindingen"
            description={`Dit paneel toont straks de organisaties en personen rond ${organization.name}, op basis van de relaties in de dataset.`}
          />
        }
      />

      <SourceList sources={organization.sources} />
    </>
  );
}
