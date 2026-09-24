"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CLUSTER_DOT_PITCH,
  CLUSTER_DOT_RADIUS,
  SELECTED_GROWTH,
  alignRotation,
  clusterHalfSize,
  computeFocusPath,
  edgeAlive,
  edgePath,
  hydrateLayout,
  routedEdgePath,
  wrapPi,
  type ClusterInfo,
  type GraphBundle,
  type LaidOutNode,
  type SectorInfo,
} from "@/lib/graph";
import type { OrgBranch as OrgBranchName } from "@/lib/types";
import {
  SPRING_SNAPPY,
  SPRING_SOFT,
  SPRING_TURN,
  prefersReducedMotion,
  settled,
  snap,
  spring,
  stepSpring,
} from "@/lib/motion";
import { posePosition, sectorPose, type PolarTarget } from "@/lib/pose";
import { placeLabels, type LabelItem } from "@/lib/label-placement";
import { benchSeats, type Bench, type BenchBlock } from "@/lib/bench";
import { GraphDetails, type DetailsTarget } from "./graph-details";
import { branchColorVar } from "@/lib/branch-colors";

import { resolveCanvasClick, type CanvasClick } from "@/lib/cluster-click";
import { useT } from "@/components/i18n/use-t";
import { useLocale } from "@/components/i18n/language-provider";
import {
  BRANCH_LABELS_I18N,
  ORG_SUBTYPE_LABELS_I18N,
  SECTOR_LABELS_I18N,
  TIER_LABELS_I18N,
} from "@/lib/i18n/dict-graph";
import { orgEnGloss } from "@/lib/name-gloss";
import { glyphPath, glyphPathAt, orbitDotsAt } from "./glyph";
import { GraphList } from "./graph-list";
import { benchLabelArc, ringPath, sectorLabelArc, sectorWedge, tierLabelArc, wedgePath } from "./tier-chrome";

type GraphCanvasProps = {
  bundle: GraphBundle;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  hiddenBranches: ReadonlySet<string>;
  /** Draw the relations as they were on this ISO date; null is today. */
  asOf?: string | null;
};

/**
 * One animation frame, with a timer as the backstop.
 *
 * `requestAnimationFrame` is the right clock in a browser that composites, and
 * it is the only one that stays in step with the screen. Some environments
 * (headless automation, a tab that is never painted) never fire it at all, and
 * a canvas whose only clock never ticks would freeze halfway through a move.
 * Whichever of the two fires first runs the frame and cancels the other, so a
 * normal browser is unaffected and a silent one degrades to a slower canvas
 * instead of a stuck one.
 */
