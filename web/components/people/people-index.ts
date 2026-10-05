import { titleNamesBody } from "@/lib/changes";
import { getMediaItem, mediaCreditLine, personPortraitId } from "@/lib/entity";
import { getMembershipsForPerson, getOrganizationById, getPeople, getPositionById, getTenuresForPerson } from "@/lib/data";
import { positionEn } from "@/lib/name-gloss";
import { partyByDataset } from "@/lib/parties";
import { personColorFor, type PersonColorSource } from "@/lib/person-color";
import type { Organization, OrgBranch, Person, Position, Tenure } from "@/lib/types";

/**
 * The people index as plain data, built at build time: one entry per person
 * with the main position in one line, the filter group, the party and the
 * identity colour (lib/person-color.ts).
 */
export const PEOPLE_GROUPS = [
  { key: "regering", nl: "Regering", en: "Government" },
  { key: "tweede-kamer", nl: "Tweede Kamer", en: "Tweede Kamer" },
  { key: "eerste-kamer", nl: "Eerste Kamer", en: "Eerste Kamer" },
  { key: "burgemeesters", nl: "Burgemeesters", en: "Mayors" },
  { key: "provincies", nl: "Provincies", en: "Provinces" },
  { key: "waterschappen", nl: "Waterschappen", en: "Water boards" },
  { key: "rechtspraak", nl: "Rechtspraak", en: "Judiciary" },
  { key: "koninkrijk", nl: "Koninkrijk", en: "Kingdom" },
  { key: "instellingen", nl: "Instellingen", en: "Institutions" },
  { key: "overig", nl: "Overig", en: "Other" },
] as const;

export type PeopleGroup = (typeof PEOPLE_GROUPS)[number]["key"];

export type PersonEntry = {
  id: string;
  slug: string;
  name: string;
  sortKey: string;
  letter: string;
  role: { nl: string; en: string | null } | null;
  group: PeopleGroup;
  /** The party as shown on the tag, and the key the party filter uses. */
  party: { label: string; key: string; color: string | null } | null;
  color: string | null;
  colorSource: PersonColorSource | null;
  portrait: { url: string; credit: string } | null;
  /** Alternative names, for the search field. */
  aliases: string[];
  /** Lowercase, accent-free text the search field matches against. */
  search: string;
};

export function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function roleRank(position: Position, organization: Organization | undefined): number {
  const title = position.title;
  if (/^Koning(in)?\b/.test(title)) return 0;
  if (/^Minister-president/i.test(title)) return 1;
  if (/^(Vice-)?Minister(-president)?\b/i.test(title) && !/^Minister van Staat/i.test(title)) return 2;
  if (/^Staatssecretaris/i.test(title)) return 3;
  if (/^(Commissaris van de Koning|Gouverneur|Burgemeester|Gezaghebber|Dijkgraaf)/i.test(title)) return 3;
  if (/^(Vice-president|President|Voorzitter)/i.test(title)) return 4;
  if (/^Fractievoorzitter/i.test(title)) return 5;
  if (organization?.subtype === "commissie") return 9;
  if (position.type === "dept_head") return 4;
  if (position.type === "commission") return 7;
  return 6;
}

type Role = { tenure: Tenure; position: Position; organization: Organization | undefined; rank: number };

function tenureLabel(position: Position, organization: Organization | undefined): { nl: string; en: string | null } {
  const en = positionEn(position.title);
  const showBody =
    organization !== undefined &&
    organization.subtype !== "land-regering" &&
    organization.id !== "org:regering" &&
    !/^(Minister|Staatssecretaris|Vice-Minister)/i.test(position.title) &&
    !titleNamesBody(position.title, organization.name);
  if (!showBody) return { nl: position.title, en };
  const nl = `${position.title} bij ${organization.name}`;
  if (en !== null && /\b(of|for)\b/.test(en)) return { nl, en };
  return { nl, en: `${en ?? position.title} at ${organization.name}` };
}

function groupForTenure(role: Role): PeopleGroup {
  const { position, organization, rank } = role;
  const branch = organization?.branch;
  if (/^Burgemeester/i.test(position.title)) return "burgemeesters";
  if (branch === "koninkrijk" || branch === "caribisch-nederland") return "koninkrijk";
  if (rank <= 3 && (branch === "regering" || rank === 0)) return "regering";
  if (organization?.subtype === "tweede-kamer") return "tweede-kamer";
  if (organization?.subtype === "eerste-kamer") return "eerste-kamer";
  if (branch === "decentraal-lokaal") return "burgemeesters";
  if (branch === "decentraal-provinciaal") return "provincies";
  if (branch === "waterschap") return "waterschappen";
  if (branch === "rechterlijke-macht") return "rechtspraak";
  return "instellingen";
}

const PARTICLES = new Set(["van", "de", "der", "den", "het", "ten", "ter", "te", "in", "'t", "’t", "op", "la", "le", "du", "da", "di", "del", "von", "zu", "el", "al", "bin"]);
const DEGREE = /^(AA|MA|MSc|MBA|MPA|MPhil|LLM|LL\.M\.?|PhD|BSc|BA|MD|RA|RC|EMIA|Bc|Ing|Dr|Mr|Prof)\.?,?$/i;

/**
 * The Dutch sort key of a name: the surname without its particles, then the
 * given names ("Sybrand van Haersma Buma" sorts as "Haersma Buma, Sybrand
 * van"), as in a Dutch register. Degree suffixes ("MA", "MSc") do not count.
 */
