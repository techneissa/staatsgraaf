/**
 * Pure helpers for the entity pages: sort keys, role ranks and the sentences
 * built from structured data for meta descriptions and sparse pages. Nothing
 * here reads the dataset, so each function is easy to test; the pages pass in
 * what they resolved.
 */

// Surnames ----------------------------------------------------------------------

const TITLE_TOKEN =
  /^(?:mr|drs|dr|prof|ir|ing|ds|em|mw|mevr|dhr|bsc|msc|mba|ll\.?m|bgen|lgen|kol|lkol|maj|kltz|vadm|schout|jhr|mgr)\.?$|^\((?:b\.d|e\.r|res|a\.d)\.?\)$/i;
const INITIALS = /^(?:\p{L}{1,2}\.)+$/u;
const PARTICLES = new Set(["van", "de", "den", "der", "het", "ten", "ter", "te", "op", "in", "aan", "bij", "'t", "t", "von", "el", "al"]);

/** The tokens of a name without titles ("dr.", "Bgen (b.d.)") and initials ("A.J.A."). */
export function nameWithoutTitles(name: string): string[] {
  const tokens = name.trim().split(/\s+/).filter((token) => token !== "");
  const kept = tokens.filter((token) => !TITLE_TOKEN.test(token) && !INITIALS.test(token));
  return kept.length > 0 ? kept : tokens;
}

/**
 * The key a Dutch list sorts a person by: the surname without its particles
 * ("van der Lee" under L), titles and initials ignored. Treep-Van Hoeckel and
 * Vellinga-Beemsterboer sort by the double name.
 */
export function surnameKey(name: string): string {
  const tokens = nameWithoutTitles(name);
  if (tokens.length === 1) return tokens[0].toLowerCase();
  let start = tokens.length - 1;
  const hyphen = tokens.findIndex((token, index) => index >= 1 && token.includes("-"));
  const particle = tokens.findIndex((token, index) => index >= 1 && index < tokens.length - 1 && PARTICLES.has(token.toLowerCase()));
  if (hyphen !== -1) start = hyphen;
  else if (particle !== -1) start = particle;
  else if (tokens[0] !== undefined && PARTICLES.has(tokens[0].toLowerCase())) start = 0;
  let surname = tokens.slice(start);
  while (surname.length > 1 && PARTICLES.has(surname[0].toLowerCase())) surname = surname.slice(1);
  return surname.join(" ").toLowerCase();
}

export function compareBySurname(a: string, b: string): number {
  return (
    surnameKey(a).localeCompare(surnameKey(b), "nl") ||
    nameWithoutTitles(a).join(" ").localeCompare(nameWithoutTitles(b).join(" "), "nl")
  );
}

// Roles -------------------------------------------------------------------------

/** Lower is more senior. Used for the key holders of an organisation. */
export function keyHolderRank(title: string): number {
  if (/^Koning(in)?\b/.test(title)) return 0;
  if (/^Minister-president/i.test(title)) return 1;
  if (/^(Vice-)?Minister\b/i.test(title)) return 2;
  if (/^Staatssecretaris/i.test(title)) return 3;
  if (/^(Burgemeester|Commissaris van de Koning|Gouverneur|Dijkgraaf|Gezaghebber)/i.test(title)) return 4;
  if (/^(Voorzitter|President|Vice-president|Algemeen voorzitter)\b/i.test(title) && !/commissie/i.test(title)) return 5;
  if (/^(Algemeen directeur|Directeur|Secretaris-generaal|Inspecteur|Hoofd|Griffier)/i.test(title)) return 6;
  if (/^(Lid|Plaatsvervangend|Raadslid|Statenlid)/i.test(title)) return 9;
  return 8;
}

/** Rank below 9: chair, minister, procureur-generaal. Ordinary members stay in the members list. */
export function isLeadingRole(title: string): boolean {
  return keyHolderRank(title) < 9;
}

/**
 * One group per person, first seen order. Callers sort by rank first so the
 * senior office is the first caption and extra offices stay on that face.
 */
export function groupHoldersByPerson<T extends { personId: string }>(entries: T[]): T[][] {
  const groups: T[][] = [];
  const index = new Map<string, T[]>();
  for (const entry of entries) {
    const existing = index.get(entry.personId);
    if (existing) {
      existing.push(entry);
      continue;
    }
    const group = [entry];
    index.set(entry.personId, group);
    groups.push(group);
  }
  return groups;
}

/** The short role of a position title in the context of its body: "Minister", "Voorzitter", "Lid". */
export function shortRole(title: string): string {
  const lead = /^(Voorzitter|Ondervoorzitter|Vice-voorzitter|Lid|Griffier|Plaatsvervangend lid)\b/i.exec(title);
  if (lead !== null) return lead[1];
  return title.replace(/\s+(van|bij|voor)\s+.*$/i, "");
}

/**
 * `shortRole` for a caption under a face: drop a hanging parenthesis left
 * when "van" was cut inside "(lid van ...)".
 */
