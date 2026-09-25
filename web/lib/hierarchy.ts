/**
 * The hierarchy model behind the default form of the connections view
 * (Verbanden, internal id `power`): who heads a structure and who sits under
 * each of its parts, from current tenures and memberships in the dataset.
 *
 * Three trees:
 *
 * - `kabinet`: the minister-president in the centre, the Koning as head of
 *   state, and one hub per ministry with its ministers and staatssecretarissen.
 * - `tweede-kamer` and `eerste-kamer`: the chair in the centre and one hub
 *   per fractie with its seats, its fractievoorzitter and its members.
 *
 * `buildHierarchy` is pure and runs once at build time
 * (web/scripts/build-graph.mjs), which writes `public/hierarchy.json`. The
 * client only reads it. Every person carries the index of the source of the
 * tenure or membership that puts them there.
 */

export const HIERARCHY_SCHEMA = "staatsgraaf.hierarchy/1";

export type HierarchySource = { id: string; url: string | null; title: string | null; retrieved: string | null };

export type HierarchyPerson = {
  id: string;
  name: string;
  /** Only when it differs from the id without its `person:` prefix. */
  slug?: string;
  image: string | null;
  /** Title of the position that places the person in this hub. */
  role?: string;
  /** Further current titles in the same structure (Vice-Minister-President). */
  extra?: string[];
  /** Party as the dataset records it; absent when the dataset has none. */
  party?: string;
  /** Fractievoorzitter of the hub's fractie. */
  leader?: true;
  /** Index into `HierarchyBundle.sources`. */
  src: number;
};

export type HierarchyHub = {
  /** Organisation id of a ministry, or `fractie:<chamber>:<label>`. */
  id: string;
  kind: "ministry" | "fractie";
  /** Full Dutch name. */
  name: string;
  /** Short Dutch label for the canvas. */
  short: string;
  /** Organisation slug of a ministry, for its page. */
  slug?: string;
  /** Sourced party colour of a fractie, or null when none is on record. */
  color?: string | null;
  /** Seats of a fractie. */
  seats?: number;
  people: HierarchyPerson[];
};

export type HierarchyTreeId = "kabinet" | "tweede-kamer" | "eerste-kamer";

export type HierarchyTree = {
  id: HierarchyTreeId;
  /** Organisation behind the tree (org:regering, org:tweede-kamer, org:eerste-kamer). */
  org: string;
  /** Dutch name of the structure: the cabinet or the chamber. */
  name: string;
  /** The head in the centre: minister-president or chair. */
  head: HierarchyPerson | null;
  /** The Koning, head of state, for the cabinet tree. */
  headOfState?: HierarchyPerson | null;
  /** Seats of a chamber. */
  seats?: number;
  /** Coalition parties of the cabinet, in the order of the coalition agreement. */
  parties?: string[];
  /** Source of the cabinet record. */
  src?: number;
  hubs: HierarchyHub[];
};

export type HierarchyBundle = {
  schema: string;
  snapshot: string | null;
  sources: HierarchySource[];
  trees: HierarchyTree[];
};

type SourceRef = { source: string; retrieved?: string | null } | null | undefined;
type Org = { id: string; slug: string; name: string; aliases?: string[] };
type Person = { id: string; slug: string; name: string; party?: string | null };
type Position = { id: string; title: string; organization: string };
type Tenure = { person: string; position: string; start?: string | null; end: string | null; source?: SourceRef };
type Membership = { person: string; organization: string; fractie?: string | null; end: string | null; source?: SourceRef };
type Coalition = {
  id: string;
  government: string;
  name: string;
  parties?: string[];
  end: string | null;
  primeMinister?: string | null;
  source?: SourceRef;
};
type Party = { key: string; abbrev: string; color: string | null } | null;

export type HierarchyInput = {
  snapshot: string | null;
  organizations: readonly Org[];
  people: readonly Person[];
  positions: readonly Position[];
  tenures: readonly Tenure[];
  memberships: readonly Membership[];
  coalitions: readonly Coalition[];
  sources: readonly { id: string; url?: string | null; title?: string | null }[];
  /** Local portrait URL of a person, or null. */
  portraitOf: (id: string) => string | null;
  /** The party registry record for a dataset party or fractie name. */
  partyOf: (name: string) => Party;
  /** Members in seat order (lib/seats.ts). */
  seatOrder: <T extends { id: string; name: string }>(members: readonly T[]) => T[];
};

const CABINET_TITLE = /^(minister|staatssecretaris)/i;
const MINISTRY_PREFIX = "org:ministerie-";

/**
 * A short label for a ministry: a one word alias of up to ten letters
 * (Defensie, Financiën), else its first abbreviation (BZK, JenV).
 */
