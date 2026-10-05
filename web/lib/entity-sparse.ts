import { getCareerForPerson } from "./careers";
import { getDataset, getOrganizationById, getSourceById } from "./data";
import { sparsePersonDescription, type SparsePersonFacts } from "./entity-page";
import type { Organization, Person } from "./types";

/** A source shared by more organisations than this is a general reference, not a lead to one body. */
const MAX_ORGANIZATIONS_PER_SOURCE = 3;
const GENERAL_SOURCE = /^src:(wikidata|commons|wikipedia)-/;

let organizationsBySource: Map<string, Organization[]> | null = null;

function bySource(): Map<string, Organization[]> {
  if (organizationsBySource !== null) return organizationsBySource;
  organizationsBySource = new Map();
  for (const organization of getDataset().organizations) {
    for (const ref of organization.sources) {
      const list = organizationsBySource.get(ref.source);
      if (list) list.push(organization);
      else organizationsBySource.set(ref.source, [organization]);
    }
  }
  return organizationsBySource;
}

export type SparsePerson = {
  facts: SparsePersonFacts;
  /** Organisations whose own record cites a source that also names this person. */
  organizations: Organization[];
  description: string;
};

/**
 * What the data says about a person with no position and no membership: the
 * source that names them, the organisations that cite the same source, and
 * their occupation when one is on record. Nothing is inferred from the name.
 */
export function sparsePerson(person: Person): SparsePerson {
  const organizations: Organization[] = [];
  let sourceTitle: string | null = null;
  for (const ref of person.sources) {
    if (GENERAL_SOURCE.test(ref.source)) continue;
    const source = getSourceById(ref.source);
    if (source === undefined || /wikidata\.org|commons\.wikimedia\.org/.test(source.url)) continue;
    if (sourceTitle === null) sourceTitle = source.title;
    const sharing = bySource().get(ref.source) ?? [];
    if (sharing.length > 0 && sharing.length <= MAX_ORGANIZATIONS_PER_SOURCE) {
      for (const organization of sharing) {
        if (getOrganizationById(organization.id) !== undefined && !organizations.some((item) => item.id === organization.id)) {
          organizations.push(organization);
        }
      }
    }
  }
  const careerTitles = getCareerForPerson(person.id)
    .filter((group) => group.kind === "beroep")
    .flatMap((group) => group.items.map((item) => item.title));
  const facts: SparsePersonFacts = {
    name: person.name,
    careerTitles,
    sourceTitle,
    sourceOrganizations: organizations.map((organization) => organization.name),
    hasWikipedia: person.wikipedia != null,
  };
  return { facts, organizations, description: sparsePersonDescription(facts) };
}