export function roleLabel(title: string): string {
  const short = shortRole(title);
  return short.replace(/\s*\([^)]*$/, "").trim() || short;
}

export type CommissieRole = "chair" | "vice" | "member" | "other";

/** The role a committee position stands for, from its title. */
export function commissieRole(title: string): CommissieRole {
  if (/^Ondervoorzitter\b/i.test(title) || /^Vice-voorzitter\b/i.test(title)) return "vice";
  if (/^Voorzitter\b/i.test(title)) return "chair";
  if (/^Lid\b/i.test(title)) return "member";
  return "other";
}

const COMMISSIE_ORDER: Record<CommissieRole, number> = { chair: 0, vice: 1, other: 2, member: 3 };

/** Chair first, then vice-chair, then the rest, members by surname. */
export function compareCommissieHolders(
  a: { role: CommissieRole; name: string },
  b: { role: CommissieRole; name: string },
): number {
  return COMMISSIE_ORDER[a.role] - COMMISSIE_ORDER[b.role] || compareBySurname(a.name, b.name);
}

export type PartyRoleGroup = "bewindspersonen" | "fractievoorzitters" | "burgemeesters" | "bestuurders" | "anderen";

/** Which group of a party page a person's current position title belongs to. */
export function partyRoleGroup(title: string): PartyRoleGroup {
  if (/^Fractievoorzitter/i.test(title)) return "fractievoorzitters";
  if (/^(Minister|Vice-minister|Staatssecretaris|Minister-president)/i.test(title)) return "bewindspersonen";
  if (/^(Burgemeester|Gezaghebber)/i.test(title)) return "burgemeesters";
  if (/^(Commissaris van de Koning|Gouverneur|Dijkgraaf|Wethouder|Gedeputeerde|Voorzitter|President)/i.test(title)) return "bestuurders";
  return "anderen";
}

// Position page title --------------------------------------------------------

/**
 * The page title of a position. A title that several positions share gets its
 * body: "Burgemeester van Amsterdam" for a gemeente, "Minister van Financiën
 * · Ministerie van Financiën" otherwise. A title that is unique stays as it is.
 */
export function positionPageTitle(input: {
  title: string;
  ambiguous: boolean;
  bodyName: string | null;
  bodySubtype: string | null;
}): string {
  const { title, ambiguous, bodyName, bodySubtype } = input;
  if (!ambiguous || bodyName === null) return title;
  if (bodySubtype === "gemeente") {
    const place = bodyName.replace(/^Gemeente\s+/, "");
    return title.includes(place) ? title : `${title} van ${place}`;
  }
  return title.includes(bodyName) ? title : `${title} · ${bodyName}`;
}

// Sentences from data ----------------------------------------------------------

export type SparsePersonFacts = {
  name: string;
  /** Occupation or career titles on record, such as "ambtenaar". */
  careerTitles: string[];
  /** The title of the first source that is not a general reference such as Wikidata. */
  sourceTitle: string | null;
  /** Organisations whose own record cites the same source. */
  sourceOrganizations: string[];
  hasWikipedia: boolean;
};

/** Meta description for a person without a role or membership, built from what the data holds. */
export function sparsePersonDescription(facts: SparsePersonFacts): string {
  const parts: string[] = [];
  if (facts.careerTitles.length > 0) parts.push(`Beroep: ${facts.careerTitles.slice(0, 2).join(", ")}.`);
  if (facts.sourceTitle !== null) {
    const where = facts.sourceOrganizations.length > 0 ? ` (${facts.sourceOrganizations.slice(0, 2).join(", ")})` : "";
    parts.push(`Genoemd in de bron "${facts.sourceTitle}"${where}.`);
  }
  parts.push("Nog geen functies of lidmaatschappen in de dataset.");
  return `${facts.name}: ${parts.join(" ")}`;
}

export type OrganizationFacts = {
  name: string;
  summary: string | null;
  subtype: string;
  branch: string;
  level: string;
  parentName: string | null;
  childCount: number;
  holderCount: number;
  website: string | null;
  hasLegalSource: boolean;
};

/** Meta description for an organisation, always built from its fields. */
export function organizationDescription(facts: OrganizationFacts): string {
  const lead =
    facts.summary !== null
      ? `${facts.name}: ${facts.summary}.`
      : `${facts.name}: ${facts.subtype.toLowerCase()} in de tak ${facts.branch}, niveau ${facts.level.toLowerCase()}${facts.parentName !== null ? `, onder ${facts.parentName}` : ""}.`;
  const bits: string[] = [];
  if (facts.holderCount > 0) bits.push(`${facts.holderCount} huidige functionarissen`);
  if (facts.hasLegalSource) bits.push("wettelijke grondslag");
  if (facts.website !== null) bits.push("website");
  const tail = bits.length > 0 ? ` Met ${bits.join(", ")} en een bron per gegeven.` : " Met een bron per gegeven.";
  return `${lead}${tail}`;
}

