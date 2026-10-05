export type SearchKind = "organization" | "person" | "position" | "topic";

export type SearchRecord = {
  id: string;
  kind: SearchKind;
  label: string;
  href: string;
  abbreviation?: string | null;
  /** Site-relative URL of a licensed portrait, for person records that have one. */
  image?: string | null;
  /** Where the entity sits: the parent organization, the held position, the branch. */
  context?: string;
  /** Set for records of Curaçao, Aruba and Sint Maarten (organization country slug). */
  country?: string;
  /** English alias, from the curated overlay; shown in the English interface. */
  en?: string;
  terms: string[];
};

export type SearchEntry = {
  id: string;
  kind: SearchKind;
  label: string;
  href: string;
  abbreviation: string | null;
  image: string | null;
  context: string;
  country: string | null;
  en: string | null;
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
  /** Parent line shown after the kind; unique per label within one result list. */
  context: string;
  en: string | null;
  matchedTerm: string;
  matchedNormalized: string;
  tier: SearchMatchTier;
};

/** 0-3: whole query matches a term; 4: every word matches a word of a term; 5: with typos. */
export type SearchMatchTier = 0 | 1 | 2 | 3 | 4 | 5;

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
      context: record.context ?? "",
      country: record.country ?? null,
      en: record.en ?? null,
      terms: normalizedTerms.map((value) => pairs.get(value) ?? value),
      normalizedTerms,
    });
    byKind[record.kind] += 1;
  }

  entries.sort((a, b) => compareCodeUnit(a.id, b.id));
  return { entries, byKind };
}

const CARIBBEAN_COUNTRIES: Record<string, string> = {
  curacao: "Curaçao",
  aruba: "Aruba",
  "sint-maarten": "Sint Maarten",
};

function isCaribbean(entry: { country: string | null }): boolean {
  return entry.country !== null && entry.country in CARIBBEAN_COUNTRIES;
}

/** True when the query names the entry's country, so the foreign record may rank first. */
function namesCountry(entry: { country: string | null }, normalizedQuery: string): boolean {
  if (!entry.country || !(entry.country in CARIBBEAN_COUNTRIES)) return false;
  const name = normalizeSearchTerm(CARIBBEAN_COUNTRIES[entry.country]);
  return ` ${normalizedQuery} `.includes(` ${name} `);
}

// Typo budget per query word: none up to 4 letters, one from 5, two from 9.
function allowedEdits(length: number): number {
  return length >= 9 ? 2 : length >= 5 ? 1 : 0;
}

/**
 * Optimal string alignment distance (a swap of neighbours counts as one edit).
 * Returns the distance between the whole strings and the smallest distance
 * between `a` and any prefix of `b`. Both are `max + 1` when above `max`.
 */
