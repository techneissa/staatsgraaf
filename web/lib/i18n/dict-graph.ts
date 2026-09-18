import type { LocString } from "./locales";

/** Owned by the graph canvas area. Extend with graph-specific strings only. */
export const GRAPH_DICT = {
  graphHint: {
    nl: "Netwerk van Nederlandse overheidsorganisaties. Gebruik de pijltjestoetsen om te bladeren, Enter om te openen en Escape om te wissen.",
    en: "Network of Dutch government organizations. Use the arrow keys to browse, Enter to open and Escape to clear.",
  },
} as const satisfies Record<string, LocString>;
