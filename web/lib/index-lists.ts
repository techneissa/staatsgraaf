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
  /** Organisation type (department, elected, …), for the home overview and ?type=. */
  t: OrgType;
  b: OrgBranch;
  /** slug of the parent when it sits in the same group: the row nests under it */
  pa?: string | null;
  /** key of the subgroup the row is listed in (its provincie, its ministerie), see OrganizationSubgroup */
  sg?: string | null;
  /** seats */
  se?: number | null;
  /** url of the small local coat of arms, only one that needs no attribution */
  w?: string | null;
};

/**
 * A fold inside a large group: the gemeenten of one provincie, the zbo's and
 * rwt's of one ministerie. The page renders the headings closed; the rows
 * come from the list file when one is opened.
 */
export type OrganizationSubgroup = {
  key: string;
  /** label without the type word ("Drenthe", "Financiën") */
  label: string;
  /** organisation id of the body the subgroup is named after (the provincie, the ministerie), for its icon */
  id: string | null;
  /** coat of arms of that body */
  w?: string | null;
  /** rows listed in it (top-level bodies) */
  count: number;
};

export type OrganizationGroup = {
  key: OrgBranch;
  /** every body in the group, nested ones included */
  count: number;
  /** bodies that are rows of their own (the rest nest under them) */
  top: number;
  /** how many bodies of the type the group is named after (gemeenten, provincies, waterschappen), when it is one */
  units?: number | null;
  /** what the subgroups are: the provincie of a gemeente, the ministerie of a zbo */
  by?: "provincie" | "ministerie" | null;
  subgroups?: OrganizationSubgroup[];
};

/** Key of the subgroup for the bodies of a split group that have no provincie or ministerie (samenwerkingsverbanden, the VNG). */
export const OTHER_SUBGROUP = "overig";

/**
 * The organisations index as a tree: the bodies that have no parent in their
 * own group are the rows ("tops"), the rest hang under their parent (the
 * gemeenteraad and the college under their gemeente).
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

/**
 * What the page shows before anything is opened: every group in full, with
 * the bodies nested under its rows, except the groups split into subgroups
 * (gemeenten by provincie, zelfstandige organen by ministerie), which start
 * as closed headings. The server renders exactly this, so the list does not
 * move when the whole file arrives.
 */
export function initialOrganizationRows(rows: readonly OrganizationRow[], groups: readonly OrganizationGroup[]): OrganizationRow[] {
  const split = new Set(groups.filter((group) => (group.subgroups?.length ?? 0) > 0).map((group) => group.key));
  return rows.filter((row) => !split.has(row.b));
}

/**
 * The type that most of the given rows share, when it is a majority of at
 * least two: it leads the group, the other kinds of body follow. A small group
 * of mixed types has none.
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
