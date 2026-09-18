"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import {
  computeFocusPath,
  computeLayout,
  edgePath,
  SELECTED_GROWTH,
  type GraphBundle,
  type LaidOutNode,
} from "@/lib/graph";
import { branchColorVar } from "@/lib/branch-colors";
import { edgeLine, edgeTypeOrderIndex } from "./edge-styles";
import type { OrgBranch } from "@/lib/types";
import { useT } from "@/components/i18n/use-t";
import { useLocale } from "@/components/i18n/language-provider";
import {
  BRANCH_LABELS_I18N,
  ORG_SUBTYPE_LABELS_I18N,
  ORG_TYPE_LABELS_I18N,
} from "@/lib/i18n/dict-graph";
import { orgEnGloss } from "@/lib/name-gloss";
import { hubBurstPath, glyphPath } from "./glyph";
import { GraphList } from "./graph-list";
import { sectorLabelArc, sectorWedge } from "./sector-wedge";

type GraphExplorerProps = {
  bundle: GraphBundle;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  hiddenBranches: ReadonlySet<string>;
};

type ViewTransform = { k: number; x: number; y: number };

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const SELECT_DIM_OPACITY = 0.22;

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function localizedLabel(
  locale: "nl" | "en",
  map: Record<string, { nl: string; en: string }>,
  key: string | null | undefined,
): string {
  if (!key) return "";
  const entry = map[key];
  if (!entry) return key;
  return locale === "en" ? entry.en : entry.nl;
}

