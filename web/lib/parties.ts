import type { LocString } from "./i18n/locales";

/**
 * Official party colours for the people and factions in the dataset.
 *
 * This table is a sourced data file, not free design choice: every colour carries
 * the source it came from and a retrieval date. Confidence follows the party
 * colour research of 18-09-2026 (research/party-colours-2026-09-18.md). Hex
 * values stay lowercase without alpha. NULL colour means no sourced colour
 * exists; such parties render in neutral grey and never get an invented value.
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

const PARTIES_BY_KEY = new Map(PARTIES.map((party) => [party.key, party]));

export function partyKeyForDataset(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value === "") return null;
  if (ALIAS_KEYS[value] !== undefined) return ALIAS_KEYS[value];
  if (value === "partijloos") return null;
  if (SPLINTER_GROUPS[value] !== undefined) return value;
  return PARTY_KEYS_SET.has(value) ? value : null;
}

const PARTY_KEYS_SET = new Set(PARTIES.map((party) => party.key));

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
