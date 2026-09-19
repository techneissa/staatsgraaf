import type { OrgBranch, OrgLevel, OrgSubtype, OrgType } from "./types";
import { ORG_BRANCH_LABELS } from "./labels";

export const GRAPH_SCHEMA = "nl-graph-bundle-v1";
export const GRAPH_LAYOUT = "nl-sectors-v3";

export const HUB_RADIUS = 96;
export const HUB_CLEARANCE = 34;
export const RING_GAP = 40;
export const SUBRING_GAP = 30;
export const GLYPH_GAP = 3;
export const MAX_PER_RING = 160;
export const MAX_DEPTH = 6;
export const SECTOR_GUTTER = (3 * Math.PI) / 180;
export const SUBSECTOR_GUTTER = (1 * Math.PI) / 180;
export const START_ANGLE = -Math.PI / 2;
export const LABEL_FONT_SIZE = 18;
export const LABEL_CHAR_WIDTH = 11;
export const LABEL_CLEARANCE = 14;
export const LABEL_MARGIN = 32;
export const MIN_SPAN_RADIUS = 900;
export const MIN_SPAN_RADIUS_SMALL = 550;
export const MIN_RING_STEP = 15;
export const MAX_RING_STEP = 40;
export const VIEW_PADDING = 200;
export const BOW = 0.14;

export const SELECTED_GROWTH = 1.5;

export type GlyphClass =
  | "shield"
  | "hex"
  | "capsule"
  | "diamond"
  | "triangle"
  | "seat"
  | "dot"
  | "small-dot";

export type BundleNode = {
  id: string;
  slug: string;
  name: string;
  type: OrgType;
  subtype: OrgSubtype;
  branch: OrgBranch;
  level: OrgLevel;
  degree: number;
  parent: string | null;
};

export type BundleEdge = {
  from: string;
  to: string;
  type: string;
};

export type HubNode = {
  id: string;
  slug: string;
  name: string;
};

export type PowerMapPerson = {
  person: string;
  slug: string | null;
  name: string;
  job: string | null;
  position: string | null;
  party: string | null;
  node: string | null;
  image: string | null;
  rank: number;
  total: number;
  recent: number;
  weeks: number[];
  heat: number;
  latest: { date: string | null; headline: string | null; source: string | null; url: string | null };
};

export type PowerMap = {
  windowDays: number;
  since: string | null;
  computedAt: string | null;
  articleCount: number;
  sources: string[];
  people: PowerMapPerson[];
};

export type EntityPowerPerson = {
  person: string;
  slug: string;
  name: string;
  job: string | null;
  party: string | null;
  image: string | null;
  total: number;
  recent: number;
  latest: { date: string | null; headline: string | null; source: string | null };
};

/** Per-entity lists of people in the news, ranked by mentions within the window. */
export type EntityPowerMap = Record<string, EntityPowerPerson[]>;

export type GraphBundle = {
  schema: string;
  scope: string;
  snapshot: string | null;
  layout: string;
  hub: HubNode | null;
  nodes: BundleNode[];
  edges: BundleEdge[];
  powerMap: PowerMap;
  /** Maps entity ids (org:, person:, pos:) to their people-in-the-news ranking. */
  entityPowerMap: EntityPowerMap;
  /** Maps person slugs to person ids so entity pages can resolve their id. */
  personSlugs: Record<string, string>;
};

export type SubSectorInfo = {
  subtype: OrgSubtype;
  label: string;
  startAngle: number;
  endAngle: number;
  count: number;
};

export type SectorInfo = {
  branch: OrgBranch;
  label: string;
  startAngle: number;
  endAngle: number;
  count: number;
  labelRadius: number;
  labelWidth: number;
  labelHeight: number;
  subSectors: SubSectorInfo[];
};

export type LaidOutNode = BundleNode & {
  x: number;
  y: number;
  angle: number;
  radius: number;
  depth: number;
  glyph: GlyphClass;
  glyphRadius: number;
  sector: string;
  subSector: string;
  satellite: boolean;
};

