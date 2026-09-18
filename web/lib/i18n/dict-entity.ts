import type { LocString } from "./locales";

/** Owned by the entity pages area (organizations, people, positions). */
export const ENTITY_DICT = {
  electedBy: { nl: "Gekozen door", en: "Elected by" },
  appoints: { nl: "Benoemt", en: "Appoints" },
  advisedBy: { nl: "Geadviseerd door", en: "Advised by" },
  whosConnected: { nl: "Wie is verbonden?", en: "Who is connected?" },
} as const satisfies Record<string, LocString>;
