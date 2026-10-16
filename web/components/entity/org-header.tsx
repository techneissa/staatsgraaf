import type { ReactNode } from "react";
import { DateT, LocalDate } from "@/components/content/local-date";
import { Callout } from "@/components/entity/callout";
import { ColorDot } from "@/components/entity/fact-tiles";
import { CalendarIcon, GlobeIcon, MapPinIcon, PeopleIcon, ScaleIcon, SeatIcon } from "@/components/entity/icons";
import { LocalizedDescription } from "@/components/entity/localized-description";
import { MapLink } from "@/components/entity/map-link";
import { OrgEmblemCredit, OrgEmblemTitle } from "@/components/entity/org-emblem";
import { OrgChildrenTip, OrgNameTip } from "@/components/entity/org-header-tips";
import { OrgStructure } from "@/components/entity/org-structure";
import { SubtypeLabel } from "@/components/entity/subtype-label";
import { L, LocalText, T } from "@/components/i18n/t";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { branchColorVar } from "@/lib/branch-colors";
import type { OrganizationEmblem } from "@/lib/entity";
import { organizationAliases } from "@/lib/entity";
import type { Address, OrgBranch, OrgLevel, Organization, Tenure } from "@/lib/types";

const CHILD_PREVIEW = 8;
const HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-2 pointer-coarse:after:content-['']";

function websiteHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function shortAlias(organization: Organization): string | null {
  return organizationAliases(organization)[0] ?? null;
}

/**
 * Identity on the left, classification on the right, website top-right. Share
 * is not on this page. Missing facts drop out; no empty boxes.
 */
export function OrgHeader({
  name,
  englishName,
  aliases,
  emblem,
  summary,
  branch,
  mergedLevel,
  level,
  established,
  seats,
  employees,
  childOrgs,
  legalSource,
  website,
  address,
  dissolved,
  description,
  parents,
  holders,
}: {
  name: string;
  englishName: string | null;
  aliases: string[];
  emblem: OrganizationEmblem | null;
  summary: { nl: string; en: string } | null;
  branch: OrgBranch;
  mergedLevel: boolean;
  level: OrgLevel;
  established: string | null;
  seats: number | null;
  employees: ReactNode;
  childOrgs: Organization[];
  legalSource: { label: string; url: string } | null;
  website: string | null;
  address: { value: Address; of: string } | null;
  dissolved: string | null;
  description: { nl: string; en: string | null } | null;
  parents: Organization[];
  holders: Tenure[];
}) {
  const host = website !== null ? websiteHost(website) : null;
  const preview = childOrgs.slice(0, CHILD_PREVIEW);

  return (
    <header className="mt-4">
      {host !== null && website !== null ? (
        <p className="mb-1 flex justify-end">
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink pointer-coarse:min-h-11 ${HIT}`}
          >
            <GlobeIcon width={14} height={14} className="shrink-0" />
            <span>{host}</span>
            <span className="sr-only">
              {" "}
              <T area="common" k="opensNewTab" />
            </span>
          </a>
        </p>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          {emblem?.image ? <OrgEmblemTitle image={emblem.image} info={emblem.info} /> : null}
          <div className="min-w-0">
            <div>
              <h1 className="inline text-lg font-semibold leading-snug tracking-tight text-ink">
                <LocalText nl={name} en={englishName} />
              </h1>
              <OrgNameTip name={name} englishName={englishName} aliases={aliases} />
            </div>
            {emblem !== null && emblem.image === null ? (
              <OrgEmblemCredit info={emblem.info} emblem={null} kind={emblem.kind} className="mt-1" />
            ) : null}
            {summary !== null ? (
              <p className="mt-1 max-w-prose text-sm leading-snug text-ink-muted">
                <L nl={summary.nl} en={summary.en} />
              </p>
            ) : null}
          </div>
        </div>

        <ul className="flex min-w-0 shrink-0 flex-col gap-0.5 border-s border-line ps-2 text-[11px] leading-4 text-ink-muted">
          <li className="flex items-center gap-1.5 whitespace-nowrap">
            <ColorDot color={branchColorVar(branch)} />
            <span className="sr-only">
              <T area="entity" k={mergedLevel ? "factBranchLevel" : "factBranch"} />
            </span>
            <LocaleLabel kind="branch" value={branch} />
          </li>
          {mergedLevel ? null : (
            <li className="whitespace-nowrap">
              <span className="sr-only">
                <T area="entity" k="factLevel" />
              </span>
              <LocaleLabel kind="level" value={level} />
            </li>
          )}
          {established !== null ? (
            <li className="flex items-center gap-1 whitespace-nowrap">
              <CalendarIcon width={12} height={12} className="shrink-0 text-ink-faint" />
              <span className="sr-only">
                <T area="entity" k="factEstablished" />
              </span>
              <LocalDate iso={established} />
            </li>
          ) : null}
          {seats !== null ? (
            <li className="flex items-center gap-1 whitespace-nowrap">
              <SeatIcon width={12} height={12} className="shrink-0 text-ink-faint" />
              <span className="sr-only">
                <T area="entity" k="factSeats" />
              </span>
              <DateT area="entity" k="countOnly" counts={{ n: seats }} />
            </li>
          ) : null}
          {employees !== null ? (
            <li className="flex items-center gap-1 whitespace-nowrap">
              <PeopleIcon width={12} height={12} className="shrink-0 text-ink-faint" />
              <span className="sr-only">
                <T area="entity" k="factEmployees" />
              </span>
              {employees}
            </li>
          ) : null}
        </ul>
      </div>

      {childOrgs.length > 0 || legalSource !== null ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {childOrgs.length > 0 ? (
            <OrgChildrenTip count={childOrgs.length}>
              <ul>
                {preview.map((child) => {
                  const alias = shortAlias(child);
                  return (
                    <li key={child.id} className="border-b border-line/60 py-1.5 last:border-b-0">
                      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                        <EntityPeekLink id={child.id} variant="plain" className="min-w-0 font-medium text-ink" />
                        {alias !== null ? <span className="shrink-0 text-[11px] text-ink-faint">{alias}</span> : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-ink-faint">
                        <SubtypeLabel value={child.subtype} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </OrgChildrenTip>
          ) : null}
          {legalSource !== null ? (
            <a
              href={legalSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`ms-auto inline-flex min-w-0 max-w-full items-center gap-1 text-[13px] text-ink-muted hover:text-ink pointer-coarse:min-h-11 ${HIT}`}
            >
              <ScaleIcon width={14} height={14} className="shrink-0" />
              <span className="min-w-0 break-words">{legalSource.label}</span>
              <span className="sr-only">
                {" "}
                <T area="common" k="opensNewTab" />
              </span>
            </a>
          ) : null}
        </div>
      ) : null}

      {dissolved !== null ? (
        <div className="mt-3">
          <Callout>
            <DateT area="entity" k="dissolvedCallout" dates={{ date: dissolved }} />
          </Callout>
        </div>
      ) : null}

      {description !== null ? (
        <LocalizedDescription
          nl={description.nl}
          en={description.en}
          credit={false}
          className="mt-4 max-w-prose text-sm leading-relaxed text-ink-muted"
        />
      ) : null}

      {address !== null ? (
        <p className="mt-2 flex justify-end">
          <span className="inline-flex min-w-0 max-w-full items-start gap-1 text-[13px] text-ink-muted">
            <MapPinIcon width={14} height={14} className="mt-0.5 shrink-0" />
            <MapLink address={address.value} name={address.of} />
          </span>
        </p>
      ) : null}

      <OrgStructure parents={parents} holders={holders} className="mt-4 border-t border-line pt-3" />
    </header>
  );
}