function scheduleFrame(callback: (now: number) => void): () => void {
  let done = false;
  const finish = (now: number) => {
    if (done) return;
    done = true;
    callback(now);
  };
  const frame = requestAnimationFrame(finish);
  const timer = window.setTimeout(() => finish(performance.now()), 60);
  return () => {
    done = true;
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
  };
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const DIM_OPACITY = 0.2;
/** Most labelled relations of one selection; the placement hides what does not fit. */
const MAX_LABELS = 80;
/** Label sizes in CSS pixels on the reader's screen, whatever the zoom. */
const LABEL_PX = 12;
const LABEL_PX_SELECTED = 13.5;
/** The width labels are measured at; a text's width scales with its font size. */
const MEASURE_PX = 12;
/** The reader's choice whether the canvas turns to the selection. */
const TURN_STORAGE_KEY = "staatsgraaf.graph.turn.v2";
/** Session flag: the home page intro of the canvas has run in this tab. */
const INTRO_STORAGE_KEY = "staatsgraaf.graph.intro.v1";

type LabelState = "selected" | "path" | "neighbor" | "member";
const LABEL_PRIORITY: Record<LabelState, number> = { selected: 3, path: 2, neighbor: 1, member: 0.5 };

type MarkState = "base" | "dim" | "neighbor" | "path" | "selected" | "hover" | "member";

type Hover =
  | { kind: "node"; id: string }
  | { kind: "cluster"; id: string }
  | { kind: "dot"; id: string; cluster: string }
  | { kind: "fractie"; id: string; chamberId: string; index: number };

/** One thing in flight: where it starts, where it goes, and how big it is at each end. */
type Flight = { from: PolarTarget & { scale: number }; to: PolarTarget & { scale: number } };

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function localized(
  locale: "nl" | "en",
  map: Record<string, { nl: string; en: string }>,
  key: string | null | undefined,
): string {
  if (!key) return "";
  const entry = map[key];
  if (!entry) return key;
  return locale === "en" ? entry.en : entry.nl;
}

function dotsPath(layout: ReturnType<typeof hydrateLayout>, cluster: ClusterInfo): string {
  const parts: string[] = [];
  for (const id of cluster.members) {
    const node = layout.byId.get(id);
    if (node) parts.push(glyphPathAt("dot", CLUSTER_DOT_RADIUS, node.x, node.y));
  }
  return parts.join(" ");
}

/**
 * The tier canvas: a deterministic concentric layout drawn once by React, and
 * an imperative motion layer that owns the camera and the one thing that
 * moves afterwards.
 *
 * A body keeps its place. Selecting one turns the canvas so it sits straight
 * above the core, highlights it, its path to the electorate and its direct
 * relations where they are, and eases the view to hold them. The standing
 * children of one parent in a sector are drawn as a grid of dots; opening the
 * grid packs that sector again with the dots unpacked into marks, and only
 * that sector moves. React renders the structure; the animation frame writes
 * the view transform, the moving marks and the label positions straight to
 * the DOM through refs, so a pan of 1600 marks does not reconcile 1600 React
 * elements, and every move can be interrupted: each is one spring chasing a
 * target that is a pure function of the selection and the open cluster.
 */
export function GraphCanvas({ bundle, selectedId, onSelect, hiddenBranches, asOf = null }: GraphCanvasProps) {
  const layout = useMemo(() => hydrateLayout(bundle), [bundle]);
  const drawnEdges = useMemo(() => layout.edges.filter((edge) => edgeAlive(edge, asOf)), [layout, asOf]);
  const router = useRouter();
  const t = useT("graph");
  const locale = useLocale();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewGroupRef = useRef<SVGGElement | null>(null);
  const rotGroupRef = useRef<SVGGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const labelRefs = useRef(new Map<string, SVGTextElement>());
  /** Text widths at `MEASURE_PX`, measured once per label element. */
  const labelWidths = useRef(new Map<string, number>());
  const markRefs = useRef(new Map<string, SVGGElement>());
  const clusterRefs = useRef(new Map<string, SVGGElement>());
  const liveEdgeRefs = useRef<Record<"base" | "neighbour" | "path", SVGPathElement | null>>({ base: null, neighbour: null, path: null });
  /** CSS pixels per viewBox unit and the svg's box, refreshed when the svg is resized. */
  const screenRef = useRef({ scale: 1, offsetX: 0, offsetY: 0, width: 0, height: 0 });
  /** Where every moving mark is this frame; anything absent is at rest. */
  const positionsRef = useRef(new Map<string, { x: number; y: number }>());

  const rot = useRef(spring(0));
  /** One scalar for everything in flight: 0 is where things were, 1 is where they go. */
  const move = useRef(spring(1));
  const flightsRef = useRef(new Map<string, Flight>());
  const settledFlightRef = useRef(true);
  const onFlightSettledRef = useRef<(() => void) | null>(null);
  const viewK = useRef(spring(1));
  const viewX = useRef(spring(0));
  const viewY = useRef(spring(0));
  const cancelFrameRef = useRef<(() => void) | null>(null);
  const lastTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const warmEdgesRef = useRef("");

  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const dialRef = useRef<{ pointerId: number; angle: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ startDist: number; startK: number; startX: number; startY: number; midX: number; midY: number } | null>(null);
  const pointerMovedRef = useRef(false);

  const [activeSector, setActiveSector] = useState<string | null>(null);
  /**
   * What the pointer is over. It is not React state on purpose: the pointer
   * crosses hundreds of hit targets per second, and a state change here would
   * reconcile the whole canvas each time. The tooltip is its own component
   * with its own state, and the hover tint is written straight to the DOM.
   */
  const hoverRef = useRef<Hover | null>(null);
  const hoverCardRef = useRef<((hover: Hover | null) => void) | null>(null);
  const hoverMarkRef = useRef<SVGGElement | null>(null);
  const hoverPathRef = useRef<SVGPathElement | null>(null);
  /** The wedge over each fractie's seats, tinted on hover. */
  const fractieRefs = useRef(new Map<string, SVGPathElement>());
  /** The open cluster, and the one that is still folding while the next opens. */
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const [closing, setClosing] = useState<{ id: string; pose: ReturnType<typeof sectorPose> } | null>(null);
  /** The fractie whose seats are picked out, as chamber id and index in the chamber's blocks. */
  const [selectedFractie, setSelectedFractie] = useState<{ chamberId: string; index: number } | null>(null);
  const [turnEnabled, setTurnEnabled] = useState(false);
  /**
   * The one orchestrated moment on the site: the first time the canvas draws
   * on the home page in a session, the rings settle in from the centre
   * outward, about 600 ms in all. CSS only (globals.css, `.sg-intro`), on
   * opacity and a scale about the centre; nothing the reader does waits for
   * it, and the classes are gone once it has run.
   */
  const [intro, setIntro] = useState(false);
  useLayoutEffect(() => {
    if (window.location.pathname !== "/" || prefersReducedMotion()) return;
    try {
      if (window.sessionStorage.getItem(INTRO_STORAGE_KEY) === "seen") return;
      window.sessionStorage.setItem(INTRO_STORAGE_KEY, "seen");
    } catch {
      // Without storage the intro may run again on a reload; harmless.
    }
    setIntro(true);
  }, []);
  useEffect(() => {
    if (!intro) return;
    const timer = window.setTimeout(() => setIntro(false), 1100);
    return () => window.clearTimeout(timer);
  }, [intro]);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(TURN_STORAGE_KEY) === "on") setTurnEnabled(true);
    } catch {
      // Storage can be unavailable; the default stands.
    }
  }, []);

  const toggleTurn = () => {
    setTurnEnabled((value) => {
      try {
        window.localStorage.setItem(TURN_STORAGE_KEY, value ? "off" : "on");
      } catch {
        // Storage can be unavailable; the choice lasts for the session.
      }
      return !value;
    });
  };

  const selectedNode = selectedId ? layout.byId.get(selectedId) ?? null : null;

  const pose = useMemo(() => (openCluster ? sectorPose(layout, openCluster) : null), [layout, openCluster]);
  const activeClusterInfo = openCluster ? layout.clusterById.get(openCluster) ?? null : null;

  /** Change the open cluster, remembering the one that has to fold. */
  const changeOpen = useCallback(
    (next: string | null) => {
      setOpenCluster((current) => {
        if (current === next) return current;
        if (current) setClosing({ id: current, pose: sectorPose(layout, current) });
        return next;
      });
    },
    [layout],
  );

  /**
   * Marks that move: the members of the open cluster and the singles of its
   * sector, and, while a previous cluster folds, its members and its sector's
   * singles too, so nothing jumps back into the merged path mid-flight.
   */
  const poseMarkIds = useMemo(() => {
    const set = new Set<string>();
    const collect = (entry: ReturnType<typeof sectorPose>) => {
      if (!entry) return;
      for (const id of entry.target.keys()) {
        const node = layout.byId.get(id);
        if (node && (!node.cluster || node.cluster === entry.openId)) set.add(id);
      }
    };
    collect(pose);
    collect(closing?.pose ?? null);
    return set;
  }, [layout, pose, closing]);
  const hiddenGrids = useMemo(() => {
    const set = new Set<string>();
    if (openCluster) set.add(openCluster);
    if (closing) set.add(closing.id);
    return set;
  }, [openCluster, closing]);

  const visibleNodes = useMemo(
    () => layout.nodes.filter((node) => !hiddenBranches.has(node.branch)),
    [layout, hiddenBranches],
  );
  const drawnNodes = useMemo(() => visibleNodes.filter((node) => !node.arch), [visibleNodes]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleClusters = useMemo(
    () => layout.clusters.filter((cluster) => cluster.members.some((id) => visibleIds.has(id))),
    [layout, visibleIds],
  );
  const sectorBranch = useCallback(
    (sectorId: string) => (layout.sectors.find((sector) => sector.id === sectorId)?.branch ?? "regering") as OrgBranchName,
    [layout],
  );

  /** Marks the reader can step through with the arrow keys: no collapsed children. */
  const walkNodes = useMemo(
    () => visibleNodes.filter((node) => !node.hidden || node.arch || node.cluster),
    [visibleNodes],
  );

  const focusPath = useMemo(
    () => (selectedId ? computeFocusPath(layout, selectedId) : []),
    [layout, selectedId],
  );
  const focusSet = useMemo(() => new Set(focusPath), [focusPath]);
  const neighborSet = useMemo(
    () => (selectedId ? new Set(layout.adjacency.get(selectedId) ?? []) : new Set<string>()),
    [layout, selectedId],
  );

  /**
   * Marks that are invisible at rest but shown for this selection: the
   * selected body itself when it is a collapsed child, and the collapsed
   * children of the selected body, which sit fanned just outside its mark.
   */
  const revealedIds = useMemo(() => {
    const set = new Set<string>();
    if (!selectedNode) return set;
    if (selectedNode.hidden && !selectedNode.arch && !selectedNode.cluster) set.add(selectedNode.id);
    for (const node of layout.nodes) {
      if (node.collapsedInto === selectedNode.id && !hiddenBranches.has(node.branch)) set.add(node.id);
    }
    return set;
  }, [layout, selectedNode, hiddenBranches]);

  /** A mark is drawn as a full glyph when it is not hidden, or hidden but shown for this state. */
  const shown = useCallback(
    (node: LaidOutNode) => !node.hidden || revealedIds.has(node.id) || poseMarkIds.has(node.id),
    [revealedIds, poseMarkIds],
  );

  const pathEdgeKeys = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < focusPath.length - 1; i += 1) set.add(edgeKey(focusPath[i], focusPath[i + 1]));
    return set;
  }, [focusPath]);

  const edgeShape = useCallback(
    (from: LaidOutNode, to: LaidOutNode, a: { x: number; y: number }, b: { x: number; y: number }) =>
      from.sector === to.sector ? edgePath(a.x, a.y, b.x, b.y) : routedEdgePath(a, b, layout.channels),
    [layout],
  );

  /**
   * Edges with an end in the moving sector are redrawn per frame. The ones
   * that touch the selection move visibly and are hot; the rest are refreshed
   * every few frames, which keeps a large sector under the frame budget.
   */
  const liveEdges = useMemo(() => {
    const list: { from: string; to: string; state: "base" | "neighbour" | "path"; hot: boolean }[] = [];
    if (!pose && !closing) return list;
    const moving = (id: string) => pose?.target.has(id) || closing?.pose?.target.has(id) || false;
    for (const edge of drawnEdges) {
      if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) continue;
      if (!moving(edge.from) && !moving(edge.to)) continue;
      const key = edgeKey(edge.from, edge.to);
      const isPath = pathEdgeKeys.has(key);
      const isNeighbour = selectedId !== null && (edge.from === selectedId || edge.to === selectedId);
      const touchesOpen = poseMarkIds.has(edge.from) || poseMarkIds.has(edge.to);
      list.push({ from: edge.from, to: edge.to, state: isPath ? "path" : isNeighbour ? "neighbour" : "base", hot: isPath || isNeighbour || touchesOpen });
    }
    return list;
  }, [drawnEdges, visibleIds, pose, closing, poseMarkIds, pathEdgeKeys, selectedId]);
  const liveEdgeKeys = useMemo(() => new Set(liveEdges.map((edge) => edgeKey(edge.from, edge.to))), [liveEdges]);

  /**
   * The edges the selection lights up, merged into one path per state. They
   * keep the shape they have at rest; only their colour and width change.
   */
  const highlightEdges = useMemo(() => {
    const segments: Record<"neighbour" | "path", string[]> = { neighbour: [], path: [] };
    const keys = new Set<string>();
    if (!selectedId) return { segments: { neighbour: "", path: "" }, keys };
    for (const edge of drawnEdges) {
      if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) continue;
      const key = edgeKey(edge.from, edge.to);
      const isPath = pathEdgeKeys.has(key);
      const isNeighbour = edge.from === selectedId || edge.to === selectedId;
      if (!isPath && !isNeighbour) continue;
      keys.add(key);
      if (liveEdgeKeys.has(key)) continue;
      const from = layout.byId.get(edge.from);
      const to = layout.byId.get(edge.to);
      if (!from || !to) continue;
      segments[isPath ? "path" : "neighbour"].push(edgeShape(from, to, from, to));
    }
    return { segments: { neighbour: segments.neighbour.join(" "), path: segments.path.join(" ") }, keys };
  }, [layout, drawnEdges, visibleIds, pathEdgeKeys, selectedId, liveEdgeKeys, edgeShape]);

  /**
   * Marks that need an element of their own: the selection, its path, its
   * neighbours, the marks revealed for it, and everything in the moving
   * sector. Every other mark is drawn into one merged path per sector and
   * glyph (below), which is what keeps a pan of the whole canvas inside the
   * frame budget: rasterising forty paths is cheap, rasterising 1600 is not.
   */
  const dynamicIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedId) set.add(selectedId);
    for (const id of focusSet) set.add(id);
    for (const id of neighborSet) set.add(id);
    for (const id of revealedIds) set.add(id);
    for (const id of poseMarkIds) set.add(id);
    return set;
  }, [selectedId, focusSet, neighborSet, revealedIds, poseMarkIds]);

  const dynamicNodes = useMemo(
    () => drawnNodes.filter((node) => dynamicIds.has(node.id) && shown(node)),
    [drawnNodes, dynamicIds, shown],
  );

  const staticMarkGroups = useMemo(() => {
    const groups = new Map<string, { sector: string; branch: string; d: string[] }>();
    for (const node of drawnNodes) {
      if (node.hidden || dynamicIds.has(node.id)) continue;
      const key = `${node.sector}|${node.glyph}`;
      const group = groups.get(key) ?? { sector: node.sector, branch: node.branch, d: [] };
      group.d.push(glyphPathAt(node.glyph, node.glyphRadius, node.x, node.y));
      if (node.orbit > 0) group.d.push(orbitDotsAt(node.orbit, node.glyphRadius, node.x, node.y, Math.atan2(node.y, node.x)));
      groups.set(key, group);
    }
    return [...groups.entries()].map(([key, group]) => ({ key, sector: group.sector, branch: group.branch, d: group.d.join(" ") }));
  }, [drawnNodes, dynamicIds]);

  const staticHitMarks = useMemo(
    () => drawnNodes.filter((node) => !node.hidden && !dynamicIds.has(node.id)),
    [drawnNodes, dynamicIds],
  );

  const clusterDots = useMemo(
    () => visibleClusters.map((cluster) => ({ cluster, d: dotsPath(layout, cluster), half: clusterHalfSize(cluster.members.length) })),
    [layout, visibleClusters],
  );

  const visibleSectors = useMemo(
    () => layout.sectors.filter((sector) => !hiddenBranches.has(sector.branch)),
    [layout, hiddenBranches],
  );

  /** Which drawn ring a radius falls in, counted from the centre: the intro's stagger. */
  const ringAt = useMemo(() => {
    const starts = layout.tiers
      .filter((tier) => tier.count > 0)
      .map((tier) => tier.innerRadius)
      .sort((a, b) => a - b);
    return (radius: number) => Math.max(0, starts.filter((start) => start <= radius + 1).length - 1);
  }, [layout]);
  const sectorRing = useMemo(
    () => new Map(layout.sectors.map((sector) => [sector.id, ringAt(sector.innerRadius)])),
    [layout, ringAt],
  );
  const ringStyle = (ring: number) => (intro ? ({ "--ring": ring } as CSSProperties) : undefined);
  const lastRing = ringAt(Number.POSITIVE_INFINITY) + 1;

  const sectorLabel = useCallback(
    (sector: SectorInfo) => {
      const entry = SECTOR_LABELS_I18N[sector.id];
      if (entry) return locale === "en" ? entry.en : entry.nl;
      return localized(locale, BRANCH_LABELS_I18N, sector.branch);
    },
    [locale],
  );

  const glossOf = useCallback((name: string): string | null => (locale === "en" ? orgEnGloss(name) : null), [locale]);

  /**
   * The names on the canvas: the selection, its path, its direct relations and
   * the unpacked members of the open cluster. Nothing else carries a name,
   * because 900 names at once are a texture, not a map. The placement per
   * frame decides which of these actually fit.
   */
  const labelled = useMemo(() => {
    const list: { node: LaidOutNode; state: LabelState; text: string }[] = [];
    const textOf = (node: LaidOutNode) => {
      const gloss = glossOf(node.name);
      return gloss ? `${node.name} (${gloss})` : node.name;
    };
    const seen = new Set<string>();
    const push = (node: LaidOutNode | undefined, state: LabelState) => {
      if (!node || seen.has(node.id) || !visibleIds.has(node.id) || !shown(node)) return;
      seen.add(node.id);
      list.push({ node, state, text: textOf(node) });
    };
    if (selectedNode) push(selectedNode, "selected");
    for (const id of focusPath) push(layout.byId.get(id), "path");
    const byName = (a: LaidOutNode, b: LaidOutNode) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : 1);
    const neighbours: LaidOutNode[] = [];
    for (const id of [...neighborSet, ...revealedIds]) {
      const node = layout.byId.get(id);
      if (node && !seen.has(node.id)) neighbours.push(node);
    }
    neighbours.sort(byName);
    for (const node of neighbours.slice(0, MAX_LABELS)) push(node, "neighbor");
    if (activeClusterInfo) {
      const members = activeClusterInfo.members.map((id) => layout.byId.get(id)).filter((node): node is LaidOutNode => node !== undefined);
      members.sort(byName);
      for (const node of members.slice(0, MAX_LABELS)) push(node, "member");
    }
    return list;
  }, [layout, selectedNode, focusPath, neighborSet, revealedIds, activeClusterInfo, visibleIds, shown, glossOf]);

  const chambers = bundle.chambers;
  const statenSector = layout.sectors.find((sector) => sector.id === "staten-generaal") ?? null;

  /**
   * The chambers as benches: their seats on the sector's own rings, in one
   * merged path per fractie, and a wedge per fractie to hover and click.
   */
  const benches = useMemo(() => {
    const list: { bench: Bench; blocks: (BenchBlock & { d: string; wedge: string })[] }[] = [];
    const anchors = new Map<string, { x: number; y: number; r: number }>();
    for (const sector of layout.sectors) {
      if (hiddenBranches.has(sector.branch)) continue;
      for (const bench of sector.benches) {
        const chamber = chambers[bench.id];
        if (!chamber) continue;
        const { seats, blocks } = benchSeats(bench, chamber.entries);
        const paths = new Map<number, string[]>();
        for (const seat of seats) {
          const parts = paths.get(seat.block) ?? [];
          parts.push(glyphPathAt("dot", bench.seatRadius, seat.x, seat.y));
          paths.set(seat.block, parts);
        }
        const middle = (bench.innerRadius + bench.outerRadius) / 2;
        for (const block of blocks) {
          anchors.set(`${bench.id}|${block.index}`, {
            x: Math.cos(block.midAngle) * middle,
            y: Math.sin(block.midAngle) * middle,
            r: (bench.outerRadius - bench.innerRadius) / 2 + 2,
          });
        }
        list.push({
          bench,
          blocks: blocks.map((block) => ({
            ...block,
            d: (paths.get(block.index) ?? []).join(" "),
            wedge: wedgePath(block.startAngle, block.endAngle, bench.innerRadius - 1.5, bench.outerRadius + 1.5),
          })),
        });
      }
    }
    return { list, anchors };
  }, [layout, chambers, hiddenBranches]);

  const fractieKey = (chamberId: string, index: number) => `${chamberId}|${index}`;
  const selectedFractieKey = selectedFractie ? fractieKey(selectedFractie.chamberId, selectedFractie.index) : null;

  // ---------------------------------------------------------------------------
  // Motion
  // ---------------------------------------------------------------------------

  /**
   * What the animation frame draws. It lives in a ref, not in the frame's
   * closure: a loop started before the reader clicked would otherwise keep
   * drawing the previous state until it settled.
   */
  const frameDataRef = useRef({ layout, liveEdges, labelled, anchors: benches.anchors });
  useLayoutEffect(() => {
    frameDataRef.current = { layout, liveEdges, labelled, anchors: benches.anchors };
    warmEdgesRef.current = "";
  }, [layout, liveEdges, labelled, benches]);

  const measureScreen = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vb = layout.viewBox;
    const scale = Math.min(rect.width / vb.width, rect.height / vb.height);
    screenRef.current = {
      scale: scale > 0 ? scale : 1,
      offsetX: (rect.width - vb.width * scale) / 2,
      offsetY: (rect.height - vb.height * scale) / 2,
      width: rect.width,
      height: rect.height,
    };
  }, [layout.viewBox]);

  /** A canvas point through the view: where it is in viewBox units on screen. */
  const project = useCallback((x: number, y: number) => {
    const k = viewK.current.value;
    const cos = Math.cos(rot.current.value);
    const sin = Math.sin(rot.current.value);
    return { x: viewX.current.value + k * (cos * x - sin * y), y: viewY.current.value + k * (sin * x + cos * y) };
  }, []);

  /**
   * Place the labels and the tooltip for the current view. Labels live
   * outside the view and rotation groups, so they stay upright and keep one
   * size on screen: each mark's position is projected through the view, and
   * the font is sized in viewBox units so it comes out at `LABEL_PX` pixels.
   */
  const placeOverlays = useCallback(() => {
    const data = frameDataRef.current;
    const unit = 1 / screenRef.current.scale;
    const positionOf = (node: LaidOutNode) => positionsRef.current.get(node.id) ?? node;
    if (data.labelled.length > 0) {
      const k = viewK.current.value;
      const items: LabelItem[] = [];
      const fonts = new Map<string, number>();
      for (const entry of data.labelled) {
        const px = entry.state === "selected" ? LABEL_PX_SELECTED : LABEL_PX;
        const font = px * unit;
        const widthAtMeasure = labelWidths.current.get(entry.node.id) ?? entry.text.length * MEASURE_PX * 0.55;
        const growth = entry.state === "selected" ? SELECTED_GROWTH + 6 : 0;
        const at = project(positionOf(entry.node).x, positionOf(entry.node).y);
        fonts.set(entry.node.id, font);
        items.push({
          id: entry.node.id,
          x: at.x,
          y: at.y,
          r: k * (entry.node.glyphRadius + growth),
          width: (widthAtMeasure / MEASURE_PX) * font,
          height: font * 1.2,
          priority: LABEL_PRIORITY[entry.state],
        });
      }
      const slots = placeLabels(items, 3 * unit);
      for (const entry of data.labelled) {
        const element = labelRefs.current.get(entry.node.id);
        if (!element) continue;
        const slot = slots.get(entry.node.id);
        if (!slot) {
          element.setAttribute("opacity", "0");
          continue;
        }
        const font = fonts.get(entry.node.id) ?? LABEL_PX * unit;
        element.setAttribute("x", slot.x.toFixed(2));
        element.setAttribute("y", slot.y.toFixed(2));
        element.setAttribute("text-anchor", slot.anchor);
        element.setAttribute("font-size", font.toFixed(2));
        element.setAttribute("stroke-width", (font * 0.28).toFixed(2));
        element.setAttribute("opacity", "1");
      }
    }

    const tooltip = tooltipRef.current;
    const hover = hoverRef.current;
    if (hover?.kind === "node" && hoverMarkRef.current) {
      const node = data.layout.byId.get(hover.id);
      if (node) {
        const at = positionOf(node);
        hoverMarkRef.current.setAttribute("transform", `translate(${at.x.toFixed(2)} ${at.y.toFixed(2)})`);
      }
    }
    if (tooltip && hover) {
      const screen = screenRef.current;
      let anchor: { x: number; y: number; r: number } | null = null;
      if (hover.kind === "fractie") {
        const at = data.anchors.get(hover.id);
        if (at) anchor = { ...project(at.x, at.y), r: viewK.current.value * at.r };
      } else if (hover.kind === "node" || hover.kind === "dot") {
        const node = data.layout.byId.get(hover.id);
        if (node) {
          const at = positionOf(node);
          anchor = { ...project(at.x, at.y), r: viewK.current.value * (hover.kind === "dot" ? CLUSTER_DOT_RADIUS + 2 : node.glyphRadius + 4) };
        }
      } else {
        const cluster = data.layout.clusterById.get(hover.id);
        if (cluster) {
          const at = positionsRef.current.get(cluster.id) ?? cluster;
          const half = clusterHalfSize(cluster.members.length);
          anchor = { ...project(at.x, at.y), r: viewK.current.value * Math.hypot(half.halfWidth, half.halfHeight) };
        }
      }
      if (anchor) {
        const px = (anchor.x - data.layout.viewBox.x) * screen.scale + screen.offsetX;
        const py = (anchor.y - data.layout.viewBox.y) * screen.scale + screen.offsetY;
        const gap = anchor.r * screen.scale + 10;
        const width = tooltip.offsetWidth;
        const height = tooltip.offsetHeight;
        // Above the mark when there is room, below it otherwise; never off the side.
        const above = py - gap - height >= 4;
        const left = Math.min(Math.max(4, px - width / 2), Math.max(4, screen.width - width - 4));
        const top = above ? py - gap - height : py + gap;
        tooltip.style.transform = `translate(${left.toFixed(0)}px, ${top.toFixed(0)}px)`;
      }
    }
  }, [project]);

  const kick = useCallback(() => {
    if (cancelFrameRef.current !== null) return;
    lastTimeRef.current = 0;
    const tick = (now: number) => {
      cancelFrameRef.current = null;
      const dt = lastTimeRef.current === 0 ? 1 / 60 : (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (prefersReducedMotion()) {
        snap(rot.current);
        snap(move.current);
        snap(viewK.current);
        snap(viewX.current);
        snap(viewY.current);
      } else {
        stepSpring(rot.current, dt, SPRING_TURN);
        stepSpring(move.current, dt, SPRING_SNAPPY);
        stepSpring(viewK.current, dt, SPRING_SOFT);
        stepSpring(viewX.current, dt, SPRING_SOFT);
        stepSpring(viewY.current, dt, SPRING_SOFT);
      }

      viewGroupRef.current?.setAttribute(
        "transform",
        `translate(${viewX.current.value.toFixed(2)} ${viewY.current.value.toFixed(2)}) scale(${viewK.current.value.toFixed(4)})`,
      );
      const degrees = (rot.current.value * 180) / Math.PI;
      rotGroupRef.current?.setAttribute("transform", `rotate(${degrees.toFixed(3)})`);
      // Everything in flight: marks slide along their rings from where they
      // were to where they go, dots grow into marks or shrink back, and grids
      // shift as blocks. One scalar drives it all.
      const frame = frameDataRef.current;
      const progress = settled(move.current) || move.current.value >= 0.998 ? 1 : Math.max(0, move.current.value);
      const positions = new Map<string, { x: number; y: number }>();
      for (const [id, flight] of flightsRef.current) {
        const angle = flight.from.angle + wrapPi(flight.to.angle - flight.from.angle) * progress;
        const radius = flight.from.radius + (flight.to.radius - flight.from.radius) * progress;
        const point = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
        positions.set(id, point);
        const cluster = frame.layout.clusterById.get(id);
        if (cluster) {
          const element = clusterRefs.current.get(id);
          if (!element) continue;
          const turn = ((angle - cluster.angle) * 180) / Math.PI;
          element.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${turn.toFixed(3)}) translate(${(-cluster.x).toFixed(2)} ${(-cluster.y).toFixed(2)})`);
          continue;
        }
        const element = markRefs.current.get(id);
        if (!element) continue;
        const scale = flight.from.scale + (flight.to.scale - flight.from.scale) * progress;
        element.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) scale(${scale.toFixed(3)})`);
      }
      positionsRef.current = positions;
      if (progress >= 1 && !settledFlightRef.current) {
        settledFlightRef.current = true;
        flightsRef.current = new Map();
        onFlightSettledRef.current?.();
      }

      if (frame.liveEdges.length > 0) {
        const settling = settled(move.current);
        frameCountRef.current += 1;
        const refreshWarm = settling || frameCountRef.current % 6 === 0 || warmEdgesRef.current === "";
        const segments: Record<"base" | "neighbour" | "path", string[]> = { base: [], neighbour: [], path: [] };
        const warm: string[] = [];
        for (const edge of frame.liveEdges) {
          if (!edge.hot && !refreshWarm) continue;
          const from = frame.layout.byId.get(edge.from);
          const to = frame.layout.byId.get(edge.to);
          if (!from || !to) continue;
          const d = edgeShape(from, to, positions.get(edge.from) ?? from, positions.get(edge.to) ?? to);
          if (edge.hot) segments[edge.state].push(d);
          else warm.push(d);
        }
        if (refreshWarm) warmEdgesRef.current = warm.join(" ");
        segments.base.push(warmEdgesRef.current);
        for (const state of ["base", "neighbour", "path"] as const) {
          liveEdgeRefs.current[state]?.setAttribute("d", segments[state].join(" "));
        }
      }

      placeOverlays();

      const done =
        settled(rot.current) && settled(move.current) && settled(viewK.current) && settled(viewX.current) && settled(viewY.current);
      if (!done) cancelFrameRef.current = scheduleFrame(tick);
    };
    cancelFrameRef.current = scheduleFrame(tick);
  }, [placeOverlays, edgeShape]);

  // Clearing the handle matters: React remounts effects in development, and a
  // cancelled frame left in the ref would make every later kick a no-op.
  useEffect(
    () => () => {
      cancelFrameRef.current?.();
      cancelFrameRef.current = null;
    },
    [],
  );

  /**
   * The rest pose, written before the first paint. The animation frame owns
   * the view afterwards, but it must not own the first one: a canvas that has
   * not animated yet still has to be in the right place.
   */
  useLayoutEffect(() => {
    viewGroupRef.current?.setAttribute(
      "transform",
      `translate(${viewX.current.value.toFixed(2)} ${viewY.current.value.toFixed(2)}) scale(${viewK.current.value.toFixed(4)})`,
    );
    rotGroupRef.current?.setAttribute("transform", `rotate(${((rot.current.value * 180) / Math.PI).toFixed(3)})`);
  }, [layout]);

  /** Keep the label size in step with the size of the svg on screen. */
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    measureScreen();
    placeOverlays();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      measureScreen();
      placeOverlays();
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, [measureScreen, placeOverlays]);

  /** A new set of labels is placed at once, before the reader sees it unplaced. */
  useLayoutEffect(() => {
    placeOverlays();
  }, [labelled, placeOverlays]);

  /**
   * Plan the flights whenever the open cluster changes: every mark and grid
   * of the sectors involved starts where it is now and goes to its target in
   * the new pose, or back to rest. The scalar restarts at 0, so a click in the
   * middle of a move continues from the current picture instead of snapping.
   */
  useLayoutEffect(() => {
    const flights = new Map<string, Flight>();
    const current = positionsRef.current;
    const restOf = (id: string): (PolarTarget & { scale: number }) | null => {
      const cluster = layout.clusterById.get(id);
      if (cluster) return { angle: cluster.angle, radius: cluster.radius, scale: 1 };
      const node = layout.byId.get(id);
      if (!node) return null;
      return { angle: node.angle, radius: node.radius, scale: node.cluster ? CLUSTER_DOT_RADIUS / node.glyphRadius : 1 };
    };
    const startOf = (id: string): (PolarTarget & { scale: number }) | null => {
      const inFlight = flightsRef.current.get(id);
      const at = current.get(id);
      const rest = restOf(id);
      if (!rest) return null;
      if (!at) return rest;
      const progress = settled(move.current) || move.current.value >= 0.998 ? 1 : Math.max(0, move.current.value);
      const scale = inFlight ? inFlight.from.scale + (inFlight.to.scale - inFlight.from.scale) * progress : rest.scale;
      return { angle: Math.atan2(at.y, at.x), radius: Math.hypot(at.x, at.y), scale };
    };
    const plan = (id: string, to: (PolarTarget & { scale: number }) | null) => {
      const from = startOf(id);
      if (!from || !to) return;
      flights.set(id, { from, to });
    };
    // Everything that was in flight or is in the previous pose goes back to rest unless the new pose says otherwise.
    const involved = new Set<string>([...flightsRef.current.keys(), ...current.keys()]);
    if (closing?.pose) for (const id of [...closing.pose.target.keys(), ...closing.pose.clusterTarget.keys()]) involved.add(id);
    for (const id of involved) plan(id, restOf(id));
    if (pose) {
      for (const [id, target] of pose.target) {
        const node = layout.byId.get(id);
        if (!node) continue;
        const scale = node.cluster && node.cluster !== pose.openId ? CLUSTER_DOT_RADIUS / node.glyphRadius : 1;
        plan(id, { ...target, scale });
      }
      for (const [id, target] of pose.clusterTarget) plan(id, { ...target, scale: 1 });
    }
    // A flight that starts and ends at rest is no flight.
    for (const [id, flight] of flights) {
      // Positions are stored to a thousandth, so that is the tolerance.
      if (
        Math.abs(wrapPi(flight.from.angle - flight.to.angle)) * flight.to.radius < 0.01 &&
        Math.abs(flight.from.radius - flight.to.radius) < 0.01 &&
        Math.abs(flight.from.scale - flight.to.scale) < 1e-3
      ) {
        flights.delete(id);
        const node = layout.byId.get(id);
        const element = markRefs.current.get(id);
        if (node && element) element.setAttribute("transform", `translate(${node.x} ${node.y}) scale(${flight.to.scale.toFixed(3)})`);
        const grid = clusterRefs.current.get(id);
        if (grid && !node) grid.removeAttribute("transform");
      }
    }
    flightsRef.current = flights;
    settledFlightRef.current = flights.size === 0;
    if (flights.size > 0) {
      snap(move.current, 0);
      move.current.target = 1;
    }
    if (flights.size === 0) {
      for (const state of ["base", "neighbour", "path"] as const) liveEdgeRefs.current[state]?.setAttribute("d", "");
      positionsRef.current = new Map();
      if (closing) setClosing(null);
    }
    kick();
  }, [layout, pose, closing, kick]);

  /** Once the fold has landed, the folded cluster's members return to the merged dots. */
  useEffect(() => {
    onFlightSettledRef.current = () => {
      if (closing) setClosing(null);
      for (const state of ["base", "neighbour", "path"] as const) liveEdgeRefs.current[state]?.setAttribute("d", "");
    };
  }, [closing]);

  /** Selecting a dot of a cluster opens that cluster; selecting anything else folds it. */
  useEffect(() => {
    if (!selectedNode) return;
    changeOpen(selectedNode.cluster);
    setSelectedFractie(null);
  }, [selectedNode, changeOpen]);

  /**
   * Turn the canvas so the selection, or the open cluster, or the selected
   * sector reads straight above the core. The turn is one rigid rotation of
   * the whole frame: every body keeps its neighbours. The view itself never
   * zooms or pans on its own; the reader owns it through the wheel, the
   * buttons and the drag.
   */
  useEffect(() => {
    if (!turnEnabled) return;
    const sector = activeSector ? layout.sectors.find((entry) => entry.id === activeSector) ?? null : null;
    const angle = selectedNode
      ? (pose?.target.get(selectedNode.id) ?? selectedNode).angle
      : activeClusterInfo
        ? activeClusterInfo.angle
        : sector
          ? sector.midAngle
          : null;
    rot.current.target = alignRotation(angle, rot.current.target);
    kick();
  }, [layout, selectedNode, activeSector, activeClusterInfo, pose, turnEnabled, kick]);

  // ---------------------------------------------------------------------------
  // Pointer and keyboard
  // ---------------------------------------------------------------------------

  const toUserPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const screen = screenRef.current;
      return {
        x: (clientX - rect.left - screen.offsetX) / screen.scale + layout.viewBox.x,
        y: (clientY - rect.top - screen.offsetY) / screen.scale + layout.viewBox.y,
      };
    },
    [layout.viewBox],
  );

  /** A client point in the canvas's own frame: through the view and the rotation. */
  const toLocalPoint = useCallback(
    (clientX: number, clientY: number) => {
      const user = toUserPoint(clientX, clientY);
      const x = (user.x - viewX.current.value) / viewK.current.value;
      const y = (user.y - viewY.current.value) / viewK.current.value;
      const cos = Math.cos(-rot.current.value);
      const sin = Math.sin(-rot.current.value);
      return { x: cos * x - sin * y, y: sin * x + cos * y };
    },
    [toUserPoint],
  );

  /** The member whose dot is under the pointer, if the pointer is on a grid. */
  const dotAt = useCallback(
    (clusterId: string, clientX: number, clientY: number): string | null => {
      const cluster = layout.clusterById.get(clusterId);
      if (!cluster) return null;
      const point = toLocalPoint(clientX, clientY);
      let best: string | null = null;
      let bestDistance = CLUSTER_DOT_PITCH * 0.7;
      for (const id of cluster.members) {
        const node = layout.byId.get(id);
        if (!node) continue;
        const at = positionsRef.current.get(id) ?? node;
        const distance = Math.hypot(at.x - point.x, at.y - point.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = id;
        }
      }
      return best;
    },
    [layout, toLocalPoint],
  );

  const zoomAt = useCallback(
    (point: { x: number; y: number }, factor: number) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewK.current.target * factor));
      const ratio = k / viewK.current.target;
      viewX.current.target = point.x - (point.x - viewX.current.target) * ratio;
      viewY.current.target = point.y - (point.y - viewY.current.target) * ratio;
      viewK.current.target = k;
      kick();
    },
    [kick],
  );

  const zoomByCentre = useCallback((factor: number) => zoomAt({ x: 0, y: 0 }, factor), [zoomAt]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAt(toUserPoint(event.clientX, event.clientY), Math.exp(-event.deltaY * 0.0015));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [toUserPoint, zoomAt]);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest("[data-node-id],[data-cluster-id]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pointerMovedRef.current = false;

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = {
        startDist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
        startK: viewK.current.value,
        startX: viewX.current.value,
        startY: viewY.current.value,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
      dragRef.current = null;
      dialRef.current = null;
      pointerMovedRef.current = true;
      return;
    }
    if (pointersRef.current.size > 2) return;

    // Outside the outermost tier the canvas is a dial: dragging turns it.
    const user = toUserPoint(event.clientX, event.clientY);
    const local = {
      x: (user.x - viewX.current.value) / viewK.current.value,
      y: (user.y - viewY.current.value) / viewK.current.value,
    };
    if (Math.hypot(local.x, local.y) > layout.maxRadius + 6) {
      dialRef.current = { pointerId: event.pointerId, angle: Math.atan2(local.y, local.x) };
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: viewX.current.target,
      y: viewY.current.target,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    const scale = screenRef.current.scale;

    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      const factor = Math.hypot(b.x - a.x, b.y - a.y) / pinch.startDist;
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinch.startK * factor));
      const ratio = k / pinch.startK;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      viewK.current.target = k;
      viewX.current.target = pinch.startX * ratio + (midX - pinch.midX) / scale;
      viewY.current.target = pinch.startY * ratio + (midY - pinch.midY) / scale;
      snap(viewK.current, viewK.current.target);
      snap(viewX.current, viewX.current.target);
      snap(viewY.current, viewY.current.target);
      kick();
      return;
    }

    const dial = dialRef.current;
    if (dial && dial.pointerId === event.pointerId) {
      const user = toUserPoint(event.clientX, event.clientY);
      const local = {
        x: (user.x - viewX.current.value) / viewK.current.value,
        y: (user.y - viewY.current.value) / viewK.current.value,
      };
      const angle = Math.atan2(local.y, local.x);
      let delta = angle - dial.angle;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      dial.angle = angle;
      rot.current.target += delta;
      snap(rot.current, rot.current.target);
      pointerMovedRef.current = true;
      kick();
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) pointerMovedRef.current = true;
    viewX.current.target = drag.x + dx / scale;
    viewY.current.target = drag.y + dy / scale;
    snap(viewX.current, viewX.current.target);
    snap(viewY.current, viewY.current.target);
    kick();
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (dialRef.current?.pointerId === event.pointerId) dialRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /** Apply the pure click rules (web/lib/cluster-click.ts) to the canvas state. */
  const applyClick = (click: CanvasClick) => {
    const result = resolveCanvasClick(click, { selectedId, openCluster });
    changeOpen(result.open);
    if (result.select !== undefined) onSelect(result.select);
  };

  /**
   * The member of the open cluster nearest to a client point, within the hit
   * radius of a mark. A click just beside an unpacked member selects it
   * instead of folding the cluster under the reader's pointer.
   */
  const openMemberAt = (clientX: number, clientY: number): string | null => {
    if (!openCluster) return null;
    const cluster = layout.clusterById.get(openCluster);
    if (!cluster) return null;
    const point = toLocalPoint(clientX, clientY);
    let best: string | null = null;
    let bestDistance = 14;
    for (const id of cluster.members) {
      const node = layout.byId.get(id);
      if (!node || !visibleIds.has(id)) continue;
      const at = positionsRef.current.get(id) ?? node;
      const distance = Math.hypot(at.x - point.x, at.y - point.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = id;
      }
    }
    return best;
  };

  const onBackgroundClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (pointerMovedRef.current) {
      pointerMovedRef.current = false;
      return;
    }
    setActiveSector(null);
    setSelectedFractie(null);
    applyClick({ kind: "background", nearMember: openMemberAt(event.clientX, event.clientY) });
  };

  const targetAt = (event: { target: EventTarget }): Hover | null => {
    const element = (event.target as Element).closest("[data-node-id],[data-cluster-id],[data-fractie-id]");
    if (!element) return null;
    const fractie = element.getAttribute("data-fractie-id");
    if (fractie) {
      const [chamberId, index] = fractie.split("|");
      return { kind: "fractie", id: fractie, chamberId, index: Number(index) };
    }
    const nodeId = element.getAttribute("data-node-id");
    if (nodeId) return { kind: "node", id: nodeId };
    const clusterId = element.getAttribute("data-cluster-id");
    return clusterId ? { kind: "cluster", id: clusterId } : null;
  };

  const onMarkClick = (event: ReactMouseEvent<SVGGElement>) => {
    const target = targetAt(event);
    if (!target) return;
    event.stopPropagation();
    setActiveSector(null);
    if (target.kind === "fractie") {
      applyClick({ kind: "fractie" });
      setSelectedFractie((current) =>
        current && current.chamberId === target.chamberId && current.index === target.index
          ? null
          : { chamberId: target.chamberId, index: target.index },
      );
      return;
    }
    setSelectedFractie(null);
    if (target.kind === "cluster") {
      // A click on one dot selects that body; a click on the grid's edge opens it.
      applyClick({ kind: "cluster", id: target.id, dot: dotAt(target.id, event.clientX, event.clientY) });
      return;
    }
    const node = layout.byId.get(target.id);
    applyClick({ kind: "node", id: target.id, cluster: node?.cluster ?? null });
  };

  /** Moving across a grid names the dot under the pointer. */
  const onGridMove = (event: ReactPointerEvent<SVGGElement>) => {
    const target = targetAt(event);
    if (!target || target.kind !== "cluster") return;
    const dot = dotAt(target.id, event.clientX, event.clientY);
    const next: Hover = dot ? { kind: "dot", id: dot, cluster: target.id } : target;
    const current = hoverRef.current;
    if (current && current.kind === next.kind && current.id === next.id) return;
    applyHover(next);
  };

  /** Write the hover tint to the DOM and tell the tooltip; no React render of the canvas. */
  const applyHover = (target: Hover | null) => {
    const previous = hoverRef.current;
    if (previous?.kind === "fractie" && previous.id !== target?.id) {
      const wedge = fractieRefs.current.get(previous.id);
      wedge?.setAttribute("fill-opacity", previous.id === selectedFractieKey ? "0.24" : "0");
    }
    const previousGrid = previous?.kind === "cluster" ? previous.id : previous?.kind === "dot" ? previous.cluster : null;
    const targetGrid = target?.kind === "cluster" ? target.id : target?.kind === "dot" ? target.cluster : null;
    if (previousGrid && previousGrid !== targetGrid) {
      const rect = clusterRefs.current.get(previousGrid)?.querySelector("rect");
      rect?.setAttribute("fill-opacity", "0.06");
      rect?.setAttribute("stroke-opacity", "0.25");
    }
    hoverRef.current = target;
    const mark = hoverMarkRef.current;
    const path = hoverPathRef.current;
    if (mark && path) {
      const node = target?.kind === "node" ? layout.byId.get(target.id) : null;
      if (node && shown(node) && !node.arch && node.id !== selectedId) {
        const color = branchColorVar(node.branch);
        path.setAttribute("d", glyphPath(node.glyph, node.glyphRadius));
        path.setAttribute("fill", color);
        path.setAttribute("stroke", color);
        mark.setAttribute("opacity", "1");
      } else {
        mark.setAttribute("opacity", "0");
      }
    }
    if (targetGrid) {
      const rect = clusterRefs.current.get(targetGrid)?.querySelector("rect");
      rect?.setAttribute("fill-opacity", "0.22");
      rect?.setAttribute("stroke-opacity", "0.7");
    }
    if (target?.kind === "fractie") {
      fractieRefs.current.get(target.id)?.setAttribute("fill-opacity", "0.4");
    }
    hoverCardRef.current?.(target);
    placeOverlays();
  };

  const onMarkOver = (event: ReactPointerEvent<SVGGElement>) => {
    const target = targetAt(event);
    if (target && target.id !== hoverRef.current?.id) applyHover(target);
  };

  const onMarkOut = (event: ReactPointerEvent<SVGGElement>) => {
    const target = targetAt(event);
    const current = hoverRef.current;
    if (!target || !current) return;
    if (current.id === target.id || (current.kind === "dot" && current.cluster === target.id)) applyHover(null);
  };

  const onSectorClick = (event: ReactMouseEvent<SVGGElement>) => {
    const target = (event.target as Element).closest("[data-sector-id]");
    const id = target?.getAttribute("data-sector-id") ?? null;
    if (!id) return;
    event.stopPropagation();
    if (pointerMovedRef.current) {
      pointerMovedRef.current = false;
      return;
    }
    // Inside the open cluster's own sector the wedge lies under the unpacked
    // members: a click there picks the member beside the pointer, or does
    // nothing, and never folds the cluster (docs: lib/cluster-click.ts).
    if (openCluster && layout.clusterById.get(openCluster)?.sector === id) {
      const member = openMemberAt(event.clientX, event.clientY);
      if (member) applyClick({ kind: "background", nearMember: member });
      return;
    }
    onSelect(null);
    changeOpen(null);
    setSelectedFractie(null);
    setActiveSector((current) => (current === id ? null : id));
  };

  const onDoubleClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    const target = targetAt(event);
    const node = target?.kind === "node" ? layout.byId.get(target.id) : null;
    if (node) {
      event.preventDefault();
      event.stopPropagation();
      router.push(`/organisaties/${node.slug}/`);
    }
  };

  const moveSelection = (delta: number) => {
    if (walkNodes.length === 0) return;
    const index = selectedId ? walkNodes.findIndex((node) => node.id === selectedId) : -1;
    const next = index === -1 ? (delta > 0 ? 0 : walkNodes.length - 1) : (index + delta + walkNodes.length) % walkNodes.length;
    setActiveSector(null);
    onSelect(walkNodes[next].id);
  };

  const turnBySector = (direction: number) => {
    rot.current.target += direction * (Math.PI / 6);
    kick();
  };

  const onKeyDown = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveSelection(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveSelection(-1);
        break;
      case "Home":
        event.preventDefault();
        if (walkNodes[0]) onSelect(walkNodes[0].id);
        break;
      case "End":
        event.preventDefault();
        if (walkNodes.length > 0) onSelect(walkNodes[walkNodes.length - 1].id);
        break;
      case "Enter":
        if (selectedNode) {
          event.preventDefault();
          router.push(`/organisaties/${selectedNode.slug}/`);
        }
        break;
      case "Escape":
        event.preventDefault();
        if (selectedId) onSelect(null);
        else if (selectedFractie) setSelectedFractie(null);
        else if (openCluster) changeOpen(null);
        else setActiveSector(null);
        break;
      case "[":
        event.preventDefault();
        turnBySector(-1);
        break;
      case "]":
        event.preventDefault();
        turnBySector(1);
        break;
      case "+":
      case "=":
        event.preventDefault();
        zoomByCentre(1.25);
        break;
      case "-":
      case "_":
        event.preventDefault();
        zoomByCentre(0.8);
        break;
      case "0":
        event.preventDefault();
        viewK.current.target = 1;
        viewX.current.target = 0;
        viewY.current.target = 0;
        rot.current.target = alignRotation(null, rot.current.target, 0);
        kick();
        break;
      default:
        break;
    }
  };

  const setLabelRef = useCallback(
    (id: string) => (element: SVGTextElement | null) => {
      if (element) {
        labelRefs.current.set(id, element);
        if (!labelWidths.current.has(id)) {
          element.setAttribute("font-size", String(MEASURE_PX));
          try {
            labelWidths.current.set(id, element.getComputedTextLength());
          } catch {
            // A detached or unsupported element: the estimate in the placement pass is used.
          }
        }
      } else {
        labelRefs.current.delete(id);
      }
    },
    [],
  );

  const setMarkRef = useCallback(
    (node: LaidOutNode) => (element: SVGGElement | null) => {
      if (element) {
        markRefs.current.set(node.id, element);
        const flight = flightsRef.current.get(node.id);
        const at = positionsRef.current.get(node.id);
        if (flight && at) {
          element.setAttribute("transform", `translate(${at.x.toFixed(2)} ${at.y.toFixed(2)}) scale(${flight.from.scale.toFixed(3)})`);
        } else if (node.cluster) {
          element.setAttribute("transform", `translate(${node.x} ${node.y}) scale(${(CLUSTER_DOT_RADIUS / node.glyphRadius).toFixed(3)})`);
        }
      } else {
        markRefs.current.delete(node.id);
      }
    },
    [],
  );

  const setClusterRef = useCallback(
    (id: string) => (element: SVGGElement | null) => {
      if (element) clusterRefs.current.set(id, element);
      else clusterRefs.current.delete(id);
    },
    [],
  );

  /** One target for the details panel: whatever the reader last picked. */
  const detailsTarget: DetailsTarget = selectedNode
    ? { kind: "node", id: selectedNode.id }
    : selectedFractie
      ? { kind: "fractie", chamberId: selectedFractie.chamberId, index: selectedFractie.index }
      : activeClusterInfo
        ? { kind: "cluster", id: activeClusterInfo.id }
        : activeSector
          ? { kind: "sector", id: activeSector }
          : null;

  const pickNode = (id: string | null) => {
    setActiveSector(null);
    setSelectedFractie(null);
    onSelect(id);
  };
  const pickCluster = (id: string | null) => {
    setActiveSector(null);
    setSelectedFractie(null);
    onSelect(null);
    changeOpen(id);
  };
  const pickFractie = (chamberId: string, index: number) => {
    setActiveSector(null);
    onSelect(null);
    changeOpen(null);
    setSelectedFractie({ chamberId, index });
  };
  const clearSelection = () => {
    setActiveSector(null);
    setSelectedFractie(null);
    changeOpen(null);
    onSelect(null);
  };

  /** What a cluster is, in words: whose children, whose oversight, or which kind of body. */
  const clusterLabel = useCallback(
    (cluster: ClusterInfo) => {
      const n = cluster.members.length;
      const parent = cluster.parent ? layout.byId.get(cluster.parent)?.name ?? "" : "";
      if (cluster.kind === "oversight") return t("clusterOversightTip", { n, parent });
      if (cluster.kind === "subtype") {
        const plural =
          cluster.subtype === "veiligheidsregio"
            ? t("pluralVeiligheidsregio")
            : cluster.subtype === "samenwerkingsverband"
              ? t("pluralSamenwerkingsverband")
              : t("pluralOther");
        return t("clusterSubtypeTip", { n, plural });
      }
      return t("clusterTip", { n, parent });
    },
    [layout, t],
  );

  const statusText = selectedNode
    ? `${selectedNode.name}, ${localized(locale, ORG_SUBTYPE_LABELS_I18N, selectedNode.subtype)}, ${localized(locale, TIER_LABELS_I18N, selectedNode.tier)}. ${t("connections", { n: neighborSet.size })}`
    : activeClusterInfo
      ? t("clusterStatus", { label: clusterLabel(activeClusterInfo) })
      : activeSector
        ? t("sectorStatus", {
            name: sectorLabel(layout.sectors.find((sector) => sector.id === activeSector) as SectorInfo),
            n: layout.sectors.find((sector) => sector.id === activeSector)?.count ?? 0,
          })
        : t("noSelection");

  return (
    // The details panel sits beside the drawing when the canvas is at least
    // 44rem wide and below it otherwise (a phone, the 32rem-plus column on an
    // iPad in landscape), so the drawing is never squeezed into a sliver.
    <div className="@container h-full min-h-0 w-full">
    <div className="flex h-full min-h-0 w-full flex-col @min-[44rem]:flex-row">
      <div ref={containerRef} className="@container/drawing relative flex min-h-0 min-w-0 flex-1 flex-col">
      <p className="sr-only" aria-live="polite">
        {statusText}
      </p>
      <svg
        ref={svgRef}
        viewBox={`${layout.viewBox.x} ${layout.viewBox.y} ${layout.viewBox.width} ${layout.viewBox.height}`}
        role="group"
        tabIndex={0}
        aria-label={t("graphHint")}
        aria-describedby="grafiek-instructie"
        className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onClick={onBackgroundClick}
        onDoubleClick={onDoubleClick}
      >
        <defs>
          {layout.tiers
            .filter((tier) => tier.count > 0)
            .map((tier) => {
              const arc = tierLabelArc(tier, -Math.PI / 2);
              return <path key={arc.id} id={arc.id} d={arc.d} fill="none" />;
            })}
          {visibleSectors.map((sector) => {
            const arc = sectorLabelArc(sector);
            return arc ? <path key={arc.id} id={arc.id} d={arc.d} fill="none" /> : null;
          })}
          {benches.list.map(({ bench }) => {
            const arc = benchLabelArc(bench);
            return <path key={arc.id} id={arc.id} d={arc.d} fill="none" />;
          })}
          <marker
            id="grafiek-pijl"
            viewBox="0 0 10 10"
            refX={7}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path
              d="M 1 1.4 L 8.6 5 L 1 8.6"
              fill="none"
              stroke="var(--t-color-accent-text)"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>

        <g ref={viewGroupRef} className={intro ? "sg-intro" : undefined}>
          <g ref={rotGroupRef}>
            {/* Tier rings and sector wedges. */}
            <g aria-hidden="true">
              {layout.tiers
                .filter((tier) => tier.count > 0)
                .map((tier) => (
                  <path
                    key={`ring-${tier.id}`}
                    className="sg-intro-fade"
                    style={ringStyle(ringAt(tier.innerRadius))}
                    d={ringPath(tier.innerRadius - 12)}
                    fill="none"
                    stroke="var(--t-color-line)"
                    strokeWidth={0.8}
                    opacity={0.7}
                    pointerEvents="none"
                  />
                ))}
              <g onClick={onSectorClick} className="sg-intro-fade">
                {visibleSectors.map((sector) => {
                  const wedge = sectorWedge(sector);
                  const active = activeSector === sector.id || selectedNode?.sector === sector.id || activeClusterInfo?.sector === sector.id;
                  return (
                    <path
                      key={`wedge-${sector.id}`}
                      data-sector-id={sector.id}
                      d={wedge.d}
                      fill={wedge.color}
                      fillOpacity={active ? 0.16 : 0.06}
                      stroke={wedge.color}
                      strokeOpacity={active ? 0.4 : 0.14}
                      strokeWidth={0.7}
                      className="cursor-pointer"
                    />
                  );
                })}
              </g>
            </g>

            {/* Edges the selection lights up: its relations, and its path to the electorate. */}
            <g aria-hidden="true" pointerEvents="none">
              <path
                d={highlightEdges.segments.neighbour}
                fill="none"
                stroke="var(--color-accent-text)"
                strokeWidth={1}
                opacity={0.75}
                markerEnd="url(#grafiek-pijl)"
              />
              <path d={highlightEdges.segments.path} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" />
            </g>

            {/* Edges with an end in the moving sector, redrawn every frame. */}
            <g aria-hidden="true" pointerEvents="none">
              <path
                ref={(element) => {
                  liveEdgeRefs.current.neighbour = element;
                }}
                fill="none"
                stroke="var(--color-accent-text)"
                strokeWidth={1}
                opacity={0.75}
                markerEnd="url(#grafiek-pijl)"
              />
              <path
                ref={(element) => {
                  liveEdgeRefs.current.path = element;
                }}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </g>

            {/* Marks at rest: one outlined path per sector and glyph, then a cheap hit circle each. */}
            <g aria-hidden="true" pointerEvents="none">
              {staticMarkGroups.map((group) => (
                <path
                  key={group.key}
                  className="sg-intro-ring"
                  style={ringStyle(sectorRing.get(group.sector) ?? 0)}
                  d={group.d}
                  fill={branchColorVar(group.branch as OrgBranchName)}
                  fillOpacity={0.22}
                  stroke={branchColorVar(group.branch as OrgBranchName)}
                  strokeWidth={0.9}
                  strokeLinejoin="round"
                  opacity={
                    activeSector
                      ? group.sector === activeSector
                        ? 0.9
                        : DIM_OPACITY
                      : selectedId || activeClusterInfo
                        ? DIM_OPACITY
                        : 0.9
                  }
                />
              ))}
            </g>
            <g onClick={onMarkClick} onPointerOver={onMarkOver} onPointerOut={onMarkOut}>
              {staticHitMarks.map((node) => (
                <circle
                  key={node.id}
                  data-node-id={node.id}
                  cx={node.x}
                  cy={node.y}
                  r={Math.max(10, node.glyphRadius + 4)}
                  fill="transparent"
                  className="cursor-pointer"
                />
              ))}
            </g>

            {/* Clusters: the standing children of one parent as a grid of dots, one hit block each. */}
            <g onClick={onMarkClick} onPointerOver={onMarkOver} onPointerOut={onMarkOut} onPointerMove={onGridMove}>
              {clusterDots.map(({ cluster, d, half }) => {
                const color = branchColorVar(sectorBranch(cluster.sector));
                const isOpen = hiddenGrids.has(cluster.id);
                const dim =
                  (selectedId || activeClusterInfo) && !isOpen && !(selectedNode && cluster.parent !== null && selectedNode.parent === cluster.parent);
                return (
                  <g
                    key={cluster.id}
                    ref={setClusterRef(cluster.id)}
                    data-cluster-id={cluster.id}
                    className="sg-intro-fade cursor-pointer"
                    style={ringStyle(ringAt(Math.hypot(cluster.x, cluster.y)))}
                    opacity={isOpen ? 0 : dim ? DIM_OPACITY : 1}
                    pointerEvents={isOpen ? "none" : undefined}
                  >
                    <rect
                      x={-half.halfHeight - 2.5}
                      y={-half.halfWidth - 2.5}
                      width={2 * half.halfHeight + 5}
                      height={2 * half.halfWidth + 5}
                      rx={2}
                      transform={`translate(${cluster.x} ${cluster.y}) rotate(${((cluster.angle * 180) / Math.PI).toFixed(2)})`}
                      fill={color}
                      fillOpacity={0.06}
                      stroke={color}
                      strokeOpacity={0.25}
                      strokeWidth={0.6}
                    />
                    <path d={d} fill={color} fillOpacity={0.85} pointerEvents="none" />
                  </g>
                );
              })}
            </g>

            {/* Marks that are selected, on the path, related, revealed or moving: one element each. */}
            <g onClick={onMarkClick} onPointerOver={onMarkOver} onPointerOut={onMarkOut}>
              {dynamicNodes.map((node) => {
                const state: MarkState =
                  node.id === selectedId
                    ? "selected"
                    : focusSet.has(node.id)
                      ? "path"
                      : neighborSet.has(node.id) || revealedIds.has(node.id)
                        ? "neighbor"
                        : poseMarkIds.has(node.id)
                          ? node.cluster
                            ? "member"
                            : selectedId
                              ? "dim"
                              : "base"
                          : selectedId || activeSector || activeClusterInfo
                            ? activeSector && node.sector === activeSector
                              ? "base"
                              : "dim"
                            : "base";
                return <Mark key={node.id} node={node} state={state} setRef={setMarkRef(node)} />;
              })}
            </g>

            {/* The hover tint: one element, written by the pointer handlers, never reconciled. */}
            <g ref={hoverMarkRef} aria-hidden="true" pointerEvents="none" opacity={0}>
              <path ref={hoverPathRef} fillOpacity={0.55} strokeWidth={1.3} strokeLinejoin="round" />
            </g>

            {/*
              The two Kamers: the Staten-Generaal are their seats (Grondwet
              art. 51), so the sector's own rings carry them. One stretch of
              arc per chamber, one wedge of columns per fractie.
            */}
            <g onClick={onMarkClick} onPointerOver={onMarkOver} onPointerOut={onMarkOut}>
              {benches.list.map(({ bench, blocks }) => {
                const chamberName = layout.byId.get(bench.id)?.name ?? bench.id;
                const isChamber = selectedId === bench.id;
                const dim = Boolean(selectedId || selectedFractie || activeClusterInfo || activeSector);
                return (
                  <g key={bench.id} className="sg-intro-ring" style={ringStyle(ringAt(bench.innerRadius))}>
                    {/* The chamber itself: the band its seats sit in, and its name on an arc. */}
                    <path
                      d={wedgePath(bench.startAngle, bench.endAngle, bench.innerRadius - 5, bench.outerRadius + 5)}
                      data-node-id={bench.id}
                      className="cursor-pointer"
                      fill={isChamber ? "var(--t-color-accent)" : "var(--t-color-line-strong)"}
                      fillOpacity={isChamber ? 0.14 : 0.05}
                      stroke={isChamber ? "var(--t-color-accent)" : "var(--t-color-line-strong)"}
                      strokeOpacity={isChamber ? 0.8 : 0.2}
                      strokeWidth={isChamber ? 1.2 : 0.6}
                    >
                      <title>{chamberName}</title>
                    </path>
                    {blocks.map((block) => {
                      const key = fractieKey(bench.id, block.index);
                      const picked = selectedFractieKey === key;
                      const color = block.color ?? "var(--t-color-line-strong)";
                      return (
                        <g key={key}>
                          <path
                            d={block.d}
                            fill={color}
                            fillOpacity={picked ? 1 : dim && !isChamber ? 0.45 : 0.85}
                            pointerEvents="none"
                          />
                          <path
                            ref={(element) => {
                              if (element) fractieRefs.current.set(key, element);
                              else fractieRefs.current.delete(key);
                            }}
                            d={block.wedge}
                            data-fractie-id={key}
                            className="cursor-pointer"
                            fill={color}
                            fillOpacity={picked ? 0.24 : 0}
                            stroke={picked ? "var(--t-color-accent)" : "transparent"}
                            strokeWidth={picked ? 1.2 : 0}
                          />
                        </g>
                      );
                    })}
                    <path
                      d={benchLabelArc(bench).d}
                      data-node-id={bench.id}
                      className="cursor-pointer"
                      fill="none"
                      stroke="transparent"
                      strokeWidth={11}
                    />
                    <text
                      aria-hidden="true"
                      pointerEvents="none"
                      fill={isChamber ? "var(--t-color-accent-text)" : "var(--color-ink-muted)"}
                      style={{ fontSize: 8.5, letterSpacing: "0.1em", fontWeight: 600 }}
                    >
                      <textPath href={`#${benchLabelArc(bench).id}`} startOffset="50%" textAnchor="middle">
                        {chamberName.toUpperCase()}
                      </textPath>
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Tier and sector labels. */}
            <g aria-hidden="true" pointerEvents="none" className="sg-intro-fade" style={ringStyle(lastRing)}>
              {layout.tiers
                .filter((tier) => tier.count > 0)
                .map((tier) => (
                  <text
                    key={`tier-label-${tier.id}`}
                    fill="var(--color-ink-faint)"
                    style={{ fontSize: 10, letterSpacing: "0.14em", fontWeight: 600 }}
                  >
                    <textPath href={`#tier-arc-${tier.id}`} startOffset="50%" textAnchor="middle">
                      {localized(locale, TIER_LABELS_I18N, tier.id).toUpperCase()}
                    </textPath>
                  </text>
                ))}
              {visibleSectors.map((sector) => {
                const arc = sectorLabelArc(sector);
                if (!arc) return null;
                return (
                  <text
                    key={`sector-label-${sector.id}`}
                    fill={branchColorVar(sector.branch)}
                    fillOpacity={activeSector === sector.id ? 1 : 0.85}
                    style={{ fontSize: 9, letterSpacing: "0.08em", fontWeight: 600 }}
                  >
                    <textPath href={`#${arc.id}`} startOffset="50%" textAnchor="middle">
                      {sectorLabel(sector)}
                    </textPath>
                  </text>
                );
              })}
            </g>

            {/* The core: the constitution every tier radiates from. */}
            <g aria-hidden="true" pointerEvents="none">
              <circle r={layout.coreRadius} fill="var(--t-color-surface)" stroke="var(--t-color-ink)" strokeOpacity={0.45} strokeWidth={1.2} />
              <text textAnchor="middle" fill="var(--t-color-ink)" style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>
                <tspan x={0} dy={-2}>
                  {t("coreTitle")}
                </tspan>
                <tspan x={0} dy={14} style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.04em" }}>
                  {t("coreSubtitle")}
                </tspan>
              </text>
            </g>

            {/* The electorate: the frame everything sits inside. */}
            {layout.frame ? (
              <g onPointerOver={onMarkOver} onPointerOut={onMarkOut}>
                <circle
                  r={layout.frameRadius}
                  fill="none"
                  stroke="var(--t-color-accent)"
                  strokeWidth={2}
                  opacity={0.9}
                  data-node-id={layout.frame.id}
                  className="cursor-pointer"
                  onClick={onMarkClick}
                />
                <text
                  y={-layout.frameRadius - 12}
                  textAnchor="middle"
                  fill="var(--t-color-accent)"
                  style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.18em" }}
                  aria-hidden="true"
                  pointerEvents="none"
                >
                  {layout.frame.name.toUpperCase()}
                </text>
              </g>
            ) : null}
          </g>
        </g>

        {/*
          Names, outside the view so they stay upright and one size on screen.
          The motion layer positions them; a name that does not fit is hidden.
        */}
        <g aria-hidden="true" pointerEvents="none" fontFamily="inherit">
          {labelled.map((entry) => (
            <text
              key={`label-${entry.node.id}`}
              ref={setLabelRef(entry.node.id)}
              opacity={0}
              dominantBaseline="central"
              fill={entry.state === "selected" ? "var(--t-color-accent-text)" : entry.state === "member" ? "var(--t-color-ink-muted)" : "var(--t-color-ink)"}
              fontWeight={entry.state === "selected" ? 700 : 500}
              stroke="var(--t-color-canvas)"
              strokeLinejoin="round"
              style={{ paintOrder: "stroke" }}
            >
              {entry.text}
            </text>
          ))}
        </g>
      </svg>

      <p id="grafiek-instructie" className="sr-only">
        {t("graphInstructions")}
      </p>

      <HoverCard
        layout={layout}
        locale={locale}
        t={t}
        glossOf={glossOf}
        clusterLabel={clusterLabel}
        chambers={chambers}
        openClusterId={activeClusterInfo?.id ?? null}
        tooltipRef={tooltipRef}
        onPlaced={placeOverlays}
        register={(set) => {
          hoverCardRef.current = set;
        }}
      />

      {/* A row where the drawing is narrow (a phone, a stacked iPad column) so the
          buttons never reach the list toggle at the top; a column beside the rings otherwise. */}
      <div className="absolute bottom-3 left-[max(0.75rem,var(--safe-left))] flex flex-row gap-1 @min-[44rem]/drawing:flex-col @min-[44rem]:bottom-[calc(0.75rem+var(--canvas-bottom,0px))]">
        <button
          type="button"
          onClick={() => zoomByCentre(1.25)}
          aria-label={t("zoomIn")}
          className="tap-target flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface text-sm text-ink-muted hover:text-ink"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomByCentre(0.8)}
          aria-label={t("zoomOut")}
          className="tap-target flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface text-sm text-ink-muted hover:text-ink"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => {
            viewK.current.target = 1;
            viewX.current.target = 0;
            viewY.current.target = 0;
            rot.current.target = alignRotation(null, rot.current.target, 0);
            kick();
          }}
          aria-label={t("zoomReset")}
          className="tap-target flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface text-[10px] font-medium text-ink-muted hover:text-ink"
        >
          0
        </button>
        <button
          type="button"
          onClick={toggleTurn}
          aria-pressed={turnEnabled}
          aria-label={t("turnToggle")}
          title={t("turnToggle")}
          className={`tap-target flex h-8 w-8 items-center justify-center rounded-sm border bg-surface text-sm ${
            turnEnabled ? "border-accent text-accent-text" : "border-line text-ink-faint hover:text-ink"
          }`}
        >
          ↻
        </button>
      </div>

      <GraphList bundle={bundle} selectedId={selectedId} onSelect={pickNode} hiddenBranches={hiddenBranches} />
      </div>

      <GraphDetails
        layout={layout}
        chambers={chambers}
        target={detailsTarget}
        openCluster={openCluster}
        clusterLabel={clusterLabel}
        onSelectNode={pickNode}
        onSelectCluster={pickCluster}
        onSelectFractie={pickFractie}
        onClear={clearSelection}
      />
    </div>
    </div>
  );
}

