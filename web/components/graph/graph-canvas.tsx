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
  SELECTED_GROWTH,
  alignRotation,
  computeFocusPath,
  edgeAlive,
  edgePath,
  hydrateLayout,
  routedEdgePath,
  type GraphBundle,
  type LaidOutNode,
  type SectorInfo,
} from "@/lib/graph";
import type { OrgBranch as OrgBranchName } from "@/lib/types";
import {
  SPRING_SOFT,
  SPRING_TURN,
  prefersReducedMotion,
  settled,
  snap,
  spring,
  stepSpring,
} from "@/lib/motion";
import { focusReach, frameFor } from "@/lib/pose";
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

type LabelState = "selected" | "path" | "neighbor" | "hover";

const LABEL_PRIORITY: Record<LabelState, number> = { hover: 4, selected: 3, path: 2, neighbor: 1 };

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

/**
 * The tier canvas: a deterministic concentric layout drawn once by React, and
 * an imperative motion layer that owns the camera afterwards.
 *
 * A body never leaves its place. Selecting one highlights it, its path to the
 * electorate and its direct relations where they are, and the camera eases to
 * a view that holds them and the core, turning the canvas so the selection
 * sits straight above the core. React renders the structure; the
 * animation frame writes the view transform and the label positions straight
 * to the DOM through refs, so panning 1600 marks does not reconcile 1600 React
 * elements, and every move can be interrupted: each is one spring chasing a
 * target that is a pure function of the current selection.
 */
