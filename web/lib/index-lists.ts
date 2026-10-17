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
  /** English gloss of the organisation name */
  oe?: string | null;
  /** organisation branch, for the accent bar */
  b?: OrgBranch | null;
  se?: number | null;
  /** name of one current holder, when the dataset has a current tenure */
  h?: string | null;
  /** extra current holders besides `h`, when more than one */
  hc?: number | null;
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
  return foldText([position.n, position.ge ?? "", position.o ?? "", position.oe ?? "", position.h ?? ""].join(" "));
}

/**
 * Shared office stem of a title, so "Fractievoorzitter BBB" and
 * "Burgemeester van Amsterdam" can sit under one heading. Unique titles
 * return null. Longest prefix first.
 */
const POSITION_FAMILY_MATCHERS: { key: string; label: { nl: string; en: string }; match: RegExp }[] = [
  { key: "cdvk", label: { nl: "Commissaris van de Koning", en: "King's commissioner" }, match: /^Commissaris van de Koning in\s+(.+)$/u },
  { key: "staatssecretaris", label: { nl: "Staatssecretaris", en: "State secretary" }, match: /^Staatssecretaris van\s+(.+)$/u },
  { key: "minister", label: { nl: "Minister", en: "Minister" }, match: /^Minister van\s+(.+)$/u },
  { key: "minister", label: { nl: "Minister", en: "Minister" }, match: /^Minister voor\s+(.+)$/u },
  { key: "burgemeester", label: { nl: "Burgemeester", en: "Mayor" }, match: /^Burgemeester van\s+(.+)$/u },
  { key: "wethouder", label: { nl: "Wethouder", en: "Alderman" }, match: /^Wethouder(?: van)?\s+(.+)$/u },
  { key: "dijkgraaf", label: { nl: "Dijkgraaf", en: "Dijkgraaf" }, match: /^Dijkgraaf van\s+(.+)$/u },
  { key: "gezaghebber", label: { nl: "Gezaghebber", en: "Gezaghebber" }, match: /^Gezaghebber van\s+(.+)$/u },
  { key: "fractievoorzitter", label: { nl: "Fractievoorzitter", en: "Parliamentary group leader" }, match: /^Fractievoorzitter\s+(.+)$/u },
  { key: "ondervoorzitter", label: { nl: "Ondervoorzitter", en: "Deputy chair" }, match: /^(?:Eerste |Tweede )?Ondervoorzitter van\s+(.+)$/u },
  { key: "voorzitter", label: { nl: "Voorzitter", en: "Chair" }, match: /^Voorzitter van\s+(.+)$/u },
  { key: "griffier", label: { nl: "Griffier", en: "Clerk" }, match: /^Griffier van\s+(.+)$/u },
  { key: "sg", label: { nl: "Secretaris-generaal", en: "Secretary-general" }, match: /^Secretaris-generaal(?: van)?\s+(.+)$/u },
  { key: "dg", label: { nl: "Directeur-generaal", en: "Director-general" }, match: /^Directeur-generaal(?: van| voor)?\s+(.+)$/u },
  { key: "lid", label: { nl: "Lid", en: "Member" }, match: /^Lid van\s+(.+)$/u },
];

export type PositionFamily = {
  key: string;
  label: { nl: string; en: string };
  rest: string;
};

export function positionFamily(title: string): PositionFamily | null {
  for (const family of POSITION_FAMILY_MATCHERS) {
    const matched = title.match(family.match);
    const rest = matched?.[1]?.trim();
    if (rest) return { key: family.key, label: family.label, rest };
  }
  return null;
}

/**
 * Distinctive rest for a title that is only the office stem. Taken from the
 * body name already on the row, so "Wethouder" of Aa en Hunze does not look
 * like every other wethouder. Titles that already carry a rest
 * (Burgemeester van Amsterdam) return null.
 */
const BARE_TITLE_ORG_PREFIX: Record<string, string> = {
  Wethouder: "College van burgemeester en wethouders van ",
  Gedeputeerde: "Gedeputeerde Staten van ",
  "Secretaris-generaal": "Ministerie van ",
};

