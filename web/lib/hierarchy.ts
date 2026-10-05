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
 *
 * A chamber tree also carries its hall (lib/chamber-hall.ts): every seat of
 * the chamber's sourced floor plan with the member in it, the chair, and the
 * kabinet on its bench.
 */

import { layoutHall, type ChamberHall, type ChamberPlan } from "./chamber-hall";

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
  /** Start of the seat or post that places the person here (ISO date). */
  since?: string;
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
  /** A fractie of a party in the sitting coalition. */
  coalition?: true;
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
  /** The plenary hall of a chamber, when a floor plan is on record. */
  hall?: ChamberHall;
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
type Membership = { person: string; organization: string; fractie?: string | null; start?: string | null; end: string | null; source?: SourceRef };
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
  /** Floor plans of the chambers (data/chamber-plans.json); the newest per chamber is drawn. */
  plans?: readonly ChamberPlan[];
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
  "org:ministerie-van-financien": "coins",
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
          ...(entry.tenure.start ? { since: entry.tenure.start } : {}),
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
    head: headEntry
      ? personRef(headEntry.tenure.person, headEntry.tenure.source, {
          role: headEntry.position.title,
          ...(headEntry.tenure.start ? { since: headEntry.tenure.start } : {}),
        })
      : null,
    headOfState: kingTenure
      ? personRef(kingTenure.person, kingTenure.source, { role: positionById.get(kingTenure.position)?.title })
      : null,
    ...(coalition?.parties ? { parties: [...coalition.parties] } : {}),
    ...(coalition?.source ? { src: src(coalition.source) } : {}),
    hubs: ministryHubs,
  });

  // The kabinet on its bench: the minister-president, then the ministers,
  // then the staatssecretarissen, each group in ring order of the ministries.
  const benchOrder = orderByCluster(ministryHubs);
  const bench: { person: string; hub: string }[] = [];
  if (headEntry) bench.push({ person: headEntry.tenure.person, hub: headEntry.position.organization });
  for (const pass of [1, 2]) {
    for (const hub of benchOrder) {
      for (const person of hub.people) {
        if (rankRole(person.role ?? "") === pass && !bench.some((entry) => entry.person === person.id)) bench.push({ person: person.id, hub: hub.id });
      }
    }
  }
  const coalitionKeys = new Set(coalition?.parties ?? []);

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
    const groups = new Map<string, { key: string | null; label: string; name: string; color: string | null; members: Membership[] }>();
    for (const membership of seated) {
      const fractie = membership.fractie ?? "";
      const party = fractie ? input.partyOf(fractie) : null;
      const key = party?.key ?? fractie;
      const group = groups.get(key) ?? { key: party?.key ?? null, label: party?.abbrev ?? fractie, name: fractie, color: party?.color ?? null, members: [] };
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
        const seatSince = (person: string) => group.members.find((membership) => membership.person === person)?.start ?? null;
        if (leader) {
          const since = seatSince(leader.person);
          const ref = personRef(leader.person, leader.source, { leader: true, ...(since ? { since } : {}) });
          if (ref) people.push(ref);
        }
        for (const entry of ordered) {
          if (entry.id === leader?.person) continue;
          const ref = personRef(entry.id, entry.membership.source, entry.membership.start ? { since: entry.membership.start } : {});
          if (ref) people.push(ref);
        }
        return {
          id: `fractie:${treeId}:${group.label}`,
          kind: "fractie" as const,
          name: group.name,
          short: group.label,
          color: group.color,
          seats: group.members.length,
          ...(group.key !== null && coalitionKeys.has(group.key) ? { coalition: true as const } : {}),
          people,
        };
      });
    const hubOf = (fractie: string) => {
      const party = fractie ? input.partyOf(fractie) : null;
      return `fractie:${treeId}:${party?.abbrev ?? fractie}`;
    };
    const plan =
      (input.plans ?? []).filter((entry) => entry.organization === orgId).sort((x, y) => y.asOf.localeCompare(x.asOf))[0] ?? null;
    const hall = plan
      ? layoutHall({
          plan,
          src: src(plan.source),
          members: seated.map((membership) => ({
            person: membership.person,
            fractie: membership.fractie ?? "",
            name: personById.get(membership.person)?.name ?? membership.person,
          })),
          hubOf,
          chair: chair?.person ?? null,
          cabinet: bench,
          seatOrder: input.seatOrder,
        })
      : null;
    trees.push({
      id: treeId,
      org: orgId,
      name: org.name,
      head: chair
        ? personRef(chair.person, chair.source, { role: positionById.get(chair.position)?.title, ...(chair.start ? { since: chair.start } : {}) })
        : null,
      seats: seated.length,
      hubs,
      ...(hall ? { hall } : {}),
    });
  }

  return { schema: HIERARCHY_SCHEMA, snapshot: input.snapshot, sources, trees };
}

