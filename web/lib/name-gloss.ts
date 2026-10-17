/**
 * Rule-based English glosses for Dutch position titles and organisation names.
 *
 *
 * Dutch names stay the canonical display name everywhere (the "Dutch names,
 * English keys" rule). When the reader has English selected, this module adds
 * or swaps in an English meaning where one is well established. It returns
 * null when no established English equivalent is known: an absent gloss is an
 * honest gap, an invented one is a bug.
 *
 * Sources:
 * - Ministry portfolio names: https://www.government.nl/ministries (retrieved
 *   19-09-2026). The official English names on that page are "Ministry of
 *   General Affairs", "Ministry of the Interior and Kingdom Relations",
 *   "Ministry of Agriculture, Fisheries, Food Security and Nature", "Ministry
 *   of Economic Affairs", "Ministry of Education, Culture and Science",
 *   "Ministry of Finance", "Ministry of Foreign Affairs", "Ministry of Health,
 *   Welfare and Sport", "Ministry of Infrastructure and Water Management",
 *   "Ministry of Justice and Security", "Ministry of Social Affairs and
 *   Employment", "Ministry of Defence". The three ministries created in 2024
 *   use the English names on government.nl: "Ministry of Asylum and
 *   Migration", "Ministry of Climate Policy and Green Growth", "Ministry of
 *   Housing and Spatial Planning" (https://www.government.nl/latest/news/2024/07/02/schoof-government-sworn-in,
 *   retrieved 19-09-2026).
 * - Independent body names follow each body's own official English name (for
 *   example the Netherlands Court of Audit, Statistics Netherlands, the
 *   Public Prosecution Service). Each was checked against the body's English
 *   website; entries are curated, not machine translated.
 * - Extra executive bodies added 17-10-2026 from the body's own English page
 *   or government.nl: Medicines Evaluation Board (government.nl/ministries/
 *   ministry-of-health-welfare-and-sport/services-and-institutions), Central
 *   Judicial Collection Agency (cjib.nl/en/what-cjib), Netherlands Forensic
 *   Institute (forensicinstitute.nl), Cultural Heritage Agency of the
 *   Netherlands (english.cultureelerfgoed.nl), National Office for Identity
 *   Data (rvig.nl/service/about-rvig), Judicial Information Service
 *   (government.nl/themes/justice-security-and-defence/sentences-and-non-punitive-orders/view-your-criminal-record),
 *   Dutch Authority for the Financial Markets (afm.nl/en/over-de-afm),
 *   Central Committee on Research Involving Human Subjects
 *   (english.ccmo.nl). CIBG keeps the abbreviation on government.nl.
 */

import { PARTIES, partyByDataset } from "./parties";
import type { PartyRecord } from "./parties";

