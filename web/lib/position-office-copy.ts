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
 * - Wet RO (geldend van 01-01-2026) art. 15 lid 3: "De voorzitter van het bestuur draagt de titel van president."
 * - Wet RO art. 15 lid 4: "De bestuursleden worden bij koninklijk besluit op voordracht van Onze Minister benoemd voor een periode van zes jaar."
 * - Wet RO art. 27: "De president vertegenwoordigt het gerecht."
 * - Regeling agentschappen 2024 (geldend van 01-01-2025) art. 1 lid 1: "eindverantwoordelijke binnen het agentschap: de hoogstgeplaatste ambtenaar die binnen het agentschap de eindverantwoordelijkheid draagt voor het beleid en de algemene gang van zaken;"
 * - RvO Tweede Kamer (BWBR0044975, geldend van 16-06-2026) art. 7.1 lid 1: "Er is een vaste commissie voor elk ministerie, met uitzondering van het ministerie van Algemene Zaken."
 * - RvO Tweede Kamer art. 7.11 lid 2: "De Voorzitter benoemt in overleg met de fracties en groepen de leden, en voor zover hij dit wenselijk acht, plaatsvervangende leden."
 * - RvO Tweede Kamer art. 7.12 lid 1: "Een nieuw ingestelde commissie benoemt in haar eerste vergadering uit haar midden een commissievoorzitter en een commissieondervoorzitter."
 * - RvO Tweede Kamer art. 7.13 lid 1 onder a: "het leiden van de werkzaamheden van een commissie;"
 * - Comptabiliteitswet 2016 art. 7.8 lid 1: "De president houdt toezicht op de werkzaamheden van de Algemene Rekenkamer en op de juiste toepassing van het bij of krachtens dit hoofdstuk bepaalde."
 * - knmi.nl/over-het-knmi/bestuur, fetched 2026-10-17: "Maarten van Aalst is sinds 1 februari 2023 eindverantwoordelijk voor het KNMI."
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
 * - Statuut art. 7: "De raad van ministers van het Koninkrijk is samengesteld uit de door de Koning benoemde ministers en de door de regering van Aruba, Curaçao onderscheidenlijk Sint Maarten benoemde Gevolmachtigde Minister."
 * - Statuut art. 8 lid 1: "De Gevolmachtigde Ministers handelen namens de regeringen van hun land, die hen benoemen en ontslaan."
 * - Fractievoorzitter: neither Kamer RvO uses the word; named gap.
 * - Eerste Kamer committee seats: the fetched EK RvO (BWBR0007428) is marked
 *   materieel uitgewerkt per 13-06-2023, so it is not used.
 * - Caribbean ministers stay empty until their own laws are fetched.
 * - Grondwet art. 24: "Het koningschap wordt erfelijk vervuld door de wettige opvolgers van Koning Willem I, Prins van Oranje-Nassau."
 * - Grondwet art. 42: "1 De regering wordt gevormd door de Koning en de ministers. 2 De Koning is onschendbaar; de ministers zijn verantwoordelijk."
 * - Grondwet art. 61 lid 1: "Elk der kamers benoemt uit de leden een voorzitter."
 * - Politiewet 2012 (geldend van 12-06-2026) art. 27 lid 1: "De korpschef is belast met de leiding en het beheer van de politie. De korpschef legt over de uitoefening van zijn taken en bevoegdheden verantwoording af aan Onze Minister."
 * - Wet RO art. 72 lid 1: "De Hoge Raad bestaat uit een president, ten hoogste zeven vice-presidenten, ten hoogste dertig raadsheren en ten hoogste twintig raadsheren in buitengewone dienst."
 * - Wet RO art. 111 lid 1: "Er is een parket bij de Hoge Raad, aan het hoofd waarvan de procureur-generaal bij de Hoge Raad staat."
 * - Wet RO art. 130 lid 1-3: there is a College van procureurs-generaal at the head of the OM; a chair is appointed by royal decree for at most three years.
 * - Wet Nationale ombudsman art. 2 lid 1-3: "Er is een Nationale ombudsman." Appointed by the Tweede Kamer for six years.
 * - Wet Nationaal rapporteur art. 1: "Er is een Nationaal rapporteur mensenhandel en seksueel geweld tegen kinderen." Art. 3: appointed by royal decree for at most four years. Art. 5: research, advise, report.
 * - Wet op de Raad van State art. 1 lid 1: "De Raad van State bestaat, buiten de Koning als voorzitter, uit een vice-president en ten hoogste tien leden." Art. 2: appointed for life by royal decree.
 * - Wet op de Raad van State art. 30a lid 1 and 5: a chair of the Afdeling bestuursrechtspraak is appointed from its members; that chair arranges the division's work.
 * - RvO Tweede Kamer art. 3.5 lid 1: "De Kamer benoemt na elke voorzittersbenoeming een door haar te bepalen aantal Ondervoorzitters, en stelt daarbij hun onderlinge rangorde vast."
 * - RvO Tweede Kamer art. 3.6 lid 1: "De Voorzitter en de Ondervoorzitters vormen samen het Presidium."
 * - Beroepswet art. 3 and Wet bestuursrechtspraak bedrijfsorganisatie art. 4: Wet RO chapter 2 (including the title of president) applies correspondingly to the CRvB and the CBb.
 * - Rijkswet reglement gouverneur Aruba (BWBR0003900), Curaçao (BWBR0028105) and Sint Maarten (BWBR0028096) art. 1 lid 1-2: the governor represents the King as head of that country's government and the Kingdom government, and is appointed by royal decree for six years.
 * - Aanwijzingen voor de Planbureaus (BWBR0031972) name the three bureaus and do not describe the directeur, so those pages stay empty.
 * - Kaderwet zelfstandige bestuursorganen art. 12 names how members of a publiekrechtelijk ZBO are appointed, but not every ZBO is publiekrechtelijk, so it is not used as shared copy.
 * - Wet RO art. 84 lid 2-5: the Raad voor de rechtspraak has three to five members appointed by royal decree for six years; one of the judicial members is appointed chair.
 */

