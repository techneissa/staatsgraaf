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
import { FILL_METHOD_LABELS, POSITION_TYPE_LABELS } from "@/lib/labels";
import { EntityConnections, SUMMARY_CLASS } from "@/components/entity/entity-connections";
import { GapNote } from "@/components/entity/gap-note";
import { SourceSlot } from "@/components/entity/source-slot";
import { FactTiles, type FactTile } from "@/components/entity/fact-tiles";
import { FactGroup } from "@/components/entity/fact-group";
import { BuildingIcon, ClipboardIcon, ClockIcon, HistoryIcon, KeyIcon, PeopleIcon, SeatIcon } from "@/components/entity/icons";
import { positionSummary } from "@/lib/entity-summary";
import { holderState, positionDescription, positionPageTitle } from "@/lib/entity-page";
import { vacancyForPosition } from "@/lib/entity-vacancy";
import { withoutDerived } from "@/lib/entity-rows";
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
  getMembersForOrganization,
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
      bodyName: organization?.name ?? null,
      summary: summary?.nl ?? null,
      typeLabel: POSITION_TYPE_LABELS[position.type].nl,
      fillMethodLabel: position.fillMethod != null ? (FILL_METHOD_LABELS[position.fillMethod] ?? null) : null,
      seatsCount: position.seatsCount ?? null,
      holderCount: tenures.filter((tenure) => tenure.end === null).length,
      tenureCount: tenures.length,
      vacancy: vacancyForPosition(position.id) !== null,
    }),
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
  // Holders are listed in their own sections (current, then the history), so the tab keeps the sourced relations.
  const connections: Connection[] = withoutDerived(getConnectionsForEntity(position.id), ["holds_position"]);
  const vacancy = vacancyForPosition(position.id);
  const bodyMembers =
    organization !== undefined && /^Lid\b/.test(position.title) && currentHolders.length === 0
      ? getMembersForOrganization(organization.id).length
      : 0;

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

  const summary = positionSummary(position, { dateStyle: "short" });
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
      hint: position.type === "dept_head" ? <T area="entity" k="glossDeptHead" /> : null,
    },
    {
      key: "fill",
      icon: <KeyIcon />,
      label: <T area="entity" k="factFillMethod" />,
      value: fillMethod !== null ? <LocaleLabel kind="fillMethod" value={fillMethod} /> : null,
      hint: fillMethod !== null ? <T area="entity" k="glossFillMethod" /> : null,
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
      hint: entryModes.every((mode) => entryRestatesFill(mode, fillMethod)) ? null : <T area="entity" k="glossEntryModes" />,
    },
  ];

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
                <EntityConnections connections={connections} selfId={position.organization} />
              </div>
            </div>
          }
        />

        <FactGroup id="functionarissen" icon={<PeopleIcon />} title={<T area="entity" k="currentOfficials" />} count={currentHolders.length > 0 ? currentHolders.length : undefined}>
          {state.kind === "holders" ? (
            <>
              {seatsCount !== null && seatsCount > 1 ? (
                <p className="text-sm tabular-nums text-ink-muted">
                  <DateT area="entity" k="seatsFilled" counts={{ n: currentHolders.length, total: seatsCount }} />
                </p>
              ) : null}
              {seatsCount !== null && currentHolders.length > seatsCount ? (
                <p className="text-sm text-ink-faint">
                  <T area="entity" k="moreHoldersThanSeats" />
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
            </>
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
          ) : (
            <GapNote sources={position.sources}>
              <T area="entity" k="holdersNoneUnknown" />
            </GapNote>
          )}
        </FactGroup>

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
            <SourceSlot>
              <SourceIcon href={source.url} title={source.title} retrieved={tenure.source.retrieved} />
            </SourceSlot>
          ) : null
        }
      />
    </li>
  );
}
