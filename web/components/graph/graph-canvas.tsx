"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ARCH_EK,
  ARCH_EK_OFFSET,
  ARCH_PITCH_EK,
  ARCH_PITCH_TK,
  ARCH_TK,
  ARCH_TK_OFFSET,
  CLUSTER_DOT_RADIUS,
  SELECTED_GROWTH,
  alignRotation,
  clusterHalfSize,
  computeFocusPath,
  edgeAlive,
  edgePath,
  hydrateLayout,
  routedEdgePath,
  type ClusterInfo,
  type GraphBundle,
  type LaidOutNode,
  type SectorInfo,
} from "@/lib/graph";
import type { OrgBranch as OrgBranchName } from "@/lib/types";
import {
  SPRING_FIRM,
  SPRING_SOFT,
  SPRING_TURN,
  prefersReducedMotion,
  settled,
  snap,
  spring,
  stepSpring,
} from "@/lib/motion";
import { clusterFocus, focusReach, frameFor, posePosition, sectorPose } from "@/lib/pose";
import { placeLabels, type LabelItem } from "@/lib/label-placement";
import { branchColorVar } from "@/lib/branch-colors";
import { edgeLine, edgeTypeOrderIndex } from "./edge-styles";
import { useT } from "@/components/i18n/use-t";
import { useLocale } from "@/components/i18n/language-provider";
import {
  BRANCH_LABELS_I18N,
  ORG_SUBTYPE_LABELS_I18N,
  ORG_TYPE_LABELS_I18N,
  SECTOR_LABELS_I18N,
  TIER_LABELS_I18N,
} from "@/lib/i18n/dict-graph";
import { orgEnGloss } from "@/lib/name-gloss";
import { glyphPath, glyphPathAt, orbitDotsAt } from "./glyph";
import { GraphList } from "./graph-list";
import { layoutArch } from "./arch";
import { ringPath, sectorLabelArc, sectorWedge, tierLabelArc } from "./tier-chrome";

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
const TURN_STORAGE_KEY = "staatsgraaf.graph.turn";

type LabelState = "selected" | "path" | "neighbor" | "member";
const LABEL_PRIORITY: Record<LabelState, number> = { selected: 3, path: 2, neighbor: 1, member: 0.5 };

type MarkState = "base" | "dim" | "neighbor" | "path" | "selected" | "hover" | "member";

