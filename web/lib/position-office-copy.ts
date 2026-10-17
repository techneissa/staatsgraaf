/**
 * About-this-office prose for positions that share one office type across many
 * bodies. The position schema has no description field, so the copy is keyed on
 * the title, the way name-gloss.ts keys the English names.
 *
 * Mentions of bodies, offices and law articles are tagged so the position
 * header can render them as peek links and wetten.overheid.nl permalinks.
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

type OfficeTemplate = PositionOfficeCopy & { law?: string };

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

const WETHOUDER: OfficeTemplate = {
  law: "BWBR0005416",
  nl: 'Een wethouder vormt samen met de <entity role="mayor">burgemeester</entity> het <entity role="college">college van burgemeester en wethouders</entity> (<law art="34">artikel 34</law> van de <law>Gemeentewet</law>). De <entity role="council">gemeenteraad</entity> benoemt de wethouders (<law art="35">artikel 35, lid 1</law>).',
  en: 'A wethouder forms the <entity role="college">college of burgemeester en wethouders</entity> together with the <entity role="mayor">burgemeester</entity> (<law>Gemeentewet</law>, <law art="34">article 34</law>). The <entity role="council">municipal council</entity> appoints the wethouders (<law art="35">article 35, paragraph 1</law>).',
};

const GEDEPUTEERDE: OfficeTemplate = {
  law: "BWBR0005645",
  nl: 'Een gedeputeerde vormt samen met de <entity role="commissioner">commissaris van de Koning</entity> <entity role="college">Gedeputeerde Staten</entity> (<law art="34">artikel 34</law> van de <law>Provinciewet</law>). <entity role="council">Provinciale Staten</entity> benoemen de gedeputeerden (<law art="35">artikel 35, lid 1</law>).',
  en: 'A gedeputeerde forms <entity role="college">Gedeputeerde Staten</entity> together with the <entity role="commissioner">commissaris van de Koning</entity> (<law>Provinciewet</law>, <law art="34">article 34</law>). <entity role="council">Provinciale Staten</entity> appoint the gedeputeerden (<law art="35">article 35, paragraph 1</law>).',
};

const SECRETARIS_GENERAAL: OfficeTemplate = {
  nl: 'De secretaris-generaal heeft de ambtelijke leiding over het <entity role="ministry">ministerie</entity>.',
  en: 'The secretaris-generaal has the administrative leadership of the <entity role="ministry">ministry</entity>.',
};

function eilandgedeputeerde(island: string): OfficeTemplate {
  return {
    law: "BWBR0028142",
    nl: `Een eilandgedeputeerde van ${island} vormt samen met de <entity role="gezaghebber">gezaghebber</entity> het <entity role="college">bestuurscollege</entity> (<law art="36">artikel 36</law> van de <law>Wet openbare lichamen Bonaire, Sint Eustatius en Saba</law>). De <entity role="council">eilandsraad</entity> benoemt de eilandgedeputeerden (<law art="37">artikel 37</law>).`,
    en: `An eilandgedeputeerde of ${island} forms the <entity role="college">bestuurscollege</entity> together with the <entity role="gezaghebber">gezaghebber</entity> (<law art="36">article 36</law> of the <law>Wet openbare lichamen Bonaire, Sint Eustatius en Saba</law>). The <entity role="council">eilandsraad</entity> appoints the eilandgedeputeerden (<law art="37">article 37</law>).`,
  };
}

function statenlid(country: string): OfficeTemplate {
  return {
    law: "BWBR0002154",
    nl: `Een Statenlid van ${country} zit in de <entity role="staten">Staten van ${country}</entity>. <law art="46">Artikel 46</law> van het <law>Statuut voor het Koninkrijk der Nederlanden</law> bepaalt dat de vertegenwoordigende lichamen van de landen worden gekozen.`,
    en: `A Statenlid of ${country} sits in the <entity role="staten">Staten of ${country}</entity>. <law art="46">Article 46</law> of the <law>Statuut voor het Koninkrijk der Nederlanden</law> says the representative bodies of the countries are elected.`,
  };
}

const RAADSLID: OfficeTemplate = {
  law: "BWBR0005416",
  nl: 'Een raadslid is lid van de <entity role="council">gemeenteraad</entity>, die de gehele bevolking van de gemeente vertegenwoordigt (<law art="7">artikel 7</law> van de <law>Gemeentewet</law>). Het aantal leden hangt af van het aantal inwoners en wijzigt pas bij de eerstvolgende periodieke verkiezing van de raad (<law art="8">artikel 8</law>).',
  en: 'A raadslid is a member of the <entity role="council">gemeenteraad</entity>, which represents the whole population of the municipality (<law>Gemeentewet</law>, <law art="7">article 7</law>). The number of members depends on the number of inhabitants and changes only at the next periodic election of the council (<law art="8">article 8</law>).',
};

const PROVINCIAAL_STATENLID: OfficeTemplate = {
  law: "BWBR0005645",
  nl: 'Een lid van <entity role="council">Provinciale Staten</entity> zit in het orgaan dat de gehele bevolking van de provincie vertegenwoordigt (<law art="7">artikel 7</law> van de <law>Provinciewet</law>). Het aantal leden hangt af van het aantal inwoners en wijzigt pas bij de eerstvolgende periodieke verkiezing (<law art="8">artikel 8</law>).',
  en: 'A member of <entity role="council">Provinciale Staten</entity> sits in the body that represents the whole population of the province (<law>Provinciewet</law>, <law art="7">article 7</law>). The number of members depends on the number of inhabitants and changes only at the next periodic election (<law art="8">article 8</law>).',
};

const WATERSCHAP_AB: OfficeTemplate = {
  law: "BWBR0005108",
  nl: 'Een lid van het <entity role="board">algemeen bestuur</entity> vertegenwoordigt een categorie van belanghebbenden bij de taken van het waterschap (<law art="12">artikel 12</law> van de <law>Waterschapswet</law>). Het algemeen bestuur telt ten minste achttien en ten hoogste dertig leden (<law art="13">artikel 13</law>).',
  en: 'A member of the <entity role="board">algemeen bestuur</entity> represents a category of interested parties in the water board\'s tasks (<law>Waterschapswet</law>, <law art="12">article 12</law>). The algemeen bestuur has at least eighteen and at most thirty members (<law art="13">article 13</law>).',
};

const WATERSCHAP_DB: OfficeTemplate = {
  law: "BWBR0005108",
  nl: 'Een lid van het <entity role="board">dagelijks bestuur</entity> zit in het bestuur dat bestaat uit de voorzitter en een door het <entity role="ab">algemeen bestuur</entity> bepaald aantal andere leden (<law art="40">artikel 40</law> van de <law>Waterschapswet</law>). Het algemeen bestuur benoemt die leden, de voorzitter uitgezonderd, uit zijn eigen leden (<law art="41">artikel 41</law>).',
  en: 'A member of the <entity role="board">dagelijks bestuur</entity> sits on the board that consists of the chair and a number of other members set by the <entity role="ab">algemeen bestuur</entity> (<law>Waterschapswet</law>, <law art="40">article 40</law>). The algemeen bestuur appoints those members, the chair excepted, from among its own members (<law art="41">article 41</law>).',
};

const EILANDSRAADLID: OfficeTemplate = {
  law: "BWBR0028142",
  nl: 'Een lid van de <entity role="council">eilandsraad</entity> zit in de raad die de gehele bevolking van het openbaar lichaam vertegenwoordigt (<law art="6">artikel 6</law> van de <law>Wet openbare lichamen Bonaire, Sint Eustatius en Saba</law>). De eilandsraad telt negen leden op Bonaire en vijf leden op Sint Eustatius en Saba (<law art="9">artikel 9</law>).',
  en: 'A member of the <entity role="council">eilandsraad</entity> sits on the council that represents the whole population of the public body (<law art="6">article 6</law> of the <law>Wet openbare lichamen Bonaire, Sint Eustatius en Saba</law>). The eilandsraad has nine members on Bonaire and five members on Sint Eustatius and Saba (<law art="9">article 9</law>).',
};

const TWEEDE_KAMERLID: OfficeTemplate = {
  law: "BWBR0001840",
  nl: 'Een lid van de <entity role="chamber">Tweede Kamer</entity> is een van de honderdvijftig leden van die kamer (<law art="51">artikel 51</law> van de <law>Grondwet</law>). De leden worden rechtstreeks gekozen door Nederlanders van achttien jaar of ouder (<law art="54">artikel 54</law>) en de zittingsduur is vier jaar (<law art="52">artikel 52</law>).',
  en: 'A member of the <entity role="chamber">Tweede Kamer</entity> is one of the 150 members of that chamber (<law>Grondwet</law>, <law art="51">article 51</law>). The members are elected directly by Dutch nationals aged eighteen or over (<law art="54">article 54</law>) and the term is four years (<law art="52">article 52</law>).',
};

const EERSTE_KAMERLID: OfficeTemplate = {
  law: "BWBR0001840",
  nl: 'Een lid van de <entity role="chamber">Eerste Kamer</entity> is een van de vijfenzeventig leden van die kamer (<law art="51">artikel 51</law> van de <law>Grondwet</law>). De leden worden gekozen door de leden van provinciale staten en van de kiescolleges (<law art="55">artikel 55</law>) en de zittingsduur is vier jaar (<law art="52">artikel 52</law>).',
  en: 'A member of the <entity role="chamber">Eerste Kamer</entity> is one of the 75 members of that chamber (<law>Grondwet</law>, <law art="51">article 51</law>). The members are elected by the members of provinciale staten and of the kiescolleges (<law art="55">article 55</law>) and the term is four years (<law art="52">article 52</law>).',
};

const GRIFFIER: OfficeTemplate = {
  law: "BWBR0001840",
  nl: 'Elk van beide kamers van de Staten-Generaal benoemt een griffier (<law art="61">artikel 61, lid 2</law>, van de <law>Grondwet</law>).',
  en: 'Each of the two chambers of the Staten-Generaal appoints a griffier (<law>Grondwet</law>, <law art="61">article 61, paragraph 2</law>).',
};

const BURGEMEESTER: OfficeTemplate = {
  law: "BWBR0005416",
  nl: 'De burgemeester wordt bij koninklijk besluit benoemd voor zes jaar (<law art="61">artikel 61</law> van de <law>Gemeentewet</law>). De burgemeester is voorzitter van het <entity role="college">college van burgemeester en wethouders</entity> (<law art="34">artikel 34, lid 2</law>).',
  en: 'The burgemeester is appointed by royal decree for six years (<law>Gemeentewet</law>, <law art="61">article 61</law>). The burgemeester chairs the <entity role="college">college of burgemeester en wethouders</entity> (<law art="34">article 34, paragraph 2</law>).',
};

const COMMISSARIS: OfficeTemplate = {
  law: "BWBR0005645",
  nl: 'De commissaris van de Koning wordt bij koninklijk besluit benoemd voor zes jaar (<law art="61">artikel 61</law> van de <law>Provinciewet</law>). De commissaris en de gedeputeerden vormen <entity role="college">gedeputeerde staten</entity> (<law art="34">artikel 34</law>).',
  en: 'The commissaris van de Koning is appointed by royal decree for six years (<law>Provinciewet</law>, <law art="61">article 61</law>). The commissaris and the gedeputeerden form <entity role="college">gedeputeerde staten</entity> (<law art="34">article 34</law>).',
};

const DIJKGRAAF: OfficeTemplate = {
  law: "BWBR0005108",
  nl: 'De voorzitter van het waterschap wordt bij koninklijk besluit benoemd voor zes jaar (<law art="46">artikel 46</law> van de <law>Waterschapswet</law>).',
  en: 'The chair of the water board is appointed by royal decree for six years (<law>Waterschapswet</law>, <law art="46">article 46</law>).',
};

const GEZAGHEBBER: OfficeTemplate = {
  law: "BWBR0028142",
  nl: 'De gezaghebber wordt bij koninklijk besluit benoemd voor zes jaar (<law art="73">artikel 73</law> van de <law>Wet openbare lichamen Bonaire, Sint Eustatius en Saba</law>). De gezaghebber is voorzitter van de <entity role="council">eilandsraad</entity> (<law art="10">artikel 10</law>) en van het <entity role="college">bestuurscollege</entity> (<law art="36">artikel 36, lid 2</law>).',
  en: 'The gezaghebber is appointed by royal decree for six years (<law art="73">article 73</law> of the <law>Wet openbare lichamen Bonaire, Sint Eustatius en Saba</law>). The gezaghebber chairs the <entity role="council">eilandsraad</entity> (<law art="10">article 10</law>) and the <entity role="college">bestuurscollege</entity> (<law art="36">article 36, paragraph 2</law>).',
};

const MINISTER: OfficeTemplate = {
  law: "BWBR0001840",
  nl: 'Ministers worden bij koninklijk besluit benoemd (<law art="43">artikel 43</law> van de <law>Grondwet</law>). Een ministerie staat onder leiding van een minister (<law art="44">artikel 44, lid 1</law>).',
  en: 'Ministers are appointed by royal decree (<law>Grondwet</law>, <law art="43">article 43</law>). A ministry is headed by a minister (<law art="44">article 44, paragraph 1</law>).',
};

const STAATSSECRETARIS: OfficeTemplate = {
  law: "BWBR0001840",
  nl: 'Staatssecretarissen kunnen bij koninklijk besluit worden benoemd en ontslagen (<law art="46">artikel 46, lid 1</law> van de <law>Grondwet</law>).',
  en: 'State secretaries may be appointed and dismissed by royal decree (<law>Grondwet</law>, <law art="46">article 46, paragraph 1</law>).',
};

const MINISTER_PRESIDENT: OfficeTemplate = {
  law: "BWBR0001840",
  nl: 'De minister-president wordt bij koninklijk besluit benoemd (<law art="43">artikel 43</law> van de <law>Grondwet</law>) en is voorzitter van de ministerraad (<law art="45">artikel 45, lid 2</law>).',
  en: 'The minister-president is appointed by royal decree (<law>Grondwet</law>, <law art="43">article 43</law>) and chairs the council of ministers (<law art="45">article 45, paragraph 2</law>).',
};

/** Unique offices whose copy was written from a fetched official page, keyed by position id. */
const UNIQUE: Record<string, OfficeTemplate> = {
  "pos:justitiele-informatiedienst-algemeendirecteur": {
    nl: 'De algemeen directeur staat aan het hoofd van de <entity role="body">Justitiële Informatiedienst</entity>, een agentschap van het <entity role="ministry">ministerie van Justitie en Veiligheid</entity>.',
    en: 'The algemeen directeur heads the <entity role="body">Justitiële Informatiedienst</entity>, an agency of the <entity role="ministry">Ministry of Justice and Security</entity>.',
  },
  "pos:rijksdienst-voor-identiteitsgegevens-algemeendirecteur": {
    nl: 'De algemeen directeur staat aan het hoofd van de <entity role="body">Rijksdienst voor Identiteitsgegevens</entity>, een agentschap van het <entity role="ministry">ministerie van Binnenlandse Zaken en Koninkrijksrelaties</entity>.',
    en: 'The algemeen directeur heads the <entity role="body">Rijksdienst voor Identiteitsgegevens</entity>, an agency of the <entity role="ministry">Ministry of the Interior and Kingdom Relations</entity>.',
  },
  "pos:justitiele-ict-organisatie-algemeendirecteur": {
    nl: 'De algemeen directeur staat aan het hoofd van de <entity role="body">Justitiële ICT Organisatie</entity>, de ICT-dienstverlener van het <entity role="ministry">ministerie van Justitie en Veiligheid</entity>.',
    en: 'The algemeen directeur heads the <entity role="body">Justitiële ICT Organisatie</entity>, the ICT service of the <entity role="ministry">Ministry of Justice and Security</entity>.',
  },
};

