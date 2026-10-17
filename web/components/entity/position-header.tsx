import type { ReactNode } from "react";
import { DateT } from "@/components/content/local-date";
import { BuildingIcon, ClockIcon, KeyIcon, PeopleIcon, ScaleIcon, SeatIcon } from "@/components/entity/icons";
import { LocalizedRich } from "@/components/entity/localized-description";
import { renderOfficeCopyMarkup } from "@/components/entity/office-copy";
import { PersonPortrait, PersonPortraitCredit } from "@/components/entity/person-portrait";
import { SUMMARY_CLASS } from "@/components/entity/entity-connections";
import { OrgNameTip } from "@/components/entity/org-header-tips";
import { L, LocalText, T } from "@/components/i18n/t";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { ShareButton } from "@/components/share-button";
import { getPersonById } from "@/lib/data";
import { POSITION_TYPE_LABELS } from "@/lib/labels";
import { positionEn } from "@/lib/name-gloss";
import { positionOfficeCopy } from "@/lib/position-office-copy";
import type { Organization, Position, Tenure } from "@/lib/types";

const HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-2 pointer-coarse:after:content-['']";

const HOLDER_PREVIEW = 12;

function TermLength({ months }: { months: number }) {
  if (months % 12 === 0) {
    const years = months / 12;
    return <DateT area="entity" k={years === 1 ? "termYearOne" : "termYears"} counts={{ n: years }} />;
  }
  return <DateT area="entity" k={months === 1 ? "termMonthOne" : "termMonths"} counts={{ n: months }} />;
}

/**
 * Identity on the left, type and term on the right, the body and legal basis
 * as a meta row. Current holders are a row of faces, the same layout as who
 * leads on an organisation page.
 */