export type PositionOfficeCopy = { nl: string; en: string };

type OfficeTemplate = PositionOfficeCopy & { law?: string };

export const WETHOUDER_SOURCE = "https://wetten.overheid.nl/BWBR0005416";
export const GEDEPUTEERDE_SOURCE = "https://wetten.overheid.nl/BWBR0005645";
export const EILANDGEDEPUTEERDE_SOURCE = "https://wetten.overheid.nl/BWBR0028142";
export const STATUUT_SOURCE = "https://wetten.overheid.nl/BWBR0002154";
export const WATERSCHAPSWET_SOURCE = "https://wetten.overheid.nl/BWBR0005108";
export const GRONDWET_SOURCE = "https://wetten.overheid.nl/BWBR0001840";
export const WET_RO_SOURCE = "https://wetten.overheid.nl/BWBR0001830";
export const REGELING_AGENTSCHAPPEN_SOURCE = "https://wetten.overheid.nl/BWBR0050264";
export const RVO_TWEEDE_KAMER_SOURCE = "https://wetten.overheid.nl/BWBR0044975";
export const COMPTABILITEITSWET_SOURCE = "https://wetten.overheid.nl/BWBR0039429";
export const KNMI_BESTUUR_SOURCE = "https://www.knmi.nl/over-het-knmi/bestuur";
export const POLITIEWET_SOURCE = "https://wetten.overheid.nl/BWBR0031788";
export const WET_NATIONALE_OMBUDSMAN_SOURCE = "https://wetten.overheid.nl/BWBR0003372";
export const WET_NATIONAAL_RAPPORTEUR_SOURCE = "https://wetten.overheid.nl/BWBR0034176";
export const WET_RAAD_VAN_STATE_SOURCE = "https://wetten.overheid.nl/BWBR0002367";
export const BEROEPSWET_SOURCE = "https://wetten.overheid.nl/BWBR0002170";
export const WET_BRBO_SOURCE = "https://wetten.overheid.nl/BWBR0002144";
export const REGLEMENT_GOUVERNEUR_ARUBA_SOURCE = "https://wetten.overheid.nl/BWBR0003900";
export const REGLEMENT_GOUVERNEUR_CURACAO_SOURCE = "https://wetten.overheid.nl/BWBR0028105";
export const REGLEMENT_GOUVERNEUR_SINT_MAARTEN_SOURCE = "https://wetten.overheid.nl/BWBR0028096";
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

