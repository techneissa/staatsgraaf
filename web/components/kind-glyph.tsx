import type { PeekKind } from "@/lib/peek";

/**
 * A small shape per entity kind, filled with the kind colour: a disc for a
 * person, a square for an organisation, a diamond for a position, a triangle
 * for a topic and a pin for a place. The shape carries the kind for readers
 * who cannot tell the colours apart. Decorative: the kind is also named in
 * text wherever it matters (the peek popover, the kind labels).
 */
export function KindGlyph({ kind, size = 8, className = "" }: { kind: PeekKind; size?: number; className?: string }) {
  const fill = `var(--kind-${kind})`;
  let shape;
  switch (kind) {
    case "person":
      shape = <circle cx="5" cy="5" r="4" />;
      break;
    case "organization":
      shape = <rect x="1.25" y="1.25" width="7.5" height="7.5" rx="1.5" />;
      break;
    case "position":
      shape = <path d="M5 0.6 9.4 5 5 9.4 0.6 5Z" />;
      break;
    case "topic":
      shape = <path d="M5 1 9.2 8.8H0.8Z" />;
      break;
    case "place":
      shape = <path d="M5 0.6a3.6 3.6 0 0 1 3.6 3.6C8.6 6.8 5 9.6 5 9.6S1.4 6.8 1.4 4.2A3.6 3.6 0 0 1 5 0.6Z" />;
      break;
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 10"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`.trim()}
      style={{ fill }}
    >
      {shape}
    </svg>
  );
}