export function PositionHeader({
  position,
  organization,
  summary,
  legalBasis,
  holders,
  seatsCount,
  holdersFallback,
}: {
  position: Position;
  organization: Organization | undefined;
  summary: { nl: string; en: string } | null;
  legalBasis: { label: string; url: string } | null;
  holders: Tenure[];
  seatsCount: number | null;
  holdersFallback: ReactNode;
}) {
  const fillMethod = position.fillMethod ?? null;
  const termLength = position.termLengthMonths ?? null;
  const english = positionEn(position.title);
  const body = organization;
  const officeCopy = positionOfficeCopy({
    id: position.id,
    title: position.title,
    organization: position.organization,
    parent: organization?.parent ?? null,
    country: organization?.country,
    subtype: organization?.subtype ?? null,
  });

  return (
    <header className="mt-4">
      <p className="mb-1 flex justify-end">
        <ShareButton compact className="shrink-0" title={position.title} />
      </p>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2.5">
        <div className="min-w-0">
          <div>
            <h1 className="inline text-lg font-semibold leading-snug tracking-tight text-ink break-words">
              <LocalText nl={position.title} en={english} />
            </h1>
            <OrgNameTip
              name={position.title}
              englishName={english}
              aliases={position.aliases.filter((alias) => alias !== position.title)}
            />
          </div>
          {holders.length === 0 && summary !== null ? (
            <p className="mt-1 max-w-prose text-sm leading-snug text-ink-muted">
              <L nl={summary.nl} en={summary.en} />
            </p>
          ) : null}
        </div>

        <ul className="flex min-w-0 shrink-0 flex-col gap-0.5 border-s border-line ps-2 text-[11px] leading-4 text-ink-muted">
          <li className="whitespace-nowrap">
            <span className="sr-only">
              <T area="entity" k="factType" />
            </span>
            <L {...POSITION_TYPE_LABELS[position.type]} />
          </li>
          {fillMethod !== null ? (
            <li className="flex items-center gap-1 whitespace-nowrap">
              <KeyIcon width={12} height={12} className="shrink-0 text-ink-faint" />
              <span className="sr-only">
                <T area="entity" k="factFillMethod" />
              </span>
              <LocaleLabel kind="fillMethod" value={fillMethod} />
            </li>
          ) : null}
          {termLength !== null ? (
            <li className="flex items-center gap-1 whitespace-nowrap">
              <ClockIcon width={12} height={12} className="shrink-0 text-ink-faint" />
              <span className="sr-only">
                <T area="entity" k="factTermLength" />
              </span>
              <TermLength months={termLength} />
            </li>
          ) : null}
          {seatsCount !== null && seatsCount > 1 ? (
            <li className="flex items-center gap-1 whitespace-nowrap">
              <SeatIcon width={12} height={12} className="shrink-0 text-ink-faint" />
              <span className="sr-only">
                <T area="entity" k="factSeats" />
              </span>
              <DateT area="entity" k="countOnly" counts={{ n: seatsCount }} />
            </li>
          ) : null}
        </ul>
      </div>

      {body !== undefined || legalBasis !== null ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {body !== undefined ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-[13px] text-ink-muted">
              <BuildingIcon width={14} height={14} className="shrink-0" />
              <span className="sr-only">
                <T area="entity" k="factOrganization" />
              </span>
              <EntityPeekLink id={body.id} variant="plain" className={`min-w-0 ${HIT}`} />
            </span>
          ) : null}
          {legalBasis !== null ? (
            <a
              href={legalBasis.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`ms-auto inline-flex min-w-0 max-w-full items-center gap-1 text-[13px] text-accent-text underline-offset-2 hover:underline pointer-coarse:min-h-11 ${HIT}`}
            >
              <ScaleIcon width={14} height={14} className="shrink-0" />
              <span className="min-w-0 break-words">{legalBasis.label}</span>
              <span className="sr-only">
                {" "}
                <T area="common" k="opensNewTab" />
              </span>
            </a>
          ) : null}
        </div>
      ) : null}

      {officeCopy !== null ? (
        <LocalizedRich
          nl={renderOfficeCopyMarkup(officeCopy.nl)}
          en={renderOfficeCopyMarkup(officeCopy.en)}
          className="mt-4 text-sm text-ink-muted"
        />
      ) : null}

      <div id="functionarissen" className="mt-4 border-t border-line pt-3">
        <p className="mb-3 inline-flex items-center gap-1 text-xs text-ink-faint">
          <PeopleIcon width={14} height={14} />
          <T area="entity" k="currentOfficials" />
          {holders.length > 0 ? (
            <span className="tabular-nums text-ink-faint">{holders.length}</span>
          ) : null}
        </p>
        {holders.length > 0 ? (
          <>
            {seatsCount !== null && seatsCount > 1 ? (
              <p className="mb-2 text-sm tabular-nums text-ink-muted">
                <DateT area="entity" k="seatsFilled" counts={{ n: holders.length, total: seatsCount }} />
              </p>
            ) : null}
            <HolderFaces holders={holders.slice(0, HOLDER_PREVIEW)} />
            {holders.length > HOLDER_PREVIEW ? (
              <details className="motion-disclosure mt-2">
                <summary className={SUMMARY_CLASS}>
                  <T area="common" k="seeAll" vars={{ n: holders.length }} />
                </summary>
                <HolderFaces holders={holders.slice(HOLDER_PREVIEW)} />
              </details>
            ) : null}
            {holdersFallback}
          </>
        ) : (
          holdersFallback
        )}
      </div>
    </header>
  );
}

function HolderFaces({ holders }: { holders: Tenure[] }) {
  return (
    <ul className="flex flex-wrap gap-x-2 gap-y-3">
      {holders.map((tenure) => {
        const person = getPersonById(tenure.person);
        if (person === undefined) return null;
        return (
          <li key={tenure.id} className="flex w-[calc(50%-0.25rem)] min-w-0 flex-col items-center sm:w-28">
            <EntityPeekLink
              id={person.id}
              variant="bare"
              className="flex w-full flex-col items-center gap-1 text-center"
            >
              <PersonPortrait person={person} size={48} />
              <span className="text-xs font-medium leading-tight">{person.name}</span>
            </EntityPeekLink>
            <PersonPortraitCredit person={person} />
            {tenure.start || tenure.acting ? (
              <span className="text-[10px] leading-tight text-ink-faint">
                {tenure.start ? <DateT area="panels" k="since" dates={{ date: tenure.start }} short /> : null}
                {tenure.start && tenure.acting ? " · " : null}
                {tenure.acting ? <T area="entity" k="actingBadge" /> : null}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
