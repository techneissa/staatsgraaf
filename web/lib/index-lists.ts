/**
 * The three long index lists (people, organisations, positions) as compact
 * rows. The page renders the first screen on the server; the rest comes from
 * a same-origin JSON file under /peek/lists/ that scripts/build-peek-index.mjs
 * writes from the same loaders, so the list cannot drift from the pages.
 *
 * Pure module: no dataset access, so client components, the build script and
 * the tests share the types and the search folding.
 */

import type { OrgBranch, OrgSubtype, OrgType } from "./types";

export type IndexListKey = "personen" | "organisaties" | "posities";

export const INDEX_LIST_PATH = "/peek/lists";

export function indexListUrl(key: IndexListKey): string {
  return `${INDEX_LIST_PATH}/${key}.json`;
}

/** How many rows the server renders before the JSON arrives (about one screen). */
export const INDEX_FIRST_SCREEN: Record<IndexListKey, number> = {
  personen: 24,
  organisaties: 18,
  posities: 18,
};

export function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Search terms of a query: folded, split on whitespace. */
export function searchTerms(query: string): string[] {
  return foldText(query.trim()).split(/\s+/).filter(Boolean);
}

/** Null values are dropped from the JSON; a missing key reads as null. */
export type PersonRow = {
  /** slug, unique within the list */
  s: string;
  /** name */
  n: string;
  /** letter of the A-Z section */
  l: string;
  /** main position in Dutch, one line */
  r?: string | null;
  /** main position in English */
  re?: string | null;
  /** filter group key */
  g: string;
  /** party label as shown on the tag */
  p?: string | null;
  /** party filter key */
  pk?: string | null;
  /** party colour */
  pc?: string | null;
  /** identity colour of the tile */
  c?: string | null;
  /** thumbnail url */
  t?: string | null;
  /** portrait credit line */
  cr?: string | null;
  /** aliases, space separated, only the ones the name does not hold */
  a?: string | null;
};

export type OrganizationRow = {
  s: string;
  n: string;
  /** English gloss of the name */
  ge?: string | null;
  st: OrgSubtype;
  b: OrgBranch;
  /** description, Dutch and English, clipped */
  dn?: string | null;
  de?: string | null;
  /** seats */
  se?: number | null;
  /** employees */
  em?: number | null;
};

export type PositionRow = {
  s: string;
  /** title */
  n: string;
  ge?: string | null;
  t: OrgType;
  /** organisation name */
  o?: string | null;
  /** organisation branch, for the accent bar */
  b?: OrgBranch | null;
  se?: number | null;
};

export type IndexRowOf = {
  personen: PersonRow;
  organisaties: OrganizationRow;
  posities: PositionRow;
};

/** Cuts a long text at a word boundary and marks the cut. */
export function clipText(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, "")}…`;
}

/** The text a row's search matches against, folded once when the rows arrive. */
export function personSearchText(person: PersonRow): string {
  return foldText([person.n, person.a ?? "", person.p ?? "", person.r ?? "", person.re ?? ""].join(" "));
}

export function organizationSearchText(organization: OrganizationRow): string {
  return foldText([organization.n, organization.ge ?? ""].join(" "));
}

export function positionSearchText(position: PositionRow): string {
  return foldText([position.n, position.ge ?? "", position.o ?? ""].join(" "));
}
