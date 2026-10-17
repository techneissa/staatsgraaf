/**
 * About-this-office prose for positions that share one office type across many
 * bodies. The position schema has no description field, so the copy is keyed on
 * the title, the way name-gloss.ts keys the English names.
 *
 * Every sentence below was written from the live source text fetched on
 * 2026-10-17. Fillmethod values in positions.json were not used: the data says
 * `benoeming-door-college` for Wethouder, Gedeputeerde and Eilandgedeputeerde,
 * and the laws say the council appoints them.
 *
 * Quotes relied on (Dutch, verbatim from wetten.overheid.nl unless noted):
 * - Gemeentewet (geldend van 01-10-2026) art. 34: "De burgemeester en de wethouders vormen te zamen het college van burgemeester en wethouders."
 * - Gemeentewet art. 35 lid 1: "De raad benoemt de wethouders."
 * - Provinciewet (geldend van 01-07-2026) art. 34 lid 1: "De commissaris van de Koning en de gedeputeerden vormen te zamen gedeputeerde staten."
 * - Provinciewet art. 35 lid 1: "Provinciale staten benoemen de gedeputeerden."
 * - WolBES (geldend van 15-09-2026) art. 36 lid 1: "De gezaghebber en de eilandgedeputeerden vormen te zamen het bestuurscollege."
 * - WolBES art. 37 lid 1: "De eilandsraad benoemt de eilandgedeputeerden."
 * - Statuut (geldend van 01-01-2024) art. 46 lid 1: "De vertegenwoordigende lichamen worden gekozen door de ingezetenen van het betrokken land, tevens Nederlanders, ..."
 * - Gemeentewet art. 7: "De raad vertegenwoordigt de gehele bevolking van de gemeente."
 * - Gemeentewet art. 8 lid 1 and lid 2: the council size follows inhabitant bands; a change takes effect at the next periodic election.
 * - Provinciewet art. 7: "Provinciale staten vertegenwoordigen de gehele bevolking van de provincie."
 * - Provinciewet art. 8 lid 2: a change in the number of members takes effect at the next periodic election.
 * - Waterschapswet art. 12 lid 1: "Het algemeen bestuur is samengesteld uit vertegenwoordigers van categorieën van belanghebbenden bij de uitoefening van de taken van het waterschap."
 * - Waterschapswet art. 13 lid 1: "Het algemeen bestuur bestaat uit een bij reglement vastgesteld aantal leden van ten minste achttien en ten hoogste dertig leden."
 * - Waterschapswet art. 40 lid 1: "Het dagelijks bestuur bestaat uit de voorzitter en een door het algemeen bestuur te bepalen aantal andere leden."
 * - Waterschapswet art. 41 lid 1 and 2: the algemeen bestuur appoints those members, except the voorzitter, from its own members.
 * - WolBES art. 6: "De eilandsraad vertegenwoordigt de gehele bevolking van het openbaar lichaam."
 * - WolBES art. 9: nine members on Bonaire, five on Sint Eustatius and Saba.
 * - Grondwet art. 51 lid 2 and 3: Tweede Kamer 150 members, Eerste Kamer 75 members.
 * - Grondwet art. 52 lid 1: "De zittingsduur van beide kamers is vier jaren."
 * - Grondwet art. 54 lid 1: Tweede Kamer members are elected directly by Dutch nationals aged eighteen or over.
 * - Grondwet art. 55 lid 1: Eerste Kamer members are elected by members of provinciale staten and of the kiescolleges.
 * - Grondwet art. 61 lid 2: "Elk der kamers benoemt een griffier."
 * - rijksoverheid.nl organogram pages, "ambtelijke leiding over het ministerie":
 *   AZ "De secretaris-generaal (SG) is belast met de ambtelijke leiding van het ministerie.",
 *   BZ "heeft sinds 12 augustus 2024 de ambtelijke leiding over het ministerie van Buitenlandse Zaken",
 *   BZK "heeft de ambtelijke leiding over het ministerie van BZK.",
 *   EZK "De sg heeft de ambtelijke leiding over het ministerie.",
 *   LVVN "De sg heeft de ambtelijke leiding over het ministerie.",
 *   SZW "heeft de ambtelijke leiding van het ministerie.",
 *   VWS "De ambtelijke leiding van VWS ligt bij secretaris-generaal ...",
 *   Defensie "is er ook iemand belast met de ambtelijke leiding over het departement. Dat is de secretaris-generaal (SG).",
 *   OCW "De ambtelijke leiding van het departement bestaat uit de bestuursraad OCW, met aan het hoofd de secretaris-generaal."
 *
 * Named gaps, not covered:
 * - Secretaris-generaal at Financien: the fetched page (ambtelijke-leiding) has
 *   no sentence on what the secretaris-generaal does, so that title returns null.
 * - Inspecteur-generaal: the Ambtenarenwet art. 1 does not describe the office
 *   and the rijksoverheid pages give no shared sentence (SZW names the
 *   inspecteur-generaal "verantwoordelijk voor de uitvoerende diensten van het
 *   ministerie", the OCW inspecties page says nothing on the office). Omitted.
 * - Statuut art. 46 states no seat counts; none are written here.
 */