export function GraphExplorer({ bundle, selectedId, onSelect, hiddenBranches }: GraphExplorerProps) {
  const layout = useMemo(() => computeLayout(bundle), [bundle]);
  const router = useRouter();
  const t = useT("graph");
  const tCommon = useT("common");
  const locale = useLocale();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; view: ViewTransform } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    startDist: number;
    startMidX: number;
    startMidY: number;
    startMidUser: { x: number; y: number };
    startView: ViewTransform;
  } | null>(null);
  const movedRef = useRef(false);

  const [view, setView] = useState<ViewTransform>({ k: 1, x: 0, y: 0 });

  const visibleNodes = useMemo(
    () => layout.nodes.filter((node) => !hiddenBranches.has(node.branch)),
    [layout, hiddenBranches],
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);

  const visibleEdges = useMemo(
    () => layout.edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)),
    [layout, visibleIds],
  );

  const edgeSet = useMemo(() => {
    const set = new Set<string>();
    for (const edge of visibleEdges) set.add(edgeKey(edge.from, edge.to));
    return set;
  }, [visibleEdges]);

  const focusPath = useMemo(
    () => (selectedId ? computeFocusPath(layout, selectedId) : []),
    [layout, selectedId],
  );

  const focusSet = useMemo(() => new Set(focusPath), [focusPath]);

  const neighborSet = useMemo(() => {
    if (!selectedId) return new Set<string>();
    return new Set(layout.adjacency.get(selectedId) ?? []);
  }, [layout, selectedId]);

  const pathEdgeKeys = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < focusPath.length - 1; i += 1) {
      const key = edgeKey(focusPath[i], focusPath[i + 1]);
      if (edgeSet.has(key)) set.add(key);
    }
    return set;
  }, [focusPath, edgeSet]);

  const categorized = useMemo(() => {
    const base = new Map<string, string[]>();
    const neighbor: { key: string; type: string; d: string }[] = [];
    const path: string[] = [];
    const nodes = layout.byId;

    for (const edge of visibleEdges) {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) continue;
      const segment = edgePath(from.x, from.y, to.x, to.y);
      const key = edgeKey(edge.from, edge.to);
      if (pathEdgeKeys.has(key)) {
        path.push(segment);
      } else if (selectedId && (edge.from === selectedId || edge.to === selectedId)) {
        neighbor.push({ key, type: edge.type, d: segment });
      } else {
        const list = base.get(edge.type);
        if (list) list.push(segment);
        else base.set(edge.type, [segment]);
      }
    }

    return {
      base: [...base.entries()]
        .sort((a, b) => edgeTypeOrderIndex(a[0]) - edgeTypeOrderIndex(b[0]))
        .map(([type, segments]) => ({ type, d: segments.join(" ") })),
      neighbor: neighbor.sort((a, b) => a.type.localeCompare(b.type) || a.key.localeCompare(b.key)),
      path,
    };
  }, [visibleEdges, layout, pathEdgeKeys, selectedId]);

  const hubNodeId = layout.hub?.id ?? null;
  const selectedNode = selectedId ? layout.byId.get(selectedId) ?? null : null;
  const selectedHub = layout.hub && selectedId && layout.hub.id === selectedId ? layout.hub : null;
  const selectedBranch: OrgBranch | null | "hub" = selectedHub
    ? "hub"
    : selectedNode
      ? selectedNode.branch
      : null;

  const wedges = useMemo(() => {
    const inner = (layout.hub?.radius ?? 0) + 8;
    return layout.sectors
      .filter((sector) => !hiddenBranches.has(sector.branch))
      .map((sector) => sectorWedge(sector, inner, layout.maxRadius + 26))
      .filter((wedge) => wedge.d !== "");
  }, [layout, hiddenBranches]);

  const labelArcs = useMemo(
    () =>
      layout.sectors
        .filter((sector) => !hiddenBranches.has(sector.branch))
        .map((sector) => sectorLabelArc(sector))
        .filter((arc): arc is { id: string; d: string } => arc !== null),
    [layout, hiddenBranches],
  );

  const hubRadius = layout.hub?.radius ?? 0;
  const hubSelected = selectedId !== null && layout.hub?.id === selectedId;
  const hubActive = focusPath.length > 0 || hubSelected;
  const statusText = selectedNode
    ? `${selectedNode.name}, ${localizedLabel(locale, ORG_SUBTYPE_LABELS_I18N, selectedNode.subtype)}, ${localizedLabel(locale, BRANCH_LABELS_I18N, selectedNode.branch)}, ${t("connections", { n: neighborSet.size })}.`
    : hubSelected && layout.hub
      ? t("hubStatus", { name: layout.hub.name })
      : t("noSelection");

  const connectionCountText = (count: number) =>
    count === 1 ? t("connectionsOne") : t("connections", { n: count });

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

  const zoomAt = useCallback((point: { x: number; y: number }, factor: number) => {
    setView((current) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * factor));
      const ratio = k / current.k;
      return {
        k,
        x: point.x - (point.x - current.x) * ratio,
        y: point.y - (point.y - current.y) * ratio,
      };
    });
  }, []);

  const zoomByCenter = useCallback(
    (factor: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      zoomAt(toUserPoint(rect.left + rect.width / 2, rect.top + rect.height / 2), factor);
    },
    [toUserPoint, zoomAt],
  );

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
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      const startMidX = (a.x + b.x) / 2;
      const startMidY = (a.y + b.y) / 2;
      pinchRef.current = {
        startDist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
        startMidX,
        startMidY,
        startMidUser: toUserPoint(startMidX, startMidY),
        startView: view,
      };
      dragRef.current = null;
      movedRef.current = true;
      return;
    }
    if (pointersRef.current.size > 2) return;
    movedRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      view,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vb = layout.viewBox;
    const scale = Math.min(rect.width / vb.width, rect.height / vb.height);

    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      const factor = Math.hypot(b.x - a.x, b.y - a.y) / pinch.startDist;
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinch.startView.k * factor));
      const ratio = k / pinch.startView.k;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      setView({
        k,
        x:
          pinch.startMidUser.x -
          (pinch.startMidUser.x - pinch.startView.x) * ratio +
          (midX - pinch.startMidX) / scale,
        y:
          pinch.startMidUser.y -
          (pinch.startMidUser.y - pinch.startView.y) * ratio +
          (midY - pinch.startMidY) / scale,
      });
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) movedRef.current = true;
    setView({ k: drag.view.k, x: drag.view.x + dx / scale, y: drag.view.y + dy / scale });
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 1) {
      const [remaining] = pointersRef.current.entries();
      if (remaining) {
        const [pointerId, point] = remaining;
        dragRef.current = { pointerId, startX: point.x, startY: point.y, view };
      }
    }
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onBackgroundClick = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    onSelect(null);
  };

  const onNodeClick = (event: ReactMouseEvent<SVGGElement>) => {
    event.stopPropagation();
    const target = (event.target as Element).closest("[data-node-id]");
    const id = target?.getAttribute("data-node-id") ?? null;
    if (id) onSelect(id);
  };

  const onNodeDoubleClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    const target = (event.target as Element).closest("[data-node-id]");
    const id = target?.getAttribute("data-node-id") ?? null;
    if (!id) return;
    const node = id === hubNodeId ? layout.hub : layout.byId.get(id);
    if (node) {
      event.preventDefault();
      event.stopPropagation();
      router.push(`/organisaties/${node.slug}/`);
    } else {
      event.preventDefault();
      zoomByCenter(1.25);
    }
  };

  const moveSelection = (delta: number) => {
    if (visibleNodes.length === 0) return;
    const currentIndex = selectedId ? visibleNodes.findIndex((node) => node.id === selectedId) : -1;
    const nextIndex =
      currentIndex === -1
        ? delta > 0
          ? 0
          : visibleNodes.length - 1
        : (currentIndex + delta + visibleNodes.length) % visibleNodes.length;
    onSelect(visibleNodes[nextIndex].id);
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
        if (visibleNodes[0]) onSelect(visibleNodes[0].id);
        break;
      case "End":
        event.preventDefault();
        if (visibleNodes.length > 0) onSelect(visibleNodes[visibleNodes.length - 1].id);
        break;
      case "Enter":
        if (selectedNode) {
          event.preventDefault();
          router.push(`/organisaties/${selectedNode.slug}/`);
        }
        break;
      case " ":
        if (selectedNode) {
          event.preventDefault();
          onSelect(selectedNode.id);
        }
        break;
      case "Escape":
        event.preventDefault();
        onSelect(null);
        break;
      case "+":
      case "=":
        event.preventDefault();
        zoomByCenter(1.25);
        break;
      case "-":
      case "_":
        event.preventDefault();
        zoomByCenter(0.8);
        break;
      case "0":
        event.preventDefault();
        setView({ k: 1, x: 0, y: 0 });
        break;
      default:
        break;
    }
  };

  const branchLabel = (branch: string) => localizedLabel(locale, BRANCH_LABELS_I18N, branch);

  /** English meaning of a Dutch org name, or null (NL locale or no gloss). */
  const glossOf = (name: string): string | null =>
    locale === "en" ? orgEnGloss(name) : null;

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
        onDoubleClick={onNodeDoubleClick}
      >
        <defs>
          {labelArcs.map((arc) => (
            <path key={arc.id} id={arc.id} d={arc.d} fill="none" />
          ))}
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

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <g aria-hidden="true" pointerEvents="none">
            {wedges.map((wedge) => (
              <path
                key={`wedge-${wedge.branch}`}
                d={wedge.d}
                fill={wedge.color}
                fillOpacity={selectedBranch === wedge.branch ? 0.14 : 0.07}
                stroke={wedge.color}
                strokeOpacity={selectedBranch === wedge.branch ? 0.32 : 0.12}
                strokeWidth={0.6}
              />
            ))}
          </g>

          <g aria-hidden="true" pointerEvents="none">
            {categorized.base.map((group) => {
              const line = edgeLine(group.type);
              return (
                <path
                  key={`base-${group.type}`}
                  d={group.d}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={line.width}
                  strokeDasharray={line.dash ?? undefined}
                  opacity={0.35}
                />
              );
            })}
          </g>

          {selectedId ? (
            <g aria-hidden="true" pointerEvents="none">
              {categorized.neighbor.map((edge) => (
                <path
                  key={`neighbor-${edge.key}`}
                  d={edge.d}
                  fill="none"
                  stroke="var(--color-accent-text)"
                  strokeWidth={1}
                  opacity={0.75}
                  markerEnd="url(#grafiek-pijl)"
                />
              ))}
              {categorized.path.length > 0 ? (
                <path
                  d={categorized.path.join(" ")}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={1}
                />
              ) : null}
            </g>
          ) : null}

          <g onClick={onNodeClick}>
            {visibleNodes.map((node) => (
              <GraphGlyph
                key={node.id}
                node={node}
                selected={node.id === selectedId}
                state={
                  node.id === selectedId
                    ? "selected"
                    : focusSet.has(node.id)
                      ? "path"
                      : neighborSet.has(node.id)
                        ? "neighbor"
                        : selectedId
                          ? "dim"
                          : "base"
                }
              />
            ))}
          </g>

          {selectedId ? (
            <g aria-hidden="true" pointerEvents="none">
              {[...neighborSet]
                .filter((id) => visibleIds.has(id))
                .map((id) => {
                  const node = layout.byId.get(id);
                  if (!node) return null;
                  const gloss = glossOf(node.name);
                  return (
                    <g key={`neighbor-label-${id}`}>
                      <text
                        x={node.x + node.glyphRadius + 4}
                        y={node.y}
                        dominantBaseline="central"
                        fill="var(--color-ink-muted)"
                        style={{ fontSize: 11 }}
                      >
                        {node.name}
                      </text>
                      {gloss ? (
                        <text
                          x={node.x + node.glyphRadius + 4}
                          y={node.y + 10}
                          dominantBaseline="central"
                          fill="var(--color-ink-faint)"
                          style={{ fontSize: 8.5 }}
                        >
                          ({gloss})
                        </text>
                      ) : null}
                    </g>
                  );
                })}
            </g>
          ) : null}

          {layout.hub ? (
            <HubBurst
              hub={layout.hub}
              active={hubActive}
              labelA={layout.hub.name.split(" ").slice(0, 1).join(" ")}
              labelB={layout.hub.name.split(" ").slice(1).join(" ")}
            />
          ) : null}

          <g aria-hidden="true" pointerEvents="none">
            {layout.sectors
              .filter((sector) => !hiddenBranches.has(sector.branch))
              .map((sector) => {
                const arc = sectorLabelArc(sector);
                if (!arc) return null;
                return (
                  <text
                    key={`label-${sector.branch}`}
                    fill={branchColorVar(sector.branch)}
                    fillOpacity={0.8}
                    style={{ fontSize: 17, letterSpacing: "0.16em", fontWeight: 600 }}
                  >
                    <textPath href={`#${arc.id}`} startOffset="50%" textAnchor="middle">
                      {branchLabel(sector.branch).toUpperCase()}
                    </textPath>
                  </text>
                );
              })}
          </g>
        </g>
      </svg>

      <p id="grafiek-instructie" className="sr-only">
        {t("graphInstructions")}
      </p>

      {selectedHub && layout.hub ? (
        <SelectionPopover ariaLabel={t("selectionDetails")}>
          <p className="truncate text-sm font-medium text-ink">{layout.hub.name}</p>
          {glossOf(layout.hub.name) ? (
            <p className="text-[10px] text-ink-faint">({glossOf(layout.hub.name)})</p>
          ) : null}
          <p className="mt-0.5 text-xs text-ink-faint">{connectionCountText(neighborSet.size)}</p>
          <a
            href={`/organisaties/${layout.hub.slug}/`}
            className="mt-1 inline-block text-xs font-medium text-accent-text underline underline-offset-2"
          >
            {tCommon("openOrgPage")}
          </a>
        </SelectionPopover>
      ) : selectedNode ? (
        <SelectionPopover ariaLabel={t("selectionDetails")}>
          <p className="truncate text-sm font-medium text-ink">{selectedNode.name}</p>
          {glossOf(selectedNode.name) ? (
            <p className="text-[10px] text-ink-faint">({glossOf(selectedNode.name)})</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
            <span className="rounded-pill border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
              {localizedLabel(locale, ORG_TYPE_LABELS_I18N, selectedNode.type)}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-pill border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted"
            >
              <svg aria-hidden="true" viewBox="-11 -11 22 22" width={10} height={10}>
                <circle r={8} fill={branchColorVar(selectedNode.branch)} />
              </svg>
              {localizedLabel(locale, BRANCH_LABELS_I18N, selectedNode.branch)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-faint">{connectionCountText(neighborSet.size)}</p>
          <a
            href={`/organisaties/${selectedNode.slug}/`}
            className="mt-1 inline-block text-xs font-medium text-accent-text underline underline-offset-2"
          >
            {tCommon("openOrgPage")}
          </a>
        </SelectionPopover>
      ) : null}

      <div className="absolute bottom-3 left-3 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => zoomByCenter(1.25)}
          aria-label={t("zoomIn")}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface text-sm text-ink-muted hover:text-ink"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomByCenter(0.8)}
          aria-label={t("zoomOut")}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface text-sm text-ink-muted hover:text-ink"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => setView({ k: 1, x: 0, y: 0 })}
          aria-label={t("zoomReset")}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface text-[10px] font-medium text-ink-muted hover:text-ink"
        >
          0
        </button>
      </div>

      <GraphList
        bundle={bundle}
        selectedId={selectedId}
        onSelect={onSelect}
        hiddenBranches={hiddenBranches}
      />
    </div>
  );
}

function SelectionPopover({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
      <div
        aria-label={ariaLabel}
        className="pointer-events-auto max-w-full rounded-md border border-line bg-surface px-3 py-2 text-center shadow-xl"
      >
        {children}
      </div>
    </div>
  );
}

function HubBurst({
  hub,
  active,
  labelA,
  labelB,
}: {
  hub: { id: string; slug: string; name: string; x: number; y: number; radius: number };
  active: boolean;
  labelA: string;
  labelB: string;
}) {
  return (
    <g data-node-id={hub.id} transform={`translate(${hub.x} ${hub.y})`}>
      <a href={`/organisaties/${hub.slug}/`}>
        <path
          d={hubBurstPath(hub.radius)}
          fill="var(--t-color-accent)"
          stroke={active ? "var(--t-color-accent-text)" : "var(--t-color-accent)"}
          strokeWidth={active ? 2 : 1}
          opacity={active ? 1 : 0.9}
        />
        <text
          textAnchor="middle"
          fill="var(--t-color-accent-ink)"
          style={{ fontSize: 15, fontWeight: 700 }}
        >
          <tspan x={0} dy={-6}>
            {labelA}
          </tspan>
          <tspan x={0} dy={17}>
            {labelB}
          </tspan>
        </text>
      </a>
    </g>
  );
}

function GraphGlyph({
  node,
  state,
  selected,
}: {
  node: LaidOutNode;
  state: "base" | "dim" | "neighbor" | "path" | "selected";
  selected: boolean;
}) {
  const color = branchColorVar(node.branch);
  const radius = node.glyphRadius + (state === "selected" ? SELECTED_GROWTH : 0);
  const fill = state === "selected" || state === "path" ? "var(--t-color-accent)" : color;
  const opacity =
    state === "dim"
      ? SELECT_DIM_OPACITY
      : state === "base"
        ? 0.78
        : 1;
  return (
    <g data-node-id={node.id} transform={`translate(${node.x} ${node.y})`} opacity={opacity}>
      <circle r={12} fill="transparent" />
      {selected ? (
        <circle
          r={radius + 6}
          fill="none"
          stroke="var(--t-color-accent)"
          strokeWidth={1.5}
          opacity={0.55}
        />
      ) : null}
      <path d={glyphPath(node.glyph, radius)} fill={fill} />
    </g>
  );
}