export function GraphCanvas({ bundle, selectedId, onSelect, hiddenBranches, asOf = null }: GraphCanvasProps) {
  const layout = useMemo(() => hydrateLayout(bundle), [bundle]);
  const drawnEdges = useMemo(() => layout.edges.filter((edge) => edgeAlive(edge, asOf)), [layout, asOf]);
  const router = useRouter();
  const t = useT("graph");
  const tCommon = useT("common");
  const locale = useLocale();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewGroupRef = useRef<SVGGElement | null>(null);
  const rotGroupRef = useRef<SVGGElement | null>(null);
  const labelRefs = useRef(new Map<string, SVGTextElement>());
  /** Text widths at `MEASURE_PX`, measured once per label element. */
  const labelWidths = useRef(new Map<string, number>());
  /** CSS pixels per viewBox unit, refreshed when the svg is resized. */
  const clientScaleRef = useRef(1);

  const rot = useRef(spring(0));
  const viewK = useRef(spring(1));
  const viewX = useRef(spring(0));
  const viewY = useRef(spring(0));
  const cancelFrameRef = useRef<(() => void) | null>(null);
  const lastTimeRef = useRef(0);

  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const dialRef = useRef<{ pointerId: number; angle: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ startDist: number; startK: number; startX: number; startY: number; midX: number; midY: number } | null>(null);
  const pointerMovedRef = useRef(false);

  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const selectedNode = selectedId ? layout.byId.get(selectedId) ?? null : null;

  const visibleNodes = useMemo(
    () => layout.nodes.filter((node) => !hiddenBranches.has(node.branch)),
    [layout, hiddenBranches],
  );
  const drawnNodes = useMemo(() => visibleNodes.filter((node) => !node.arch), [visibleNodes]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);

  /** Marks the reader can step through with the arrow keys: no hidden marks. */
  const walkNodes = useMemo(
    () => visibleNodes.filter((node) => !node.hidden || node.arch),
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
    if (selectedNode.hidden && !selectedNode.arch) set.add(selectedNode.id);
    for (const node of layout.nodes) {
      if (node.collapsedInto === selectedNode.id && !hiddenBranches.has(node.branch)) set.add(node.id);
    }
    return set;
  }, [layout, selectedNode, hiddenBranches]);

  const pathEdgeKeys = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < focusPath.length - 1; i += 1) set.add(edgeKey(focusPath[i], focusPath[i + 1]));
    return set;
  }, [focusPath]);

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
      const from = layout.byId.get(edge.from);
      const to = layout.byId.get(edge.to);
      if (!from || !to) continue;
      const d = from.sector === to.sector ? edgePath(from.x, from.y, to.x, to.y) : routedEdgePath(from, to, layout.channels);
      segments[isPath ? "path" : "neighbour"].push(d);
      keys.add(key);
    }
    return { segments: { neighbour: segments.neighbour.join(" "), path: segments.path.join(" ") }, keys };
  }, [layout, drawnEdges, visibleIds, pathEdgeKeys, selectedId]);

  /** Everything else is merged into one path per relation type and never moves. */
  const staticEdges = useMemo(() => {
    const byType = new Map<string, string[]>();
    for (const edge of drawnEdges) {
      if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) continue;
      if (highlightEdges.keys.has(edgeKey(edge.from, edge.to))) continue;
      const from = layout.byId.get(edge.from);
      const to = layout.byId.get(edge.to);
      if (!from || !to) continue;
      const segment =
        from.sector === to.sector
          ? edgePath(from.x, from.y, to.x, to.y)
          : routedEdgePath(from, to, layout.channels);
      const list = byType.get(edge.type);
      if (list) list.push(segment);
      else byType.set(edge.type, [segment]);
    }
    return [...byType.entries()]
      .sort((a, b) => edgeTypeOrderIndex(a[0]) - edgeTypeOrderIndex(b[0]))
      .map(([type, segments]) => ({ type, d: segments.join(" ") }));
  }, [layout, drawnEdges, visibleIds, highlightEdges]);

  /**
   * Marks that need an element of their own: the selection, its path, its
   * neighbours and the marks revealed for it. Every other mark is drawn into
   * one merged path per sector and glyph (below), which is what keeps a pan of
   * the whole canvas inside the frame budget: rasterising forty paths is
   * cheap, rasterising 1600 is not.
   */
  const dynamicIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedId) set.add(selectedId);
    for (const id of focusSet) set.add(id);
    for (const id of neighborSet) set.add(id);
    for (const id of revealedIds) set.add(id);
    return set;
  }, [selectedId, focusSet, neighborSet, revealedIds]);

  const dynamicNodes = useMemo(
    () => drawnNodes.filter((node) => dynamicIds.has(node.id) && (!node.hidden || revealedIds.has(node.id))),
    [drawnNodes, dynamicIds, revealedIds],
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
   * the mark under the pointer. Nothing else carries a name, because 900
   * names at once are a texture, not a map. The placement per frame decides
   * which of these actually fit.
   */
  const labelled = useMemo(() => {
    const list: { node: LaidOutNode; state: LabelState; text: string }[] = [];
    const textOf = (node: LaidOutNode) => {
      const gloss = glossOf(node.name);
      return gloss ? `${node.name} (${gloss})` : node.name;
    };
    const seen = new Set<string>();
    const push = (node: LaidOutNode | undefined, state: LabelState) => {
      if (!node || seen.has(node.id) || !visibleIds.has(node.id)) return;
      if (node.hidden && !revealedIds.has(node.id)) return;
      seen.add(node.id);
      list.push({ node, state, text: textOf(node) });
    };
    if (hoverId && hoverId !== selectedId) push(layout.byId.get(hoverId), "hover");
    if (selectedNode) push(selectedNode, "selected");
    for (const id of focusPath) push(layout.byId.get(id), "path");
    const neighbours: LaidOutNode[] = [];
    for (const id of [...neighborSet, ...revealedIds]) {
      const node = layout.byId.get(id);
      if (node && !seen.has(node.id)) neighbours.push(node);
    }
    neighbours.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : 1));
    for (const node of neighbours.slice(0, MAX_LABELS)) push(node, "neighbor");
    return list;
  }, [layout, hoverId, selectedId, selectedNode, focusPath, neighborSet, revealedIds, visibleIds, glossOf]);

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
   * What the label pass draws. It lives in a ref, not in the frame's closure:
   * a loop started before the reader clicked would otherwise keep placing the
   * previous selection's labels until it settled.
   */
  const labelDataRef = useRef(labelled);
  useLayoutEffect(() => {
    labelDataRef.current = labelled;
  }, [labelled]);

  const measureScale = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return 1;
    const rect = svg.getBoundingClientRect();
    const vb = layout.viewBox;
    const scale = Math.min(rect.width / vb.width, rect.height / vb.height);
    return scale > 0 ? scale : 1;
  }, [layout.viewBox]);

  /**
   * Place the labels for the current view. Labels live outside the view and
   * rotation groups, so they stay upright and keep one size on screen: each
   * mark's position is projected through the view, and the font is sized in
   * viewBox units so it comes out at `LABEL_PX` CSS pixels.
   */
  const placeLabelsNow = useCallback(() => {
    const data = labelDataRef.current;
    if (data.length === 0) return;
    const k = viewK.current.value;
    const tx = viewX.current.value;
    const ty = viewY.current.value;
    const cos = Math.cos(rot.current.value);
    const sin = Math.sin(rot.current.value);
    const unit = 1 / clientScaleRef.current;
    const items: LabelItem[] = [];
    const fonts = new Map<string, number>();
    for (const entry of data) {
      const px = entry.state === "selected" ? LABEL_PX_SELECTED : LABEL_PX;
      const font = px * unit;
      const widthAtMeasure = labelWidths.current.get(entry.node.id) ?? entry.text.length * MEASURE_PX * 0.55;
      const growth = entry.state === "selected" ? SELECTED_GROWTH + 6 : 0;
      fonts.set(entry.node.id, font);
      items.push({
        id: entry.node.id,
        x: tx + k * (cos * entry.node.x - sin * entry.node.y),
        y: ty + k * (sin * entry.node.x + cos * entry.node.y),
        r: k * (entry.node.glyphRadius + growth),
        width: (widthAtMeasure / MEASURE_PX) * font,
        height: font * 1.2,
        priority: LABEL_PRIORITY[entry.state],
      });
    }
    const slots = placeLabels(items, 3 * unit);
    for (const entry of data) {
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
  }, []);

  const kick = useCallback(() => {
    if (cancelFrameRef.current !== null) return;
    lastTimeRef.current = 0;
    const tick = (now: number) => {
      cancelFrameRef.current = null;
      const dt = lastTimeRef.current === 0 ? 1 / 60 : (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (prefersReducedMotion()) {
        snap(rot.current);
        snap(viewK.current);
        snap(viewX.current);
        snap(viewY.current);
      } else {
        stepSpring(rot.current, dt, SPRING_TURN);
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
      placeLabelsNow();

      const done =
        settled(rot.current) && settled(viewK.current) && settled(viewX.current) && settled(viewY.current);
      if (!done) cancelFrameRef.current = scheduleFrame(tick);
    };
    cancelFrameRef.current = scheduleFrame(tick);
  }, [placeLabelsNow]);

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
    clientScaleRef.current = measureScale();
    placeLabelsNow();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      clientScaleRef.current = measureScale();
      placeLabelsNow();
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, [measureScale, placeLabelsNow]);

  /** A new set of labels is placed at once, before the reader sees it unplaced. */
  useLayoutEffect(() => {
    placeLabelsNow();
  }, [labelled, placeLabelsNow]);

  /**
   * Turn the canvas so the selection reads straight above the core, and ease
   * the view to hold it, its relations and the core. The turn is one rigid
   * rotation of the whole frame: every body keeps its neighbours.
   */
  useEffect(() => {
    const sector = activeSector ? layout.sectors.find((entry) => entry.id === activeSector) ?? null : null;
    const angle = selectedNode ? selectedNode.angle : sector ? sector.midAngle : null;
    rot.current.target = alignRotation(angle, rot.current.target);
    const focus = selectedNode
      ? { angle: selectedNode.angle, radius: selectedNode.radius, reach: focusReach(layout, selectedNode.id, hiddenBranches) }
      : sector
        ? { angle: sector.midAngle, radius: (sector.innerRadius + sector.outerRadius) / 2, reach: (sector.outerRadius - sector.innerRadius) / 2 + 40 }
        : null;
    const view = frameFor(layout, focus, rot.current.target, 1, selectedNode ? 2.4 : 1.8);
    viewK.current.target = view.k;
    viewX.current.target = view.x;
    viewY.current.target = view.y;
    kick();
  }, [layout, selectedNode, activeSector, hiddenBranches, kick]);

  // ---------------------------------------------------------------------------
  // Pointer and keyboard
  // ---------------------------------------------------------------------------

  const toUserPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const vb = layout.viewBox;
      const scale = Math.min(rect.width / vb.width, rect.height / vb.height);
      const offsetX = (rect.width - vb.width * scale) / 2;
      const offsetY = (rect.height - vb.height * scale) / 2;
      return {
        x: (clientX - rect.left - offsetX) / scale + vb.x,
        y: (clientY - rect.top - offsetY) / scale + vb.y,
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
    if ((event.target as Element).closest("[data-node-id]")) return;
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
    const scale = clientScaleRef.current;

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
    onSelect(null);
  };

  const nodeIdAt = (event: { target: EventTarget }) =>
    (event.target as Element).closest("[data-node-id]")?.getAttribute("data-node-id") ?? null;

  const onNodeClick = (event: ReactMouseEvent<SVGGElement>) => {
    const id = nodeIdAt(event);
    if (!id) return;
    event.stopPropagation();
    setActiveSector(null);
    onSelect(id === selectedId ? null : id);
  };

  const onNodeOver = (event: ReactPointerEvent<SVGGElement>) => {
    const id = nodeIdAt(event);
    if (id) setHoverId(id);
  };

  const onNodeOut = (event: ReactPointerEvent<SVGGElement>) => {
    const id = nodeIdAt(event);
    if (id) setHoverId((current) => (current === id ? null : current));
  };

  const onSectorClick = (event: ReactMouseEvent<SVGGElement>) => {
    const target = (event.target as Element).closest("[data-sector-id]");
    const id = target?.getAttribute("data-sector-id") ?? null;
    if (!id) return;
    event.stopPropagation();
    onSelect(null);
    setActiveSector((current) => (current === id ? null : id));
  };

  const onDoubleClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    const id = nodeIdAt(event);
    const node = id ? layout.byId.get(id) : null;
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
        setActiveSector(null);
        onSelect(null);
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

  const statusText = selectedNode
    ? `${selectedNode.name}, ${localized(locale, ORG_SUBTYPE_LABELS_I18N, selectedNode.subtype)}, ${localized(locale, TIER_LABELS_I18N, selectedNode.tier)}. ${t("connections", { n: neighborSet.size })}`
    : activeSector
      ? t("sectorStatus", {
          name: sectorLabel(layout.sectors.find((sector) => sector.id === activeSector) as SectorInfo),
          n: layout.sectors.find((sector) => sector.id === activeSector)?.count ?? 0,
        })
      : t("noSelection");

  const connectionCountText = (count: number) => (count === 1 ? t("connectionsOne") : t("connections", { n: count }));

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
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
                  const active = activeSector === sector.id || selectedNode?.sector === sector.id;
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

            {/* Marks at rest: one path per sector and glyph, then a cheap hit circle each. */}
            <g aria-hidden="true" pointerEvents="none">
              {staticMarkGroups.map((group) => (
                <path
                  key={group.key}
                  d={group.d}
                  fill={branchColorVar(group.branch as OrgBranchName)}
                  opacity={
                    activeSector
                      ? group.sector === activeSector
                        ? 0.82
                        : DIM_OPACITY
                      : selectedId
                        ? DIM_OPACITY
                        : 0.82
                  }
                />
              ))}
            </g>
            <g onClick={onNodeClick} onPointerOver={onNodeOver} onPointerOut={onNodeOut}>
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

            {/* Marks that are selected, on the path, related or revealed: one element each. */}
            <g onClick={onNodeClick} onPointerOver={onNodeOver} onPointerOut={onNodeOut}>
              {dynamicNodes.map((node) => {
                const state =
                  node.id === selectedId
                    ? "selected"
                    : focusSet.has(node.id)
                      ? "path"
                      : neighborSet.has(node.id) || revealedIds.has(node.id)
                        ? "neighbor"
                        : selectedId || activeSector
                          ? activeSector && node.sector === activeSector
                            ? "base"
                            : "dim"
                          : "base";
                return <Mark key={node.id} node={node} state={state} />;
              })}
            </g>

            {/* The two chambers, drawn as ∩ arches. */}
            {statenSector?.block && arches.length > 0 ? (
              <g
                transform={`translate(${(Math.cos(statenSector.block.angle) * statenSector.block.radius).toFixed(2)} ${(Math.sin(statenSector.block.angle) * statenSector.block.radius).toFixed(2)}) rotate(${(((statenSector.block.angle + Math.PI / 2) * 180) / Math.PI).toFixed(2)})`}
                onClick={onNodeClick}
                onPointerOver={onNodeOver}
                onPointerOut={onNodeOut}
              >
                {arches.map((arch) => (
                  <g key={arch.id} data-node-id={arch.id} transform={`translate(${arch.offset} 0)`} className="cursor-pointer">
                    <title>{layout.byId.get(arch.id)?.name ?? arch.id}</title>
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
                ))}
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
              <g onPointerOver={onNodeOver} onPointerOut={onNodeOut}>
                <circle
                  r={layout.frameRadius}
                  fill="none"
                  stroke="var(--t-color-accent)"
                  strokeWidth={2}
                  opacity={0.9}
                  data-node-id={layout.frame.id}
                  className="cursor-pointer"
                  onClick={onNodeClick}
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
              fill={entry.state === "selected" ? "var(--t-color-accent-text)" : "var(--t-color-ink)"}
              fontWeight={entry.state === "selected" ? 700 : entry.state === "hover" ? 600 : 500}
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
      </div>

      <GraphList bundle={bundle} selectedId={selectedId} onSelect={onSelect} hiddenBranches={hiddenBranches} />
    </div>
  );
}

function Mark({ node, state }: { node: LaidOutNode; state: "base" | "dim" | "neighbor" | "path" | "selected" }) {
  const color = branchColorVar(node.branch);
  const radius = node.glyphRadius + (state === "selected" ? SELECTED_GROWTH : 0);
  const fill = state === "selected" || state === "path" ? "var(--t-color-accent)" : color;
  const opacity = state === "dim" ? DIM_OPACITY : state === "base" ? 0.82 : 1;

  return (
    <g data-node-id={node.id} transform={`translate(${node.x} ${node.y})`} opacity={opacity} className="cursor-pointer">
      <circle r={Math.max(10, radius + 4)} fill="transparent" />
      {state === "selected" ? (
        <circle r={radius + 6} fill="none" stroke="var(--t-color-accent)" strokeWidth={1.5} opacity={0.55} />
      ) : null}
      {state === "neighbor" ? (
        <circle r={radius + 3} fill="none" stroke="var(--t-color-accent-text)" strokeWidth={0.8} opacity={0.7} />
      ) : null}
      <path d={glyphPath(node.glyph, radius)} fill={fill} />
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