export type PositionOfficeCopy = { nl: string; en: string };

export const WETHOUDER_SOURCE = "https://wetten.overheid.nl/BWBR0005416";
export const GEDEPUTEERDE_SOURCE = "https://wetten.overheid.nl/BWBR0005645";
export const EILANDGEDEPUTEERDE_SOURCE = "https://wetten.overheid.nl/BWBR0028142";
export const STATUUT_SOURCE = "https://wetten.overheid.nl/BWBR0002154";
export const WATERSCHAPSWET_SOURCE = "https://wetten.overheid.nl/BWBR0005108";
export const GRONDWET_SOURCE = "https://wetten.overheid.nl/BWBR0001840";
export const SECRETARIS_GENERAAL_SOURCES = [
  "https://www.rijksoverheid.nl/ministeries/ministerie-van-algemene-zaken/organisatie/organogram/secretaris-generaal",
  "https://www.rijksoverheid.nl/ministeries/ministerie-van-buitenlandse-zaken/organisatie/organogram/secretaris-generaal-en-plaatsvervangend-sg",
  "https://www.rijksoverheid.nl/ministeries/ministerie-van-binnenlandse-zaken-en-koninkrijksrelaties/organisatie/organogram/ambtelijke-leiding",
  "https://www.rijksoverheid.nl/ministeries/ministerie-van-defensie/organisatie/organogram/ambtelijke-leiding",
  "https://www.rijksoverheid.nl/ministeries/ministerie-van-economische-zaken-en-klimaat/organisatie/organogram/secretaris-generaal",
  "https://www.rijksoverheid.nl/ministeries/ministerie-van-landbouw-visserij-voedselzekerheid-en-natuur/organisatie/organogram/ambtelijke-leiding",
  "https://www.rijksoverheid.nl/ministeries/ministerie-van-onderwijs-cultuur-en-wetenschap/organisatie/organogram/ambtelijke-leiding-en-secretaris-generaal",
  "https://www.rijksoverheid.nl/ministeries/ministerie-van-sociale-zaken-en-werkgelegenheid/organisatie/organogram/secretaris-generaal",
  "https://www.rijksoverheid.nl/ministeries/ministerie-van-volksgezondheid-welzijn-en-sport/organisatie/organogram/sg",
] as const;

/** Ministries whose fetched page says nothing on the secretaris-generaal's role. */
const SECRETARIS_GENERAAL_GAPS: ReadonlySet<string> = new Set(["org:ministerie-van-financien"]);

const WETHOUDER: PositionOfficeCopy = {
  nl: "Een wethouder vormt samen met de burgemeester het college van burgemeester en wethouders (artikel 34 van de Gemeentewet). De gemeenteraad benoemt de wethouders (artikel 35, lid 1).",
  en: "A wethouder forms the college of burgemeester en wethouders together with the burgemeester (Gemeentewet, article 34). The municipal council appoints the wethouders (article 35, paragraph 1).",
};

