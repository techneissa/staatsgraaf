import type { LocString } from "./locales";

/** Owned by the home page area. Extend with home-specific strings only. */
export const HOME_DICT = {
  homeTitle: { nl: "De Nederlandse rijksoverheid in kaart", en: "The Dutch national government, mapped" },
} as const satisfies Record<string, LocString>;
