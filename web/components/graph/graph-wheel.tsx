"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import type { GraphBundle } from "@/lib/graph";
import { branchColorVar } from "@/lib/branch-colors";
import { buildWheel, WHEEL_RADIUS, WHEEL_RINGS, type WheelCell, type WheelItem } from "@/lib/wheel";
import { useSelection } from "@/components/selection/selection-provider";
import { useT } from "@/components/i18n/use-t";

const TITLE = 12.5;
const ITEM = 10;
const LINE_TITLE = 15;
const LINE_ITEM = 12.5;
const CHAR = 0.56;
const PAD = 6;

type Line = { y: number; title?: string; size?: number; items?: WheelItem[]; more?: number };

/** The smallest a title may shrink to before it is cut instead. */
const TITLE_MIN = 9.5;

/** Where a cell's text goes: along the ring when the cell is wide, along the radius when it is narrow. */
function textFrame(cell: WheelCell) {
  const mid = (cell.a0 + cell.a1) / 2;
  const rm = (cell.r0 + cell.r1) / 2;
  const depth = cell.r1 - cell.r0;
  const half = (cell.a1 - cell.a0) / 2;
  const arcInner = (cell.a1 - cell.a0) * (cell.r0 + PAD);
  const tangential = arcInner >= depth * 1.05;
  const flip = tangential ? Math.sin(mid) > 0.05 : Math.cos(mid) < 0;
  const rotate = tangential ? (flip ? mid - Math.PI / 2 : mid + Math.PI / 2) : flip ? mid + Math.PI : mid;
  /**
   * How wide a line may be at local height `y` (its baseline): a straight
   * line along a curved band must stay inside the outer arc and between the
   * cell's two edges, so it is shorter near the rim.
   */
  const widthAt = (y: number, size: number): number => {
    if (!tangential) return depth - 2 * PAD;
    // Radial distance of the glyph's top and bottom from the centre.
    const top = y - size * 0.8;
    const bottom = y + size * 0.2;
    const radius = (value: number) => (flip ? rm + value : rm - value);
    const far = Math.max(radius(top), radius(bottom));
    const near = Math.min(radius(top), radius(bottom));
    const outer = cell.r1 - 3;
    if (far >= outer || near <= cell.r0 + 2) return 0;
    const byArc = Math.sqrt(outer * outer - far * far);
    const byEdge = near * Math.tan(half) - 5;
    return Math.max(0, 2 * Math.min(byArc, byEdge) - 4);
  };
  return {
    x: Math.cos(mid) * rm,
    y: Math.sin(mid) * rm,
    rotate: (rotate * 180) / Math.PI,
    /** Room across the lines. */
    height: (tangential ? depth : (cell.a1 - cell.a0) * cell.r0) - 2 * PAD,
    widthAt,
    tangential,
  };
}

