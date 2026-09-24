import type { ReactNode } from "react";
import { PersonPortrait, PersonPortraitCredit } from "./entity/person-portrait";
import { KindBadge } from "./kind-badge";
import { PartyBadge } from "./party-badge";
import { LocalPeriod } from "@/components/content/local-date";
import { T } from "@/components/i18n/t";
import { PeekLink } from "@/components/peek/peek-link";
import type { Person } from "@/lib/types";

type PersonCardProps = {
  person: Person;
  /** The role line under the name: plain text or a peek link to a position or organisation. */
  positionTitle?: ReactNode;
  startedAt?: string | null;
  acting?: boolean;
  /** A quiet source link for the tenure, shown on the meta line. */
  source?: ReactNode;
};

/**
 * One current official: portrait (or initials), the name as a peek link, the
 * role, party, start date and the source. A calm row, not a boxed card; the
 * list that holds it draws the dividers.
 */
export function PersonCard({ person, positionTitle, startedAt, acting, source }: PersonCardProps) {
  return (
    <article className="flex items-start gap-3 py-2.5">
      <PersonPortrait person={person} size={44} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-snug">
          <PeekLink id={person.id} href={`/personen/${person.slug}/`} kind="person" variant="plain">
            {person.name}
          </PeekLink>
        </h3>
        {positionTitle ? <p className="mt-0.5 text-sm text-ink-muted">{positionTitle}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {person.party != null ? <PartyBadge party={person.party} /> : null}
          {acting ? (
            <KindBadge tone="accent">
              <T area="entity" k="actingBadge" />
            </KindBadge>
          ) : null}
          {startedAt ? (
            <span className="text-xs text-ink-faint">
              <LocalPeriod start={startedAt} end={null} short />
            </span>
          ) : null}
          {source ? <span className="text-xs">{source}</span> : null}
        </div>
        <PersonPortraitCredit person={person} className="mt-1 block text-[10px] leading-tight text-ink-faint" />
      </div>
    </article>
  );
}
