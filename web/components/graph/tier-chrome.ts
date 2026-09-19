import type { Bench, SectorInfo, TierInfo } from "@/lib/graph";
import { branchColorVar } from "@/lib/branch-colors";

function n(value: number): number {
  return Math.round(value * 100) / 100;
}

function polar(radius: number, angle: number): { x: number; y: number } {
  return { x: n(Math.cos(angle) * radius), y: n(Math.sin(angle) * radius) };
}

/**
 * Filled annular sector between two radii, drawn clockwise from start to end in
 * SVG coordinates. The gutters stay visible because a sector's span excludes
 * them.
 */
export function wedgePath(startAngle: number, endAngle: number, r0: number, r1: number): string {
  const span = endAngle - startAngle;
  if (span <= 0.0005 || r1 <= r0) return "";
  const largeArc = span > Math.PI ? 1 : 0;
  const a = polar(r0, startAngle);
  const b = polar(r1, startAngle);
  const c = polar(r1, endAngle);
  const d = polar(r0, endAngle);
  return (
    `M ${a.x} ${a.y} L ${b.x} ${b.y} ` +
    `A ${n(r1)} ${n(r1)} 0 ${largeArc} 1 ${c.x} ${c.y} ` +
    `L ${d.x} ${d.y} ` +
    `A ${n(r0)} ${n(r0)} 0 ${largeArc} 0 ${a.x} ${a.y} Z`
  );
}

export function sectorWedge(sector: SectorInfo, pad = 6): { d: string; color: string } {
  return {
    d: wedgePath(sector.startAngle, sector.endAngle, sector.innerRadius - pad, sector.outerRadius + pad),
    color: branchColorVar(sector.branch),
  };
}

/** Full circle at a radius, as a path so it can share the wedge layer. */
export function ringPath(radius: number): string {
  const r = n(radius);
  return `M ${-r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
}

/**
 * The two label lanes inside the gap below a tier: the tier's own name farther
 * in, its sector names just under the tier. Separate lanes are what keeps a
 * long tier name from running into the sector names beside it, whatever the
 * canvas is turned to.
 */
export const TIER_LABEL_INSET = 22;
export const SECTOR_LABEL_INSET = 8;
/** An arc at least this long, so a long tier name is not cut off near the core. */
export const TIER_LABEL_ARC_LENGTH = 340;

/**
 * Hidden arc for a tier label, drawn in the inner lane of the gap below the
 * tier. The arc is reversed for the lower half of the canvas so the text reads
 * upright. `fraction` is how much of the circle the label arc spans.
 */
export function tierLabelArc(tier: TierInfo, atAngle: number): { id: string; d: string } {
  const radius = Math.max(8, tier.innerRadius - TIER_LABEL_INSET);
  // Near the core a fixed fraction of the circle is too short for a long tier
  // name, so the arc is sized by length and only then clamped.
  const fraction = Math.min(1.4, Math.max(0.45, TIER_LABEL_ARC_LENGTH / (Math.PI * radius)));
  const half = Math.PI * fraction;
  const reversed = Math.sin(atAngle) > 0;
  const from = atAngle - half / 2;
  const to = atAngle + half / 2;
  const s = polar(radius, reversed ? to : from);
  const e = polar(radius, reversed ? from : to);
  return {
    id: `tier-arc-${tier.id}`,
    d: `M ${s.x} ${s.y} A ${n(radius)} ${n(radius)} 0 0 ${reversed ? 0 : 1} ${e.x} ${e.y}`,
  };
}

/** Hidden arc for a sector label, in the outer lane of the gap below its tier. */
export function sectorLabelArc(sector: SectorInfo): { id: string; d: string } | null {
  const span = sectorLabelSpan(sector);
  if (span === null) return null;
  const radius = Math.max(8, sector.innerRadius - SECTOR_LABEL_INSET);
  const reversed = Math.sin(sector.midAngle) > 0;
  const s = polar(radius, reversed ? span.to : span.from);
  const e = polar(radius, reversed ? span.from : span.to);
  const large = span.to - span.from > Math.PI ? 1 : 0;
  return {
    id: `sector-arc-${sector.id}`,
    d: `M ${s.x} ${s.y} A ${n(radius)} ${n(radius)} 0 ${large} ${reversed ? 0 : 1} ${e.x} ${e.y}`,
  };
}

/** Sectors narrower than about 13 degrees carry no arc label. */
export function sectorLabelSpan(sector: SectorInfo): { from: number; to: number } | null {
  const span = sector.endAngle - sector.startAngle;
  if (span < 0.23) return null;
  const pad = 0.01;
  return { from: sector.startAngle + pad, to: sector.endAngle - pad };
}

/**
 * Hidden arc for a chamber's name, just outside its seats. Reversed on the
 * lower half of the canvas so the name reads upright whichever way the canvas
 * is turned.
 */
export function benchLabelArc(bench: Bench, inset = 5): { id: string; d: string; radius: number } {
  const radius = bench.outerRadius + inset;
  const reversed = Math.sin(bench.midAngle) > 0;
  const pad = bench.columnAngle / 2;
  const from = bench.startAngle + pad;
  const to = bench.endAngle - pad;
  const s = polar(radius, reversed ? to : from);
  const e = polar(radius, reversed ? from : to);
  const large = to - from > Math.PI ? 1 : 0;
  return {
    id: `bench-arc-${bench.id.replace(/[^a-z0-9]+/gi, "-")}`,
    d: `M ${s.x} ${s.y} A ${n(radius)} ${n(radius)} 0 ${large} ${reversed ? 0 : 1} ${e.x} ${e.y}`,
    radius,
  };
}
