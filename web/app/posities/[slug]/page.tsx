import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, type BreadcrumbItem } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { EntityChip } from "@/components/entity-chip";
import { JsonLd } from "@/components/json-ld";
import { KindBadge } from "@/components/kind-badge";
import { PersonCard } from "@/components/person-card";
import { SourceLink } from "@/components/source-link";
import { SourceList } from "@/components/source-list";
import { EntityFacts, type EntityFact } from "@/components/entity/entity-facts";
import { TenureTimeline } from "@/components/entity/tenure-timeline";
import {
  getDatasetDate,
  getOrganizationById,
  getPersonById,
  getPositionBySlug,
  getPositions,
  getSourceById,
  getTenuresForPosition,
} from "@/lib/data";
import {
  formatTermLength,
  getCurrentHoldersForPosition,
  positionEntryModes,
  positionExOfficioOf,
} from "@/lib/entity";
import { formatCount } from "@/lib/format";
import {
  ENTRY_MODE_LABELS,
  FILL_METHOD_LABELS,
  ORG_TYPE_LABELS,
} from "@/lib/labels";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { Organization } from "@/lib/types";

export const dynamicParams = false;

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
  const description =
    organization !== undefined
      ? `${position.title} bij ${organization.name}: wettelijke basis en de reeks bekende functionarissen, met bron per gegeven.`
      : `${position.title}: wettelijke basis en de reeks bekende functionarissen, met bron per gegeven.`;
  return pageMetadata({
    title: position.title,
    description,
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

  const legalBasis = position.legalBasis ?? null;
  const fillMethod = position.fillMethod ?? null;
  const termLength = position.termLengthMonths ?? null;
  const seatsCount = position.seatsCount ?? null;
  const entryModes = positionEntryModes(position);

  const exOfficio = positionExOfficioOf(position)
    .map((id) => getOrganizationById(id))
    .filter((item): item is Organization => item !== undefined);

  const entryModeLabel =
    entryModes.length > 0
      ? entryModes
          .map((mode) => ENTRY_MODE_LABELS[mode])
          .filter((label): label is string => label !== undefined)
          .join(", ")
      : null;

  const facts: EntityFact[] = [
    {
      label: "Organisatie",
      value: organization ? (
        <EntityChip href={`/organisaties/${organization.slug}/`}>{organization.name}</EntityChip>
      ) : null,
    },
    { label: "Type", value: ORG_TYPE_LABELS[position.type] },
    { label: "Vulwijze", value: fillMethod !== null ? FILL_METHOD_LABELS[fillMethod] : null },
    {
      label: "Zittingstermijn",
      value: termLength !== null ? formatTermLength(termLength) : null,
    },
    { label: "Zetels", value: seatsCount !== null ? formatCount(seatsCount) : null },
    { label: "Toetredingswijzen", value: entryModeLabel },
  ];

  const breadcrumbItems: BreadcrumbItem[] = [{ label: SITE_NAME, href: "/" }];
  if (organization) {
    breadcrumbItems.push({ label: organization.name, href: `/organisaties/${organization.slug}/` });
  }
  breadcrumbItems.push({ label: position.title });

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

      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{position.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <KindBadge tone="accent">{ORG_TYPE_LABELS[position.type]}</KindBadge>
          {fillMethod !== null ? (
            <span className="text-xs text-ink-faint">{FILL_METHOD_LABELS[fillMethod]}</span>
          ) : null}
          {seatsCount !== null ? (
            <span className="text-xs text-ink-faint">{formatCount(seatsCount)} zetel(s)</span>
          ) : null}
        </div>
        <div className="mt-4">
          {legalBasis !== null ? (
            <SourceLink href={legalBasis.url}>Wettelijke basis: {legalBasis.label}</SourceLink>
          ) : (
            <span className="text-xs text-ink-faint">Geen wettelijke basis opgenomen.</span>
          )}
        </div>
        <EntityFacts facts={facts} />
      </header>

      <section aria-labelledby="bekleders-titel" className="border-b border-line py-6">
        <h2 id="bekleders-titel" className="text-lg font-semibold tracking-tight text-ink">
          Huidige bekleders
        </h2>
        {currentHolders.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {currentHolders.map((tenure) => {
              const person = getPersonById(tenure.person);
              if (!person) return null;
              const source = getSourceById(tenure.source.source);
              return (
                <li key={tenure.id}>
                  <PersonCard
                    person={person}
                    positionTitle={organization?.name ?? null}
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
        ) : (
          <div className="mt-3">
            <EmptyState
              title="Geen lopende bekleder"
              description="Voor deze positie is in de dataset geen benoeming zonder einddatum met bron opgenomen. Een positie zonder bekleder is een vacature zodra de dataset dat bijhoudt."
            />
          </div>
        )}
      </section>

      {exOfficio.length > 0 ? (
        <section aria-labelledby="rechtswege-titel" className="border-b border-line py-6">
          <h2 id="rechtswege-titel" className="text-lg font-semibold tracking-tight text-ink">
            Van rechtswege
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            De bekleder van deze positie zit of voorzit van rechtswege in de volgende organen.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {exOfficio.map((item) => (
              <li key={item.id}>
                <EntityChip href={`/organisaties/${item.slug}/`}>{item.name}</EntityChip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="geschiedenis-titel" className="border-b border-line py-6">
        <h2 id="geschiedenis-titel" className="text-lg font-semibold tracking-tight text-ink">
          Bekleders door de tijd
        </h2>
        {tenures.length > 0 ? (
          <div className="mt-3">
            <TenureTimeline tenures={tenures} variant="position" label="Bekleders door de tijd" />
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState
              title="Geen bekleders bekend"
              description="Voor deze positie is nog geen bekleder met bron opgenomen."
            />
          </div>
        )}
      </section>

      <SourceList sources={position.sources} />
    </>
  );
}
