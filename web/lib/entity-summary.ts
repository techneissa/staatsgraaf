import { positionEn } from "./name-gloss";
import {
  getDataset,
  getMembershipsForPerson,
  getOrganizationById,
  getPersonById,
  getPositionById,
  getTenuresForPerson,
  getTenuresForPosition,
} from "./data";
import { titleNamesBody } from "./changes";
import { formatCountIn, formatDateIn } from "./format";
import { ORG_SUBTYPE_LABELS, ORG_SUBTYPE_LABELS_EN } from "./labels";
import type { Membership, Organization, OrgType, Person, Position, Tenure } from "./types";

/**
 * One-line summaries of a person, organisation or position, built only from
 * the dataset, in Dutch and English. Dutch entity names and titles stay as
 * they are. Null when nothing useful is known, so the page shows nothing.
 */
export type Summary = { nl: string; en: string };

type Clause = { nl: string; en: string; start: string | null };

function joinList(items: string[], word: string): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${word} ${items[items.length - 1]}`;
}

function since(start: string | null, locale: "nl" | "en"): string {
  if (start === null) return "";
  return locale === "en" ? ` since ${formatDateIn(start, "en")}` : ` sinds ${formatDateIn(start, "nl")}`;
}

/** Clauses that share a start date read as one: "A en B sinds 23 februari 2026". */
function composeClauses(clauses: Clause[]): Summary | null {
  if (clauses.length === 0) return null;
  const groups: Clause[][] = [];
  for (const clause of clauses) {
    const group = groups.find((candidate) => candidate[0].start === clause.start);
    if (group) group.push(clause);
    else groups.push([clause]);
  }
  const render = (locale: "nl" | "en") =>
    groups
      .map((group) => {
        const labels = group.map((clause) => clause[locale]);
        return `${joinList(labels, locale === "en" ? "and" : "en")}${since(group[0].start, locale)}`;
      })
      .join("; ");
  return { nl: render("nl"), en: render("en") };
}

// People ---------------------------------------------------------------------

function roleRank(position: Position, organization: Organization | undefined): number {
  const title = position.title;
  if (/^Koning(in)?\b/.test(title)) return 0;
  if (/^Minister-president/i.test(title)) return 1;
  if (/^(Vice-)?Minister/i.test(title)) return 2;
  if (/^(Staatssecretaris|Minister van Staat)/i.test(title)) return 3;
  if (/^(Commissaris van de Koning|Gouverneur|Burgemeester|Gezaghebber|Dijkgraaf)/i.test(title)) return 3;
  if (/^(Vice-president|President|Voorzitter)/i.test(title)) return 4;
  if (/^Fractievoorzitter/i.test(title)) return 5;
  if (organization?.subtype === "commissie") return 9;
  if (position.type === "dept_head") return 4;
  if (position.type === "commission") return 7;
  return 6;
}

/** Chambers and councils a person sits in: "Tweede Kamerlid" rather than "Lid van de Tweede Kamer der Staten-Generaal". */
function membershipLabel(organization: Organization): Summary {
  if (organization.subtype === "tweede-kamer") return { nl: "Tweede Kamerlid", en: "Member of the Tweede Kamer" };
  if (organization.subtype === "eerste-kamer") return { nl: "Eerste Kamerlid", en: "Member of the Eerste Kamer" };
  return { nl: `Lid van ${organization.name}`, en: `Member of ${organization.name}` };
}

/** "de PVV", "D66", "GroenLinks-PvdA": Dutch uses the article only for letter abbreviations. */
function partyWithArticle(party: string): string {
  return /^[A-Z]{2,}$/.test(party) && party !== "DENK" ? `de ${party}` : party;
}

function roleLabel(position: Position, organization: Organization | undefined): Summary {
  const showBody =
    organization !== undefined &&
    organization.subtype !== "land-regering" &&
    organization.id !== "org:regering" &&
    !titleNamesBody(position.title, organization.name);
  // English uses the established English title where one exists (ADR 0012); the Dutch title otherwise.
  const titleEn = positionEn(position.title) ?? position.title;
  if (!showBody) return { nl: position.title, en: titleEn };
  // An English title that already names its body ("Minister of Finance") needs no "at Ministerie van Financiën".
  if (titleEn !== position.title && /\b(of|for)\b/.test(titleEn)) return { nl: `${position.title} bij ${organization.name}`, en: titleEn };
  return { nl: `${position.title} bij ${organization.name}`, en: `${titleEn} at ${organization.name}` };
}

export function personSummary(person: Person): Summary | null {
  const current = getTenuresForPerson(person.id).filter((tenure) => tenure.end === null);
  const memberships = getMembershipsForPerson(person.id)
    .filter((membership) => membership.end === null)
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));

  type Role = { tenure: Tenure; position: Position; organization: Organization | undefined; rank: number };
  let roles: Role[] = [];
  for (const tenure of current) {
    const position = getPositionById(tenure.position);
    if (!position) continue;
    const organization = getOrganizationById(position.organization);
    roles.push({ tenure, position, organization, rank: roleRank(position, organization) });
  }
  // "Minister van Defensie Stichting Defensiemusea" repeats "Minister van Defensie".
  roles = roles.filter(
    (role) => !roles.some((other) => other !== role && role.position.title.startsWith(`${other.position.title} `)),
  );
  roles.sort((a, b) => a.rank - b.rank || (a.tenure.start ?? "").localeCompare(b.tenure.start ?? ""));

  const membership: Membership | undefined = memberships[0];
  const membershipOrg = membership ? getOrganizationById(membership.organization) : undefined;

  const clauses: Clause[] = [];
  const leading = roles.filter((role) => role.rank <= 3);
  const trailing = roles.filter((role) => role.rank > 3 && role.rank < 9);
  const partyAbbrev = membership?.fractie ?? person.party ?? null;

  for (const role of leading.slice(0, 2)) {
    const label = roleLabel(role.position, role.organization);
    clauses.push({ ...label, start: role.tenure.start });
  }

  if (membership && membershipOrg) {
    const label = membershipLabel(membershipOrg);
    const fractie = membership.fractie;
    clauses.push({
      nl: fractie ? `${label.nl} voor ${partyWithArticle(fractie)}` : label.nl,
      en: fractie ? `${label.en} for ${fractie}` : label.en,
      start: membership.start,
    });
    // The group leader of the same chamber folds into the membership line.
    const leader = trailing.find(
      (role) => /^Fractievoorzitter/i.test(role.position.title) && role.position.organization === membershipOrg.id,
    );
    if (leader) clauses.push({ nl: "fractievoorzitter", en: "parliamentary group leader", start: leader.tenure.start });
  }

  if (clauses.length < 2) {
    for (const role of trailing) {
      if (clauses.length >= 2) break;
      if (membershipOrg && role.position.organization === membershipOrg.id && /^Fractievoorzitter/i.test(role.position.title)) continue;
      clauses.push({ ...roleLabel(role.position, role.organization), start: role.tenure.start });
    }
  }

  if (clauses.length === 0) {
    const committee = roles.find((role) => role.rank === 9);
    if (committee) clauses.push({ ...roleLabel(committee.position, committee.organization), start: committee.tenure.start });
  }

  // Name the party once when no membership line carries it.
  if (clauses.length > 0 && !membership && partyAbbrev !== null) {
    clauses[0] = { ...clauses[0], nl: `${clauses[0].nl} (${partyAbbrev})`, en: `${clauses[0].en} (${partyAbbrev})` };
  }
  return composeClauses(clauses);
}

// Organisations ----------------------------------------------------------------

const TYPE_SINGULAR: Record<OrgType, Summary> = {
  department: { nl: "Orgaan", en: "Body" },
  elected: { nl: "Gekozen orgaan", en: "Elected body" },
  commission: { nl: "Commissie", en: "Committee" },
  advisory: { nl: "Adviesorgaan", en: "Advisory body" },
  dept_head: { nl: "Orgaan", en: "Body" },
  constituency: { nl: "Kiesgerechtigden", en: "Electorate" },
};

const COUNTRY_NAMES: Record<string, string> = {
  aruba: "Aruba",
  curacao: "Curaçao",
  "sint-maarten": "Sint Maarten",
};

/** Where an organisation sits when it has no parent in the dataset. */
function placePhrase(organization: Organization): Summary | null {
  const country = COUNTRY_NAMES[organization.country];
  if (country !== undefined) return { nl: `van ${country}`, en: `of ${country}` };
  // A gemeente, provincie or waterschap names its own level.
  if (["gemeente", "provincie", "waterschap", "gemeenteraad", "provinciale-staten"].includes(organization.subtype)) return null;
  switch (organization.branch) {
    case "regering":
    case "zelfstandig":
    case "adviescolleges":
      return { nl: "in de rijksoverheid", en: "in the central government" };
    case "staten-generaal":
      return { nl: "in de Staten-Generaal", en: "in the Staten-Generaal" };
    case "rechterlijke-macht":
      return { nl: "in de rechterlijke macht", en: "in the judiciary" };
    case "caribisch-nederland":
      return { nl: "in Caribisch Nederland", en: "in the Caribbean Netherlands" };
    case "koninkrijk":
      return { nl: "in het Koninkrijk", en: "in the Kingdom" };
    default:
      break;
  }
  switch (organization.level) {
    case "regionaal":
      return { nl: "op regionaal niveau", en: "at regional level" };
    case "provinciaal":
      return { nl: "op provinciaal niveau", en: "at provincial level" };
    default:
      return null;
  }
}

let childIndex: Map<string, Organization[]> | null = null;

/** Organisations whose parent or partOf names this one. */
export function childOrganizations(id: string): Organization[] {
  if (!childIndex) {
    childIndex = new Map();
    for (const organization of getDataset().organizations) {
      const parents = new Set<string>();
      if (typeof organization.parent === "string") parents.add(organization.parent);
      if (Array.isArray(organization.partOf)) for (const item of organization.partOf) parents.add(item);
      for (const parent of parents) {
        const list = childIndex.get(parent);
        if (list) list.push(organization);
        else childIndex.set(parent, [organization]);
      }
    }
  }
  return childIndex.get(id) ?? [];
}

export function organizationSummary(
  organization: Organization,
  options: { omitChildren?: boolean } = {},
): Summary | null {
  const subtypeNl = ORG_SUBTYPE_LABELS[organization.subtype] ?? organization.subtype;
  const subtypeEn = ORG_SUBTYPE_LABELS_EN[organization.subtype] ?? subtypeNl;
  // "Tweede Kamer der Staten-Generaal" already says "Tweede Kamer"; lead with the kind of body instead.
  const nameRepeatsSubtype =
    subtypeNl.includes(" ") && organization.name.toLowerCase().startsWith(subtypeNl.toLowerCase());
  const lead = nameRepeatsSubtype ? TYPE_SINGULAR[organization.type] : { nl: subtypeNl, en: subtypeEn };

  let place: Summary | null = null;
  const parent = typeof organization.parent === "string" ? getOrganizationById(organization.parent) : undefined;
  if (parent) {
    place =
      organization.type === "commission" || organization.type === "elected"
        ? { nl: `van ${parent.name}`, en: `of ${parent.name}` }
        : { nl: `onder ${parent.name}`, en: `within ${parent.name}` };
  } else {
    place = placePhrase(organization);
  }

  const extras: Summary[] = [];
  const childList = childOrganizations(organization.id);
  const children = childList.length;
  if (children > 0 && options.omitChildren !== true) {
    const committees = childList.every((child) => child.type === "commission" && child.subtype === "commissie");
    extras.push(
      committees
        ? {
            nl: `${formatCountIn(children, "nl")} ${children === 1 ? "commissie" : "commissies"}`,
            en: `${formatCountIn(children, "en")} ${children === 1 ? "committee" : "committees"}`,
          }
        : {
            nl: `${formatCountIn(children, "nl")} ${children === 1 ? "organisatie" : "organisaties"} onder zich`,
            en: `${formatCountIn(children, "en")} ${children === 1 ? "organisation" : "organisations"} under it`,
          },
    );
  }
  if (typeof organization.seatsCount === "number" && organization.seatsCount > 0) {
    const n = organization.seatsCount;
    extras.push({
      nl: `${formatCountIn(n, "nl")} ${n === 1 ? "zetel" : "zetels"}`,
      en: `${formatCountIn(n, "en")} ${n === 1 ? "seat" : "seats"}`,
    });
  }

  if (place === null && extras.length === 0) return null;
  const build = (locale: "nl" | "en") =>
    [[lead[locale], place?.[locale]].filter(Boolean).join(" "), ...extras.map((extra) => extra[locale])].join(", ");
  return { nl: build("nl"), en: build("en") };
}

// Positions ------------------------------------------------------------------

export function positionSummary(position: Position): Summary | null {
  const current = getTenuresForPosition(position.id)
    .filter((tenure) => tenure.end === null)
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  if (current.length === 0) return null;
  const names = current
    .map((tenure) => getPersonById(tenure.person)?.name)
    .filter((name): name is string => typeof name === "string");
  if (names.length === 0) return null;

  if (current.length === 1) {
    const tenure = current[0];
    return tenure.acting
      ? {
          nl: `Waargenomen door ${names[0]}${since(tenure.start, "nl")}`,
          en: `Held in an acting capacity by ${names[0]}${since(tenure.start, "en")}`,
        }
      : {
          nl: `Bekleed door ${names[0]}${since(tenure.start, "nl")}`,
          en: `Held by ${names[0]}${since(tenure.start, "en")}`,
        };
  }
  if (names.length <= 3) {
    return { nl: `Bekleed door ${joinList(names, "en")}`, en: `Held by ${joinList(names, "and")}` };
  }
  const seats = position.seatsCount ?? null;
  if (seats !== null && seats >= current.length) {
    return {
      nl: `${formatCountIn(current.length, "nl")} van ${formatCountIn(seats, "nl")} zetels bezet`,
      en: `${formatCountIn(current.length, "en")} of ${formatCountIn(seats, "en")} seats filled`,
    };
  }
  return {
    nl: `${formatCountIn(current.length, "nl")} huidige bekleders`,
    en: `${formatCountIn(current.length, "en")} current holders`,
  };
}