const GEDEPUTEERDE: PositionOfficeCopy = {
  nl: "Een gedeputeerde vormt samen met de commissaris van de Koning Gedeputeerde Staten (artikel 34 van de Provinciewet). Provinciale Staten benoemen de gedeputeerden (artikel 35, lid 1).",
  en: "A gedeputeerde forms Gedeputeerde Staten together with the commissaris van de Koning (Provinciewet, article 34). Provinciale Staten appoint the gedeputeerden (article 35, paragraph 1).",
};

const SECRETARIS_GENERAAL: PositionOfficeCopy = {
  nl: "De secretaris-generaal heeft de ambtelijke leiding over het ministerie.",
  en: "The secretaris-generaal has the administrative leadership of the ministry.",
};

function eilandgedeputeerde(island: string): PositionOfficeCopy {
  return {
    nl: `Een eilandgedeputeerde van ${island} vormt samen met de gezaghebber het bestuurscollege (artikel 36 van de Wet openbare lichamen Bonaire, Sint Eustatius en Saba). De eilandsraad benoemt de eilandgedeputeerden (artikel 37).`,
    en: `An eilandgedeputeerde of ${island} forms the bestuurscollege together with the gezaghebber (article 36 of the Wet openbare lichamen Bonaire, Sint Eustatius en Saba). The eilandsraad appoints the eilandgedeputeerden (article 37).`,
  };
}

function statenlid(country: string): PositionOfficeCopy {
  return {
    nl: `Een Statenlid van ${country} zit in de Staten van ${country}. Artikel 46 van het Statuut voor het Koninkrijk der Nederlanden bepaalt dat de vertegenwoordigende lichamen van de landen worden gekozen.`,
    en: `A Statenlid of ${country} sits in the Staten of ${country}. Article 46 of the Statuut voor het Koninkrijk der Nederlanden says the representative bodies of the countries are elected.`,
  };
}

const RAADSLID: PositionOfficeCopy = {
  nl: "Een raadslid is lid van de gemeenteraad, die de gehele bevolking van de gemeente vertegenwoordigt (artikel 7 van de Gemeentewet). Het aantal leden hangt af van het aantal inwoners en wijzigt pas bij de eerstvolgende periodieke verkiezing van de raad (artikel 8).",
  en: "A raadslid is a member of the gemeenteraad, which represents the whole population of the municipality (Gemeentewet, article 7). The number of members depends on the number of inhabitants and changes only at the next periodic election of the council (article 8).",
};

const PROVINCIAAL_STATENLID: PositionOfficeCopy = {
  nl: "Een lid van Provinciale Staten zit in het orgaan dat de gehele bevolking van de provincie vertegenwoordigt (artikel 7 van de Provinciewet). Het aantal leden hangt af van het aantal inwoners en wijzigt pas bij de eerstvolgende periodieke verkiezing (artikel 8).",
  en: "A member of Provinciale Staten sits in the body that represents the whole population of the province (Provinciewet, article 7). The number of members depends on the number of inhabitants and changes only at the next periodic election (article 8).",
};

const WATERSCHAP_AB: PositionOfficeCopy = {
  nl: "Een lid van het algemeen bestuur vertegenwoordigt een categorie van belanghebbenden bij de taken van het waterschap (artikel 12 van de Waterschapswet). Het algemeen bestuur telt ten minste achttien en ten hoogste dertig leden (artikel 13).",
  en: "A member of the algemeen bestuur represents a category of interested parties in the water board's tasks (Waterschapswet, article 12). The algemeen bestuur has at least eighteen and at most thirty members (article 13).",
};

const WATERSCHAP_DB: PositionOfficeCopy = {
  nl: "Een lid van het dagelijks bestuur zit in het bestuur dat bestaat uit de voorzitter en een door het algemeen bestuur bepaald aantal andere leden (artikel 40 van de Waterschapswet). Het algemeen bestuur benoemt die leden, de voorzitter uitgezonderd, uit zijn eigen leden (artikel 41).",
  en: "A member of the dagelijks bestuur sits on the board that consists of the chair and a number of other members set by the algemeen bestuur (Waterschapswet, article 40). The algemeen bestuur appoints those members, the chair excepted, from among its own members (article 41).",
};

