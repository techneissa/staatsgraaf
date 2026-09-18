import type { SectorInfo } from "@/lib/graph";
import { branchColorVar } from "@/lib/branch-colors";

function n(value: number): number {
  return Math.round(value * 100) / 100;
}

function polar(radius: number, angle: number): { x: number; y: number } {
  return { x: n(Math.cos(angle) * radius), y: n(Math.sin(angle) * radius) };
}

/**
 * Filled annular sector between two radii, drawn clockwise from start to end
 * in SVG coordinates. Gutters remain visible because sector spans exclude them.
 */
export function wedgePath(startAngle: number, endAngle: number, r0: number, r1: number): string {
  const span = endAngle - startAngle;
  if (span <= 0.0005) return "";
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

/**
 * Hidden arc path used by textPath for curved branch labels. For sectors whose
 * mid-angle sits in the lower half of the canvas the arc is reversed so the
 * text reads upright outside the circle. Returns null for spans too small to
 * carry a label (under ~14 degrees).
 */
export function sectorLabelArc(sector: SectorInfo, inset = 4): { id: string; d: string } | null {
  const span = sector.endAngle - sector.startAngle;
  if (span < 0.245) return null;
  const mid = (sector.startAngle + sector.endAngle) / 2;
  const radius = sector.labelRadius - inset;
  const pad = 0.012;
  const from = sector.startAngle + pad;
  const to = sector.endAngle - pad;
  const largeArc = span > Math.PI ? 1 : 0;
  const reversed = Math.sin(mid) > 0.2;
  const s = polar(radius, reversed ? to : from);
  const e = polar(radius, reversed ? from : to);
  const d =
    `M ${s.x} ${s.y} ` +
    `A ${n(radius)} ${n(radius)} 0 ${largeArc} ${reversed ? 0 : 1} ${e.x} ${e.y}`;
  return { id: `sector-arc-${sector.branch}`, d };
}

export function sectorWedge(
  sector: SectorInfo,
  r0: number,
  r1: number,
): { branch: string; d: string; color: string } {
  return {
    branch: sector.branch,
    d: wedgePath(sector.startAngle, sector.endAngle, r0, r1),
    color: branchColorVar(sector.branch),
  };
}