export function positionDisplayRest(title: string, orgName: string | null | undefined): string | null {
  if (orgName == null || orgName === "") return null;
  if (positionFamily(title) !== null) return null;
  const prefix = BARE_TITLE_ORG_PREFIX[title];
  if (prefix == null || !orgName.startsWith(prefix)) return null;
  const rest = orgName.slice(prefix.length).trim();
  return rest !== "" ? rest : null;
}

/** A family only becomes its own heading when this many of the current matches share it. */
export const POSITION_FAMILY_MIN = 4;

export type PositionSectionItem = { row: PositionRow; label: string };

export type PositionSection = {
  key: string;
  type: OrgType;
  family: PositionFamily | null;
  items: PositionSectionItem[];
};

/**
 * Positions in type order, with repeated office stems split out as their own
 * sections. A stem with fewer than `minFamily` current matches stays in the
 * type's leftover list, under the full title.
 */
export function positionSections(rows: PositionRow[], minFamily = POSITION_FAMILY_MIN): PositionSection[] {
  const types: OrgType[] = [];
  const byType = new Map<OrgType, PositionRow[]>();
  for (const row of rows) {
    const list = byType.get(row.t);
    if (list) list.push(row);
    else {
      byType.set(row.t, [row]);
      types.push(row.t);
    }
  }
  const out: PositionSection[] = [];
  for (const type of types) {
    const families = new Map<string, { family: PositionFamily; items: PositionSectionItem[] }>();
    const leftover: PositionSectionItem[] = [];
    for (const row of byType.get(type) ?? []) {
      const family = positionFamily(row.n);
      if (family === null) {
        leftover.push({ row, label: row.n });
        continue;
      }
      const entry = { row, label: family.rest };
      const bucket = families.get(family.key);
      if (bucket) bucket.items.push(entry);
      else families.set(family.key, { family, items: [entry] });
    }
    const promoted: { family: PositionFamily; items: PositionSectionItem[] }[] = [];
    for (const bucket of families.values()) {
      if (bucket.items.length >= minFamily) promoted.push(bucket);
      else leftover.push(...bucket.items.map((item) => ({ row: item.row, label: item.row.n })));
    }
    promoted.sort((a, b) => a.family.label.nl.localeCompare(b.family.label.nl, "nl"));
    leftover.sort((a, b) => a.row.n.localeCompare(b.row.n, "nl"));
    for (const bucket of promoted) {
      bucket.items.sort((a, b) => a.label.localeCompare(b.label, "nl") || a.row.n.localeCompare(b.row.n, "nl"));
      out.push({ key: `${type}:${bucket.family.key}`, type, family: bucket.family, items: bucket.items });
    }
    if (leftover.length > 0) out.push({ key: type, type, family: null, items: leftover });
  }
  return out;
}

export const POSITION_SORT_KEYS = ["title", "org", "holder"] as const;
export type PositionSortKey = (typeof POSITION_SORT_KEYS)[number];
export type PositionSortDir = "asc" | "desc";

export function parsePositionSortKey(value: string): PositionSortKey {
  return POSITION_SORT_KEYS.includes(value as PositionSortKey) ? (value as PositionSortKey) : "title";
}

export function parsePositionSortDir(value: string): PositionSortDir {
  return value === "desc" ? "desc" : "asc";
}

/** Names wrap onto extra lines unless the URL says wrap=0. */
export function parsePositionWrap(value: string): boolean {
  return value !== "0";
}

const POSITION_COLLATOR = new Intl.Collator("nl", { sensitivity: "base", numeric: true });

function sortValue(row: PositionRow, key: PositionSortKey): string {
  if (key === "org") return row.o ?? "";
  if (key === "holder") return row.h ?? "";
  return row.n;
}

/**
 * Orders a filtered positions list by title, body or holder. Empty values
 * (no body, no current holder) sit last in both directions, then the title
 * breaks ties so a sort is stable to look at.
 */
export function sortPositionRows(rows: PositionRow[], key: PositionSortKey, dir: PositionSortDir): PositionRow[] {
  const copy = rows.slice();
  copy.sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    const aEmpty = av === "";
    const bEmpty = bv === "";
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
    const cmp = POSITION_COLLATOR.compare(av, bv);
    const ordered = dir === "asc" ? cmp : -cmp;
    if (ordered !== 0) return ordered;
    return POSITION_COLLATOR.compare(a.n, b.n) || a.s.localeCompare(b.s);
  });
  return copy;
}
