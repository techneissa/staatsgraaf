/**
 * The wheel: a second form of the graph canvas (owner's concept of
 * 25-09-2026), beside the tier map in `graph.ts`. The state is a disc of
 * labelled cells instead of a field of marks:
 *
 * - the Grondwet en Statuut in the centre;
 * - three national rings split into four branch wedges: wetgevend (top),
 *   uitvoerend (right), toezicht en advies (bottom), rechtspraak en
 *   controle (left), each wedge filled with its bodies from the core out;
 * - one ring of decentrale overheden around the whole disc (provincies,
 *   gemeenten per provincie, waterschappen, Caribisch Nederland);
 * - one ring for the Koninkrijk (Aruba, Curaçao, Sint Maarten);
 * - the voters as the frame.
 *
 * So the levels still read from the centre outward (Thorbecke), and every
 * cell names what is in it. `buildWheel` is pure: the same bundle always
 * gives the same wheel. Angles are in radians with 0 to the right and the
 * angle growing clockwise, as in SVG; radii are in wheel units, with the
 * frame's outer edge at `WHEEL_RADIUS`.
 */

import type { GraphBundle, WireNode } from "./graph";

export const WHEEL_RADIUS = 480;

/**
 * The rings, with an open lane between them: a group's name sits in that
 * lane, outside its background (the national groups on their inner side,
 * the decentrale and Koninkrijk groups on their outer side, the branch
 * names between the national rings and the decentrale ring).
 */
export const WHEEL_RINGS = {
  core: 56,
  national: [
    [72, 142],
    [156, 226],
    [240, 312],
  ] as const,
  decentraal: [332, 400] as const,
  koninkrijk: [412, 442] as const,
  frame: [456, 476] as const,
};

/** What a cell picks when it is clicked, in the selection store's own terms. */
export type WheelPick = { kind: "org"; id: string } | { kind: "sector"; id: string } | { kind: "cluster"; id: string };

export type WheelItem = {
  id: string;
  label: string;
  name: string;
  subtype: WireNode["subtype"];
  branch: WireNode["branch"];
  /** Bodies it is tied to: its edges, its parent and the bodies under it (the reference's connected nodes). */
  ties: number;
};

/**
 * How much larger a mark is drawn for its ties, in three steps as in the
 * reference (whose departments are 14, 19.5 or 25 units by connected
 * bodies): a body tied to many others reads as a hub at a glance.
 */
export function tieScale(ties: number, head = false): number {
  if (head) return ties >= 40 ? 1.2 : ties >= 15 ? 1 : 0.82;
  return ties >= 10 ? 1.28 : ties >= 3 ? 1.14 : 1;
}

export type WheelCell = {
  id: string;
  title: string;
  /** Number of bodies the cell stands for, shown after the title. */
  count: number | null;
  /** Branch that colours the cell. */
  branch: WireNode["branch"];
  r0: number;
  r1: number;
  a0: number;
  a1: number;
  pick: WheelPick | null;
  /** Bodies named inside the cell, most connected first. */
  items: WheelItem[];
  /** Seat blocks of a chamber, drawn inside its cell. */
  seats?: { color: string | null; seats: number; label: string }[];
  /** A wedge or ring heading rather than a body. */
  heading?: boolean;
  /** The group whose one background the cell shares; its own id when it stands alone. */
  group: string;
  /**
   * A family: the body at the head of the cell (a ministry, a provincie),
   * drawn large at the cell's inner edge, with the cell's items as the
   * bodies that fall under it. At rest they are packed small; the open
   * family draws them full size and takes more of the ring.
   */
  head?: WheelItem;
  /** Room kept at the inner edge for the head. */
  headBand?: number;
  /** Whether this family is open. */
  open?: boolean;
  /** Items are in angular order (from a0 to a1) rather than outer row first. */
  byAngle?: boolean;
};

/** Step between marks of a family at rest, and when it is open. */
export const REST_PITCH = 10;
export const OPEN_PITCH = 24;

/**
 * Cells drawn on one shared background with one name outside it, like the
 * ministries or the gemeenten per provincie. A group of one cell is the cell.
 */
export type WheelGroup = {
  id: string;
  title: string;
  count: number | null;
  branch: WireNode["branch"];
  r0: number;
  r1: number;
  a0: number;
  a1: number;
  /** Which lane the name sits in. */
  label: "inner" | "outer";
  cells: string[];
};

export type WheelModel = {
  cells: WheelCell[];
  groups: WheelGroup[];
  wedges: { id: string; title: string; a0: number; a1: number }[];
  /** For every body in a family, the head of that family; heads map to themselves. */
  familyOf: Record<string, string>;
};

