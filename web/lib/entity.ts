import {
  getDataset,
  getMembershipsForPerson,
  getOrganizationById,
  getPersonById,
  getPositionById,
  getTenuresForPerson,
  getTenuresForPosition,
} from "./data";
import type {
  EndReason,
  EntryMode,
  MediaItem,
  Membership,
  NewsItem,
  Organization,
  OrgLevel,
  Person,
  Position,
  Relation,
  RelationType,
  SourceRef,
  Tenure,
} from "./types";

export type EntityKind = "organization" | "position" | "person";

export type EntityRef = {
  id: string;
  kind: EntityKind;
  slug: string;
  name: string;
  href: string;
};

export type MemberEntry = {
  membership: Membership;
  person: Person;
};

export type ConnectionDirection = "incoming" | "outgoing";

/**
 * Connection types the graph derives from the structural records themselves:
 * a tenure means a person holds a position, a membership means a person belongs
 * to an organization. They are not in relations.json, so they carry their own
 * labels everywhere the raw relation types do.
 */
export type DerivedConnectionType = "holds_position" | "member_of";

export type ConnectionType = RelationType | DerivedConnectionType;

export type Connection = {
  id: string;
  type: ConnectionType;
  direction: ConnectionDirection;
  source: SourceRef;
  other: EntityRef;
};

export type ConnectionGroup = {
  type: ConnectionType;
  label: string;
  connections: Connection[];
};

export const ORG_LEVEL_LABELS: Record<OrgLevel, string> = {
  rijk: "Rijk",
  provinciaal: "Provinciaal",
  regionaal: "Regionaal",
  lokaal: "Lokaal",
  caribisch: "Caribisch",
  koninkrijk: "Koninkrijk",
};

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  elects: "Verkiezing",
  appoints: "Benoeming",
  oversees: "Toezicht",
  advises: "Advies",
  office: "Positie bij",
  dept_head: "Hoofdpositie",
  confirms: "Bekrachtiging",
  ex_officio: "Van rechtswege",
  administers: "Uitvoering",
  subsidises: "Subsidie",
  accountable_to: "Verantwoording",
  part_of: "Onderdeel van",
  consists_of: "Samenstelling",
  succeeded_by: "Opvolging",
  joint_arrangement_member: "Gemeenschappelijke regeling",
};

const DERIVED_TYPE_LABELS: Record<DerivedConnectionType, string> = {
  holds_position: "Positie",
  member_of: "Lidmaatschap",
};

export function entityRefById(id: string): EntityRef | null {
  if (id.startsWith("org:")) {
    const organization = getOrganizationById(id);
    return organization
      ? {
          id: organization.id,
          kind: "organization",
          slug: organization.slug,
          name: organization.name,
          href: `/organisaties/${organization.slug}/`,
        }
      : null;
  }
  if (id.startsWith("pos:")) {
    const position = getPositionById(id);
    return position
      ? {
          id: position.id,
          kind: "position",
          slug: position.slug,
          name: position.title,
          href: `/posities/${position.slug}/`,
        }
      : null;
  }
  if (id.startsWith("person:")) {
    const person = getPersonById(id);
    return person
      ? {
          id: person.id,
          kind: "person",
          slug: person.slug,
          name: person.name,
          href: `/personen/${person.slug}/`,
        }
      : null;
  }
  return null;
}

export function safeStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function getMediaItem(id: string | null | undefined): MediaItem | null {
  if (id === null || id === undefined || id === "") return null;
  return getDataset().media.find((item) => item.id === id) ?? null;
}

/**
 * Credit line for an image. The portrait pipeline writes the license into the
 * credit itself ("Foto: auteur, licentie, via Wikimedia Commons"), so the
 * license is appended only when the credit does not already name it.
 */
export function mediaCreditLine(media: Pick<MediaItem, "credit" | "license">): string {
  const credit = typeof media.credit === "string" ? media.credit.trim() : "";
  const license = typeof media.license === "string" ? media.license.trim() : "";
  if (credit === "") return license;
  if (license === "" || credit.toLowerCase().includes(license.toLowerCase())) return credit;
  return `${credit} (${license})`;
}

export function organizationPartOf(organization: Organization): string[] {
  return safeStringList(organization.partOf);
}

export function organizationAliases(organization: Organization): string[] {
  return safeStringList(organization.aliases).filter((alias) => alias !== organization.name);
}

export function organizationParentId(organization: Organization): string | null {
  return typeof organization.parent === "string" ? organization.parent : null;
}

export function organizationImages(organization: Organization): string[] {
  return safeStringList(organization.images);
}

export function positionEntryModes(position: Position): EntryMode[] {
  return safeStringList(position.entryModes) as EntryMode[];
}

export function positionExOfficioOf(position: Position): string[] {
  return safeStringList(position.exOfficioOf);
}

export function positionTermLength(position: Position): number | null {
  return typeof position.termLengthMonths === "number" ? position.termLengthMonths : null;
}

export function personBirthDate(person: Person): string | null {
  return typeof person.birthDate === "string" ? person.birthDate : null;
}

export function personParty(person: Person): string | null {
  return typeof person.party === "string" ? person.party : null;
}

export function personDescription(person: Person): string | null {
  return typeof person.description === "string" ? person.description : null;
}

export function personPortraitId(person: Person): string | null {
  return typeof person.portrait === "string" ? person.portrait : null;
}

export function tenureEndReason(tenure: Tenure): EndReason | null {
  return typeof tenure.endReason === "string" ? tenure.endReason : null;
}

export function tenureEntryMode(tenure: Tenure): EntryMode | null {
  return typeof tenure.entryMode === "string" ? tenure.entryMode : null;
}

