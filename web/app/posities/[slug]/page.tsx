import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, type BreadcrumbItem } from "@/components/breadcrumb";
import { EntityTabs } from "@/components/entity-tabs";
import { JsonLd } from "@/components/json-ld";
import { PersonCard } from "@/components/person-card";
import { SourceLink } from "@/components/source-link";
import { ShareButton } from "@/components/share-button";
import { DateT } from "@/components/content/local-date";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { SourceList } from "@/components/source-list";
import { SourceIcon } from "@/components/source-icon";
import { NewsPanel } from "@/components/news/news-panel";
import { Gloss, L, T } from "@/components/i18n/t";
import { positionEn } from "@/lib/name-gloss";
import { POSITION_TYPE_LABELS } from "@/lib/labels";
import { EntityConnections, SUMMARY_CLASS } from "@/components/entity/entity-connections";
import { Callout } from "@/components/entity/callout";
import { FactTiles, type FactTile } from "@/components/entity/fact-tiles";
import { FactGroup } from "@/components/entity/fact-group";
import { BuildingIcon, ClipboardIcon, ClockIcon, HistoryIcon, KeyIcon, PeopleIcon, SeatIcon } from "@/components/entity/icons";
import { positionSummary } from "@/lib/entity-summary";
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
  getConnectionsForEntity,
  getCurrentHoldersForPosition,
  positionEntryModes,
  positionExOfficioOf,
} from "@/lib/entity";
import { getNewsForEntity } from "@/lib/news";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { Organization, Position, Tenure } from "@/lib/types";
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
  if (!ambiguousPositionTitles.has(position.title)) return position.title;
  const organization = getOrganizationById(position.organization);
  if (!organization) return position.title;
  const parent =
    position.type === "commission" && organization.parent
      ? getOrganizationById(organization.parent)
      : undefined;
  const context = parent ?? organization;
  const contextName =
    context.subtype === "gemeente" ? context.name.replace(/^Gemeente\s+/, "") : context.name;
  if (position.title.includes(contextName)) return position.title;
  return `${position.title} van ${contextName}`;
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
  const fallback =
    organization !== undefined
      ? `${position.title} bij ${organization.name}: wettelijke basis en de reeks bekende functionarissen, met bron per gegeven.`
      : `${position.title}: wettelijke basis en de reeks bekende functionarissen, met bron per gegeven.`;
  return pageMetadata({
    title: positionMetadataTitle(position),
    description: summary !== null ? `${position.title}: ${summary.nl}.` : fallback,
    path: `/posities/${position.slug}/`,
    snapshotDate: getDatasetDate(),
  });
}

/** Term length in the site language: "4 jaar" or "4 years". */
function TermLength({ months }: { months: number }) {
  if (months % 12 === 0) {
    const years = months / 12;
    return <DateT area="entity" k={years === 1 ? "termYearOne" : "termYears"} counts={{ n: years }} />;
  }
  return <DateT area="entity" k={months === 1 ? "termMonthOne" : "termMonths"} counts={{ n: months }} />;
}