export type LaidOutHub = {
  id: string;
  slug: string;
  name: string;
  x: number;
  y: number;
  radius: number;
};

export type GraphLayout = {
  nodes: LaidOutNode[];
  byId: Map<string, LaidOutNode>;
  edges: BundleEdge[];
  adjacency: Map<string, string[]>;
  hub: LaidOutHub | null;
  sectors: SectorInfo[];
  maxRadius: number;
  labelRadius: number;
  viewBox: { x: number; y: number; width: number; height: number };
};

export const SECTOR_ORDER: OrgBranch[] = [
  "staten-generaal",
  "regering",
  "rechterlijke-macht",
  "hoge-colleges",
  "adviescolleges",
  "decentraal-provinciaal",
  "decentraal-lokaal",
  "waterschap",
  "caribisch-nederland",
  "zelfstandig",
  "koninkrijk",
];

export const SUB_SECTOR_ORDER: OrgSubtype[] = [
  "kiesgerechtigden-nederland",
  "tweede-kamer",
  "eerste-kamer",
  "provinciale-staten",
  "gemeenteraad",
  "algemeen-bestuur-waterschap",
  "eilandsraad",
  "europees-parlement",
  "staten-land",
  "land-regering",
  "ministerie",
  "agentschap",
  "uitvoeringsorganisatie",
  "inspectie",
  "zbo",
  "rwt",
  "toezichthouder",
  "rechterlijke-instantie",
  "hoge-college",
  "kiesraad",
  "adviescollege",
  "planbureau",
  "staatscommissie",
  "raad-van-advies",
  "provincie",
  "gemeente",
  "waterschap",
  "veiligheidsregio",
  "openbaar-lichaam-bes",
  "samenwerkingsverband",
  "koninkrijksorgaan",
  "defensieonderdeel",
  "commissie",
];

export const GLYPH_BY_SUBTYPE: Record<OrgSubtype, GlyphClass> = {
  ministerie: "shield",
  defensieonderdeel: "shield",
  agentschap: "hex",
  uitvoeringsorganisatie: "hex",
  inspectie: "hex",
  zbo: "capsule",
  rwt: "capsule",
  toezichthouder: "capsule",
  "rechterlijke-instantie": "diamond",
  "hoge-college": "diamond",
  kiesraad: "diamond",
  adviescollege: "triangle",
  planbureau: "triangle",
  staatscommissie: "triangle",
  "raad-van-advies": "triangle",
  "tweede-kamer": "seat",
  "eerste-kamer": "seat",
  "provinciale-staten": "seat",
  gemeenteraad: "seat",
  "algemeen-bestuur-waterschap": "seat",
  eilandsraad: "seat",
  "europees-parlement": "seat",
  "staten-land": "seat",
  gemeente: "dot",
  provincie: "dot",
  waterschap: "dot",
  veiligheidsregio: "dot",
  "openbaar-lichaam-bes": "dot",
  samenwerkingsverband: "dot",
  koninkrijksorgaan: "dot",
  "land-regering": "dot",
  "kiesgerechtigden-nederland": "dot",
  "kiezers-caribisch-nederland": "dot",
  commissie: "small-dot",
};

function compareNames(a: string, b: string, aId: string, bId: string): number {
  if (a !== b) return a < b ? -1 : 1;
  if (aId !== bId) return aId < bId ? -1 : 1;
  return 0;
}

