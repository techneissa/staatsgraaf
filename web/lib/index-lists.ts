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
export const INDEX_FIRST_SCREEN: Record<Exclude<IndexListKey, "organisaties">, number> = {
  personen: 24,
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
  /** slug of the parent when it sits in the same group: the row nests under it */
  pa?: string | null;
  /** 1 on the main bodies of a large group, shown while the group is folded */
  m?: 1 | null;
  /** who leads it, Dutch ("Voorzitter: ...") and English ("Chair: ...") */
  hd?: string | null;
  he?: string | null;
  /** seats */
  se?: number | null;
  /** url of the small local coat of arms, only one that needs no attribution */
  w?: string | null;
};

/** A group with more top-level bodies than this starts folded to its main bodies. */
export const ORG_FOLD_THRESHOLD = 24;
/** How many main bodies a folded group shows. */
export const ORG_FOLD_PREVIEW = 8;

/**
 * The organisations index as a tree: the bodies that have no parent in their
 * own group are the rows ("tops"), the rest hang under their parent (the
 * gemeenteraad and the college under their gemeente). A group longer than
 * ORG_FOLD_THRESHOLD starts folded to the rows marked `m`.
 */
export function organizationTree(rows: readonly OrganizationRow[]) {
  const slugs = new Set(rows.map((row) => row.s));
  const tops: OrganizationRow[] = [];
  const children = new Map<string, OrganizationRow[]>();
  for (const row of rows) {
    if (row.pa != null && slugs.has(row.pa)) {
      const list = children.get(row.pa);
      if (list) list.push(row);
      else children.set(row.pa, [row]);
    } else {
      tops.push(row);
    }
  }
  return { tops, children };
}

/** True when a group of this many top-level bodies starts folded. */
export function startsFolded(topCount: number): boolean {
  return topCount > ORG_FOLD_THRESHOLD;
}

/**
 * What the page shows before anything is opened: every top-level body of a
 * small group, the main bodies of a folded one, and the children of those.
 * The server renders exactly this, so the list does not move when the whole
 * file arrives.
 */
export function collapsedOrganizationRows(rows: readonly OrganizationRow[]): OrganizationRow[] {
  const byBranch = new Map<string, OrganizationRow[]>();
  for (const row of rows) {
    const list = byBranch.get(row.b);
    if (list) list.push(row);
    else byBranch.set(row.b, [row]);
  }
  const shown = new Set<string>();
  for (const group of byBranch.values()) {
    const { tops, children } = organizationTree(group);
    const visible = startsFolded(tops.length) ? tops.filter((row) => row.m === 1) : tops;
    for (const row of visible) {
      shown.add(row.s);
      for (const child of children.get(row.s) ?? []) shown.add(child.s);
    }
  }
  return rows.filter((row) => shown.has(row.s));
}

/**
 * The type that most of the given rows share, when it is a majority of at
 * least two: the group heading says it, so the rows leave it out. A small
 * group of mixed types has none, and every row names its own.
 */
export function dominantSubtype(rows: readonly OrganizationRow[]): OrgSubtype | null {
  const counts = new Map<OrgSubtype, number>();
  for (const row of rows) counts.set(row.st, (counts.get(row.st) ?? 0) + 1);
  let best: OrgSubtype | null = null;
  let most = 0;
  for (const [subtype, count] of counts) {
    if (count > most) {
      best = subtype;
      most = count;
    }
  }
  return most >= 2 && most * 2 > rows.length ? best : null;
}

/**
 * The leader line of a description such as "Voorzitter: I.M. (Ilona) Lagas.
 * Ondervoorzitter: ... Griffier: ...": the first sentence when it names the
 * chair, in Dutch or English. Null for any other description.
 */
export function leadOf(description: string | null | undefined): string | null {
  if (typeof description !== "string") return null;
  const match = /^((?:Voorzitter|Chair)): (.+?)(?:\. (?:Ondervoorzitter|Vice-chair|Griffier|Clerk|Secretaris|Secretary)\b|\.?\s*$)/u.exec(description.trim());
  return match ? `${match[1]}: ${match[2]}` : null;
}

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