export function tenureSeat(tenure: Tenure): number | null {
  return typeof tenure.seat === "number" ? tenure.seat : null;
}

export function sortTenuresNewestFirst(tenures: Tenure[]): Tenure[] {
  return [...tenures].sort((a, b) => {
    const aCurrent = a.end === null ? 0 : 1;
    const bCurrent = b.end === null ? 0 : 1;
    if (aCurrent !== bCurrent) return aCurrent - bCurrent;
    return b.start.localeCompare(a.start);
  });
}

export function getTenuresForOrganization(organizationId: string): Tenure[] {
  const { positions } = getDataset();
  const tenures: Tenure[] = [];
  for (const position of positions) {
    if (position.organization !== organizationId) continue;
    tenures.push(...getTenuresForPosition(position.id));
  }
  return sortTenuresNewestFirst(tenures);
}

export function getCurrentHoldersForPosition(positionId: string): Tenure[] {
  return getTenuresForPosition(positionId).filter((tenure) => tenure.end === null);
}

export function getMembersForOrganization(
  organizationId: string,
  currentOnly = true,
): MemberEntry[] {
  const entries: MemberEntry[] = [];
  for (const membership of getDataset().memberships) {
    if (membership.organization !== organizationId) continue;
    if (currentOnly && membership.end !== null) continue;
    const person = getPersonById(membership.person);
    if (person) entries.push({ membership, person });
  }
  return entries.sort((a, b) => {
    const seatA = a.membership.seatNumber ?? Number.MAX_SAFE_INTEGER;
    const seatB = b.membership.seatNumber ?? Number.MAX_SAFE_INTEGER;
    if (seatA !== seatB) return seatA - seatB;
    return a.person.name.localeCompare(b.person.name, "nl");
  });
}

export function getConnectionsForEntity(id: string): Connection[] {
  const connections: Connection[] = [];
  const seen = new Set<string>();
  const push = (connection: Connection) => {
    if (seen.has(connection.id)) return;
    seen.add(connection.id);
    connections.push(connection);
  };

  for (const relation of getDataset().relations) {
    if (relation.from === id) {
      const other = entityRefById(relation.to);
      if (other) {
        push({
          id: relation.id,
          type: relation.type,
          direction: "outgoing",
          source: relation.source,
          other,
        });
      }
    } else if (relation.to === id) {
      const other = entityRefById(relation.from);
      if (other) {
        push({
          id: relation.id,
          type: relation.type,
          direction: "incoming",
          source: relation.source,
          other,
        });
      }
    }
  }

  // Derived connections: the graph records hold every link an entity needs,
  // they are just not written into relations.json. A tenure is a person in a
  // position; a membership is a person in an organization.
  if (id.startsWith("person:")) {
    if (getPersonById(id)) {
      for (const tenure of getTenuresForPerson(id)) {
        const other = entityRefById(tenure.position);
        if (other) {
          push({
            id: `derived:${tenure.id}`,
            type: "holds_position",
            direction: "outgoing",
            source: tenure.source,
            other,
          });
        }
      }
      for (const membership of getMembershipsForPerson(id)) {
        const other = entityRefById(membership.organization);
        if (other) {
          push({
            id: `derived:${membership.id}`,
            type: "member_of",
            direction: "outgoing",
            source: membership.source,
            other,
          });
        }
      }
    }
  } else if (id.startsWith("pos:")) {
    for (const tenure of getTenuresForPosition(id)) {
      const other = entityRefById(tenure.person);
      if (other) {
        push({
          id: `derived:${tenure.id}`,
          type: "holds_position",
          direction: "incoming",
          source: tenure.source,
          other,
        });
      }
    }
  } else if (id.startsWith("org:")) {
    for (const tenure of getTenuresForOrganization(id)) {
      const other = entityRefById(tenure.person);
      if (other) {
        push({
          id: `derived:${tenure.id}`,
          type: "holds_position",
          direction: "incoming",
          source: tenure.source,
          other,
        });
      }
    }
    for (const entry of getMembersForOrganization(id, false)) {
      const other = entityRefById(entry.membership.person);
      if (other) {
        push({
          id: `derived:${entry.membership.id}`,
          type: "member_of",
          direction: "incoming",
          source: entry.membership.source,
          other,
        });
      }
    }
  }

  return connections;
}

export function groupConnections(connections: Connection[]): ConnectionGroup[] {
  const groups = new Map<ConnectionType, Connection[]>();
  for (const connection of connections) {
    const list = groups.get(connection.type);
    if (list) list.push(connection);
    else groups.set(connection.type, [connection]);
  }
  return [...groups.entries()]
    .map(([type, list]) => ({
      type,
      label: type in RELATION_TYPE_LABELS
        ? RELATION_TYPE_LABELS[type as RelationType]
        : DERIVED_TYPE_LABELS[type as DerivedConnectionType],
      connections: [...list].sort((a, b) => a.other.name.localeCompare(b.other.name, "nl")),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "nl"));
}

/**
 * Look up one raw relation by id. Connection.id carries the relation id, so
 * components can read metadata such as seatsAppointed without a second pass.
 * Additive helper; existing exports are untouched.
 */
export function getRelationById(id: string): Relation | null {
  const relation = getDataset().relations.find((item) => item.id === id);
  return relation ?? null;
}

export function getNewsForEntity(id: string, limit = 10): NewsItem[] {
  return getDataset()
    .news.filter((item) => Array.isArray(item.entities) && item.entities.includes(id))
    .sort((a, b) => b.published.localeCompare(a.published))
    .slice(0, limit);
}

export function formatTermLength(months: number): string {
  if (months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "1 jaar" : `${years} jaar`;
  }
  return months === 1 ? "1 maand" : `${months} maanden`;
}
