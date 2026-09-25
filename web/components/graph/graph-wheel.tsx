"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { GLYPH_BY_SUBTYPE, type GraphBundle } from "@/lib/graph";
import { branchColorVar } from "@/lib/branch-colors";
import { buildWheel, cellMarks, WHEEL_RADIUS, WHEEL_RINGS, type WheelCell, type WheelGroup } from "@/lib/wheel";
import { useSelection } from "@/components/selection/selection-provider";
import { useT } from "@/components/i18n/use-t";
import { glyphPathAt } from "./glyph";

/** Room kept at a part's outer edge for its curved name, inside a group of several parts. */
const TITLE_BAND = 15;
/** The largest step between two marks: one size everywhere, so sparse cells do not blow their shapes up. */
const MARK_PITCH = 24;
const TITLE = 8.5;
const TITLE_MIN = 6.5;
const CHAR = 0.58;
/** A group's name in the lane outside its background: capitals, spaced, in the group's colour. */
const GROUP = 9;
const GROUP_MIN = 6.5;
const GROUP_SPACING = 1.3;
const GROUP_CHAR = 0.68;

function segment(r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)}A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
}

/** An arc to set text on; drawn backwards on the lower half so the text reads upright there. */
function arcPath(r: number, a0: number, a1: number, backwards = false): string {
  const p = (a: number) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return backwards ? `M${p(a1)}A${r} ${r} 0 ${large} 0 ${p(a0)}` : `M${p(a0)}A${r} ${r} 0 ${large} 1 ${p(a1)}`;
}

/** A group's name in the lane beside it, outside the background, at a size that fits. */
function groupTitle(group: WheelGroup) {
  const mid = (group.a0 + group.a1) / 2;
  const lower = Math.sin(mid) > 0.1;
  // Upper half: the text rises outward from its baseline; lower half: it hangs toward the core.
  const radius = group.label === "inner" ? (lower ? group.r0 - 3 : group.r0 - 10.5) : lower ? group.r1 + 10.5 : group.r1 + 3.5;
  const a0 = Math.max(group.a0, mid - Math.PI * 0.95);
  const a1 = Math.min(group.a1, mid + Math.PI * 0.95);
  const length = (a1 - a0) * radius - 6;
  const text = (group.count !== null ? `${group.title} · ${group.count}` : group.title).toUpperCase();
  // Tighter spacing before a smaller size, so a short lane still carries the whole name.
  for (const candidate of [text, group.title.toUpperCase()]) {
    for (const spacing of [GROUP_SPACING, 0.5]) {
      const size = Math.min(GROUP, (length / candidate.length - spacing) / GROUP_CHAR);
      if (size >= GROUP_MIN) return { text: candidate, size, spacing, path: arcPath(radius, a0, a1, lower) };
    }
  }
  return null;
}

/** A cell's name along its outer edge, at a size that fits, or null when even the smallest does not. */
function cellTitle(cell: WheelCell) {
  const mid = (cell.a0 + cell.a1) / 2;
  const lower = Math.sin(mid) > 0.1;
  // Upper half: baseline inside the outer edge, text rising outward. Lower half: baseline at the edge, text hanging inward.
  const radius = lower ? cell.r1 - 3.5 : cell.r1 - 10.5;
  const length = (cell.a1 - cell.a0) * radius - 8;
  const text = cell.count !== null ? `${cell.title} · ${cell.count}` : cell.title;
  for (const candidate of [text, cell.title]) {
    const size = Math.min(TITLE, length / (candidate.length * CHAR));
    if (size >= TITLE_MIN) return { text: candidate, size, path: arcPath(radius, cell.a0, cell.a1, lower) };
  }
  return null;
}

/**
 * The wheel form of the graph (lib/wheel.ts): the Grondwet in the centre,
 * the national bodies in four branch wedges, the decentrale overheden and
 * the Koninkrijk around them and the voters as the rim. Every body is a mark
 * in its shape (the kind of body) and colour (the branch); the Kamers are
 * drawn as their halls. A mark picks its body, a cell its sector or group.
 * Scroll to zoom, drag to pan.
 */