export default async function PositionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const position = getPositionBySlug(slug);
  if (!position) notFound();

  const organization = getOrganizationById(position.organization);
  const currentHolders = getCurrentHoldersForPosition(position.id);
  const tenures = getTenuresForPosition(position.id);
  const news = getNewsForEntity(position.id);
  const connections: Connection[] = getConnectionsForEntity(position.id);

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
      ? entryModes.map((mode, index) => (
          <span key={mode}>
            {index > 0 ? ", " : null}
            <LocaleLabel kind="entryMode" value={mode} />
          </span>
        ))
      : null;

  const summary = positionSummary(position);
  const lastEnded =
    currentHolders.length === 0
      ? tenures
          .map((tenure) => tenure.end)
          .filter((end): end is string => typeof end === "string")
          .sort()
          .at(-1) ?? null
      : null;

  const facts: FactTile[] = [
    {
      key: "organization",
      icon: <BuildingIcon />,
      label: <T area="entity" k="factOrganization" />,
      value: organization ? <EntityPeekLink id={organization.id} /> : null,
    },
    {
      key: "type",
      icon: <ClipboardIcon />,
      label: <T area="entity" k="factType" />,
      value: <L {...POSITION_TYPE_LABELS[position.type]} />,
    },
    {
      key: "fill",
      icon: <KeyIcon />,
      label: <T area="entity" k="factFillMethod" />,
      value: fillMethod !== null ? <LocaleLabel kind="fillMethod" value={fillMethod} /> : null,
    },
    {
      key: "term",
      icon: <ClockIcon />,
      label: <T area="entity" k="factTermLength" />,
      value: termLength !== null ? <TermLength months={termLength} /> : null,
    },
    {
      key: "seats",
      icon: <SeatIcon />,
      label: <T area="entity" k="factSeats" />,
      value: seatsCount !== null && seatsCount > 1 ? <DateT area="entity" k="countOnly" counts={{ n: seatsCount }} /> : null,
    },
    {
      key: "entry",
      icon: <PeopleIcon />,
      label: <T area="entity" k="factEntryModes" />,
      // An entry mode that only restates the fill method ("Van rechtswege" twice, "Koninklijk
      // besluit" and "Benoemd bij koninklijk besluit", "Verkiezing" and "Gekozen") is said once.
      value: entryModes.every((mode) => entryRestatesFill(mode, fillMethod)) ? null : entryModeLabel,
    },
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

      <header className="mt-4">
        <div className="flex min-w-0 items-start gap-3">
          <h1 className="min-w-0 flex-1 text-3xl font-semibold tracking-tight text-balance text-ink break-words">
            {position.title}
            <Gloss text={positionEn(position.title)} className="mt-1 block text-base font-normal tracking-normal text-ink-muted" />
          </h1>
          <ShareButton className="mt-1 shrink-0" title={position.title} />
        </div>
        {summary !== null ? (
          <p className="mt-2 max-w-prose text-base leading-snug text-ink-muted">
            <L nl={summary.nl} en={summary.en} />
          </p>
        ) : null}
        {lastEnded !== null ? (
          <div className="mt-3">
            <Callout>
              <DateT area="entity" k="noHolderSinceCallout" dates={{ date: lastEnded }} />
            </Callout>
          </div>
        ) : null}
        <FactTiles facts={facts} className="mt-4" />
        {legalBasis !== null ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <SourceLink href={legalBasis.url}>
              <T area="entity" k="legalBasisLabel" />: {legalBasis.label}
            </SourceLink>
          </div>
        ) : null}
      </header>

      <div className="mt-6 min-w-0 space-y-4">
        <EntityTabs
          news={
            <div>
              {news.length > 0 ? (
                <div className="mt-3">
                  <NewsPanel scope="custom" items={news} initialLimit={4} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-faint">
                  <T area="entity" k="newsEmptyTitle" />
                </p>
              )}
            </div>
          }
          connections={
            <div>
              <div className="mt-3">
                <EntityConnections connections={connections} selfId={position.organization} />
              </div>
            </div>
          }
        />

        {currentHolders.length > 0 ? (
          <FactGroup icon={<PeopleIcon />} title={<T area="entity" k="currentOfficials" />} count={currentHolders.length}>
            {seatsCount !== null && seatsCount > 1 ? (
              <p className="text-sm tabular-nums text-ink-muted">
                <DateT area="entity" k="seatsFilled" counts={{ n: currentHolders.length, total: seatsCount }} />
              </p>
            ) : null}
            <ul className="mt-1 divide-y divide-line/60">
              {currentHolders.slice(0, HOLDER_LIMIT).map((tenure) => (
                <HolderRow key={tenure.id} tenure={tenure} />
              ))}
            </ul>
            {currentHolders.length > HOLDER_LIMIT ? (
              <details className="motion-disclosure mt-2">
                <summary className={SUMMARY_CLASS}>
                  <T area="common" k="seeAll" vars={{ n: currentHolders.length }} />
                </summary>
                <ul className="divide-y divide-line/60">
                  {currentHolders.slice(HOLDER_LIMIT).map((tenure) => (
                    <HolderRow key={tenure.id} tenure={tenure} />
                  ))}
                </ul>
              </details>
            ) : null}
          </FactGroup>
        ) : null}

        {/* The history repeats the current holders unless it holds someone who left. */}
        {tenures.some((tenure) => tenure.end !== null) ? (
          <FactGroup icon={<HistoryIcon />} title={<T area="entity" k="tenureHistoryTitle" />} count={tenures.length}>
            <TenureTimeline tenures={tenures} variant="position" labelKey="tenureHistoryTitle" limit={6} />
          </FactGroup>
        ) : null}

        {exOfficio.length > 0 ? (
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

const HOLDER_LIMIT = 10;

function entryRestatesFill(mode: string, fillMethod: string | null): boolean {
  if (fillMethod === null) return false;
  if (mode === fillMethod) return true;
  if (fillMethod === "koninklijk-besluit") return mode === "benoemd-bij-kb" || mode === "benoemd";
  if (fillMethod === "verkiezing") return mode === "gekozen";
  if (fillMethod.startsWith("benoeming")) return mode === "benoemd";
  return false;
}

function HolderRow({ tenure }: { tenure: Tenure }) {
  const person = getPersonById(tenure.person);
  const source = getSourceById(tenure.source.source);
  if (!person) return null;
  return (
    <li>
      <PersonCard
        person={person}
        startedAt={tenure.start}
        acting={tenure.acting}
        source={
          source ? (
            <SourceIcon href={source.url} title={source.title} retrieved={tenure.source.retrieved} />
          ) : null
        }
      />
    </li>
  );
}
