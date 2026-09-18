"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { ORG_BRANCH_LABELS, ORG_SUBTYPE_LABELS } from "@/lib/labels";
import {
  computeFocusPath,
  computeLayout,
  edgePath,
  type GraphBundle,
  type LaidOutNode,
} from "@/lib/graph";
import { glyphPath } from "./glyph";
import { GraphList } from "./graph-list";

type GraphExplorerProps = {
  bundle: GraphBundle;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  hiddenBranches: ReadonlySet<string>;
};

type ViewTransform = { k: number; x: number; y: number };

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function GraphExplorer({ bundle, selectedId, onSelect, hiddenBranches }: GraphExplorerProps) {
  const layout = useMemo(() => computeLayout(bundle), [bundle]);
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; view: ViewTransform } | null>(null);
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
    const neighbor = new Map<string, string[]>();
    const path: string[] = [];
    const nodes = layout.byId;

    const push = (map: Map<string, string[]>, key: string, segment: string) => {
      const list = map.get(key);
      if (list) list.push(segment);
      else map.set(key, [segment]);
    };

    for (const edge of visibleEdges) {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) continue;
      const segment = edgePath(from.x, from.y, to.x, to.y);
      const key = edgeKey(edge.from, edge.to);
      if (pathEdgeKeys.has(key)) {
        path.push(segment);
      } else if (selectedId && (edge.from === selectedId || edge.to === selectedId)) {
        push(neighbor, edge.type, segment);
      } else {
        push(base, edge.type, segment);
      }
    }

    return {
      base: [...base.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      neighbor: [...neighbor.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      path,
    };
  }, [visibleEdges, layout, pathEdgeKeys, selectedId]);

  const selectedNode = selectedId ? layout.byId.get(selectedId) ?? null : null;

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
    movedRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      view,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) movedRef.current = true;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vb = layout.viewBox;
    const scale = Math.min(rect.width / vb.width, rect.height / vb.height);
    setView({ k: drag.view.k, x: drag.view.x + dx / scale, y: drag.view.y + dy / scale });
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
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

  const hubRadius = layout.hub?.radius ?? 0;
  const labelRadius = layout.maxRadius + 26;
  const hubSelected = selectedId !== null && layout.hub?.id === selectedId;
  const hubActive = focusPath.length > 0 || hubSelected;
  const statusText = selectedNode
    ? `${selectedNode.name}, ${ORG_SUBTYPE_LABELS[selectedNode.subtype]}, ${ORG_BRANCH_LABELS[selectedNode.branch]}, ${neighborSet.size} verbindingen.`
    : hubSelected && layout.hub
      ? `${layout.hub.name}, kiesgerechtigden.`
      : "Geen organisatie geselecteerd.";

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
        aria-label="Netwerk van Nederlandse overheidsorganisaties. Gebruik de pijltjestoetsen om te bladeren, Enter om te openen en Escape om te wissen."
        aria-describedby="grafiek-instructie"
        className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onClick={onBackgroundClick}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <g aria-hidden="true">
            {layout.sectors.map((sector) => (
              <line
                key={`spoke-${sector.branch}`}
                x1={Math.cos(sector.startAngle) * hubRadius}
                y1={Math.sin(sector.startAngle) * hubRadius}
                x2={Math.cos(sector.startAngle) * layout.maxRadius}
                y2={Math.sin(sector.startAngle) * layout.maxRadius}
                stroke="var(--color-line)"
                strokeWidth={1}
                opacity={0.6}
              />
            ))}
          </g>

          <g aria-hidden="true">
            {categorized.base.map(([type, segments]) => (
              <path
                key={`base-${type}`}
                d={segments.join(" ")}
                fill="none"
                stroke="var(--color-line-strong)"
                strokeWidth={0.75}
                opacity={0.35}
              />
            ))}
            {categorized.neighbor.map(([type, segments]) => (
              <path
                key={`neighbor-${type}`}
                d={segments.join(" ")}
                fill="none"
                stroke="var(--color-accent-text)"
                strokeWidth={1}
                opacity={0.7}
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

          <g onClick={onNodeClick}>
            {visibleNodes.map((node) => (
              <GraphGlyph
                key={node.id}
                node={node}
                state={
                  focusSet.has(node.id)
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
                  return (
                    <text
                      key={`neighbor-label-${id}`}
                      x={node.x + node.glyphRadius + 4}
                      y={node.y}
                      dominantBaseline="central"
                      fill="var(--color-ink-muted)"
                      style={{ fontSize: 11 }}
                    >
                      {node.name}
                    </text>
                  );
                })}
            </g>
          ) : null}

          {layout.hub ? (
            <g aria-hidden="true">
              <circle
                cx={0}
                cy={0}
                r={layout.hub.radius}
                fill="var(--color-surface-inset)"
                stroke={hubActive ? "var(--color-accent)" : "var(--color-line-strong)"}
                strokeWidth={hubActive ? 2 : 1}
              />
              <path
                d={glyphPath("dot", layout.hub.radius * 0.34)}
                fill={hubActive ? "var(--color-accent)" : "var(--color-ink-muted)"}
              />
            </g>
          ) : null}

          <g aria-hidden="true">
            {layout.sectors.map((sector) => {
              const angle = (sector.startAngle + sector.endAngle) / 2;
              return (
                <text
                  key={`label-${sector.branch}`}
                  x={Math.cos(angle) * labelRadius}
                  y={Math.sin(angle) * labelRadius}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--color-ink-faint)"
                  style={{ fontSize: 18, letterSpacing: "0.08em" }}
                >
                  {ORG_BRANCH_LABELS[sector.branch].toUpperCase()}
                </text>
              );
            })}
          </g>
        </g>
      </svg>

      <p id="grafiek-instructie" className="sr-only">
        De grafiek toont organisaties in sectoren per bestuurslaag. Pijltjestoetsen verplaatsen de
        selectie, Enter opent de organisatie, Escape wist de selectie, de toetsen plus en min zoomen
        en nul herstelt het beeld. Rechtsonder staan knoppen voor in- en uitzoomen.
      </p>

      {selectedNode ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
          <div className="pointer-events-auto max-w-full rounded-md border border-line bg-surface px-3 py-2 text-center shadow-lg">
            <p className="truncate text-sm font-medium text-ink">{selectedNode.name}</p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {ORG_SUBTYPE_LABELS[selectedNode.subtype]} · {ORG_BRANCH_LABELS[selectedNode.branch]}
            </p>
            <a
              href={`/organisaties/${selectedNode.slug}/`}
              className="mt-1 inline-block text-xs font-medium text-accent-text underline underline-offset-2"
            >
              Open organisatiepagina
            </a>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => zoomByCenter(1.25)}
          aria-label="Inzoomen"
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface text-sm text-ink-muted hover:text-ink"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomByCenter(0.8)}
          aria-label="Uitzoomen"
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface text-sm text-ink-muted hover:text-ink"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => setView({ k: 1, x: 0, y: 0 })}
          aria-label="Beeld herstellen"
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

function GraphGlyph({ node, state }: { node: LaidOutNode; state: "base" | "dim" | "neighbor" | "path" }) {
  const fill =
    state === "path"
      ? "var(--color-accent)"
      : state === "neighbor"
        ? "var(--color-accent-text)"
        : "var(--color-ink-muted)";
  const opacity = state === "dim" ? 0.35 : state === "base" ? 0.85 : 1;
  const radius = state === "path" ? node.glyphRadius + 2 : node.glyphRadius;
  return (
    <g data-node-id={node.id} transform={`translate(${node.x} ${node.y})`} opacity={opacity}>
      <circle r={11} fill="transparent" />
      <path d={glyphPath(node.glyph, radius)} fill={fill} />
    </g>
  );
}
