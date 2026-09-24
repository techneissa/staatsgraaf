/**
 * Line styles for relationship types, shared by the graph canvas and the
 * legend dropdown so both always show the same style per type. Every edge in
 * the data is directed (from maker to receiver), so the legend draws an
 * arrowhead for every type; the canvas itself only draws arrowheads on the
 * highlighted edges of a selection to keep the base layer cheap.
 */
export type EdgeLine = {
  /** Raw CSS colour value, always a design token variable. */
  color: string;
  /** SVG stroke width on the graph scale. */
  width: number;
  /** Opacity of the line at rest, before the selection dims or lights it. */
  opacity: number;
};

/*
 * Every edge is a solid line (owner request 25-09-2026: dashes made the graph
 * hard to read). Types differ by colour family, width and opacity only, and
 * the palette stays calm: thin, low-contrast lines at rest. The selection's
 * own relations are drawn on top in the accent colour by the canvas.
 *
 * Families: structure (part of, composition, succession) in the faint line
 * colour; supervision and accountability in muted ink; appointment and
 * election in the accent text colour; advice in the violet sector tint;
 * money and execution in the teal sector tint.
 */
const LINE = "var(--color-line-strong)";
const MUTED = "var(--color-ink-muted)";
const ACCENT = "var(--color-accent-text)";
const ADVICE = "var(--color-sector-hoge-colleges)";
const MONEY = "var(--color-sector-waterschap)";

export const DEFAULT_EDGE_LINE: EdgeLine = { color: LINE, width: 0.75, opacity: 1 };

/**
 * The eight types currently in data/relations.json, in their order of
 * presence, followed by types the model supports so a new relation style
 * exists the day the data gains one.
 */
export const EDGE_TYPE_ORDER: string[] = [
  "ex_officio",
  "consists_of",
  "oversees",
  "dept_head",
  "office",
  "part_of",
  "advises",
  "elects",
  "appoints",
  "confirms",
  "administers",
  "subsidises",
  "accountable_to",
  "succeeded_by",
  "joint_arrangement_member",
];

export const EDGE_TYPE_STYLE: Record<string, EdgeLine> = {
  consists_of: { color: LINE, width: 0.6, opacity: 0.8 },
  part_of: { color: LINE, width: 0.6, opacity: 0.8 },
  joint_arrangement_member: { color: LINE, width: 0.6, opacity: 0.7 },
  succeeded_by: { color: LINE, width: 0.9, opacity: 0.8 },
  oversees: { color: MUTED, width: 0.75, opacity: 0.7 },
  accountable_to: { color: MUTED, width: 0.6, opacity: 0.6 },
  office: { color: MUTED, width: 0.6, opacity: 0.6 },
  ex_officio: { color: MUTED, width: 0.6, opacity: 0.5 },
  dept_head: { color: ACCENT, width: 1.1, opacity: 0.8 },
  appoints: { color: ACCENT, width: 0.75, opacity: 0.6 },
  elects: { color: ACCENT, width: 0.9, opacity: 0.45 },
  confirms: { color: ACCENT, width: 0.6, opacity: 0.45 },
  advises: { color: ADVICE, width: 0.75, opacity: 0.7 },
  administers: { color: MONEY, width: 0.6, opacity: 0.6 },
  subsidises: { color: MONEY, width: 0.9, opacity: 0.7 },
};

export function edgeLine(type: string): EdgeLine {
  return EDGE_TYPE_STYLE[type] ?? DEFAULT_EDGE_LINE;
}

export function edgeTypeOrderIndex(type: string): number {
  const index = EDGE_TYPE_ORDER.indexOf(type);
  return index === -1 ? EDGE_TYPE_ORDER.length : index;
}
