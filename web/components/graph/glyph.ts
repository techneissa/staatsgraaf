import type { GlyphClass } from "@/lib/graph";

function n(value: number): number {
  return Math.round(value * 100) / 100;
}

function circle(r: number): string {
  return `M ${n(-r)} 0 a ${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0 a ${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0 Z`;
}

function capsule(r: number, halfHeight: number): string {
  const h = halfHeight;
  return (
    `M ${n(-r + h)} ${n(-h)} L ${n(r - h)} ${n(-h)} ` +
    `A ${n(h)} ${n(h)} 0 0 1 ${n(r - h)} ${n(h)} L ${n(-r + h)} ${n(h)} ` +
    `A ${n(h)} ${n(h)} 0 0 1 ${n(-r + h)} ${n(-h)} Z`
  );
}

export function glyphPath(glyph: GlyphClass, radius: number): string {
  const r = radius;
  switch (glyph) {
    case "dot":
      return circle(r);
    case "small-dot":
      return circle(r * 0.68);
    case "diamond":
      return `M 0 ${n(-r)} L ${n(r)} 0 L 0 ${n(r)} L ${n(-r)} 0 Z`;
    case "triangle":
      return `M 0 ${n(-r)} L ${n(r)} ${n(r)} L ${n(-r)} ${n(r)} Z`;
    case "shield":
      return (
        `M ${n(-r)} ${n(-r)} L ${n(r)} ${n(-r)} L ${n(r)} ${n(0.1 * r)} ` +
        `Q ${n(r)} ${n(r)} 0 ${n(r)} Q ${n(-r)} ${n(r)} ${n(-r)} ${n(0.1 * r)} Z`
      );
    case "hex": {
      const hr = r * 0.87;
      return (
        `M ${n(r)} 0 L ${n(r / 2)} ${n(hr)} L ${n(-r / 2)} ${n(hr)} ` +
        `L ${n(-r)} 0 L ${n(-r / 2)} ${n(-hr)} L ${n(r / 2)} ${n(-hr)} Z`
      );
    }
    case "capsule":
      return capsule(r, r * 0.6);
    case "seat":
      return capsule(r, r * 0.38);
  }
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
