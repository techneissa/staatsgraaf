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
  /** SVG stroke dasharray, or null for a solid line. */
  dash: string | null;
  /** SVG stroke width on the graph scale. */
  width: number;
};

const LINE = "var(--color-line-strong)";
const MUTED = "var(--color-ink-muted)";
const ACCENT = "var(--color-accent-text)";

export const DEFAULT_EDGE_LINE: EdgeLine = { color: LINE, dash: null, width: 0.75 };

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
  oversees: { color: LINE, dash: null, width: 0.75 },
  consists_of: { color: LINE, dash: "1 3", width: 0.75 },
  ex_officio: { color: MUTED, dash: "2 3", width: 0.75 },
  dept_head: { color: ACCENT, dash: null, width: 1.1 },
  office: { color: MUTED, dash: null, width: 0.75 },
  part_of: { color: MUTED, dash: "1 3", width: 0.75 },
  advises: { color: ACCENT, dash: "2 3", width: 0.75 },
  elects: { color: MUTED, dash: "6 3", width: 0.75 },
  appoints: { color: ACCENT, dash: "4 3", width: 0.75 },
  confirms: { color: MUTED, dash: "4 3", width: 0.75 },
  administers: { color: LINE, dash: "1 2", width: 0.75 },
  subsidises: { color: ACCENT, dash: "4 2", width: 0.75 },
  accountable_to: { color: MUTED, dash: "3 3", width: 0.75 },
  succeeded_by: { color: LINE, dash: "6 2", width: 0.75 },
  joint_arrangement_member: { color: LINE, dash: "2 2", width: 0.75 },
};

export function edgeLine(type: string): EdgeLine {
  return EDGE_TYPE_STYLE[type] ?? DEFAULT_EDGE_LINE;
}

export function edgeTypeOrderIndex(type: string): number {
  const index = EDGE_TYPE_ORDER.indexOf(type);
  return index === -1 ? EDGE_TYPE_ORDER.length : index;
}
