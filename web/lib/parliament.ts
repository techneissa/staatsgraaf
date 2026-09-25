import { getDataset } from "./data";
import { isSplinterGroup, partyByDataset, partyKeyForDataset, type PartyRecord } from "./parties";
import type { Membership } from "./types";
import { seatOrder } from "./seats";

/**
 * Seat arithmetic for elected bodies. The dataset holds one membership per
 * seat, each with the faction (`fractie`) the seat belongs to, sourced from
 * the parliament's own OData API. The tally groups current memberships by
 * faction and resolves each faction through the party registry
 * (web/lib/parties.ts), so colours and links come from one sourced table.
 * A faction the registry does not know keeps its raw dataset name, neutral
 * grey, and no invented data.
 */

export type SeatTallyEntry = {
  /** Registry key, or null for a faction outside the registry. */
  key: string | null;
  /** Display label: registry abbreviation, or the raw faction name. */
  label: string;
  /** Registry colour, or null for neutral rendering. */
  color: string | null;
  /** The full registry record, when the faction is a registered party. */
  party: PartyRecord | null;
  /** A one-member splinter faction, rendered neutrally. */
  splinter: boolean;
  seats: number;
};

export type SeatTally = {
  organizationId: string;
  /** Current memberships counted; equals the chamber's seat count when complete. */
  total: number;
  /** Seats needed for a majority: half the total plus one. */
  majority: number;
  entries: SeatTallyEntry[];
};

const NONE_LABEL = "__none__";

export function seatTallyForOrganization(organizationId: string): SeatTally | null {
  const current = getDataset().memberships.filter(
    (membership) => membership.organization === organizationId && membership.end === null,
  );
  if (current.length === 0) return null;

  const grouped = new Map<string, SeatTallyEntry>();
  for (const membership of current) {
    const fractie = typeof membership.fractie === "string" ? membership.fractie : null;
    const groupKey = fractie ?? NONE_LABEL;
    const existing = grouped.get(groupKey);
    if (existing) {
      existing.seats += 1;
      continue;
    }
    const party = fractie !== null ? partyByDataset(fractie) : null;
    grouped.set(groupKey, {
      key: party?.key ?? null,
      label: party?.abbrev ?? fractie ?? "",
      color: party?.color ?? null,
      party,
      splinter: isSplinterGroup(fractie),
      seats: 1,
    });
  }

  const entries = [...grouped.values()].sort((a, b) => {
    if (b.seats !== a.seats) return b.seats - a.seats;
    return a.label.localeCompare(b.label, "nl");
  });

  return {
    organizationId,
    total: current.length,
    majority: Math.floor(current.length / 2) + 1,
    entries,
  };
}

/** Current memberships whose faction resolves to the given registry key, oldest dataset order. */
export function currentMembershipsForPartyKey(
  key: string,
  organizationIds: string[],
): { organizationId: string; membership: Membership }[] {
  return getDataset()
    .memberships.filter(
      (membership) =>
        membership.end === null &&
        organizationIds.includes(membership.organization) &&
        partyKeyForDataset(membership.fractie) === key,
    )
    .map((membership) => ({ organizationId: membership.organization, membership }))
    .sort((a, b) => a.organizationId.localeCompare(b.organizationId));
}

/** Current seat count per registry key in one elected body, for overview pages. */
export function seatCountsByPartyKey(organizationId: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const membership of getDataset().memberships) {
    if (membership.organization !== organizationId || membership.end !== null) continue;
    const key = partyKeyForDataset(membership.fractie);
    if (key === null) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * A party's current members per chamber, in seat order (lib/seats.ts: by
 * surname, because no chamber publishes a seat per member). For server pages;
 * the client reads the same order from `graph.json` through `partyMembers`.
 */
export function partyMembersByChamber(
  key: string,
  organizationIds: string[] = ["org:tweede-kamer", "org:eerste-kamer"],
): { organizationId: string; members: { id: string; name: string; slug: string | null; membership: Membership }[] }[] {
  const people = new Map(getDataset().people.map((person) => [person.id, person]));
  return organizationIds
    .map((organizationId) => {
      const members = currentMembershipsForPartyKey(key, [organizationId]).map(({ membership }) => {
        const person = people.get(membership.person);
        return { id: membership.person, name: person?.name ?? membership.person, slug: person?.slug ?? null, membership };
      });
      return { organizationId, members: seatOrder(members) };
    })
    .filter((entry) => entry.members.length > 0);
}