/** Established English names for prominent national bodies and the hub. */
const ORG_EXACT: Record<string, string> = {
  "Tweede Kamer der Staten-Generaal": "House of Representatives",
  "Eerste Kamer der Staten-Generaal": "Senate",
  "Kiesgerechtigden Nederland": "Dutch electorate",
  "Raad van State": "Council of State",
  "Afdeling bestuursrechtspraak van de Raad van State":
    "Administrative Jurisdiction Division of the Council of State",
  "Algemene Rekenkamer": "Netherlands Court of Audit",
  "Openbaar Ministerie": "Public Prosecution Service",
  "Parket bij de Hoge Raad": "Office of the Procurator General at the Supreme Court",
  "Hoge Raad der Nederlanden": "Supreme Court of the Netherlands",
  "Hoge Raad": "Supreme Court of the Netherlands",
  "Centrale Raad van Beroep": "Central Appeals Tribunal",
  "College van Beroep voor het bedrijfsleven": "Trade and Industry Appeals Tribunal",
  "Raad voor de rechtspraak": "Council for the Judiciary",
  "Centraal Bureau voor de Statistiek": "Statistics Netherlands",
  Kiesraad: "Electoral Council",
  "Autoriteit Consument en Markt": "Authority for Consumers and Markets",
  "Autoriteit Persoonsgegevens": "Dutch Data Protection Authority",
  Kansspelautoriteit: "Netherlands Gambling Authority",
  "Kamer van Koophandel": "Chamber of Commerce",
  Belastingdienst: "Dutch Tax Administration",
  Douane: "Customs Administration",
  "Immigratie- en Naturalisatiedienst": "Immigration and Naturalisation Service",
  "Centraal Orgaan opvang asielzoekers": "Central Agency for the Reception of Asylum Seekers",
  "Uitvoeringsinstituut Werknemersverzekeringen": "Employee Insurance Agency",
  "Rijksinstituut voor Volksgezondheid en Milieu":
    "National Institute for Public Health and the Environment",
  "Nederlandse Zorgautoriteit": "Dutch Healthcare Authority",
  "Nederlandse Voedsel- en Warenautoriteit":
    "Netherlands Food and Consumer Product Safety Authority",
  "Rijksdienst voor Ondernemend Nederland": "Netherlands Enterprise Agency",
  "Dienst Uitvoering Onderwijs": "Education Executive Agency",
  Gezondheidsraad: "Health Council of the Netherlands",
  "Onderzoeksraad voor Veiligheid": "Dutch Safety Board",
  "Wetenschappelijke Raad voor het Regeringsbeleid": "Scientific Council for Government Policy",
  "Centraal Planbureau": "Netherlands Bureau for Economic Policy Analysis",
  "Sociaal en Cultureel Planbureau": "Netherlands Institute for Social Research",
  "Planbureau voor de Leefomgeving": "Netherlands Environmental Assessment Agency",
  "Koninklijke Bibliotheek": "National Library of the Netherlands",
  "Koninklijke Nederlandse Akademie van Wetenschappen":
    "Royal Netherlands Academy of Arts and Sciences",
  "Koninklijk Nederlands Meteorologisch Instituut":
    "Royal Netherlands Meteorological Institute",
  "Nationale ombudsman": "National Ombudsman",
  "Huis voor Klokkenluiders": "House for Whistleblowers",
  "Nationale Politie": "National Police",
  Politie: "Police",
  Politieacademie: "National Police Academy",
  Rijkswaterstaat: "Directorate-General for Public Works and Water Management",
  Ministerraad: "Council of Ministers",
  Regering: "Government",
  Kabinet: "Cabinet",
  "Kabinet Minister-President": "Prime Minister's Office",
  "Kabinet van de Koning": "Royal Household of the Netherlands",
  "Militaire Inlichtingen- en Veiligheidsdienst": "Military Intelligence and Security Service",
  "Directoraat-generaal Algemene Inlichtingen- en Veiligheidsdienst":
    "General Intelligence and Security Service",
  "Nationaal Cyber Security Centrum": "National Cyber Security Centre",
  "Sociaal-Economische Raad": "Social and Economic Council",
  "Vereniging van Nederlandse Gemeenten": "Association of Netherlands Municipalities",
  "Unie van Waterschappen": "Association of Dutch Water Boards",
  "Wetenschappelijk Onderzoek- en Datacentrum": "Research and Documentation Centre",
  "Nederlandse Arbeidsinspectie": "Netherlands Labour Authority",
  "Raad voor Accreditatie": "Dutch Accreditation Council",
  "Raad voor Rechtsbijstand": "Legal Aid Board",
  Onderwijsraad: "Education Council",
  "College voor de Rechten van de Mens": "Netherlands Institute for Human Rights",
  "Inspectie van het Onderwijs": "Education Inspectorate",
  "Staatstoezicht op de Mijnen": "State Supervision of Mines",
  Waarderingskamer: "Council for Real Estate Assessment",
  "Nationaal Archief": "National Archives",
  Huurcommissie: "Rent Assessment Committee",
  "Wetterskip Fryslân": "Water board of Friesland",
  "Adviesraad Migratie": "Advisory Committee on Migration",
  "Adviesraad Internationale Vraagstukken": "Advisory Council on International Affairs",
  "Raad voor de leefomgeving en infrastructuur": "Council for the Environment and Infrastructure",
  "Nederlandse Publieke Omroep": "Dutch Public Broadcasting Organisation",
  "Agentschap College ter Beoordeling van Geneesmiddelen": "Medicines Evaluation Board",
  "College ter Beoordeling van Geneesmiddelen": "Medicines Evaluation Board",
  "Centraal Justitieel Incassobureau": "Central Judicial Collection Agency",
  "Nederlands Forensisch Instituut": "Netherlands Forensic Institute",
  "Rijksdienst voor het Cultureel Erfgoed": "Cultural Heritage Agency of the Netherlands",
  "Rijksdienst voor Identiteitsgegevens": "National Office for Identity Data",
  "Justitiële Informatiedienst": "Judicial Information Service",
  "Stichting Autoriteit Financiële Markten": "Dutch Authority for the Financial Markets",
  "Autoriteit Financiële Markten": "Dutch Authority for the Financial Markets",
  CIBG: "CIBG",
  "Centrale Commissie Mensgebonden Onderzoek":
    "Central Committee on Research Involving Human Subjects",
};