const PRESIDENT_GERECHT: OfficeTemplate = {
  law: "BWBR0001830",
  nl: 'De voorzitter van het bestuur van het <entity role="body">gerecht</entity> draagt de titel van president en wordt bij koninklijk besluit benoemd voor zes jaar (<law art="15">artikel 15</law> van de <law>Wet op de rechterlijke organisatie</law>). De president vertegenwoordigt het gerecht (<law art="27">artikel 27</law>).',
  en: 'The chair of the board of the <entity role="body">court</entity> holds the title of president and is appointed by royal decree for six years (<law>Wet op de rechterlijke organisatie</law>, <law art="15">article 15</law>). The president represents the court (<law art="27">article 27</law>).',
};

const AGENTSCHAP_HEAD: OfficeTemplate = {
  law: "BWBR0050264",
  nl: 'De hoogstgeplaatste ambtenaar van het <entity role="body">agentschap</entity> draagt de eindverantwoordelijkheid voor het beleid en de algemene gang van zaken (<law art="1">artikel 1</law> van de <law>Regeling agentschappen 2024</law>).',
  en: 'The highest-ranking official of the <entity role="body">agency</entity> bears final responsibility for policy and the general course of affairs (<law>Regeling agentschappen 2024</law>, <law art="1">article 1</law>).',
};

const TK_VASTE_COMMISSIE_LID: OfficeTemplate = {
  law: "BWBR0044975",
  nl: 'De <entity role="chamber">Tweede Kamer</entity> heeft een vaste commissie voor elk ministerie, met uitzondering van het ministerie van Algemene Zaken (<law art="7.1">artikel 7.1</law> van het <law>Reglement van Orde</law>). De Voorzitter benoemt de leden in overleg met de fracties (<law art="7.11">artikel 7.11</law>).',
  en: 'The <entity role="chamber">Tweede Kamer</entity> has a standing committee for each ministry except the Ministry of General Affairs (<law>Reglement van Orde</law>, <law art="7.1">article 7.1</law>). The Speaker appoints the members in consultation with the parliamentary groups (<law art="7.11">article 7.11</law>).',
};

function gevolmachtigde(country: string): OfficeTemplate {
  return {
    law: "BWBR0002154",
    nl: `De gevolmachtigde minister van ${country} handelt namens de regering van dat land, die hem benoemt en ontslaat (<law art="8">artikel 8</law> van het <law>Statuut voor het Koninkrijk der Nederlanden</law>). Hij heeft zitting in de raad van ministers van het Koninkrijk (<law art="7">artikel 7</law>).`,
    en: `The gevolmachtigde minister of ${country} acts on behalf of that country's government, which appoints and dismisses them (<law art="8">article 8</law> of the <law>Statuut voor het Koninkrijk der Nederlanden</law>). They sit on the council of ministers of the Kingdom (<law art="7">article 7</law>).`,
  };
}

