import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { EntityTabs } from "@/components/entity-tabs";
import { JsonLd } from "@/components/json-ld";
import { NewsPanel } from "@/components/news/news-panel";
import { PersonCard } from "@/components/person-card";
import { ExternalLink } from "@/components/entity/external-link";
import { EntityConnections } from "@/components/entity/entity-connections";
import { ShareButton } from "@/components/share-button";
import { DateT, LocalDate } from "@/components/content/local-date";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { SUMMARY_CLASS } from "@/components/entity/entity-connections";
import { SourceList } from "@/components/source-list";
import { SourceIcon } from "@/components/source-icon";
import { Gloss, L, T } from "@/components/i18n/t";
import { orgEnGloss, positionEn } from "@/lib/name-gloss";
import { Callout } from "@/components/entity/callout";
import { GapNote } from "@/components/entity/gap-note";
import { OrgStructure } from "@/components/entity/org-structure";
import { SourceSlot } from "@/components/entity/source-slot";
import { SubtypeHint, SubtypeLabel } from "@/components/entity/subtype-label";
import { ColorDot, FactTiles, type FactTile } from "@/components/entity/fact-tiles";
import { FactGroup } from "@/components/entity/fact-group";
import { LocalizedDescription } from "@/components/entity/localized-description";
import { OrgEmblem, OrgEmblemCredit } from "@/components/entity/org-emblem";
import {
  BuildingIcon,
  CalendarIcon,
  HistoryIcon,
  LayersIcon,
  LinkIcon,
  PeopleIcon,
  SeatIcon,
  TagIcon,
} from "@/components/entity/icons";
import { MemberList } from "@/components/entity/member-list";
import { SeatGrid } from "@/components/entity/seat-grid";
import { SeatTally } from "@/components/entity/seat-tally";
import { ArchChart } from "@/components/parliament/arch-chart";
import { ElectionHistory } from "@/components/parliament/election-history";
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
  getConnectionsForEntity,
  getMediaItem,
  getMembersForOrganization,
  getTenuresForOrganization,
  mediaCreditInfo,
  organizationAliases,
  organizationImages,
  organizationParentId,
  organizationPartOf,
} from "@/lib/entity";
import { seatTallyForOrganization } from "@/lib/parliament";
import { withoutDerived } from "@/lib/entity-rows";
import { branchColorVar } from "@/lib/branch-colors";
import { descriptionFor } from "@/lib/description-translations";
import { childOrganizations, organizationSummary } from "@/lib/entity-summary";
import {
  commissieRole,
  compareCommissieHolders,
  organizationDescription,
  type CommissieRole,
} from "@/lib/entity-page";
import { ORG_BRANCH_LABELS, ORG_BRANCH_LABELS_EN, ORG_LEVEL_LABELS, ORG_LEVEL_LABELS_EN, ORG_SUBTYPE_LABELS, ORG_SUBTYPE_LABELS_EN } from "@/lib/labels";
import { getNewsForEntity } from "@/lib/news";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { Organization, Tenure } from "@/lib/types";

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
  const summary = organizationSummary(organization);
  const text = descriptionFor(organization.id, organization.description);
  const parentId = organizationParentId(organization);
  const parent = parentId !== null ? getOrganizationById(parentId) : undefined;
  const description = text?.nl
    ? text.nl
    : organizationDescription({
        name: organization.name,
        summary: summary?.nl ?? null,
        subtype: ORG_SUBTYPE_LABELS[organization.subtype] ?? organization.subtype,
        branch: ORG_BRANCH_LABELS[organization.branch] ?? organization.branch,
        level: ORG_LEVEL_LABELS[organization.level] ?? organization.level,
        parentName: parent?.name ?? null,
        childCount: childOrganizations(organization.id).length,
        holderCount: getCurrentTenuresForOrganization(organization.id).length,
        website: organization.website ?? null,
        hasLegalSource: organization.legalSource != null,
      });
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

