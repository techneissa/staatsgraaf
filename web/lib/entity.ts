import {
  getDataset,
  getMembershipsForPerson,
  getOrganizationById,
  getPersonById,
  getPositionById,
  getTenuresForPerson,
  getSourceById,
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
  Source,
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
 * The change statement every served portrait carries (ADR 0025). The stored
 * originals are scaled down to about 320 px (pipelines/portraits.mjs), the
 * 160 px WebP copies are scaled down again (scripts/build-thumbs.mjs), and the
 * tiles and the person page show them cut to a frame (CSS object-fit: cover).
 */
export const MEDIA_CHANGES_NL = "verkleind en bijgesneden";

/** Licences that put no condition on reuse, so no statement of changes is owed. */
const NO_CHANGE_NOTE = new Set(["CC0-1.0", "publiek-domein"]);

/** True when the licence asks that changes are indicated (CC BY, CC BY-SA, Attribution, European Parliament, free use). */
export function mediaNeedsChangeNote(license: string | null | undefined): boolean {
  const value = typeof license === "string" ? license.trim() : "";
  return value !== "" && !NO_CHANGE_NOTE.has(value);
}

/**
 * True when the served copy is resized and cropped and the licence asks to say
 * so. Logos never are: a public-domain emblem is served as a smaller WebP, which
 * needs no statement, and any other emblem is served as the unchanged original
 * (ADR 0029).
 */
function mediaIsChanged(media: { license?: string | null; type?: MediaItem["type"] }): boolean {
  return media.type !== "logo" && mediaNeedsChangeNote(media.license);
}

/** True for CC BY-SA files: the resized and cropped copy is shared under the same licence. */
export function mediaIsShareAlike(license: string | null | undefined): boolean {
  return typeof license === "string" && /^CC-BY-SA-\d\.\d$/.test(license.trim());
}

/** True when the credit already names the licence, by its recorded value (`CC-BY-4.0`) or its usual spelling (`CC0 1.0`). */
function creditNamesLicense(credit: string, license: string): boolean {
  const text = credit.toLowerCase();
  return text.includes(license.toLowerCase()) || text.includes(licenseInfo(license).label.toLowerCase());
}

/**
 * Credit line for an image. The portrait pipeline writes the license into the
 * credit itself ("Foto: auteur, licentie, via Wikimedia Commons"), so the
 * license is appended only when the credit does not already name it. Where the
 * licence asks for it, the line ends with the statement of changes
 * ("verkleind en bijgesneden"); media.json itself stays as recorded.
 */
export function mediaCreditLine(media: Pick<MediaItem, "credit" | "license"> & { type?: MediaItem["type"] }): string {
  const credit = typeof media.credit === "string" ? media.credit.trim() : "";
  const license = typeof media.license === "string" ? media.license.trim() : "";
  let line = credit;
  if (credit === "") line = license;
  else if (license !== "" && !creditNamesLicense(credit, license)) line = `${credit} (${license})`;
  if (line === "" || !mediaIsChanged(media) || line.includes(MEDIA_CHANGES_NL)) return line;
  return `${line}, ${MEDIA_CHANGES_NL}`;
}

/** What the (i) of a portrait shows: who made it, under which licence, and the page it came from. */
export type MediaCreditInfo = {
  /** The credit line, as recorded. */
  credit: string;
  /** The author, or the publisher of the source when none is recorded; null when neither is. */
  author: string | null;
  /** The licence as recorded in media.json (for example `CC-BY-SA-4.0`). */
  license: string;
  /** The licence in its usual spelling (`CC BY-SA 4.0`). */
  licenseLabel: string;
  /** The licence text, or null when the value has no single page (`Attribution`, public domain). */
  licenseUrl: string | null;
  /** The source site by name ("Wikimedia Commons", "Tweede Kamer Open Data"), or null without a source record. */
  siteName: string | null;
  /** The page the image came from, or null without a source record. */
  sourceUrl: string | null;
  /** The date the source was fetched (ISO), or null. */
  retrieved: string | null;
  /** True when the licence asks for the change statement (the copy is resized and cropped). */
  changed: boolean;
  /** True for CC BY-SA: the resized and cropped copy is shared under the same licence. */
  shareAlike: boolean;
};

const CC_LICENSE = /^CC-(BY(?:-SA)?)-(\d\.\d)$/;

/** Label and licence-text link for the licence values the portrait pipeline records. */
export function licenseInfo(license: string): { label: string; url: string | null } {
  const value = license.trim();
  if (value === "CC0-1.0") return { label: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" };
  const cc = CC_LICENSE.exec(value);
  if (cc) {
    return {
      label: `CC ${cc[1]} ${cc[2]}`,
      url: `https://creativecommons.org/licenses/${cc[1].toLowerCase()}/${cc[2]}/`,
    };
  }
  if (value === "European Parliament") return { label: value, url: "https://www.europarl.europa.eu/legal-notice/en/" };
  if (value === "Copyrighted free use") {
    return { label: value, url: "https://commons.wikimedia.org/wiki/Template:Copyrighted_free_use" };
  }
  return { label: value, url: null };
}

const SOURCE_SITES: Record<string, string> = {
  "commons.wikimedia.org": "Wikimedia Commons",
  "gegevensmagazijn.tweedekamer.nl": "Tweede Kamer Open Data",
  "opendata.tweedekamer.nl": "Tweede Kamer Open Data",
  "www.europarl.europa.eu": "European Parliament",
};

/** A readable site name for a source URL: a known site by name, else the publisher, else the host. */
export function sourceSiteName(url: string, publisher: string | null = null): string {
  try {
    const host = new URL(url).hostname;
    return SOURCE_SITES[host] ?? (publisher && publisher.trim() !== "" ? publisher.trim() : host.replace(/^www\./, ""));
  } catch {
    return publisher && publisher.trim() !== "" ? publisher.trim() : url;
  }
}

/**
 * The author, licence and source of a portrait for the info popover. Everything
 * comes from media.json and its source record in sources.json, never from the
 * credit text, so a link always points at the page the record cites.
 */
export function mediaCreditInfo(
  media: Pick<MediaItem, "credit" | "license" | "author" | "source"> & { type?: MediaItem["type"] },
  source: Pick<Source, "url" | "publisher" | "retrieved"> | null | undefined = getSourceById(media.source),
): MediaCreditInfo {
  const { label, url } = licenseInfo(media.license ?? "");
  const author = typeof media.author === "string" && media.author.trim() !== "" ? media.author.trim() : null;
  const publisher = source && source.publisher.trim() !== "" ? source.publisher.trim() : null;
  return {
    credit: mediaCreditLine(media),
    author: author ?? publisher,
    license: media.license ?? "",
    licenseLabel: label,
    licenseUrl: url,
    siteName: source ? sourceSiteName(source.url, source.publisher) : null,
    sourceUrl: source?.url ?? null,
    retrieved: source?.retrieved ?? null,
    changed: mediaIsChanged(media),
    shareAlike: mediaIsChanged(media) && mediaIsShareAlike(media.license),
  };
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

/** What the organisation page shows next to the name: the image (if any), the credit for the (i), and its kind. */
export type OrganizationEmblem = {
  image: { name: string; url: string; width: number | null; height: number | null; kind: "arms" | "logo" } | null;
  info: MediaCreditInfo;
  kind: "arms" | "logo";
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * The emblem of an organisation (ADR 0029). A licensed coat of arms from
 * media.json comes first; its author stays "niet vermeld" when the file page
 * names none, not the publisher. Without one, the official logo on the body's
 * own site (`logoEmbed`, amendment 1): loaded from there, never copied, no
 * licence claimed; with `linkOnly` the body reserved copyright and only the
 * link to its page is shown.
 */
export function organizationEmblem(organization: Organization): OrganizationEmblem | null {
  const own = ownEmblem(organization);
  if (own !== null) return own;
  // A body without an emblem of its own (a gemeenteraad, a commissie, Provinciale
  // Staten, a ministry of Curaçao) shows that of its parent or of the regering it
  // is part of, named as theirs: "Wapen van Gemeente Utrecht: ...". One level only,
  // and never an image whose owner reserved it.
  const parentId = organizationParentId(organization) ?? partOfWhole(organization.id);
  const parent = parentId !== null ? getOrganizationById(parentId) : undefined;
  const inherited = parent ? ownEmblem(parent) : null;
  if (!parent || inherited === null || inherited.image === null) return null;
  const prefix = inherited.kind === "arms" ? `Wapen van ${parent.name}: ` : `Logo van ${parent.name}: `;
  return { ...inherited, info: { ...inherited.info, credit: inherited.info.credit.replace(/^(Wapen|Logo): /, prefix) } };
}

let partOfIndex: Map<string, string> | null = null;

/**
 * The regering a ministry of Aruba, Curaçao or Sint Maarten is `part_of` (it has
 * no `parent` field). Only that pair: a gemeente is also `part_of` the VNG, as a
 * member, and must not show its logo.
 */
function partOfWhole(id: string): string | null {
  if (partOfIndex === null) {
    partOfIndex = new Map();
    for (const relation of getDataset().relations) {
      if (relation.type !== "part_of" || partOfIndex.has(relation.from)) continue;
      const from = getOrganizationById(relation.from);
      const to = getOrganizationById(relation.to);
      if (from?.subtype === "ministerie" && to?.subtype === "land-regering") partOfIndex.set(relation.from, relation.to);
    }
  }
  return partOfIndex.get(id) ?? null;
}

function ownEmblem(organization: Organization): OrganizationEmblem | null {
  const arms = organizationImages(organization)
    .map((id) => getMediaItem(id))
    .find((item) => item !== null && item.type === "logo");
  if (arms) {
    return {
      image: { name: organization.name, url: arms.url, width: arms.width, height: arms.height, kind: "arms" },
      info: { ...mediaCreditInfo(arms), author: arms.author ?? null },
      kind: "arms",
    };
  }
  const embed = organization.logoEmbed ?? null;
  if (embed === null) return null;
  const host = hostOf(embed.page);
  const reserved = embed.linkOnly || embed.url === null;
  // The credit names the body's site (the page), not an image CDN the site happens to use.
  const credit = reserved ? `Logo: auteursrecht voorbehouden, te zien op ${host}` : `Logo: getoond vanaf ${host}`;
  return {
    image: reserved ? null : { name: organization.name, url: embed.url as string, width: null, height: null, kind: "logo" },
    info: {
      credit,
      author: organization.name,
      license: reserved ? "logo-voorbehouden" : "logo-embed",
      licenseLabel: reserved ? "logo-voorbehouden" : "logo-embed",
      licenseUrl: null,
      siteName: host,
      sourceUrl: embed.page,
      retrieved: embed.retrieved,
      changed: false,
      shareAlike: false,
    },
    kind: "logo",
  };
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
    return (b.start ?? "").localeCompare(a.start ?? "");
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