const TK_VASTE_COMMISSIE_VOORZITTER: OfficeTemplate = {
  law: "BWBR0044975",
  nl: 'Een nieuw ingestelde commissie van de <entity role="chamber">Tweede Kamer</entity> benoemt in haar eerste vergadering uit haar midden een commissievoorzitter (<law art="7.12">artikel 7.12</law> van het <law>Reglement van Orde</law>). De commissievoorzitter leidt de werkzaamheden van de commissie (<law art="7.13">artikel 7.13</law>).',
  en: 'A newly established committee of the <entity role="chamber">Tweede Kamer</entity> appoints a chair from among its members at its first meeting (<law>Reglement van Orde</law>, <law art="7.12">article 7.12</law>). The committee chair leads the committee\'s work (<law art="7.13">article 7.13</law>).',
};

const TK_VASTE_COMMISSIE_ONDERVOORZITTER: OfficeTemplate = {
  law: "BWBR0044975",
  nl: 'Een nieuw ingestelde commissie van de <entity role="chamber">Tweede Kamer</entity> benoemt in haar eerste vergadering uit haar midden een commissievoorzitter en een commissieondervoorzitter (<law art="7.12">artikel 7.12</law> van het <law>Reglement van Orde</law>).',
  en: 'A newly established committee of the <entity role="chamber">Tweede Kamer</entity> appoints a chair and a deputy chair from among its members at its first meeting (<law>Reglement van Orde</law>, <law art="7.12">article 7.12</law>).',
};

const KAMER_VOORZITTER: OfficeTemplate = {
  law: "BWBR0001840",
  nl: 'Elk der kamers van de Staten-Generaal benoemt uit de leden een voorzitter (<law art="61">artikel 61, lid 1</law> van de <law>Grondwet</law>).',
  en: 'Each chamber of the Staten-Generaal appoints a chair from among its members (<law>Grondwet</law>, <law art="61">article 61, paragraph 1</law>).',
};

const TK_KAMER_ONDERVOORZITTER: OfficeTemplate = {
  law: "BWBR0044975",
  nl: 'De <entity role="chamber">Tweede Kamer</entity> benoemt na elke voorzittersbenoeming een door haar te bepalen aantal ondervoorzitters (<law art="3.5">artikel 3.5</law> van het <law>Reglement van Orde</law>). De Voorzitter en de ondervoorzitters vormen het Presidium (<law art="3.6">artikel 3.6</law>).',
  en: 'After each election of the Speaker, the <entity role="chamber">Tweede Kamer</entity> appoints a number of deputy Speakers that it determines (<law>Reglement van Orde</law>, <law art="3.5">article 3.5</law>). The Speaker and the deputy Speakers form the Presidium (<law art="3.6">article 3.6</law>).',
};

const KORPSCHEF: OfficeTemplate = {
  law: "BWBR0031788",
  nl: 'De korpschef is belast met de leiding en het beheer van de <entity role="body">politie</entity> en legt daarover verantwoording af aan de minister (<law art="27">artikel 27</law> van de <law>Politiewet 2012</law>).',
  en: 'The korpschef is charged with the leadership and management of the <entity role="body">police</entity> and is accountable for this to the minister (<law>Politiewet 2012</law>, <law art="27">article 27</law>).',
};

function gouverneur(country: string): OfficeTemplate {
  return {
    nl: `De gouverneur van ${country} is vertegenwoordiger van de Koning als hoofd van de regering van dat land, en tevens vertegenwoordiger van de regering van het Koninkrijk (<law art="1">artikel 1</law> van het <law>Reglement voor de gouverneur</law>). Hij wordt bij koninklijk besluit voor zes jaar benoemd.`,
    en: `The governor of ${country} represents the King as head of that country's government, and also represents the government of the Kingdom (<law art="1">article 1</law> of the <law>Reglement voor de gouverneur</law>). They are appointed by royal decree for six years.`,
  };
}

const GOUVERNEUR_LAW: Record<string, string> = {
  Aruba: "BWBR0003900",
  Curaçao: "BWBR0028105",
  "Sint Maarten": "BWBR0028096",
};