export function ministryShort(org: { name: string; aliases?: readonly string[] }): string {
  const aliases = (org.aliases ?? []).filter((alias) => !/^ministerie/i.test(alias));
  const word = aliases.find((alias) => /^\p{Lu}\p{Ll}+$/u.test(alias) && alias.length <= 10);
  if (word) return word;
  const abbrev = aliases.find((alias) => alias.length <= 5 && !/&/.test(alias));
  return abbrev ?? org.name.replace(/^Ministerie van /, "");
}

/** Lucide icon names per ministry; the client maps them to icon data. */
export const MINISTRY_ICON: Record<string, string> = {
  "org:ministerie-van-algemene-zaken": "landmark",
  "org:ministerie-van-binnenlandse-zaken-en-koninkrijksrelaties": "building-2",
  "org:ministerie-van-buitenlandse-zaken": "globe",
  "org:ministerie-van-defensie": "shield",
  "org:ministerie-van-economische-zaken-en-klimaat": "factory",
  "org:ministerie-van-financien": "landmark",
  "org:ministerie-van-infrastructuur-en-waterstaat": "waves",
  "org:ministerie-van-justitie-en-veiligheid": "scale",
  "org:ministerie-van-landbouw-visserij-voedselzekerheid-en-natuur": "wheat",
  "org:ministerie-van-onderwijs-cultuur-en-wetenschap": "graduation-cap",
  "org:ministerie-van-sociale-zaken-en-werkgelegenheid": "users",
  "org:ministerie-van-volksgezondheid-welzijn-en-sport": "heart-pulse",
};

/** Ministers before staatssecretarissen, then by title. */
function rankRole(title: string): number {
  if (/^minister-president/i.test(title)) return 0;
  if (/^minister/i.test(title)) return 1;
  return 2;
}