/**
 * One mark: an outline in the branch colour with a translucent fill, so the
 * rings and edges behind it stay visible. The fill deepens as the mark matters
 * more: under the pointer, as a relation, on the path, as the selection.
 */
function Mark({ node, state, setRef }: { node: LaidOutNode; state: MarkState; setRef: (element: SVGGElement | null) => void }) {
  const color = branchColorVar(node.branch);
  const radius = node.glyphRadius + (state === "selected" ? SELECTED_GROWTH : 0);
  const accent = state === "selected" || state === "path";
  const stroke = accent ? "var(--t-color-accent)" : color;
  const fillOpacity =
    state === "selected" ? 0.75 : state === "path" ? 0.5 : state === "hover" ? 0.55 : state === "neighbor" ? 0.4 : state === "member" ? 0.3 : 0.22;
  const opacity = state === "dim" ? DIM_OPACITY : state === "base" || state === "member" ? 0.9 : 1;

  return (
    <g ref={setRef} data-node-id={node.id} transform={`translate(${node.x} ${node.y})`} opacity={opacity} className="cursor-pointer">
      <circle r={Math.max(10, radius + 4)} fill="transparent" />
      {state === "selected" ? (
        <circle r={radius + 6} fill="none" stroke="var(--t-color-accent)" strokeWidth={1.5} opacity={0.55} />
      ) : null}
      {state === "neighbor" ? (
        <circle r={radius + 3} fill="none" stroke="var(--t-color-accent-text)" strokeWidth={0.8} opacity={0.7} />
      ) : null}
      <path d={glyphPath(node.glyph, radius)} fill={stroke} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={state === "hover" ? 1.3 : 1} strokeLinejoin="round" />
      {node.orbit > 0
        ? Array.from({ length: node.orbit }, (_, index) => {
            const fan = (36 * Math.PI) / 180;
            const angle = (index - (node.orbit - 1) / 2) * fan;
            const distance = radius + 2.4;
            return (
              <circle
                key={index}
                cx={(Math.cos(angle) * distance).toFixed(2)}
                cy={(Math.sin(angle) * distance).toFixed(2)}
                r={1.1}
                fill={color}
                opacity={0.8}
              />
            );
          })
        : null}
    </g>
  );
}