/** Branch and level say the same thing ("Koninkrijk", "Koninkrijk"), so the page says it once. */
function levelRepeatsBranch(organization: Organization): boolean {
  const pairs: [string, string][] = [
    [ORG_BRANCH_LABELS[organization.branch], ORG_LEVEL_LABELS[organization.level]],
    [ORG_BRANCH_LABELS_EN[organization.branch], ORG_LEVEL_LABELS_EN[organization.level]],
  ];
  return pairs.some(([branch, level]) => {
    const a = (branch ?? "").toLowerCase();
    const b = (level ?? "").toLowerCase();
    return a !== "" && b !== "" && (a.startsWith(b) || b.startsWith(a));
  });
}

function employeeValue(organization: Organization): ReactNode {
  const employeeCount = organization.employeeCount ?? null;
  if (employeeCount === null) return null;
  const count = employeeCount.actual ?? employeeCount.budgeted ?? null;
  if (count === null) return null;
  return employeeCount.year !== null ? (
    <DateT area="entity" k="countWithYear" counts={{ n: count }} vars={{ year: employeeCount.year }} />
  ) : (
    <DateT area="entity" k="countOnly" counts={{ n: count }} />
  );
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const organization = getOrganizationBySlug(slug);
  if (!organization) notFound();

  const isCommissie = organization.subtype === "commissie";
  const currentHolders = getCurrentTenuresForOrganization(organization.id).sort((a, b) => {
    const positionA = getPositionById(a.position);
    const positionB = getPositionById(b.position);
    const titleA = positionA?.title ?? "";
    const titleB = positionB?.title ?? "";
    if (isCommissie) {
      // A committee reads chair, vice-chair, then members by surname (titles do not count).
      return compareCommissieHolders(
        { role: commissieRole(titleA), name: getPersonById(a.person)?.name ?? "" },
        { role: commissieRole(titleB), name: getPersonById(b.person)?.name ?? "" },
      );
    }
    return positionRank(titleA) - positionRank(titleB) || titleA.localeCompare(titleB, "nl");
  });
  const members = getMembersForOrganization(organization.id);
  const organizationTenures = getTenuresForOrganization(organization.id);
  // Current and past holders are listed in the sections below, with their positions and periods.
  const connections = withoutDerived(getConnectionsForEntity(organization.id), ["holds_position"]);
  const news = getNewsForEntity(organization.id);
  const tally =
    members.length > 0 && members.filter((entry) => entry.membership.fractie !== null).length * 2 >= members.length
      ? seatTallyForOrganization(organization.id)
      : null;

  const parentIds = [organizationParentId(organization), ...organizationPartOf(organization)].filter(
    (id): id is string => typeof id === "string",
  );
  const partOfOrganizations = [...new Set(parentIds)]
    .map((id) => getOrganizationById(id))
    .filter((item): item is Organization => item !== undefined);

  // The structure row below the header carries the count of bodies under it, as a link.
  const summary = organizationSummary(organization, { omitChildren: true });
  const description = descriptionFor(organization.id, organization.description);
  const legalSource = organization.legalSource ?? null;
  const website = organization.website ?? null;
  // The first logo on record with a verified free licence (ADR 0029). The author
  // stays "niet vermeld" when the file page names none, not the publisher.
  const emblem = organizationImages(organization)
    .map((id) => getMediaItem(id))
    .find((item) => item !== null && item.type === "logo") ?? null;
  const emblemInfo = emblem !== null ? { ...mediaCreditInfo(emblem), author: emblem.author ?? null } : null;
  const seatsCount = organization.seatsCount ?? null;
  const plain = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const aliases = organizationAliases(organization).filter((alias) => plain(alias) !== plain(organization.name));
  const memberCount = members.length;
  const mergedLevel = levelRepeatsBranch(organization);

  const pageUrl = absoluteUrl(`/organisaties/${organization.slug}/`);
  const parentId = organizationParentId(organization);
  const parentOrganization = parentId !== null ? getOrganizationById(parentId) : undefined;
  const children = childOrganizations(organization.id)
    .filter((child) => child.id !== organization.id)
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const hasNews = news.length > 0;
  const hasConnections = connections.length > 0;

  // The summary line under the name already names the type and the seats; a tile does not repeat them.
  const subtypeLabel = (ORG_SUBTYPE_LABELS[organization.subtype] ?? "").toLowerCase();
  const summaryNamesType = summary !== null && subtypeLabel !== "" && summary.nl.toLowerCase().startsWith(subtypeLabel);
  const summaryNamesSeats = summary !== null && seatsCount !== null && seatsCount > 0;
  // "Tweede Kamer der Staten-Generaal" with the type "Tweede Kamer" (or the gloss "House of
  // Representatives" with the type "House of Representatives") names the type twice.
  const nameNamesType =
    (subtypeLabel !== "" && organization.name.toLowerCase().startsWith(subtypeLabel)) ||
    (orgEnGloss(organization.name) ?? "").toLowerCase() === (ORG_SUBTYPE_LABELS_EN[organization.subtype] ?? "-").toLowerCase();

  const facts: FactTile[] = [
    {
      key: "type",
      icon: <BuildingIcon />,
      label: <T area="entity" k="factType" />,
      value: summaryNamesType || nameNamesType ? null : <SubtypeLabel value={organization.subtype} />,
      hint: <SubtypeHint value={organization.subtype} />,
    },
    {
      key: "branch",
      icon: <ColorDot color={branchColorVar(organization.branch)} />,
      label: <T area="entity" k={mergedLevel ? "factBranchLevel" : "factBranch"} />,
      value: <LocaleLabel kind="branch" value={organization.branch} />,
    },
    {
      key: "level",
      icon: <LayersIcon />,
      label: <T area="entity" k="factLevel" />,
      value: mergedLevel ? null : <LocaleLabel kind="level" value={organization.level} />,
    },
    {
      key: "seats",
      icon: <SeatIcon />,
      label: <T area="entity" k="factSeats" />,
      value: seatsCount !== null && !summaryNamesSeats ? <DateT area="entity" k="countOnly" counts={{ n: seatsCount }} /> : null,
    },
    { key: "employees", icon: <PeopleIcon />, label: <T area="entity" k="factEmployees" />, value: employeeValue(organization) },
    {
      key: "established",
      icon: <CalendarIcon />,
      label: <T area="entity" k="factEstablished" />,
      value: organization.established != null ? <LocalDate iso={organization.established} /> : null,
    },
    {
      key: "aliases",
      wide: true,
      icon: <TagIcon />,
      label: <T area="entity" k="factAliases" />,
      value: aliases.length > 0 ? <span lang="nl">{aliases.join(", ")}</span> : null,
    },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "GovernmentOrganization",
          name: organization.name,
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
          ...(description !== null ? { description: description.nl } : summary !== null ? { description: summary.nl } : {}),
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
          { label: <T area="common" k="navOrganizations" />, href: "/organisaties/" },
          { label: <LocaleLabel kind="branch" value={organization.branch} />, href: `/organisaties/#groep-${organization.branch}` },
          { label: organization.name },
        ]}
      />

      <header className="mt-4">
        <div className="flex min-w-0 items-start gap-3">
          {emblem !== null ? (
            <OrgEmblem name={organization.name} url={emblem.url} width={emblem.width} height={emblem.height} className="hidden sm:block" />
          ) : null}
          <h1 className="min-w-0 flex-1 text-3xl font-semibold tracking-tight text-ink text-balance break-words">
            {organization.name}
            <Gloss text={orgEnGloss(organization.name)} className="mt-1 block text-base font-normal tracking-normal text-ink-muted" />
          </h1>
          <ShareButton className="mt-1 shrink-0" title={organization.name} />
        </div>
        {emblem !== null && emblemInfo !== null ? (
          <OrgEmblemCredit
            info={emblemInfo}
            emblem={{ name: organization.name, url: emblem.url, width: emblem.width, height: emblem.height }}
            className="mt-1.5"
          />
        ) : null}
        {summary !== null ? (
          <p className="mt-2 max-w-prose text-base leading-snug text-ink-muted">
            <L nl={summary.nl} en={summary.en} />
          </p>
        ) : null}
        <OrgStructure parents={partOfOrganizations} childCount={children.length} holders={currentHolders} />
        {organization.dissolved != null ? (
          <div className="mt-3">
            <Callout>
              <DateT area="entity" k="dissolvedCallout" dates={{ date: organization.dissolved }} />
            </Callout>
          </div>
        ) : null}
        <FactTiles facts={facts} className="mt-4" />
        {description !== null ? (
          <LocalizedDescription
            nl={description.nl}
            en={description.en}
            className="mt-4 max-w-prose text-sm leading-relaxed text-ink-muted"
          />
        ) : null}
        {legalSource !== null || website !== null ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            {legalSource !== null ? (
              <ExternalLink href={legalSource.url}>
                <T area="entity" k="legalSourceLabel" />: {legalSource.label}
              </ExternalLink>
            ) : null}
            {website !== null ? (
              <ExternalLink href={website} meta={websiteHost(website)}>
                <T area="entity" k="websiteLabel" />
              </ExternalLink>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="mt-6 min-w-0 space-y-4">
        <EntityTabs
          first="verbindingen"
          hasNews={hasNews}
          hasConnections={hasConnections}
          empty={
            memberCount === 0 && currentHolders.length === 0 && children.length === 0 ? (
              <GapNote sources={organization.sources}>
                <T area="entity" k="orgEmptyNote" />
              </GapNote>
            ) : null
          }
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
                <EntityConnections connections={connections} selfId={organization.id} />
              </div>
            </div>
          }
        />

        {children.length > 0 ? (
          <FactGroup id="onderdelen" icon={<LinkIcon />} title={<T area="entity" k="childrenTitle" />} count={children.length}>
            <ul className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
              {children.slice(0, CHILD_LIMIT).map((child) => (
                <ChildRow key={child.id} child={child} />
              ))}
            </ul>
            {children.length > CHILD_LIMIT ? (
              <details className="motion-disclosure mt-2">
                <summary className={SUMMARY_CLASS}>
                  <T area="common" k="seeAll" vars={{ n: children.length }} />
                </summary>
                <ul className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                  {children.slice(CHILD_LIMIT).map((child) => (
                    <ChildRow key={child.id} child={child} />
                  ))}
                </ul>
              </details>
            ) : null}
          </FactGroup>
        ) : null}

        {memberCount > 0 ? (
          <FactGroup id="leden" icon={<SeatIcon />} title={<T area="entity" k="membersTitle" />} count={memberCount}>
            {/* The count is in the heading; the line says more only when seats and members differ. */}
            {seatsCount !== null && seatsCount !== memberCount ? (
              <p className="text-sm tabular-nums text-ink-muted">
                <DateT
                  area="entity"
                  k={seatsCount === 1 ? "seatsFilledOne" : "seatsFilled"}
                  counts={{ n: memberCount, total: seatsCount }}
                />
                {memberCount > seatsCount ? (
                  <>
                    {" "}
                    <span className="text-ink-faint">
                      <T area="entity" k="moreHoldersThanSeats" />
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
            {tally !== null ? <ArchChart tally={tally} /> : null}
            {tally !== null ? <SeatTally tally={tally} /> : null}
            {tally !== null ? <ElectionHistory organizationId={organization.id} /> : null}
            <div className="mt-3">
              <SeatGrid members={members} limit={GRID_LIMIT} />
            </div>
            {memberCount > GRID_LIMIT ? (
              <details className="motion-disclosure mt-3">
                <summary className={SUMMARY_CLASS}>
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
        ) : null}

        {currentHolders.length > 0 ? (
          <FactGroup id="functionarissen" icon={<PeopleIcon />} title={<T area="entity" k="currentOfficials" />} count={currentHolders.length}>
            {seatsCount !== null && currentHolders.length > seatsCount && seatsCount > 0 && !isCommissie ? (
              <p className="mb-1 text-sm text-ink-faint">
                <T area="entity" k="moreHoldersThanSeats" />
              </p>
            ) : null}
            <ul className="divide-y divide-line/60">
              {currentHolders.slice(0, HOLDER_LIMIT).map((tenure) => (
                <HolderRow key={tenure.id} tenure={tenure} commissie={isCommissie} />
              ))}
            </ul>
            {currentHolders.length > HOLDER_LIMIT + 1 ? (
              <details className="motion-disclosure mt-2">
                <summary className={SUMMARY_CLASS}>
                  <T area="common" k="seeAll" vars={{ n: currentHolders.length }} />
                </summary>
                <ul className="divide-y divide-line/60">
                  {currentHolders.slice(HOLDER_LIMIT).map((tenure) => (
                    <HolderRow key={tenure.id} tenure={tenure} commissie={isCommissie} />
                  ))}
                </ul>
              </details>
            ) : currentHolders.length > HOLDER_LIMIT ? (
              <ul className="divide-y divide-line/60">
                <HolderRow tenure={currentHolders[HOLDER_LIMIT]} commissie={isCommissie} />
              </ul>
            ) : null}
          </FactGroup>
        ) : null}

        {/* The history repeats the current holders unless it holds someone who left. */}
        {organizationTenures.some((tenure) => tenure.end !== null) ? (
          <FactGroup icon={<HistoryIcon />} title={<T area="entity" k="historyTitle" />} count={organizationTenures.length}>
            <TenureTimeline tenures={organizationTenures} variant="organization" labelKey="historyTitle" limit={6} />
          </FactGroup>
        ) : null}
      </div>

      <SourceList sources={organization.sources} />
    </>
  );
}

const HOLDER_LIMIT = 8;

const CHILD_LIMIT = 8;

function ChildRow({ child }: { child: Organization }) {
  return (
    <li className="flex min-w-0 flex-wrap items-baseline gap-x-2 border-b border-line/60 py-2 pointer-coarse:py-0 last:border-b-0">
      <EntityPeekLink id={child.id} variant="plain" glyph className="text-sm font-medium pointer-coarse:inline-block pointer-coarse:py-3" />
      <span className="text-xs text-ink-faint">
        <SubtypeLabel value={child.subtype} />
      </span>
    </li>
  );
}

const ROLE_LABEL: Record<CommissieRole, { nl: string; en: string } | null> = {
  chair: { nl: "Voorzitter", en: "Chair" },
  vice: { nl: "Ondervoorzitter", en: "Vice-chair" },
  member: { nl: "Lid", en: "Member" },
  other: null,
};

function HolderRow({ tenure, commissie }: { tenure: Tenure; commissie: boolean }) {
  const person = getPersonById(tenure.person);
  const position = getPositionById(tenure.position);
  const source = getSourceById(tenure.source.source);
  if (!person) return null;
  // On a committee page "Lid Vaste commissie voor X" repeats the body on every row: say Voorzitter, Ondervoorzitter or Lid.
  const role = position && commissie ? ROLE_LABEL[commissieRole(position.title)] : null;
  return (
    <li>
      <PersonCard
        person={person}
        positionTitle={
          position ? (
            role !== null ? (
              <EntityPeekLink id={position.id} variant="quiet" className={role.nl === "Lid" ? undefined : "font-medium text-ink"}>
                <L nl={role.nl} en={role.en} />
              </EntityPeekLink>
            ) : (
              <>
                <EntityPeekLink id={position.id} variant="quiet">{position.title}</EntityPeekLink>
                <Gloss text={positionEn(position.title)} className="block text-xs text-ink-faint" />
              </>
            )
          ) : null
        }
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
