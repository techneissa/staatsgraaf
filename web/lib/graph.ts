import type { OrgBranch, OrgLevel, OrgSubtype, OrgType } from "./types";

export const GRAPH_SCHEMA = "nl-graph-bundle-v1";
export const GRAPH_LAYOUT = "nl-sectors-v1";

export const HUB_RADIUS = 96;
export const RING_GAP = 40;
export const SUBRING_GAP = 26;
export const MIN_SPACING = 7;
export const MAX_PER_RING = 96;
export const MAX_DEPTH = 6;
export const SECTOR_GUTTER = (4 * Math.PI) / 180;
export const SUBSECTOR_GUTTER = (2 * Math.PI) / 180;
export const START_ANGLE = -Math.PI / 2;
export const VIEW_PADDING = 120;
export const BOW = 0.14;

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

export type GraphBundle = {
  schema: string;
  scope: string;
  snapshot: string | null;
  layout: string;
  hub: HubNode | null;
  nodes: BundleNode[];
  edges: BundleEdge[];
  powerMap: PowerMap;
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

export function glyphRadiusForDegree(degree: number, selected = false): number {
  const base = Math.min(11, Math.max(5, 5 + Math.sqrt(Math.max(0, degree)) * 1.1));
  return selected ? base + 2 : base;
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

  const byBranch = groupBy(packedNodes, (node) => node.branch);
  const branchOrder = [
    ...SECTOR_ORDER.filter((branch) => byBranch.has(branch)),
    ...[...byBranch.keys()].filter((branch) => !SECTOR_ORDER.includes(branch)).sort(),
  ];

  const branchCounts = new Map<OrgBranch, number>();
  for (const node of sectorNodes) {
    branchCounts.set(node.branch, (branchCounts.get(node.branch) ?? 0) + 1);
  }

  const subSectorCount = branchOrder.reduce((sum, branch) => {
    return sum + new Set(byBranch.get(branch)?.map((node) => node.subtype) ?? []).size;
  }, 0);

  const totalGutter = branchOrder.length * SECTOR_GUTTER + subSectorCount * SUBSECTOR_GUTTER;
  const usable = Math.PI * 2 - totalGutter;
  const totalWeight = branchOrder.reduce(
    (sum, branch) => sum + Math.sqrt(Math.max(1, branchCounts.get(branch) ?? 0)),
    0,
  );

  const laidOut = new Map<string, LaidOutNode>();
  const sectors: SectorInfo[] = [];
  let maxRadius = HUB_RADIUS;
  let cursor = START_ANGLE;

  for (const branch of branchOrder) {
    const branchNodes = byBranch.get(branch) ?? [];
    const count = branchCounts.get(branch) ?? branchNodes.length;
    const span = usable * (Math.sqrt(Math.max(1, count)) / totalWeight);
    const sectorStart = cursor;

    const bySubtype = groupBy(branchNodes, (node) => node.subtype);
    const subOrder = [
      ...SUB_SECTOR_ORDER.filter((subtype) => bySubtype.has(subtype)),
      ...[...bySubtype.keys()].filter((subtype) => !SUB_SECTOR_ORDER.includes(subtype)).sort(),
    ];
    const subGutterTotal = subOrder.length * SUBSECTOR_GUTTER;
    const subUsable = Math.max(0, span - subGutterTotal);
    const subWeightTotal = subOrder.reduce(
      (sum, subtype) => sum + Math.sqrt(Math.max(1, bySubtype.get(subtype)?.length ?? 0)),
      0,
    );

    const subSectors: SubSectorInfo[] = [];
    let subCursor = sectorStart;
    let sectorEnd = sectorStart;

    for (const subtype of subOrder) {
      const subNodes = bySubtype.get(subtype) ?? [];
      const subSpan = subUsable * (Math.sqrt(Math.max(1, subNodes.length)) / subWeightTotal);
      const subStart = subCursor;
      const gutter = SUBSECTOR_GUTTER;
      const innerStart = subStart + gutter / 2;
      const innerSpan = Math.max(0, subSpan - gutter);

      const sorted = [...subNodes].sort((a, b) => {
        const da = depths.get(a.id) ?? 0;
        const db = depths.get(b.id) ?? 0;
        if (da !== db) return da - db;
        return compareNames(a.name, b.name, a.id, b.id);
      });

      let minDepth = Infinity;
      for (const node of sorted) minDepth = Math.min(minDepth, depths.get(node.id) ?? 0);
      if (!Number.isFinite(minDepth)) minDepth = 0;
      const baseRadius = HUB_RADIUS + minDepth * RING_GAP;

      let index = 0;
      let ringIndex = 0;
      while (index < sorted.length) {
        const radius = baseRadius + ringIndex * SUBRING_GAP;
        const capacity = Math.min(
          MAX_PER_RING,
          Math.max(1, Math.floor((innerSpan * radius) / MIN_SPACING)),
        );
        const take = Math.min(capacity, sorted.length - index);
        for (let slot = 0; slot < take; slot += 1) {
          const node = sorted[index + slot];
          const angle = innerStart + ((slot + 0.5) / take) * innerSpan;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          laidOut.set(node.id, {
            ...node,
            x: round(x),
            y: round(y),
            angle: round(angle),
            radius: round(radius),
            depth: depths.get(node.id) ?? 0,
            glyph: GLYPH_BY_SUBTYPE[node.subtype] ?? "dot",
            glyphRadius: round(glyphRadiusForDegree(node.degree, false)),
            sector: branch,
            subSector: subtype,
            satellite: false,
          });
          maxRadius = Math.max(maxRadius, radius);
        }
        index += take;
        ringIndex += 1;
      }

      subCursor = subStart + subSpan + SUBSECTOR_GUTTER;
      sectorEnd = subCursor;
      subSectors.push({
        subtype,
        label: subtype,
        startAngle: round(subStart),
        endAngle: round(subStart + subSpan),
        count: subNodes.length,
      });
    }

    sectors.push({
      branch,
      label: branch,
      startAngle: round(sectorStart),
      endAngle: round(sectorEnd),
      count,
      subSectors,
    });
    cursor = sectorStart + span + SECTOR_GUTTER;
  }

  const satelliteRadius = round(maxRadius + SUBRING_GAP);
  const satSorted = [...satNodes].sort((a, b) => {
    if (a.branch !== b.branch) return a.branch < b.branch ? -1 : 1;
    return compareNames(a.name, b.name, a.id, b.id);
  });
  satSorted.forEach((node, index) => {
    const angle = START_ANGLE + (index / Math.max(1, satSorted.length)) * Math.PI * 2;
    const x = Math.cos(angle) * satelliteRadius;
    const y = Math.sin(angle) * satelliteRadius;
    laidOut.set(node.id, {
      ...node,
      x: round(x),
      y: round(y),
      angle: round(angle),
      radius: satelliteRadius,
      depth: depths.get(node.id) ?? 0,
      glyph: GLYPH_BY_SUBTYPE[node.subtype] ?? "dot",
      glyphRadius: round(glyphRadiusForDegree(node.degree, false)),
      sector: node.branch,
      subSector: node.subtype,
      satellite: true,
    });
    maxRadius = Math.max(maxRadius, satelliteRadius);
  });

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

  const radius = maxRadius + VIEW_PADDING;
  return {
    nodes: ordered,
    byId: laidOut,
    edges: bundle.edges.filter((edge) => byId.has(edge.from) && byId.has(edge.to)),
    adjacency,
    hub,
    sectors,
    maxRadius,
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