export function surnameKey(name: string): string {
  const words = name.replace(/\(.*?\)/g, " ").split(/\s+/).filter(Boolean);
  while (words.length > 1 && DEGREE.test(words[words.length - 1])) words.pop();
  if (words.length <= 1) return words.join(" ");
  const at = words.findIndex((word, index) => index > 0 && PARTICLES.has(word.toLowerCase()));
  if (at === -1) return `${words[words.length - 1]}, ${words.slice(0, -1).join(" ")}`;
  let end = at;
  while (end < words.length - 1 && PARTICLES.has(words[end].toLowerCase())) end += 1;
  return `${words.slice(end).join(" ")}, ${words.slice(0, end).join(" ")}`;
}

function letterOf(sortKey: string): string {
  const first = foldText(sortKey.charAt(0)).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
}

export function buildPersonEntry(person: Person): PersonEntry {
  const roles: Role[] = [];
  for (const tenure of getTenuresForPerson(person.id)) {
    if (tenure.end !== null) continue;
    const position = getPositionById(tenure.position);
    if (!position) continue;
    const organization = getOrganizationById(position.organization);
    roles.push({ tenure, position, organization, rank: roleRank(position, organization) });
  }
  roles.sort((a, b) => a.rank - b.rank || (a.tenure.start ?? "").localeCompare(b.tenure.start ?? ""));
  const best = roles[0] as Role | undefined;

  const membership = getMembershipsForPerson(person.id)
    .filter((record) => record.end === null)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const chamber = membership ? getOrganizationById(membership.organization) : undefined;

  let picked: Role | null = null;
  if (best && best.rank <= 3) picked = best;
  else if (chamber) picked = roles.find((candidate) => candidate.rank <= 5 && candidate.position.organization === chamber.id) ?? null;
  else if (best) picked = best;

  let role: PersonEntry["role"] = null;
  let group: PeopleGroup = "overig";
  let mainTitle: string | null = null;
  let branch: OrgBranch | null = null;
  if (picked) {
    role = tenureLabel(picked.position, picked.organization);
    group = groupForTenure(picked);
    mainTitle = picked.position.title;
    branch = picked.organization?.branch ?? null;
  } else if (chamber) {
    const tk = chamber.subtype === "tweede-kamer";
    const ek = chamber.subtype === "eerste-kamer";
    role = tk
      ? { nl: "Tweede Kamerlid", en: "Tweede Kamer member" }
      : ek
        ? { nl: "Eerste Kamerlid", en: "Eerste Kamer member" }
        : { nl: `Lid van ${chamber.name}`, en: `Member of ${chamber.name}` };
    group = tk ? "tweede-kamer" : ek ? "eerste-kamer" : "instellingen";
    branch = chamber.branch;
  }

  const partyValue = person.party ?? membership?.fractie ?? null;
  const record = partyByDataset(partyValue);
  const party =
    partyValue === null || partyValue === "partijloos"
      ? null
      : { label: record?.abbrev ?? partyValue, key: record?.key ?? partyValue, color: record?.color ?? null };

  const identity = personColorFor({ partyColor: party?.color ?? null, mainTitle, branch });
  const media = getMediaItem(personPortraitId(person));

  return {
    id: person.id,
    slug: person.slug,
    name: person.name,
    sortKey: surnameKey(person.name),
    letter: letterOf(surnameKey(person.name)),
    role: role,
    group,
    party,
    color: identity?.color ?? null,
    colorSource: identity?.source ?? null,
    portrait: media ? { url: media.url, credit: mediaCreditLine(media) } : null,
    aliases: person.aliases,
    search: foldText([person.name, ...person.aliases, party?.label ?? "", role?.nl ?? ""].join(" ")),
  };
}

export type LetterSection = { letter: string; people: PersonEntry[] };

export function getPeopleIndex(): {
  sections: LetterSection[];
  groups: { key: PeopleGroup; nl: string; en: string; count: number }[];
  parties: { key: string; label: string; color: string | null; count: number }[];
  total: number;
} {
  const entries = getPeople()
    .map(buildPersonEntry)
    .sort((a, b) => a.letter.localeCompare(b.letter) || a.sortKey.localeCompare(b.sortKey, "nl"));

  const sections: LetterSection[] = [];
  for (const entry of entries) {
    const last = sections[sections.length - 1];
    if (last && last.letter === entry.letter) last.people.push(entry);
    else sections.push({ letter: entry.letter, people: [entry] });
  }

  const groupCounts = new Map<PeopleGroup, number>();
  const partyCounts = new Map<string, { key: string; label: string; color: string | null; count: number }>();
  for (const entry of entries) {
    groupCounts.set(entry.group, (groupCounts.get(entry.group) ?? 0) + 1);
    if (entry.party && partyByDataset(entry.party.key)) {
      const current = partyCounts.get(entry.party.key) ?? { ...entry.party, count: 0 };
      current.count += 1;
      partyCounts.set(entry.party.key, current);
    }
  }

  return {
    sections,
    groups: PEOPLE_GROUPS.map((group) => ({ ...group, count: groupCounts.get(group.key) ?? 0 })).filter((group) => group.count > 0),
    parties: [...partyCounts.values()].filter((party) => party.count >= 2).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    total: entries.length,
  };
}