const textWidth = (text: string, size: number) => text.length * size * CHAR;
function clip(text: string, size: number, width: number): string {
  const max = Math.max(1, Math.floor(width / (size * CHAR)));
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

/** Split a title over two lines at the space nearest its middle. */
function wrapTitle(text: string): [string, string] | null {
  const spaces = [...text.matchAll(/ /g)].map((match) => match.index ?? 0);
  if (spaces.length === 0) return null;
  const at = spaces.reduce((best, index) => (Math.abs(index - text.length / 2) < Math.abs(best - text.length / 2) ? index : best), spaces[0]);
  return [text.slice(0, at), text.slice(at + 1)];
}

/**
 * The title (on one line, or two when it does not fit), then as many lines of
 * names as fit, the last ending in "+n" when some do not. Lines are laid out
 * from the top of the cell's text area; `start` moves the block down.
 */
function packLines(cell: WheelCell, frame: ReturnType<typeof textFrame>, start: number, reserve: number): Line[] {
  const lines: Line[] = [];
  let y = start;
  const bottom = -frame.height / 2 + frame.height - reserve;
  const title = cell.count !== null ? `${cell.title} · ${cell.count}` : cell.title;
  const fitsAt = (text: string, size: number, at: number) => textWidth(text, size) <= frame.widthAt(at, size);
  // A title that almost fits shrinks a little rather than being cut or split.
  const shrink = (text: string) => Math.min(TITLE, frame.widthAt(y, TITLE) / (text.length * CHAR));
  if (fitsAt(title, TITLE, y)) {
    lines.push({ y, title });
    y += LINE_TITLE;
  } else if (!frame.tangential && shrink(title) >= TITLE_MIN) {
    lines.push({ y, title, size: shrink(title) });
    y += LINE_TITLE;
  } else if (!frame.tangential && shrink(cell.title) >= TITLE_MIN) {
    lines.push({ y, title: cell.title, size: shrink(cell.title) });
    y += LINE_TITLE;
  } else {
    const parts = wrapTitle(cell.title);
    const second = parts ? (cell.count !== null ? `${parts[1]} · ${cell.count}` : parts[1]) : null;
    if (parts && second && fitsAt(parts[0], TITLE, y) && fitsAt(second, TITLE, y + LINE_TITLE) && y + LINE_TITLE <= bottom) {
      lines.push({ y, title: parts[0] });
      lines.push({ y: y + LINE_TITLE, title: second });
      y += 2 * LINE_TITLE;
    } else {
      lines.push({ y, title: clip(cell.title, TITLE, Math.max(frame.widthAt(y, TITLE), TITLE)) });
      y += LINE_TITLE;
    }
  }
  const sep = " · ";
  let index = 0;
  while (index < cell.items.length && y - LINE_ITEM + LINE_ITEM <= bottom + 0.01) {
    const width = frame.widthAt(y, ITEM);
    if (width < ITEM * CHAR * 3) break;
    const line: WheelItem[] = [];
    let used = 0;
    while (index < cell.items.length) {
      const item = cell.items[index];
      const add = (line.length ? sep.length : 0) + item.label.length;
      if (line.length > 0 && (used + add) * ITEM * CHAR > width) break;
      if (line.length === 0 && item.label.length * ITEM * CHAR > width) {
        line.push({ ...item, label: clip(item.label, ITEM, width) });
        index += 1;
        break;
      }
      line.push(item);
      used += add;
      index += 1;
    }
    lines.push({ y, items: line });
    y += LINE_ITEM;
  }
  const rest = cell.items.length - index;
  if (rest > 0) {
    const last = lines[lines.length - 1];
    if (last.items) {
      last.more = rest;
      const width = frame.widthAt(last.y, ITEM);
      while (last.items.length > 1 && textWidth(`${last.items.map((entry) => entry.label).join(sep)} +${last.more}`, ITEM) > width) {
        last.items.pop();
        last.more += 1;
      }
    }
  }
  return lines;
}

/** Lines centred in the cell: packed once from the top, then again from where a centred block of that size starts. */
function layoutLines(cell: WheelCell, frame: ReturnType<typeof textFrame>, reserve = 0): Line[] {
  const top = -frame.height / 2 + TITLE * 0.85;
  const first = packLines(cell, frame, top, reserve);
  const used = first[first.length - 1].y - first[0].y + LINE_ITEM;
  const slack = frame.height - reserve - used - TITLE * 0.2;
  if (slack <= 2) return first;
  const centred = packLines(cell, frame, top + slack / 2, reserve);
  const shown = (lines: Line[]) => lines.reduce((sum, line) => sum + (line.items?.length ?? 0), 0);
  return shown(centred) >= shown(first) ? centred : first;
}

function segment(r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)}A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
}