export function GraphWheel({ bundle }: { bundle: GraphBundle }) {
  const t = useT("graph");
  const { current, select } = useSelection();
  const model = useMemo(() => buildWheel(bundle), [bundle]);
  const [hot, setHot] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const groupOf = useMemo(() => {
    const out = new Map<string, WheelGroup>();
    for (const group of model.groups) for (const id of group.cells) out.set(id, group);
    return out;
  }, [model]);
  const groupTitles = useMemo(() => model.groups.map((group) => ({ group, title: groupTitle(group) })), [model]);
  const drawn = useMemo(
    () =>
      model.cells.map((cell) => {
        const group = groupOf.get(cell.id)!;
        // A part names itself inside only when its group has several parts; a group of one is named outside.
        const title = group.cells.length > 1 ? cellTitle(cell) : null;
        const shape = bundle.chamberShapes?.[cell.id] ?? null;
        const marks = shape ? [] : cellMarks(cell, cell.items.map((entry) => entry.id), title ? TITLE_BAND : 3, MARK_PITCH);
        return { cell, group, title, shape, marks, itemById: new Map(cell.items.map((entry) => [entry.id, entry])) };
      }),
    [model, groupOf, bundle.chamberShapes],
  );

  const selectedId = current && "id" in current ? current.id : null;
  const pickCell = (cell: WheelCell) => {
    if (!cell.pick || drag.current?.moved) return;
    select({ kind: cell.pick.kind, id: cell.pick.id, surface: "graph" } as Parameters<typeof select>[0]);
  };
  const pickBody = (id: string) => {
    if (drag.current?.moved) return;
    select({ kind: "org", id, surface: "graph" });
  };

  const unitsPerPixel = () => {
    const box = svgRef.current?.getBoundingClientRect();
    return box ? (2 * WHEEL_RADIUS + 20) / Math.min(box.width, box.height) : 1;
  };
  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    const factor = Math.exp(-event.deltaY * 0.0015);
    setView((current) => {
      const k = Math.min(5, Math.max(1, current.k * factor));
      if (k === 1) return { k: 1, x: 0, y: 0 };
      const box = svgRef.current?.getBoundingClientRect();
      if (!box) return { ...current, k };
      const upp = unitsPerPixel();
      const px = (event.clientX - box.left - box.width / 2) * upp;
      const py = (event.clientY - box.top - box.height / 2) * upp;
      const ratio = k / current.k;
      return { k, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
    });
  };
  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const state = drag.current;
    if (!state || view.k === 1) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (Math.hypot(dx, dy) > 4) state.moved = true;
    if (!state.moved) return;
    const upp = unitsPerPixel();
    setView((current) => ({ ...current, x: state.vx + dx * upp, y: state.vy + dy * upp }));
  };
  const onPointerUp = () => {
    setTimeout(() => {
      drag.current = null;
    }, 0);
  };

  const [f0, f1] = WHEEL_RINGS.frame;
  const size = WHEEL_RADIUS + 10;

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`${-size} ${-size} ${2 * size} ${2 * size}`}
        className="h-full w-full touch-none select-none"
        role="group"
        aria-label={t("wheelAria")}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          {[0, 1, 2, 3].map((index) => {
            const a = -Math.PI / 2 + (index * Math.PI) / 2;
            const lower = Math.sin(a) > 0.1;
            return <path key={index} id={`wheel-frame-${index}`} d={arcPath((f0 + f1) / 2 + (lower ? 3.4 : -3.4), a - 0.5, a + 0.5, lower)} />;
          })}
          {model.wedges.map((wedge) => {
            const lower = Math.sin((wedge.a0 + wedge.a1) / 2) > 0.1;
            return (
              <path
                key={wedge.id}
                id={`wheel-wedge-${wedge.id}`}
                d={arcPath(WHEEL_RINGS.national[2][1] + (lower ? 8.5 : 3), wedge.a0, wedge.a1, lower)}
              />
            );
          })}
          {drawn.map(({ cell, title }) => (title ? <path key={cell.id} id={`wheel-title-${cell.id}`} d={title.path} /> : null))}
          {groupTitles.map(({ group, title }) => (title ? <path key={group.id} id={`wheel-group-${group.id}`} d={title.path} /> : null))}
        </defs>
        <g transform={`translate(${view.x.toFixed(2)} ${view.y.toFixed(2)}) scale(${view.k.toFixed(3)})`}>
          {/* The voters as the rim: a band with a fine edge on both sides. */}
          <circle r={(f0 + f1) / 2} fill="none" stroke="var(--t-color-sector-regering)" strokeOpacity={0.32} strokeWidth={f1 - f0} />
          <circle r={f0} fill="none" stroke="var(--t-color-sector-regering)" strokeOpacity={0.85} strokeWidth={1.2} />
          <circle r={f1} fill="none" stroke="var(--t-color-sector-regering)" strokeOpacity={0.85} strokeWidth={1.2} />
          {[0, 1, 2, 3].map((index) => (
            <text key={index} fontSize={10} letterSpacing={3} fontWeight={700} fill="var(--t-color-ink)" opacity={0.9}>
              <textPath href={`#wheel-frame-${index}`} startOffset="50%" textAnchor="middle">
                {t("wheelVoters")}
              </textPath>
            </text>
          ))}
          {model.wedges.map((wedge) => (
            <text key={wedge.id} fontSize={8.5} letterSpacing={1.6} fontWeight={700} fill="var(--t-color-ink-faint)">
              <textPath href={`#wheel-wedge-${wedge.id}`} startOffset="50%" textAnchor="middle">
                {wedge.title.toUpperCase()}
              </textPath>
            </text>
          ))}

          {/* One background per group, its name outside it in the lane. */}
          {groupTitles.map(({ group, title }) => {
            const color = branchColorVar(group.branch);
            const lit = hot !== null && group.cells.includes(hot);
            return (
              <g key={group.id} pointerEvents="none">
                <path
                  d={segment(group.r0, group.r1, group.a0, group.a1)}
                  fill={color}
                  fillOpacity={lit ? 0.17 : 0.11}
                  stroke={color}
                  strokeOpacity={0.4}
                  strokeWidth={1}
                  strokeLinejoin="round"
                />
                {title ? (
                  <text fontSize={title.size} letterSpacing={title.spacing} fontWeight={700} fill={color}>
                    <textPath href={`#wheel-group-${group.id}`} startOffset="50%" textAnchor="middle">
                      {title.text}
                    </textPath>
                  </text>
                ) : null}
              </g>
            );
          })}

          {drawn.map(({ cell, group, title, shape, marks, itemById }) => {
            const color = branchColorVar(cell.branch);
            const selected = selectedId !== null && (cell.pick?.id === selectedId || cell.id === selectedId);
            const holdsSelected = selectedId !== null && itemById.has(selectedId);
            const mid = (cell.a0 + cell.a1) / 2;
            const rm = (cell.r0 + cell.r1 - (title ? TITLE_BAND : 0)) / 2;
            const parts = group.cells.length > 1;
            // Parts of a group are set apart by a faint dashed line on the sides they share, not by their own boxes.
            const rimBelow = parts && cell.r0 > group.r0 + 1e-6 ? (cell.r0 + Math.max(...model.cells.filter((other) => other.group === cell.group && other.r1 <= cell.r0).map((other) => other.r1), group.r0)) / 2 : null;
            const sideLine = parts && cell.a0 > group.a0 + 1e-6 ? cell.a0 - 0.0079 : null;
            return (
              <g
                key={cell.id}
                onPointerEnter={() => setHot(cell.id)}
                onPointerLeave={() => setHot((current) => (current === cell.id ? null : current))}
              >
                {sideLine !== null ? (
                  <line
                    x1={Math.cos(sideLine) * (cell.r0 + 4)}
                    y1={Math.sin(sideLine) * (cell.r0 + 4)}
                    x2={Math.cos(sideLine) * (cell.r1 - 4)}
                    y2={Math.sin(sideLine) * (cell.r1 - 4)}
                    stroke={color}
                    strokeOpacity={0.45}
                    strokeDasharray="2 3"
                    pointerEvents="none"
                  />
                ) : null}
                {rimBelow !== null ? (
                  <path d={arcPath(rimBelow, cell.a0 + 0.02, cell.a1 - 0.02)} fill="none" stroke={color} strokeOpacity={0.45} strokeDasharray="2 3" pointerEvents="none" />
                ) : null}
                <path
                  d={segment(cell.r0, cell.r1, cell.a0, cell.a1)}
                  fill={color}
                  fillOpacity={selected ? 0.22 : parts && (hot === cell.id || holdsSelected) ? 0.1 : 0}
                  stroke={selected ? "var(--t-color-accent)" : "none"}
                  strokeWidth={selected ? 2 : 0}
                  pointerEvents="all"
                  className={cell.pick ? "cursor-pointer" : undefined}
                  onClick={() => pickCell(cell)}
                >
                  <title>{cell.count !== null ? `${cell.title}: ${cell.count}` : cell.title}</title>
                </path>
                {title ? (
                  <text fontSize={title.size} fontWeight={600} fill="var(--t-color-ink-muted)" pointerEvents="none">
                    <textPath href={`#wheel-title-${cell.id}`} startOffset="50%" textAnchor="middle">
                      {title.text}
                    </textPath>
                  </text>
                ) : null}
                {shape ? <Hall shape={shape} cell={cell} rm={rm} mid={mid} titleBand={title ? TITLE_BAND : 0} /> : null}
                {marks.map((mark) => {
                  const entry = itemById.get(mark.id)!;
                  const markColor = branchColorVar(entry.branch);
                  const isSelected = entry.id === selectedId;
                  const glyph = GLYPH_BY_SUBTYPE[entry.subtype] ?? "dot";
                  // Long shapes lie along the ring, so they follow their cell instead of cutting across it.
                  const along = glyph === "capsule" || glyph === "seat" ? ((Math.atan2(mark.y, mark.x) + Math.PI / 2) * 180) / Math.PI : 0;
                  return (
                    <path
                      key={mark.id}
                      transform={along ? `rotate(${along.toFixed(2)} ${mark.x.toFixed(2)} ${mark.y.toFixed(2)})` : undefined}
                      d={glyphPathAt(glyph, isSelected ? mark.r * 1.25 : mark.r, mark.x, mark.y)}
                      fill={markColor}
                      fillOpacity={isSelected ? 0.9 : 0.45}
                      stroke={isSelected ? "var(--t-color-accent)" : markColor}
                      strokeWidth={isSelected ? 1.8 : Math.max(0.6, mark.r * 0.14)}
                      strokeLinejoin="round"
                      className="cursor-pointer transition-[fill-opacity] hover:[fill-opacity:0.85]"
                      onClick={(event) => {
                        event.stopPropagation();
                        pickBody(entry.id);
                      }}
                    >
                      <title>{entry.name}</title>
                    </path>
                  );
                })}
              </g>
            );
          })}

          <circle r={WHEEL_RINGS.core} fill="var(--t-color-surface)" stroke="var(--t-color-sector-regering)" strokeOpacity={0.7} strokeWidth={1.5} />
          <text y={-4} textAnchor="middle" fontSize={15} fontWeight={800} fill="var(--t-color-ink)">
            Grondwet
          </text>
          <text y={13} textAnchor="middle" fontSize={10} fill="var(--t-color-ink-muted)">
            {t("wheelCoreSub")}
          </text>
        </g>
      </svg>
      {view.k > 1 ? (
        <button
          type="button"
          onClick={() => setView({ k: 1, x: 0, y: 0 })}
          className="tap-target absolute bottom-3 left-3 rounded-sm border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-muted hover:text-ink"
        >
          {t("wheelReset")}
        </button>
      ) : null}
    </div>
  );
}