/** Official English ministry portfolio names (government.nl, 19-09-2026). */
const PORTFOLIO_EN: Record<string, string> = {
  "Algemene Zaken": "General Affairs",
  "Binnenlandse Zaken en Koninkrijksrelaties": "the Interior and Kingdom Relations",
  "Buitenlandse Zaken": "Foreign Affairs",
  Defensie: "Defence",
  "Economische Zaken": "Economic Affairs",
  "Economische Zaken en Klimaat": "Economic Affairs and Climate Policy",
  "Financiën": "Finance",
  "Infrastructuur en Waterstaat": "Infrastructure and Water Management",
  "Justitie en Veiligheid": "Justice and Security",
  "Landbouw, Visserij, Voedselzekerheid en Natuur":
    "Agriculture, Fisheries, Food Security and Nature",
  "Onderwijs, Cultuur en Wetenschap": "Education, Culture and Science",
  "Sociale Zaken en Werkgelegenheid": "Social Affairs and Employment",
  "Volksgezondheid, Welzijn en Sport": "Health, Welfare and Sport",
  "Asiel en Migratie": "Asylum and Migration",
  "Klimaat en Groene Groei": "Climate Policy and Green Growth",
  "Wonen en Rijksdienst": "Housing and Spatial Planning",
  "Volkshuisvesting en Ruimtelijke Ordening": "Housing and Spatial Planning",
  "Buitenlandse Handel en Ontwikkelingssamenwerking":
    "Foreign Trade and Development Cooperation",
  "Koninkrijksrelaties": "Kingdom Relations",
  "Digitale Zaken": "Digital Affairs",
  "Langdurige Zorg, Jeugd en Sport": "Long-term Care, Youth and Sport",
  "Binnenlandse Zaken": "the Interior",
  "Europese Zaken": "European Affairs",
  "Ontwikkelingssamenwerking": "Development Cooperation",
  "Digitalisering": "Digitalisation",
  "Landbouw": "Agriculture",
  "Natuur": "Nature",
  "Voedselkwaliteit": "Food Quality",
  "Voedselzekerheid": "Food Security",
  "Visserij": "Fisheries",
  "Immigratie & Asiel": "Immigration and Asylum",
  "JBZ-Raad": "JHA Council",
};

function portfolioEn(portfolio: string): string | null {
  const trimmed = portfolio.trim();
  if (PORTFOLIO_EN[trimmed] !== undefined) return PORTFOLIO_EN[trimmed];
  // Combined committees keep the TK convention "X / Y": translate each side.
  if (trimmed.includes(" / ")) {
    const sides = trimmed.split(" / ").map((side) => portfolioEn(side));
    if (sides.every((side): side is string => side !== null)) {
      return sides.join(" / ");
    }
  }
  // List portfolios ("Buitenlandse Zaken, Defensie en Ontwikkelingssamenwerking")
  // only compose when every token is individually established.
  if (trimmed.includes(", ") || / en /u.test(trimmed)) {
    const tokens = trimmed.split(/, | en /u).map((token) => portfolioEn(token));
    if (tokens.every((token): token is string => token !== null)) {
      return tokens.join(", ").replace(/, ([^,]*)$/, " and $1");
    }
  }
  return null;
}

