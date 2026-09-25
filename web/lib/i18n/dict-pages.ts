import type { LocString } from "./locales";

/**
 * Owned by the static-and-shell pages area: footer, methodiek, dataset,
 * privacy, toegankelijkheid, not-found, brand and search chrome.
 */
export const PAGES_DICT = {
  pagesTitle: { nl: "Statische pagina's", en: "Static pages" },

  scopeLabel: { nl: "NL Rijk", en: "NL national" },

  linkHome: { nl: "homepage", en: "homepage" },
  linkMethodology: { nl: "Methodiek", en: "Methodology" },
  linkPrivacy: { nl: "Privacy", en: "Privacy" },
  linkAccessibility: { nl: "Toegankelijkheid", en: "Accessibility" },
  linkDataset: { nl: "Dataset", en: "Dataset" },
  seeAlso: { nl: "Zie ook", en: "See also" },
  andWord: { nl: "en", en: "and" },
  crumbLabel: { nl: "Kruimelpad", en: "Breadcrumb" },

  // Long index lists folded behind a disclosure
  listShowAll: { nl: "Toon alle {count}", en: "Show all {count}" },
  listShowLess: { nl: "Toon minder", en: "Show less" },

  // Party pages (/partijen)
  partiesTitle: { nl: "Partijen", en: "Parties" },
  partiesSeatsTK: {
    nl: "Zetels in de Tweede Kamer",
    en: "Seats in the House of Representatives",
  },
  partiesSeatsEK: {
    nl: "Zetels in de Eerste Kamer",
    en: "Seats in the Senate",
  },
  partiesNoSeats: {
    nl: "Op dit snapshot heeft deze partij geen zetels in de Kamers.",
    en: "At this snapshot this party holds no seats in the Houses.",
  },
  partyMembersTitle: { nl: "Leden", en: "Members" },
  partyColourLabel: { nl: "Kleur", en: "Colour" },
  partyNoColour: {
    nl: "Geen kleur met bron opgenomen; er wordt nooit een waarde verzonnen.",
    en: "No sourced colour on record; a value is never invented.",
  },
  partyColourConfidence: { nl: "Zekerheid kleurbron", en: "Colour source confidence" },
  partyColourRetrieved: { nl: "Kleur opgehaald", en: "Colour retrieved" },
  partyOverviewLabel: { nl: "Alle partijen", en: "All parties" },

  notFoundTitle: { nl: "Pagina niet gevonden", en: "Page not found" },
  notFoundPre: {
    nl: "Deze pagina bestaat niet of is verplaatst. Ga terug naar de",
    en: "This page does not exist or has moved. Go back to the",
  },

  footerNavLabel: { nl: "Voettekst", en: "Footer" },
  footerIndependent: {
    nl: "Onafhankelijke publicatie, niet verbonden aan de Nederlandse overheid.",
    en: "Independent publication, not affiliated with the Dutch government.",
  },
  updatedLabel: { nl: "Laatst bijgewerkt:", en: "Last updated:" },
  updatedUnknown: { nl: "onbekend", en: "unknown" },

  themeToDark: { nl: "Schakel naar donker thema", en: "Switch to the dark theme" },
  themeToLight: { nl: "Schakel naar licht thema", en: "Switch to the light theme" },

  searchTrigger: { nl: "Zoeken", en: "Search" },
  searchDialogLabel: { nl: "Zoeken", en: "Search" },
  searchInputLabel: { nl: "Zoeken", en: "Search" },
  searchPlaceholder: {
    nl: "Zoek op naam, alias of afkorting",
    en: "Search by name, alias or abbreviation",
  },
  searchClose: { nl: "Zoeken sluiten", en: "Close search" },
  searchLoading: { nl: "Zoekindex wordt geladen.", en: "Loading the search index." },
  searchLoadingInline: { nl: "Zoekindex wordt geladen...", en: "Loading the search index..." },
  searchUnavailable: {
    nl: "Zoeken is tijdelijk niet beschikbaar.",
    en: "Search is temporarily unavailable.",
  },
  searchBrowseTopics: { nl: "Blader door onderwerpen", en: "Browse topics" },
  searchHint: { nl: "Typ een naam, alias of afkorting.", en: "Type a name, alias or abbreviation." },
  searchTopicsHeader: { nl: "Onderwerpen", en: "Topics" },
  searchNoResults: { nl: "Geen resultaten voor deze zoekterm.", en: "No results for this query." },
  searchResultOne: { nl: "{n} resultaat.", en: "{n} result." },
  searchResultMany: { nl: "{n} resultaten.", en: "{n} results." },
  kindOrganization: { nl: "Organisatie", en: "Organization" },
  kindPosition: { nl: "Positie", en: "Position" },
  kindPerson: { nl: "Persoon", en: "Person" },
  kindTopic: { nl: "Onderwerp", en: "Topic" },

  methodTitle: { nl: "Methodiek", en: "Methodology" },
  methodIntro: {
    nl: "Staatsgraaf is een open, bronvaste kaart van de Nederlandse overheid. Deze pagina beschrijft hoe de dataset tot stand komt, welke regels voor elke bewering gelden, hoe de wijzigingenfeed werkt, waar taalmodellen wel en niet worden gebruikt, en welke grenzen de data nu hebben.",
    en: "Staatsgraaf is an open, source-backed map of the Dutch government. This page describes how the dataset is built, which rules apply to every claim, how the change feed works, where language models are and are not used, and which limits the data have today.",
  },
  methodBuildTitle: { nl: "Hoe de dataset tot stand komt", en: "How the dataset is built" },
  methodBuildP1: {
    nl: "De opbouw verloopt in fasen. Eerst legt een nulmeting de telbare uitgangspunten vast: de samenstelling van het kabinet, de ministeries, de zetels in de Eerste en Tweede Kamer, en de aantallen provincies, gemeenten en waterschappen. Elk gegeven krijgt een bron en een datum.",
    en: "The build runs in phases. First a baseline measurement records the countable starting points: the composition of the cabinet, the ministries, the seats in the Senate and the House of Representatives, and the numbers of provinces, municipalities and water boards. Every fact gets a source and a date.",
  },
  methodBuildP2: {
    nl: "Daarna werken vijftien onderzoekswerkstromen parallel aan deelgebieden: de regering en de ministeries, rijksdiensten, zelfstandige bestuursorganen en rechtspersonen met een wettelijke taak, het parlement, de rechterlijke macht, hoge colleges en adviescolleges, de decentrale overheid, de wettelijke grondslagen, personen en benoemingen, nieuws en koppeling, onderwerpen, begroting, en de studies naar ontwerp, referentiemodel en licentie.",
    en: "Fifteen research workstreams then work in parallel on sub-areas: the government and the ministries, national services, independent administrative bodies and legal entities with a statutory task, the parliament, the judiciary, the high councils and advisory councils, the decentralised government, the legal foundations, people and appointments, news and linking, topics, budget, and the studies on design, reference model and licence.",
  },
  methodBuildP3: {
    nl: "Elke werkstroom levert dezelfde vorm van uitvoer: een JSON-bestand en een markdown-rapport. Bij elk feit staat een bron, een ophaaldatum en een betrouwbaarheidsniveau (hoog, midden of laag).",
    en: "Every workstream delivers the same form of output: a JSON file and a markdown report. Each fact carries a source, a retrieval date and a confidence level (high, medium or low).",
  },
  methodBuildP4a: {
    nl: "De merge-stap voegt de bestanden samen tot de dataset in de map",
    en: "The merge step joins the files into the dataset in the folder",
  },
  methodBuildP4b: {
    nl: ". Conflicten worden niet stil opgelost, maar vastgelegd in",
    en: ". Conflicts are not resolved silently, but recorded in",
  },
  methodBuildP4c: {
    nl: ". Daarna controleren validators de dataset tegen het schema en op verwijzingen tussen records. De web-app leest de samengevoegde dataset op buildtijd en doet geen runtime-verzoeken aan bronnen.",
    en: ". Validators then check the dataset against the schema and for references between records. The web app reads the merged dataset at build time and makes no runtime requests to sources.",
  },
  methodSourcesTitle: { nl: "Elke bewering heeft een bron", en: "Every claim has a source" },
  methodSourcesP1: {
    nl: "Elk niet-triviaal feit verwijst naar een bron met een URL, een ophaaldatum en een betrouwbaarheidsniveau. De regel is: ophalen, nooit uit het geheugen. Een naam, datum of aantal wordt niet opgeschreven zonder dat de bron is opgehaald.",
    en: "Every non-trivial fact points to a source with a URL, a retrieval date and a confidence level. The rule is: fetch, never recall. A name, date or number is not written down without the source having been fetched.",
  },
  methodSourcesP2: {
    nl: "Als een bron niet bereikbaar is, wordt er geen waarde ingevuld. In plaats daarvan staat er een benoemde leemte met de reden en het adres waar het ontbrekende gegeven te vinden is. Zo blijft zichtbaar wat wel en niet is onderzocht, ook wanneer een werkstroom niet volledig is afgerond.",
    en: "If a source cannot be reached, no value is filled in. Instead there is a named gap with the reason and the address where the missing fact can be found. That keeps visible what has and has not been researched, even when a workstream is not fully finished.",
  },
  methodChangesTitle: { nl: "De wijzigingenfeed", en: "The change feed" },
  methodChangesP1: {
    nl: "De wijzigingenfeed vergelijkt de nieuwste dataset met de vorige. Records worden op id gekoppeld, nooit op naam. Daardoor wordt een naamswijziging niet gelezen als een vertrek plus een aanstelling.",
    en: "The change feed compares the newest dataset with the previous one. Records are matched by id, never by name. A rename is therefore not read as a departure plus an appointment.",
  },
  methodChangesP2: {
    nl: "De vergelijking herkent zes soorten wijziging: een nieuw dienstverband (aanstelling), een beëindigd dienstverband (vertrek), een vacature wanneer het aantal bezette zetels daalt, een nieuwe organisatie, een naamswijziging en een verplaatsing.",
    en: "The comparison recognises six kinds of change: a new tenure (appointment), an ended tenure (departure), a vacancy when the number of filled seats drops, a new organization, a rename and a move.",
  },
  methodChangesP3: {
    nl: "Elke wijziging draagt de datum van het onderliggende feit en de bron van het record dat de wijziging veroorzaakt. Zonder bron wordt de wijziging niet gepubliceerd.",
    en: "Every change carries the date of the underlying fact and the source of the record that caused the change. Without a source, the change is not published.",
  },
  methodChangesP4a: {
    nl: "Zolang er geen eerdere versie is, schrijft de vergelijking geen geschiedenis. De eerste vulling komt uit een aparte, deterministische stap die alleen feiten met een datum of een zetelaantal overneemt. Een leemte in de vorige versie blijft een leemte. De volledige regels staan in",
    en: "As long as there is no earlier version, the comparison writes no history. The initial fill comes from a separate, deterministic step that only carries over facts with a date or a seat count. A gap in the previous version stays a gap. The full rules are in",
  },
  methodMaintTitle: { nl: "Actualiteit en onderhoud", en: "Freshness and maintenance" },
  methodMaintP1: {
    nl: "Elke nacht haalt de verversingsstap de actuele bewindspersonen op Rijksoverheid, de ledenlijst van de Eerste Kamer en de fractiezetels van de Tweede Kamer. Wie in de officiële lijst staat en nog geen lopende aanstelling heeft, krijgt er een met de lijstpagina als bron. Wie uit de lijst verdwijnt, krijgt een einddatum gelijk aan de ophaaldag, opnieuw met de lijstpagina als bron. Zo lopen functies en lidmaatschappen automatisch mee met benoemingen, vertrek en verkiezingen.",
    en: "Every night the refresh step fetches the current office holders from Rijksoverheid, the member list of the Senate and the party seats of the House of Representatives. Anyone in the official list who does not yet have an active appointment gets one, with the list page as source. Anyone who disappears from the list gets an end date equal to the retrieval day, again with the list page as source. Positions and memberships therefore follow appointments, departures and elections automatically.",
  },
  methodMaintP2: {
    nl: "Een vangnet hoort bij die stap: zouden in één nacht meer dan vijf dienstverbanden sluiten, dan stopt de hele verversing voordat er iets wordt geschreven. Zo'n aantal wijst meestal op een gewijzigde bronpagina in plaats van op echt vertrek. De productie blijft dan op de laatste goede versie staan en de storing wordt gemeld.",
    en: "That step has a safety net: if more than five tenures were to close in a single night, the whole refresh stops before anything is written. Such a number usually points to a changed source page rather than to real departures. Production then stays on the last good version and the failure is reported.",
  },
  methodMaintP3: {
    nl: "Het nieuws wordt elke zes uur opnieuw opgehaald: kop, koppeling naar het artikel, publicatietijd, uitgever en waar de licentie het toestaat de inleiding. De wijzigingenfeed vergelijkt de nieuwe dataset met de vorige op id, zodat een naamswijziging niet als vertrek plus aanstelling verschijnt. Een record zonder bron komt niet in de feed.",
    en: "The news is fetched again every six hours: headline, link to the article, publication time, publisher and, where the licence allows it, the lead paragraph. The change feed compares the new dataset with the previous one by id, so a rename does not appear as a departure plus an appointment. A record without a source does not enter the feed.",
  },
  methodMaintP4: {
    nl: "De verversing dekt nu de regering en beide Kamers. Provincies, gemeenten, waterschappen en Caribisch Nederland komen uit de onderzoekswerkstromen en hebben nog geen live bron. Dat is een benoemde leemte; hun gegevens worden bij een volgende onderzoeksronde bijgewerkt.",
    en: "The refresh currently covers the government and both Chambers. Provinces, municipalities, water boards and the Caribbean Netherlands come from the research workstreams and have no live source yet. That is a named gap; their data is updated in a next research round.",
  },
  methodAiTitle: { nl: "Taalmodellen en menselijke controle", en: "Language models and human review" },
  methodAiP1: {
    nl: "Voor het beschrijven en samenvatten staat het beleid het gebruik van taalmodellen toe. De hoofdregel is strikt: een model mag feiten die een bron noemt samenvatten, herschrijven en van verwijzingen voorzien, maar mag nooit een feit toevoegen dat de bron niet noemt. Twijfelt het model, dan wordt de uitvoer geschrapt of gemarkeerd, nooit geraden.",
    en: "For describing and summarising, the policy allows the use of language models. The main rule is strict: a model may summarise, rewrite and reference facts that a source states, but may never add a fact the source does not state. If the model is in doubt, the output is dropped or marked, never guessed.",
  },
  methodAiP2: {
    nl: "De toegestane toepassingen zijn het opstellen van beschrijvingen bij organisaties en posities, het samenvatten van nieuwsberichten, het koppelen van entiteiten in die samenvattingen, het schrijven van een regel bij een wijziging, en het opstellen van een onderwerpstekst. Elke toepassing heeft een vaste controle: beschrijvingen worden tegen de aangehaalde bron gecontroleerd, nieuws mag alleen bevatten wat het artikel zelf zegt, en koppelingen gaan via de aliassenlijst met een drempel en een handmatige controlelijst.",
    en: "The allowed uses are drafting descriptions for organizations and positions, summarising news items, linking entities inside those summaries, writing the line for a change, and drafting a topic text. Every use has a fixed check: descriptions are verified against the cited source, news may contain only what the article itself says, and links go through the alias list with a threshold and a manual review list.",
  },
  methodAiP3: {
    nl: "Alles wat op de homepage verschijnt, krijgt voor publicatie een controle door een mens of een gecontroleerde agent. Beschrijvingen worden bij de merge eenmalig tegen hun bron bevestigd en daarna alleen herzien als de bron verandert. Modeluitvoer wordt nooit als eigen verslaggeving gepresenteerd, en elke AI-ondersteunde tekst verwijst naar de onderliggende bron.",
    en: "Everything that appears on the homepage gets a review by a human or a supervised agent before publication. Descriptions are confirmed against their source once at merge time and are only revised afterwards if the source changes. Model output is never presented as original reporting, and every AI-assisted text points to the underlying source.",
  },
  methodAiP4: {
    nl: "In de huidige dataset komen nieuwssamenvattingen niet van een taalmodel. Ze worden met een vaste tekst opgebouwd uit de titel en de inleiding van het artikel zelf. Welk model in de toekomst wordt gebruikt voor de toegestane toepassingen, staat nog niet vast in de repository. Dat is een open punt.",
    en: "In the current dataset, news summaries do not come from a language model. They are built with a fixed template from the title and the lead paragraph of the article itself. Which model will be used in the future for the allowed uses is not yet recorded in the repository. That is an open point.",
  },
  methodCorrectionsTitle: {
    nl: "Correcties en het correctielogboek",
    en: "Corrections and the correction log",
  },
  methodCorrectionsP1: {
    nl: "Een gepubliceerd feit wordt niet stil aangepast. Elke correctie wordt vastgelegd met de oude waarde, de nieuwe waarde, de datum en de reden, in een openbaar logboek. Iemand die de oude waarde heeft gezien, kan terugvinden wat er is veranderd en waarom.",
    en: "A published fact is not changed silently. Every correction is recorded with the old value, the new value, the date and the reason, in a public log. Someone who saw the old value can find out what changed and why.",
  },
  methodCorrectionsP2: {
    nl: "Een ernstige fout krijgt tijdelijk een korte melding op de betrokken pagina.",
    en: "A serious error gets a short notice on the affected page for a while.",
  },
  methodCorrectionsP3: {
    nl: "Correcties kun je melden via de issues in de openbare repository: https://github.com/techneissa/staatsgraaf/issues. Vermeld de pagina, het feit, de juiste waarde en de bron. Een correctie verandert de dataset met een nieuwe commit, een regel in dit logboek en, bij een ernstige fout, een korte melding op de betrokken pagina.",
    en: "You can report corrections via the issues in the public repository: https://github.com/techneissa/staatsgraaf/issues. Name the page, the fact, the correct value and the source. A correction changes the dataset with a new commit, a line in this log and, for a serious error, a short notice on the affected page.",
  },
  methodLicensesTitle: { nl: "Licenties en hergebruik", en: "Licences and reuse" },
  methodLicensesP1: {
    nl: "De code van Staatsgraaf valt onder de MIT-licentie. De dataset, de beschrijvingen en de samenvattingen vallen onder CC BY 4.0. Hergebruik mag, ook commercieel, zolang de bron wordt genoemd.",
    en: "The code of Staatsgraaf is under the MIT licence. The dataset, the descriptions and the summaries are under CC BY 4.0. Reuse is allowed, including commercial use, as long as the source is credited.",
  },
  methodLicensesP2a: {
    nl: "Naamsvermelding verwijst naar Staatsgraaf en naar de onderliggende bron, met de bron-URL en de ophaaldatum. De volledige lijst per bron met licenties en creditregels staat in",
    en: "Attribution refers to Staatsgraaf and to the underlying source, with the source URL and the retrieval date. The full per-source list of licences and credit rules is in",
  },
  methodLicensesP2b: {
    nl: ". De repository-URL is nog niet vastgelegd, dus deze verwijzing is voorlopig een bestandsnaam zonder host en nog niet aanklikbaar in de browser. Dat is een benoemde leemte. De licentiegegevens staan ook in",
    en: ". The repository URL has not been recorded yet, so this reference is for now a file name without a host and is not clickable in the browser. That is a named gap. The licence details are also in",
  },
  methodLimitsTitle: { nl: "Grenzen van de data", en: "Limits of the data" },
  methodLimitsIntro: {
    nl: "De dataset is nog niet compleet. De volgende grenzen zijn bekend en benoemd.",
    en: "The dataset is not complete yet. The following limits are known and named.",
  },
  methodLimits1: {
    nl: "843 posities hebben nog geen dienstverband met een bron. Het gaat vooral om zetelgebonden functies zoals raadslid, statenlid, wethouder en gedeputeerde, en om een aantal griffiers, secretarissen-generaal en diensthoofden.",
    en: "843 positions do not yet have a sourced tenure. These are mostly seat-bound roles such as municipal council member, provincial council member, alderman and member of the provincial executive, plus a number of clerks, secretaries-general and heads of service.",
  },
  methodLimits2: {
    nl: "Koepelorganisaties als de GGD'en en de omgevingsdiensten zijn nog niet gemodelleerd.",
    en: "Umbrella organizations such as the GGD public health services and the omgevingsdiensten environmental services are not modelled yet.",
  },
  methodLimits3: {
    nl: "De drie landen van het Koninkrijk (Aruba, Curaçao en Sint Maarten) met hun gouverneurs en Gevolmachtigde Ministers zijn nog niet gemodelleerd.",
    en: "The three countries of the Kingdom (Aruba, Curaçao and Sint Maarten) with their governors and Ministers Plenipotentiary are not modelled yet.",
  },
  methodLimits4a: {
    nl: "Van 330 van de 867 personen is een gelicentieerd portret opgenomen, met credit en licentie in",
    en: "330 of the 867 people have a licensed portrait on record, with credit and licence in",
  },
  methodLimits4b: { nl: ". De overige personen tonen initialen.", en: ". The other people show initials." },
  methodLimits5: {
    nl: "Nieuwskaarten tonen geen beeld uit het artikel zelf: geen van de nieuwsbronnen staat een beeldlicentie toe. In plaats daarvan tonen ze het portret van een gekoppelde persoon wanneer dat beschikbaar is, anders een monogram van de uitgever.",
    en: "News cards show no image from the article itself: none of the news sources grants an image licence. Instead they show the portrait of a linked person when that is available, otherwise a monogram of the publisher.",
  },
  methodLimits6: {
    nl: "Twee nieuwsbronnen weigeren verzoeken met een 403-status. Van die artikelen ontbreekt een deel.",
    en: "Two news sources reject requests with a 403 status. Part of those articles is missing.",
  },
  methodLimits7: {
    nl: "De wijzigingenfeed classificeert nog geen lidmaatschappen van grote colleges.",
    en: "The change feed does not yet classify memberships of the large colleges.",
  },
  methodLimitsOutro: {
    nl: "Deze punten staan gepland voor een latere uitbreiding. Ze worden niet opgevuld met een aanname.",
    en: "These points are planned for a later expansion. They are not filled in with an assumption.",
  },
  methodFooterPre: {
    nl: "Deze pagina is opgesteld op 18 september 2026. Zie ook",
    en: "This page was written on 18 September 2026. See also",
  },

  datasetTitle: { nl: "Dataset", en: "Dataset" },
  datasetIntro: {
    nl: "De hele dataset staat als losse JSON-bestanden op deze site. Elk feit heeft een bron met een URL en een ophaaldatum. De bestanden zijn bedoeld voor hergebruik, onderzoek en de iOS-app die op dezelfde gegevens werkt.",
    en: "The whole dataset is on this site as separate JSON files. Every fact has a source with a URL and a retrieval date. The files are meant for reuse, research and the iOS app that works on the same data.",
  },
  datasetContentsTitle: { nl: "Wat de dataset bevat", en: "What the dataset contains" },
  datasetContentsP1: {
    nl: "De momentopname van {snapshot} bevat {organizations} organisaties, {positions} posities, {people} personen, {tenures} dienstverbanden, {memberships} lidmaatschappen en {relations} relaties tussen organisaties. Daarnaast zijn er {sources} bronnen, {topics} onderwerpen, {budgets} begrotingen, {changes} wijzigingen en {news} nieuwsberichten.",
    en: "The snapshot of {snapshot} contains {organizations} organizations, {positions} positions, {people} people, {tenures} tenures, {memberships} memberships and {relations} relations between organizations. There are also {sources} sources, {topics} topics, {budgets} budgets, {changes} changes and {news} news items.",
  },
  datasetSnapshotUnknown: { nl: "deze versie", en: "this version" },
  datasetContentsP2: {
    nl: "Elk bestand heeft een vaste naam en een vaste vorm. Verwijzingen tussen records lopen via een id, nooit via een naam. De dataset is een momentopname en geen live feed: nieuwe feiten komen pas in een volgende versie.",
    en: "Every file has a fixed name and a fixed shape. References between records run through an id, never through a name. The dataset is a snapshot and not a live feed: new facts only enter in a next version.",
  },
  datasetVersionTitle: { nl: "Versie en momentopname", en: "Version and snapshot" },
  datasetVersionP1a: { nl: "De huidige versie is", en: "The current version is" },
  datasetVersionP1b: { nl: "met momentopname", en: "with snapshot" },
  datasetUnknownDate: { nl: "onbekende datum", en: "unknown date" },
  datasetVersionP1c: {
    nl: ". De versie en de datum staan ook in het manifest, samen met de bestandsgroottes en een sha256-controlesom per bestand. Zo kun je controleren of een download compleet en ongewijzigd is.",
    en: ". The version and the date are also in the manifest, together with the file sizes and a sha256 checksum per file. That lets you verify that a download is complete and unchanged.",
  },
  datasetLicenseTitle: { nl: "Licentie", en: "Licence" },
  datasetLicenseP1: {
    nl: "De dataset, de beschrijvingen en de samenvattingen vallen onder CC BY 4.0. Dat betekent dat hergebruik mag, ook commercieel, zolang je de bron noemt en de licentie vermeldt. De code van deze site valt onder de MIT-licentie. De volledige licentieteksten staan bij de downloads.",
    en: "The dataset, the descriptions and the summaries are under CC BY 4.0. That means reuse is allowed, including commercial use, as long as you credit the source and state the licence. The code of this site is under the MIT licence. The full licence texts sit with the downloads.",
  },
  datasetLicenseData: { nl: "Dataset:", en: "Dataset:" },
  datasetLicenseSee: { nl: "zie ook", en: "see also" },
  datasetLicenseCode: { nl: "Code: MIT, zie", en: "Code: MIT, see" },
  datasetLicenseFacts: {
    nl: "Feiten zelf zijn niet auteursrechtelijk beschermd. De licentie geldt voor onze eigen bijdrage: de selectie, de structuur, de samenstelling, de beschrijvingen en de samenvattingen.",
    en: "Facts themselves are not protected by copyright. The licence covers our own contribution: the selection, the structure, the composition, the descriptions and the summaries.",
  },
  datasetAttributionTitle: { nl: "Bronvermelding", en: "Credit" },
  datasetAttributionP1: {
    nl: "De dataset valt onder CC BY 4.0. Noem bij hergebruik {site} en link naar deze site, bijvoorbeeld zo:",
    en: "The dataset is under CC BY 4.0. When you reuse it, mention {site} and link to this site, for example:",
  },
  datasetAttributionP2a: {
    nl: "De volledige creditregels per bron staan in",
    en: "The full credit rules per source are in",
  },
  datasetAttributionP2b: {
    nl: ". Dat bestand staat in de repository, die nog niet openbaar is. Deze verwijzing is daarom voorlopig een bestandsnaam zonder host en nog niet aanklikbaar in de browser. Dat is een benoemde leemte. Dezelfde licentie- en broninformatie staat in",
    en: ". That file is in the repository, which is not public yet. This reference is therefore for now a file name without a host and is not clickable in the browser. That is a named gap. The same licence and source information is in",
  },
  datasetPhotoCredits: {
    nl: "Portretten: Tweede Kamer der Staten-Generaal (CC0) en Wikimedia Commons (licentie per bestand). De credit en licentie per foto staan in media.json in de download.",
    en: "Portraits: Tweede Kamer der Staten-Generaal (CC0) and Wikimedia Commons (licence per file). The credit and licence per photo are in media.json in the download.",
  },
  datasetCiteTitle: { nl: "Citeer de dataset", en: "Cite the dataset" },
  datasetCiteIntro: {
    nl: "Gebruik bijvoorbeeld deze verwijzing:",
    en: "For example, use this citation:",
  },
  datasetCiteNote: {
    nl: "Vul de raadpleegdatum in en, als je een vast adres gebruikt, de versie en de momentopname. Het manifest noemt dezelfde versie en datum, zodat een lezer de juiste momentopname kan terugvinden.",
    en: "Fill in the access date and, if you use a fixed address, the version and the snapshot. The manifest names the same version and date, so a reader can find back the right snapshot.",
  },
  datasetDownloadTitle: { nl: "Downloaden", en: "Download" },
  datasetDownloadPre: {
    nl: "Het manifest beschrijft alle bestanden:",
    en: "The manifest describes all files:",
  },
  datasetDownloadPost: { nl: ". Daaronder staat elk bestand apart.", en: ". Each file is listed below it." },
  fileOrganizations: { nl: "Organisaties", en: "Organizations" },
  filePositions: { nl: "Posities", en: "Positions" },
  filePeople: { nl: "Personen", en: "People" },
  fileTenures: { nl: "Dienstverbanden", en: "Tenures" },
  fileMemberships: { nl: "Lidmaatschappen", en: "Memberships" },
  fileRelations: { nl: "Relaties", en: "Relations" },
  fileSources: { nl: "Bronnen", en: "Sources" },
  fileTopics: { nl: "Onderwerpen", en: "Topics" },
  fileBudgets: { nl: "Begrotingen", en: "Budgets" },
  fileChanges: { nl: "Wijzigingen", en: "Changes" },
  fileNews: { nl: "Nieuwsberichten", en: "News items" },
  fileGovernments: { nl: "Regeringen", en: "Governments" },
  fileMedia: { nl: "Media", en: "Media" },
  fileMeta: { nl: "Metadata", en: "Metadata" },
  recordsCount: { nl: "{n} records", en: "{n} records" },
  fileLicenseData: { nl: "Datumlicentie", en: "Data licence" },
  fileLicenseCode: { nl: "Codelicentie", en: "Code licence" },
  datasetIndependenceTitle: { nl: "Onafhankelijkheid", en: "Independence" },
  datasetIndependenceP1: {
    nl: "{site} is een onafhankelijke publicatie en is niet verbonden aan de Nederlandse overheid of aan enige overheidsinstantie. De gegevens komen uit openbare bronnen die per feit worden vermeld. Aan de weergave kunnen geen rechten worden ontleend. Bij twijfel raadpleeg je altijd de officiële bron.",
    en: "{site} is an independent publication and is not affiliated with the Dutch government or with any government body. The data comes from public sources, named per fact. No rights can be derived from the presentation. In case of doubt, always consult the official source.",
  },

  privacyTitle: { nl: "Privacy", en: "Privacy" },
  privacyIntro: {
    nl: "Staatsgraaf is een onafhankelijke publicatie over de Nederlandse overheid. De site is niet verbonden aan de Nederlandse overheid of aan enige overheidsinstantie. Deze verklaring zegt wat de site doet en wat de site niet doet.",
    en: "Staatsgraaf is an independent publication about the Dutch government. The site is not affiliated with the Dutch government or with any government body. This statement says what the site does and what the site does not do.",
  },
  privacyNotTitle: { nl: "Wat de site niet doet", en: "What the site does not do" },
  privacyNot1: {
    nl: "De site plaatst geen cookies en gebruikt geen vergelijkbare volgtechniek.",
    en: "The site places no cookies and uses no similar tracking technique.",
  },
  privacyNot2: {
    nl: "De site heeft geen bezoekersstatistiek en geen advertentie- of analysedienst. De code bevat geen analytics.",
    en: "The site has no visitor statistics and no advertising or analytics service. The code contains no analytics.",
  },
  privacyNot3: {
    nl: "De site laadt geen externe scripts, widgets of lettertypen van derden. Alles komt van de site zelf. Het zoekveld haalt alleen een indexbestand van de site zelf op.",
    en: "The site loads no external scripts, widgets or fonts from third parties. Everything comes from the site itself. The search field only fetches an index file from the site itself.",
  },
  privacyNot4: {
    nl: "De site heeft geen accounts en geen formulieren die persoonsgegevens opslaan.",
    en: "The site has no accounts and no forms that store personal data.",
  },
  privacyThemeNote: {
    nl: "De enige voorkeur die lokaal wordt bewaard, is het gekozen thema (licht of donker). Die voorkeur staat in de opslag van je eigen browser, wordt niet naar een server verstuurd, en verdwijnt wanneer je de opslag van de site wist.",
    en: "The only preference stored locally is the chosen theme (light or dark). That preference sits in your own browser's storage, is not sent to a server, and disappears when you clear the site's storage.",
  },
  privacyDatasetTitle: { nl: "Welke gegevens de dataset bevat", en: "Which data the dataset contains" },
  privacyDatasetP1: {
    nl: "De dataset gaat over personen met een publieke functie. De gegevens komen uit bronnen die de overheid zelf openbaar maakt, zoals wetten, benoemingsbesluiten, registers en de websites van de organen.",
    en: "The dataset is about people in public office. The data comes from sources the government itself makes public, such as laws, appointment decisions, registers and the websites of the bodies.",
  },
  privacyDatasetP2: {
    nl: "De grondslag is het algemeen belang bij een publiek overzicht van de overheid, in combinatie met het feit dat de gegevens al openbaar zijn. De dataset bevat naam, functie, organisatie, datums van aanstelling en vertrek en, als een openbare bron die publiceert, de geboortedatum, met per feit een bron.",
    en: "The basis is the public interest in a public overview of the government, combined with the fact that the data is already public. The dataset contains name, position, organization, dates of appointment and departure and, where a public source publishes it, the date of birth, with a source per fact.",
  },
  privacyDatasetP3: {
    nl: "Er zijn geen contactgegevens, privéadressen of gezinsgegevens. Van politici en andere ambtsdragers staat de geboortedatum vermeld als een openbare bron die publiceert, zoals de open data van de Tweede Kamer of Wikidata. Wat niet nodig is voor het overzicht, wordt niet verzameld.",
    en: "There are no contact details, private addresses or family data. For politicians and other office holders, the date of birth is shown when a public source publishes it, such as the Tweede Kamer open data or Wikidata. Anything not needed for the overview is not collected.",
  },
  privacyLogsTitle: { nl: "Serverlogbestanden", en: "Server logs" },
  privacyLogsP1: {
    nl: "De site wordt als statische bestanden gehost. De hostingpartij kan technische logbestanden bijhouden, zoals IP-adressen en opgevraagde bestanden. Welke partij dat is en hoe lang die logbestanden worden bewaard, staat nog niet vast. Dat is een benoemde leemte. Zodra de host bekend is, worden de termijn en de verwerking hier vermeld.",
    en: "The site is hosted as static files. The hosting party may keep technical logs, such as IP addresses and requested files. Which party that is and how long those logs are kept is not yet fixed. That is a named gap. Once the host is known, the retention period and the processing will be listed here.",
  },
  privacyRetentionTitle: { nl: "Bewaartermijn", en: "Retention period" },
  privacyRetentionP1: {
    nl: "De datasetgeschiedenis en de gedateerde ruwe momentopnames worden bewaard om eerdere gepubliceerde versies te kunnen herleiden en om correcties te kunnen controleren. Er is nog geen vaste bewaartermijn vastgelegd. Dat is een open punt.",
    en: "The dataset history and the dated raw snapshots are kept so that earlier published versions can be traced and corrections can be checked. No fixed retention period has been recorded yet. That is an open point.",
  },
  privacyCorrectionTitle: { nl: "Correctie of verwijdering", en: "Correction or removal" },
  privacyCorrectionP1: {
    nl: "Een persoon kan een feitelijke fout laten corrigeren. De fout wordt hersteld en de wijziging komt met datum en reden in het correctielogboek. Een verzoek om een gegeven over een publieke functie te verwijderen, wordt beoordeeld tegen de grondslag van het algemeen belang en het recht van bezwaar.",
    en: "A person can have a factual error corrected. The error is fixed and the change enters the correction log with date and reason. A request to remove a fact about a public office is assessed against the basis of the public interest and the right to object.",
  },
  privacyCorrectionP2: {
    nl: "Er is nog geen openbaar contactadres en nog geen publieke repository-URL vastgelegd. Daardoor is er nog geen concrete plek waar een verzoek kan worden ingediend. Dat is een benoemde leemte. Zodra die gegevens er zijn, staat hier hoe je een correctie of verwijdering aanvraagt.",
    en: "No public contact address and no public repository URL have been recorded yet. There is therefore no concrete place yet where a request can be submitted. That is a named gap. Once that information exists, this page will describe how to request a correction or removal.",
  },
  privacyControllerTitle: { nl: "Verwerkingsverantwoordelijke", en: "Data controller" },
  privacyControllerP1: {
    nl: "De verwerkingsverantwoordelijke is het onafhankelijke project Staatsgraaf. Er is geen overheidsinstantie bij de verwerking betrokken en er is geen Functionaris Gegevensbescherming aangesteld.",
    en: "The data controller is the independent project Staatsgraaf. No government body is involved in the processing and no Data Protection Officer has been appointed.",
  },
  privacyFooterPre: {
    nl: "Deze verklaring is opgesteld op 18 september 2026.",
    en: "This statement was written on 18 September 2026.",
  },

  accessTitle: { nl: "Toegankelijkheid", en: "Accessibility" },
  accessIntro: {
    nl: "Staatsgraaf wil voor iedereen leesbaar en bedienbaar zijn. Deze verklaring beschrijft het nagestreefde niveau, wat al werkt, waar de site nog tekortschiet, en hoe je een probleem meldt.",
    en: "Staatsgraaf wants to be readable and operable for everyone. This statement describes the level aimed for, what already works, where the site still falls short, and how to report a problem.",
  },
  accessGoalTitle: { nl: "Doel", en: "Goal" },
  accessGoalP1: {
    nl: "De site streeft naar WCAG 2.2 niveau AA. Dat geldt voor de leesbare pagina's en voor de interactieve onderdelen zoals de grafiek en het zoeken. De latere iOS- en iPadOS-app volgt de toegankelijkheidsfuncties van het platform.",
    en: "The site aims for WCAG 2.2 level AA. That applies to the readable pages and to the interactive parts such as the graph and search. The later iOS and iPadOS app follows the platform's accessibility features.",
  },
  accessWorksTitle: { nl: "Wat werkt", en: "What works" },
  accessWorks1: {
    nl: "Toetsenbord. Alle bediening is met het toetsenbord bereikbaar: eerst de bovenbalk, dan de leeskolom en daarna de grafiek. De grafiek heeft eigen toetsenbordbediening. Pijltjestoetsen verplaatsen de selectie, Enter opent de organisatie, Escape wist de selectie, plus en min zoomen, en nul herstelt het beeld.",
    en: "Keyboard. All controls are reachable with the keyboard: first the top bar, then the reading column and then the graph. The graph has its own keyboard controls. Arrow keys move the selection, Enter opens the organization, Escape clears the selection, plus and minus zoom, and zero resets the view.",
  },
  accessWorks2: {
    nl: "Zichtbare focus. Elk bedienbaar element heeft een zichtbare focusring. De ring gebruikt de focuskleur uit de tokens en is in beide thema's zichtbaar.",
    en: "Visible focus. Every operable element has a visible focus ring. The ring uses the focus colour from the tokens and is visible in both themes.",
  },
  accessWorks3: {
    nl: "Structuur. Elke pagina heeft één h1, oplopende koppen zonder overgeslagen niveaus, en de landmarks header, nav, main, aside en footer.",
    en: "Structure. Every page has one h1, headings in ascending order with no skipped levels, and the landmarks header, nav, main, aside and footer.",
  },
  accessWorks4: {
    nl: "Overslaan. Een skip-link met de tekst Naar de inhoud springt direct naar de hoofdinhoud.",
    en: "Skip link. A skip link with the text Skip to content jumps straight to the main content.",
  },
  accessWorks5: {
    nl: "Contrast. De kleurparen die het controlescript in de repository toetst, halen in zowel het lichte als het donkere thema de WCAG AA-minima. Het donkere thema is de standaard.",
    en: "Contrast. The colour pairs tested by the check script in the repository meet the WCAG AA minima in both the light and the dark theme. The dark theme is the default.",
  },
  accessWorks6: {
    nl: "Beweging. De site respecteert de systeeminstelling voor minder beweging en schakelt decoratieve overgangen uit.",
    en: "Motion. The site respects the system setting for reduced motion and switches off decorative transitions.",
  },
  accessWorks7: {
    nl: "De grafiek heeft een lijstalternatief. Naast de visuele grafiek staat een lijst van organisaties per bestuurslaag. Bij een gekozen organisatie noemt de lijst ook de verbindingen, met de richting en het soort relatie. Een schermlezer hoort de selectie via een live melding.",
    en: "The graph has a list alternative. Next to the visual graph there is a list of organizations per government branch. For a chosen organization the list also names the connections, with the direction and the kind of relation. A screen reader hears the selection through a live announcement.",
  },
  accessWorks8: {
    nl: "Zoeken is een combobox. Het zoekveld heeft een label, een uitgeklapte status, een resultatenlijst met opties en een live melding van het aantal resultaten.",
    en: "Search is a combobox. The search field has a label, an expanded state, a results list with options and a live announcement of the number of results.",
  },
  accessLimitsTitle: { nl: "Bekende beperkingen", en: "Known limitations" },
  accessLimits1: {
    nl: "De grafiek is in de kern visueel. De positie van knooppunten en de vorm van het netwerk worden niet aan een schermlezer beschreven. Dezelfde relaties staan in het lijstalternatief en op de organisatiepagina's.",
    en: "The graph is visual at its core. The position of nodes and the shape of the network are not described to a screen reader. The same relations are in the list alternative and on the organization pages.",
  },
  accessLimits2: {
    nl: "De labels in de grafiek gebruiken vaste pixelgroottes. Daardoor schalen ze niet mee met tekstzoom in de browser. Bij een hoge tekstschaal kunnen de labels klein blijven.",
    en: "The labels in the graph use fixed pixel sizes. They therefore do not scale with text zoom in the browser. At a high text scale the labels may stay small.",
  },
  accessLimits3: {
    nl: "De vaste tweekolomsindeling kan bij 200 procent tekstzoom krap worden. Dat is nog niet in een echte browser getest.",
    en: "The fixed two-column layout can get tight at 200 percent text zoom. That has not been tested in a real browser yet.",
  },
  accessLimits4: {
    nl: "Er is nog geen volledige handmatige controle met een schermlezer en een echte browser afgerond. Een structurele scan en de contrastcontrole zijn wel uitgevoerd.",
    en: "A full manual check with a screen reader and a real browser has not been completed yet. A structural scan and the contrast check have been done.",
  },
  accessLimitsOutro: {
    nl: "Deze punten worden bijgehouden en in latere rondes opgelost.",
    en: "These points are tracked and will be fixed in later rounds.",
  },
  accessReportTitle: { nl: "Een probleem melden", en: "Reporting a problem" },
  accessReportP1: {
    nl: "Loop je tegen een toegankelijkheidsprobleem aan, dan kun je dat melden. Er is nog geen openbaar contactadres en nog geen publieke repository-URL vastgelegd, dus er is nog geen concrete plek voor een melding. Dat is een benoemde leemte. Zodra die gegevens er zijn, staat hier hoe je meldt en binnen welke termijn je een reactie kunt verwachten.",
    en: "If you run into an accessibility problem, you can report it. No public contact address and no public repository URL have been recorded yet, so there is no concrete place for a report yet. That is a named gap. Once that information exists, this page will describe how to report and within which period you can expect a reply.",
  },
  accessReviewTitle: { nl: "Herziening", en: "Review" },
  accessReviewP1: {
    nl: "Deze verklaring is opgesteld op 18 september 2026. De verklaring wordt herzien wanneer de interface verandert of wanneer een nieuw onderzoek daartoe aanleiding geeft.",
    en: "This statement was written on 18 September 2026. The statement is revised when the interface changes or when a new audit gives reason to.",
  },
} as const satisfies Record<string, LocString>;

export type PagesKey = keyof typeof PAGES_DICT;
