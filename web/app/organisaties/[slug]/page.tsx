import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { EntityTabs } from "@/components/entity-tabs";
import { JsonLd } from "@/components/json-ld";
import { NewsPanel } from "@/components/news/news-panel";
import { EntityConnections } from "@/components/entity/entity-connections";
import { DateT } from "@/components/content/local-date";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { SUMMARY_CLASS } from "@/components/entity/entity-connections";
import { SourceList } from "@/components/source-list";
import { T } from "@/components/i18n/t";
import { orgEnGloss } from "@/lib/name-gloss";
import { GapNote } from "@/components/entity/gap-note";
import { SubtypeLabel } from "@/components/entity/subtype-label";
import { FactGroup } from "@/components/entity/fact-group";
import { OrgHeader } from "@/components/entity/org-header";
import {
  HistoryIcon,
  LinkIcon,
  SeatIcon,
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
} from "@/lib/data";
import {
  getConnectionsForEntity,
  getMembersForOrganization,
  getTenuresForOrganization,
  organizationAliases,
  organizationEmblem,
  organizationParentId,
  organizationPartOf,
} from "@/lib/entity";
import { seatTallyForOrganization } from "@/lib/parliament";
import { withoutDerived } from "@/lib/entity-rows";
import { descriptionFor } from "@/lib/description-translations";
import { childOrganizations, organizationSummary } from "@/lib/entity-summary";
import { organizationDescription } from "@/lib/entity-page";
import { ORG_BRANCH_LABELS, ORG_BRANCH_LABELS_EN, ORG_LEVEL_LABELS, ORG_LEVEL_LABELS_EN, ORG_SUBTYPE_LABELS } from "@/lib/labels";
import { getNewsForEntity } from "@/lib/news";
import { LocaleLabel } from "@/components/i18n/locale-label";
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

  const currentHolders = getCurrentTenuresForOrganization(organization.id);
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
  const emblem = organizationEmblem(organization);
  const seatsCount = organization.seatsCount ?? null;
  const plain = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const aliases = organizationAliases(organization).filter((alias) => plain(alias) !== plain(organization.name));
  const memberCount = members.length;
  const mergedLevel = levelRepeatsBranch(organization);

  const pageUrl = absoluteUrl(`/organisaties/${organization.slug}/`);
  const parentId = organizationParentId(organization);
  const parentOrganization = parentId !== null ? getOrganizationById(parentId) : undefined;
  // A council or board meets at the office of the body it governs and has no address of its own.
  const address =
    organization.address != null
      ? { value: organization.address, of: organization.name }
      : (organization.type === "elected" || organization.type === "commission") && parentOrganization?.address != null
        ? { value: parentOrganization.address, of: parentOrganization.name }
        : null;
  const children = childOrganizations(organization.id)
    .filter((child) => child.id !== organization.id)
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const hasNews = news.length > 0;
  const hasConnections = connections.length > 0;

  const summaryNamesSeats = summary !== null && seatsCount !== null && seatsCount > 0;

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
        ]}
      />

      <OrgHeader
        name={organization.name}
        englishName={orgEnGloss(organization.name)}
        aliases={aliases}
        emblem={emblem}
        summary={summary}
        branch={organization.branch}
        mergedLevel={mergedLevel}
        level={organization.level}
        established={organization.established ?? null}
        seats={seatsCount !== null && !summaryNamesSeats ? seatsCount : null}
        employees={employeeValue(organization)}
        childOrgs={children}
        legalSource={legalSource}
        website={website}
        address={address}
        dissolved={organization.dissolved ?? null}
        description={description}
        parents={partOfOrganizations}
        holders={currentHolders}
      />

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