function orgCore(name: string): string {
  return name.replace(/^(?:van het|van de|van|het) /iu, "");
}

/** Established English for an organisation name, or the Dutch name as a last resort inside a title. */
function namedOrg(name: string): string {
  const trimmed = name.trim();
  return orgEnGloss(trimmed) ?? trimmed;
}

/** Strips a trailing Dutch committee abbreviation like " (BIZA)". */
function stripAbbr(portfolio: string): string {
  return portfolio.replace(/\s+\([^()]+\)$/u, "");
}

function committeeRoleEn(role: string): string {
  if (role === "Voorzitter") return "Chair of";
  if (role === "Ondervoorzitter") return "Deputy chair of";
  return "Member of";
}

/** English glosses for a handful of titles whose official form is fixed. */
const POSITION_EXACT: Record<string, string> = {
  "Directeur van het Kabinet van de Koning": "Director of the Royal Household",
  "Korpschef van de politie": "Chief constable of the police",
  "Nationale ombudsman": "National Ombudsman",
  "Dijkgraaf van Wetterskip Fryslân": "Chair of the water board of Friesland",
  "Procureur-generaal bij de Hoge Raad": "Procurator General at the Supreme Court",
  "Procureur-generaal (lid van het College van procureurs-generaal)":
    "Procurator General",
};

