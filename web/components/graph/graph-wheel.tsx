"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { GLYPH_BY_SUBTYPE, type GraphBundle } from "@/lib/graph";
import { branchColorVar } from "@/lib/branch-colors";
import { buildWheel, cellMarks, OPEN_PITCH, REST_PITCH, tieScale, WHEEL_GUTTER, WHEEL_RADIUS, WHEEL_RINGS, WHEEL_VOTERS, wheelLinks, type WheelCell, type WheelGroup, type WheelLinkType } from "@/lib/wheel";
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

/** How long the wheel takes to turn a selection to the bottom. */
const TURN_MS = 700;
const TURN_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/** How each kind of tie is drawn: dashed for the line of parts, an arrow for the rest. */
const LINK_STYLE: Record<WheelLinkType, { dash?: string; arrow: "filled" | "open" | "double" | null }> = {
  elects: { arrow: "double" },
  oversees: { arrow: "filled" },
  advises: { arrow: "open" },
  accountable_to: { arrow: "open" },
  part_of: { dash: "3 3", arrow: null },
};

/** The shortest turn that brings `angle` to the bottom of the wheel, starting from `from`. */
function turnToBottom(from: number, angle: number): number {
  const want = Math.PI / 2 - angle;
  let delta = (want - from) % (2 * Math.PI);
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  return from + delta;
}

/** A small arrowhead at (x, y) pointing along (dx, dy). */
function arrowHead(x: number, y: number, dx: number, dy: number, size: number, double: boolean): string {
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const head = (tipX: number, tipY: number) =>
    `M${(tipX - ux * size - uy * size * 0.55).toFixed(2)} ${(tipY - uy * size + ux * size * 0.55).toFixed(2)}L${tipX.toFixed(2)} ${tipY.toFixed(2)}L${(tipX - ux * size + uy * size * 0.55).toFixed(2)} ${(tipY - uy * size - ux * size * 0.55).toFixed(2)}Z`;
  return double ? head(x, y) + head(x - ux * size * 0.7, y - uy * size * 0.7) : head(x, y);
}

/**
 * A ring segment, its four corners rounded by `round` wheel units and its two
 * sides moved in by `inset` units: a side then runs parallel to the radius
 * it started on, so the gutter between two segments is as wide at the rim as
 * near the core.
 */
function segment(r0: number, r1: number, a0: number, a1: number, round = 0, inset = 0): string {
  const p = (r: number, a: number) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  if (inset > 0 && a1 - a0 < Math.PI * 2 - 1e-6) {
    const at = (r: number) => Math.asin(Math.min(0.95, inset / r));
    return insetSegment(r0, r1, a0, a1, round, at);
  }
  if (round <= 0) {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M${p(r1, a0)}A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
  }
  const k = Math.max(0, Math.min(round, (r1 - r0) / 2 - 0.5));
  const outer = Math.min(k / r1, (a1 - a0) * 0.45);
  const inner = Math.min(k / r0, (a1 - a0) * 0.45);
  const largeOuter = a1 - a0 - 2 * outer > Math.PI ? 1 : 0;
  const largeInner = a1 - a0 - 2 * inner > Math.PI ? 1 : 0;
  return (
    `M${p(r1 - k, a0)}Q${p(r1, a0)} ${p(r1, a0 + outer)}` +
    `A${r1} ${r1} 0 ${largeOuter} 1 ${p(r1, a1 - outer)}Q${p(r1, a1)} ${p(r1 - k, a1)}` +
    `L${p(r0 + k, a1)}Q${p(r0, a1)} ${p(r0, a1 - inner)}` +
    `A${r0} ${r0} 0 ${largeInner} 0 ${p(r0, a0 + inner)}Q${p(r0, a0)} ${p(r0 + k, a0)}Z`
  );
}

