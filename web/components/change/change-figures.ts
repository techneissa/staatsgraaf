import {
  changeAgeDays,
  getChangeReferenceDate,
  getChangeStats,
  getTimeline,
  getWindowedChanges,
} from "@/lib/changes";
import type { ChangeTileFigures } from "./stat-tiles";

/** The appointments tile counts this many days back from the reference day. */
export const APPOINTMENT_DAYS = 30;

/**
 * The figures behind the change tiles, from the same functions on the home
 * page and on /wijzigingen/, so both show the same numbers.
 */
export function getChangeTileFigures(reference = getChangeReferenceDate()): ChangeTileFigures {
  const stats = getChangeStats(reference);
  const period = getWindowedChanges(APPOINTMENT_DAYS, reference);
  return {
    vacantSeats: stats.vacantSeats,
    actingOfficials: stats.actingOfficials,
    lastChangeDate: stats.lastChangeDate,
    lastChangeAge: changeAgeDays(stats.lastChangeDate, reference),
    appointments: {
      count: period.filter((change) => change.kind === "appointment").length,
      days: APPOINTMENT_DAYS,
      since: getTimeline(period, APPOINTMENT_DAYS, reference)[0]?.date ?? reference,
      until: reference,
    },
  };
}