/** A person's page slug. */
export function personSlug(person: HierarchyPerson): string {
  return person.slug ?? person.id.replace(/^person:/, "");
}

// ---------------------------------------------------------------------------
// Ministry clusters

export type ClusterId = "economie" | "ruimte" | "bestuur" | "zorg" | "veiligheid" | "buitenland";

export type MinistryCluster = {
  id: ClusterId;
  nl: string;
  en: string;
  /** Categorical colour per mode, validated as a ring (see `CLUSTER_PALETTE_NOTE`). */
  light: string;
  dark: string;
  ministries: readonly string[];
};

/**
 * Eleven ministries would need eleven hues, past the categorical limit of
 * eight, so they share six colours by policy area and differ by icon and
 * label. The order is the order around the ring, clockwise from the top.
 */
export const MINISTRY_CLUSTERS: readonly MinistryCluster[] = [
  {
    id: "economie",
    nl: "Economie en Financiën",
    en: "Economy and finance",
    light: "#2a78d6",
    dark: "#3987e5",
    ministries: [
      "org:ministerie-van-financien",
      "org:ministerie-van-economische-zaken-en-klimaat",
      "org:ministerie-van-economische-zaken",
      "org:ministerie-van-klimaat-en-groene-groei",
    ],
  },
  {
    id: "ruimte",
    nl: "Ruimte en Landbouw",
    en: "Land, water and farming",
    light: "#009a67",
    dark: "#199e70",
    ministries: [
      "org:ministerie-van-infrastructuur-en-waterstaat",
      "org:ministerie-van-landbouw-visserij-voedselzekerheid-en-natuur",
      "org:ministerie-van-volkshuisvesting-en-ruimtelijke-ordening",
    ],
  },
  {
    id: "bestuur",
    nl: "Bestuur",
    en: "Government",
    light: "#c07700",
    dark: "#c98500",
    ministries: ["org:ministerie-van-binnenlandse-zaken-en-koninkrijksrelaties", "org:ministerie-van-algemene-zaken"],
  },
  {
    id: "zorg",
    nl: "Zorg, Werk en Onderwijs",
    en: "Care, work and education",
    light: "#ce648d",
    dark: "#d55181",
    ministries: [
      "org:ministerie-van-volksgezondheid-welzijn-en-sport",
      "org:ministerie-van-sociale-zaken-en-werkgelegenheid",
      "org:ministerie-van-onderwijs-cultuur-en-wetenschap",
    ],
  },
  {
    id: "veiligheid",
    nl: "Veiligheid en Recht",
    en: "Security and justice",
    light: "#4a3aa7",
    dark: "#9085e9",
    ministries: ["org:ministerie-van-justitie-en-veiligheid", "org:ministerie-van-defensie", "org:ministerie-van-asiel-en-migratie"],
  },
  {
    id: "buitenland",
    nl: "Buitenland",
    en: "Foreign affairs",
    light: "#e34948",
    dark: "#e66767",
    ministries: ["org:ministerie-van-buitenlandse-zaken"],
  },
];

