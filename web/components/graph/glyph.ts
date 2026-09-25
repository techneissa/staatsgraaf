import type { GlyphClass } from "@/lib/graph";

function n(value: number): number {
  return Math.round(value * 100) / 100;
}

function circle(r: number, cx = 0, cy = 0): string {
  return `M ${n(cx - r)} ${n(cy)} a ${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0 a ${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0 Z`;
}

function polygon(sides: number, r: number, cx: number, cy: number, start: number): string {
  const parts: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const a = start + (i * 2 * Math.PI) / sides;
    parts.push(`${i === 0 ? "M" : "L"} ${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`);
  }
  return `${parts.join(" ")} Z`;
}

function capsule(r: number, halfHeight: number, cx = 0, cy = 0): string {
  const h = halfHeight;
  return (
    `M ${n(cx - r + h)} ${n(cy - h)} L ${n(cx + r - h)} ${n(cy - h)} ` +
    `A ${n(h)} ${n(h)} 0 0 1 ${n(cx + r - h)} ${n(cy + h)} L ${n(cx - r + h)} ${n(cy + h)} ` +
    `A ${n(h)} ${n(h)} 0 0 1 ${n(cx - r + h)} ${n(cy - h)} Z`
  );
}

/**
 * The outline of a glyph centred on (cx, cy). With the default origin it is
 * the shape for one `<path>` inside a translated group; with an offset it can
 * be joined with hundreds of others into a single path, which is how the
 * canvas draws every mark that is not moving.
 */
export function glyphPathAt(glyph: GlyphClass, radius: number, cx: number, cy: number): string {
  const r = radius;
  switch (glyph) {
    case "dot":
      return circle(r, cx, cy);
    case "small-dot":
      return circle(r * 0.68, cx, cy);
    case "diamond":
      return `M ${n(cx)} ${n(cy - r)} L ${n(cx + r)} ${n(cy)} L ${n(cx)} ${n(cy + r)} L ${n(cx - r)} ${n(cy)} Z`;
    case "triangle":
      return `M ${n(cx)} ${n(cy - r)} L ${n(cx + r)} ${n(cy + r)} L ${n(cx - r)} ${n(cy + r)} Z`;
    case "shield":
      return (
        `M ${n(cx - r)} ${n(cy - r)} L ${n(cx + r)} ${n(cy - r)} L ${n(cx + r)} ${n(cy + 0.1 * r)} ` +
        `Q ${n(cx + r)} ${n(cy + r)} ${n(cx)} ${n(cy + r)} Q ${n(cx - r)} ${n(cy + r)} ${n(cx - r)} ${n(cy + 0.1 * r)} Z`
      );
    case "hex": {
      const hr = r * 0.87;
      return (
        `M ${n(cx + r)} ${n(cy)} L ${n(cx + r / 2)} ${n(cy + hr)} L ${n(cx - r / 2)} ${n(cy + hr)} ` +
        `L ${n(cx - r)} ${n(cy)} L ${n(cx - r / 2)} ${n(cy - hr)} L ${n(cx + r / 2)} ${n(cy - hr)} Z`
      );
    }
    case "capsule":
      return capsule(r, r * 0.6, cx, cy);
    case "square": {
      const h = r * 0.86;
      return `M ${n(cx - h)} ${n(cy - h)} L ${n(cx + h)} ${n(cy - h)} L ${n(cx + h)} ${n(cy + h)} L ${n(cx - h)} ${n(cy + h)} Z`;
    }
    case "pentagon":
      return polygon(5, r, cx, cy, -Math.PI / 2);
    case "octagon":
      return polygon(8, r, cx, cy, Math.PI / 8);
    case "triangle-down":
      return `M ${n(cx - r)} ${n(cy - r * 0.85)} L ${n(cx + r)} ${n(cy - r * 0.85)} L ${n(cx)} ${n(cy + r)} Z`;
    case "star": {
      const parts: string[] = [];
      for (let i = 0; i < 10; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const radius = i % 2 === 0 ? r : r * 0.45;
        parts.push(`${i === 0 ? "M" : "L"} ${n(cx + Math.cos(a) * radius)} ${n(cy + Math.sin(a) * radius)}`);
      }
      return `${parts.join(" ")} Z`;
    }
    case "seat":
      return capsule(r, r * 0.38, cx, cy);
  }
}

export function glyphPath(glyph: GlyphClass, radius: number): string {
  return glyphPathAt(glyph, radius, 0, 0);
}

/** The orbit marks a collapsed body carries, fanned outward from the centre, as path data. */
export function orbitDotsAt(count: number, radius: number, cx: number, cy: number, outward: number): string {
  if (count <= 0) return "";
  const fan = (36 * Math.PI) / 180;
  const distance = radius + 2.4;
  const parts: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = outward + (index - (count - 1) / 2) * fan;
    parts.push(circle(1.1, cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance));
  }
  return parts.join(" ");
}

/**
 * Jagged sun-burst for the graph hub, in the spirit of the reference product's
 * hub mark. Alternate long and short spikes so the shape does not read as a
 * plain star.
 */
export function hubBurstPath(radius: number, spikes = 14): string {
  const inner = radius * 0.82;
  const steps = spikes * 2;
  const points: string[] = [];
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const peak = i % 4 === 0 ? radius : radius * 0.88;
    const r = i % 2 === 0 ? peak : inner;
    points.push(`${n(Math.cos(angle) * r)} ${n(Math.sin(angle) * r)}`);
  }
  return `M ${points[0]} L ${points.slice(1).join(" L ")} Z`;
}