function computeDepths(nodes: BundleNode[]): Map<string, number> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  const walk = (node: BundleNode): number => {
    const cached = memo.get(node.id);
    if (cached !== undefined) return cached;
    if (!node.parent || node.parent === node.id) {
      memo.set(node.id, 0);
      return 0;
    }
    const parent = byId.get(node.parent);
    if (!parent || visiting.has(node.id)) {
      memo.set(node.id, 0);
      return 0;
    }
    visiting.add(node.id);
    const depth = Math.min(MAX_DEPTH, 1 + walk(parent));
    visiting.delete(node.id);
    memo.set(node.id, depth);
    return depth;
  };

  for (const node of nodes) walk(node);
  return memo;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function allocateSpans(weights: number[], minimums: number[], total: number): number[] {
  const count = weights.length;
  if (count === 0) return [];
  const minimumTotal = minimums.reduce((sum, value) => sum + value, 0);
  if (minimumTotal >= total) {
    const scale = total / Math.max(1e-9, minimumTotal);
    return minimums.map((value) => value * scale);
  }
  const weightTotal = Math.max(
    1e-9,
    weights.reduce((sum, value) => sum + value, 0),
  );
  let spans = weights.map((weight, index) =>
    Math.max(minimums[index], (weight / weightTotal) * total),
  );
  for (let pass = 0; pass < count + 2; pass += 1) {
    const excess = spans.reduce((sum, value) => sum + value, 0) - total;
    if (excess <= 1e-9) break;
    const headroomTotal = spans.reduce(
      (sum, value, index) => sum + Math.max(0, value - minimums[index]),
      0,
    );
    if (headroomTotal <= 1e-9) break;
    spans = spans.map((value, index) => {
      const headroom = Math.max(0, value - minimums[index]);
      return Math.max(minimums[index], value - (excess * headroom) / headroomTotal);
    });
  }
  return spans;
}

export function glyphRadiusForDegree(degree: number, selected = false): number {
  const base = Math.min(10, Math.max(5, 5 + Math.sqrt(Math.max(0, degree)) * 1.1));
  return selected ? base + SELECTED_GROWTH : base;
}

export function glyphFootprint(node: Pick<BundleNode, "subtype" | "degree">): number {
  const radius = glyphRadiusForDegree(node.degree, false);
  switch (GLYPH_BY_SUBTYPE[node.subtype] ?? "dot") {
    case "small-dot":
      return radius * 0.68;
    case "capsule":
      return Math.hypot(radius, radius * 0.6);
    case "seat":
      return Math.hypot(radius, radius * 0.38);
    default:
      return radius;
  }
}

export function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return `M ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)}`;
  const nx = -dy / len;
  const ny = dx / len;
  const sideRaw = midX * nx + midY * ny;
  const side = sideRaw >= 0 ? 1 : -1;
  const ctrlX = midX + nx * side * len * BOW;
  const ctrlY = midY + ny * side * len * BOW;
  return `M ${round(x1)} ${round(y1)} Q ${round(ctrlX)} ${round(ctrlY)} ${round(x2)} ${round(y2)}`;
}

type PlacedNode = { node: BundleNode; angle: number };

function placeRing(
  nodes: BundleNode[],
  startIndex: number,
  from: number,
  to: number,
  radius: number,
): PlacedNode[] {
  const placed: PlacedNode[] = [];
  let cursor = from;
  for (let index = startIndex; index < nodes.length; index += 1) {
    if (placed.length >= MAX_PER_RING) break;
    const halfLead = (glyphFootprint(nodes[index]) + GLYPH_GAP / 2) / radius;
    const angle = cursor + halfLead;
    if (angle + halfLead > to) break;
    placed.push({ node: nodes[index], angle });
    cursor = angle + halfLead;
  }
  return placed;
}