/** Angles a family needs: the least (room for its head), at rest, and open. */
type FamilyNeed = { min: number; rest: number; open: number };

function familyNeed(count: number, r0: number, r1: number, headBand: number, titleBand: number, headPitch: number): FamilyNeed {
  const inner = r0 + headBand;
  const depth = r1 - titleBand - inner - 3;
  const middle = (inner + r1 - titleBand) / 2;
  const need = (pitch: number) => {
    if (count === 0) return 0;
    const rows = Math.max(1, Math.floor(depth / pitch));
    return (Math.ceil(count / rows) * pitch + 6) / middle;
  };
  const min = headPitch > 0 ? (headPitch + 2) / (r0 + headBand / 2) : need(REST_PITCH) * 0.6;
  return { min, rest: Math.max(min, need(REST_PITCH)), open: Math.max(min, need(OPEN_PITCH)) };
}

/**
 * Share [a0, a1] among families, the open one first: it gets what it needs
 * full size, up to what the others can give while keeping room for their
 * heads, so opening one family pushes its neighbours aside a little and
 * never over each other. What is left is shared in proportion.
 */
function allocate(a0: number, a1: number, needs: readonly FamilyNeed[], open: number): [number, number][] {
  const span = a1 - a0 - GAP * Math.max(0, needs.length - 1);
  const want = needs.map((need, index) => (index === open ? need.open : need.rest));
  if (open >= 0) {
    const othersMin = needs.reduce((sum, need, index) => (index === open ? sum : sum + need.min), 0);
    want[open] = Math.min(want[open], Math.max(needs[open].min, span - othersMin));
  }
  let total = want.reduce((sum, value) => sum + value, 0);
  if (total > span) {
    // Squeeze the closed families toward their least, evenly.
    const room = span - (open >= 0 ? want[open] : 0);
    const closed = needs.map((need, index) => (index === open ? null : need));
    const least = closed.reduce((sum, need) => sum + (need ? need.min : 0), 0);
    const spare = closed.reduce((sum, need, index) => sum + (need ? want[index] - need.min : 0), 0);
    const k = spare > 0 ? Math.max(0, (room - least) / spare) : 0;
    closed.forEach((need, index) => {
      if (need) want[index] = need.min + (want[index] - need.min) * Math.min(1, k);
    });
    total = want.reduce((sum, value) => sum + value, 0);
  }
  const scale = total > 0 ? span / total : 1;
  const out: [number, number][] = [];
  let at = a0;
  for (const value of want) {
    out.push([at, at + value * scale]);
    at += value * scale + GAP;
  }
  return out;
}

const deg = (value: number) => (value * Math.PI) / 180;
/**
 * Cells share their boundaries: the gutter between groups is drawn by the
 * component as an even width (`WHEEL_GUTTER`), not as an angle, so it does
 * not widen toward the rim.
 */
const GAP = 0;
export const WHEEL_GUTTER = 12;

/** Split [a0, a1] into parts by weight, with a small gap between them. */
function split(a0: number, a1: number, weights: readonly number[], gap = GAP): [number, number][] {
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const usable = a1 - a0 - gap * Math.max(0, weights.length - 1);
  const out: [number, number][] = [];
  let at = a0;
  for (const weight of weights) {
    const span = (usable * weight) / total;
    out.push([at, at + span]);
    at += span + gap;
  }
  return out;
}

/** A body's short label: its abbreviation where one is on record, else its name without the type prefix. */
export function shortLabel(node: Pick<WireNode, "id" | "name">, shortNames: Record<string, string> | undefined): string {
  const short = shortNames?.[node.id];
  if (short) return short;
  return node.name
    .replace(/^(Ministerie van|Ministry of|Gemeente|Provincie|Waterschap|Hoogheemraadschap van|Hoogheemraadschap|Wetterskip|Inspectie|Rechtbank|Gerechtshof|Openbaar lichaam)\s+/i, "")
    .replace(/\s*\((Curaçao|Aruba|Sint Maarten)\)$/, "");
}

const byDegree = (a: WireNode, b: WireNode) => b.degree - a.degree || a.name.localeCompare(b.name, "nl");

/** Head band and head size of a ministry family, and of a provincie family in the thinner decentrale ring. */
const MINISTRY_HEAD = { band: 30, pitch: 24 };
const PROVINCIE_HEAD = { band: 22, pitch: 18 };
/** Room for a part's name inside a group of several parts (the component draws it there). */
const PART_TITLE = 15;
/** Order of kinds inside a ministry family, so like shapes sit together. */
const FAMILY_ORDER = ["inspectie", "agentschap", "uitvoeringsorganisatie", "zbo", "rwt"];

/**
 * The wheel for a bundle. `open` is the head of the family to draw open
 * (a ministry or a provincie id), or null for all families at rest.
 */
