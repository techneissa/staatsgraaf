import type { LocString } from "./i18n/locales";

/**
 * Official party colours for the people and factions in the dataset.
 *
 * This table is a sourced data file, not free design choice: every colour carries
 * the source it came from and a retrieval date. Hex values stay lowercase
 * without alpha. NULL colour means no sourced colour exists; such parties
 * render in neutral grey and never get an invented value.
 */
export type PartyRecord = {
  key: string;
  abbrev: string;
  name: LocString;
  color: string | null;
  website: string | null;
  wiki: string | null;
  confidence: "high" | "medium" | "low";
  source: string | null;
  /** ISO retrieval date for the colour source. */
  retrieved: string;
  /** Recognised as a key in elections and coalitions, but without a page or a place in the index. */
  unlisted?: true;
  /**
   * The party's programme for the Tweede Kamer election of 29-10-2025, as
   * fetched live on the party's own site. Null for parties that were not
   * researched (the unlisted, historical ones).
   */
  program: PartyProgram | null;
};

/**
 * Where a party's election programme lives. Every URL was fetched and
 * confirmed (HTTP 200, and for a PDF its first page read) on the retrieval
 * date; nothing is constructed. A null `url` with a `note` is a named gap.
 */
export type PartyProgram = {
  /** The programme page on the party's own site, or null when none was found. */
  url: string | null;
  /** The programme document itself, when the page links a separate file. It may be hosted off the party domain. */
  document: string | null;
  /** ISO retrieval date. */
  retrieved: string;
  note?: string;
};

const PROGRAM_RETRIEVED = "2026-09-25";

function program(url: string | null, document: string | null, note?: string): PartyProgram {
  return note ? { url, document, retrieved: PROGRAM_RETRIEVED, note } : { url, document, retrieved: PROGRAM_RETRIEVED };
}

const GL_PVDA_2025 = "https://groenlinkspvda.nl/wp-content/uploads/2025/10/GroenLinks-PvdA-Verkiezingsprogramma-2025.pdf";