export function computeLayout(bundle: GraphBundle): GraphLayout {
  const hubId = bundle.hub?.id ?? null;
  const byId = new Map(bundle.nodes.map((node) => [node.id, node]));
  const depths = computeDepths(bundle.nodes);

  const adjacency = new Map<string, string[]>();
  for (const node of bundle.nodes) adjacency.set(node.id, []);
  for (const edge of bundle.edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) continue;
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }
  for (const list of adjacency.values()) list.sort();

  const sectorNodes = bundle.nodes.filter((node) => node.id !== hubId);
  const satNodes: BundleNode[] = [];
  const packedNodes: BundleNode[] = [];
  for (const node of sectorNodes) {
    if ((adjacency.get(node.id)?.length ?? 0) === 0) satNodes.push(node);
    else packedNodes.push(node);
  }

  const branchCounts = new Map<OrgBranch, number>();
  for (const node of sectorNodes) {
    branchCounts.set(node.branch, (branchCounts.get(node.branch) ?? 0) + 1);
  }

  const byBranch = groupBy(packedNodes, (node) => node.branch);
  const branchOrder = [
    ...SECTOR_ORDER.filter((branch) => branchCounts.has(branch)),
    ...[...branchCounts.keys()]
      .filter((branch) => !SECTOR_ORDER.includes(branch))
      .sort(),
  ];

  const subSectorCount = branchOrder.reduce((sum, branch) => {
    return sum + new Set(byBranch.get(branch)?.map((node) => node.subtype) ?? []).size;
  }, 0);

  const totalGutter = branchOrder.length * SECTOR_GUTTER + subSectorCount * SUBSECTOR_GUTTER;
  const usable = Math.PI * 2 - totalGutter;
  const arcWeight = (node: BundleNode): number => glyphFootprint(node) + GLYPH_GAP;
  const innerMinimum = (nodes: BundleNode[]): number => {
    let ceiling = 0;
    for (const node of nodes) ceiling = Math.max(ceiling, glyphFootprint(node));
    const target = nodes.length <= 4 ? MIN_SPAN_RADIUS_SMALL : MIN_SPAN_RADIUS;
    return (2 * ceiling + GLYPH_GAP) / target;
  };
  const ringStep = (nodes: BundleNode[]): number => {
    let ceiling = 0;
    for (const node of nodes) ceiling = Math.max(ceiling, glyphFootprint(node));
    const needed = 2 * ceiling + GLYPH_GAP + 2 * SELECTED_GROWTH;
    return Math.min(MAX_RING_STEP, Math.max(MIN_RING_STEP, Math.ceil(needed / 5) * 5));
  };

  const branchPlans = branchOrder.map((branch) => {
    const branchNodes = byBranch.get(branch) ?? [];
    const bySubtype = groupBy(branchNodes, (node) => node.subtype);
    const subOrder = [
      ...SUB_SECTOR_ORDER.filter((subtype) => bySubtype.has(subtype)),
      ...[...bySubtype.keys()].filter((subtype) => !SUB_SECTOR_ORDER.includes(subtype)).sort(),
    ];
    const demands = subOrder.map((subtype) =>
      Math.max(
        1,
        (bySubtype.get(subtype) ?? []).reduce((sum, node) => sum + arcWeight(node), 0),
      ),
    );
    const weights = demands.map((demand) => Math.sqrt(demand));
    const minimums = subOrder.map((subtype) => innerMinimum(bySubtype.get(subtype) ?? []));
    return {
      branch,
      branchNodes,
      bySubtype,
      subOrder,
      weights,
      minimums,
      floor: Math.max(
        SUBSECTOR_GUTTER,
        subOrder.length * SUBSECTOR_GUTTER +
          minimums.reduce((sum, value) => sum + value, 0),
      ),
      weight: Math.sqrt(demands.reduce((sum, demand) => sum + demand, 0)),
    };
  });

  const branchSpans = allocateSpans(
    branchPlans.map((plan) => plan.weight),
    branchPlans.map((plan) => plan.floor),
    usable,
  );

  const laidOut = new Map<string, LaidOutNode>();
  const sectors: SectorInfo[] = [];
  let maxRadius = HUB_RADIUS;
  let cursor = START_ANGLE;

  for (let planIndex = 0; planIndex < branchPlans.length; planIndex += 1) {
    const { branch, branchNodes, bySubtype, subOrder, weights, minimums } =
      branchPlans[planIndex];
    const count = branchCounts.get(branch) ?? branchNodes.length;
    const span = branchSpans[planIndex];
    const sectorStart = cursor;

    const subGutterTotal = subOrder.length * SUBSECTOR_GUTTER;
    const subUsable = Math.max(0, span - subGutterTotal);
    const subInnerSpans = allocateSpans(weights, minimums, subUsable);

    const subSectors: SubSectorInfo[] = [];
    let subCursor = sectorStart;
    let sectorEnd = sectorStart;

    for (let subIndex = 0; subIndex < subOrder.length; subIndex += 1) {
      const subtype = subOrder[subIndex];
      const subNodes = bySubtype.get(subtype) ?? [];
      const innerSpan = subInnerSpans[subIndex];
      const subSpan = innerSpan + SUBSECTOR_GUTTER;
      const subStart = subCursor;
      const gutter = SUBSECTOR_GUTTER;
      const innerStart = subStart + gutter / 2;
      const innerEnd = innerStart + innerSpan;

      const sorted = [...subNodes].sort((a, b) => {
        const da = depths.get(a.id) ?? 0;
        const db = depths.get(b.id) ?? 0;
        if (da !== db) return da - db;
        return compareNames(a.name, b.name, a.id, b.id);
      });

      let minDepth = Infinity;
      for (const node of sorted) minDepth = Math.min(minDepth, depths.get(node.id) ?? 0);
      if (!Number.isFinite(minDepth)) minDepth = 0;
      const baseRadius = HUB_RADIUS + HUB_CLEARANCE + minDepth * RING_GAP;
      const step = ringStep(sorted);

      let index = 0;
      let ringRadius = baseRadius;
      while (index < sorted.length) {
        const placed = placeRing(sorted, index, innerStart, innerEnd, ringRadius);
        if (placed.length === 0) {
          ringRadius += step;
          continue;
        }
        for (const { node, angle } of placed) {
          laidOut.set(node.id, {
            ...node,
            x: round(Math.cos(angle) * ringRadius),
            y: round(Math.sin(angle) * ringRadius),
            angle: round(angle),
            radius: round(ringRadius),
            depth: depths.get(node.id) ?? 0,
            glyph: GLYPH_BY_SUBTYPE[node.subtype] ?? "dot",
            glyphRadius: round(glyphRadiusForDegree(node.degree, false)),
            sector: branch,
            subSector: subtype,
            satellite: false,
          });
          maxRadius = Math.max(maxRadius, ringRadius);
        }
        index += placed.length;
        ringRadius += step;
      }

      subCursor = subStart + subSpan;
      sectorEnd = subCursor;
      subSectors.push({
        subtype,
        label: subtype,
        startAngle: round(subStart),
        endAngle: round(subStart + subSpan),
        count: subNodes.length,
      });
    }

    if (subOrder.length === 0) sectorEnd = sectorStart + span;

    sectors.push({
      branch,
      label: branch,
      startAngle: round(sectorStart),
      endAngle: round(sectorEnd),
      count,
      labelRadius: 0,
      labelWidth: 0,
      labelHeight: 0,
      subSectors,
    });
    cursor = sectorStart + span + SECTOR_GUTTER;
  }

  const satSorted = [...satNodes].sort((a, b) => {
    if (a.branch !== b.branch) return a.branch < b.branch ? -1 : 1;
    return compareNames(a.name, b.name, a.id, b.id);
  });
  let satIndex = 0;
  let satRadius = maxRadius + SUBRING_GAP;
  while (satIndex < satSorted.length) {
    const placed = placeRing(satSorted, satIndex, START_ANGLE, START_ANGLE + Math.PI * 2, satRadius);
    if (placed.length === 0) {
      satRadius += SUBRING_GAP;
      continue;
    }
    for (const { node, angle } of placed) {
      laidOut.set(node.id, {
        ...node,
        x: round(Math.cos(angle) * satRadius),
        y: round(Math.sin(angle) * satRadius),
        angle: round(angle),
        radius: round(satRadius),
        depth: depths.get(node.id) ?? 0,
        glyph: GLYPH_BY_SUBTYPE[node.subtype] ?? "dot",
        glyphRadius: round(glyphRadiusForDegree(node.degree, false)),
        sector: node.branch,
        subSector: node.subtype,
        satellite: true,
      });
      maxRadius = Math.max(maxRadius, satRadius);
    }
    satIndex += placed.length;
    satRadius += SUBRING_GAP;
  }

  let maxReach = HUB_RADIUS;
  for (const node of laidOut.values()) {
    maxReach = Math.max(maxReach, node.radius + glyphFootprint(node));
  }

  for (const sector of sectors) {
    const text = ORG_BRANCH_LABELS[sector.branch].toUpperCase();
    sector.labelWidth = Math.round(text.length * LABEL_CHAR_WIDTH);
    sector.labelHeight = LABEL_FONT_SIZE;
    const mid = (sector.startAngle + sector.endAngle) / 2;
    const support =
      (sector.labelWidth / 2) * Math.abs(Math.cos(mid)) +
      (sector.labelHeight / 2) * Math.abs(Math.sin(mid));
    sector.labelRadius = round(maxReach + support + LABEL_CLEARANCE);
  }

  let labelReach = 0;
  for (const sector of sectors) {
    const mid = (sector.startAngle + sector.endAngle) / 2;
    labelReach = Math.max(
      labelReach,
      Math.abs(Math.cos(mid)) * sector.labelRadius + sector.labelWidth / 2,
      Math.abs(Math.sin(mid)) * sector.labelRadius + sector.labelHeight / 2,
    );
  }

  const ordered: LaidOutNode[] = [];
  for (const node of bundle.nodes) {
    const laid = laidOut.get(node.id);
    if (laid) ordered.push(laid);
  }

  const hub = bundle.hub
    ? {
        id: bundle.hub.id,
        slug: bundle.hub.slug,
        name: bundle.hub.name,
        x: 0,
        y: 0,
        radius: HUB_RADIUS,
      }
    : null;

  const radius = Math.max(maxReach + VIEW_PADDING, labelReach + LABEL_MARGIN);
  return {
    nodes: ordered,
    byId: laidOut,
    edges: bundle.edges.filter((edge) => byId.has(edge.from) && byId.has(edge.to)),
    adjacency,
    hub,
    sectors,
    maxRadius,
    labelRadius: round(sectors.reduce((max, sector) => Math.max(max, sector.labelRadius), maxReach)),
    viewBox: { x: -radius, y: -radius, width: radius * 2, height: radius * 2 },
  };
}