const EILANDSRAADLID: PositionOfficeCopy = {
  nl: "Een lid van de eilandsraad zit in de raad die de gehele bevolking van het openbaar lichaam vertegenwoordigt (artikel 6 van de Wet openbare lichamen Bonaire, Sint Eustatius en Saba). De eilandsraad telt negen leden op Bonaire en vijf leden op Sint Eustatius en Saba (artikel 9).",
  en: "A member of the eilandsraad sits on the council that represents the whole population of the public body (article 6 of the Wet openbare lichamen Bonaire, Sint Eustatius en Saba). The eilandsraad has nine members on Bonaire and five members on Sint Eustatius and Saba (article 9).",
};

const TWEEDE_KAMERLID: PositionOfficeCopy = {
  nl: "Een lid van de Tweede Kamer is een van de honderdvijftig leden van die kamer (artikel 51 van de Grondwet). De leden worden rechtstreeks gekozen door Nederlanders van achttien jaar of ouder (artikel 54) en de zittingsduur is vier jaar (artikel 52).",
  en: "A member of the Tweede Kamer is one of the 150 members of that chamber (Grondwet, article 51). The members are elected directly by Dutch nationals aged eighteen or over (article 54) and the term is four years (article 52).",
};

const EERSTE_KAMERLID: PositionOfficeCopy = {
  nl: "Een lid van de Eerste Kamer is een van de vijfenzeventig leden van die kamer (artikel 51 van de Grondwet). De leden worden gekozen door de leden van provinciale staten en van de kiescolleges (artikel 55) en de zittingsduur is vier jaar (artikel 52).",
  en: "A member of the Eerste Kamer is one of the 75 members of that chamber (Grondwet, article 51). The members are elected by the members of provinciale staten and of the kiescolleges (article 55) and the term is four years (article 52).",
};

const GRIFFIER: PositionOfficeCopy = {
  nl: "Elk van beide kamers van de Staten-Generaal benoemt een griffier (artikel 61, lid 2, van de Grondwet).",
  en: "Each of the two chambers of the Staten-Generaal appoints a griffier (Grondwet, article 61, paragraph 2).",
};

/**
 * Short prose on what an office is and how it is filled, or null when no
 * sourced copy exists for the title. Exact titles first, then prefixes.
 */
export function positionOfficeCopy(position: {
  title: string;
  organization?: string;
}): PositionOfficeCopy | null {
  const { title } = position;
  if (title === "Wethouder") return WETHOUDER;
  if (title === "Gedeputeerde") return GEDEPUTEERDE;
  if (title === "Secretaris-generaal") {
    if (position.organization !== undefined && SECRETARIS_GENERAAL_GAPS.has(position.organization)) return null;
    return SECRETARIS_GENERAAL;
  }
  if (title === "Lid van de Tweede Kamer der Staten-Generaal") return TWEEDE_KAMERLID;
  if (title === "Lid van de Eerste Kamer der Staten-Generaal") return EERSTE_KAMERLID;
  if (title.startsWith("Griffier van de ")) return GRIFFIER;
  if (title.startsWith("Lid gemeenteraad van ")) return RAADSLID;
  if (title.startsWith("Lid Provinciale Staten van ")) return PROVINCIAAL_STATENLID;
  if (title.startsWith("Lid Algemeen Bestuur van ")) return WATERSCHAP_AB;
  if (title.startsWith("Lid Dagelijks Bestuur van ")) return WATERSCHAP_DB;
  if (title.startsWith("Lid eilandsraad van ")) return EILANDSRAADLID;
  const island = /^Eilandgedeputeerde van (.+)$/u.exec(title);
  if (island !== null) return eilandgedeputeerde(island[1]);
  const country = /^Statenlid van (.+)$/u.exec(title);
  if (country !== null) return statenlid(country[1]);
  return null;
}
