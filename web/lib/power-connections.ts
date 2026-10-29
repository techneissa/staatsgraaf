/**
 * Connections between people and bodies for the power map, computed from the
 * dataset at build time (web/scripts/build-graph.mjs). Nothing here is
 * inferred beyond what the records say:
 *
 * - `news`: two entities named in the same news item. Each item counts once,
 * weighted by its age (a half-life, so last week's story weighs more than
 * last quarter's). Evidence: the news item ids.
 * - `tenure`: a person holds a current position at a body, a minister and
 * their ministry for example; a seat on a commission weighs half. Evidence:
 * the tenure id.
 * - `kabinet`: both hold a current minister or staatssecretaris post.
 * Evidence: both tenure ids.
 * - `fractie`: both are current members of the same fractie in the same
 * chamber. Evidence: both membership ids.
 * - `organisation`: both hold a current position at the same body, a
 * Kamercommissie for example. Evidence: the tenure ids.
 *
 * A pair's weight is the sum of its reasons. Every anchor keeps its strongest
 * `perEntity` ties above `minWeight`; a tie survives when either end keeps it.
 * Pure and deterministic: the reference date is an input, ties break on the
 * neighbour's prominence and then on id.
 */

export type PowerReason = "news" | "tenure" | "kabinet" | "fractie" | "organisation";

export type PowerLink = {
  /** Always a person id. */
  a: string;
  /** A person id or an organization id. */
  b: string;
  weight: number;
  reasons: PowerReason[];
  /** News items naming both, most recent first (capped), and how many there are in all. */
  news?: string[];
  newsCount?: number;
  memberships?: string[];
  tenures?: string[];
  /** The bodies behind an `organisation` tie. */
  orgs?: string[];
  /** The fractie label behind a `fractie` tie. */
  fractie?: string;
};

export type ConnectionNews = { id: string; published: string | null; entities: readonly string[] };
export type ConnectionMembership = { id: string; person: string; organization: string; fractie: string | null; end: string | null };
export type ConnectionTenure = { id: string; person: string; position: string; end: string | null };
export type ConnectionPosition = {
  organization: string;
  title: string;
  /** `commission` seats (a Kamercommissie, a raad) weigh half a post that runs a body. */
  type?: string;
};

export type ConnectionInput = {
  /** Entities whose ties are kept: the people and bodies the power map can focus on. */
  anchors: ReadonlySet<string>;
  news: readonly ConnectionNews[];
  memberships: readonly ConnectionMembership[];
  tenures: readonly ConnectionTenure[];
  positions: ReadonlyMap<string, ConnectionPosition>;
  /** ISO date the ages of news items are measured from. */
  asOf: string;
  /** Tie-break between equal weights: more prominent neighbours first (for example their news count). */
  prominence?: ReadonlyMap<string, number>;
  options?: Partial<ConnectionOptions>;
};

export type ConnectionOptions = {
  halfLifeDays: number;
  /** News older than this, or dated after `asOf`, does not count. */
  windowDays: number;
  perEntity: number;
  minWeight: number;
  newsEvidence: number;
};

export const CONNECTION_DEFAULTS: ConnectionOptions = {
  halfLifeDays: 30,
  windowDays: 90,
  perEntity: 8,
  minWeight: 0.25,
  newsEvidence: 5,
};

export const REASON_WEIGHT: Record<Exclude<PowerReason, "news"> | "commissionSeat", number> = {
  tenure: 1,
  commissionSeat: 0.5,
  kabinet: 0.6,
  fractie: 0.4,
  organisation: 0.3,
};

const DAY = 86_400_000;
const REASON_ORDER: PowerReason[] = ["tenure", "news", "kabinet", "fractie", "organisation"];

/** A current post in the cabinet: a minister or staatssecretaris at a ministry. */
export function isCabinetPost(position: ConnectionPosition): boolean {
  return position.organization.startsWith("org:ministerie-") && /^(minister|staatssecretaris)/i.test(position.title);
}

