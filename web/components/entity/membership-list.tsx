import { PartyPill } from "@/components/party-pill";
import { KindBadge } from "@/components/kind-badge";
import { SourceIcon } from "@/components/source-icon";
import { LocalPeriod } from "@/components/content/local-date";
import { L, T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { getSourceById } from "@/lib/data";
import { SourceSlot } from "./source-slot";
import type { Membership } from "@/lib/types";

/**
 * A person's memberships (Kamer, raad, Staten) as calm rows: the body as a
 * peek link, fractie and seat, the period in the site language, and the source.
 */
export function MembershipList({ memberships }: { memberships: Membership[] }) {
  if (memberships.length === 0) return null;
  const sorted = [...memberships].sort((a, b) => b.start.localeCompare(a.start));
  return (
    <ol className="divide-y divide-line/60">
      {sorted.map((membership) => {
        const source = getSourceById(membership.source.source);
        const current = membership.end === null;
        return (
          <li key={membership.id} className="py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-sm font-medium">
                <EntityPeekLink
                  id={membership.organization}
                  variant="plain"
                  glyph
                  fallback={<T area="entity" k="unknownOrganization" />}
                />
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
                {current ? (
                  <KindBadge tone="accent">
                    <L nl="Huidig" en="Current" />
                  </KindBadge>
                ) : null}
                <LocalPeriod start={membership.start} end={membership.end} short />
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
              {membership.fractie !== null ? <PartyPill party={membership.fractie} /> : null}
              {membership.seatNumber !== null ? (
                <span>
                  <T area="entity" k="seatNumber" vars={{ n: membership.seatNumber }} />
                </span>
              ) : null}
              {source ? (
                <SourceSlot>
                  <SourceIcon href={source.url} title={source.title} retrieved={membership.source.retrieved} />
                </SourceSlot>
              ) : null}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