export function buildWheel(
  bundle: Pick<GraphBundle, "nodes" | "edges" | "clusters" | "chambers" | "shortNames">,
  open: string | null = null,
): WheelModel {
  const nodes = bundle.nodes.filter((node) => node.sector !== "frame" && !node.id.startsWith("org:kiesgerechtigden"));
  const inSector = (sector: string, filter: (node: WireNode) => boolean = () => true) =>
    nodes.filter((node) => node.sector === sector && filter(node)).sort(byDegree);
  const childCount = new Map<string, number>();
  for (const node of bundle.nodes) if (node.parent) childCount.set(node.parent, (childCount.get(node.parent) ?? 0) + 1);
  const item = (node: WireNode): WheelItem => ({
    id: node.id,
    label: shortLabel(node, bundle.shortNames),
    name: node.name,
    subtype: node.subtype,
    branch: node.branch,
    ties: node.degree + (childCount.get(node.id) ?? 0) + (node.parent ? 1 : 0),
  });
  const cells: (Omit<WheelCell, "group"> & { group?: string })[] = [];
  /** Titles of the groups of more than one cell; the others take their cell's. */
  const groupTitles: Record<string, { title: string; count: number | null }> = {};
  const familyOf: Record<string, string> = {};
  const [n1, n2, n3] = WHEEL_RINGS.national;

  // The four branch wedges of the national rings, clockwise from the top.
  const W = {
    leg: [deg(-130), deg(-51)] as const,
    exec: [deg(-51), deg(105)] as const,
    adv: [deg(105), deg(139)] as const,
    jud: [deg(139), deg(230)] as const,
  };
  const wedges = [
    { id: "leg", title: "Wetgevende macht", a0: W.leg[0], a1: W.leg[1] },
    { id: "exec", title: "Uitvoerende macht", a0: W.exec[0], a1: W.exec[1] },
    { id: "adv", title: "Advies", a0: W.adv[0], a1: W.adv[1] },
    { id: "jud", title: "Rechtspraak en controle", a0: W.jud[0], a1: W.jud[1] },
  ];

  // Wetgevende macht: the two chambers as their halls, each with its commissies beneath it.
  const sg = inSector("staten-generaal");
  const chamberIds = ["org:tweede-kamer", "org:eerste-kamer"];
  const commissiesOf = (id: string, index: number) =>
    sg.filter((node) => node.subtype === "commissie" && (node.parent === id || (index === 0 && !chamberIds.includes(node.parent ?? ""))));
  split(W.leg[0], W.leg[1], [150, 110]).forEach(([a0, a1], index) => {
    const id = chamberIds[index];
    const node = nodes.find((entry) => entry.id === id);
    const seats = bundle.chambers[id];
    const commissies = commissiesOf(id, index);
    cells.push({
      id: `commissies-${id}`,
      title: "Commissies",
      count: commissies.length,
      branch: "staten-generaal",
      r0: n1[0],
      r1: n1[1],
      a0,
      a1,
      pick: { kind: "org", id },
      items: commissies.map(item),
      group: "staten-generaal",
    });
    cells.push({
      id,
      title: node?.name.replace(/ der Staten-Generaal$/, "") ?? id,
      count: seats?.total ?? null,
      branch: "staten-generaal",
      r0: n2[0],
      r1: n3[1],
      a0,
      a1,
      pick: { kind: "org", id },
      items: [],
      seats: seats?.entries.map((entry) => ({ color: entry.color, seats: entry.seats, label: entry.label })),
      group: "staten-generaal",
    });
  });
  groupTitles["staten-generaal"] = { title: "Staten-Generaal", count: null };

  // Uitvoerende macht: the regering, then every ministry as a family with the bodies that fall under it.
  const ministries = inSector("ministeries").sort((a, b) => shortLabel(a, bundle.shortNames).localeCompare(shortLabel(b, bundle.shortNames), "nl"));
  const ministryIds = new Set(ministries.map((node) => node.id));
  const parentless = nodes.filter((node) => node.sector === "uitvoering" && !(node.parent && ministryIds.has(node.parent)));
  const regering = [...inSector("regering"), ...parentless.sort(byDegree)];
  cells.push({
    id: "regering",
    title: "Regering",
    count: null,
    branch: "regering",
    r0: n1[0],
    r1: n1[1],
    a0: W.exec[0],
    a1: W.exec[1],
    pick: { kind: "sector", id: "regering" },
    items: regering.map(item),
  });
  const kindRank = (node: WireNode) => {
    const rank = FAMILY_ORDER.indexOf(node.subtype);
    return rank < 0 ? FAMILY_ORDER.length : rank;
  };
  const families = ministries.map((ministry) => ({
    ministry,
    members: nodes
      .filter((node) => node.parent === ministry.id && ["uitvoering", "zelfstandig", "inspecties"].includes(node.sector))
      .sort((a, b) => kindRank(a) - kindRank(b) || byDegree(a, b)),
  }));
  const ministryNeeds = families.map(({ members }) => familyNeed(members.length, n2[0], n3[1], MINISTRY_HEAD.band, PART_TITLE, MINISTRY_HEAD.pitch));
  const openMinistry = families.findIndex(({ ministry }) => ministry.id === open);
  allocate(W.exec[0], W.exec[1], ministryNeeds, openMinistry).forEach(([a0, a1], index) => {
    const { ministry, members } = families[index];
    familyOf[ministry.id] = ministry.id;
    for (const member of members) familyOf[member.id] = ministry.id;
    cells.push({
      id: `familie:${ministry.id}`,
      title: shortLabel(ministry, bundle.shortNames),
      count: members.length,
      branch: ministry.branch,
      r0: n2[0],
      r1: n3[1],
      a0,
      a1,
      pick: { kind: "org", id: ministry.id },
      items: members.map(item),
      head: item(ministry),
      headBand: MINISTRY_HEAD.band,
      open: index === openMinistry,
      group: "ministeries",
    });
  });
  groupTitles.ministeries = { title: "Ministeries", count: ministries.length };

  // Advies: the vaste adviescolleges, the planbureaus and the Kiesraad, independent in what they advise.
  // Each sits toward the ministry it advises, so its tie is short: the ministries nearest the wedge first.
  const ministryAngle = new Map<string, number>();
  for (const cell of cells) if (cell.head && cell.group === "ministeries") ministryAngle.set(cell.head.id, (cell.a0 + cell.a1) / 2);
  const advisedAngle = (node: WireNode) => {
    const edge = bundle.edges.find((entry) => entry.type === "advises" && entry.from === node.id && ministryAngle.has(entry.to));
    const target = edge?.to ?? (node.parent && ministryAngle.has(node.parent) ? node.parent : null);
    return target ? ministryAngle.get(target)! : -Infinity;
  };
  const advies = inSector("advies").sort((a, b) => advisedAngle(b) - advisedAngle(a) || byDegree(a, b));
  cells.push({
    id: "advies",
    title: "Advies en planbureaus",
    count: advies.length,
    branch: advies[0]?.branch ?? "adviescolleges",
    r0: n1[0],
    r1: n3[1],
    a0: W.adv[0],
    a1: W.adv[1],
    pick: { kind: "sector", id: "advies" },
    items: advies.map(item),
    byAngle: true,
  });

  // Rechtspraak en controle: the Hoge Colleges, then the courts by instance.
  const hoge = inSector("hoge-colleges").sort((a, b) => a.name.localeCompare(b.name, "nl"));
  cells.push({
    id: "hoge-colleges",
    title: "Hoge Colleges",
    count: hoge.length,
    branch: hoge[0]?.branch ?? "hoge-colleges",
    r0: n1[0],
    r1: n1[1],
    a0: W.jud[0],
    a1: W.jud[1],
    pick: { kind: "sector", id: "hoge-colleges" },
    items: hoge.map(item),
  });
  const courts = inSector("rechterlijke-macht");
  const courtGroups: { id: string; title: string; test: (node: WireNode) => boolean }[] = [
    { id: "hoge-raad", title: "Hoge Raad", test: (node) => /Hoge Raad/.test(node.name) },
    { id: "gerechtshoven", title: "Gerechtshoven", test: (node) => /^Gerechtshof/.test(node.name) },
    { id: "rechtbanken", title: "Rechtbanken", test: (node) => /^Rechtbank/.test(node.name) },
    { id: "overig", title: "Bijzondere colleges en OM", test: () => true },
  ];
  const courtLists = courtGroups.map(() => [] as WireNode[]);
  for (const node of courts) courtLists[courtGroups.findIndex((group) => group.test(node))].push(node);
  split(W.jud[0], W.jud[1], courtLists.map((list) => Math.max(1.4, Math.sqrt(list.length)))).forEach(([a0, a1], index) => {
    cells.push({
      id: `rechtspraak-${courtGroups[index].id}`,
      title: courtGroups[index].title,
      count: courtLists[index].length,
      branch: "rechterlijke-macht",
      r0: n2[0],
      r1: n3[1],
      a0,
      a1,
      pick: { kind: "sector", id: "rechterlijke-macht" },
      items: courtLists[index].map(item),
      group: "rechtspraak",
    });
  });
  groupTitles.rechtspraak = { title: "Rechtspraak", count: courts.length };

  // Decentrale overheden: every provincie with the gemeenten it oversees, then the regional bodies,
  // the waterschappen and Caribisch Nederland, one ring around the disc from the top.
  const [d0, d1] = WHEEL_RINGS.decentraal;
  const gemeenteGroups = bundle.clusters
    .filter((cluster) => cluster.sector === "gemeenten")
    .map((cluster) => {
      const members = nodes.filter((node) => node.sector === "gemeenten" && inCluster(bundle, node, cluster.id));
      const parent = cluster.parent ? nodes.find((node) => node.id === cluster.parent) ?? null : null;
      const head = cluster.kind === "oversight" && parent?.subtype === "provincie" ? parent : null;
      const title = head
        ? head.name.replace(/^Provincie /, "")
        : cluster.subtype === "veiligheidsregio"
          ? "Veiligheidsregio's"
          : cluster.subtype === "samenwerkingsverband"
            ? "Samenwerking"
            : cluster.id;
      return { id: cluster.id, title, members: members.sort(byDegree), head };
    })
    .sort((a, b) => Number(Boolean(b.head)) - Number(Boolean(a.head)) || a.title.localeCompare(b.title, "nl"));
  const waterschappen = inSector("waterschappen", (node) => node.subtype === "waterschap");
  // The openbare lichamen and the Rijksvertegenwoordiger; a raad or bestuurscollege stands in for its openbaar lichaam.
  const caribisch = inSector("caribisch", (node) => !node.parent);
  const top = deg(-130);
  const decentraalNeeds = [
    ...gemeenteGroups.map((group) =>
      familyNeed(group.members.length, d0, d1, group.head ? PROVINCIE_HEAD.band : 0, PART_TITLE, group.head ? PROVINCIE_HEAD.pitch : 0),
    ),
    familyNeed(waterschappen.length, d0, d1, 0, 3, 0),
    familyNeed(caribisch.length, d0, d1, 0, 3, 0),
  ].map((need, index, list) =>
    // The single cells carry full-size shapes: give them their full-size room at rest too.
    index >= list.length - 2 ? { min: need.open, rest: need.open, open: need.open } : need,
  );
  const openProvincie = gemeenteGroups.findIndex((group) => group.head?.id === open);
  const arcs = allocate(top, top + Math.PI * 2 - GAP, decentraalNeeds, openProvincie);
  gemeenteGroups.forEach((group, index) => {
    const [a0, a1] = arcs[index];
    if (group.head) {
      familyOf[group.head.id] = group.head.id;
      for (const member of group.members) familyOf[member.id] = group.head.id;
    }
    cells.push({
      id: group.id,
      title: group.title,
      count: group.members.length,
      branch: group.members[0]?.branch ?? "decentraal-lokaal",
      r0: d0,
      r1: d1,
      a0,
      a1,
      pick: group.head ? { kind: "org", id: group.head.id } : { kind: "cluster", id: group.id },
      items: group.members.map(item),
      ...(group.head ? { head: item(group.head), headBand: PROVINCIE_HEAD.band, open: index === openProvincie } : {}),
      group: "gemeenten",
    });
  });
  groupTitles.gemeenten = { title: "Provincies en gemeenten", count: null };
  const [wsArc, carArc] = arcs.slice(gemeenteGroups.length);
  cells.push({
    id: "waterschappen",
    title: "Waterschappen",
    count: waterschappen.length,
    branch: waterschappen[0]?.branch ?? "waterschap",
    r0: d0,
    r1: d1,
    a0: wsArc[0],
    a1: wsArc[1],
    pick: { kind: "sector", id: "waterschappen" },
    items: waterschappen.map(item),
  });
  cells.push({
    id: "caribisch",
    title: "Caribisch Nederland",
    count: caribisch.length,
    branch: caribisch[0]?.branch ?? "caribisch-nederland",
    r0: d0,
    r1: d1,
    a0: carArc[0],
    a1: carArc[1],
    pick: { kind: "sector", id: "caribisch" },
    items: caribisch.map(item),
  });

  // Koninkrijk: one cell per land, from the regering or staten it belongs to,
  // and one cell for the bodies of the Kingdom as a whole (the Rijksministerraad).
  const [k0, k1] = WHEEL_RINGS.koninkrijk;
  const KINGDOM = "Koninkrijk";
  const koninkrijk = inSector("koninkrijk");
  const landNames = ["Aruba", "Curaçao", "Sint Maarten"];
  const nameLand = (name: string): string | null => {
    const found = landNames.filter((land) => name.includes(land));
    return found.length === 1 ? found[0] : null;
  };
  const byIdAll = new Map(bundle.nodes.map((node) => [node.id, node]));
  const landOf = (node: WireNode): string => {
    const own = nameLand(node.name);
    if (own) return own;
    // A ministry of a land belongs to its regering: by the parent line, or by its part_of edge.
    const wholes = [node.parent, ...bundle.edges.filter((edge) => edge.type === "part_of" && edge.from === node.id).map((edge) => edge.to)];
    for (const whole of wholes) {
      const land = whole ? nameLand(byIdAll.get(whole)?.name ?? "") : null;
      if (land) return land;
    }
    return KINGDOM;
  };
  const kingdomWide = koninkrijk.some((node) => landOf(node) === KINGDOM);
  const lands = kingdomWide ? [KINGDOM, ...landNames] : landNames;
  split(top, top + Math.PI * 2 - GAP, lands.map((land) => (land === KINGDOM ? 0.5 : 1))).forEach(([a0, a1], index) => {
    const land = lands[index];
    const list = koninkrijk.filter((node) => landOf(node) === land);
    cells.push({
      id: `koninkrijk-${land}`,
      title: land,
      count: list.length,
      branch: list[0]?.branch ?? "koninkrijk",
      r0: k0,
      r1: k1,
      a0,
      a1,
      pick: { kind: "sector", id: "koninkrijk" },
      items: list.map(item),
      group: "koninkrijk",
    });
  });
  groupTitles.koninkrijk = { title: "Koninkrijk", count: koninkrijk.length };

  const placed: WheelCell[] = cells.map((cell) => ({ ...cell, group: cell.group ?? cell.id }));
  const groups: WheelGroup[] = [];
  for (const cell of placed) {
    const existing = groups.find((group) => group.id === cell.group);
    if (existing) {
      existing.r0 = Math.min(existing.r0, cell.r0);
      existing.r1 = Math.max(existing.r1, cell.r1);
      existing.a0 = Math.min(existing.a0, cell.a0);
      existing.a1 = Math.max(existing.a1, cell.a1);
      existing.cells.push(cell.id);
      continue;
    }
    const named = groupTitles[cell.group];
    groups.push({
      id: cell.group,
      title: named?.title ?? cell.title,
      count: named ? named.count : cell.count,
      branch: cell.branch,
      r0: cell.r0,
      r1: cell.r1,
      a0: cell.a0,
      a1: cell.a1,
      label: cell.r0 >= d0 ? "outer" : "inner",
      cells: [cell.id],
    });
  }

  return { cells: placed, groups, wedges, familyOf };
}

