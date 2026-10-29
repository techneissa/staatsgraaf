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
 * AZ "De secretaris-generaal (SG) is belast met de ambtelijke leiding van het ministerie.",
 * BZ "heeft sinds 12 augustus 2024 de ambtelijke leiding over het ministerie van Buitenlandse Zaken",
 * BZK "heeft de ambtelijke leiding over het ministerie van BZK.",
 * EZK "De sg heeft de ambtelijke leiding over het ministerie.",
 * LVVN "De sg heeft de ambtelijke leiding over het ministerie.",
 * SZW "heeft de ambtelijke leiding van het ministerie.",
 * VWS "De ambtelijke leiding van VWS ligt bij secretaris-generaal ...",
 * Defensie "is er ook iemand belast met de ambtelijke leiding over het departement. Dat is de secretaris-generaal (SG).",
 * OCW "De ambtelijke leiding van het departement bestaat uit de bestuursraad OCW, met aan het hoofd de secretaris-generaal."
 *
 * Named gaps, not covered:
 * - Secretaris-generaal at Financien: the fetched page (ambtelijke-leiding) has
 * no sentence on what the secretaris-generaal does, so that title returns null.
 * - Inspecteur-generaal: the Ambtenarenwet art. 1 does not describe the office
 * and the rijksoverheid pages give no shared sentence (SZW names the
 * inspecteur-generaal "verantwoordelijk voor de uitvoerende diensten van het
 * ministerie", the OCW inspecties page says nothing on the office). Omitted.
 * - Statuut art. 46 states no seat counts; none are written here.
 * - Statuut art. 7: "De raad van ministers van het Koninkrijk is samengesteld uit de door de Koning benoemde ministers en de door de regering van Aruba, Curaçao onderscheidenlijk Sint Maarten benoemde Gevolmachtigde Minister."
 * - Statuut art. 8 lid 1: "De Gevolmachtigde Ministers handelen namens de regeringen van hun land, die hen benoemen en ontslaan."
 * - Fractievoorzitter: neither Kamer RvO uses the word; named gap.
 * - Eerste Kamer committee seats: the fetched EK RvO (BWBR0007428) is marked
 * materieel uitgewerkt per 13-06-2023, so it is not used.
 * - Caribbean ministers now cite each land's Staatsregeling; the Grondwet is not used for them.
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
 * - Aanwijzingen voor de Planbureaus (BWBR0031972) aanwijzing 6 lid 3: "De directeur van het planbureau stelt het werkprogramma jaarlijks vast, gehoord het gevoelen van de ministerraad."
 * - Kaderwet zelfstandige bestuursorganen art. 12 names how members of a publiekrechtelijk ZBO are appointed, but not every ZBO is publiekrechtelijk, so it is not used as shared copy.
 * - Wet RO art. 84 lid 2-5: the Raad voor de rechtspraak has three to five members appointed by royal decree for six years; one of the judicial members is appointed chair.
 * - Wet op de Raad van State art. 16a lid 4: "De vice-president is voorzitter van de Afdeling advisering."
 * - WolBES art. 187 lid 1: "Er is een Rijksvertegenwoordiger voor de openbare lichamen Bonaire, Sint Eustatius en Saba."
 * - WolBES art. 188 lid 1: "De Rijksvertegenwoordiger wordt bij koninklijk besluit op voordracht van Onze Minister benoemd voor de tijd van zes jaar."
 * - Rijkswet Onderzoeksraad voor veiligheid (BWBR0017613) art. 6 lid 1: "De raad kent minimaal drie en maximaal vijf leden, de voorzitter daaronder begrepen." Art. 8 lid 1: a member under art. 6 lid 1 is appointed chair by royal decree.
 * - Zaaizaad- en plantgoedwet (BWBR0018040) art. 3 lid 1: "De Raad bestaat uit ten minste zeven en ten hoogste elf leden, de voorzitter daaronder begrepen." Art. 4 lid 1: chair and other members appointed for five years.
 * - Mediawet 2008 art. 2.60c lid 1: "De raad van toezicht van de RPO bestaat uit een voorzitter en ten hoogste vier andere leden die op voordracht van Onze Minister bij koninklijk besluit worden benoemd, geschorst en ontslagen."
 * - Wet WOZ art. 5 lid 1: "De Waarderingskamer bestaat uit elf leden, waaronder de voorzitter, die worden benoemd door Onze Minister." Lid 4: at most four years.
 * - Alcoholwet art. 11b lid 1-2: the Landelijke commissie sociale hygiëne has three to five members, appointed for four years.
 * - Bestuursreglement TloKB (BWBR0047074) art. 2 lid 1: "Het Bestuur bestaat uit een Voorzitter en ten hoogste twee andere leden." Art. 2 lid 2: the chair is appointed in office and is responsible for the board. Art. 4 lid 4: the chair appoints another board member as plaatsvervangend voorzitter.
 * - Staatsregeling van Sint Maarten (CVDR179884) art. 33 lid 1: "De Minister-President en de overige ministers worden bij landsbesluit benoemd en ontslagen." Art. 38: ministries headed by a minister. Art. 39 lid 3: the Minister-President chairs the ministerraad.
 * - Staatsregeling van Curaçao (minfin.cw PDF, fetched 17-10-2026) art. 29 lid 1: "De minister-president en de overige ministers worden bij landsbesluit benoemd en ontslagen." Art. 32: ministries headed by a minister. Art. 33 lid 3: the minister-president chairs the raad van ministers.
 * - Staatsregeling van Aruba (AB 1997 no. GT 1, 2013 print) art. II.2 lid 1: "De minister-president en de overige ministers worden in overleg met de Staten bij landsbesluit benoemd en ontslagen." Art. II.5: ministries headed by a minister. Art. II.6 lid 3: the minister-president chairs the ministerraad.
 * - Instellingswet ACM art. 3 lid 1: "De Autoriteit Consument en Markt bestaat uit drie leden, onder wie de voorzitter." Lid 3: chair seven years, other members five.
 * - Kernenergiewet art. 5 lid 1: "De Autoriteit bestaat uit minimaal twee en maximaal drie leden, onder wie de voorzitter."
 * - Uitvoeringswet verordening terroristische online-inhoud art. 3 lid 1 and 4: three members including the chair; the chair is appointed for five years.
 * - atkm.nl/over-de-atkm, fetched 17-10-2026: "Het bestuur van de ATKM bestaat uit drie bestuursleden en een bestuurssecretaris. De bestuursleden zijn voorgedragen door de minister van Justitie en Veiligheid en benoemd door de Koning. De benoeming van de bestuursvoorzitter is voor een periode van vijf jaar. Voor de twee andere bestuurders is de periode vier jaar." The page names bestuurder primaire processen, bestuurder bedrijfsvoering and bestuurssecretaris.
 * - Wet op de architectentitel art. 5: board of at most three members; the minister appoints a chair when there are two or three; members for at most four years.
 * - Wet College voor de rechten van de mens art. 14 lid 1 and 3: nine to twelve members including a chair and two deputy chairs; the chair represents the College.
 * - Wet gewasbeschermingsmiddelen en biociden art. 5 lid 1: five members including the chair. Art. 7 lid 3: "De secretaris van het college is tevens directeur van het secretariaat."
 * - Bankwet 1998 art. 12: directorate of a president and three to five directors, appointed for seven years by royal decree.
 * - Wet bescherming klokkenluiders art. 3b lid 1 and art. 3c: board of a chair and at most four members, appointed by royal decree, members for at most four years.
 * - Wet op de kansspelen art. 33c: board of at most three members including a chair, appointed for at most six years.
 * - Uitvoeringswet AVG art. 7 lid 1: "De Autoriteit persoonsgegevens bestaat uit een voorzitter en twee andere leden."
 * - Mediawet 2008 art. 7.3 lid 1-2: Commissariaat of a chair and two or four other members, appointed for five years.
 * - Organisatiewet Kadaster art. 7: the board runs the Dienst; chair and other members appointed for at most five years.
 * - Wet op de SER art. 11 lid 1: the chair is appointed from the members. Art. 39: "De voorzitter vertegenwoordigt de Raad in en buiten rechte."
 * - Instellingswet W.R.R. art. 3 lid 3: chair and members appointed for five years. Art. 4 lid 1: the chair's office is a full-time post.
 * - Gezondheidswet art. 21 lid 6: chair and vice-chairs appointed for at most four years. Art. 24 lid 2: the chair appoints a committee chair from that committee's members.
 * - Vreemdelingenwet 2000 art. 2 lid 1 and 3: there is an Adviesraad Migratie; the chair is preferably a judicial officer charged with adjudication.
 * - Kieswet art. A 5 lid 1 and 4: a chair, six other members and two extraordinary members; members appointed for their expertise on kiesrecht and elections. The Kiesraad may designate ondervoorzitters from the members.
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
export const RIJKSWET_ONDERZOEKSRAAD_SOURCE = "https://wetten.overheid.nl/BWBR0017613";
export const ZAAIZAAD_EN_PLANTGOEDWET_SOURCE = "https://wetten.overheid.nl/BWBR0018040";
export const MEDIAWET_SOURCE = "https://wetten.overheid.nl/BWBR0025028";
export const WET_WOZ_SOURCE = "https://wetten.overheid.nl/BWBR0007119";
export const ALCOHOLWET_SOURCE = "https://wetten.overheid.nl/BWBR0002458";
export const TLOKB_BESTUURSREGLEMENT_SOURCE = "https://wetten.overheid.nl/BWBR0047074";
export const STAATSREGELING_SINT_MAARTEN_SOURCE = "https://lokaleregelgeving.overheid.nl/CVDR179884";
export const STAATSREGELING_CURACAO_SOURCE =
  "https://minfin.cw/wp-content/uploads/2019/03/4._Staatsregeling_Cura__ao.pdf";
export const STAATSREGELING_ARUBA_SOURCE =
  "https://cuatro.sim-cdn.nl/arubaoverheid2858bd/uploads/0101gt87.001.pdf";
export const AANWIJZINGEN_PLANBUREAUS_SOURCE = "https://wetten.overheid.nl/BWBR0031972";
export const BANKWET_SOURCE = "https://wetten.overheid.nl/BWBR0009508";
export const KIESWET_SOURCE = "https://wetten.overheid.nl/BWBR0004627";
export const ATKM_BESTUUR_SOURCE = "https://www.atkm.nl/over-de-atkm";
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

const SXM_MINISTER: OfficeTemplate = {
  nl: `De ministers van Sint Maarten worden bij landsbesluit benoemd en ontslagen (<law href="${STAATSREGELING_SINT_MAARTEN_SOURCE}">artikel 33</law> van de <law href="${STAATSREGELING_SINT_MAARTEN_SOURCE}">Staatsregeling van Sint Maarten</law>). Ministeries staan onder leiding van een minister (<law href="${STAATSREGELING_SINT_MAARTEN_SOURCE}">artikel 38</law>).`,
  en: `The ministers of Sint Maarten are appointed and dismissed by landsbesluit (<law href="${STAATSREGELING_SINT_MAARTEN_SOURCE}">article 33</law> of the <law href="${STAATSREGELING_SINT_MAARTEN_SOURCE}">Staatsregeling van Sint Maarten</law>). Ministries are headed by a minister (<law href="${STAATSREGELING_SINT_MAARTEN_SOURCE}">article 38</law>).`,
};

const SXM_MINISTER_PRESIDENT: OfficeTemplate = {
  nl: `De Minister-President en de overige ministers van Sint Maarten worden bij landsbesluit benoemd en ontslagen (<law href="${STAATSREGELING_SINT_MAARTEN_SOURCE}">artikel 33</law> van de <law href="${STAATSREGELING_SINT_MAARTEN_SOURCE}">Staatsregeling van Sint Maarten</law>). De Minister-President is voorzitter van de ministerraad (<law href="${STAATSREGELING_SINT_MAARTEN_SOURCE}">artikel 39</law>).`,
  en: `The Minister-President and the other ministers of Sint Maarten are appointed and dismissed by landsbesluit (<law href="${STAATSREGELING_SINT_MAARTEN_SOURCE}">article 33</law> of the <law href="${STAATSREGELING_SINT_MAARTEN_SOURCE}">Staatsregeling van Sint Maarten</law>). The Minister-President chairs the council of ministers (<law href="${STAATSREGELING_SINT_MAARTEN_SOURCE}">article 39</law>).`,
};

const CURACAO_MINISTER: OfficeTemplate = {
  nl: `De ministers van Curaçao worden bij landsbesluit benoemd en ontslagen (<law href="${STAATSREGELING_CURACAO_SOURCE}">artikel 29</law> van de <law href="${STAATSREGELING_CURACAO_SOURCE}">Staatsregeling van Curaçao</law>). Ministeries staan onder leiding van een minister (<law href="${STAATSREGELING_CURACAO_SOURCE}">artikel 32</law>).`,
  en: `The ministers of Curaçao are appointed and dismissed by landsbesluit (<law href="${STAATSREGELING_CURACAO_SOURCE}">article 29</law> of the <law href="${STAATSREGELING_CURACAO_SOURCE}">Staatsregeling van Curaçao</law>). Ministries are headed by a minister (<law href="${STAATSREGELING_CURACAO_SOURCE}">article 32</law>).`,
};

const CURACAO_MINISTER_PRESIDENT: OfficeTemplate = {
  nl: `De minister-president en de overige ministers van Curaçao worden bij landsbesluit benoemd en ontslagen (<law href="${STAATSREGELING_CURACAO_SOURCE}">artikel 29</law> van de <law href="${STAATSREGELING_CURACAO_SOURCE}">Staatsregeling van Curaçao</law>). De minister-president is voorzitter van de raad van ministers (<law href="${STAATSREGELING_CURACAO_SOURCE}">artikel 33</law>).`,
  en: `The minister-president and the other ministers of Curaçao are appointed and dismissed by landsbesluit (<law href="${STAATSREGELING_CURACAO_SOURCE}">article 29</law> of the <law href="${STAATSREGELING_CURACAO_SOURCE}">Staatsregeling van Curaçao</law>). The minister-president chairs the council of ministers (<law href="${STAATSREGELING_CURACAO_SOURCE}">article 33</law>).`,
};

const ARUBA_MINISTER: OfficeTemplate = {
  nl: `De ministers van Aruba worden in overleg met de Staten bij landsbesluit benoemd en ontslagen (<law href="${STAATSREGELING_ARUBA_SOURCE}">artikel II.2</law> van de <law href="${STAATSREGELING_ARUBA_SOURCE}">Staatsregeling van Aruba</law>). Ministeries staan onder leiding van een minister (<law href="${STAATSREGELING_ARUBA_SOURCE}">artikel II.5</law>).`,
  en: `The ministers of Aruba are appointed and dismissed by landsbesluit in consultation with the Staten (<law href="${STAATSREGELING_ARUBA_SOURCE}">article II.2</law> of the <law href="${STAATSREGELING_ARUBA_SOURCE}">Staatsregeling van Aruba</law>). Ministries are headed by a minister (<law href="${STAATSREGELING_ARUBA_SOURCE}">article II.5</law>).`,
};

const ARUBA_MINISTER_PRESIDENT: OfficeTemplate = {
  nl: `De minister-president en de overige ministers van Aruba worden in overleg met de Staten bij landsbesluit benoemd en ontslagen (<law href="${STAATSREGELING_ARUBA_SOURCE}">artikel II.2</law> van de <law href="${STAATSREGELING_ARUBA_SOURCE}">Staatsregeling van Aruba</law>). De minister-president is voorzitter van de ministerraad (<law href="${STAATSREGELING_ARUBA_SOURCE}">artikel II.6</law>).`,
  en: `The minister-president and the other ministers of Aruba are appointed and dismissed by landsbesluit in consultation with the Staten (<law href="${STAATSREGELING_ARUBA_SOURCE}">article II.2</law> of the <law href="${STAATSREGELING_ARUBA_SOURCE}">Staatsregeling van Aruba</law>). The minister-president chairs the council of ministers (<law href="${STAATSREGELING_ARUBA_SOURCE}">article II.6</law>).`,
};

const PLANBUREAU_DIRECTEUR: OfficeTemplate = {
  law: "BWBR0031972",
  nl: 'De directeur van het planbureau stelt het werkprogramma jaarlijks vast, gehoord het gevoelen van de ministerraad (<law art="6">aanwijzing 6</law> van de <law>Aanwijzingen voor de Planbureaus</law>).',
  en: 'The director of the planbureau sets the work programme each year, after hearing the view of the ministerraad (<law art="6">aanwijzing 6</law> of the <law>Aanwijzingen voor de Planbureaus</law>).',
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
    nl: 'De <entity role="body">Raad van State</entity> bestaat, buiten de Koning als voorzitter, uit een vice-president en ten hoogste tien leden (<law art="1">artikel 1</law> van de <law>Wet op de Raad van State</law>). De vice-president wordt bij koninklijk besluit voor het leven benoemd (<law art="2">artikel 2</law>) en is voorzitter van de Afdeling advisering (<law art="16a">artikel 16a</law>).',
    en: 'The <entity role="body">Raad van State</entity> consists, besides the King as chair, of a vice-president and at most ten members (<law>Wet op de Raad van State</law>, <law art="1">article 1</law>). The vice-president is appointed for life by royal decree (<law art="2">article 2</law>) and chairs the Advisory Division (<law art="16a">article 16a</law>).',
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
  "pos:rijksvertegenwoordiger-bes": {
    law: "BWBR0028142",
    nl: 'Er is een Rijksvertegenwoordiger voor de openbare lichamen Bonaire, Sint Eustatius en Saba (<law art="187">artikel 187</law> van de <law>Wet openbare lichamen Bonaire, Sint Eustatius en Saba</law>). De Rijksvertegenwoordiger wordt bij koninklijk besluit op voordracht van de minister voor zes jaar benoemd (<law art="188">artikel 188</law>).',
    en: 'There is a Rijksvertegenwoordiger for the public bodies Bonaire, Sint Eustatius and Saba (<law art="187">article 187</law> of the <law>Wet openbare lichamen Bonaire, Sint Eustatius en Saba</law>). The Rijksvertegenwoordiger is appointed by royal decree on the minister\'s nomination for six years (<law art="188">article 188</law>).',
  },
  "pos:zbo-onderzoeksraad-voor-veiligheid-voorzitter": {
    law: "BWBR0017613",
    nl: 'Een van de leden van de raad van de <entity role="body">Onderzoeksraad voor Veiligheid</entity> wordt bij koninklijk besluit tot voorzitter benoemd (<law art="8">artikel 8</law> van de <law>Rijkswet Onderzoeksraad voor veiligheid</law>). De raad kent minimaal drie en maximaal vijf leden, de voorzitter daaronder begrepen (<law art="6">artikel 6</law>).',
    en: 'One of the members of the council of the <entity role="body">Onderzoeksraad voor Veiligheid</entity> is appointed chair by royal decree (<law art="8">article 8</law> of the <law>Rijkswet Onderzoeksraad voor veiligheid</law>). The council has at least three and at most five members, including the chair (<law art="6">article 6</law>).',
  },
  "pos:zbo-onderzoeksraad-voor-veiligheid-permanent-lid": {
    law: "BWBR0017613",
    nl: 'De raad van de <entity role="body">Onderzoeksraad voor Veiligheid</entity> kent minimaal drie en maximaal vijf leden, de voorzitter daaronder begrepen (<law art="6">artikel 6</law> van de <law>Rijkswet Onderzoeksraad voor veiligheid</law>). Die leden worden bij koninklijk besluit benoemd, geschorst en ontslagen (<law art="7">artikel 7</law>).',
    en: 'The council of the <entity role="body">Onderzoeksraad voor Veiligheid</entity> has at least three and at most five members, including the chair (<law art="6">article 6</law> of the <law>Rijkswet Onderzoeksraad voor veiligheid</law>). Those members are appointed, suspended and dismissed by royal decree (<law art="7">article 7</law>).',
  },
  "pos:zbo-raad-voor-plantenrassen-voorzitter": {
    law: "BWBR0018040",
    nl: 'De <entity role="body">Raad voor plantenrassen</entity> bestaat uit ten minste zeven en ten hoogste elf leden, de voorzitter daaronder begrepen (<law art="3">artikel 3</law> van de <law>Zaaizaad- en plantgoedwet 2005</law>). De benoeming van de voorzitter en de overige leden is voor vijf jaar (<law art="4">artikel 4</law>).',
    en: 'The <entity role="body">Raad voor plantenrassen</entity> has at least seven and at most eleven members, including the chair (<law art="3">article 3</law> of the <law>Zaaizaad- en plantgoedwet 2005</law>). The chair and the other members are appointed for five years (<law art="4">article 4</law>).',
  },
  "pos:zbo-raad-voor-plantenrassen-raadslid": {
    law: "BWBR0018040",
    nl: 'De <entity role="body">Raad voor plantenrassen</entity> bestaat uit ten minste zeven en ten hoogste elf leden, de voorzitter daaronder begrepen (<law art="3">artikel 3</law> van de <law>Zaaizaad- en plantgoedwet 2005</law>). De benoeming van de voorzitter en de overige leden is voor vijf jaar (<law art="4">artikel 4</law>).',
    en: 'The <entity role="body">Raad voor plantenrassen</entity> has at least seven and at most eleven members, including the chair (<law art="3">article 3</law> of the <law>Zaaizaad- en plantgoedwet 2005</law>). The chair and the other members are appointed for five years (<law art="4">article 4</law>).',
  },
  "pos:zbo-stichting-regionale-publieke-omroep-voorzitter-raad-van-toezicht": {
    law: "BWBR0025028",
    nl: 'De raad van toezicht van de <entity role="body">RPO</entity> bestaat uit een voorzitter en ten hoogste vier andere leden, die op voordracht van de minister bij koninklijk besluit worden benoemd, geschorst en ontslagen (<law art="2.60c">artikel 2.60c</law> van de <law>Mediawet 2008</law>).',
    en: 'The supervisory board of the <entity role="body">RPO</entity> consists of a chair and at most four other members, appointed, suspended and dismissed by royal decree on the minister\'s nomination (<law art="2.60c">article 2.60c</law> of the <law>Mediawet 2008</law>).',
  },
  "pos:zbo-stichting-regionale-publieke-omroep-lid-raad-van-toezicht": {
    law: "BWBR0025028",
    nl: 'De raad van toezicht van de <entity role="body">RPO</entity> bestaat uit een voorzitter en ten hoogste vier andere leden, die op voordracht van de minister bij koninklijk besluit worden benoemd, geschorst en ontslagen (<law art="2.60c">artikel 2.60c</law> van de <law>Mediawet 2008</law>).',
    en: 'The supervisory board of the <entity role="body">RPO</entity> consists of a chair and at most four other members, appointed, suspended and dismissed by royal decree on the minister\'s nomination (<law art="2.60c">article 2.60c</law> of the <law>Mediawet 2008</law>).',
  },
  "pos:zbo-waarderingskamer-voorzitter": {
    law: "BWBR0007119",
    nl: 'De <entity role="body">Waarderingskamer</entity> bestaat uit elf leden, waaronder de voorzitter, die worden benoemd door de minister (<law art="5">artikel 5</law> van de <law>Wet waardering onroerende zaken</law>). De leden worden benoemd voor ten hoogste vier jaren.',
    en: 'The <entity role="body">Waarderingskamer</entity> has eleven members, including the chair, appointed by the minister (<law art="5">article 5</law> of the <law>Wet waardering onroerende zaken</law>). Members are appointed for at most four years.',
  },
  "pos:zbo-waarderingskamer-lid": {
    law: "BWBR0007119",
    nl: 'De <entity role="body">Waarderingskamer</entity> bestaat uit elf leden, waaronder de voorzitter, die worden benoemd door de minister (<law art="5">artikel 5</law> van de <law>Wet waardering onroerende zaken</law>). De leden worden benoemd voor ten hoogste vier jaren.',
    en: 'The <entity role="body">Waarderingskamer</entity> has eleven members, including the chair, appointed by the minister (<law art="5">article 5</law> of the <law>Wet waardering onroerende zaken</law>). Members are appointed for at most four years.',
  },
  "pos:zbo-landelijke-commissie-sociale-hygiene-bestuurslid": {
    law: "BWBR0002458",
    nl: 'De <entity role="body">Landelijke commissie sociale hygiëne</entity> bestaat uit ten minste drie en ten hoogste vijf leden (<law art="11b">artikel 11b</law> van de <law>Alcoholwet</law>). De leden worden benoemd voor vier jaar.',
    en: 'The <entity role="body">Landelijke commissie sociale hygiëne</entity> has at least three and at most five members (<law art="11b">article 11b</law> of the <law>Alcoholwet</law>). Members are appointed for four years.',
  },
  "pos:zbo-toelatingsorganisatie-kwaliteitsborging-bouw-voorzitter": {
    law: "BWBR0047074",
    nl: 'Het bestuur van de <entity role="body">Toelatingsorganisatie Kwaliteitsborging Bouw</entity> bestaat uit een voorzitter en ten hoogste twee andere leden (<law art="2">artikel 2</law> van het <law>Bestuursreglement Toelatingsorganisatie Kwaliteitsborging Bouw</law>). De voorzitter wordt in functie benoemd en is verantwoordelijk voor het adequaat functioneren van het bestuur.',
    en: 'The board of the <entity role="body">Toelatingsorganisatie Kwaliteitsborging Bouw</entity> consists of a chair and at most two other members (<law art="2">article 2</law> of the <law>Bestuursreglement Toelatingsorganisatie Kwaliteitsborging Bouw</law>). The chair is appointed in office and is responsible for the proper functioning of the board.',
  },
  "pos:zbo-toelatingsorganisatie-kwaliteitsborging-bouw-bestuurslid": {
    law: "BWBR0047074",
    nl: 'Het bestuur van de <entity role="body">Toelatingsorganisatie Kwaliteitsborging Bouw</entity> bestaat uit een voorzitter en ten hoogste twee andere leden (<law art="2">artikel 2</law> van het <law>Bestuursreglement Toelatingsorganisatie Kwaliteitsborging Bouw</law>).',
    en: 'The board of the <entity role="body">Toelatingsorganisatie Kwaliteitsborging Bouw</entity> consists of a chair and at most two other members (<law art="2">article 2</law> of the <law>Bestuursreglement Toelatingsorganisatie Kwaliteitsborging Bouw</law>).',
  },
  "pos:zbo-toelatingsorganisatie-kwaliteitsborging-bouw-vicevoorzitter": {
    law: "BWBR0047074",
    nl: 'De voorzitter van de <entity role="body">Toelatingsorganisatie Kwaliteitsborging Bouw</entity> benoemt een ander bestuurslid als plaatsvervangend voorzitter (<law art="4">artikel 4</law> van het <law>Bestuursreglement Toelatingsorganisatie Kwaliteitsborging Bouw</law>).',
    en: 'The chair of the <entity role="body">Toelatingsorganisatie Kwaliteitsborging Bouw</entity> appoints another board member as deputy chair (<law art="4">article 4</law> of the <law>Bestuursreglement Toelatingsorganisatie Kwaliteitsborging Bouw</law>).',
  },
  "pos:minister-president-sint-maarten": SXM_MINISTER_PRESIDENT,
  "pos:minister-president-curacao": CURACAO_MINISTER_PRESIDENT,
  "pos:minister-algemene-zaken-minister-president-curacao": CURACAO_MINISTER_PRESIDENT,
  "pos:minister-president-aruba": ARUBA_MINISTER_PRESIDENT,
  "pos:directeur-cpb": PLANBUREAU_DIRECTEUR,
  "pos:directeur-pbl": PLANBUREAU_DIRECTEUR,
  "pos:directeur-scp": PLANBUREAU_DIRECTEUR,
  "pos:zbo-autoriteit-consument-en-markt-bestuursvoorzitter": {
    law: "BWBR0033043",
    nl: 'De <entity role="body">Autoriteit Consument en Markt</entity> bestaat uit drie leden, onder wie de voorzitter (<law art="3">artikel 3</law> van de <law>Instellingswet Autoriteit Consument en Markt</law>). De voorzitter wordt benoemd voor zeven jaar.',
    en: 'The <entity role="body">Autoriteit Consument en Markt</entity> consists of three members, including the chair (<law art="3">article 3</law> of the <law>Instellingswet Autoriteit Consument en Markt</law>). The chair is appointed for seven years.',
  },
  "pos:zbo-autoriteit-consument-en-markt-bestuurslid": {
    law: "BWBR0033043",
    nl: 'De <entity role="body">Autoriteit Consument en Markt</entity> bestaat uit drie leden, onder wie de voorzitter (<law art="3">artikel 3</law> van de <law>Instellingswet Autoriteit Consument en Markt</law>). De overige leden worden benoemd voor vijf jaar.',
    en: 'The <entity role="body">Autoriteit Consument en Markt</entity> consists of three members, including the chair (<law art="3">article 3</law> of the <law>Instellingswet Autoriteit Consument en Markt</law>). The other members are appointed for five years.',
  },
  "pos:zbo-autoriteit-nucleaire-veiligheid-en-stralingsbescherming-bestuursvoorzitter": {
    law: "BWBR0002402",
    nl: 'De <entity role="body">Autoriteit Nucleaire Veiligheid en Stralingsbescherming</entity> bestaat uit minimaal twee en maximaal drie leden, onder wie de voorzitter (<law art="5">artikel 5</law> van de <law>Kernenergiewet</law>). De leden worden benoemd voor maximaal vier jaar.',
    en: 'The <entity role="body">Autoriteit Nucleaire Veiligheid en Stralingsbescherming</entity> consists of at least two and at most three members, including the chair (<law art="5">article 5</law> of the <law>Kernenergiewet</law>). Members are appointed for at most four years.',
  },
  "pos:zbo-autoriteit-online-terroristisch-en-kinderpornografisch-materiaal-bestuursvoorzitter": {
    law: "BWBR0048064",
    nl: 'De <entity role="body">Autoriteit online Terroristisch en Kinderpornografisch Materiaal</entity> bestaat uit drie leden, onder wie de voorzitter (<law art="3">artikel 3</law> van de <law>Uitvoeringswet verordening terroristische online-inhoud</law>). De voorzitter wordt benoemd voor vijf jaar.',
    en: 'The <entity role="body">Autoriteit online Terroristisch en Kinderpornografisch Materiaal</entity> consists of three members, including the chair (<law art="3">article 3</law> of the <law>Uitvoeringswet verordening terroristische online-inhoud</law>). The chair is appointed for five years.',
  },
  "pos:zbo-autoriteit-online-terroristisch-en-kinderpornografisch-materiaal-bestuurder-primair-proces": {
    law: ATKM_BESTUUR_SOURCE,
    nl: 'Het bestuur van de <entity role="body">Autoriteit online Terroristisch en Kinderpornografisch Materiaal</entity> bestaat uit drie bestuursleden en een bestuurssecretaris (<law>Over de ATKM</law>). De twee andere bestuurders worden voor vier jaar benoemd.',
    en: 'The board of the <entity role="body">Autoriteit online Terroristisch en Kinderpornografisch Materiaal</entity> consists of three board members and a board secretary (<law>About the ATKM</law>). The other two board members are appointed for four years.',
  },
  "pos:zbo-autoriteit-online-terroristisch-en-kinderpornografisch-materiaal-bestuurder-bedrijfsvoering": {
    law: ATKM_BESTUUR_SOURCE,
    nl: 'Het bestuur van de <entity role="body">Autoriteit online Terroristisch en Kinderpornografisch Materiaal</entity> bestaat uit drie bestuursleden en een bestuurssecretaris (<law>Over de ATKM</law>). De twee andere bestuurders worden voor vier jaar benoemd.',
    en: 'The board of the <entity role="body">Autoriteit online Terroristisch en Kinderpornografisch Materiaal</entity> consists of three board members and a board secretary (<law>About the ATKM</law>). The other two board members are appointed for four years.',
  },
  "pos:zbo-autoriteit-online-terroristisch-en-kinderpornografisch-materiaal-bestuurssecretaris": {
    law: ATKM_BESTUUR_SOURCE,
    nl: 'Het bestuur van de <entity role="body">Autoriteit online Terroristisch en Kinderpornografisch Materiaal</entity> bestaat uit drie bestuursleden en een bestuurssecretaris (<law>Over de ATKM</law>).',
    en: 'The board of the <entity role="body">Autoriteit online Terroristisch en Kinderpornografisch Materiaal</entity> consists of three board members and a board secretary (<law>About the ATKM</law>).',
  },
  "pos:zbo-autoriteit-persoonsgegevens-bestuurslid": {
    law: "BWBR0040940",
    nl: 'De <entity role="body">Autoriteit persoonsgegevens</entity> bestaat uit een voorzitter en twee andere leden (<law art="7">artikel 7</law> van de <law>Uitvoeringswet Algemene verordening gegevensbescherming</law>). Zij worden bij koninklijk besluit benoemd voor vijf jaar.',
    en: 'The <entity role="body">Autoriteit persoonsgegevens</entity> consists of a chair and two other members (<law art="7">article 7</law> of the <law>Uitvoeringswet Algemene verordening gegevensbescherming</law>). They are appointed by royal decree for five years.',
  },
  "pos:zbo-bureau-architectenregister-voorzitter": {
    law: "BWBR0004189",
    nl: 'Het bestuur van het <entity role="body">Bureau Architectenregister</entity> bestaat uit ten hoogste drie leden (<law art="5">artikel 5</law> van de <law>Wet op de architectentitel</law>). Stelt de minister het aantal op twee of drie, dan benoemt hij een van de leden tot voorzitter.',
    en: 'The board of the <entity role="body">Bureau Architectenregister</entity> has at most three members (<law art="5">article 5</law> of the <law>Wet op de architectentitel</law>). If the minister sets the number at two or three, the minister appoints one member as chair.',
  },
  "pos:zbo-bureau-architectenregister-bestuurslid": {
    law: "BWBR0004189",
    nl: 'Het bestuur van het <entity role="body">Bureau Architectenregister</entity> bestaat uit ten hoogste drie leden (<law art="5">artikel 5</law> van de <law>Wet op de architectentitel</law>). Een lid wordt voor ten hoogste vier jaar benoemd.',
    en: 'The board of the <entity role="body">Bureau Architectenregister</entity> has at most three members (<law art="5">article 5</law> of the <law>Wet op de architectentitel</law>). A member is appointed for at most four years.',
  },
  "pos:zbo-college-voor-de-rechten-van-de-mens-voorzitter": {
    law: "BWBR0030733",
    nl: 'Het <entity role="body">College voor de Rechten van de Mens</entity> bestaat uit minimaal negen en maximaal twaalf leden, onder wie een voorzitter en twee ondervoorzitters (<law art="14">artikel 14</law> van de <law>Wet College voor de rechten van de mens</law>). Het College wordt vertegenwoordigd door de voorzitter.',
    en: 'The <entity role="body">College voor de Rechten van de Mens</entity> has at least nine and at most twelve members, including a chair and two deputy chairs (<law art="14">article 14</law> of the <law>Wet College voor de rechten van de mens</law>). The College is represented by the chair.',
  },
  "pos:zbo-college-voor-de-rechten-van-de-mens-ondervoorzitter": {
    law: "BWBR0030733",
    nl: 'Het <entity role="body">College voor de Rechten van de Mens</entity> bestaat uit minimaal negen en maximaal twaalf leden, onder wie een voorzitter en twee ondervoorzitters (<law art="14">artikel 14</law> van de <law>Wet College voor de rechten van de mens</law>).',
    en: 'The <entity role="body">College voor de Rechten van de Mens</entity> has at least nine and at most twelve members, including a chair and two deputy chairs (<law art="14">article 14</law> of the <law>Wet College voor de rechten van de mens</law>).',
  },
  "pos:zbo-college-voor-de-rechten-van-de-mens-lid": {
    law: "BWBR0030733",
    nl: 'Het <entity role="body">College voor de Rechten van de Mens</entity> bestaat uit minimaal negen en maximaal twaalf leden, onder wie een voorzitter en twee ondervoorzitters (<law art="14">artikel 14</law> van de <law>Wet College voor de rechten van de mens</law>).',
    en: 'The <entity role="body">College voor de Rechten van de Mens</entity> has at least nine and at most twelve members, including a chair and two deputy chairs (<law art="14">article 14</law> of the <law>Wet College voor de rechten van de mens</law>).',
  },
  "pos:zbo-college-voor-de-toelating-van-gewasbeschermingsmiddelen-en-biociden-voorzitter": {
    law: "BWBR0021670",
    nl: 'Het <entity role="body">College voor de toelating van gewasbeschermingsmiddelen en biociden</entity> bestaat uit vijf leden, de voorzitter daaronder begrepen (<law art="5">artikel 5</law> van de <law>Wet gewasbeschermingsmiddelen en biociden</law>). De leden worden voor vier jaren benoemd.',
    en: 'The <entity role="body">College voor de toelating van gewasbeschermingsmiddelen en biociden</entity> has five members, including the chair (<law art="5">article 5</law> of the <law>Wet gewasbeschermingsmiddelen en biociden</law>). Members are appointed for four years.',
  },
  "pos:zbo-college-voor-de-toelating-van-gewasbeschermingsmiddelen-en-biociden-secretaris-directeur": {
    law: "BWBR0021670",
    nl: 'De secretaris van het <entity role="body">College voor de toelating van gewasbeschermingsmiddelen en biociden</entity> is tevens directeur van het secretariaat en is belast met de dagelijkse leiding daarvan (<law art="7">artikel 7</law> van de <law>Wet gewasbeschermingsmiddelen en biociden</law>).',
    en: 'The secretary of the <entity role="body">College voor de toelating van gewasbeschermingsmiddelen en biociden</entity> is also director of the secretariat and has day-to-day leadership of it (<law art="7">article 7</law> of the <law>Wet gewasbeschermingsmiddelen en biociden</law>).',
  },
  "pos:zbo-de-nederlandsche-bank-president": {
    law: "BWBR0009508",
    nl: 'De directie van <entity role="body">De Nederlandsche Bank</entity> bestaat uit een president en ten minste drie en ten hoogste vijf directeuren (<law art="12">artikel 12</law> van de <law>Bankwet 1998</law>). De president en de directeuren worden voor zeven jaren bij koninklijk besluit benoemd.',
    en: 'The directorate of <entity role="body">De Nederlandsche Bank</entity> consists of a president and at least three and at most five directors (<law art="12">article 12</law> of the <law>Bankwet 1998</law>). The president and the directors are appointed for seven years by royal decree.',
  },
  "pos:zbo-huis-voor-klokkenluiders-bestuursvoorzitter": {
    law: "BWBR0037852",
    nl: 'Het bestuur van het <entity role="body">Huis voor Klokkenluiders</entity> bestaat uit een voorzitter en ten hoogste vier leden (<law art="3b">artikel 3b</law> van de <law>Wet bescherming klokkenluiders</law>). De voorzitter en de leden worden bij koninklijk besluit benoemd (<law art="3c">artikel 3c</law>).',
    en: 'The board of the <entity role="body">Huis voor Klokkenluiders</entity> consists of a chair and at most four members (<law art="3b">article 3b</law> of the <law>Wet bescherming klokkenluiders</law>). The chair and the members are appointed by royal decree (<law art="3c">article 3c</law>).',
  },
  "pos:zbo-huis-voor-klokkenluiders-bestuurslid": {
    law: "BWBR0037852",
    nl: 'Het bestuur van het <entity role="body">Huis voor Klokkenluiders</entity> bestaat uit een voorzitter en ten hoogste vier leden (<law art="3b">artikel 3b</law> van de <law>Wet bescherming klokkenluiders</law>). De leden worden voor ten hoogste vier jaar benoemd (<law art="3c">artikel 3c</law>).',
    en: 'The board of the <entity role="body">Huis voor Klokkenluiders</entity> consists of a chair and at most four members (<law art="3b">article 3b</law> of the <law>Wet bescherming klokkenluiders</law>). Members are appointed for at most four years (<law art="3c">article 3c</law>).',
  },
  "pos:zbo-kansspelautoriteit-voorzitter": {
    law: "BWBR0002469",
    nl: 'De raad van bestuur van de <entity role="body">Kansspelautoriteit</entity> bestaat uit ten hoogste drie leden, waaronder een voorzitter (<law art="33c">artikel 33c</law> van de <law>Wet op de kansspelen</law>). De leden worden benoemd voor ten hoogste zes jaar.',
    en: 'The board of the <entity role="body">Kansspelautoriteit</entity> consists of at most three members, including a chair (<law art="33c">article 33c</law> of the <law>Wet op de kansspelen</law>). Members are appointed for at most six years.',
  },
  "pos:zbo-commissariaat-voor-de-media-voorzitter": {
    law: "BWBR0025028",
    nl: 'Het <entity role="body">Commissariaat voor de Media</entity> bestaat uit een voorzitter en twee of vier andere leden (<law art="7.3">artikel 7.3</law> van de <law>Mediawet 2008</law>). Een benoeming is voor vijf jaar.',
    en: 'The <entity role="body">Commissariaat voor de Media</entity> consists of a chair and two or four other members (<law art="7.3">article 7.3</law> of the <law>Mediawet 2008</law>). An appointment is for five years.',
  },
  "pos:zbo-commissariaat-voor-de-media-lid": {
    law: "BWBR0025028",
    nl: 'Het <entity role="body">Commissariaat voor de Media</entity> bestaat uit een voorzitter en twee of vier andere leden (<law art="7.3">artikel 7.3</law> van de <law>Mediawet 2008</law>). Een benoeming is voor vijf jaar.',
    en: 'The <entity role="body">Commissariaat voor de Media</entity> consists of a chair and two or four other members (<law art="7.3">article 7.3</law> of the <law>Mediawet 2008</law>). An appointment is for five years.',
  },
  "pos:zbo-dienst-voor-het-kadaster-en-de-openbare-registers-voorzitter": {
    law: "BWBR0006463",
    nl: 'Het bestuur is belast met het besturen van de <entity role="body">Dienst voor het kadaster en de openbare registers</entity> (<law art="7">artikel 7</law> van de <law>Organisatiewet Kadaster</law>). De voorzitter en de overige leden worden benoemd voor ten hoogste vijf jaren.',
    en: 'The board is charged with running the <entity role="body">Dienst voor het kadaster en de openbare registers</entity> (<law art="7">article 7</law> of the <law>Organisatiewet Kadaster</law>). The chair and the other members are appointed for at most five years.',
  },
  "pos:voorzitter-sociaal-economische-raad": {
    law: "BWBR0002058",
    nl: 'De voorzitter van de <entity role="body">Sociaal-Economische Raad</entity> wordt uit de leden van de Raad benoemd (<law art="11">artikel 11</law> van de <law>Wet op de Sociaal-Economische Raad</law>). De voorzitter vertegenwoordigt de Raad in en buiten rechte (<law art="39">artikel 39</law>).',
    en: 'The chair of the <entity role="body">Sociaal-Economische Raad</entity> is appointed from among the members of the Raad (<law art="11">article 11</law> of the <law>Wet op de Sociaal-Economische Raad</law>). The chair represents the Raad in and out of court (<law art="39">article 39</law>).',
  },
  "pos:voorzitter-wrr": {
    law: "BWBR0003043",
    nl: 'De voorzitter en de overige leden van de <entity role="body">Wetenschappelijke Raad voor het Regeringsbeleid</entity> worden voor vijf jaren benoemd (<law art="3">artikel 3</law> van de <law>Instellingswet W.R.R.</law>). Het ambt van voorzitter is een volledige betrekking (<law art="4">artikel 4</law>).',
    en: 'The chair and the other members of the <entity role="body">Wetenschappelijke Raad voor het Regeringsbeleid</entity> are appointed for five years (<law art="3">article 3</law> of the <law>Instellingswet W.R.R.</law>). The office of chair is a full-time post (<law art="4">article 4</law>).',
  },
  "pos:voorzitter-gezondheidsraad": {
    law: "BWBR0002202",
    nl: 'De voorzitter en de vice-voorzitters van de <entity role="body">Gezondheidsraad</entity> worden voor ten hoogste vier jaar benoemd (<law art="21">artikel 21</law> van de <law>Gezondheidswet</law>). De voorzitter wijst uit de leden van een commissie een voorzitter aan (<law art="24">artikel 24</law>).',
    en: 'The chair and the vice-chairs of the <entity role="body">Gezondheidsraad</entity> are appointed for at most four years (<law art="21">article 21</law> of the <law>Gezondheidswet</law>). The chair appoints a committee chair from among that committee\'s members (<law art="24">article 24</law>).',
  },
  "pos:voorzitter-adviesraad-migratie": {
    law: "BWBR0011823",
    nl: 'Er is een <entity role="body">Adviesraad Migratie</entity> (<law art="2">artikel 2</law> van de <law>Vreemdelingenwet 2000</law>). Als voorzitter wordt bij voorkeur een rechterlijk ambtenaar met rechtspraak belast benoemd.',
    en: 'There is an <entity role="body">Adviesraad Migratie</entity> (<law art="2">article 2</law> of the <law>Vreemdelingenwet 2000</law>). The chair is preferably appointed as a judicial officer charged with adjudication.',
  },
  "pos:voorzitter-kiesraad": {
    law: "BWBR0004627",
    nl: 'De <entity role="body">Kiesraad</entity> bestaat uit een voorzitter, zes andere leden en twee buitengewone leden (<law art="A 5">artikel A 5</law> van de <law>Kieswet</law>).',
    en: 'The <entity role="body">Kiesraad</entity> consists of a chair, six other members and two extraordinary members (<law art="A 5">article A 5</law> of the <law>Kieswet</law>).',
  },
  "pos:zbo-kiesraad-lid": {
    law: "BWBR0004627",
    nl: 'De <entity role="body">Kiesraad</entity> bestaat uit een voorzitter, zes andere leden en twee buitengewone leden (<law art="A 5">artikel A 5</law> van de <law>Kieswet</law>). De leden worden benoemd op grond van hun deskundigheid op het gebied van het kiesrecht en de verkiezingen.',
    en: 'The <entity role="body">Kiesraad</entity> consists of a chair, six other members and two extraordinary members (<law art="A 5">article A 5</law> of the <law>Kieswet</law>). Members are appointed for their expertise on electoral law and elections.',
  },
  "pos:zbo-kiesraad-vicevoorzitter": {
    law: "BWBR0004627",
    nl: 'De <entity role="body">Kiesraad</entity> kan uit de leden ondervoorzitters aanwijzen (<law art="A 5">artikel A 5</law> van de <law>Kieswet</law>).',
    en: 'The <entity role="body">Kiesraad</entity> may designate deputy chairs from among its members (<law art="A 5">article A 5</law> of the <law>Kieswet</law>).',
  },
};

/** The wetten.overheid.nl JCI permalink for a BWB, or one article of it. */
export function wettenArtikelUrl(bwb: string, artikel?: string): string {
  if (bwb.startsWith("http://") || bwb.startsWith("https://")) return bwb;
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
  if (position.country === "sint-maarten" && title === "Minister-President van Sint Maarten") {
    return fillCopy(SXM_MINISTER_PRESIDENT, roles);
  }
  if (
    position.country === "sint-maarten" &&
    (title.startsWith("Minister of ") || title.startsWith("Minister van "))
  ) {
    return fillCopy(SXM_MINISTER, roles);
  }
  if (
    position.country === "curacao" &&
    (title === "Minister-President van Curaçao" || title.includes("Minister President"))
  ) {
    return fillCopy(CURACAO_MINISTER_PRESIDENT, roles);
  }
  if (position.country === "curacao" && title.startsWith("Minister van ")) {
    return fillCopy(CURACAO_MINISTER, roles);
  }
  if (position.country === "aruba" && title === "Minister-President van Aruba") {
    return fillCopy(ARUBA_MINISTER_PRESIDENT, roles);
  }
  if (position.country === "aruba" && title.startsWith("Minister van ")) {
    return fillCopy(ARUBA_MINISTER, roles);
  }
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