function arcPath(r: number, a0: number, a1: number): string {
  const p = (a: number) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  return `M${p(a0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
}

/**
 * The wheel form of the graph (lib/wheel.ts): labelled cells from the
 * Grondwet out to the voters. A cell picks its body, sector or group; a name
 * inside it picks that body. Scroll to zoom, drag to pan.
 */
export function GraphWheel({ bundle }: { bundle: GraphBundle }) {
  const t = useT("graph");
  const { current, select } = useSelection();
  const model = useMemo(() => buildWheel(bundle), [bundle]);
  const [hot, setHot] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const selectedId = current && "id" in current ? current.id : null;
  const pick = (cell: WheelCell) => {
    if (!cell.pick || drag.current?.moved) return;
    select({ kind: cell.pick.kind, id: cell.pick.id, surface: "graph" } as Parameters<typeof select>[0]);
  };
  const pickItem = (id: string) => {
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
      const k = Math.min(4, Math.max(1, current.k * factor));
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
            return <path key={index} id={`wheel-frame-${index}`} d={arcPath((f0 + f1) / 2 - 3.5, a - 0.5, a + 0.5)} />;
          })}
          {model.wedges.map((wedge) => (
            <path key={wedge.id} id={`wheel-wedge-${wedge.id}`} d={arcPath(WHEEL_RINGS.national[2][1] + 4.5, wedge.a0, wedge.a1)} />
          ))}
        </defs>
        <g transform={`translate(${view.x.toFixed(2)} ${view.y.toFixed(2)}) scale(${view.k.toFixed(3)})`}>
          {/* The voters as the frame. */}
          <circle r={(f0 + f1) / 2} fill="none" stroke="var(--t-color-sector-regering)" strokeOpacity={0.55} strokeWidth={f1 - f0} />
          {[0, 1, 2, 3].map((index) => (
            <text key={index} fontSize={11} letterSpacing={3} fontWeight={700} fill="var(--t-color-ink)" opacity={0.85}>
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

          {model.cells.map((cell) => {
            const color = branchColorVar(cell.branch);
            const selected = selectedId !== null && (cell.pick?.id === selectedId || cell.id === selectedId);
            const containsSelected = selectedId !== null && cell.items.some((entry) => entry.id === selectedId);
            const frame = textFrame(cell);
            const seatRows = cell.seats ? Math.max(4, Math.ceil(Math.sqrt((cell.count ?? 0) / 1.6))) : 0;
            const reserve = cell.seats ? frame.height * 0.62 : 0;
            const lines = layoutLines(cell, frame, reserve);
            const seatTop = lines[lines.length - 1].y + TITLE * 0.6;
            return (
              <g
                key={cell.id}
                onPointerEnter={() => setHot(cell.id)}
                onPointerLeave={() => setHot((current) => (current === cell.id ? null : current))}
                className={cell.pick ? "cursor-pointer" : undefined}
              >
                <title>{[cell.count !== null ? `${cell.title}: ${cell.count}` : cell.title, ...cell.items.slice(0, 12).map((entry) => entry.name)].join("\n")}</title>
                <path
                  d={segment(cell.r0, cell.r1, cell.a0, cell.a1)}
                  fill={color}
                  fillOpacity={selected ? 0.42 : hot === cell.id || containsSelected ? 0.3 : 0.16}
                  stroke={selected ? "var(--t-color-accent)" : color}
                  strokeOpacity={selected ? 1 : 0.55}
                  strokeWidth={selected ? 2 : 1}
                  onClick={() => pick(cell)}
                />
                <g transform={`translate(${frame.x.toFixed(2)} ${frame.y.toFixed(2)}) rotate(${frame.rotate.toFixed(2)})`} pointerEvents="none">
                  {lines.map((line, index) => {
                    const at = line.y;
                    if (line.title) {
                      return (
                        <text key={`title-${index}`} y={at} textAnchor="middle" fontSize={line.size ?? TITLE} fontWeight={700} fill="var(--t-color-ink)">
                          {line.title}
                        </text>
                      );
                    }
                    return (
                      <text key={index} y={at} textAnchor="middle" fontSize={ITEM} fill="var(--t-color-ink-muted)">
                        {(line.items ?? []).map((entry, position) => (
                          <tspan
                            key={entry.id}
                            pointerEvents="auto"
                            className="cursor-pointer hover:underline"
                            fill={entry.id === selectedId ? "var(--t-color-accent-text)" : undefined}
                            fontWeight={entry.id === selectedId ? 700 : undefined}
                            onClick={(event) => {
                              event.stopPropagation();
                              pickItem(entry.id);
                            }}
                          >
                            {position > 0 ? " · " : ""}
                            {entry.label}
                            <title>{entry.name}</title>
                          </tspan>
                        ))}
                        {line.more ? <tspan fill="var(--t-color-ink-faint)">{`${line.items?.length ? " " : ""}+${line.more}`}</tspan> : null}
                      </text>
                    );
                  })}
                  {cell.seats ? (
                    <Seats cell={cell} rows={seatRows} width={frame.widthAt(seatTop + reserve * 0.5, 0) * 0.9} top={seatTop} height={reserve - 4} />
                  ) : null}
                </g>
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

/** A chamber's seats as a small grid of squares in fractie colours, largest fractie first. */
function Seats({ cell, rows, width, top, height }: { cell: WheelCell; rows: number; width: number; top: number; height: number }) {
  const total = cell.count ?? 0;
  if (!cell.seats || total === 0) return null;
  const cols = Math.ceil(total / rows);
  const pitch = Math.min(width / cols, height / rows);
  const x0 = (-cols * pitch) / 2;
  const squares: { x: number; y: number; color: string }[] = [];
  let index = 0;
  for (const block of cell.seats) {
    for (let seat = 0; seat < block.seats; seat += 1) {
      const col = Math.floor(index / rows);
      const row = index % rows;
      squares.push({ x: x0 + col * pitch, y: top + row * pitch, color: block.color ?? "var(--t-color-line-strong)" });
      index += 1;
    }
  }
  return (
    <g>
      {squares.map((square, position) => (
        <rect key={position} x={square.x + pitch * 0.1} y={square.y + pitch * 0.1} width={pitch * 0.8} height={pitch * 0.8} rx={pitch * 0.15} fill={square.color} />
      ))}
    </g>
  );
}