/** Whether a node is a member of a cluster; members carry the cluster id through the layout only on the client, so decide from the data. */
function inCluster(bundle: Pick<GraphBundle, "edges" | "clusters">, node: WireNode, clusterId: string): boolean {
  const cluster = bundle.clusters.find((entry) => entry.id === clusterId);
  if (!cluster) return false;
  if (cluster.kind === "oversight" && cluster.parent) {
    return node.subtype === "gemeente" && bundle.edges.some((edge) => edge.type === "oversees" && edge.from === cluster.parent && edge.to === node.id);
  }
  if (cluster.kind === "subtype") return node.subtype === cluster.subtype;
  return node.parent === cluster.parent;
}


export type WheelMark = { id: string; x: number; y: number; r: number };

/**
 * Where a cell's bodies sit: curved rows that follow the cell, filled from
 * the outside in, every row centred along its arc, the marks as large as
 * the count allows up to `maxPitch`. `titleBand` is kept free at the outer
 * edge for the cell's name.
 */
/**
 * Marks spread over the whole cell, the way the reference spreads its
 * commissions evenly along a ring: as many rows as keep the step along the
 * ring close to the step across it, each row filled end to end. Null when
 * the count does not fit at `pitch`.
 */
function spreadMarks(cell: Pick<WheelCell, "r0" | "r1" | "a0" | "a1">, count: number, inner: number, outer: number, pitch: number) {
  const depth = outer - inner;
  let best: { score: number; slots: { angle: number; radius: number }[] } | null = null;
  for (let k = 1; k <= Math.max(1, Math.floor(depth / pitch)); k += 1) {
    const radii = Array.from({ length: k }, (_, index) => outer - (index + 0.5) * (depth / k));
    const arcs = radii.map((radius) => (cell.a1 - cell.a0) * radius - 4);
    const capacity = arcs.map((arc) => Math.max(0, Math.floor(arc / pitch)));
    if (capacity.reduce((sum, value) => sum + value, 0) < count) continue;
    const total = arcs.reduce((sum, arc) => sum + arc, 0);
    const take = arcs.map((arc, index) => Math.min(capacity[index], Math.floor((arc / total) * count)));
    let left = count - take.reduce((sum, value) => sum + value, 0);
    for (let pass = 0; left > 0 && pass < k * 4; pass += 1) {
      const index = pass % k;
      if (take[index] < capacity[index]) {
        take[index] += 1;
        left -= 1;
      }
    }
    if (left > 0) continue;
    const along = Math.min(...take.map((value, index) => (value > 0 ? arcs[index] / value : Infinity)));
    const across = depth / k;
    if (across < pitch * 0.95) continue;
    const score = Math.abs(Math.log(along / across));
    if (best && best.score <= score) continue;
    const slots: { angle: number; radius: number }[] = [];
    take.forEach((value, index) => {
      const span = arcs[index] / radii[index];
      const start = (cell.a0 + cell.a1) / 2 - span / 2;
      for (let j = 0; j < value; j += 1) slots.push({ angle: start + ((j + 0.5) * span) / value, radius: radii[index] });
    });
    best = { score, slots };
  }
  return best?.slots ?? null;
}