/** Programmes for the Tweede Kamer election of 29-10-2025, by registry key (research of 25-09-2026). */
const PROGRAMS: Record<string, PartyProgram> = {
  VVD: program("https://www.vvd.nl/verkiezingsprogramma", "https://www.vvd.nl/wp-content/uploads/2025/09/Verkiezingsprogramma-TK-VVD-2025-DEF.pdf"),
  D66: program("https://d66.nl/verkiezingsprogramma/", "https://media.d66.nl/uploads/2026/04/D66-Verkiezingsprogramma-2025-2030-2-1.pdf"),
  CDA: program(
    "https://www.cda.nl/verkiezingsprogramma",
    "https://d2vs36cx04qmpo.cloudfront.net/files/Algemene-webpagina/Documenten-en-reglementen-CDA/CDA-Verkiezingsprogramma-TK2025-Digitaal-DEFINHOUD.pdf",
    "The page redirects to cda.nl/themas; the PDF sits on the CDN cda.nl links to.",
  ),
  PvdA: program(null, GL_PVDA_2025, "Joint GroenLinks-PvdA list in 2025; pvda.nl refused automated requests, so no PvdA landing page was confirmed."),
  PVV: program("https://www.pvv.nl/verkiezingsprogramma.html", "https://www.pvv.nl/images/2025/PVV_Programma_Digi_2025.pdf"),
  SP: program("https://www.sp.nl/programma", "https://cdn.sp.nl/2025/09/SP-verkiezingsprogramma-TK2025.pdf"),
  SGP: program(
    "https://sgp.nl/verkiezingsprogramma",
    "https://sgp.nl/download?docID=0bf38fdb632c316533a714ca801a54df72a99572&name=Verkiezingsprogramma_SGP_2025%20eindversie.pdf",
  ),
  CU: program("https://www.christenunie.nl/verkiezingsprogramma", "https://www.christenunie.nl/wp-content/uploads/2025/10/Verkiezingsprogramma_2025_CU.pdf"),
  PvdD: program(
    "https://www.partijvoordedieren.nl/partijprogrammas/tweede-kamerverkiezingen-2025",
    "https://assets.partijvoordedieren.nl/assets/algemeen/PVDD-programma-tweede-kamerverkiezingen-okt-2025.pdf",
  ),
  GL: program(null, GL_PVDA_2025, "Joint GroenLinks-PvdA list in 2025; its landing page now redirects to the PRO standpunten page."),
  FVD: program(
    "https://fvd.nl/verkiezingsprogramma",
    "https://res.cloudinary.com/fvdcdm/image/upload/v1759824498/FVD_verkiezingsprogramma-2025_A4_FORMAAT_digitaal-DEF-V5_t8qcsr.pdf",
    "The fvd.nl address redirects straight to the PDF on Cloudinary.",
  ),
  JA21: program("https://ja21.nl/partij-programma", "https://ja21.nl/fileadmin/user_upload/04_Documenten/Verkiezingsprogramma_TK_25_A4_v15.pdf"),
  BBB: program(
    "https://boerburgerbeweging.nl/tweede-kamer/verkiezingsprogramma/",
    "https://ss-usa.s3.amazonaws.com/c/308478465/media/246468b40c26613d954532264619583/BBB%20Verkiezingsprogramma%20TK25%20-%20versie%2020250830%20-.pdf",
  ),
  DENK: program("https://denk.nl/verkiezingsprogramma/", "https://denk.nl/download/379641/"),
  Volt: program("https://voltnederland.org/verkiezingsprogramma-2025", "https://voltnederland.org/storage/doc/volt_verkiezingsprogramma_2025.pdf"),
  "50PLUS": program(
    "https://www.50pluspartij.nl/verkiezingsprogramma-50plus/",
    "https://www.50pluspartij.nl/wp-content/uploads/2025/09/Verkiezingsprogramma_2025-2029_50PLUS.pdf",
  ),
  NSC: program(
    "https://partijnieuwsociaalcontract.nl/publicaties",
    "https://ams3.digitaloceanspaces.com/nsc-multisite/verkiezingsprogramma_1509_2_ca4765c16c.pdf",
    "The party publishes on partijnieuwsociaalcontract.nl.",
  ),
  PRO: program(
    "https://progressiefnederland.nl/standpunten/",
    GL_PVDA_2025,
    "PRO did not exist in 2025; the 2025 programme is that of the joint GroenLinks-PvdA list.",
  ),
  OPNL: program(null, null, "An Eerste Kamer party; no Tweede Kamer programme for 2025 on opnl.nl."),
  FNP: program(null, null, "A Frisian regional party; no Tweede Kamer programme for 2025 on fnp.frl."),
  "Water Natuurlijk": program(null, null, "A waterschap party; it did not stand for the Tweede Kamer."),
  "Groep Markuszower": program(null, null, "A group split off in the Tweede Kamer; no party site or 2025 programme found."),
};

