import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  Budget,
  Change,
  Coalition,
  Election,
  Government,
  MediaItem,
  Membership,
  NewsItem,
  NewsTranslation,
  Organization,
  Person,
  PersonActivity,
  Position,
  Relation,
  Source,
  Tenure,
  Topic,
} from "./types";

/**
 * The dataset always lives in <repo-root>/data. The web app may run from its own
 * package directory (web/) or from the repo root (for example while running tests
 * with `bun test pipelines web/lib`), so walk up from the current directory and
 * take the outermost ancestor that holds both a package.json and a data directory.
 * The outermost match is the monorepo root; web/ itself also has a package.json
 * and a data directory (search-aliases.json), which must not be mistaken for it.
 */
function findRepoRoot(): string {
  let dir = process.cwd();
  let candidate: string | null = null;
  while (true) {
    if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "data"))) {
      candidate = dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return candidate ?? process.cwd();
}

const DATA_DIR = join(findRepoRoot(), "data");

function readArray<T>(file: string): T[] {
  const fullPath = join(DATA_DIR, file);
  let raw: string;
  try {
    raw = readFileSync(fullPath, "utf8");
  } catch {
    throw new Error(
      `Datasetbestand niet gevonden: ${fullPath}. De web-app leest de dataset op buildtijd uit ../data en doet geen runtime-fetches.`,
    );
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Datasetbestand ${file} moet een JSON-array zijn.`);
  }
  return parsed as T[];
}

/**
 * An optional dataset file: a missing file is an empty list, not a build
 * failure. Used for files another pipeline fills in over time, such as the
 * news translations (docs/adr/0016-news-machine-translation.md).
 */
function readOptionalArray<T>(file: string): T[] {
  const fullPath = join(DATA_DIR, file);
  if (!existsSync(fullPath)) return [];
  try {
    const parsed: unknown = JSON.parse(readFileSync(fullPath, "utf8"));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // A file that is mid-write or malformed shows every item in its original language.
    return [];
  }
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

export type Dataset = {
  organizations: Organization[];
  positions: Position[];
  people: Person[];
  tenures: Tenure[];
  memberships: Membership[];
  relations: Relation[];
  sources: Source[];
  governments: Government[];
  changes: Change[];
  news: NewsItem[];
  newsTranslations: NewsTranslation[];
  topics: Topic[];
  budgets: Budget[];
  media: MediaItem[];
  elections: Election[];
  coalitions: Coalition[];
  /** Proposals and motions per person; optional file, empty when absent. */
  activities: PersonActivity[];
  activitiesByPersonId: Map<string, PersonActivity>;
  organizationsById: Map<string, Organization>;
  organizationsBySlug: Map<string, Organization>;
  positionsById: Map<string, Position>;
  positionsBySlug: Map<string, Position>;
  peopleById: Map<string, Person>;
  peopleBySlug: Map<string, Person>;
  sourcesById: Map<string, Source>;
  tenuresByPersonId: Map<string, Tenure[]>;
  tenuresByPositionId: Map<string, Tenure[]>;
  membershipsByPersonId: Map<string, Membership[]>;
  membershipsByOrganizationId: Map<string, Membership[]>;
  datasetDate: string | null;
};

let dataset: Dataset | null = null;

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const id = key(item);
    const list = map.get(id);
    if (list) {
      list.push(item);
    } else {
      map.set(id, [item]);
    }
  }
  return map;
}

function sortTenures(tenures: Tenure[]): Tenure[] {
  return [...tenures].sort((a, b) => {
    const aCurrent = a.end === null ? 0 : 1;
    const bCurrent = b.end === null ? 0 : 1;
    if (aCurrent !== bCurrent) return aCurrent - bCurrent;
    return b.start.localeCompare(a.start);
  });
}

function sortMemberships(memberships: Membership[]): Membership[] {
  return [...memberships].sort((a, b) => {
    const aCurrent = a.end === null ? 0 : 1;
    const bCurrent = b.end === null ? 0 : 1;
    if (aCurrent !== bCurrent) return aCurrent - bCurrent;
    return b.start.localeCompare(a.start);
  });
}

function latestRetrieved(sources: Source[]): string | null {
  let latest: string | null = null;
  for (const source of sources) {
    if (!source.retrieved) continue;
    if (latest === null || source.retrieved > latest) latest = source.retrieved;
  }
  return latest;
}

export function getDataset(): Dataset {
  if (dataset) return dataset;

  const organizations = readArray<Organization>("organizations.json");
  const positions = readArray<Position>("positions.json");
  const people = readArray<Person>("people.json");
  const tenures = readArray<Tenure>("tenures.json");
  const memberships = readArray<Membership>("memberships.json");
  const relations = readArray<Relation>("relations.json");
  const sources = readArray<Source>("sources.json");
  const governments = readArray<Government>("governments.json");
  const changes = readArray<Change>("changes.json");
  const news = readArray<NewsItem>("news.json");
  const newsTranslations = readOptionalArray<NewsTranslation>("news-translations.json");
  const topics = readArray<Topic>("topics.json");
  const budgets = readArray<Budget>("budgets.json");
  const media = readArray<MediaItem>("media.json");
  const elections = readArray<Election>("elections.json");
  const coalitions = readArray<Coalition>("coalitions.json");
  const activities = readOptionalArray<PersonActivity>("activities.json");

  dataset = {
    organizations,
    positions,
    people,
    tenures,
    memberships,
    relations,
    sources,
    governments,
    changes,
    news,
    newsTranslations,
    topics,
    budgets,
    media,
    elections,
    coalitions,
    activities,
    activitiesByPersonId: new Map(activities.map((record) => [record.person, record])),
    organizationsById: indexById(organizations),
    organizationsBySlug: new Map(organizations.map((org) => [org.slug, org])),
    positionsById: indexById(positions),
    positionsBySlug: new Map(positions.map((position) => [position.slug, position])),
    peopleById: indexById(people),
    peopleBySlug: new Map(people.map((person) => [person.slug, person])),
    sourcesById: indexById(sources),
    tenuresByPersonId: groupBy(tenures, (tenure) => tenure.person),
    tenuresByPositionId: groupBy(tenures, (tenure) => tenure.position),
    membershipsByPersonId: groupBy(memberships, (membership) => membership.person),
    membershipsByOrganizationId: groupBy(memberships, (membership) => membership.organization),
    datasetDate: latestRetrieved(sources),
  };

  return dataset;
}

export function getOrganizations(): Organization[] {
  return getDataset().organizations;
}

export function getPositions(): Position[] {
  return getDataset().positions;
}

export function getPeople(): Person[] {
  return getDataset().people;
}

export function getOrganizationBySlug(slug: string): Organization | undefined {
  return getDataset().organizationsBySlug.get(slug);
}

export function getOrganizationById(id: string): Organization | undefined {
  return getDataset().organizationsById.get(id);
}

export function getPositionBySlug(slug: string): Position | undefined {
  return getDataset().positionsBySlug.get(slug);
}

export function getPositionById(id: string): Position | undefined {
  return getDataset().positionsById.get(id);
}

export function getPersonBySlug(slug: string): Person | undefined {
  return getDataset().peopleBySlug.get(slug);
}

export function getPersonById(id: string): Person | undefined {
  return getDataset().peopleById.get(id);
}

export function getSourceById(id: string): Source | undefined {
  return getDataset().sourcesById.get(id);
}

export function getSourceRefById(id: string): Source | undefined {
  return getSourceById(id);
}

export function getTenuresForPerson(personId: string): Tenure[] {
  return sortTenures(getDataset().tenuresByPersonId.get(personId) ?? []);
}

export function getTenuresForPosition(positionId: string): Tenure[] {
  return sortTenures(getDataset().tenuresByPositionId.get(positionId) ?? []);
}

export function getCurrentTenuresForOrganization(organizationId: string): Tenure[] {
  const { positions } = getDataset();
  const tenures: Tenure[] = [];
  for (const position of positions) {
    if (position.organization !== organizationId) continue;
    for (const tenure of getTenuresForPosition(position.id)) {
      if (tenure.end === null) tenures.push(tenure);
    }
  }
  return tenures;
}

export function getMembershipsForPerson(personId: string): Membership[] {
  return sortMemberships(getDataset().membershipsByPersonId.get(personId) ?? []);
}

export function getCurrentMembershipsForOrganization(organizationId: string): Membership[] {
  return sortMemberships(getDataset().membershipsByOrganizationId.get(organizationId) ?? []).filter(
    (membership) => membership.end === null,
  );
}

export function getDatasetDate(): string | null {
  return getDataset().datasetDate;
}

export function getOrganizationCounts(): {
  byType: { key: string; count: number }[];
  byBranch: { key: string; count: number }[];
  total: number;
  bySubtype: { key: string; count: number }[];
} {
  const organizations = getOrganizations();
  const count = (items: string[]): Map<string, number> => {
    const map = new Map<string, number>();
    for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
    return map;
  };
  const toSorted = (map: Map<string, number>): { key: string; count: number }[] =>
    [...map.entries()]
      .map(([key, value]) => ({ key, count: value }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  return {
    byType: toSorted(count(organizations.map((org) => org.type))),
    byBranch: toSorted(count(organizations.map((org) => org.branch))),
    bySubtype: toSorted(count(organizations.map((org) => org.subtype))),
    total: organizations.length,
  };
}

export function entitySummary(id: string): { href: string; label: string } | null {
  const { organizationsById, positionsById, peopleById, topics } = getDataset();
  if (id.startsWith("org:")) {
    const org = organizationsById.get(id);
    return org ? { href: `/organisaties/${org.slug}/`, label: org.name } : null;
  }
  if (id.startsWith("pos:")) {
    const position = positionsById.get(id);
    return position ? { href: `/posities/${position.slug}/`, label: position.title } : null;
  }
  if (id.startsWith("person:")) {
    const person = peopleById.get(id);
    return person ? { href: `/personen/${person.slug}/`, label: person.name } : null;
  }
  if (id.startsWith("topic:")) {
    const topic = topics.find((item) => item.id === id);
    return topic ? { href: `/onderwerpen/${topic.slug}/`, label: topic.name } : null;
  }
  return null;
}

export function entityHref(id: string): string | null {
  return entitySummary(id)?.href ?? null;
}