export function cellMarks(
  cell: Pick<WheelCell, "r0" | "r1" | "a0" | "a1">,
  ids: readonly string[],
  titleBand: number,
  maxPitch = 30,
  options: { spread?: boolean; byAngle?: boolean } = {},
): WheelMark[] {
  const count = ids.length;
  if (count === 0) return [];
  const inner = cell.r0 + 3;
  const outer = cell.r1 - titleBand;
  const depth = outer - inner;
  if (depth <= 1) return [];
  if (options.spread) {
    // The largest step that still fits, then the marks spread over the whole cell at that size.
    for (let pitch = Math.min(maxPitch, depth); pitch > 2.5; pitch *= 0.94) {
      const slots = spreadMarks(cell, count, inner, outer, pitch);
      if (!slots) continue;
      const ordered = options.byAngle ? [...slots].sort((a, b) => a.angle - b.angle) : slots;
      return ordered.map((slot, index) => ({ id: ids[index], x: Math.cos(slot.angle) * slot.radius, y: Math.sin(slot.angle) * slot.radius, r: pitch * 0.4 }));
    }
  }
  const rowsFor = (pitch: number) => {
    const rows = Math.max(1, Math.floor(depth / pitch));
    const offset = (depth - rows * pitch) / 2;
    const out: { radius: number; capacity: number }[] = [];
    for (let row = 0; row < rows; row += 1) {
      const radius = outer - offset - pitch / 2 - row * pitch;
      const capacity = Math.max(0, Math.floor(((cell.a1 - cell.a0) * radius - 4) / pitch));
      out.push({ radius, capacity });
    }
    return out;
  };
  let pitch = Math.min(maxPitch, depth);
  let rows = rowsFor(pitch);
  while (rows.reduce((sum, row) => sum + row.capacity, 0) < count && pitch > 2.5) {
    pitch *= 0.94;
    rows = rowsFor(pitch);
  }
  // Only as many rows as the count needs, then the count spread over them by capacity.
  const used: typeof rows = [];
  let room = 0;
  for (const row of rows) {
    if (room >= count) break;
    used.push(row);
    room += row.capacity;
  }
  const total = used.reduce((sum, row) => sum + row.capacity, 0) || 1;
  const quota = used.map((row) => (row.capacity * count) / total);
  const take = quota.map(Math.floor);
  let left = count - take.reduce((sum, value) => sum + value, 0);
  const order = quota.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest || a.index - b.index);
  for (const { index } of order) {
    if (left <= 0) break;
    if (take[index] < used[index].capacity) {
      take[index] += 1;
      left -= 1;
    }
  }
  // Centre the rows actually used across the band.
  const shift = ((rows.length - used.length) * pitch) / 2;
  const mid = (cell.a0 + cell.a1) / 2;
  const marks: WheelMark[] = [];
  let at = 0;
  used.forEach((row, index) => {
    const radius = row.radius - shift;
    for (let j = 0; j < take[index] && at < count; j += 1) {
      const angle = mid + ((j - (take[index] - 1) / 2) * pitch) / radius;
      marks.push({ id: ids[at], x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, r: pitch * 0.4 });
      at += 1;
    }
  });
  return marks;
}