/** Translates one segment of a position title; null when not established. */
function positionSegmentEn(segment: string): string | null {
  const title = segment.trim();
  if (title === "") return null;
  const exact = POSITION_EXACT[title];
  if (exact !== undefined) return exact;
  if (title === "Minister-president") return "Prime Minister";
  if (title === "Koning der Nederlanden") return "King of the Netherlands";
  if (title === "Wethouder") return "Alderman";
  if (title === "Gedeputeerde") return "Provincial executive member";
  if (title === "Secretaris-generaal") return "Secretary-general";
  if (title === "Tweede Kamerlid") return "Member of the House of Representatives";
  if (title === "Eerste Kamerlid") return "Member of the Senate";
  if (title === "Algemeen directeur" || title === "Algemeen Directeur") {
    return "General director";
  }

  let match = /^Minister van (.+)$/u.exec(title);
  if (match) {
    const portfolio = portfolioEn(match[1]);
    return portfolio === null ? null : `Minister of ${portfolio}`;
  }
  match = /^Staatssecretaris van (.+)$/u.exec(title);
  if (match) {
    const portfolio = portfolioEn(match[1]);
    return portfolio === null ? null : `State Secretary for ${portfolio}`;
  }
  match = /^Burgemeester van (.+)$/u.exec(title);
  if (match) return `Mayor of ${match[1]}`;
  match = /^Waarnemend burgemeester van (.+)$/u.exec(title);
  if (match) return `Acting mayor of ${match[1]}`;
  match = /^Commissaris van de Koning in (.+)$/u.exec(title);
  if (match) return `King's Commissioner in ${match[1]}`;
  match = /^Wethouder \((.+)\)$/u.exec(title);
  if (match) return `Alderman (${match[1]})`;
  match = /^Eilandgedeputeerde van (.+)$/u.exec(title);
  if (match) return `Island executive member of ${match[1]}`;
  match = /^Gezaghebber van (.+)$/u.exec(title);
  if (match) return `Lieutenant governor of ${match[1]}`;
  match = /^Lid eilandsraad van (.+)$/u.exec(title);
  if (match) return `Member of the island council of ${match[1]}`;
  match = /^Lid gemeenteraad van (.+)$/u.exec(title);
  if (match) return `Member of the municipal council of ${match[1]}`;
  match = /^Niet-rechterlijk lid van de (.+)$/u.exec(title);
  if (match) {
    const org = orgEnGloss(match[1]);
    if (org !== null) return `Non-judicial member of the ${org}`;
  }
  match = /^Dijkgraaf van (?:Waterschap|Hoogheemraadschap)(?: van)? (.+)$/u.exec(title);
  if (match) return `Chair of the water board of ${match[1]}`;
  match = /^Lid (Algemeen Bestuur|Dagelijks Bestuur) van (.+)$/u.exec(title);
  if (match) {
    const water = waterBoardNameEn(match[2]);
    if (water !== null) {
      const role = match[1] === "Algemeen Bestuur" ? "general board" : "executive board";
      return `Member of the ${role} of the water board ${water}`;
    }
  }
  match = /^(Lid|Voorzitter) van de (Tweede|Eerste) Kamer der Staten-Generaal$/u.exec(title);
  if (match) {
    const role = match[1] === "Voorzitter" ? "Speaker of" : "Member of";
    return match[2] === "Tweede" ? `${role} the House of Representatives` : `${role} the Senate`;
  }
  match = /^(Eerste|Tweede) ondervoorzitter van de (Tweede|Eerste) Kamer der Staten-Generaal$/u.exec(title);
  if (match) {
    const nth = match[1] === "Eerste" ? "First" : "Second";
    const house = match[2] === "Tweede" ? "House of Representatives" : "Senate";
    return `${nth} Deputy Speaker of the ${house}`;
  }
  match = /^Lid Provinciale Staten van (.+)$/u.exec(title);
  if (match) return `Member of the provincial council of ${match[1]}`;
  match = /^Statenlid van (.+)$/u.exec(title);
  if (match) return `Member of the parliament of ${match[1]}`;
  match = /^Gouverneur van (.+)$/u.exec(title);
  if (match) return `Governor of ${match[1]}`;
  match = /^Gevolmachtigde minister van (.+)$/u.exec(title);
  if (match) return `Minister Plenipotentiary of ${match[1]}`;
  match = /^Bestuursvoorzitter (.+)$/u.exec(title);
  if (match) return `Chair of the board, ${namedOrg(match[1])}`;
  match = /^Bestuurslid (.+)$/u.exec(title);
  if (match) return `Board member, ${namedOrg(match[1])}`;
  match = /^Algemeen secretaris\/directeur (.+)$/u.exec(title);
  if (match) return `Secretary/director, ${namedOrg(match[1])}`;
  match = /^(Lid|Voorzitter|Ondervoorzitter) Vaste commissie voor (.+)$/u.exec(title);
  if (match) {
    const portfolio = portfolioEn(stripAbbr(match[2]));
    if (portfolio === null) return null;
    const role = committeeRoleEn(match[1]);
    return `${role} the standing committee on ${portfolio}`;
  }
  match = /^(Lid|Voorzitter|Ondervoorzitter) Commissies? voor (.+)$/u.exec(title);
  if (match) {
    const portfolio = portfolioEn(stripAbbr(match[2]));
    if (portfolio === null) return null;
    const role = committeeRoleEn(match[1]);
    return `${role} the committee on ${portfolio}`;
  }
  match = /^(President|Ondervoorzitter) (?:van de |van het |van |)(.+)$/u.exec(title);
  if (match) {
    const tail = stripAbbr(match[2]);
    const kamer = /^(Tweede|Eerste) Kamer der Staten-Generaal$/u.exec(tail);
    if (kamer) {
      const role = match[1] === "President"
        ? (kamer[1] === "Tweede" ? "Speaker of the House of Representatives" : "Speaker of the Senate")
        : "Deputy speaker of the " + (kamer[1] === "Tweede" ? "House of Representatives" : "Senate");
      return role;
    }
    const org = orgEnGloss(tail);
    if (org !== null) return `${match[1] === "President" ? "President" : "Deputy chair"} of the ${org}`;
  }
  match = /^Griffier van de (Tweede|Eerste) Kamer der Staten-Generaal$/u.exec(title);
  if (match) {
    return match[1] === "Tweede"
      ? "Clerk of the House of Representatives"
      : "Clerk of the Senate";
  }
  match = /^Fractievoorzitter (.+)$/u.exec(title);
  if (match) {
    const partyEn = partyNameEn(match[1]);
    return partyEn === null ? null : `Party leader, ${partyEn}`;
  }
  // Director-style titles capture an organisation name; a capture that starts
  // with "en " is a compound title, not an organisation.
  const isCompoundTail = (capture: string) => /^en /iu.test(capture);
  match = /^[Dd]irecteur-[Gg]eneraal(?: voor)? (.+)$/u.exec(title);
  if (match && !isCompoundTail(match[1])) return `Director-general, ${namedOrg(orgCore(match[1]))}`;
  match = /^Inspecteur-generaal (.+)$/u.exec(title);
  if (match && !isCompoundTail(match[1])) return `Inspector-general, ${namedOrg(orgCore(match[1]))}`;
  match = /^(?:Algemeen )?[Dd]irecteur(?:-generaal)?(?:-bestuurder)?(?: van het | van de | van | )(.+)$/u.exec(title);
  if (match && !isCompoundTail(match[1])) return `Director, ${namedOrg(orgCore(match[1]))}`;
  match = /^Hoofddirecteur (.+)$/u.exec(title);
  if (match) return `Chief executive, ${namedOrg(orgCore(match[1]))}`;
  return null;
}

