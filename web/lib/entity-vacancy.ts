import { getDataset } from "./data";
import type { Change, SourceRef } from "./types";

export type Vacancy = {
  date: string;
  /** "1 vacante zetel (4 van 5 zetels vervuld)", in both languages. */
  label: { nl: string; en: string };
  source: SourceRef;
};

function english(label: string): string {
  return label
    .replace(/(\d+) van (\d+) zetels? vervuld/, "$1 of $2 seats filled")
    .replace(/(\d+) vacante zetels/, "$1 vacant seats")
    .replace(/(\d+) vacante zetel/, "$1 vacant seat");
}

/** The latest vacancy the changes record for a position, or null. A vacancy is only ever what a source says. */
export function vacancyForPosition(positionId: string): Vacancy | null {
  let latest: Change | null = null;
  for (const change of getDataset().changes) {
    if (change.kind !== "vacancy" || change.position !== positionId) continue;
    if (latest === null || change.date > latest.date) latest = change;
  }
  if (latest === null) return null;
  const parts = [latest.in?.label, latest.out?.label].filter((part): part is string => typeof part === "string" && part !== "");
  if (parts.length === 0) return null;
  const nl = parts.length > 1 ? `${parts[0]} (${parts[1]})` : parts[0];
  return { date: latest.date, label: { nl, en: parts.length > 1 ? `${english(parts[0])} (${english(parts[1])})` : english(parts[0]) }, source: latest.source };
}
