import { describeRecency, type Recency } from "@/lib/change-clock";
import { CHANGE_WINDOWS, getChangeReferenceDate, getChangeStats, getSnapshotDate } from "@/lib/changes";
import type { NowFigures } from "./now-chips";

export type ChangeFigures = {
  now: NowFigures;
  /** The newest change and its age against the build day; null without changes. */
  recency: Recency | null;
  /** The dataset snapshot date, shown quietly; null when the dataset has none. */
  snapshot: string | null;
  /** The build day every relative figure counts from. */
  reference: string;
};

/** The figures behind the "Nu" chips and the recency line, the same on the home page and on /wijzigingen/. */
export function getChangeFigures(reference = getChangeReferenceDate()): ChangeFigures {
  const stats = getChangeStats(reference);
  return {
    now: { vacantSeats: stats.vacantSeats, actingOfficials: stats.actingOfficials },
    recency: describeRecency(stats.lastChangeDate, reference, CHANGE_WINDOWS),
    snapshot: getSnapshotDate(),
    reference,
  };
}