/** How two bodies on the wheel are tied, in the terms of the graph's edges plus the parent line. */
export type WheelLinkType =
  | "elects"
  | "oversees"
  | "advises"
  | "accountable_to"
  | "part_of"
  | "appoints"
  | "confirms"
  | "joint_arrangement_member"
  /** A member's seat on a body (a Kamercommissie), drawn only from a picked seat. */
  | "member_of"
  /** A member's post at a body (a commissie chair, a burgemeester), drawn only from a picked seat. */
  | "holds_post";

const WHEEL_LINK_TYPES: ReadonlySet<string> = new Set<WheelLinkType>([
  "elects",
  "oversees",
  "advises",
  "accountable_to",
  "part_of",
  "appoints",
  "confirms",
  "joint_arrangement_member",
]);

/** One tie of the selected body: the other end (a drawn body, or the voters at the rim) and which way it points. */
export type WheelLink = { other: string; type: WheelLinkType; outgoing: boolean };

/** The id that stands for the voters: their ties are drawn from the rim. */
export const WHEEL_VOTERS = "voters";

/** The drawn body that stands for `id`: itself, or the nearest drawn body it belongs to; the voters stand for the electorate. */
function wheelResolver(byId: ReadonlyMap<string, { parent: string | null; subtype: string }>, drawn: ReadonlySet<string>) {
  return (id: string): string | null => {
    let at: string | null | undefined = id;
    for (let step = 0; at && step < 4; step += 1) {
      if (drawn.has(at)) return at;
      const node = byId.get(at);
      if (!node) return null;
      if (node.subtype === "kiesgerechtigden-nederland") return WHEEL_VOTERS;
      at = node.parent;
    }
    return null;
  };
}