export const PARTIES: PartyRecord[] = [
  {
    key: "VVD",
    abbrev: "VVD",
    name: { nl: "Volkspartij voor Vrijheid en Democratie", en: "People's Party for Freedom and Democracy" },
    color: "#FF6400",
    website: "https://www.vvd.nl",
    wiki: "https://nl.wikipedia.org/wiki/Volkspartij_voor_Vrijheid_en_Democratie",
    confidence: "high",
    source: "https://www.vvd.nl",
    program: PROGRAMS["VVD"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "D66",
    abbrev: "D66",
    name: { nl: "Democraten 66", en: "Democrats 66" },
    color: "#00AE41",
    website: "https://d66.nl",
    wiki: "https://nl.wikipedia.org/wiki/Democraten_66",
    confidence: "high",
    source: "https://d66.nl",
    program: PROGRAMS["D66"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "CDA",
    abbrev: "CDA",
    name: { nl: "Christen-Democratisch Appèl", en: "Christian Democratic Appeal" },
    color: "#2CC84D",
    website: "https://cda.nl",
    wiki: "https://nl.wikipedia.org/wiki/Christen-Democratisch_App%C3%A8l",
    confidence: "medium",
    source: "https://cda.nl",
    program: PROGRAMS["CDA"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "PvdA",
    abbrev: "PvdA",
    name: { nl: "Partij van de Arbeid", en: "Labour Party" },
    color: "#E00913",
    website: "https://pvda.nl",
    wiki: "https://nl.wikipedia.org/wiki/Partij_van_de_Arbeid_(Nederland)",
    confidence: "medium",
    source: "https://nl.wikipedia.org/wiki/Partij_van_de_Arbeid_(Nederland)",
    program: PROGRAMS["PvdA"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "PVV",
    abbrev: "PVV",
    name: { nl: "Partij voor de Vrijheid", en: "Party for Freedom" },
    color: "#012758",
    website: "https://www.pvv.nl",
    wiki: "https://nl.wikipedia.org/wiki/Partij_voor_de_Vrijheid",
    confidence: "medium",
    source: "https://nl.wikipedia.org/wiki/Partij_voor_de_Vrijheid",
    program: PROGRAMS["PVV"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "SP",
    abbrev: "SP",
    name: { nl: "Socialistische Partij", en: "Socialist Party" },
    color: "#E9161D",
    website: "https://www.sp.nl",
    wiki: "https://nl.wikipedia.org/wiki/Socialistische_Partij",
    confidence: "high",
    source: "https://www.sp.nl",
    program: PROGRAMS["SP"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "SGP",
    abbrev: "SGP",
    name: { nl: "Staatkundig Gereformeerde Partij", en: "Reformed Political Party" },
    color: "#EA5D06",
    website: "https://www.sgp.nl",
    wiki: "https://nl.wikipedia.org/wiki/Staatkundig_Gereformeerde_Partij",
    confidence: "medium",
    source: "https://nl.wikipedia.org/wiki/Staatkundig_Gereformeerde_Partij",
    program: PROGRAMS["SGP"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "CU",
    abbrev: "CU",
    name: { nl: "ChristenUnie", en: "Christian Union" },
    color: "#00A7EB",
    website: "https://www.christenunie.nl",
    wiki: "https://nl.wikipedia.org/wiki/ChristenUnie",
    confidence: "medium",
    source: "https://nl.wikipedia.org/wiki/ChristenUnie",
    program: PROGRAMS["CU"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "PvdD",
    abbrev: "PvdD",
    name: { nl: "Partij voor de Dieren", en: "Party for the Animals" },
    color: "#00743C",
    website: "https://www.partijvoordedieren.nl",
    wiki: "https://nl.wikipedia.org/wiki/Partij_voor_de_Dieren",
    confidence: "high",
    source: "https://commons.wikimedia.org/wiki/File:Partij_voor_de_Dieren_icon.svg",
    program: PROGRAMS["PvdD"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "GL",
    abbrev: "GL",
    name: { nl: "GroenLinks", en: "GreenLeft" },
    color: "#39A935",
    website: "https://www.groenlinks.nl",
    wiki: "https://nl.wikipedia.org/wiki/GroenLinks",
    confidence: "medium",
    source: "https://nl.wikipedia.org/wiki/GroenLinks",
    program: PROGRAMS["GL"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "FVD",
    abbrev: "FvD",
    name: { nl: "Forum voor Democratie", en: "Forum for Democracy" },
    color: "#A71C20",
    website: "https://www.forumvoordemocratie.nl",
    wiki: "https://nl.wikipedia.org/wiki/Forum_voor_Democratie",
    confidence: "medium",
    source: "https://nl.wikipedia.org/wiki/Forum_voor_Democratie",
    program: PROGRAMS["FVD"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "JA21",
    abbrev: "JA21",
    name: { nl: "JA21", en: "JA21" },
    color: "#1F2756",
    website: "https://ja21.nl",
    wiki: "https://nl.wikipedia.org/wiki/JA21",
    confidence: "medium",
    source: "https://nl.wikipedia.org/wiki/JA21",
    program: PROGRAMS["JA21"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "BBB",
    abbrev: "BBB",
    name: { nl: "BoerBurgerBeweging", en: "Farmer-Citizen Movement" },
    color: "#93C01F",
    website: "https://www.boerburgerbeweging.nl",
    wiki: "https://nl.wikipedia.org/wiki/BoerBurgerBeweging",
    confidence: "high",
    source: "https://commons.wikimedia.org/wiki/File:BoerBurgerBeweging_logo.svg",
    program: PROGRAMS["BBB"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "DENK",
    abbrev: "DENK",
    name: { nl: "DENK", en: "DENK" },
    color: "#00B7B2",
    website: "https://www.denk.nl",
    wiki: "https://nl.wikipedia.org/wiki/DENK_(politieke_partij)",
    confidence: "high",
    source: "https://www.denk.nl",
    program: PROGRAMS["DENK"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "Volt",
    abbrev: "Volt",
    name: { nl: "Volt Nederland", en: "Volt Netherlands" },
    color: "#502379",
    website: "https://voltnederland.org",
    wiki: "https://nl.wikipedia.org/wiki/Volt_Nederland",
    confidence: "high",
    source: "https://voltnederland.org",
    program: PROGRAMS["Volt"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "50PLUS",
    abbrev: "50PLUS",
    name: { nl: "50PLUS", en: "50PLUS" },
    color: "#84236D",
    website: "https://50pluspartij.nl",
    wiki: "https://nl.wikipedia.org/wiki/50PLUS",
    confidence: "high",
    source: "https://www.50pluspartij.nl",
    program: PROGRAMS["50PLUS"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "NSC",
    abbrev: "NSC",
    name: { nl: "Nieuw Sociaal Contract", en: "New Social Contract" },
    color: "#13123B",
    website: "https://nieuwsociaalcontract.nl",
    wiki: "https://nl.wikipedia.org/wiki/Nieuw_Sociaal_Contract",
    confidence: "medium",
    source: "https://nl.wikipedia.org/wiki/Nieuw_Sociaal_Contract",
    program: PROGRAMS["NSC"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "PRO",
    abbrev: "PRO",
    name: { nl: "Progressief Nederland", en: "Progressive Netherlands" },
    color: "#00AA00",
    website: null,
    wiki: "https://nl.wikipedia.org/wiki/Progressief_Nederland",
    confidence: "medium",
    source: "https://commons.wikimedia.org/wiki/File:Progressief_Nederland_logo_liggend.svg",
    program: PROGRAMS["PRO"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "OPNL",
    abbrev: "OPNL",
    name: { nl: "Onafhankelijke Politiek Nederland", en: "Independent Politics Netherlands" },
    color: "#0D2958",
    website: "https://www.opnl.nl",
    wiki: null,
    confidence: "medium",
    source: "https://www.opnl.nl",
    program: PROGRAMS["OPNL"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "FNP",
    abbrev: "FNP",
    name: { nl: "Fryske Nasjonale Partij", en: "Frisian National Party" },
    color: "#21366B",
    website: null,
    wiki: "https://nl.wikipedia.org/wiki/Fryske_Nasjonale_Partij",
    confidence: "high",
    source: "https://commons.wikimedia.org/wiki/File:Frisian_National_Party_logo_(2019%E2%80%93present).svg",
    program: PROGRAMS["FNP"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "Water Natuurlijk",
    abbrev: "Water Natuurlijk",
    name: { nl: "Water Natuurlijk", en: "Water Naturally" },
    color: "#0083F1",
    website: null,
    wiki: null,
    confidence: "high",
    source: "https://commons.wikimedia.org/wiki/File:Water_Natuurlijk_logo.svg",
    program: PROGRAMS["Water Natuurlijk"] ?? null,
    retrieved: "2026-09-18",
  },
  {
    key: "Groep Markuszower",
    abbrev: "Groep Markuszower",
    name: { nl: "Groep Markuszower", en: "Markuszower Group" },
    color: "#2F3C73",
    website: null,
    wiki: "https://nl.wikipedia.org/wiki/Groep_Markuszower",
    confidence: "medium",
    source: "https://nl.wikipedia.org/wiki/Groep_Markuszower",
    program: PROGRAMS["Groep Markuszower"] ?? null,
    retrieved: "2026-09-18",
  },
];

/**
 * Dataset spellings that differ from the canonical key, including the
 * one-member splinter factions that have no sourced colour of their own.
 */
const SPLINTER_GROUPS: Record<string, string> = {
  "Fractie-Beukering": "Fractie-Beukering",
  "Fractie-Walenkamp": "Fractie-Walenkamp",
  "Fractie-Van de Sanden": "Fractie-Van de Sanden",
  "Fractie-Van Gasteren": "Fractie-Van Gasteren",
  "Fractie-Visseren-Hamakers": "Fractie-Visseren-Hamakers",
  "Lid Keijzer": "Lid Keijzer",
};

const ALIAS_KEYS: Record<string, string> = {
  ChristenUnie: "CU",
  GroenLinks: "GL",
};

/**
 * Parties that occur in data/elections.json and data/coalitions.json but have
 * no page and no place in the index: dissolved parties, one-off joint lists,
 * and a party without a current seat. They carry no colour, because none was
 * sourced and none is invented. The key is the party's own abbreviation as the
 * Kiesraad, CBS and PDC use it (workstreams Q and R, 19-09-2026); the source is
 * for the name only, never for a seat number.
 */
function unlisted(key: string, nl: string, en: string, source: string): PartyRecord {
  return {
    key,
    abbrev: key,
    name: { nl, en },
    color: null,
    website: null,
    wiki: source.includes("wikipedia.org") ? source : null,
    confidence: "medium",
    source,
    retrieved: "2026-09-19",
    unlisted: true,
    program: null,
  };
}

export const UNLISTED_PARTIES: PartyRecord[] = [
  unlisted("KVP", "Katholieke Volkspartij", "Catholic People's Party", "https://nl.wikipedia.org/wiki/Katholieke_Volkspartij"),
  unlisted("ARP", "Anti-Revolutionaire Partij", "Anti-Revolutionary Party", "https://nl.wikipedia.org/wiki/Anti-Revolutionaire_Partij"),
  unlisted("CHU", "Christelijk-Historische Unie", "Christian Historical Union", "https://nl.wikipedia.org/wiki/Christelijk-Historische_Unie"),
  unlisted("CPN", "Communistische Partij van Nederland", "Communist Party of the Netherlands", "https://nl.wikipedia.org/wiki/Communistische_Partij_van_Nederland"),
  unlisted("PvdV", "Partij van de Vrijheid", "Freedom Party", "https://nl.wikipedia.org/wiki/Partij_van_de_Vrijheid"),
  unlisted("Lijst-Welter", "Lijst-Welter", "Welter List", "https://opendata.cbs.nl/ODataApi/odata/37517/Partij"),
  unlisted("KNP", "Katholieke Nationale Partij", "Catholic National Party", "https://opendata.cbs.nl/ODataApi/odata/37147/Partij"),
  unlisted("PSP", "Pacifistisch Socialistische Partij", "Pacifist Socialist Party", "https://nl.wikipedia.org/wiki/Pacifistisch_Socialistische_Partij"),
  unlisted("BP", "Boerenpartij", "Farmers' Party", "https://nl.wikipedia.org/wiki/Boerenpartij"),
  unlisted("GPV", "Gereformeerd Politiek Verbond", "Reformed Political League", "https://nl.wikipedia.org/wiki/Gereformeerd_Politiek_Verbond"),
  unlisted("NMP", "Nederlandse Middenstands Partij", "Dutch Middle Class Party", "https://nl.wikipedia.org/wiki/Nederlandse_Middenstands_Partij"),
  unlisted("DS70", "Democratisch Socialisten '70", "Democratic Socialists '70", "https://nl.wikipedia.org/wiki/Democratisch_Socialisten_'70"),
  unlisted("PPR", "Politieke Partij Radikalen", "Political Party of Radicals", "https://nl.wikipedia.org/wiki/Politieke_Partij_Radikalen"),
  unlisted("RKPN", "Rooms Katholieke Partij Nederland", "Roman Catholic Party Netherlands", "https://nl.wikipedia.org/wiki/Rooms_Katholieke_Partij_Nederland"),
  unlisted("RPF", "Reformatorische Politieke Federatie", "Reformatory Political Federation", "https://nl.wikipedia.org/wiki/Reformatorische_Politieke_Federatie"),
  unlisted("CP", "Centrumpartij", "Centre Party", "https://nl.wikipedia.org/wiki/Centrumpartij"),
  unlisted("EVP", "Evangelische Volkspartij", "Evangelical People's Party", "https://nl.wikipedia.org/wiki/Evangelische_Volkspartij"),
  unlisted("CD", "Centrumdemocraten", "Centre Democrats", "https://nl.wikipedia.org/wiki/Centrum_Democraten"),
  unlisted("AOV", "Algemeen Ouderen Verbond", "General Elderly Alliance", "https://nl.wikipedia.org/wiki/Algemeen_Ouderen_Verbond"),
  unlisted("Unie55", "Unie 55+", "Union 55+", "https://nl.wikipedia.org/wiki/Unie_55+"),
  unlisted("POG", "POG/Groenen", "POG/Greens", "https://www.parlement.com/eerste-kamerverkiezingen-1995"),
  unlisted("GPV-RPF", "Gezamenlijke lijst GPV en RPF", "Joint list GPV and RPF", "https://www.parlement.com/eerste-kamerverkiezingen-1999"),
  unlisted("LPF", "Lijst Pim Fortuyn", "Pim Fortuyn List", "https://nl.wikipedia.org/wiki/Lijst_Pim_Fortuyn"),
  unlisted("LN", "Leefbaar Nederland", "Livable Netherlands", "https://nl.wikipedia.org/wiki/Leefbaar_Nederland"),
  unlisted("BIJ1", "BIJ1", "BIJ1", "https://nl.wikipedia.org/wiki/BIJ1"),
  unlisted("GL-PvdA", "GroenLinks-PvdA (gezamenlijke lijst 2023)", "GreenLeft-Labour (joint list 2023)", "https://www.kiesraad.nl/actueel/nieuws/2025/11/7/kiesraad-uitslag-tweede-kamerverkiezing-betrouwbaar"),
  unlisted("SDAP", "Sociaal-Democratische Arbeiderspartij", "Social Democratic Workers' Party", "https://www.parlement.com/opgeheven-politieke-partijen"),
  unlisted("RKSP", "Rooms-Katholieke Staatspartij", "Roman Catholic State Party", "https://www.parlement.com/opgeheven-politieke-partijen"),
];

const PARTIES_BY_KEY = new Map([...PARTIES, ...UNLISTED_PARTIES].map((party) => [party.key, party]));

export function partyKeyForDataset(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value === "") return null;
  if (ALIAS_KEYS[value] !== undefined) return ALIAS_KEYS[value];
  if (value === "partijloos") return null;
  if (SPLINTER_GROUPS[value] !== undefined) return value;
  return PARTY_KEYS_SET.has(value) ? value : null;
}

const PARTY_KEYS_SET = new Set([...PARTIES, ...UNLISTED_PARTIES].map((party) => party.key));

export function partyByDataset(value: string | null | undefined): PartyRecord | null {
  const key = partyKeyForDataset(value);
  if (key === null) return null;
  return PARTIES_BY_KEY.get(key) ?? null;
}

/** Splinter factions and independents: neutral in colour. */
export function isSplinterGroup(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return SPLINTER_GROUPS[value] !== undefined;
}

export function partyLinkFor(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value === "") return null;
  const party = partyByDataset(value);
  if (party) return party.website ?? party.wiki;
  if (value === "partijloos") return null;
  if (value === "partijloos" || SPLINTER_GROUPS[value] !== undefined) return null;
  return `https://nl.wikipedia.org/wiki/${encodeURIComponent(value.replaceAll(" ", "_"))}`;
}

/**
 * The URL slug of a party page under /partijen/: the registry key lowercased
 * with spaces as dashes ("50PLUS" -> "50plus", "Water Natuurlijk" ->
 * "water-natuurlijk"). The keys are distinct, so the mapping is reversible.
 */
export function partySlug(party: PartyRecord): string {
  return party.key.toLowerCase().replaceAll(" ", "-");
}

/** The party for a /partijen/ slug, or null for an unknown slug. */
export function partyBySlug(slug: string): PartyRecord | null {
  const party = PARTIES.find((candidate) => partySlug(candidate) === slug.toLowerCase());
  return party ?? null;
}
