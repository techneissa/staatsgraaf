import Link from "next/link";
import { Callout } from "@/components/entity/callout";
import { ColorDot } from "@/components/entity/fact-tiles";
import { BriefcaseIcon, CalendarIcon, LinkIcon } from "@/components/entity/icons";
import { LocalizedDescription } from "@/components/entity/localized-description";
import { PersonBirth } from "@/components/entity/person-birth";
import { PersonPortrait, PersonPortraitCredit } from "@/components/entity/person-portrait";
import { DateT, LocalPeriod } from "@/components/content/local-date";
import { L, T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { ShareButton } from "@/components/share-button";
import { SourceIcon } from "@/components/source-icon";
import { getOrganizationById, getPositionById } from "@/lib/data";
import { branchColorVar } from "@/lib/branch-colors";
import type { PersonOffice } from "@/lib/person-offices";
import { partySlug, type PartyRecord } from "@/lib/parties";
import type { Person, Source, Tenure } from "@/lib/types";

const HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-2 pointer-coarse:after:content-['']";
const TITLE_HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-x-2 pointer-coarse:after:-inset-y-4 pointer-coarse:after:content-['']";

/**
 * Identity on the left, party and birth on the right, Wikipedia top-right.
 * Current offices sit under the description, the same place as who leads.
 */
export function PersonHeader({
  person,
  party,
  birthDate,
  birthSource,
  summary,
  description,
  dateConflicts,
  actingTenures,
  offices,
}: {
  person: Person;
  party: PartyRecord | null;
  birthDate: string | null;
  birthSource: Source | null;
  summary: { nl: string; en: string } | null;
  description: { nl: string; en: string | null } | null;
  dateConflicts: string[];
  actingTenures: Tenure[];
  offices: PersonOffice[];
}) {
  const wiki = person.wikipedia;
  const wikidata = person.wikidata !== null ? `https://www.wikidata.org/wiki/${person.wikidata}` : null;

  return (
    <header className="mt-4">
      <p className="mb-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {wiki !== null ? <Outbound href={wiki} label="Wikipedia" /> : null}
        {wikidata !== null ? <Outbound href={wikidata} label="Wikidata" /> : null}
        <ShareButton compact className="shrink-0" title={person.name} />
      </p>

      <span className="mb-2 flex shrink-0 items-center gap-0.5">
        <PersonPortrait person={person} size={64} labelled morph />
        <PersonPortraitCredit person={person} variant="info" />
      </span>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2.5">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-snug tracking-tight text-ink break-words">
            {person.name}
          </h1>
          {description === null && summary !== null ? (
            <p className="mt-1 max-w-prose text-sm leading-snug text-ink-muted">
              <L nl={summary.nl} en={summary.en} />
            </p>
          ) : null}
        </div>

        {party !== null || birthDate !== null ? (
          <ul className="flex min-w-0 shrink-0 flex-col gap-0.5 border-s border-line ps-2 text-[11px] leading-4 text-ink-muted">
            {party !== null ? (
              <li className="flex items-center gap-1.5 whitespace-nowrap">
                <ColorDot color={party.color ?? "var(--t-color-line-strong)"} />
                <span className="sr-only">
                  <T area="entity" k="factParty" />
                </span>
                <Link href={`/partijen/${partySlug(party)}/`} className="underline-offset-2 hover:underline">
                  {party.abbrev}
                </Link>
              </li>
            ) : null}
            {birthDate !== null ? (
              <li className="flex items-start gap-1">
                <CalendarIcon width={12} height={12} className="mt-0.5 shrink-0 text-ink-faint" />
                <span className="sr-only">
                  <T area="entity" k="factBorn" />
                </span>
                <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1">
                  <PersonBirth iso={birthDate} compact />
                  {birthSource !== null ? (
                    <SourceIcon href={birthSource.url} title={birthSource.title} retrieved={birthSource.retrieved} />
                  ) : null}
                </span>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {actingTenures.length > 0 ? (
        <div className="mt-3 space-y-2">
          {actingTenures.slice(0, 2).map((tenure) => {
            const position = getPositionById(tenure.position);
            if (!position) return null;
            return (
              <Callout key={tenure.id}>
                <DateT area="entity" k="actingCallout" vars={{ title: position.title }} />{" "}
                <span className="text-ink-muted">
                  (<LocalPeriod start={tenure.start} end={null} short />)
                </span>
              </Callout>
            );
          })}
        </div>
      ) : null}

      {description !== null ? (
        <LocalizedDescription
          nl={description.nl}
          en={description.en}
          className="mt-4 max-w-prose text-sm leading-relaxed text-ink-muted"
        />
      ) : null}
      {dateConflicts.length > 0 ? (
        <p className="mt-2 max-w-prose text-xs leading-relaxed text-ink-faint">
          <DateT area="entity" k="descriptionDateNote" dates={{ dates: dateConflicts[0] }} short />
        </p>
      ) : null}

      {offices.length > 0 ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-3 inline-flex items-center gap-1 text-xs text-ink-faint">
            <BriefcaseIcon width={14} height={14} />
            <T area="entity" k="rolesNowLabel" />
          </p>
          <ul className="flex flex-wrap gap-x-3 gap-y-2">
            {offices.map(({ position, start }) => {
              const body = getOrganizationById(position.organization);
              const roleColor = body ? branchColorVar(body.branch) : "var(--kind-position)";
              return (
                <li key={position.id} className="flex min-w-0 max-w-full flex-col leading-tight">
                  <EntityPeekLink
                    id={position.id}
                    variant="tinted"
                    className={`max-w-full break-words text-[13px] leading-tight ${TITLE_HIT}`}
                    style={{ color: roleColor }}
                  />
                  {start ? (
                    <span className="text-[10px] leading-tight text-ink-faint">
                      <DateT area="panels" k="since" dates={{ date: start }} short />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </header>
  );
}

function Outbound({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-[13px] text-accent-text underline-offset-2 hover:underline pointer-coarse:min-h-11 ${HIT}`}
    >
      <LinkIcon width={14} height={14} className="shrink-0" />
      <span>{label}</span>
      <span className="sr-only">
        {" "}
        <T area="common" k="opensNewTab" />
      </span>
    </a>
  );
}

