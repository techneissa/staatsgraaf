import type { LocString } from "./locales";

/** Owned by the news, topics and budget pages area. */
export const NEWS_DICT = {
  mediaTitle: { nl: "Media", en: "Media" },
  whosConnected: { nl: "Wie is verbonden?", en: "Who is connected?" },
} as const satisfies Record<string, LocString>;