/**
 * How the cluster colours were chosen: the documented categorical hues
 * (blue, aqua, yellow, magenta, violet, red), the light steps darkened in
 * OKLCH to clear 3:1 on the inset surface (#F0EFDD) and white, validated with the
 * dataviz validator as a closed ring (the first colour repeated at the end):
 * worst adjacent CVD delta E 8.4 in both modes, normal-vision 16.2 light and
 * 19.3 dark, every colour at least 3:1 on its surface.
 */
export const CLUSTER_PALETTE_NOTE = "validate_palette.js, ring order, light #F0EFDD/#FFFFFF, dark #0F0F13/#141419";

/** The cluster of a ministry; a ministry not listed falls under Bestuur. */
export function clusterOf(orgId: string): MinistryCluster {
  return MINISTRY_CLUSTERS.find((cluster) => cluster.ministries.includes(orgId)) ?? MINISTRY_CLUSTERS[2];
}

/** CSS custom property that carries a cluster's colour in the current theme. */
export function clusterVar(id: ClusterId): string {
  return `var(--hv-${id})`;
}

/** Ministry hubs in ring order: by cluster, then as they came. */
export function orderByCluster<T extends { id: string }>(hubs: readonly T[]): T[] {
  const rank = (hub: T) => MINISTRY_CLUSTERS.indexOf(clusterOf(hub.id));
  return hubs
    .map((hub, index) => ({ hub, index }))
    .sort((x, y) => rank(x.hub) - rank(y.hub) || x.index - y.index)
    .map(({ hub }) => hub);
}

// ---------------------------------------------------------------------------
// Person focus groups

export type FocusTieKind = "office" | "cabinet" | "party" | "news";
export type FocusTieGroup = { kind: FocusTieKind; ties: readonly { other: string }[] };

export type FocusGroupHead =
  | { type: "person"; id: string }
  | { type: "ministry"; hub: string }
  | { type: "party"; party: string }
  | { type: "kind" };

export type FocusGroup = {
  key: string;
  kind: "ministry" | "fractie" | "party" | FocusTieKind;
  /** The ministry or fractie hub behind the group. */
  hub?: string;
  /** Tree of the hub. */
  tree?: HierarchyTreeId;
  /** Party label of a party or fractie group. */
  party?: string;
  head: FocusGroupHead;
  /** Everyone in the group apart from the head and the focus, strongest first. */
  members: string[];
};

/**
 * The groups around a person in the focus: first the two that go left and
 * right (party or fractie, then ministry or office), then the rest. The
 * hierarchy gives each group its lead; the connections bundle adds the ties
 * it has beyond that (cabinet, bodies, shared news). Nobody appears twice.
 */