/** The wetten.overheid.nl JCI permalink for a BWB, or one article of it. */
export function wettenArtikelUrl(bwb: string, artikel?: string): string {
  if (artikel === undefined || artikel === "") return `https://wetten.overheid.nl/${bwb}`;
  return `https://wetten.overheid.nl/jci1.3:c:${bwb}&artikel=${artikel}`;
}

/** The visible words of office copy, tags removed. */
export function stripOfficeCopyMarkup(text: string): string {
  return text.replaceAll(/<[^>]+>/g, "");
}

/**
 * Sibling ids for the tagged roles in a template. Derived from the body's id
 * scheme; a missing record stays plain text in the renderer.
 */
export function officeCopyRoles(position: {
  title: string;
  organization?: string;
  parent?: string | null;
}): Record<string, string> {
  const org = position.organization;
  if (org === undefined) return {};
  const { title } = position;
  const suffix = (prefix: string): string | null => {
    if (!org.startsWith(prefix)) return null;
    return org.slice(prefix.length);
  };
  const withParent = (roles: Record<string, string>): Record<string, string> => {
    if (position.parent) roles.ministry = position.parent;
    roles.body = org;
    return roles;
  };
  if (title === "Wethouder") {
    const place = suffix("org:college-van-bw-");
    return place === null
      ? { college: org }
      : { mayor: `pos:burgemeester-${place}`, college: org, council: `org:gemeenteraad-${place}` };
  }
  if (title === "Gedeputeerde") {
    const place = suffix("org:gedeputeerde-staten-");
    return place === null
      ? { college: org }
      : {
          commissioner: `pos:commissaris-van-de-koning-${place}`,
          college: org,
          council: `org:provinciale-staten-${place}`,
        };
  }
  if (title.startsWith("Eilandgedeputeerde van ")) {
    const place = suffix("org:bestuurscollege-");
    return place === null
      ? { college: org }
      : { gezaghebber: `pos:gezaghebber-${place}`, college: org, council: `org:eilandsraad-${place}` };
  }
  if (title === "Secretaris-generaal") return { ministry: org };
  if (title.startsWith("Lid gemeenteraad van ")) return { council: org };
  if (title.startsWith("Lid Provinciale Staten van ")) return { council: org };
  if (title.startsWith("Lid Algemeen Bestuur van ")) return { board: org };
  if (title.startsWith("Lid Dagelijks Bestuur van ")) {
    const place = suffix("org:dagelijks-bestuur-");
    return place === null ? { board: org } : { board: org, ab: `org:algemeen-bestuur-${place}` };
  }
  if (title.startsWith("Lid eilandsraad van ")) return { council: org };
  if (title === "Lid van de Tweede Kamer der Staten-Generaal") return { chamber: org };
  if (title === "Lid van de Eerste Kamer der Staten-Generaal") return { chamber: org };
  if (title.startsWith("Griffier van de ")) return { chamber: org };
  if (title.startsWith("Statenlid van ")) return { staten: org };
  if (title.startsWith("Burgemeester")) {
    const place = suffix("org:gemeente-");
    return withParent(
      place === null
        ? { body: org }
        : { college: `org:college-van-bw-${place}`, council: `org:gemeenteraad-${place}`, body: org },
    );
  }
  if (title.startsWith("Commissaris van de Koning")) {
    const place = suffix("org:provincie-");
    return withParent(
      place === null ? { body: org } : { college: `org:gedeputeerde-staten-${place}`, body: org },
    );
  }
  if (title.startsWith("Gezaghebber van ")) {
    const place = suffix("org:openbaar-lichaam-");
    return withParent(
      place === null
        ? { body: org }
        : { council: `org:eilandsraad-${place}`, college: `org:bestuurscollege-${place}`, body: org },
    );
  }
  if (title.startsWith("Dijkgraaf")) return withParent({ body: org });
  if (title.startsWith("Minister") || title.startsWith("Staatssecretaris")) return withParent({ ministry: org, body: org });
  return withParent({});
}

