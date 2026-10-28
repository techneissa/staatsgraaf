import type { LocString } from "./locales";

/**
 * Owned by the static-and-shell pages area: footer, methodiek, dataset,
 * privacy, toegankelijkheid, not-found, brand and search chrome.
 */
export const PAGES_DICT = {
  pagesTitle: { nl: "Statische pagina's", en: "Static pages" },

  scopeLabel: { nl: "NL Rijk", en: "NL national" },

  linkHome: { nl: "homepage", en: "homepage" },
  linkAbout: { nl: "Over", en: "About" },
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
  partyOverviewLabel: { nl: "Alle partijen", en: "All parties" },

  notFoundTitle: { nl: "Pagina niet gevonden", en: "Page not found" },
  notFoundPre: {
    nl: "Deze pagina bestaat niet of is verplaatst. Ga terug naar de",
    en: "This page does not exist or has moved. Go back to the",
  },

  footerNavLabel: { nl: "Voettekst", en: "Footer" },
  footerIndependent: {
    nl: "Niet verbonden aan de Nederlandse overheid.",
    en: "Not affiliated with the Dutch government.",
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
  searchDidYouMean: { nl: "Bedoelde je {term}?", en: "Did you mean {term}?" },
  searchDidYouMeanStatus: {
    nl: "Geen exacte treffers. Bedoelde je {term}?",
    en: "No exact matches. Did you mean {term}?",
  },
  searchRecentHeader: { nl: "Recent gezocht", en: "Recent searches" },
  searchRecentClear: { nl: "Wis recente zoekopdrachten", en: "Clear recent searches" },
  searchRecentClearShort: { nl: "Wissen", en: "Clear" },
  searchRecentPrivacy: {
    nl: "Alleen op dit apparaat opgeslagen.",
    en: "Stored on this device only.",
  },
  searchShortcutHint: { nl: "Zoeken ({keys})", en: "Search ({keys})" },
  searchResultsLabel: { nl: "Zoekresultaten", en: "Search results" },
  kindOrganization: { nl: "Organisatie", en: "Organization" },
  kindPosition: { nl: "Positie", en: "Position" },
  kindPerson: { nl: "Persoon", en: "Person" },
  kindTopic: { nl: "Onderwerp", en: "Topic" },

  aboutTitle: { nl: "Over", en: "About" },
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
    nl: "De code van Staatsgraaf is source-available onder de licentie CC BY-NC-SA 4.0: je mag haar niet-commercieel gebruiken en aanpassen, met naamsvermelding en onder dezelfde licentie. De dataset, de beschrijvingen en de samenvattingen vallen onder CC BY 4.0. Hergebruik van de data mag, ook commercieel, zolang de bron wordt genoemd.",
    en: "The code of Staatsgraaf is source-available under the CC BY-NC-SA 4.0 licence: you may use and adapt it for noncommercial purposes, with credit and under the same licence. The dataset, the descriptions and the summaries are under CC BY 4.0. Reuse of the data is allowed, including commercial use, as long as the source is credited.",
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
    nl: "De hele dataset staat als JSON-bestanden op deze site. Elk feit heeft een bron met een URL en een ophaaldatum. De bestanden zijn bedoeld voor hergebruik en onderzoek, en voor een iOS-app die nog in ontwikkeling is.",
    en: "The whole dataset is on this site as JSON files. Every fact has a source with a URL and a retrieval date. They are for reuse and research, and for an iOS app that is still in development.",
  },
  datasetContentsTitle: { nl: "Wat de dataset bevat", en: "What the dataset contains" },
  datasetContentsP2: {
    nl: "Records verwijzen naar elkaar met een id, nooit met een naam. Ambtsdragers en nieuws worden elke 3 uur op wijzigingen gecontroleerd.",
    en: "Records refer to each other by id, never by name. Office holders and news are checked for changes every 3 hours.",
  },
  datasetLicenseTitle: { nl: "Licentie", en: "Licence" },
  datasetLicenseP1: {
    nl: "De dataset, de beschrijvingen en de samenvattingen vallen onder CC BY 4.0. Dat betekent dat hergebruik mag, ook commercieel, zolang je de bron noemt en de licentie vermeldt. De code van deze site is source-available onder de licentie CC BY-NC-SA 4.0 (niet-commercieel gebruik, naamsvermelding, zelfde licentie voor aanpassingen). De volledige licentieteksten staan bij de downloads.",
    en: "The dataset, the descriptions and the summaries are under CC BY 4.0. That means reuse is allowed, including commercial use, as long as you credit the source and state the licence. The code of this site is source-available under the CC BY-NC-SA 4.0 licence (noncommercial use, credit, same licence for adaptations). The full licence texts sit with the downloads.",
  },
  datasetLicenseData: { nl: "Dataset:", en: "Dataset:" },
  datasetLicenseSee: { nl: "zie ook", en: "see also" },
  datasetLicenseCode: { nl: "Code: CC BY-NC-SA 4.0, zie", en: "Code: CC BY-NC-SA 4.0, see" },
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
    nl: ". Dat bestand staat in de openbare repository. Dezelfde licentie- en broninformatie staat in",
    en: ". That file is in the public repository. The same licence and source information is in",
  },
  datasetPhotoCredits: {
    nl: "Portretten: Tweede Kamer der Staten-Generaal (CC0) en Wikimedia Commons (licentie per bestand). De credit en licentie per foto staan in media.json in de download.",
    en: "Portraits: Tweede Kamer der Staten-Generaal (CC0) and Wikimedia Commons (licence per file). The credit and licence per photo are in media.json in the download.",
  },
  photoCreditsDatasetNote: {
    nl: "Bij elke foto op een personenpagina staan de auteur, de licentie en de bronpagina in de (i) naast de foto. De foto's zijn verkleind en bijgesneden; waar de licentie dat vraagt, staat dat in de credit.",
    en: "On a person page, each photo's author, licence and source page are in the (i) next to the photo. The photos are resized and cropped; where the licence asks for it, the credit says so.",
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
  fileManifest: { nl: "Overzicht van alle bestanden", en: "Overview of all files" },
  downloadFile: { nl: "{file} downloaden", en: "Download {file}" },
  recordsWord: { nl: "records", en: "records" },
  filesListedWord: { nl: "bestanden vermeld", en: "files listed" },
  fileElections: { nl: "Verkiezingen", en: "Elections" },
  fileCoalitions: { nl: "Coalities", en: "Coalitions" },
  fileCareers: { nl: "Loopbaanstappen", en: "Career steps" },
  fileActivities: { nl: "Activiteit per Kamerlid", en: "Activity per MP" },
  fileNewsTranslations: { nl: "Vertaalde nieuwsberichten", en: "Translated news items" },
  fileDescriptionTranslations: { nl: "Vertaalde beschrijvingen", en: "Translated descriptions" },
  fileDescriptionFlags: { nl: "Gemarkeerde beschrijvingen", en: "Flagged descriptions" },
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
    nl: "Staatsgraaf plaatst geen cookies, gebruikt geen analyse of advertenties en kent geen accounts of formulieren.",
    en: "Staatsgraaf sets no cookies, runs no analytics or ads, and has no accounts or forms.",
  },
  privacyStoredTitle: { nl: "Opgeslagen in je browser", en: "Saved in your browser" },
  privacyStoredP1: {
    nl: "De site onthoudt een paar keuzes op je eigen apparaat. Ze verlaten je browser nooit en blijven staan tot je de gegevens van de site wist.",
    en: "The site remembers a few choices on your device. They never leave your browser, and they stay until you clear the site's data.",
  },
  privacyStored1: { nl: "Thema en taal", en: "Theme and language" },
  privacyStored2: {
    nl: "Of de paginakolom en het detailpaneel openstaan, en hoe breed het detailpaneel is",
    en: "Whether the page column and the details panel are open, and how wide the details panel is",
  },
  privacyStored3: { nl: "Je laatste vijf zoekopdrachten", en: "Your last five searches" },
  privacyStored4: {
    nl: "De weergave van de Kamer en of die foto's toont",
    en: "The chamber layout and whether it shows photos",
  },
  privacyStored5: {
    nl: "Dat je de welkomstbanner hebt gesloten",
    en: "That you closed the welcome banner",
  },
  privacyStoredP2: {
    nl: "Scrollposities en of de grafiek openstaat, blijven alleen bewaard tot je het tabblad sluit.",
    en: "Scroll positions and whether the graph is open are kept only until you close the tab.",
  },
  privacyElsewhereTitle: { nl: "Van elders geladen", en: "Loaded from elsewhere" },
  privacyElsewhereP1: {
    nl: "De site draait op Cloudflare Pages. Cloudflare handelt elk verzoek af en kan technische gegevens loggen, zoals je IP-adres.",
    en: "The site runs on Cloudflare Pages. Cloudflare handles every request and may log technical details such as your IP address.",
  },
  privacyElsewhereP2: {
    nl: "Sommige nieuwskaarten tonen een afbeelding van de server van de nieuwsbron zelf. Je browser haalt die daar op, dus die bron ziet je IP-adres. Scripts, lettertypen en al het andere komen van deze site.",
    en: "Some news cards show a picture from the outlet's own server. Your browser fetches it there, so that outlet can see your IP address. Scripts, fonts and everything else come from this site.",
  },
  privacyDataTitle: { nl: "De gegevens", en: "The data" },
  privacyDataP1: {
    nl: "De dataset gaat over personen met een publieke functie: naam, functie, data in functie en, als een openbare bron die geeft, de geboortedatum. Elk feit noemt zijn bron. Er zijn geen contactgegevens, privéadressen of gezinsgegevens.",
    en: "The dataset covers people in public office: name, role, dates in office and, where a public source gives it, date of birth. Every fact names its source. There are no contact details, private addresses or family details.",
  },
  privacyDataP2: {
    nl: "De grondslag is het algemeen belang bij een open overzicht van de overheid. Oudere versies van de data blijven bewaard, zodat correcties te herleiden zijn. Verantwoordelijk is het onafhankelijke project Staatsgraaf. Geen enkel overheidsorgaan is erbij betrokken.",
    en: "The basis is the public interest in an open overview of government. Older versions of the data are kept so corrections can be traced. The independent Staatsgraaf project is responsible. No government body is involved.",
  },
  privacyCorrectionTitle: { nl: "Correcties en verwijdering", en: "Corrections and removal" },
  privacyCorrectionP1: {
    nl: "Je kunt vragen een feitelijke fout te herstellen of een gegeven te verwijderen. Een verzoek tot verwijdering wordt afgewogen tegen het algemeen belang en je recht van bezwaar.",
    en: "You can ask for a factual error to be fixed, or for a fact to be removed. Removal requests are weighed against the public interest and your right to object.",
  },
  privacyCorrectionP2Pre: {
    nl: "Om een fout te melden of een verwijdering te vragen, open je een issue op",
    en: "To report an error or ask for a removal, open an issue on",
  },
  privacyCorrectionP2Post: {
    nl: ". Een issue is openbaar, zet er dus geen privégegevens in.",
    en: ". An issue is public, so leave private details out of it.",
  },

  accessTitle: { nl: "Toegankelijkheid", en: "Accessibility" },
  accessIntro: {
    nl: "Staatsgraaf streeft naar WCAG 2.2 niveau AA. Deze pagina zegt wat werkt, wat nog niet werkt en hoe je een probleem meldt.",
    en: "Staatsgraaf aims to meet WCAG 2.2 level AA. This page says what works, what does not yet, and how to report a problem.",
  },
  accessWorksTitle: { nl: "Wat werkt", en: "What works" },
  accessWorks1: {
    nl: "Je kunt de site met het toetsenbord bedienen. Een link bovenaan springt naar de inhoud, de focus is altijd zichtbaar en de grafiek beweegt mee met de pijltjestoetsen.",
    en: "The site works with a keyboard. A skip link at the top jumps to the content, focus is always visible, and the graph moves with the arrow keys.",
  },
  accessWorks2: {
    nl: "Animaties stoppen als je systeem om minder beweging vraagt.",
    en: "Animations stop when your system asks for reduced motion.",
  },
  accessWorks3: {
    nl: "Tekst en bedieningselementen halen in het lichte en het donkere thema het contrast van WCAG AA. Een script controleert dat.",
    en: "Text and controls meet WCAG AA contrast in both the light and the dark theme. A script checks this.",
  },
  accessWorks4: {
    nl: "Pagina's hebben koppen, oriëntatiepunten en labels, zodat een schermlezer erdoorheen kan. Op smalle schermen schuift de lay-out mee, zonder zijwaarts scrollen.",
    en: "Pages have headings, landmarks and labels, so a screen reader can move through them. On narrow screens the layout reflows without sideways scrolling.",
  },
  accessLimitsTitle: { nl: "Bekende beperkingen", en: "Known limits" },
  accessLimits1: {
    nl: "De grafiek is vooral visueel. Een schermlezer krijgt de vorm van het netwerk niet te horen. Dezelfde verbanden staan in de lijstweergave en op de pagina van elke organisatie.",
    en: "The graph is mostly visual. A screen reader does not get the shape of the network. The same links are in the list view and on each organization's page.",
  },
  accessLimits2: {
    nl: "Labels in de grafiek hebben een vaste grootte. Tekstzoom in de browser maakt ze niet groter.",
    en: "Labels in the graph have a fixed size. Text zoom in the browser does not enlarge them.",
  },
  accessLimits3: {
    nl: "We hebben nog niet met een schermlezer of op 200 procent tekstzoom getest in echte browsers.",
    en: "We have not yet tested with a screen reader, or at 200 percent text zoom, in real browsers.",
  },
  accessReportTitle: { nl: "Een probleem melden", en: "Reporting a problem" },
  accessReportPre: {
    nl: "Om een toegankelijkheidsprobleem te melden, open je een issue op",
    en: "To report an accessibility problem, open an issue on",
  },
  accessReportPost: {
    nl: ". Zet erbij om welke pagina het gaat en welk apparaat of welke hulpmiddel je gebruikt.",
    en: ". Say which page it is on and which device or assistive tool you use.",
  },
} as const satisfies Record<string, LocString>;

export type PagesKey = keyof typeof PAGES_DICT;