export function buildHierarchy(input: HierarchyInput): HierarchyBundle {
  const orgById = new Map(input.organizations.map((org) => [org.id, org]));
  const personById = new Map(input.people.map((person) => [person.id, person]));
  const positionById = new Map(input.positions.map((position) => [position.id, position]));
  const sourceById = new Map(input.sources.map((source) => [source.id, source]));
  const sources: HierarchySource[] = [];
  const sourceIndex = new Map<string, number>();
  const src = (ref: SourceRef): number => {
    if (!ref?.source) return -1;
    const key = `${ref.source}|${ref.retrieved ?? ""}`;
    let index = sourceIndex.get(key);
    if (index === undefined) {
      const record = sourceById.get(ref.source);
      index = sources.length;
      sources.push({ id: ref.source, url: record?.url ?? null, title: record?.title ?? null, retrieved: ref.retrieved ?? null });
      sourceIndex.set(key, index);
    }
    return index;
  };
  const personRef = (id: string, ref: SourceRef, extra: Partial<HierarchyPerson> = {}): HierarchyPerson | null => {
    const person = personById.get(id);
    if (!person) return null;
    const out: HierarchyPerson = { id, name: person.name, image: input.portraitOf(id), src: src(ref) };
    if (`person:${person.slug}` !== id) out.slug = person.slug;
    if (person.party) out.party = person.party;
    return { ...out, ...extra };
  };

  const current = input.tenures.filter((tenure) => tenure.end === null);
  const trees: HierarchyTree[] = [];

  // The cabinet.
  const coalition = input.coalitions.find((entry) => entry.end === null && entry.government === "org:regering") ?? null;
  const cabinet = current
    .map((tenure) => ({ tenure, position: positionById.get(tenure.position) }))
    .filter(
      (entry): entry is { tenure: Tenure; position: Position } =>
        Boolean(entry.position) && entry.position!.organization.startsWith(MINISTRY_PREFIX) && CABINET_TITLE.test(entry.position!.title),
    );
  const extraTitles = new Map<string, string[]>();
  for (const tenure of current) {
    const position = positionById.get(tenure.position);
    if (position?.organization === "org:regering" && /vice-minister-president/i.test(position.title)) {
      extraTitles.set(tenure.person, [...(extraTitles.get(tenure.person) ?? []), position.title]);
    }
  }
  const headId =
    coalition?.primeMinister ?? cabinet.find((entry) => /^minister-president/i.test(entry.position.title))?.tenure.person ?? null;
  const headEntry = headId ? cabinet.find((entry) => entry.tenure.person === headId) ?? null : null;
  const kingTenure = current.find((tenure) => positionById.get(tenure.position)?.id === "pos:koning") ?? null;
  const byMinistry = new Map<string, { tenure: Tenure; position: Position }[]>();
  for (const entry of cabinet) {
    if (entry.tenure.person === headId && entry.position.organization === headEntry?.position.organization) continue;
    const list = byMinistry.get(entry.position.organization) ?? [];
    list.push(entry);
    byMinistry.set(entry.position.organization, list);
  }
  const ministryHubs: HierarchyHub[] = [];
  for (const [orgId, list] of byMinistry) {
    const org = orgById.get(orgId);
    if (!org) continue;
    const seen = new Set<string>();
    const people = list
      .sort(
        (x, y) =>
          rankRole(x.position.title) - rankRole(y.position.title) ||
          (x.tenure.start ?? "").localeCompare(y.tenure.start ?? "") ||
          x.position.title.localeCompare(y.position.title, "nl"),
      )
      .filter((entry) => (seen.has(entry.tenure.person) ? false : (seen.add(entry.tenure.person), true)))
      .map((entry) =>
        personRef(entry.tenure.person, entry.tenure.source, {
          role: entry.position.title,
          ...(extraTitles.has(entry.tenure.person) ? { extra: extraTitles.get(entry.tenure.person) } : {}),
        }),
      )
      .filter((person): person is HierarchyPerson => person !== null);
    if (people.length === 0) continue;
    ministryHubs.push({ id: orgId, kind: "ministry", name: org.name, short: ministryShort(org), slug: org.slug, people });
  }
  ministryHubs.sort((x, y) => x.name.localeCompare(y.name, "nl"));
  trees.push({
    id: "kabinet",
    org: "org:regering",
    name: coalition?.name ?? "Kabinet",
    head: headEntry ? personRef(headEntry.tenure.person, headEntry.tenure.source, { role: headEntry.position.title }) : null,
    headOfState: kingTenure
      ? personRef(kingTenure.person, kingTenure.source, { role: positionById.get(kingTenure.position)?.title })
      : null,
    ...(coalition?.parties ? { parties: [...coalition.parties] } : {}),
    ...(coalition?.source ? { src: src(coalition.source) } : {}),
    hubs: ministryHubs,
  });

  // The chambers.
  for (const [treeId, orgId] of [
    ["tweede-kamer", "org:tweede-kamer"],
    ["eerste-kamer", "org:eerste-kamer"],
  ] as const) {
    const org = orgById.get(orgId);
    if (!org) continue;
    const seated = input.memberships.filter((membership) => membership.end === null && membership.organization === orgId);
    const fractieOf = new Map(seated.map((membership) => [membership.person, membership.fractie ?? null]));
    const chair =
      current.find((tenure) => {
        const position = positionById.get(tenure.position);
        return position?.organization === orgId && /^voorzitter van de/i.test(position.title);
      }) ?? null;
    const leaders = new Map<string, Tenure>();
    for (const tenure of current) {
      const position = positionById.get(tenure.position);
      if (position?.organization !== orgId || !/^fractievoorzitter/i.test(position.title)) continue;
      const fractie = fractieOf.get(tenure.person);
      if (fractie && !leaders.has(fractie)) leaders.set(fractie, tenure);
    }
    const groups = new Map<string, { label: string; name: string; color: string | null; members: Membership[] }>();
    for (const membership of seated) {
      const fractie = membership.fractie ?? "";
      const party = fractie ? input.partyOf(fractie) : null;
      const key = party?.key ?? fractie;
      const group = groups.get(key) ?? { label: party?.abbrev ?? fractie, name: fractie, color: party?.color ?? null, members: [] };
      group.members.push(membership);
      groups.set(key, group);
    }
    const hubs: HierarchyHub[] = [...groups.values()]
      .sort((x, y) => y.members.length - x.members.length || x.label.localeCompare(y.label, "nl"))
      .map((group) => {
        const leader = leaders.get(group.name) ?? null;
        const ordered = input.seatOrder(
          group.members.map((membership) => ({ id: membership.person, name: personById.get(membership.person)?.name ?? membership.person, membership })),
        );
        const people: HierarchyPerson[] = [];
        if (leader) {
          const ref = personRef(leader.person, leader.source, { leader: true });
          if (ref) people.push(ref);
        }
        for (const entry of ordered) {
          if (entry.id === leader?.person) continue;
          const ref = personRef(entry.id, entry.membership.source);
          if (ref) people.push(ref);
        }
        return {
          id: `fractie:${treeId}:${group.label}`,
          kind: "fractie" as const,
          name: group.name,
          short: group.label,
          color: group.color,
          seats: group.members.length,
          people,
        };
      });
    trees.push({
      id: treeId,
      org: orgId,
      name: org.name,
      head: chair ? personRef(chair.person, chair.source, { role: positionById.get(chair.position)?.title }) : null,
      seats: seated.length,
      hubs,
    });
  }

  return { schema: HIERARCHY_SCHEMA, snapshot: input.snapshot, sources, trees };
}

/** A person's page slug. */
export function personSlug(person: HierarchyPerson): string {
  return person.slug ?? person.id.replace(/^person:/, "");
}