/**
 * What the pointer is over: the name, what kind of body it is, where it
 * belongs. Its state lives here, not in the canvas, so a hover re-renders a
 * small card and never the 1600 elements behind it.
 */
function HoverCard({
  layout,
  locale,
  t,
  glossOf,
  clusterLabel,
  chambers,
  openClusterId,
  tooltipRef,
  onPlaced,
  register,
}: {
  layout: ReturnType<typeof hydrateLayout>;
  locale: "nl" | "en";
  t: (key: string, vars?: Record<string, string | number>) => string;
  glossOf: (name: string) => string | null;
  clusterLabel: (cluster: ClusterInfo) => string;
  chambers: GraphBundle["chambers"];
  openClusterId: string | null;
  tooltipRef: { current: HTMLDivElement | null };
  onPlaced: () => void;
  register: (set: (hover: Hover | null) => void) => void;
}) {
  const [hover, setHover] = useState<Hover | null>(null);
  useEffect(() => {
    register(setHover);
  }, [register]);
  // The card is placed once it exists: the canvas asks for a hover before
  // React has rendered it, so placing it there would put it at the origin.
  useLayoutEffect(() => {
    onPlaced();
  }, [hover, onPlaced]);

  const fractie =
    hover?.kind === "fractie" ? { entry: chambers[hover.chamberId]?.entries[hover.index] ?? null, chamberId: hover.chamberId } : null;
  const node = hover?.kind === "node" || hover?.kind === "dot" ? layout.byId.get(hover.id) ?? null : null;
  const cluster = hover?.kind === "cluster" ? layout.clusterById.get(hover.id) ?? null : null;
  const dotCluster = hover?.kind === "dot" ? layout.clusterById.get(hover.cluster) ?? null : null;
  if (!node && !cluster && !fractie?.entry) return null;
  const branch = node?.branch ?? (cluster ? layout.sectors.find((sector) => sector.id === cluster.sector)?.branch ?? null : null);
  const parent = node?.parent ? layout.byId.get(node.parent) ?? null : null;
  const connections = node ? (layout.adjacency.get(node.id) ?? []).length : 0;
  const chamber = node ? chambers[node.id] ?? null : null;
  const clusterSubtype = (entry: ClusterInfo) => {
    const counts = new Map<string, number>();
    for (const id of entry.members) {
      const subtype = layout.byId.get(id)?.subtype;
      if (subtype) counts.set(subtype, (counts.get(subtype) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? localized(locale, ORG_SUBTYPE_LABELS_I18N, top[0]) : "";
  };

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="pointer-events-none absolute left-0 top-0 z-10 max-w-[18rem] rounded-md border border-line bg-surface px-2.5 py-2 text-left shadow-lg"
      style={{ borderLeftWidth: 3, borderLeftColor: fractie?.entry?.color ?? (branch ? branchColorVar(branch) : undefined) }}
    >
      {fractie?.entry ? (
        <>
          <p className="text-sm font-semibold leading-tight text-ink">{fractie.entry.label}</p>
          <p className="mt-1 text-[11px] text-ink-muted">
            {t("detailsSeatsOf", { n: fractie.entry.seats, total: chambers[fractie.chamberId]?.total ?? 0 })}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-faint">{layout.byId.get(fractie.chamberId)?.name ?? fractie.chamberId}</p>
        </>
      ) : node ? (
        <>
          <p className="text-sm font-semibold leading-tight text-ink">{node.name}</p>
          {glossOf(node.name) ? <p className="text-[11px] text-ink-faint">({glossOf(node.name)})</p> : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span
              className="rounded-pill border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{ borderColor: branchColorVar(node.branch), color: branchColorVar(node.branch) }}
            >
              {localized(locale, ORG_SUBTYPE_LABELS_I18N, node.subtype)}
            </span>
            <span className="rounded-pill border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
              {localized(locale, TIER_LABELS_I18N, node.tier)}
            </span>
          </div>
          {parent ? <p className="mt-1 text-[11px] text-ink-muted">{t("parentOf", { parent: parent.name })}</p> : null}
          {chamber ? <p className="mt-1 text-[11px] text-ink-muted">{t("chamberSeats", { total: chamber.total, majority: chamber.majority })}</p> : null}
          {dotCluster ? <p className="mt-1 text-[11px] text-ink-muted">{clusterLabel(dotCluster)}</p> : null}
          <p className="mt-0.5 text-[11px] text-ink-faint">{connections === 1 ? t("connectionsOne") : t("connections", { n: connections })}</p>
        </>
      ) : cluster ? (
        <>
          <p className="text-sm font-semibold leading-tight text-ink">{clusterLabel(cluster)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span
              className="rounded-pill border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{ borderColor: branch ? branchColorVar(branch) : undefined, color: branch ? branchColorVar(branch) : undefined }}
            >
              {clusterSubtype(cluster)}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
