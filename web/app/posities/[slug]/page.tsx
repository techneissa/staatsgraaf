import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, type BreadcrumbItem } from "@/components/breadcrumb";
import { EntityChip } from "@/components/entity-chip";
import { EmptyState } from "@/components/empty-state";
import { JsonLd } from "@/components/json-ld";
import { KindBadge } from "@/components/kind-badge";
import { SourceLink } from "@/components/source-link";
import { SourceList } from "@/components/source-list";
import { Timeline, type TimelineItem } from "@/components/timeline";
import {
  getOrganizationById,
  getPersonById,
  getPositionBySlug,
  getPositions,
  getTenuresForPosition,
} from "@/lib/data";
import { formatPeriod } from "@/lib/format";
import { ENTRY_MODE_LABELS, END_REASON_LABELS, FILL_METHOD_LABELS, ORG_TYPE_LABELS } from "@/lib/labels";
import { canonical } from "@/lib/site";

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
  return {
    title: position.title,
    description,
    alternates: canonical(`/posities/${position.slug}/`),
    openGraph: { title: position.title, description },
  };
}

export default async function PositionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const position = getPositionBySlug(slug);
  if (!position) notFound();

  const organization = getOrganizationById(position.organization);
  const tenures = getTenuresForPosition(position.id);

  const items: TimelineItem[] = tenures.map((tenure) => {
    const person = getPersonById(tenure.person);
    const badges: string[] = [];
    if (tenure.acting) badges.push("Waarnemend");
    if (tenure.entryMode !== null && tenure.entryMode !== "benoemd") {
      const label = ENTRY_MODE_LABELS[tenure.entryMode];
      if (label !== undefined) badges.push(label);
    }
    if (tenure.end !== null && tenure.endReason !== null) {
      badges.push(END_REASON_LABELS[tenure.endReason]);
    }
    return {
      id: tenure.id,
      title: person ? (
        <Link
          href={`/personen/${person.slug}/`}
          className="underline-offset-2 hover:text-accent-text hover:underline"
        >
          {person.name}
        </Link>
      ) : (
        "Onbekende persoon"
      ),
      period: formatPeriod(tenure.start, tenure.end),
      current: tenure.end === null,
      badges,
    };
  });

  const breadcrumbItems: BreadcrumbItem[] = [{ label: "NL Overheid Graph", href: "/" }];
  if (organization) {
    breadcrumbItems.push({ label: organization.name, href: `/organisaties/${organization.slug}/` });
  }
  breadcrumbItems.push({ label: position.title });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Occupation",
          name: position.title,
        }}
      />

      <Breadcrumb items={breadcrumbItems} />

      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{position.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <KindBadge tone="accent">{ORG_TYPE_LABELS[position.type]}</KindBadge>
          {position.fillMethod ? (
            <span className="text-xs text-ink-faint">
              {FILL_METHOD_LABELS[position.fillMethod]}
            </span>
          ) : null}
          {position.seatsCount !== null ? (
            <span className="text-xs text-ink-faint">{position.seatsCount} zetel(s)</span>
          ) : null}
        </div>
        {organization ? (
          <p className="mt-3 text-sm text-ink-muted">
            <EntityChip href={`/organisaties/${organization.slug}/`}>{organization.name}</EntityChip>
          </p>
        ) : null}
        {position.legalBasis ? (
          <p className="mt-2">
            <SourceLink href={position.legalBasis.url}>
              Wettelijke basis: {position.legalBasis.label}
            </SourceLink>
          </p>
        ) : null}
      </header>

      <section aria-labelledby="bekleders-titel" className="border-b border-line py-6">
        <h2 id="bekleders-titel" className="text-lg font-semibold tracking-tight text-ink">
          Bekleders
        </h2>
        {items.length > 0 ? (
          <div className="mt-3">
            <Timeline items={items} label="Bekleders" />
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState
              title="Geen bekleders bekend"
              description="Voor deze positie is nog geen bekleder met bron opgenomen. Een positie zonder lopende benoeming is een vacature zodra de dataset dat bijhoudt."
            />
          </div>
        )}
      </section>

      <SourceList sources={position.sources} />
    </>
  );
}