/**
 * The ties of one body as the wheel can draw them. A body the wheel does not
 * draw on its own (a gemeenteraad, provinciale staten, a gemeente's
 * commissie) stands in for the body it belongs to, so the voters electing a
 * gemeenteraad show as a tie to its gemeente, and provinciale staten
 * electing the Eerste Kamer as a tie from the provincie. Ties inside one
 * drawn body fall away, and each pair is drawn once.
 */
export function wheelLinks(
  bundle: Pick<GraphBundle, "nodes" | "edges">,
  selectedId: string,
  drawn: ReadonlySet<string>,
): { self: string | null; links: WheelLink[] } {
  const byId = new Map(bundle.nodes.map((node) => [node.id, node]));
  const resolve = wheelResolver(byId, drawn);
  const self = resolve(selectedId);
  if (!self || self === WHEEL_VOTERS) return { self, links: [] };
  const links = new Map<string, WheelLink>();
  const add = (other: string | null, type: WheelLinkType, outgoing: boolean) => {
    if (!other || other === self || links.has(other)) return;
    links.set(other, { other, type, outgoing });
  };
  for (const edge of bundle.edges) {
    const from = resolve(edge.from);
    const to = resolve(edge.to);
    if (from === to) continue;
    const type = edge.type === "consists_of" ? "part_of" : edge.type;
    // A type the wheel has no line for is not drawn rather than drawn wrong.
    if (!WHEEL_LINK_TYPES.has(type)) continue;
    const kind = type as WheelLinkType;
    // consists_of runs from the whole to its part; part_of from the part to the whole.
    if (from === self) add(to, kind, edge.type !== "consists_of");
    else if (to === self) add(from, kind, edge.type === "consists_of");
  }
  // The parent line: the body it falls under, and the bodies that fall under it.
  const parent = byId.get(self)?.parent;
  if (parent) add(resolve(parent), "part_of", true);
  for (const node of bundle.nodes) if (node.parent === self) add(resolve(node.id), "part_of", false);
  return { self, links: [...links.values()].sort((a, b) => a.other.localeCompare(b.other)) };
}