/** Dutch party spellings that appear in titles but not as dataset keys. */
const PARTY_TITLE_ALIAS: Record<string, string> = {
  Volt: "Volt",
};

function partyNameEn(name: string): string | null {
  const record = partyRecordByDutchName(name);
  return record ? record.name.en : null;
}

function partyRecordByDutchName(name: string): PartyRecord | null {
  const trimmed = name.trim();
  if (trimmed === "") return null;
  const byKey = partyByDataset(trimmed);
  if (byKey) return byKey;
  for (const party of PARTIES) {
    if (party.name.nl.toLowerCase() === trimmed.toLowerCase()) return party;
  }
  return null;
}

/** English gloss for a Dutch position title, or null when none is established. */
export function positionEn(title: string | null | undefined): string | null {
  if (typeof title !== "string") return null;
  const titleTrimmed = title.trim();
  if (titleTrimmed === "") return null;
  // Try the whole title first: "Staatssecretaris van Landbouw, Visserij,
  // Voedselzekerheid en Natuur" is one segment, not a compound.
  const direct = positionSegmentEn(titleTrimmed);
  if (direct !== null) return direct;
  // Compound titles: "Minister-president en Minister van Algemene Zaken".
  const parts = titleTrimmed.split(/ en (?=[A-Z0-9])/u);
  if (parts.length > 1) {
    const translated = parts.map((part) => positionSegmentEn(part));
    if (translated.every((part): part is string => part !== null)) {
      return translated.join(" and ");
    }
    return null;
  }
  return null;
}

/**
 * English gloss for a Dutch organisation name, or null when none is
 * established. Entity names inside the gloss (municipality, water board and
 * province names) stay Dutch on purpose.
 */
