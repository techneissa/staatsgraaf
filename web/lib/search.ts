export type SearchKind = "organization" | "person" | "position" | "topic";

export type SearchRecord = {
  id: string;
  kind: SearchKind;
  label: string;
  href: string;
  abbreviation?: string | null;
  /** Site-relative URL of a licensed portrait, for person records that have one. */
  image?: string | null;
  terms: string[];
};

export type SearchEntry = {
  id: string;
  kind: SearchKind;
  label: string;
  href: string;
  abbreviation: string | null;
  image: string | null;
  terms: string[];
  normalizedTerms: string[];
};

export type SearchIndex = {
  entries: SearchEntry[];
  byKind: Record<SearchKind, number>;
};

export type SearchResult = {
  id: string;
  kind: SearchKind;
  label: string;
  href: string;
  abbreviation: string | null;
  image: string | null;
  matchedTerm: string;
  matchedNormalized: string;
  tier: SearchMatchTier;
};

export type SearchMatchTier = 0 | 1 | 2 | 3;

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const NON_ALNUM = /[^a-z0-9]+/g;

export function normalizeSearchTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_ALNUM, " ")
    .trim();
}

function matchTier(normalizedTerm: string, normalizedQuery: string): SearchMatchTier | null {
  if (normalizedTerm === normalizedQuery) return 0;
  if (normalizedTerm.startsWith(normalizedQuery)) return 1;
  for (const word of normalizedTerm.split(" ")) {
    if (word.startsWith(normalizedQuery)) return 2;
  }
  if (normalizedTerm.includes(normalizedQuery)) return 3;
  return null;
}

function kindPriority(kind: SearchKind): number {
  return kind === "topic" ? 1 : 0;
}

function compareCodeUnit(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function buildSearchIndex(records: readonly SearchRecord[]): SearchIndex {
  const entries: SearchEntry[] = [];
  const byKind: Record<SearchKind, number> = {
    organization: 0,
    person: 0,
    position: 0,
    topic: 0,
  };

  for (const record of records) {
    const pairs = new Map<string, string>();
    const add = (raw: string) => {
      const value = normalizeSearchTerm(raw);
      if (value && !pairs.has(value)) pairs.set(value, raw);
    };
    for (const term of record.terms) add(term);
    if (record.abbreviation) add(record.abbreviation);
    if (pairs.size === 0) continue;

    const normalizedTerms = [...pairs.keys()].sort(compareCodeUnit);
    entries.push({
      id: record.id,
      kind: record.kind,
      label: record.label,
      href: record.href,
      abbreviation: record.abbreviation ?? null,
      image: record.image ?? null,
      terms: normalizedTerms.map((value) => pairs.get(value) ?? value),
      normalizedTerms,
    });
    byKind[record.kind] += 1;
  }

  entries.sort((a, b) => compareCodeUnit(a.id, b.id));
  return { entries, byKind };
}

export function rankSearch(index: SearchIndex, query: string, limit = 8): SearchResult[] {
  const normalizedQuery = normalizeSearchTerm(query);
  if (normalizedQuery.length === 0 || limit <= 0) return [];

  const results: SearchResult[] = [];
  for (const entry of index.entries) {
    let bestTier: SearchMatchTier | null = null;
    let bestTerm = "";
    let bestNormalized = "";
    for (let i = 0; i < entry.normalizedTerms.length; i += 1) {
      const normalizedTerm = entry.normalizedTerms[i];
      const tier = matchTier(normalizedTerm, normalizedQuery);
      if (tier === null) continue;
      if (
        bestTier === null ||
        tier < bestTier ||
        (tier === bestTier && normalizedTerm.length < bestNormalized.length)
      ) {
        bestTier = tier;
        bestTerm = entry.terms[i] ?? normalizedTerm;
        bestNormalized = normalizedTerm;
      }
    }
    if (bestTier === null) continue;
    results.push({
      id: entry.id,
      kind: entry.kind,
      label: entry.label,
      href: entry.href,
      abbreviation: entry.abbreviation,
      image: entry.image,
      matchedTerm: bestTerm,
      matchedNormalized: bestNormalized,
      tier: bestTier,
    });
  }

  results.sort(
    (a, b) =>
      a.tier - b.tier ||
      kindPriority(a.kind) - kindPriority(b.kind) ||
      a.matchedNormalized.length - b.matchedNormalized.length ||
      compareCodeUnit(a.id, b.id),
  );

  return results.slice(0, limit);
}