export type PositionFacts = {
  title: string;
  bodyName: string | null;
  summary: string | null;
  typeLabel: string;
  fillMethodLabel: string | null;
  seatsCount: number | null;
  holderCount: number;
  tenureCount: number;
  vacancy: boolean;
  /** Current members of the body when the position is a plain "Lid ..." seat held through memberships. */
  memberCount?: number;
  /** Name of the body the members belong to. */
  memberBody?: string;
};

/** Meta description for a position: the holder when known, else exactly what the data says. */
export function positionDescription(facts: PositionFacts): string {
  const where = facts.bodyName !== null ? ` bij ${facts.bodyName}` : "";
  if (facts.summary !== null) return `${facts.title}${where}: ${facts.summary}.`;
  const bits = [facts.typeLabel.toLowerCase()];
  if (facts.fillMethodLabel !== null) bits.push(facts.fillMethodLabel.toLowerCase());
  if (facts.seatsCount !== null && facts.seatsCount > 1) bits.push(`${facts.seatsCount} zetels`);
  const holders = facts.vacancy
    ? "Volgens de bron is er een vacature."
    : (facts.memberCount ?? 0) > 0
      ? `De ${facts.memberCount} huidige leden staan bij ${facts.memberBody ?? facts.bodyName ?? "de organisatie"}.`
      : facts.tenureCount === 0
      ? "Op dit snapshot staat geen houder in de dataset."
      : "Op dit snapshot is geen huidige houder bekend.";
  return `${facts.title}${where}: ${bits.join(", ")}. ${holders}`;
}

// Career ------------------------------------------------------------------------

/** Generic words a career entry uses where an organisation should stand. */
const GENERIC_ORGANIZATIONS = new Set(["fractie", "partij", "kamer", "kabinet", "commissie", "raad"]);

export function isGenericOrganization(label: string | null): boolean {
  return label !== null && GENERIC_ORGANIZATIONS.has(label.trim().toLowerCase());
}

type CareerSortable = { years: { nl: string } | null; current: boolean };

/** The latest year a career entry names; Infinity for "nu" and "sinds ..." entries, -Infinity when it names none. */
function latestYear(item: CareerSortable): number {
  if (item.years === null) return Number.NEGATIVE_INFINITY;
  if (/^(nu|sinds)\b/i.test(item.years.nl)) return Number.POSITIVE_INFINITY;
  const years = item.years.nl.match(/\d{4}/g);
  return years === null ? Number.NEGATIVE_INFINITY : Math.max(...years.map(Number));
}

function earliestYear(item: CareerSortable): number {
  const years = item.years?.nl.match(/\d{4}/g);
  return years === null || years === undefined ? Number.NEGATIVE_INFINITY : Math.min(...years.map(Number));
}

/** Newest first by the latest year shown, then by the later start; entries with no year last. */
export function sortCareerNewestFirst<T extends CareerSortable>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      (latestYear(b) === latestYear(a) ? 0 : latestYear(b) > latestYear(a) ? 1 : -1) ||
      (earliestYear(b) === earliestYear(a) ? 0 : earliestYear(b) > earliestYear(a) ? 1 : -1) ||
      Number(b.current) - Number(a.current),
  );
}

// Position holders ----------------------------------------------------------------

export type HolderState =
  | { kind: "holders" }
  | { kind: "vacant" }
  | { kind: "members"; count: number }
  | { kind: "ended"; date: string }
  | { kind: "unknown" };

/**
 * What a position page says about its holder. Vacant only when a source says
 * so; a position with no tenure on record is "unknown", never "vacant".
 */
export function holderState(input: {
  currentHolders: number;
  lastEnded: string | null;
  vacancy: boolean;
  /** Current members of the body when the position is a plain "Lid ..." seat. */
  memberCount: number;
}): HolderState {
  if (input.currentHolders > 0) return { kind: "holders" };
  if (input.vacancy) return { kind: "vacant" };
  if (input.memberCount > 0) return { kind: "members", count: input.memberCount };
  if (input.lastEnded !== null) return { kind: "ended", date: input.lastEnded };
  return { kind: "unknown" };
}

// Description dates -----------------------------------------------------------------

/**
 * Dates written as dd-MM-yyyy in a description that no structured tenure or
 * membership date of the person matches. They are returned as ISO dates. The
 * description is sourced text and stays as it is; the page notes the mismatch.
 */
export function descriptionDateConflicts(description: string, structuredDates: Array<string | null | undefined>): string[] {
  const known = new Set(structuredDates.filter((date): date is string => typeof date === "string").map((date) => date.slice(0, 10)));
  const found = new Set<string>();
  for (const match of description.matchAll(/\b(\d{2})-(\d{2})-(\d{4})\b/g)) {
    const iso = `${match[3]}-${match[2]}-${match[1]}`;
    if (!known.has(iso)) found.add(iso);
  }
  return [...found];
}