export function orgEnGloss(name: string | null | undefined): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (trimmed === "") return null;
  const exact = ORG_EXACT[trimmed];
  if (exact !== undefined) return exact;

  let match = /^Agentschap (.+)$/u.exec(trimmed);
  if (match) {
    const inner = orgEnGloss(match[1]);
    if (inner !== null) return inner;
  }
  match = /^Gemeente (.+)$/u.exec(trimmed);
  if (match) return `Municipality of ${match[1]}`;
  match = /^Regering van (.+)$/u.exec(trimmed);
  if (match) return `Government of ${match[1]}`;
  match = /^GGD (.+)$/u.exec(trimmed);
  if (match) return `Municipal Health Service ${match[1]}`;
  match = /^Gemeentelijke [gG]ezondheidsdienst (.+)$/u.exec(trimmed);
  if (match) return `Municipal Health Service ${match[1]}`;
  match = /^Gemeenschappelijke Gezondheidsdienst (.+)$/u.exec(trimmed);
  if (match) return `Municipal Health Service ${match[1]}`;
  match = /^Gemeenteraad van (.+)$/u.exec(trimmed);
  if (match) return `Municipal council of ${match[1]}`;
  match = /^College van burgemeester en wethouders van (.+)$/u.exec(trimmed);
  if (match) return `Mayor and aldermen of ${match[1]}`;
  match = /^Gedeputeerde Staten van (.+)$/u.exec(trimmed);
  if (match) return `Provincial executive of ${match[1]}`;
  match = /^Provinciale Staten van (.+)$/u.exec(trimmed);
  if (match) return `Provincial council of ${match[1]}`;
  match = /^Eilandsraad van (.+)$/u.exec(trimmed);
  if (match) return `Island council of ${match[1]}`;
  match = /^Bestuurscollege van (.+)$/u.exec(trimmed);
  if (match) return `Island executive of ${match[1]}`;
  match = /^Openbaar Lichaam (.+)$/u.exec(trimmed);
  if (match) return `Public body of ${match[1]}`;
  match = /^Veiligheidsregio (.+)$/u.exec(trimmed);
  if (match) return `Safety region of ${match[1]}`;
  match = /^Rechtbank (.+)$/u.exec(trimmed);
  if (match) return `District court of ${match[1]}`;
  match = /^Gerechtshof (.+)$/u.exec(trimmed);
  if (match) return `Court of appeal of ${match[1]}`;
  match = /^Ministerie van (.+)$/u.exec(trimmed);
  if (match) {
    const inner = match[1];
    const split = /^(.+) \(([^)]+)\)$/u.exec(inner);
    const portfolio = portfolioEn(split ? split[1] : inner);
    if (portfolio === null) return null;
    return split ? `Ministry of ${portfolio} (${split[2]})` : `Ministry of ${portfolio}`;
  }
  match = /^Staten van (.+)$/u.exec(trimmed);
  if (match) return `Parliament of ${match[1]}`;
  match = /^Vaste commissie voor (.+)$/u.exec(trimmed);
  if (match) {
    const portfolio = portfolioEn(match[1]);
    return portfolio === null ? null : `Standing committee on ${portfolio}`;
  }
  match = /^Commissie voor (.+)$/u.exec(trimmed);
  if (match) {
    const portfolio = portfolioEn(match[1]);
    return portfolio === null ? null : `Committee on ${portfolio}`;
  }
  match = /^(Algemeen Bestuur|Dagelijks Bestuur) van (.+)$/u.exec(trimmed);
  if (match) {
    const role = match[1] === "Algemeen Bestuur" ? "General board" : "Executive board";
    const water = waterBoardNameEn(match[2]);
    return water === null ? null : `${role} of the water board ${water}`;
  }
  match = /^Hoogheemraadschap(?: van)? (.+)$/u.exec(trimmed);
  if (match) return `Water board of ${match[1]}`;
  match = /^Waterschap (.+)$/u.exec(trimmed);
  if (match) return `Water board of ${match[1]}`;
  return null;
}

function waterBoardNameEn(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === "Wetterskip Fryslân") return "of Friesland";
  let match = /^Waterschap (.+)$/u.exec(trimmed);
  if (match) return match[1];
  match = /^Hoogheemraadschap(?: van)? (.+)$/u.exec(trimmed);
  if (match) return match[1];
  return null;
}

/**
 * Established English for a position title or an organisation name, or null.
 * Person names do not match and stay Dutch.
 */
export function establishedEn(dutch: string | null | undefined): string | null {
  return positionEn(dutch) ?? orgEnGloss(dutch);
}

/**
 * English for a distinctive rest taken from a body name (a ministry portfolio
 * on a secretaris-generaal). Place names have no gloss and stay as they are.
 */
export function restEn(rest: string): string {
  const split = /^(.+) \(([^)]+)\)$/u.exec(rest);
  if (split) {
    const portfolio = portfolioEn(split[1]);
    return portfolio === null ? rest : `${portfolio} (${split[2]})`;
  }
  return portfolioEn(rest) ?? rest;
}
