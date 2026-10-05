export type Confidence = "high" | "medium" | "low";

export type SourceRef = {
  source: string;
  retrieved: string;
  confidence: Confidence;
};

export type LegalRef = {
  label: string;
  url: string;
};

export type OrgType =
  | "department"
  | "elected"
  | "commission"
  | "advisory"
  | "dept_head"
  | "constituency";

export type OrgSubtype =
  | "koepel"
  | "kiesgerechtigden-nederland"
  | "kiezers-caribisch-nederland"
  | "tweede-kamer"
  | "eerste-kamer"
  | "provinciale-staten"
  | "gemeenteraad"
  | "algemeen-bestuur-waterschap"
  | "eilandsraad"
  | "europees-parlement"
  | "ministerie"
  | "agentschap"
  | "uitvoeringsorganisatie"
  | "inspectie"
  | "zbo"
  | "rwt"
  | "toezichthouder"
  | "rechterlijke-instantie"
  | "hoge-college"
  | "adviescollege"
  | "planbureau"
  | "kiesraad"
  | "provincie"
  | "gemeente"
  | "waterschap"
  | "openbaar-lichaam-bes"
  | "samenwerkingsverband"
  | "veiligheidsregio"
  | "defensieonderdeel"
  | "koninkrijksorgaan"
  | "land-regering"
  | "staten-land"
  | "staatscommissie"
  | "commissie"
  | "raad-van-advies";

export type OrgBranch =
  | "regering"
  | "staten-generaal"
  | "rechterlijke-macht"
  | "hoge-colleges"
  | "adviescolleges"
  | "decentraal-provinciaal"
  | "decentraal-lokaal"
  | "waterschap"
  | "caribisch-nederland"
  | "koninkrijk"
  | "zelfstandig";

export type OrgLevel = "rijk" | "provinciaal" | "regionaal" | "lokaal" | "caribisch" | "koninkrijk";

export type EmployeeCount = {
  budgeted: number | null;
  actual: number | null;
  year: number | null;
};

export type Organization = {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  type: OrgType;
  subtype: OrgSubtype;
  branch: OrgBranch;
  level: OrgLevel;
  country: string;
  parent: string | null;
  partOf: string[];
  description: string | null;
  legalSource?: LegalRef | null;
  website?: string | null;
  established: string | null;
  dissolved: string | null;
  seatsCount: number | null;
  employeeCount?: EmployeeCount;
  images: string[];
  sources: SourceRef[];
};

export type FillMethod =
  | "verkiezing"
  | "koninklijk-besluit"
  | "benoeming-door-college"
  | "benoeming-door-minister"
  | "van-rechtswege"
  | "cooptatie";

export type EntryMode =
  | "benoemd"
  | "benoemd-bij-kb"
  | "gekozen"
  | "waarnemend"
  | "plaatsvervangend"
  | "van-rechtswege";

export type Position = {
  id: string;
  slug: string;
  title: string;
  organization: string;
  type: OrgType;
  fillMethod?: FillMethod | null;
  entryModes: EntryMode[];
  termLengthMonths: number | null;
  seatsCount: number | null;
  legalBasis?: LegalRef | null;
  exOfficioOf: string[];
  sources: SourceRef[];
};

export type Person = {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  portrait: string | null;
  birthDate: string | null;
  party: string | null;
  wikipedia: string | null;
  wikidata: string | null;
  description: string | null;
  sources: SourceRef[];
};

export type EndReason = "aftreden" | "ontslag" | "einde-termijn" | "overlijden" | "reorganisatie";

export type Tenure = {
  id: string;
  person: string;
  position: string;
  seat: number | null;
  /** Null when the source names the holder but not when the tenure began (ADR 0020). */
  start: string | null;
  end: string | null;
  acting: boolean;
  entryMode: EntryMode | null;
  appointedBy: string | null;
  predecessor: string | null;
  successor: string | null;
  endReason: EndReason | null;
  source: SourceRef;
};

export type Membership = {
  id: string;
  organization: string;
  person: string;
  seatNumber: number | null;
  fractie: string | null;
  start: string;
  end: string | null;
  source: SourceRef;
};

export type RelationType =
  | "elects"
  | "appoints"
  | "oversees"
  | "advises"
  | "office"
  | "dept_head"
  | "confirms"
  | "ex_officio"
  | "administers"
  | "subsidises"
  | "accountable_to"
  | "part_of"
  | "consists_of"
  | "succeeded_by"
  | "joint_arrangement_member";

export type Relation = {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  metadata: Record<string, unknown>;
  /** Date the relation came into force; null when unknown or undated. */
  validFrom?: string | null;
  /** Date the relation ended; null while current. */
  validTo?: string | null;
  /** The relation that replaced this one, for example after a portfolio move. */
  supersededBy?: string | null;
  seatsAppointed: number | null;
  source: SourceRef;
};

export type SeatResult = {
  /** Party key as used in parties.ts and memberships.fractie. */
  party: string;
  seats: number;
  votes?: number | null;
  share?: number | null;
};

export type Election = {
  id: string;
  body: string;
  date: string;
  kind?: "regulier" | "vervroegd" | null;
  seatsTotal: number;
  turnout?: number | null;
  validVotes?: number | null;
  seats: SeatResult[];
  notes?: string | null;
  source: SourceRef;
};

export type CoalitionKind = "meerderheid" | "minderheid" | "rompkabinet" | "zakenkabinet";

export type Coalition = {
  id: string;
  government: string;
  name: string;
  parties: string[];
  start: string;
  end: string | null;
  demissionairSince?: string | null;
  primeMinister?: string | null;
  agreement?: string | null;
  kind?: CoalitionKind | null;
  notes?: string | null;
  source: SourceRef;
};