/** `segment` with its sides moved in by `shift(r)` radians at radius r. */
function insetSegment(r0: number, r1: number, a0: number, a1: number, round: number, shift: (r: number) => number): string {
  const p = (r: number, a: number) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  const k = Math.max(0, Math.min(round, (r1 - r0) / 2 - 0.5));
  const o0 = a0 + shift(r1);
  const o1 = a1 - shift(r1);
  const i0 = a0 + shift(r0);
  const i1 = a1 - shift(r0);
  // The side points at the rounded corners' ends, on the parallel side lines.
  const s0 = (r: number) => a0 + shift(r);
  const s1 = (r: number) => a1 - shift(r);
  const outer = Math.min(k / r1, (o1 - o0) * 0.45);
  const inner = Math.min(k / r0, (i1 - i0) * 0.45);
  const largeOuter = o1 - o0 - 2 * outer > Math.PI ? 1 : 0;
  const largeInner = i1 - i0 - 2 * inner > Math.PI ? 1 : 0;
  return (
    `M${p(r1 - k, s0(r1 - k))}Q${p(r1, o0)} ${p(r1, o0 + outer)}` +
    `A${r1} ${r1} 0 ${largeOuter} 1 ${p(r1, o1 - outer)}Q${p(r1, o1)} ${p(r1 - k, s1(r1 - k))}` +
    `L${p(r0 + k, s1(r0 + k))}Q${p(r0, i1)} ${p(r0, i1 - inner)}` +
    `A${r0} ${r0} 0 ${largeInner} 0 ${p(r0, i0 + inner)}Q${p(r0, i0)} ${p(r0 + k, s0(r0 + k))}Z`
  );
}

/** Half the gutter between groups, taken off each side of a background. */
const HALF_GUTTER = WHEEL_GUTTER / 2;

/** The part of a cell marks may use: clear of the gutter on both sides (measured at its inner edge) and of the head band. */
function inside(cell: WheelCell, headBand: number): WheelCell {
  const r0 = cell.r0 + headBand;
  const shift = Math.asin(Math.min(0.95, (HALF_GUTTER + 1) / Math.max(r0, 1)));
  return { ...cell, r0, a0: cell.a0 + shift, a1: cell.a1 - shift };
}

/** Corner radius of a group's background, and of a part inside it. */
const GROUP_ROUND = 8;
const PART_ROUND = 5;

/** An arc to set text on; drawn backwards on the lower half so the text reads upright there. */
function arcPath(r: number, a0: number, a1: number, backwards = false): string {
  const p = (a: number) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return backwards ? `M${p(a1)}A${r} ${r} 0 ${large} 0 ${p(a0)}` : `M${p(a0)}A${r} ${r} 0 ${large} 1 ${p(a1)}`;
}