function fillCopy(template: OfficeTemplate, roles: Record<string, string>): PositionOfficeCopy {
  const law = template.law;
  const fill = (text: string): string =>
    text
      .replaceAll(/<entity role="([^"]+)">([^<]*)<\/entity>/g, (_all, role: string, label: string) => {
        const id = roles[role];
        return id === undefined ? label : `<entity id="${id}">${label}</entity>`;
      })
      .replaceAll(/<law(?: art="([^"]+)")?>/g, (_all, artikel: string | undefined) => {
        const href = law === undefined ? "" : wettenArtikelUrl(law, artikel);
        return `<law href="${href}">`;
      });
  return { nl: fill(template.nl), en: fill(template.en) };
}

/**
 * Short prose on what an office is and how it is filled, or null when no
 * sourced copy exists for the title. Exact titles first, then prefixes.
 * Entity and law tags are filled from the body's id.
 */
export function positionOfficeCopy(position: {
  id?: string;
  title: string;
  organization?: string;
  parent?: string | null;
  country?: string;
  subtype?: string | null;
}): PositionOfficeCopy | null {
  const { title } = position;
  const roles = officeCopyRoles(position);
  if (position.id !== undefined && UNIQUE[position.id] !== undefined) return fillCopy(UNIQUE[position.id], roles);
  if (title === "Wethouder") return fillCopy(WETHOUDER, roles);
  if (title === "Gedeputeerde") return fillCopy(GEDEPUTEERDE, roles);
  if (title === "Secretaris-generaal") {
    if (position.organization !== undefined && SECRETARIS_GENERAAL_GAPS.has(position.organization)) return null;
    return fillCopy(SECRETARIS_GENERAAL, roles);
  }
  if (title === "Lid van de Tweede Kamer der Staten-Generaal") return fillCopy(TWEEDE_KAMERLID, roles);
  if (title === "Lid van de Eerste Kamer der Staten-Generaal") return fillCopy(EERSTE_KAMERLID, roles);
  if (title.startsWith("Griffier van de ")) return fillCopy(GRIFFIER, roles);
  if (title.startsWith("Lid gemeenteraad van ")) return fillCopy(RAADSLID, roles);
  if (title.startsWith("Lid Provinciale Staten van ")) return fillCopy(PROVINCIAAL_STATENLID, roles);
  if (title.startsWith("Lid Algemeen Bestuur van ")) return fillCopy(WATERSCHAP_AB, roles);
  if (title.startsWith("Lid Dagelijks Bestuur van ")) return fillCopy(WATERSCHAP_DB, roles);
  if (title.startsWith("Lid eilandsraad van ")) return fillCopy(EILANDSRAADLID, roles);
  const island = /^Eilandgedeputeerde van (.+)$/u.exec(title);
  if (island !== null) return fillCopy(eilandgedeputeerde(island[1]), roles);
  const country = /^Statenlid van (.+)$/u.exec(title);
  if (country !== null) return fillCopy(statenlid(country[1]), roles);
  if (title.startsWith("Burgemeester")) return fillCopy(BURGEMEESTER, roles);
  if (title.startsWith("Commissaris van de Koning")) return fillCopy(COMMISSARIS, roles);
  if (title.startsWith("Dijkgraaf")) return fillCopy(DIJKGRAAF, roles);
  if (title.startsWith("Gezaghebber van ")) return fillCopy(GEZAGHEBBER, roles);
  const dutchRijk = position.country === "nederland" && position.subtype === "ministerie";
  if (title === "Minister-president en Minister van Algemene Zaken") return fillCopy(MINISTER_PRESIDENT, roles);
  if (dutchRijk && title.startsWith("Staatssecretaris")) return fillCopy(STAATSSECRETARIS, roles);
  if (dutchRijk && title.startsWith("Minister van ") && !title.includes("Stichting")) return fillCopy(MINISTER, roles);
  return null;
}
