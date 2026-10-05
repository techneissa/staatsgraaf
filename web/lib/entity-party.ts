import { getDataset, getPositionById } from "./data";
import { compareBySurname, partyRoleGroup, type PartyRoleGroup } from "./entity-page";
import { partyKeyForDataset } from "./parties";
import type { Person } from "./types";

export type PartyPersonRole = { positionId: string; title: string };
export type PartyPerson = { person: Person; roles: PartyPersonRole[] };
export type PartyPeopleGroup = { group: PartyRoleGroup; people: PartyPerson[] };

/** Most senior first: a person who is both bewindspersoon and fractievoorzitter is listed once, as bewindspersoon. */
export const PARTY_GROUP_ORDER: PartyRoleGroup[] = ["bewindspersonen", "fractievoorzitters", "burgemeesters", "bestuurders", "anderen"];

/**
 * The people the dataset links to a party (`people.party`), grouped by their
 * most senior current position. `anderen` holds people whose current positions
 * are committee seats or who have none; `skipOthers` leaves out those already
 * listed as chamber members on the page.
 */
export function partyPeople(key: string, skipOthers: Set<string> = new Set()): PartyPeopleGroup[] {
  const { people, tenures } = getDataset();
  const current = new Map<string, PartyPersonRole[]>();
  for (const tenure of tenures) {
    if (tenure.end !== null) continue;
    const position = getPositionById(tenure.position);
    if (position === undefined) continue;
    const list = current.get(tenure.person);
    const role = { positionId: position.id, title: position.title };
    if (list) list.push(role);
    else current.set(tenure.person, [role]);
  }

  const groups = new Map<PartyRoleGroup, PartyPerson[]>();
  for (const person of people) {
    if (partyKeyForDataset(person.party) !== key) continue;
    const roles = current.get(person.id) ?? [];
    let best: PartyRoleGroup = "anderen";
    let bestRoles: PartyPersonRole[] = [];
    for (const group of PARTY_GROUP_ORDER) {
      const matching = roles.filter((role) => partyRoleGroup(role.title) === group);
      if (matching.length > 0) {
        best = group;
        bestRoles = matching;
        break;
      }
    }
    if (best === "anderen" && skipOthers.has(person.id)) continue;
    const list = groups.get(best);
    const entry = { person, roles: bestRoles };
    if (list) list.push(entry);
    else groups.set(best, [entry]);
  }
  return PARTY_GROUP_ORDER.filter((group) => groups.has(group)).map((group) => ({
    group,
    people: (groups.get(group) ?? []).sort((a, b) => compareBySurname(a.person.name, b.person.name)),
  }));
}