/** A group's name in the lane beside it, outside the background, at a size that fits. */
function groupTitle(group: WheelGroup, turn: number) {
  const mid = (group.a0 + group.a1) / 2;
  const lower = Math.sin(mid + turn) > 0.1;
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
function cellTitle(cell: WheelCell, turn: number) {
  const mid = (cell.a0 + cell.a1) / 2;
  const lower = Math.sin(mid + turn) > 0.1;
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
  const selectedId = current && "id" in current ? current.id : null;
  // The family on the selection's path opens, like a department in the reference; all others stay packed.
  const restModel = useMemo(() => buildWheel(bundle), [bundle]);
  const parentOf = useMemo(() => new Map(bundle.nodes.map((node) => [node.id, node.parent])), [bundle]);
  const openFamily = useMemo(() => {
    let at: string | null | undefined = selectedId;
    for (let step = 0; at && step < 4; step += 1) {
      const family = restModel.familyOf[at];
      if (family) return family;
      at = parentOf.get(at);
    }
    return null;
  }, [selectedId, restModel, parentOf]);
  const model = useMemo(() => (openFamily ? buildWheel(bundle, openFamily) : restModel), [bundle, openFamily, restModel]);
  const [hot, setHot] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; slop: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const groupOf = useMemo(() => {
    const out = new Map<string, WheelGroup>();
    for (const group of model.groups) for (const id of group.cells) out.set(id, group);
    return out;
  }, [model]);
  const placed = useMemo(
    () =>
      model.cells.map((cell) => {
        const group = groupOf.get(cell.id)!;
        // A part names itself inside only when its group has several parts; a group of one is named outside.
        const named = group.cells.length > 1 && cellTitle(cell, 0) !== null;
        const shape = bundle.chamberShapes?.[cell.id] ?? null;
        const headBand = cell.head ? (cell.headBand ?? 0) : 0;
        const pitch = cell.head ? (cell.open ? OPEN_PITCH : REST_PITCH) : MARK_PITCH;
        // Families stay packed beside their head, as the reference packs a department's agencies; every other cell
        // spreads its bodies over its whole area instead of bunching them in the middle.
        const marks = shape
          ? []
          : cellMarks(inside(cell, headBand), cell.items.map((entry) => entry.id), named ? TITLE_BAND : 3, pitch, {
              spread: !cell.head,
              byAngle: cell.byAngle,
            });
        // A body's size follows its ties, in three steps.
        for (const mark of marks) {
          const entry = cell.items.find((candidate) => candidate.id === mark.id);
          if (entry) mark.r *= 0.92 * tieScale(entry.ties);
        }
        // The head of a family sits large at the inner edge, in the middle of its cell.
        if (cell.head) {
          const mid = (cell.a0 + cell.a1) / 2;
          const radius = cell.r0 + headBand / 2 + 2;
          marks.push({ id: cell.head.id, x: Math.cos(mid) * radius, y: Math.sin(mid) * radius, r: (headBand - 6) * 0.42 * tieScale(cell.head.ties, true) });
        }
        const itemById = new Map(cell.items.map((entry) => [entry.id, entry]));
        if (cell.head) itemById.set(cell.head.id, cell.head);
        return { cell, group, named, shape, marks, itemById };
      }),
    [model, groupOf, bundle.chamberShapes],
  );

  /** Where each drawn body sits: its mark, or for a chamber the middle of its hall. */
  const anchors = useMemo(() => {
    const out = new Map<string, { x: number; y: number; r: number; name: string; branch: WheelCell["branch"]; cell: string }>();
    for (const { cell, named, shape, marks, itemById } of placed) {
      if (shape) {
        const mid = (cell.a0 + cell.a1) / 2;
        const rm = (cell.r0 + cell.r1 - (named ? TITLE_BAND : 0)) / 2;
        out.set(cell.id, { x: Math.cos(mid) * rm, y: Math.sin(mid) * rm, r: (cell.r1 - cell.r0) * 0.3, name: cell.title, branch: cell.branch, cell: cell.id });
      }
      for (const mark of marks) {
        const entry = itemById.get(mark.id)!;
        out.set(mark.id, { x: mark.x, y: mark.y, r: mark.r, name: entry.name, branch: entry.branch, cell: cell.id });
      }
    }
    return out;
  }, [placed]);

  const linked = useMemo(() => {
    if (!selectedId) return null;
    const { self, links } = wheelLinks(bundle, selectedId, new Set(anchors.keys()));
    return self && anchors.has(self) ? { self, links } : null;
  }, [bundle, selectedId, anchors]);
  const linkedIds = useMemo(() => new Set(linked ? [linked.self, ...linked.links.map((link) => link.other)] : []), [linked]);

  // Turn the wheel so the selection sits at the bottom, the way the reference does; back upright when nothing is picked.
  const [turn, setTurn] = useState(0);
  const selectedCell = selectedId ? model.cells.find((cell) => cell.pick?.id === selectedId || cell.id === selectedId) : undefined;
  const groupChosen = useMemo(() => {
    const out = new Set<string>();
    if (!selectedId) return out;
    for (const group of model.groups) {
      const cells = model.cells.filter((cell) => cell.group === group.id);
      if (cells.every((cell) => cell.pick?.id === selectedId || cell.id === selectedId)) out.add(group.id);
    }
    return out;
  }, [model, selectedId]);
  const focusAngle = linked
    ? Math.atan2(anchors.get(linked.self)!.y, anchors.get(linked.self)!.x)
    : selectedCell
      ? (selectedCell.a0 + selectedCell.a1) / 2
      : null;
  // Zoomed in, the wheel holds still: turning would carry the picked body out from under the pointer.
  const zoomed = useRef(false);
  zoomed.current = view.k > 1;
  useEffect(() => {
    if (zoomed.current) return;
    setTurn((from) => (focusAngle === null ? from - Math.round(from / (2 * Math.PI)) * 2 * Math.PI : turnToBottom(from, focusAngle)));
  }, [focusAngle]);
  const turnDeg = (turn * 180) / Math.PI;
  const motion = `transform ${TURN_MS}ms ${TURN_EASE}`;

  const groupTitles = useMemo(() => model.groups.map((group) => ({ group, title: groupTitle(group, turn) })), [model, turn]);
  const drawn = useMemo(() => placed.map((entry) => ({ ...entry, title: entry.named ? cellTitle(entry.cell, turn) : null })), [placed, turn]);

  /** The ties of the selection, as curves bent toward the core with an arrow at the end they point to. */
  const linkPaths = useMemo(() => {
    if (!linked) return [];
    const self = anchors.get(linked.self)!;
    const [f0] = WHEEL_RINGS.frame;
    const selfAngle = Math.atan2(self.y, self.x);
    type End = { x: number; y: number; r: number; branch: WheelCell["branch"] };
    // Many ties of one kind into one cell (a provincie's gemeenten, a ministry's zbo's) become one bundle
    // to the middle of those bodies, drawn thicker; the bodies themselves light up.
    const BUNDLE = 12;
    const buckets = new Map<string, { link: (typeof linked.links)[number]; ends: End[] }>();
    for (const link of linked.links) {
      if (link.other === WHEEL_VOTERS) {
        buckets.set(link.other, { link, ends: [{ x: Math.cos(selfAngle) * f0, y: Math.sin(selfAngle) * f0, r: 0, branch: "kiesgerechtigden" as WheelCell["branch"] }] });
        continue;
      }
      const end = anchors.get(link.other);
      if (!end) continue;
      // Ties inside the selection's own cell (an open family) fan out one by one, as in the reference.
      const key = end.cell === self.cell ? `${link.other}|own` : `${end.cell}|${link.type}|${link.outgoing}`;
      const bucket = buckets.get(key) ?? { link, ends: [] };
      bucket.ends.push(end);
      buckets.set(key, bucket);
    }
    const ends: { link: (typeof linked.links)[number]; other: End; weight: number; key: string; own?: boolean }[] = [];
    for (const [key, { link, ends: list }] of buckets) {
      if (list.length >= BUNDLE) {
        const x = list.reduce((sum, end) => sum + end.x, 0) / list.length;
        const y = list.reduce((sum, end) => sum + end.y, 0) / list.length;
        ends.push({ link, other: { x, y, r: 3, branch: list[0].branch }, weight: list.length, key });
      } else {
        list.forEach((end, index) => ends.push({ link, other: end, weight: 1, key: `${key}|${index}`, own: key.endsWith("|own") }));
      }
    }
    return ends.flatMap(({ link, other, weight, key, own }) => {
      const [from, to] = link.outgoing ? [self, other] : [other, self];
      // Bend toward the core, more for far pairs, so ties read as passing through the state rather than across it.
      // Straight for the voters and for a fan inside the open family.
      const bend = link.other === WHEEL_VOTERS || own ? 1 : 0.42;
      const cx = ((from.x + to.x) / 2) * bend;
      const cy = ((from.y + to.y) / 2) * bend;
      const dx = to.x - cx;
      const dy = to.y - cy;
      const length = Math.hypot(dx, dy) || 1;
      const inset = to.r + 2.5;
      const endX = to.x - (dx / length) * inset;
      const endY = to.y - (dy / length) * inset;
      const style = LINK_STYLE[link.type];
      return [
        {
          key,
          width: weight > 1 ? Math.min(4.5, 1.3 + Math.sqrt(weight) * 0.45) : 1.3,
          d: `M${from.x.toFixed(2)} ${from.y.toFixed(2)}Q${cx.toFixed(2)} ${cy.toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}`,
          head: style.arrow ? arrowHead(endX, endY, dx, dy, 5, style.arrow === "double") : null,
          open: style.arrow === "open",
          dash: style.dash,
          color: branchColorVar(from.branch),
        },
      ];
    });
  }, [linked, anchors]);

  const [tip, setTip] = useState<{ name: string; x: number; y: number } | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const showTip = (event: ReactPointerEvent, name: string) => {
    if (event.pointerType !== "mouse") return;
    const box = boxRef.current?.getBoundingClientRect();
    if (box) setTip({ name, x: event.clientX - box.left, y: event.clientY - box.top });
  };
  const selectedName = linked ? anchors.get(linked.self)?.name : selectedCell?.title;
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
    drag.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y, moved: false, slop: event.pointerType === "mouse" ? 5 : 12 };
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const state = drag.current;
    if (!state || view.k === 1) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    // A finger wobbles more than a mouse: only a real drag cancels the tap.
    if (Math.hypot(dx, dy) > state.slop) state.moved = true;
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
    <div ref={boxRef} className="relative h-full w-full">
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
            const lower = Math.sin((wedge.a0 + wedge.a1) / 2 + turn) > 0.1;
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
          <g style={{ transform: `rotate(${turnDeg.toFixed(3)}deg)`, transition: motion }}>
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
            const chosen = groupChosen.has(group.id);
            return (
              <g key={group.id} pointerEvents="none">
                <path
                  d={segment(group.r0, group.r1, group.a0, group.a1, GROUP_ROUND, HALF_GUTTER)}
                  fill={color}
                  fillOpacity={chosen ? 0.24 : lit ? 0.17 : 0.11}
                  stroke={color}
                  strokeOpacity={chosen ? 1 : 0.45}
                  strokeWidth={chosen ? 2 : 1.1}
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
            // A pick that covers the whole group (a sector like Rechtspraak) lights the group's one outline, not every part.
            const selected = selectedId !== null && (cell.pick?.id === selectedId || cell.id === selectedId) && !groupChosen.has(group.id);
            const holdsSelected = selectedId !== null && itemById.has(selectedId);
            const mid = (cell.a0 + cell.a1) / 2;
            const rm = (cell.r0 + cell.r1 - (title ? TITLE_BAND : 0)) / 2;
            const parts = group.cells.length > 1;
            // Parts of a group are set apart by a faint dashed line on the sides they share, not by their own boxes.
            const rimBelow = parts && cell.r0 > group.r0 + 1e-6 ? (cell.r0 + Math.max(...model.cells.filter((other) => other.group === cell.group && other.r1 <= cell.r0).map((other) => other.r1), group.r0)) / 2 : null;
            const sideLine = parts && cell.a0 > group.a0 + 1e-6 ? cell.a0 : null;
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
                  d={segment(cell.r0, cell.r1, cell.a0, cell.a1, parts ? PART_ROUND : GROUP_ROUND, HALF_GUTTER)}
                  fill={color}
                  fillOpacity={selected ? 0.2 : parts && (hot === cell.id || holdsSelected) ? 0.1 : 0}
                  stroke="none"
                  pointerEvents="all"
                  className={cell.pick ? "cursor-pointer" : undefined}
                  onClick={() => pickCell(cell)}
                >
                  <title>{cell.count !== null ? `${cell.title}: ${cell.count}` : cell.title}</title>
                </path>
                {title ? (
                  <text fontSize={title.size} fontWeight={600} fill={color} pointerEvents="none">
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
                  // Every shape faces along its ring, its top toward the rim, and turns with the wheel.
                  const spin = ((Math.atan2(mark.y, mark.x) + Math.PI / 2) * 180) / Math.PI;
                  const linkedMark = linkedIds.has(entry.id);
                  const inOpenFamily = openFamily !== null && model.familyOf[entry.id] === openFamily;
                  const faded = linked !== null && !linkedMark && !inOpenFamily;
                  return (
                    <path
                      key={mark.id}
                      // Drawn at the origin and moved by a transform, so a mark glides when a family opens or closes.
                      style={{ transform: `translate(${mark.x.toFixed(2)}px, ${mark.y.toFixed(2)}px) rotate(${spin.toFixed(3)}deg)`, transition: motion }}
                      d={glyphPathAt(glyph, isSelected ? mark.r * 1.25 : mark.r, 0, 0)}
                      fill={markColor}
                      fillOpacity={isSelected ? 0.95 : linkedMark ? 0.8 : faded ? 0.14 : 0.45}
                      stroke={isSelected ? "var(--t-color-ink)" : markColor}
                      strokeOpacity={faded ? 0.35 : 1}
                      strokeWidth={isSelected ? 1.8 : Math.max(0.6, mark.r * 0.14)}
                      strokeLinejoin="round"
                      aria-label={entry.name}
                      className="cursor-pointer transition-[fill-opacity] hover:[fill-opacity:0.85]"
                      onPointerEnter={(event) => showTip(event, entry.name)}
                      onPointerLeave={() => setTip(null)}
                      onClick={(event) => {
                        event.stopPropagation();
                        pickBody(entry.id);
                      }}
                    />
                  );
                })}
              </g>
            );
          })}
          </g>

          {/* The selection's ties, over everything, turning with the wheel. */}
          <g style={{ transform: `rotate(${turnDeg.toFixed(3)}deg)`, transition: motion }} pointerEvents="none">
            {linkPaths.map((link) => (
              <g key={link.key} className="animate-[sg-fade-in_300ms_ease-out_450ms_both]">
                <path d={link.d} fill="none" stroke={link.color} strokeWidth={link.width} strokeOpacity={0.85} strokeDasharray={link.dash} strokeLinecap="round" />
                {link.head ? (
                  <path
                    d={link.head}
                    fill={link.open ? "var(--t-color-surface)" : link.color}
                    stroke={link.color}
                    strokeWidth={1}
                    strokeLinejoin="round"
                  />
                ) : null}
              </g>
            ))}
          </g>

          {/* The core above the ties, so they pass under the Grondwet instead of over its name. */}
          <circle r={WHEEL_RINGS.core} fill="var(--t-color-surface)" stroke="var(--t-color-sector-regering)" strokeOpacity={0.7} strokeWidth={1.5} />
          <text y={-4} textAnchor="middle" fontSize={15} fontWeight={800} fill="var(--t-color-ink)">
            Grondwet
          </text>
          <text y={13} textAnchor="middle" fontSize={10} fill="var(--t-color-ink-muted)">
            {t("wheelCoreSub")}
          </text>
        </g>
      </svg>
      {tip ? (
        <div
          className="pointer-events-none absolute z-10 max-w-[16rem] -translate-x-1/2 truncate rounded-sm bg-ink px-2 py-0.5 text-xs font-medium text-surface shadow"
          style={{ left: tip.x, top: Math.max(0, tip.y - 30) }}
        >
          {tip.name}
        </div>
      ) : null}
      {selectedName ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-16">
          <span className="truncate rounded-sm border border-line bg-surface/90 px-2 py-0.5 text-sm font-semibold text-ink">
            {selectedName}
            {linked && linked.links.length > 0 ? <span className="ml-1.5 font-normal text-ink-muted">· {t("wheelLinks", { n: linked.links.length })}</span> : null}
          </span>
        </div>
      ) : null}
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