function editDistances(a: string, b: string, max: number): { whole: number; prefix: number } {
  const n = a.length;
  const m = b.length;
  const over = max + 1;
  let prev2: number[] = [];
  let prev: number[] = Array.from({ length: m + 1 }, (_, j) => j);
  let prefix = over;
  for (let i = 1; i <= n; i += 1) {
    const row: number[] = new Array(m + 1);
    row[0] = i;
    let rowMin = row[0];
    for (let j = 1; j <= m; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
        value = Math.min(value, prev2[j - 2] + 1);
      }
      row[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return { whole: over, prefix: over };
    prev2 = prev;
    prev = row;
  }
  for (let j = 0; j <= m; j += 1) if (prev[j] < prefix) prefix = prev[j];
  return { whole: Math.min(prev[m], over), prefix: Math.min(prefix, over) };
}

type Vocabulary = {
  /** word -> indexes of the entries that carry it in some term */
  words: Map<string, number[]>;
};

const vocabularies = new WeakMap<SearchIndex, Vocabulary>();

function vocabularyOf(index: SearchIndex): Vocabulary {
  let vocabulary = vocabularies.get(index);
  if (vocabulary) return vocabulary;
  const words = new Map<string, number[]>();
  index.entries.forEach((entry, at) => {
    for (const term of entry.normalizedTerms) {
      for (const word of term.split(" ")) {
        const list = words.get(word);
        if (!list) words.set(word, [at]);
        else if (list[list.length - 1] !== at) list.push(at);
      }
    }
  });
  vocabulary = { words };
  vocabularies.set(index, vocabulary);
  return vocabulary;
}

/** Vocabulary words a query word can stand for, with the edits it takes. */
function expandToken(vocabulary: Vocabulary, token: string, prefix: boolean): Map<string, number> {
  const matches = new Map<string, number>();
  const max = allowedEdits(token.length);
  for (const word of vocabulary.words.keys()) {
    if (word === token || word.startsWith(token)) {
      matches.set(word, 0);
      continue;
    }
    if (max === 0) continue;
    if (word.length < token.length - max) continue;
    if (!prefix && word.length > token.length + max) continue;
    const { whole, prefix: prefixDistance } = editDistances(token, word, max);
    // A whole-word fix beats a fix that only matches the start of a longer word.
    if (whole <= max) matches.set(word, whole);
    else if (prefix && prefixDistance <= max) matches.set(word, prefixDistance + 0.5);
  }
  return matches;
}

type TokenHit = { entry: number; term: number; edits: number };

/** Entries where every query word matches a word of one term (any order), typos allowed. */
function matchTokens(index: SearchIndex, tokens: string[], allowTypos: boolean): TokenHit[] {
  const vocabulary = vocabularyOf(index);
  const expanded = tokens.map((token, at) => {
    const matches = expandToken(vocabulary, token, at === tokens.length - 1);
    if (allowTypos) return matches;
    const exact = new Map<string, number>();
    for (const [word, edits] of matches) if (edits === 0) exact.set(word, 0);
    return exact;
  });
  if (expanded.some((matches) => matches.size === 0)) return [];

  let rarest = 0;
  for (let i = 1; i < expanded.length; i += 1) if (expanded[i].size < expanded[rarest].size) rarest = i;
  const candidates = new Set<number>();
  for (const word of expanded[rarest].keys()) {
    for (const at of vocabulary.words.get(word) ?? []) candidates.add(at);
  }

  const hits: TokenHit[] = [];
  for (const at of candidates) {
    const entry = index.entries[at];
    let best: TokenHit | null = null;
    for (let t = 0; t < entry.normalizedTerms.length; t += 1) {
      const words = entry.normalizedTerms[t].split(" ");
      let total = 0;
      let ok = true;
      for (const matches of expanded) {
        let least = Infinity;
        for (const word of words) {
          const edits = matches.get(word);
          if (edits !== undefined && edits < least) least = edits;
        }
        if (least === Infinity) {
          ok = false;
          break;
        }
        total += least;
      }
      if (ok && (best === null || total < best.edits)) best = { entry: at, term: t, edits: total };
    }
    if (best) hits.push(best);
  }
  return hits;
}

type Candidate = SearchResult & { edits: number; named: boolean };

function toCandidate(entry: SearchEntry, termAt: number, tier: SearchMatchTier, edits: number, normalizedQuery: string): Candidate {
  const normalized = entry.normalizedTerms[termAt];
  return {
    id: entry.id,
    kind: entry.kind,
    label: entry.label,
    href: entry.href,
    abbreviation: entry.abbreviation,
    image: entry.image,
    context: entry.context,
    en: entry.en,
    matchedTerm: entry.terms[termAt] ?? normalized,
    matchedNormalized: normalized,
    tier,
    edits,
    named: isCaribbean(entry) ? namesCountry(entry, normalizedQuery) : true,
  };
}

function exactStage(index: SearchIndex, normalizedQuery: string): Candidate[] {
  const results: Candidate[] = [];
  for (const entry of index.entries) {
    let bestTier: SearchMatchTier | null = null;
    let bestAt = 0;
    for (let i = 0; i < entry.normalizedTerms.length; i += 1) {
      const normalizedTerm = entry.normalizedTerms[i];
      const tier = matchTier(normalizedTerm, normalizedQuery);
      if (tier === null) continue;
      if (
        bestTier === null ||
        tier < bestTier ||
        (tier === bestTier && normalizedTerm.length < entry.normalizedTerms[bestAt].length)
      ) {
        bestTier = tier;
        bestAt = i;
      }
    }
    if (bestTier !== null) results.push(toCandidate(entry, bestAt, bestTier, 0, normalizedQuery));
  }
  return results;
}

function compareCandidates(a: Candidate, b: Candidate): number {
  return (
    a.tier - b.tier ||
    a.edits - b.edits ||
    Number(!a.named) - Number(!b.named) ||
    // With typos, a term that is just the fixed word beats a longer one, topic or not.
    (a.tier === 5 ? a.matchedNormalized.length - b.matchedNormalized.length : 0) ||
    kindPriority(a.kind) - kindPriority(b.kind) ||
    a.matchedNormalized.length - b.matchedNormalized.length ||
    compareCodeUnit(a.id, b.id)
  );
}

function withCountry(result: SearchResult, entry: SearchEntry | undefined): string {
  if (!entry || !isCaribbean(entry) || !entry.country) return result.context;
  const name = CARIBBEAN_COUNTRIES[entry.country];
  if (normalizeSearchTerm(result.context).includes(normalizeSearchTerm(name))) return result.context;
  return result.context ? `${result.context} · ${name}` : name;
}

/**
 * Rows that would look identical (same kind, label and context line) get the
 * id slug as a last resort, so no two rows in one list read the same.
 */
function disambiguate(results: SearchResult[]): void {
  const seen = new Map<string, number>();
  for (const result of results) {
    const key = `${result.kind}|${result.label}|${result.context}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const result of results) {
    const key = `${result.kind}|${result.label}|${result.context}`;
    if ((seen.get(key) ?? 0) < 2) continue;
    const slug = result.id.slice(result.id.indexOf(":") + 1);
    result.context = result.context ? `${result.context} · ${slug}` : slug;
  }
}

function mergeCandidates(into: Map<string, Candidate>, more: Candidate[]): void {
  for (const candidate of more) {
    const held = into.get(candidate.id);
    if (!held || compareCandidates(candidate, held) < 0) into.set(candidate.id, candidate);
  }
}

/** Everything that matches `normalizedQuery`; `scope` limits it to some entries. */
function collect(index: SearchIndex, normalizedQuery: string, limit: number, scope?: (entry: SearchEntry) => boolean): Candidate[] {
  const entries = scope ? { ...index, entries: index.entries.filter(scope) } : index;
  const candidates = exactStage(entries, normalizedQuery);
  if (candidates.length < limit) {
    // Word-by-word matching and typo tolerance only top up a short list.
    const taken = new Set(candidates.map((candidate) => candidate.id));
    const allowTypos = candidates.length < 3;
    for (const hit of matchTokens(index, normalizedQuery.split(" "), allowTypos)) {
      const entry = index.entries[hit.entry];
      if (taken.has(entry.id) || (scope && !scope(entry))) continue;
      candidates.push(toCandidate(entry, hit.term, hit.edits === 0 ? 4 : 5, hit.edits, normalizedQuery));
    }
  }
  return candidates;
}

/** Country names in the query ("Minister van Financiën Curaçao") and what is left of it. */
function splitCountries(normalizedQuery: string): { rest: string; countries: string[] } {
  let rest = ` ${normalizedQuery} `;
  const countries: string[] = [];
  for (const [slug, label] of Object.entries(CARIBBEAN_COUNTRIES)) {
    const name = ` ${normalizeSearchTerm(label)} `;
    if (rest.includes(name)) {
      countries.push(slug);
      rest = rest.replace(name, " ");
    }
  }
  return { rest: rest.trim(), countries };
}

export function rankSearch(index: SearchIndex, query: string, limit = 8): SearchResult[] {
  const normalizedQuery = normalizeSearchTerm(query);
  if (normalizedQuery.length === 0 || limit <= 0) return [];

  const merged = new Map<string, Candidate>();
  mergeCandidates(merged, collect(index, normalizedQuery, limit));
  const { rest, countries } = splitCountries(normalizedQuery);
  if (countries.length > 0 && rest.length > 0) {
    // The query names a country: also match the rest of it within that country.
    mergeCandidates(
      merged,
      collect(index, rest, limit, (entry) => entry.country !== null && countries.includes(entry.country)).map((candidate) => ({
        ...candidate,
        named: true,
      })),
    );
  }

  const byId = new Map(index.entries.map((entry) => [entry.id, entry]));
  const results = [...merged.values()]
    .sort(compareCandidates)
    .slice(0, limit)
    .map((candidate): SearchResult => {
      const { edits: _edits, named: _named, ...result } = candidate;
      void _edits;
      void _named;
      return { ...result, context: withCountry(result, byId.get(result.id)) };
    });
  disambiguate(results);
  return results;
}

/**
 * "Bedoelde je X?": the query with each word replaced by the closest word in
 * the index, or null when the query already matches or nothing is close.
 */
export function suggestSearch(index: SearchIndex, query: string): string | null {
  const normalizedQuery = normalizeSearchTerm(query);
  if (normalizedQuery.length === 0) return null;
  if (exactStage(index, normalizedQuery).length > 0) return null;
  const tokens = normalizedQuery.split(" ");
  if (matchTokens(index, tokens, false).length > 0) return null;

  const vocabulary = vocabularyOf(index);
  let changed = false;
  const corrected: string[] = [];
  for (const token of tokens) {
    const max = allowedEdits(token.length);
    let best = token;
    let bestEdits = vocabulary.words.has(token) ? 0 : Infinity;
    let bestUse = vocabulary.words.get(token)?.length ?? 0;
    if (bestEdits !== 0 && max > 0) {
      for (const [word, entries] of vocabulary.words) {
        if (Math.abs(word.length - token.length) > max) continue;
        const { whole } = editDistances(token, word, max);
        if (whole > max) continue;
        if (whole < bestEdits || (whole === bestEdits && entries.length > bestUse)) {
          best = word;
          bestEdits = whole;
          bestUse = entries.length;
        }
      }
    }
    if (bestEdits === Infinity) {
      // Nothing close; keep a word that at least starts a known word.
      const starts = [...vocabulary.words.keys()].some((word) => word.startsWith(token));
      if (!starts) return null;
    } else if (best !== token) {
      changed = true;
    }
    corrected.push(best);
  }
  if (!changed) return null;
  const suggestion = corrected.join(" ");
  return exactStage(index, suggestion).length > 0 || matchTokens(index, corrected, false).length > 0 ? suggestion : null;
}