export function focusGroups(bundle: HierarchyBundle, personId: string, ties: readonly FocusTieGroup[]): FocusGroup[] {
  const kabinet = bundle.trees.find((tree) => tree.id === "kabinet") ?? null;
  const used = new Set<string>([personId]);
  const take = (ids: readonly string[]) => {
    const out: string[] = [];
    for (const id of ids) {
      if (used.has(id)) continue;
      used.add(id);
      out.push(id);
    }
    return out;
  };
  let party: FocusGroup | null = null;
  let office: FocusGroup | null = null;

  // A seat in a chamber: the fractie, led by its fractievoorzitter.
  for (const tree of bundle.trees) {
    if (tree.id === "kabinet" || party) continue;
    const hub = tree.hubs.find((entry) => entry.people.some((person) => person.id === personId));
    if (!hub) continue;
    const leader = hub.people.find((person) => person.leader);
    const head: FocusGroupHead = leader && leader.id !== personId ? { type: "person", id: leader.id } : { type: "party", party: hub.short };
    if (head.type === "person") used.add(head.id);
    party = { key: hub.id, kind: "fractie", hub: hub.id, tree: tree.id, party: hub.short, head, members: take(hub.people.map((person) => person.id)) };
  }

  // A post in the cabinet: the ministry, led by its minister.
  const kabinetPerson = kabinet?.hubs.flatMap((hub) => hub.people).find((person) => person.id === personId) ?? null;
  const ministry = kabinet?.hubs.find((hub) => hub.people.some((person) => person.id === personId)) ?? null;
  if (ministry) {
    const title = ministry.name.replace(/^Ministerie van /, "Minister van ");
    const lead =
      ministry.people.find((person) => person.role === title) ??
      ministry.people.find((person) => /^minister/i.test(person.role ?? "")) ??
      null;
    const head: FocusGroupHead = lead && lead.id !== personId ? { type: "person", id: lead.id } : { type: "ministry", hub: ministry.id };
    if (head.type === "person") used.add(head.id);
    office = { key: ministry.id, kind: "ministry", hub: ministry.id, tree: "kabinet", head, members: take(ministry.people.map((person) => person.id)) };
    used.add(ministry.id);
  }

  // A member of the cabinet without a seat: the party's other bewindspersonen.
  const ownParty = kabinetPerson?.party ?? (kabinet?.head?.id === personId ? kabinet.head.party : undefined);
  if (!party && kabinet && ownParty) {
    const same = kabinet.hubs.flatMap((hub) => hub.people).filter((person) => person.party === ownParty).map((person) => person.id);
    if (kabinet.head?.party === ownParty) same.unshift(kabinet.head.id);
    const members = take(same);
    if (members.length > 0) party = { key: `party:${ownParty}`, kind: "party", party: ownParty, head: { type: "party", party: ownParty }, members };
  }

  // The rest from the connections bundle, in its order of kinds.
  const rest: FocusGroup[] = [];
  for (const group of ties) {
    if (group.kind === "party" && party) {
      // Fractie peers the hierarchy did not list still belong to the fractie.
      party.members.push(...take(group.ties.map((tie) => tie.other)));
      continue;
    }
    let head: FocusGroupHead = { type: "kind" };
    if (group.kind === "cabinet" && kabinet?.head && kabinet.head.id !== personId && !used.has(kabinet.head.id)) {
      head = { type: "person", id: kabinet.head.id };
      used.add(kabinet.head.id);
    }
    const members = take(group.ties.map((tie) => tie.other));
    if (members.length === 0 && head.type === "kind") continue;
    rest.push({ key: `kind:${group.kind}`, kind: group.kind, head, members });
  }
  const sides: FocusGroup[] = [];
  if (party) sides.push(party);
  if (office) sides.push(office);
  // Fill the empty side with the largest remaining group, office before cabinet before news at equal size.
  while (sides.length < 2 && rest.length > 0) {
    let best = 0;
    for (let i = 1; i < rest.length; i += 1) if (rest[i].members.length > rest[best].members.length) best = i;
    sides.push(rest.splice(best, 1)[0]);
  }
  return [...sides, ...rest];
}

/**
 * Fracties in ring order: the largest third by seats, largest first, with the
 * smaller ones dealt round-robin into the gaps after them, so the thin ring
 * segments of small fracties spread around the ring instead of bunching in
 * one corner where their bars would cross.
 */
export function interleaveBySize<T extends { seats?: number }>(hubs: readonly T[]): T[] {
  const sorted = hubs.map((hub, index) => ({ hub, index })).sort((x, y) => (y.hub.seats ?? 0) - (x.hub.seats ?? 0) || x.index - y.index);
  const bigCount = Math.max(1, Math.ceil(sorted.length / 3));
  const big = sorted.slice(0, bigCount);
  const gaps: (typeof sorted)[] = big.map(() => []);
  sorted.slice(bigCount).forEach((entry, index) => gaps[index % bigCount].push(entry));
  return big.flatMap((entry, index) => [entry.hub, ...gaps[index].map((small) => small.hub)]);
}