export function neighborsOf(layout: GraphLayout, nodeId: string): Set<string> {
  return new Set(layout.adjacency.get(nodeId) ?? []);
}

export function computeFocusPath(layout: GraphLayout, nodeId: string): string[] {
  if (!layout.byId.has(nodeId)) return [];
  const hubId = layout.hub?.id ?? null;

  if (hubId && hubId !== nodeId) {
    const previous = new Map<string, string>();
    const queue: string[] = [nodeId];
    const seen = new Set<string>([nodeId]);
    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (current === hubId) {
        const path: string[] = [hubId];
        let step = hubId;
        while (previous.has(step)) {
          step = previous.get(step) as string;
          path.unshift(step);
        }
        return path;
      }
      for (const next of layout.adjacency.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        previous.set(next, current);
        queue.push(next);
      }
    }
  }

  const spine: string[] = [];
  const seen = new Set<string>();
  let current = layout.byId.get(nodeId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    spine.push(current.id);
    current = current.parent ? layout.byId.get(current.parent) : undefined;
  }
  return spine;
}

export function formatAngle(angle: number): number {
  return round(angle);
}

export function labelPoint(angle: number, radius: number): { x: number; y: number } {
  return { x: round(Math.cos(angle) * radius), y: round(Math.sin(angle) * radius) };
}
