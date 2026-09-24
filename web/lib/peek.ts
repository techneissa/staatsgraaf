/**
 * The peek index: a compact, build-time summary of every entity, loaded in
 * shards by the inline-link popover (components/peek/peek-provider.tsx).
 *
 * Pure module: no dataset access, so the client provider, the build script
 * (web/scripts/build-peek-index.mjs) and the tests share the same shard
 * function and record shape. Every value in a record is copied from the
 * dataset at build time; the popover shows nothing the entity page does not.
 */

import type { OrgBranch, OrgSubtype } from "./types";

/** How a link is coloured and which glyph it carries. A place is a gemeente, provincie or openbaar lichaam record. */
export type PeekKind = "person" | "organization" | "position" | "topic" | "place";

export const PEEK_SHARDS = 64;
export const PEEK_PATH = "/peek";

/** FNV-1a over the UTF-16 code units, the same on the server and in the browser. */
export function peekHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function peekShard(id: string): string {
  return String(peekHash(id) % PEEK_SHARDS).padStart(2, "0");
}

export function peekShardUrl(id: string): string {
  return `${PEEK_PATH}/${peekShard(id)}.json`;
}

const PLACE_SUBTYPES: ReadonlySet<string> = new Set(["gemeente", "provincie", "openbaar-lichaam-bes"]);

/** The link kind for an entity id, with the organisation subtype when known. */
export function peekKindFor(id: string, subtype?: string | null): PeekKind | null {
  if (id.startsWith("person:")) return "person";
  if (id.startsWith("pos:")) return "position";
  if (id.startsWith("topic:")) return "topic";
  if (id.startsWith("org:")) return subtype && PLACE_SUBTYPES.has(subtype) ? "place" : "organization";
  return null;
}

export type PeekRef = {
  id: string;
  name: string;
  href: string;
};

export type PeekRole = PeekRef & {
  /** English gloss of the Dutch title, when one is established. */
  gloss: string | null;
  organization: PeekRef | null;
  acting: boolean;
  start: string | null;
};

export type PeekHolder = PeekRef & {
  /** The position title, for an organisation's leading officials. */
  title?: string;
  portrait: string | null;
  initials: string;
  color: string | null;
  acting: boolean;
  start: string | null;
};

export type PeekSource = {
  url: string;
  publisher: string;
  retrieved: string | null;
};

export type PeekRecord = {
  id: string;
  kind: PeekKind;
  name: string;
  href: string;
  /** English gloss of the Dutch name, shown under it in English; never replaces it. */
  gloss: string | null;
  initials: string;
  /** Party colour for a person, branch colour variable for an organisation or position, or null. */
  color: string | null;
  portrait: { url: string; credit: string } | null;
  subtype: OrgSubtype | null;
  branch: OrgBranch | null;
  party: { abbrev: string; name: string; href: string | null } | null;
  /** First sentences of the dataset description, in Dutch. */
  description: string | null;
  /** Parent organisation for an organisation, the organisation for a position. */
  parent: PeekRef | null;
  /** Current roles of a person (positions held now), at most two. */
  roles: PeekRole[];
  roleCount: number;
  /** Current holders of a position, or the leading officials of an organisation, at most two. */
  holders: PeekHolder[];
  holderCount: number;
  /** Bodies a person is a current member of (for example the Tweede Kamer), at most two. */
  memberOf: PeekRef[];
  memberOfCount: number;
  /** Responsible organisations of a topic, at most three. */
  related: PeekRef[];
  relatedCount: number;
  /** Current members for a body with members (for example a Kamer or a gemeenteraad). */
  members: number;
  seats: number | null;
  connections: number;
  news: number;
  source: PeekSource | null;
};

export type PeekShard = {
  version: 1;
  records: Record<string, PeekRecord>;
};

/** Restores the defaults the build script drops (null, false, 0, empty lists). */
export function normalizePeekRecord(raw: Partial<PeekRecord> & Pick<PeekRecord, "id" | "kind" | "name" | "href">): PeekRecord {
  return {
    gloss: null,
    initials: "",
    color: null,
    portrait: null,
    subtype: null,
    branch: null,
    party: null,
    description: null,
    parent: null,
    roleCount: 0,
    holderCount: 0,
    memberOfCount: 0,
    relatedCount: 0,
    members: 0,
    seats: null,
    connections: 0,
    news: 0,
    source: null,
    ...raw,
    roles: (raw.roles ?? []).map((role: Partial<PeekRole> & PeekRef) => ({
      ...role,
      gloss: role.gloss ?? null,
      organization: role.organization ?? null,
      acting: role.acting ?? false,
      start: role.start ?? null,
    })),
    holders: (raw.holders ?? []).map((entry: Partial<PeekHolder> & PeekRef) => ({
      ...entry,
      portrait: entry.portrait ?? null,
      initials: entry.initials ?? "",
      color: entry.color ?? null,
      acting: entry.acting ?? false,
      start: entry.start ?? null,
    })),
    memberOf: raw.memberOf ?? [],
    related: raw.related ?? [],
  };
}
