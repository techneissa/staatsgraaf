/** The kinds a day's cluster stacks. Everything that is not a person or seat change is "other". */
export type BarKind = "appointment" | "acting" | "departure" | "vacancy" | "other";

export const BAR_KINDS: readonly BarKind[] = ["appointment", "acting", "departure", "vacancy", "other"];

export type HistogramBucket = {
  date: string;
  /** Entries on the day: one person's changes in one role count once, so a bulk import is one mark per person. */
  count: number;
  /** The changes behind those entries; what the text says. */
  changes: number;
  /** How many different people the day's changes are about. */
  people: number;
  /** Entries per kind; how many dots of each colour. */
  byKind: Record<BarKind, number>;
  /** Changes per kind; what the tooltip says. */
  changesByKind: Record<BarKind, number>;
  /** Up to three names (people, or the position for a vacancy) for the tooltip. */
  names: string[];
  /** How many further names the day holds. */
  more: number;
};
