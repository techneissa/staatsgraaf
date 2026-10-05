import type { NewsFilterState } from "./news-url-state";
import type { NewsLanguage, PublisherKind } from "./types";

/** What a filter needs to know about an item, whether it is a card or a compact row. */
export type FacetRow = { kind: PublisherKind; publisher: string; language: NewsLanguage };

type Selection = Pick<NewsFilterState, "language" | "kind" | "publisher">;

function countBy<K extends string>(rows: FacetRow[], key: (row: FacetRow) => K): Map<K, number> {
  const map = new Map<K, number>();
  for (const row of rows) map.set(key(row), (map.get(key(row)) ?? 0) + 1);
  return map;
}

/**
 * The counts behind the filter bar, from the rows in the current mode: items in the chosen
 * language, kinds within it, outlets within the chosen kind (largest first), and the outlet
 * that is really active, because a name in the address may not apply to this selection.
 */
export function newsFacets(
  rows: FacetRow[],
  selection: Selection,
): {
  languageRows: FacetRow[];
  kindCounts: Map<PublisherKind, number>;
  publishers: [string, number][];
  activePublisher: string | null;
} {
  const languageRows = selection.language === "all" ? rows : rows.filter((row) => row.language === selection.language);
  const kindCounts = countBy(languageRows, (row) => row.kind);
  const inKind = selection.kind === "all" ? languageRows : languageRows.filter((row) => row.kind === selection.kind);
  const publisherCounts = countBy(inKind, (row) => row.publisher);
  const publishers = [...publisherCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"));
  const activePublisher = selection.publisher !== null && publisherCounts.has(selection.publisher) ? selection.publisher : null;
  return { languageRows, kindCounts, publishers, activePublisher };
}

export function rowMatches(row: FacetRow, selection: Selection, activePublisher: string | null): boolean {
  return (
    (selection.language === "all" || row.language === selection.language) &&
    (selection.kind === "all" || row.kind === selection.kind) &&
    (activePublisher === null || row.publisher === activePublisher)
  );
}