type Hover = { kind: "node"; id: string } | { kind: "cluster"; id: string };

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
  const tCommon = useT("common");
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
  const open = useRef(spring(0));
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
  /** The hit block behind each chamber's arch, tinted on hover. */
  const archRefs = useRef(new Map<string, SVGRectElement>());
  const seatGroupRefs = useRef(new Map<string, SVGGElement>());
  /** The cluster the reader wants open, and the one the pose is built for. */
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [turnEnabled, setTurnEnabled] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(TURN_STORAGE_KEY) === "off") setTurnEnabled(false);
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

  const pose = useMemo(() => (activeCluster ? sectorPose(layout, activeCluster) : null), [layout, activeCluster]);
  const activeClusterInfo = activeCluster ? layout.clusterById.get(activeCluster) ?? null : null;

  /** Members of the open cluster and the singles of its sector: marks that move. */
  const poseMarkIds = useMemo(() => {
    const set = new Set<string>();
    if (!pose) return set;
    for (const id of pose.target.keys()) {
      const node = layout.byId.get(id);
      if (node && (!node.cluster || node.cluster === pose.openId)) set.add(id);
    }
    return set;
  }, [layout, pose]);

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
    if (!pose) return list;
    for (const edge of drawnEdges) {
      if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) continue;
      if (!pose.target.has(edge.from) && !pose.target.has(edge.to)) continue;
      const key = edgeKey(edge.from, edge.to);
      const isPath = pathEdgeKeys.has(key);
      const isNeighbour = selectedId !== null && (edge.from === selectedId || edge.to === selectedId);
      const touchesOpen = poseMarkIds.has(edge.from) || poseMarkIds.has(edge.to);
      list.push({ from: edge.from, to: edge.to, state: isPath ? "path" : isNeighbour ? "neighbour" : "base", hot: isPath || isNeighbour || touchesOpen });
    }
    return list;
  }, [drawnEdges, visibleIds, pose, poseMarkIds, pathEdgeKeys, selectedId]);
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

  /** Everything else is merged into one path per relation type and never moves. */
  const staticEdges = useMemo(() => {
    const byType = new Map<string, string[]>();
    for (const edge of drawnEdges) {
      if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) continue;
      const key = edgeKey(edge.from, edge.to);
      if (highlightEdges.keys.has(key) || liveEdgeKeys.has(key)) continue;
      const from = layout.byId.get(edge.from);
      const to = layout.byId.get(edge.to);
      if (!from || !to) continue;
      const list = byType.get(edge.type);
      const segment = edgeShape(from, to, from, to);
      if (list) list.push(segment);
      else byType.set(edge.type, [segment]);
    }
    return [...byType.entries()]
      .sort((a, b) => edgeTypeOrderIndex(a[0]) - edgeTypeOrderIndex(b[0]))
      .map(([type, segments]) => ({ type, d: segments.join(" ") }));
  }, [layout, drawnEdges, visibleIds, highlightEdges, liveEdgeKeys, edgeShape]);

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

  const arches = useMemo(() => {
    if (!statenSector?.block) return [];
    const list: { id: string; offset: number; layout: ReturnType<typeof layoutArch> }[] = [];
    const tk = chambers["org:tweede-kamer"];
    const ek = chambers["org:eerste-kamer"];
    if (tk && tk.total === ARCH_TK.total) {
      list.push({ id: "org:tweede-kamer", offset: ARCH_TK_OFFSET, layout: layoutArch(tk, ARCH_TK, ARCH_PITCH_TK) });
    }
    if (ek && ek.total === ARCH_EK.total) {
      list.push({ id: "org:eerste-kamer", offset: ARCH_EK_OFFSET, layout: layoutArch(ek, ARCH_EK, ARCH_PITCH_EK) });
    }
    return list;
  }, [chambers, statenSector]);

  // ---------------------------------------------------------------------------
  // Motion
  // ---------------------------------------------------------------------------

  /**
   * What the animation frame draws. It lives in a ref, not in the frame's
   * closure: a loop started before the reader clicked would otherwise keep
   * drawing the previous state until it settled.
   */
  const frameDataRef = useRef({ layout, pose, liveEdges, labelled });
  useLayoutEffect(() => {
    frameDataRef.current = { layout, pose, liveEdges, labelled };
    warmEdgesRef.current = "";
  }, [layout, pose, liveEdges, labelled]);

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
      if (hover.kind === "node") {
        const node = data.layout.byId.get(hover.id);
        if (node) {
          const at = positionOf(node);
          anchor = { ...project(at.x, at.y), r: viewK.current.value * (node.glyphRadius + 4) };
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
        snap(open.current);
        snap(viewK.current);
        snap(viewX.current);
        snap(viewY.current);
      } else {
        stepSpring(rot.current, dt, SPRING_TURN);
        stepSpring(open.current, dt, SPRING_FIRM);
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
      // Seats are decoration until the reader zooms in on them.
      const seatOpacity = viewK.current.value >= 2 ? "1" : "0.7";
      for (const group of seatGroupRefs.current.values()) {
        if (group.getAttribute("opacity") !== seatOpacity) group.setAttribute("opacity", seatOpacity);
      }

      // The moving sector: marks slide along their rings, the open grid's dots
      // grow into marks, and the other grids shift as blocks.
      const frame = frameDataRef.current;
      const openValue = open.current.value < 0.001 ? 0 : open.current.value;
      const positions = new Map<string, { x: number; y: number }>();
      if (frame.pose) {
        for (const [id, target] of frame.pose.target) {
          const node = frame.layout.byId.get(id);
          if (!node) continue;
          const point = posePosition(node, target, openValue);
          positions.set(id, point);
          const element = markRefs.current.get(id);
          if (!element) continue;
          const scale = node.cluster === frame.pose.openId ? CLUSTER_DOT_RADIUS / node.glyphRadius + (1 - CLUSTER_DOT_RADIUS / node.glyphRadius) * openValue : 1;
          element.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) scale(${scale.toFixed(3)})`);
        }
        for (const [id, target] of frame.pose.clusterTarget) {
          const cluster = frame.layout.clusterById.get(id);
          const element = clusterRefs.current.get(id);
          if (!cluster) continue;
          const point = posePosition(cluster, target, openValue);
          positions.set(id, point);
          if (!element) continue;
          const turn = ((Math.atan2(point.y, point.x) - cluster.angle) * 180) / Math.PI;
          element.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${turn.toFixed(3)}) translate(${(-cluster.x).toFixed(2)} ${(-cluster.y).toFixed(2)})`);
        }
      }
      positionsRef.current = positions;

      if (frame.liveEdges.length > 0) {
        const settling = settled(open.current);
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
        settled(rot.current) && settled(open.current) && settled(viewK.current) && settled(viewX.current) && settled(viewY.current);
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

  /** When the moving sector stops moving, its marks go back to their rest transforms. */
  useLayoutEffect(() => {
    if (pose) return;
    for (const [id, element] of markRefs.current) {
      const node = layout.byId.get(id);
      if (node) element.setAttribute("transform", `translate(${node.x} ${node.y})`);
    }
    for (const element of clusterRefs.current.values()) element.removeAttribute("transform");
    for (const state of ["base", "neighbour", "path"] as const) liveEdgeRefs.current[state]?.setAttribute("d", "");
    positionsRef.current = new Map();
  }, [pose, layout]);

  /** Selecting a dot of a cluster opens that cluster; selecting anything else folds it. */
  useEffect(() => {
    if (!selectedNode) return;
    setOpenCluster(selectedNode.cluster);
  }, [selectedNode]);

  /** Fold, then swap, then unpack: the pose changes only once the previous one has closed. */
  useEffect(() => {
    if (activeCluster === openCluster) return;
    if (open.current.value < 0.02 || !activeCluster) {
      setActiveCluster(openCluster);
      return;
    }
    open.current.target = 0;
    kick();
    const timer = window.setInterval(() => {
      if (open.current.value < 0.02) {
        window.clearInterval(timer);
        setActiveCluster(openCluster);
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, [activeCluster, openCluster, kick]);

  useEffect(() => {
    open.current.target = pose && activeCluster === openCluster ? 1 : 0;
    kick();
  }, [pose, activeCluster, openCluster, kick]);

  /**
   * Turn the canvas so the selection reads straight above the core, and ease
   * the view to hold it, its relations and the core. The turn is one rigid
   * rotation of the whole frame: every body keeps its neighbours. The reader
   * can switch the turn off; the view still frames the selection.
   */
  useEffect(() => {
    const sector = activeSector ? layout.sectors.find((entry) => entry.id === activeSector) ?? null : null;
    let focus: { angle: number; radius: number; reach: number } | null = null;
    if (selectedNode) {
      const at = pose?.target.get(selectedNode.id) ?? selectedNode;
      focus = { angle: at.angle, radius: at.radius, reach: focusReach(layout, selectedNode.id, hiddenBranches) };
      if (activeClusterInfo && pose && selectedNode.cluster === activeClusterInfo.id) {
        focus.reach = Math.max(focus.reach, clusterFocus(activeClusterInfo, pose).reach);
      }
    } else if (activeClusterInfo && pose) {
      focus = clusterFocus(activeClusterInfo, pose);
    } else if (sector) {
      focus = { angle: sector.midAngle, radius: (sector.innerRadius + sector.outerRadius) / 2, reach: (sector.outerRadius - sector.innerRadius) / 2 + 40 };
    }
    if (turnEnabled) rot.current.target = alignRotation(focus ? focus.angle : null, rot.current.target);
    const view = frameFor(layout, focus, rot.current.target, 1, selectedNode ? 2.4 : 1.8);
    viewK.current.target = view.k;
    viewX.current.target = view.x;
    viewY.current.target = view.y;
    kick();
  }, [layout, selectedNode, activeSector, activeClusterInfo, pose, hiddenBranches, turnEnabled, kick]);

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

  const onBackgroundClick = () => {
    if (pointerMovedRef.current) {
      pointerMovedRef.current = false;
      return;
    }
    setActiveSector(null);
    setOpenCluster(null);
    onSelect(null);
  };

  const targetAt = (event: { target: EventTarget }): Hover | null => {
    const element = (event.target as Element).closest("[data-node-id],[data-cluster-id]");
    if (!element) return null;
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
    if (target.kind === "cluster") {
      onSelect(null);
      setOpenCluster((current) => (current === target.id ? null : target.id));
      return;
    }
    if (target.id === selectedId) {
      onSelect(null);
      return;
    }
    const node = layout.byId.get(target.id);
    setOpenCluster(node?.cluster ?? null);
    onSelect(target.id);
  };

  /** Write the hover tint to the DOM and tell the tooltip; no React render of the canvas. */
  const applyHover = (target: Hover | null) => {
    const previous = hoverRef.current;
    if (previous?.kind === "cluster" && previous.id !== target?.id) {
      const rect = clusterRefs.current.get(previous.id)?.querySelector("rect");
      rect?.setAttribute("fill-opacity", "0.06");
      rect?.setAttribute("stroke-opacity", "0.25");
    }
    if (previous?.kind === "node" && previous.id !== target?.id) {
      const arch = archRefs.current.get(previous.id);
      if (arch && previous.id !== selectedId) {
        arch.setAttribute("fill-opacity", "0.05");
        arch.setAttribute("stroke-opacity", "0.25");
      }
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
    if (target?.kind === "cluster") {
      const rect = clusterRefs.current.get(target.id)?.querySelector("rect");
      rect?.setAttribute("fill-opacity", "0.22");
      rect?.setAttribute("stroke-opacity", "0.7");
    }
    if (target?.kind === "node" && target.id !== selectedId) {
      const arch = archRefs.current.get(target.id);
      arch?.setAttribute("fill-opacity", "0.18");
      arch?.setAttribute("stroke-opacity", "0.7");
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
    if (target && hoverRef.current?.id === target.id) applyHover(null);
  };

  const onSectorClick = (event: ReactMouseEvent<SVGGElement>) => {
    const target = (event.target as Element).closest("[data-sector-id]");
    const id = target?.getAttribute("data-sector-id") ?? null;
    if (!id) return;
    event.stopPropagation();
    onSelect(null);
    setOpenCluster(null);
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
        else if (openCluster) setOpenCluster(null);
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
        const at = positionsRef.current.get(node.id);
        if (at) element.setAttribute("transform", `translate(${at.x.toFixed(2)} ${at.y.toFixed(2)})`);
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

  const connectionCountText = (count: number) => (count === 1 ? t("connectionsOne") : t("connections", { n: count }));

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
    <div ref={containerRef} className="relative flex h-full min-h-0 w-full flex-col">
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

        <g ref={viewGroupRef}>
          <g ref={rotGroupRef}>
            {/* Tier rings and sector wedges. */}
            <g aria-hidden="true">
              {layout.tiers
                .filter((tier) => tier.count > 0)
                .map((tier) => (
                  <path
                    key={`ring-${tier.id}`}
                    d={ringPath(tier.innerRadius - 12)}
                    fill="none"
                    stroke="var(--t-color-line)"
                    strokeWidth={0.8}
                    opacity={0.7}
                    pointerEvents="none"
                  />
                ))}
              <g onClick={onSectorClick}>
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

            {/* Edges at rest, one path per relation type. */}
            <g aria-hidden="true" pointerEvents="none">
              {staticEdges.map((group) => {
                const line = edgeLine(group.type);
                return (
                  <path
                    key={`static-${group.type}`}
                    d={group.d}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={line.width}
                    strokeDasharray={line.dash ?? undefined}
                    opacity={selectedId ? 0.16 : 0.3}
                  />
                );
              })}
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
                  liveEdgeRefs.current.base = element;
                }}
                fill="none"
                stroke="var(--t-color-line-strong)"
                strokeWidth={0.75}
                opacity={0.35}
              />
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
            <g onClick={onMarkClick} onPointerOver={onMarkOver} onPointerOut={onMarkOut}>
              {clusterDots.map(({ cluster, d, half }) => {
                const color = branchColorVar(sectorBranch(cluster.sector));
                const isOpen = activeClusterInfo?.id === cluster.id;
                const dim =
                  (selectedId || activeClusterInfo) && !isOpen && !(selectedNode && cluster.parent !== null && selectedNode.parent === cluster.parent);
                return (
                  <g key={cluster.id} ref={setClusterRef(cluster.id)} data-cluster-id={cluster.id} className="cursor-pointer" opacity={isOpen ? 0 : dim ? DIM_OPACITY : 1}>
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

            {/* The two chambers, drawn as ∩ arches. */}
            {statenSector?.block && arches.length > 0 ? (
              <g
                transform={`translate(${(Math.cos(statenSector.block.angle) * statenSector.block.radius).toFixed(2)} ${(Math.sin(statenSector.block.angle) * statenSector.block.radius).toFixed(2)}) rotate(${(((statenSector.block.angle + Math.PI / 2) * 180) / Math.PI).toFixed(2)})`}
                onClick={onMarkClick}
                onPointerOver={onMarkOver}
                onPointerOut={onMarkOut}
              >
                {arches.map((arch) => {
                  const box = arch.layout.box;
                  const pad = 3;
                  const isSelected = selectedId === arch.id;
                  const color = branchColorVar(statenSector.branch);
                  return (
                    <g key={arch.id} data-node-id={arch.id} transform={`translate(${arch.offset} 0)`} className="cursor-pointer">
                      <title>{layout.byId.get(arch.id)?.name ?? arch.id}</title>
                      {/* One target the size of the whole arch: a click anywhere on the chamber selects it. */}
                      <rect
                        ref={(element) => {
                          if (element) archRefs.current.set(arch.id, element);
                          else archRefs.current.delete(arch.id);
                        }}
                        x={(box.minX - pad).toFixed(2)}
                        y={(box.minY - pad).toFixed(2)}
                        width={(box.maxX - box.minX + 2 * pad).toFixed(2)}
                        height={(box.maxY - box.minY + 2 * pad).toFixed(2)}
                        rx={3}
                        fill={isSelected ? "var(--t-color-accent)" : color}
                        fillOpacity={isSelected ? 0.18 : 0.05}
                        stroke={isSelected ? "var(--t-color-accent)" : color}
                        strokeOpacity={isSelected ? 0.8 : 0.25}
                        strokeWidth={isSelected ? 1.2 : 0.6}
                      />
                      <g
                        ref={(element) => {
                          if (element) seatGroupRefs.current.set(arch.id, element);
                          else seatGroupRefs.current.delete(arch.id);
                        }}
                        pointerEvents="none"
                        opacity={0.7}
                      >
                        {arch.layout.marks.map((mark, index) => (
                          <circle
                            key={index}
                            cx={mark.x.toFixed(2)}
                            cy={mark.y.toFixed(2)}
                            r={arch.layout.seatRadius}
                            fill={mark.color ?? "var(--t-color-line-strong)"}
                            opacity={selectedId && selectedId !== arch.id ? 0.55 : 1}
                          />
                        ))}
                        {arch.layout.majority ? (
                          <line
                            x1={arch.layout.majority.x1.toFixed(2)}
                            y1={arch.layout.majority.y1.toFixed(2)}
                            x2={arch.layout.majority.x2.toFixed(2)}
                            y2={arch.layout.majority.y2.toFixed(2)}
                            stroke="var(--t-color-ink)"
                            strokeWidth={arch.layout.seatRadius * 0.5}
                            strokeDasharray={`${arch.layout.seatRadius} ${arch.layout.seatRadius * 0.6}`}
                            opacity={0.8}
                          />
                        ) : null}
                      </g>
                    </g>
                  );
                })}
              </g>
            ) : null}

            {/* Tier and sector labels. */}
            <g aria-hidden="true" pointerEvents="none">
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
        register={(set) => {
          hoverCardRef.current = set;
        }}
      />

      {selectedNode ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
          <div
            aria-label={t("selectionDetails")}
            className="pointer-events-auto max-w-full rounded-md border border-line bg-surface px-3 py-2 text-center shadow-xl"
          >
            <p className="truncate text-sm font-medium text-ink">{selectedNode.name}</p>
            {glossOf(selectedNode.name) ? (
              <p className="text-[10px] text-ink-faint">({glossOf(selectedNode.name)})</p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
              <span className="rounded-pill border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                {localized(locale, ORG_TYPE_LABELS_I18N, selectedNode.type)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-pill border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                <svg aria-hidden="true" viewBox="-11 -11 22 22" width={10} height={10}>
                  <circle r={8} fill={branchColorVar(selectedNode.branch)} />
                </svg>
                {localized(locale, TIER_LABELS_I18N, selectedNode.tier)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-faint">{connectionCountText(neighborSet.size)}</p>
            <div className="mt-1 flex items-center justify-center gap-3">
              <a
                href={`/organisaties/${selectedNode.slug}/`}
                className="text-xs font-medium text-accent-text underline underline-offset-2"
              >
                {tCommon("openOrgPage")}
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => zoomByCentre(1.25)}
          aria-label={t("zoomIn")}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface text-sm text-ink-muted hover:text-ink"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomByCentre(0.8)}
          aria-label={t("zoomOut")}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface text-sm text-ink-muted hover:text-ink"
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
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface text-[10px] font-medium text-ink-muted hover:text-ink"
        >
          0
        </button>
        <button
          type="button"
          onClick={toggleTurn}
          aria-pressed={turnEnabled}
          aria-label={t("turnToggle")}
          title={t("turnToggle")}
          className={`flex h-8 w-8 items-center justify-center rounded-sm border bg-surface text-sm ${
            turnEnabled ? "border-accent text-accent-text" : "border-line text-ink-faint hover:text-ink"
          }`}
        >
          ↻
        </button>
      </div>

      <GraphList bundle={bundle} selectedId={selectedId} onSelect={onSelect} hiddenBranches={hiddenBranches} />
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
  register: (set: (hover: Hover | null) => void) => void;
}) {
  const [hover, setHover] = useState<Hover | null>(null);
  useEffect(() => {
    register(setHover);
  }, [register]);

  const node = hover?.kind === "node" ? layout.byId.get(hover.id) ?? null : null;
  const cluster = hover?.kind === "cluster" ? layout.clusterById.get(hover.id) ?? null : null;
  if (!node && !cluster) return null;
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
      style={{ borderLeftWidth: 3, borderLeftColor: branch ? branchColorVar(branch) : undefined }}
    >
      {node ? (
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
          <p className="mt-1 text-[11px] text-ink-faint">{openClusterId === cluster.id ? t("clusterCloseHint") : t("clusterOpenHint")}</p>
        </>
      ) : null}
    </div>
  );
}
