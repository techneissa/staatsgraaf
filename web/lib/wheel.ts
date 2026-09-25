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
  decentraal: [332, 392] as const,
  koninkrijk: [406, 440] as const,
  frame: [456, 476] as const,
};

/** What a cell picks when it is clicked, in the selection store's own terms. */
export type WheelPick = { kind: "org"; id: string } | { kind: "sector"; id: string } | { kind: "cluster"; id: string };

export type WheelItem = { id: string; label: string; name: string; subtype: WireNode["subtype"]; branch: WireNode["branch"] };

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
};

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

export type WheelModel = { cells: WheelCell[]; groups: WheelGroup[]; wedges: { id: string; title: string; a0: number; a1: number }[] };

const deg = (value: number) => (value * Math.PI) / 180;
const GAP = deg(0.9);

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

export function buildWheel(bundle: Pick<GraphBundle, "nodes" | "edges" | "clusters" | "chambers" | "shortNames">): WheelModel {
  const nodes = bundle.nodes.filter((node) => node.sector !== "frame" && !node.id.startsWith("org:kiesgerechtigden"));
  const inSector = (sector: string, filter: (node: WireNode) => boolean = () => true) =>
    nodes.filter((node) => node.sector === sector && filter(node)).sort(byDegree);
  const item = (node: WireNode): WheelItem => ({
    id: node.id,
    label: shortLabel(node, bundle.shortNames),
    name: node.name,
    subtype: node.subtype,
    branch: node.branch,
  });
  /** Bodies with a known abbreviation first (they fit and are recognised), then by connections. */
  const known = (list: WireNode[]) => [...list].sort((a, b) => Number(Boolean(bundle.shortNames?.[b.id])) - Number(Boolean(bundle.shortNames?.[a.id])) || byDegree(a, b));
  const cells: (Omit<WheelCell, "group"> & { group?: string })[] = [];
  /** Titles of the groups of more than one cell; the others take their cell's. */
  const groupTitles: Record<string, { title: string; count: number | null }> = {};
  const [n1, n2, n3] = WHEEL_RINGS.national;

  // The four branch wedges of the national rings, clockwise from the top.
  const W = {
    leg: [deg(-130), deg(-52)] as const,
    exec: [deg(-50), deg(84)] as const,
    tox: [deg(86), deg(138)] as const,
    jud: [deg(140), deg(228)] as const,
  };
  const wedges = [
    { id: "leg", title: "Wetgevende macht", a0: W.leg[0], a1: W.leg[1] },
    { id: "exec", title: "Uitvoerende macht", a0: W.exec[0], a1: W.exec[1] },
    { id: "tox", title: "Toezicht en advies", a0: W.tox[0], a1: W.tox[1] },
    { id: "jud", title: "Rechtspraak en controle", a0: W.jud[0], a1: W.jud[1] },
  ];

  // Wetgevende macht: the Staten-Generaal, then the two chambers with their seats.
  const sg = inSector("staten-generaal");
  const commissies = sg.filter((node) => node.subtype === "commissie");
  cells.push({
    id: "staten-generaal",
    title: "Commissies",
    count: commissies.length,
    branch: "staten-generaal",
    r0: n1[0],
    r1: n1[1],
    a0: W.leg[0],
    a1: W.leg[1],
    pick: { kind: "sector", id: "staten-generaal" },
    items: commissies.map(item),
    group: "staten-generaal",
  });
  groupTitles["staten-generaal"] = { title: "Staten-Generaal", count: null };
  const chamberIds = ["org:tweede-kamer", "org:eerste-kamer"];
  split(W.leg[0], W.leg[1], [150, 110]).forEach(([a0, a1], index) => {
    const id = chamberIds[index];
    const node = nodes.find((entry) => entry.id === id);
    const seats = bundle.chambers[id];
    const commissies = sg.filter((entry) => entry.parent === id).length;
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
      ...(commissies > 0 ? { heading: false } : {}),
      group: "staten-generaal",
    });
  });

  // Uitvoerende macht: the regering, the ministries, then what works under them.
  const regering = inSector("regering");
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
  // The ministries together, one shield each, in the order of their short names.
  const ministries = inSector("ministeries").sort((a, b) => shortLabel(a, bundle.shortNames).localeCompare(shortLabel(b, bundle.shortNames), "nl"));
  cells.push({
    id: "ministeries",
    title: "Ministeries",
    count: ministries.length,
    branch: ministries[0]?.branch ?? "regering",
    r0: n2[0],
    r1: n2[1],
    a0: W.exec[0],
    a1: W.exec[1],
    pick: { kind: "sector", id: "ministeries" },
    items: ministries.map(item),
  });
  const uitvoering = inSector("uitvoering");
  const zelfstandig = inSector("zelfstandig");
  split(W.exec[0], W.exec[1], [Math.sqrt(uitvoering.length), Math.sqrt(zelfstandig.length)]).forEach(([a0, a1], index) => {
    const list = index === 0 ? uitvoering : zelfstandig;
    cells.push({
      id: index === 0 ? "uitvoering" : "zelfstandig",
      title: index === 0 ? "Agentschappen en diensten" : "Zbo's en rwt's",
      count: list.length,
      branch: list[0]?.branch ?? "regering",
      r0: n3[0],
      r1: n3[1],
      a0,
      a1,
      pick: { kind: "sector", id: index === 0 ? "uitvoering" : "zelfstandig" },
      items: known(list).map(item),
    });
  });

  // Toezicht en advies.
  const inspecties = inSector("inspecties");
  const advies = inSector("advies");
  cells.push({
    id: "inspecties",
    title: "Inspecties",
    count: inspecties.length,
    branch: inspecties[0]?.branch ?? "regering",
    r0: n1[0],
    r1: n2[1],
    a0: W.tox[0],
    a1: W.tox[1],
    pick: { kind: "sector", id: "inspecties" },
    items: known(inspecties).map(item),
  });
  cells.push({
    id: "advies",
    title: "Advies en planbureaus",
    count: advies.length,
    branch: advies[0]?.branch ?? "adviescolleges",
    r0: n3[0],
    r1: n3[1],
    a0: W.tox[0],
    a1: W.tox[1],
    pick: { kind: "sector", id: "advies" },
    items: known(advies).map(item),
  });

  // Rechtspraak en controle: the Hoge Colleges, then the courts in four groups.
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

  // Decentrale overheden: one ring around the whole disc, from the top.
  const [d0, d1] = WHEEL_RINGS.decentraal;
  const provincies = inSector("provincies", (node) => node.subtype === "provincie").sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const gemeenteGroups = bundle.clusters
    .filter((cluster) => cluster.sector === "gemeenten")
    .map((cluster) => {
      const members = nodes.filter((node) => node.sector === "gemeenten" && inCluster(bundle, node, cluster.id));
      const parent = cluster.parent ? nodes.find((node) => node.id === cluster.parent) ?? null : null;
      const title =
        cluster.kind === "oversight" && parent
          ? parent.name.replace(/^Provincie /, "")
          : cluster.subtype === "veiligheidsregio"
            ? "Veiligheidsregio's"
            : cluster.subtype === "samenwerkingsverband"
              ? "Samenwerking"
              : cluster.id;
      return { id: cluster.id, title, members: members.sort(byDegree), oversight: cluster.kind === "oversight" };
    })
    .sort((a, b) => Number(b.oversight) - Number(a.oversight) || a.title.localeCompare(b.title, "nl"));
  const gemeentenCount = gemeenteGroups.filter((group) => group.oversight).reduce((sum, group) => sum + group.members.length, 0);
  const waterschappen = inSector("waterschappen", (node) => node.subtype === "waterschap");
  const caribisch = inSector("caribisch", (node) => node.subtype === "openbaar-lichaam-bes");
  const top = deg(-130);
  const [provArc, gemArc, wsArc, carArc] = split(top, top + Math.PI * 2 - GAP, [
    Math.sqrt(provincies.length) * 2.2,
    Math.sqrt(gemeentenCount + 64) * 1.9,
    Math.sqrt(waterschappen.length) * 2.2,
    Math.sqrt(caribisch.length) * 2.8,
  ]);
  cells.push({
    id: "provincies",
    title: "Provincies",
    count: provincies.length,
    branch: provincies[0]?.branch ?? "decentraal-provinciaal",
    r0: d0,
    r1: d1,
    a0: provArc[0],
    a1: provArc[1],
    pick: { kind: "sector", id: "provincies" },
    items: provincies.map(item),
  });
  split(gemArc[0], gemArc[1], gemeenteGroups.map((group) => Math.sqrt(group.members.length) + 1.2)).forEach(([a0, a1], index) => {
    const group = gemeenteGroups[index];
    cells.push({
      id: group.id,
      title: group.title,
      count: group.members.length,
      branch: group.members[0]?.branch ?? "decentraal-lokaal",
      r0: d0,
      r1: d1,
      a0,
      a1,
      pick: { kind: "cluster", id: group.id },
      items: group.members.map(item),
      group: "gemeenten",
    });
  });
  groupTitles.gemeenten = { title: "Gemeenten en regio's", count: null };
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

  // Koninkrijk: one cell per land, from the regering or staten it belongs to.
  const [k0, k1] = WHEEL_RINGS.koninkrijk;
  const lands = ["Aruba", "Curaçao", "Sint Maarten"];
  const koninkrijk = inSector("koninkrijk");
  const landOf = (node: WireNode): string => {
    const own = lands.find((land) => node.name.includes(land));
    if (own) return own;
    const parent = node.parent ? nodes.find((entry) => entry.id === node.parent) : null;
    const viaParent = parent ? lands.find((land) => parent.name.includes(land)) : undefined;
    if (viaParent) return viaParent;
    return /^Ministry of/.test(node.name) ? "Sint Maarten" : "Aruba";
  };
  split(top, top + Math.PI * 2 - GAP, lands.map(() => 1)).forEach(([a0, a1], index) => {
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

  return { cells: placed, groups, wedges };
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
export function cellMarks(cell: Pick<WheelCell, "r0" | "r1" | "a0" | "a1">, ids: readonly string[], titleBand: number, maxPitch = 30): WheelMark[] {
  const count = ids.length;
  if (count === 0) return [];
  const inner = cell.r0 + 3;
  const outer = cell.r1 - titleBand;
  const depth = outer - inner;
  if (depth <= 1) return [];
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
