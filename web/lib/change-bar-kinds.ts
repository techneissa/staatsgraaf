/** The kinds a histogram bar stacks. Everything that is not a person or seat change is "other". */
export type BarKind = "appointment" | "departure" | "vacancy" | "other";

export const BAR_KINDS: readonly BarKind[] = ["appointment", "departure", "vacancy", "other"];

export type HistogramBucket = {
  date: string;
  count: number;
  byKind: Record<BarKind, number>;
  /** Up to three names (people, or the position for a vacancy) for the tooltip. */
  names: string[];
  /** How many further names the day holds. */
  more: number;
};
