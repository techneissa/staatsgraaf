import { NEWS_LANGUAGES, PUBLISHER_KINDS } from "./news-meta";
import type { NewsLanguage, PublisherKind } from "./types";

/**
 * The news filters as they live in the address (NW-8): `?taal=&soort=&bron=&entity=&alles=1`.
 * The Dutch and the English route use the same keys, so a link between the twins keeps
 * the filters. Pure and data-free: the explorer and the day archives read and write
 * the address with it, so Back restores the filters and a filtered list can be shared.
 */
export type NewsFilterState = {
  /** Original language of the items; "all" shows every language. */
  language: "all" | NewsLanguage;
  kind: "all" | PublisherKind;
  /** An outlet name, or null for all outlets. */
  publisher: string | null;
  /** One mentioned entity (person:, org:, pos: or topic: id), or null. */
  entity: string | null;
  /** True when the items that name nothing in the dataset are shown too (docs/adr/0021). */
  showAll: boolean;
};

export const DEFAULT_NEWS_FILTERS: NewsFilterState = {
  language: "all",
  kind: "all",
  publisher: null,
  entity: null,
  showAll: false,
};

const KEYS = ["taal", "soort", "bron", "entity", "alles"] as const;
const ENTITY_ID = /^(?:org|pos|person|topic):[a-z0-9][a-z0-9._-]{0,119}$/i;
const PUBLISHER_MAX = 80;

export function parseNewsFilters(search: string): NewsFilterState {
  const params = new URLSearchParams(search);
  const language = params.get("taal");
  const kind = params.get("soort");
  const publisher = params.get("bron")?.trim() ?? "";
  const entity = params.get("entity") ?? "";
  const all = params.get("alles");
  return {
    language: NEWS_LANGUAGES.includes(language as NewsLanguage) ? (language as NewsLanguage) : "all",
    kind: PUBLISHER_KINDS.includes(kind as PublisherKind) ? (kind as PublisherKind) : "all",
    publisher: publisher !== "" && publisher.length <= PUBLISHER_MAX && !/[\u0000-\u001f]/.test(publisher) ? publisher : null,
    entity: ENTITY_ID.test(entity) ? entity : null,
    showAll: all === "1" || all === "true",
  };
}

/**
 * The query string for `state`, keeping every parameter this module does not own.
 * Defaults write nothing, so the plain address stays plain. Returns "" or "?...".
 */
export function writeNewsFilters(search: string, state: NewsFilterState): string {
  const params = new URLSearchParams(search);
  for (const key of KEYS) params.delete(key);
  if (state.language !== "all") params.set("taal", state.language);
  if (state.kind !== "all") params.set("soort", state.kind);
  if (state.publisher !== null) params.set("bron", state.publisher);
  if (state.entity !== null) params.set("entity", state.entity);
  if (state.showAll) params.set("alles", "1");
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}

export function sameNewsFilters(a: NewsFilterState, b: NewsFilterState): boolean {
  return (
    a.language === b.language &&
    a.kind === b.kind &&
    a.publisher === b.publisher &&
    a.entity === b.entity &&
    a.showAll === b.showAll
  );
}

/** The news list filtered on one entity: where "news items" links from a peek or an entity page go (NW-9). */
export function newsEntityHref(id: string, route: NewsLanguage = "nl"): string {
  return `${route === "nl" ? "/nieuws/" : "/news/"}?entity=${encodeURIComponent(id)}`;
}