/**
 * The ties of one member of a Kamer, drawn from their own seat in the hall:
 * how they got the seat (the chamber's elects ties, from the voters for the
 * Tweede Kamer and from provinciale staten for the Eerste Kamer) and their
 * current seats and posts on other bodies (`seatTies` in graph.json), each to
 * the drawn body that stands for it. A tie to the member's own chamber falls
 * away, as a body's ties to itself do.
 */
export function seatLinks(
  bundle: Pick<GraphBundle, "nodes" | "edges" | "seatTies">,
  personId: string,
  chamberId: string,
  drawn: ReadonlySet<string>,
): WheelLink[] {
  const byId = new Map(bundle.nodes.map((node) => [node.id, node]));
  const resolve = wheelResolver(byId, drawn);
  const links = new Map<string, WheelLink>();
  for (const link of wheelLinks(bundle, chamberId, drawn).links) {
    if (link.type === "elects" && !link.outgoing) links.set(link.other, link);
  }
  for (const [organization, kind] of bundle.seatTies?.[personId] ?? []) {
    const other = resolve(organization);
    if (!other || other === chamberId) continue;
    const type: WheelLinkType = kind === "post" ? "holds_post" : "member_of";
    const known = links.get(other);
    // Several bodies standing in for one drawn body: a post outweighs a seat.
    if (!known || (known.type === "member_of" && type === "holds_post")) links.set(other, { other, type, outgoing: true });
  }
  return [...links.values()].sort((a, b) => a.other.localeCompare(b.other));
}