/**
 * A chamber drawn as its hall, from its sourced floor plan: the Tweede
 * Kamer's dome of seats, the Eerste Kamer's two blocks with the chair
 * between them. The hall's top faces outward, so the dome opens to the core.
 */
function Hall({
  shape,
  cell,
  rm,
  mid,
  titleBand,
}: {
  shape: NonNullable<GraphBundle["chamberShapes"]>[string];
  cell: WheelCell;
  rm: number;
  mid: number;
  titleBand: number;
}) {
  const depth = cell.r1 - cell.r0 - titleBand - 8;
  // Width at the hall's middle radius, kept inside the cell's two edges.
  const width = 2 * (rm - depth / 4) * Math.tan((cell.a1 - cell.a0) / 2) - 10;
  // Fitted to the seats only: the hall's box also holds the kabinet bench, which the wheel draws elsewhere.
  const xs = shape.seats.map((seat) => seat[0]);
  const ys = shape.seats.map((seat) => seat[1]);
  const box = { x0: Math.min(...xs) - shape.r, x1: Math.max(...xs) + shape.r, y0: Math.min(...ys) - shape.r, y1: Math.max(...ys) + shape.r };
  const scale = Math.min(width / (box.x1 - box.x0), depth / (box.y1 - box.y0));
  const rotate = ((mid + Math.PI / 2) * 180) / Math.PI;
  return (
    <g
      transform={`translate(${(Math.cos(mid) * rm).toFixed(2)} ${(Math.sin(mid) * rm).toFixed(2)}) rotate(${rotate.toFixed(2)}) scale(${scale.toFixed(4)}) translate(${(-(box.x0 + box.x1) / 2).toFixed(2)} ${(-(box.y0 + box.y1) / 2).toFixed(2)})`}
      pointerEvents="none"
    >
      {shape.seats.map(([x, y, colorIndex, chair], index) => {
        const color = shape.colors[colorIndex] ?? "var(--t-color-line-strong)";
        return <circle key={index} cx={x} cy={y} r={shape.r * (chair ? 1.35 : 1)} fill={color} stroke={chair ? "var(--t-color-ink)" : "none"} strokeWidth={chair ? 0.12 : 0} />;
      })}
    </g>
  );
}