const RAAD_VOOR_DE_RECHTSPRAAK_VOORZITTER: OfficeTemplate = {
  law: "BWBR0001830",
  nl: 'Een van de rechterlijke leden van de <entity role="body">Raad voor de rechtspraak</entity> wordt bij koninklijk besluit tot voorzitter benoemd (<law art="84">artikel 84</law> van de <law>Wet op de rechterlijke organisatie</law>).',
  en: 'One of the judicial members of the <entity role="body">Raad voor de rechtspraak</entity> is appointed chair by royal decree (<law>Wet op de rechterlijke organisatie</law>, <law art="84">article 84</law>).',
};

const RAAD_VOOR_DE_RECHTSPRAAK_LID: OfficeTemplate = {
  law: "BWBR0001830",
  nl: 'De <entity role="body">Raad voor de rechtspraak</entity> bestaat uit ten minste drie en ten hoogste vijf leden, die bij koninklijk besluit voor zes jaar worden benoemd (<law art="84">artikel 84</law> van de <law>Wet op de rechterlijke organisatie</law>).',
  en: 'The <entity role="body">Raad voor de rechtspraak</entity> consists of at least three and at most five members, appointed by royal decree for six years (<law>Wet op de rechterlijke organisatie</law>, <law art="84">article 84</law>).',
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
  "pos:president-algemene-rekenkamer": {
    law: "BWBR0039429",
    nl: 'De president houdt toezicht op de werkzaamheden van de <entity role="body">Algemene Rekenkamer</entity> (<law art="7.8">artikel 7.8</law> van de <law>Comptabiliteitswet 2016</law>).',
    en: 'The president supervises the work of the <entity role="body">Algemene Rekenkamer</entity> (<law>Comptabiliteitswet 2016</law>, <law art="7.8">article 7.8</law>).',
  },
  "pos:koninklijk-nederlands-meteorologisch-instituut-hoofddirecteur": {
    nl: 'De hoofddirecteur is eindverantwoordelijk voor het <entity role="body">KNMI</entity>.',
    en: 'The hoofddirecteur is ultimately responsible for <entity role="body">KNMI</entity>.',
  },
  "pos:koning": {
    law: "BWBR0001840",
    nl: 'Het koningschap wordt erfelijk vervuld door de wettige opvolgers van Koning Willem I (<law art="24">artikel 24</law> van de <law>Grondwet</law>). De regering wordt gevormd door de Koning en de ministers; de Koning is onschendbaar en de ministers zijn verantwoordelijk (<law art="42">artikel 42</law>).',
    en: 'The kingship is held by hereditary succession from King Willem I (<law>Grondwet</law>, <law art="24">article 24</law>). The government is formed by the King and the ministers; the King is inviolable and the ministers are responsible (<law art="42">article 42</law>).',
  },
  "pos:nationale-ombudsman": {
    law: "BWBR0003372",
    nl: 'Er is een Nationale ombudsman, benoemd door de <entity role="chamber">Tweede Kamer</entity> voor zes jaar (<law art="2">artikel 2</law> van de <law>Wet Nationale ombudsman</law>).',
    en: 'There is a National Ombudsman, appointed by the <entity role="chamber">Tweede Kamer</entity> for six years (<law>Wet Nationale ombudsman</law>, <law art="2">article 2</law>).',
  },
  "pos:zbo-nationaal-rapporteur-mensenhandel-en-seksueel-geweld-tegen-kinderen-nationaal-rapporteur-mensenhandel-en-seksueel-geweld-tegen-kinderen": {
    law: "BWBR0034176",
    nl: 'Er is een Nationaal rapporteur mensenhandel en seksueel geweld tegen kinderen, die bij koninklijk besluit voor ten hoogste vier jaar wordt benoemd (<law art="1">artikel 1</law> en <law art="3">artikel 3</law> van de <law>Wet Nationaal rapporteur mensenhandel en seksueel geweld tegen kinderen</law>). De rapporteur onderzoekt die onderwerpen, adviseert de regering en rapporteert periodiek (<law art="5">artikel 5</law>).',
    en: 'There is a National Rapporteur on Trafficking in Human Beings and Sexual Violence against Children, appointed by royal decree for at most four years (<law art="1">article 1</law> and <law art="3">article 3</law> of the <law>Wet Nationaal rapporteur mensenhandel en seksueel geweld tegen kinderen</law>). The rapporteur researches those subjects, advises the government and reports periodically (<law art="5">article 5</law>).',
  },
  "pos:vice-president-raad-van-state": {
    law: "BWBR0002367",
    nl: 'De <entity role="body">Raad van State</entity> bestaat, buiten de Koning als voorzitter, uit een vice-president en ten hoogste tien leden (<law art="1">artikel 1</law> van de <law>Wet op de Raad van State</law>). De vice-president wordt bij koninklijk besluit voor het leven benoemd (<law art="2">artikel 2</law>).',
    en: 'The <entity role="body">Raad van State</entity> consists, besides the King as chair, of a vice-president and at most ten members (<law>Wet op de Raad van State</law>, <law art="1">article 1</law>). The vice-president is appointed for life by royal decree (<law art="2">article 2</law>).',
  },
  "pos:voorzitter-afdeling-bestuursrechtspraak": {
    law: "BWBR0002367",
    nl: 'Bij koninklijk besluit wordt uit de leden van de Afdeling bestuursrechtspraak een voorzitter van die afdeling benoemd (<law art="30a">artikel 30a</law> van de <law>Wet op de Raad van State</law>). De voorzitter regelt de werkzaamheden van de afdeling.',
    en: 'A chair of the Administrative Jurisdiction Division is appointed by royal decree from among the members of that division (<law>Wet op de Raad van State</law>, <law art="30a">article 30a</law>). The chair arranges the division\'s work.',
  },
  "pos:president-hoge-raad": {
    law: "BWBR0001830",
    nl: 'De <entity role="body">Hoge Raad</entity> bestaat uit een president, ten hoogste zeven vice-presidenten, ten hoogste dertig raadsheren en ten hoogste twintig raadsheren in buitengewone dienst (<law art="72">artikel 72</law> van de <law>Wet op de rechterlijke organisatie</law>).',
    en: 'The <entity role="body">Hoge Raad</entity> consists of a president, at most seven vice-presidents, at most thirty justices and at most twenty justices extraordinary (<law>Wet op de rechterlijke organisatie</law>, <law art="72">article 72</law>).',
  },
  "pos:procureur-generaal-hoge-raad": {
    law: "BWBR0001830",
    nl: 'Er is een parket bij de <entity role="body">Hoge Raad</entity>, aan het hoofd waarvan de procureur-generaal bij de Hoge Raad staat (<law art="111">artikel 111</law> van de <law>Wet op de rechterlijke organisatie</law>).',
    en: 'There is a procuratorate at the <entity role="body">Hoge Raad</entity>, headed by the procureur-generaal at the Hoge Raad (<law>Wet op de rechterlijke organisatie</law>, <law art="111">article 111</law>).',
  },
  "pos:voorzitter-college-van-procureurs-generaal": {
    law: "BWBR0001830",
    nl: 'Het College van procureurs-generaal staat aan het hoofd van het openbaar ministerie. Bij koninklijk besluit wordt een van de procureurs-generaal tot voorzitter van het College benoemd voor ten hoogste drie jaar (<law art="130">artikel 130</law> van de <law>Wet op de rechterlijke organisatie</law>).',
    en: 'The College van procureurs-generaal heads the public prosecution service. One of the procureurs-generaal is appointed chair of the College by royal decree for at most three years (<law>Wet op de rechterlijke organisatie</law>, <law art="130">article 130</law>).',
  },
  "pos:procureur-generaal-lid-college": {
    law: "BWBR0001830",
    nl: 'Er is een College van procureurs-generaal. Het College bestaat uit ten minste drie en ten hoogste vijf procureurs-generaal en staat aan het hoofd van het openbaar ministerie (<law art="130">artikel 130</law> van de <law>Wet op de rechterlijke organisatie</law>).',
    en: 'There is a College van procureurs-generaal. The College consists of at least three and at most five procureurs-generaal and heads the public prosecution service (<law>Wet op de rechterlijke organisatie</law>, <law art="130">article 130</law>).',
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
  if (
    title.startsWith("President van de Rechtbank") ||
    title.startsWith("President van het Gerechtshof") ||
    title === "President van de Centrale Raad van Beroep" ||
    title === "President van het College van Beroep voor het bedrijfsleven"
  ) {
    return withParent({ body: org });
  }
  if (title.startsWith("Lid Vaste commissie") || title.startsWith("Voorzitter Vaste commissie") || title.startsWith("Ondervoorzitter Vaste commissie")) {
    return { chamber: "org:tweede-kamer", body: org };
  }
  if (
    title.startsWith("Voorzitter van de Tweede Kamer") ||
    title.startsWith("Voorzitter van de Eerste Kamer") ||
    title.includes("ondervoorzitter van de Tweede Kamer")
  ) {
    return { chamber: org, body: org };
  }
  if (title === "Nationale ombudsman") return { chamber: "org:tweede-kamer", body: org };
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
  if (
    title.startsWith("President van de Rechtbank") ||
    title.startsWith("President van het Gerechtshof") ||
    title === "President van de Centrale Raad van Beroep" ||
    title === "President van het College van Beroep voor het bedrijfsleven"
  ) {
    return fillCopy(PRESIDENT_GERECHT, roles);
  }
  if (title.startsWith("Lid Vaste commissie")) return fillCopy(TK_VASTE_COMMISSIE_LID, roles);
  if (title.startsWith("Voorzitter Vaste commissie")) return fillCopy(TK_VASTE_COMMISSIE_VOORZITTER, roles);
  if (title.startsWith("Ondervoorzitter Vaste commissie")) return fillCopy(TK_VASTE_COMMISSIE_ONDERVOORZITTER, roles);
  if (
    title === "Voorzitter van de Tweede Kamer der Staten-Generaal" ||
    title === "Voorzitter van de Eerste Kamer der Staten-Generaal"
  ) {
    return fillCopy(KAMER_VOORZITTER, roles);
  }
  if (
    title === "Eerste ondervoorzitter van de Tweede Kamer der Staten-Generaal" ||
    title === "Tweede ondervoorzitter van de Tweede Kamer der Staten-Generaal"
  ) {
    return fillCopy(TK_KAMER_ONDERVOORZITTER, roles);
  }
  if (title === "Voorzitter van de Raad voor de rechtspraak") {
    return fillCopy(RAAD_VOOR_DE_RECHTSPRAAK_VOORZITTER, roles);
  }
  if (
    title === "Rechterlijk lid van de Raad voor de rechtspraak" ||
    title === "Niet-rechterlijk lid van de Raad voor de rechtspraak"
  ) {
    return fillCopy(RAAD_VOOR_DE_RECHTSPRAAK_LID, roles);
  }
  if (title.startsWith("Korpschef")) return fillCopy(KORPSCHEF, roles);
  const gov = /^Gouverneur van (.+)$/u.exec(title);
  if (gov !== null && GOUVERNEUR_LAW[gov[1]] !== undefined) {
    return fillCopy({ ...gouverneur(gov[1]), law: GOUVERNEUR_LAW[gov[1]] }, roles);
  }
  if (position.subtype === "agentschap" && /directeur/i.test(title)) return fillCopy(AGENTSCHAP_HEAD, roles);
  const gevolm = /^Gevolmachtigde minister van (.+)$/u.exec(title);
  if (gevolm !== null) return fillCopy(gevolmachtigde(gevolm[1]), roles);
  return null;
}