function dayOf(iso: string | null): number | null {
  if (!iso) return null;
  const time = Date.parse(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(time) ? null : Math.floor(time / DAY);
}

type Draft = {
  a: string;
  b: string;
  weight: number;
  reasons: Set<PowerReason>;
  news: { id: string; day: number }[];
  memberships: Set<string>;
  tenures: Set<string>;
  orgs: Set<string>;
  fractie?: string;
};

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const isPerson = (id: string) => id.startsWith("person:");
const isEntity = (id: string) => id.startsWith("person:") || id.startsWith("org:");

export function scoreConnections(input: ConnectionInput): PowerLink[] {
  const options = { ...CONNECTION_DEFAULTS, ...input.options };
  const { anchors } = input;
  const asOfDay = dayOf(input.asOf);
  const drafts = new Map<string, Draft>();

  const draft = (x: string, y: string): Draft | null => {
    if (x === y) return null;
    if (!anchors.has(x) && !anchors.has(y)) return null;
    // A link always starts at a person; two bodies are never linked here.
    let a = x;
    let b = y;
    if (!isPerson(a)) [a, b] = [b, a];
    if (!isPerson(a)) return null;
    if (isPerson(b) && b < a) [a, b] = [b, a];
    const key = pairKey(a, b);
    let entry = drafts.get(key);
    if (!entry) {
      entry = { a, b, weight: 0, reasons: new Set(), news: [], memberships: new Set(), tenures: new Set(), orgs: new Set() };
      drafts.set(key, entry);
    }
    return entry;
  };

  // News: every pair of entities named in one item, weighted by age.
  if (asOfDay !== null) {
    for (const item of input.news) {
      const day = dayOf(item.published);
      if (day === null || day > asOfDay || day < asOfDay - options.windowDays) continue;
      const entities = [...new Set(item.entities.filter(isEntity))].sort();
      const recency = Math.pow(0.5, (asOfDay - day) / options.halfLifeDays);
      for (let i = 0; i < entities.length; i += 1) {
        for (let j = i + 1; j < entities.length; j += 1) {
          const entry = draft(entities[i], entities[j]);
          if (!entry) continue;
          entry.weight += recency;
          entry.reasons.add("news");
          entry.news.push({ id: item.id, day });
        }
      }
    }
  }

  // Current tenures: person and body, and people who share a body or the cabinet.
  const byOrg = new Map<string, ConnectionTenure[]>();
  const cabinet: ConnectionTenure[] = [];
  for (const tenure of input.tenures) {
    if (tenure.end !== null) continue;
    const position = input.positions.get(tenure.position);
    if (!position) continue;
    const entry = draft(tenure.person, position.organization);
    if (entry && !entry.tenures.has(tenure.id)) {
      entry.weight += position.type === "commission" ? REASON_WEIGHT.commissionSeat : REASON_WEIGHT.tenure;
      entry.reasons.add("tenure");
      entry.tenures.add(tenure.id);
    }
    const list = byOrg.get(position.organization) ?? [];
    list.push(tenure);
    byOrg.set(position.organization, list);
    if (isCabinetPost(position)) cabinet.push(tenure);
  }

  const pairUp = (list: readonly { id: string; person: string }[], apply: (entry: Draft, x: { id: string }, y: { id: string }) => void) => {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (list[i].person === list[j].person) continue;
        const entry = draft(list[i].person, list[j].person);
        if (entry) apply(entry, list[i], list[j]);
      }
    }
  };

  for (const orgId of [...byOrg.keys()].sort()) {
    pairUp(byOrg.get(orgId) ?? [], (entry, x, y) => {
      if (entry.orgs.has(orgId)) return;
      entry.orgs.add(orgId);
      entry.weight += REASON_WEIGHT.organisation;
      entry.reasons.add("organisation");
      entry.tenures.add(x.id);
      entry.tenures.add(y.id);
    });
  }

  pairUp(cabinet, (entry, x, y) => {
    if (entry.reasons.has("kabinet")) return;
    entry.weight += REASON_WEIGHT.kabinet;
    entry.reasons.add("kabinet");
    entry.tenures.add(x.id);
    entry.tenures.add(y.id);
  });

  // Fracties: current members of one fractie in one chamber.
  const byFractie = new Map<string, ConnectionMembership[]>();
  for (const membership of input.memberships) {
    if (membership.end !== null || !membership.fractie) continue;
    const key = `${membership.organization}|${membership.fractie}`;
    const list = byFractie.get(key) ?? [];
    list.push(membership);
    byFractie.set(key, list);
  }
  for (const key of [...byFractie.keys()].sort()) {
    const list = byFractie.get(key) ?? [];
    pairUp(list, (entry, x, y) => {
      if (entry.reasons.has("fractie")) return;
      entry.weight += REASON_WEIGHT.fractie;
      entry.reasons.add("fractie");
      entry.memberships.add(x.id);
      entry.memberships.add(y.id);
      entry.fractie = list[0].fractie ?? undefined;
    });
  }

  // Keep each anchor's strongest ties.
  const prominence = input.prominence ?? new Map<string, number>();
  const byEnd = new Map<string, Draft[]>();
  for (const entry of drafts.values()) {
    if (entry.weight < options.minWeight) continue;
    for (const end of [entry.a, entry.b]) {
      if (!anchors.has(end)) continue;
      const list = byEnd.get(end) ?? [];
      list.push(entry);
      byEnd.set(end, list);
    }
  }
  const kept = new Set<Draft>();
  for (const [end, list] of byEnd) {
    const other = (entry: Draft) => (entry.a === end ? entry.b : entry.a);
    list
      .sort(
        (x, y) =>
          y.weight - x.weight ||
          (prominence.get(other(y)) ?? 0) - (prominence.get(other(x)) ?? 0) ||
          (other(x) < other(y) ? -1 : other(x) > other(y) ? 1 : 0),
      )
      .slice(0, options.perEntity)
      .forEach((entry) => kept.add(entry));
  }

  const round = (value: number) => Math.round(value * 1000) / 1000;
  return [...kept]
    .sort((x, y) => (x.a !== y.a ? (x.a < y.a ? -1 : 1) : x.b < y.b ? -1 : x.b > y.b ? 1 : 0))
    .map((entry) => {
      const link: PowerLink = {
        a: entry.a,
        b: entry.b,
        weight: round(entry.weight),
        reasons: REASON_ORDER.filter((reason) => entry.reasons.has(reason)),
      };
      if (entry.news.length > 0) {
        const news = [...entry.news].sort((x, y) => y.day - x.day || (x.id < y.id ? -1 : 1));
        link.news = news.slice(0, options.newsEvidence).map((item) => item.id);
        link.newsCount = news.length;
      }
      if (entry.memberships.size > 0) link.memberships = [...entry.memberships].sort();
      if (entry.tenures.size > 0) link.tenures = [...entry.tenures].sort();
      if (entry.orgs.size > 0) link.orgs = [...entry.orgs].sort();
      if (entry.fractie) link.fractie = entry.fractie;
      return link;
    });
}

/** Every tie of one entity, strongest first, as the power map's focus draws them. */
export function connectionsOf(links: readonly PowerLink[], id: string, limit = 12): { other: string; link: PowerLink }[] {
  return links
    .filter((link) => link.a === id || link.b === id)
    .map((link) => ({ other: link.a === id ? link.b : link.a, link }))
    .sort((x, y) => y.link.weight - x.link.weight || (x.other < y.other ? -1 : x.other > y.other ? 1 : 0))
    .slice(0, limit);
}

/**
 * The date the power map is "as of": the day of the newest news item, so the
 * window and the recency weights reach the latest story. The dataset snapshot
 * date (data/meta.json) can lag behind the news refresh; it is the fallback
 * only when no item carries a usable `published` date. ISO date or null.
 */
export function newsReferenceDate(
  news: readonly { published?: string | null }[],
  fallback: string | null,
): string | null {
  let newest: number | null = null;
  for (const item of news) {
    const day = dayOf(item.published ?? null);
    if (day !== null && (newest === null || day > newest)) newest = day;
  }
  if (newest === null) return fallback ? fallback.slice(0, 10) : null;
  return new Date(newest * DAY).toISOString().slice(0, 10);
}