export type SourceType = "wet" | "kb" | "api" | "page" | "news" | "register";

export type Source = {
  id: string;
  url: string;
  title: string;
  publisher: string;
  type: SourceType;
  published: string | null;
  retrieved: string;
  license: string | null;
  archiveUrl: string | null;
  notes: string | null;
};

export type Government = {
  slug: string;
  name: string;
  type: "koninkrijk" | "land" | "scope";
  level: OrgLevel;
  country: string;
  parent: string | null;
  description: string | null;
  sources: SourceRef[];
};

export type ChangeKind =
  | "tenure-between"
  | "appointment"
  | "departure"
  | "structural"
  | "vacancy"
  | "rename"
  | "move";

export type ChangeSide = {
  tenure: string | null;
  person: string | null;
  label: string;
};

export type Change = {
  id: string;
  date: string;
  kind: ChangeKind;
  position: string | null;
  organization: string | null;
  out?: ChangeSide;
  in?: ChangeSide;
  summary: string;
  source: SourceRef;
};

export type NewsLanguage = "nl" | "en";

export type PublisherKind =
  | "publieke-omroep"
  | "krant"
  | "commerciele-omroep"
  | "online"
  | "video"
  | "nieuwsbrief"
  | "blog"
  | "vakmedia"
  | "overheid";

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  published: string;
  /** Language of the title and summary as published. Absent means "nl". */
  language?: NewsLanguage;
  /** Kind of outlet. Absent means "online". */
  publisherKind?: PublisherKind;
  summary: string | null;
  summaryMarkup: string | null;
  entities: string[];
  topics: string[];
  /** Matched alias strings that produced the entity links. */
  keywords?: string[];
  image: string | null;
  /** Feed-supplied preview image URL, shown as a remote preview. Absent or null means none. */
  imageUrl?: string | null;
  sources: SourceRef[];
};

/**
 * A machine translation of a news item's headline and lead into the other
 * interface language (data/news-translations.json, docs/adr/0016). Shown only
 * while `sourceHash` matches the current item.
 */
export type NewsTranslation = {
  id: string;
  language: NewsLanguage;
  sourceLanguage: NewsLanguage;
  title: string;
  /** The translated lead, entity tags preserved; null when the item has no lead. */
  lead: string | null;
  sourceHash: string;
  engine: string;
  method: string;
  translated: string;
};

export type Topic = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  organizations: string[];
  positions: string[];
  keywords: string[];
  sources?: SourceRef[];
  trending?: boolean;
};

export type AmountSet = {
  spendingBudget: number | null;
  spendingActual: number | null;
  revenue: number | null;
  net: number | null;
  nonprofit: number | null;
};

export type Budget = {
  organization: string;
  fiscalYear: number;
  unit: string | null;
  current?: AmountSet | null;
  previous?: AmountSet | null;
  history: { fiscalYear: number; spendingActual: number | null; revenue: number | null }[];
  breakdown: { category: string; amount: number | null; type: "spending" | "revenue" }[];
  rankings?: Record<string, unknown>;
  sources: SourceRef[];
};

export type MediaItem = {
  id: string;
  url: string;
  type: "portrait" | "logo" | "photo";
  license: string;
  credit: string;
  author: string | null;
  width: number | null;
  height: number | null;
  source: string;
};

/** Kind of a parliamentary item in data/activities.json (Zaak.Soort in the TK Gegevensmagazijn). */
export type ActivityKind = "motie" | "amendement" | "initiatiefwetsvoorstel" | "wetsvoorstel" | "schriftelijke-vragen";

/** Outcome from a "Stemmen - ..." Besluit; null when the data holds none. */
export type ActivityOutcome = "aangenomen" | "verworpen" | "aangehouden" | "ingetrokken" | "vervallen";

export type ActivityRole = "indiener" | "medeindiener";

export type ActivityCoSubmitter = {
  person: string | null;
  name: string;
  party: string | null;
  role: ActivityRole;
};

export type ActivityItem = {
  id: string;
  role: ActivityRole;
  kind: ActivityKind;
  title: string;
  date: string;
  kamerstuk: string | null;
  outcome: ActivityOutcome | null;
  coSubmitters: ActivityCoSubmitter[];
  url: string;
};

/** One person's proposals and motions since the start of the previous term (pipelines/parliament-activity.mjs). */
export type PersonActivity = {
  id: string;
  person: string;
  tkPersoon: string;
  since: string;
  totals: Record<ActivityKind, number>;
  items: ActivityItem[];
  source: SourceRef;
};

/** English text for a Dutch description (data/description-translations.json). */
export type DescriptionTranslation = {
  id: string;
  field: "description";
  language: "en";
  text: string;
  /** First 12 hex characters of sha256 of the Dutch description it was made from. */
  sourceHash: string;
};

/** A description that only talks about where it came from (data/description-flags.json). */
export type DescriptionFlag = {
  id: string;
  provenanceOnly: boolean;
  reason?: string;
};

export type CareerKind = "beroep" | "politiek" | "loopbaan" | "nevenfunctie" | "opleiding";

/** One step in a person's career (data/careers.json). */
export type CareerEntry = {
  id: string;
  person: string;
  title: string;
  organization: string | null;
  organizationId: string | null;
  start?: string | null;
  end?: string | null;
  current?: boolean;
  kind: CareerKind;
  /** A source reference, a source id, or a URL; readers tolerate each form. */
  source: SourceRef | string | { url: string; publisher?: string; title?: string; retrieved?: string } | null;
};
