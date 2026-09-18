import type { LocString } from "./locales";

/** Owned by the power map area. Extend with power-map-specific strings only. */
export const POWER_DICT = {
  powerMapTitle: { nl: "Machtskaart: wie is in het nieuws", en: "Power map: who is in the news" },
} as const satisfies Record<string, LocString>;
