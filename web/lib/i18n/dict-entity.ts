import type { LocString } from "./locales";

/** Owned by the entity pages area (organizations, people, positions). */
export const ENTITY_DICT = {
  // Tab labels
  tabNews: { nl: "Nieuws", en: "News" },
  whosConnected: { nl: "Wie is verbonden?", en: "Who is connected?" },
  panelLabel: { nl: "Panelen", en: "Panels" },

  // Header block
  legalSourceLabel: { nl: "Wettelijke grondslag", en: "Legal basis" },
  legalBasisLabel: { nl: "Wettelijke basis", en: "Legal basis" },
  websiteLabel: { nl: "Officiële website", en: "Official website" },
  addressLabel: { nl: "Bezoekadres", en: "Visiting address" },
  addressOpenMaps: { nl: "{address}, op de kaart", en: "{address}, on the map" },
  addressOnMap: { nl: "op de kaart", en: "on the map" },

  // Fact grid labels
  factType: { nl: "Type", en: "Type" },
  factBranch: { nl: "Tak", en: "Branch" },
  factLevel: { nl: "Niveau", en: "Level" },
  factAliases: { nl: "Aliassen", en: "Aliases" },
  factEstablished: { nl: "Opgericht", en: "Established" },
  factDissolved: { nl: "Opgeheven", en: "Dissolved" },
  factSeats: { nl: "Zetels", en: "Seats" },
  factEmployees: { nl: "Medewerkers", en: "Employees" },
  factParty: { nl: "Partij", en: "Party" },
  factBorn: { nl: "Geboren", en: "Born" },
  factWikipedia: { nl: "Wikipedia", en: "Wikipedia" },
  factWikidata: { nl: "Wikidata", en: "Wikidata" },
  factOrganization: { nl: "Organisatie", en: "Organization" },
  factFillMethod: { nl: "Vulwijze", en: "Filled by" },
  factTermLength: { nl: "Zittingstermijn", en: "Term length" },
  factEntryModes: { nl: "Toetredingswijzen", en: "Entry modes" },
  factsLabel: { nl: "Kenmerken", en: "Facts" },

  // Organization page sections
  currentOfficials: { nl: "Huidige functionarissen", en: "Current office holders" },
  membersTitle: { nl: "Huidige leden", en: "Current members" },
  seatTallyMajorityLine: {
    nl: "Meerderheid bij {n} van {total} zetels.",
    en: "Majority at {n} of {total} seats.",
  },
  seatTallyLabel: {
    nl: "Zetelverdeling per fractie",
    en: "Seats by faction",
  },
  seatTallyNoFractie: {
    nl: "Zonder fractie",
    en: "No faction",
  },
  seatTallySplinter: {
    nl: "eenmansfractie",
    en: "one-member faction",
  },
  seatChartLabel: {
    nl: "Zetels in de plenaire zaal",
    en: "Seats in the plenary hall",
  },
  seatChartOrderNote: {
    nl: "Volgorde: fracties op grootte, van links naar rechts. De officiële zaalindeling volgt zodra die als bron is opgenomen.",
    en: "Order: factions by size, left to right. The official seating plan follows once it is sourced.",
  },
  seatChartMajorityLine: {
    nl: "{total} zetels, meerderheid bij {n}",
    en: "{total} seats, majority at {n}",
  },
  seatChartHighlight: {
    nl: "{label}: {n} van {total} zetels",
    en: "{label}: {n} of {total} seats",
  },
  electionHistoryLabel: {
    nl: "Zetelverdeling per verkiezing",
    en: "Seats by election",
  },
  electionHistoryNote: {
    nl: "Definitieve zetelverdeling per lijst volgens de Kiesraad en het CBS; voor oudere Eerste Kamerverkiezingen volgens het Parlementair Documentatie Centrum. Lijstverbindingen zijn niet weergegeven.",
    en: "Final seat allocation per list according to the Kiesraad and Statistics Netherlands; for older Senate elections according to the Parliamentary Documentation Centre. List combinations are not shown.",
  },
  electionEarly: {
    nl: "vervroegd",
    en: "early election",
  },
  electionSeatsLine: {
    nl: "{total} zetels, meerderheid bij {majority}",
    en: "{total} seats, majority at {majority}",
  },
  electionTurnout: {
    nl: "opkomst {pct}%",
    en: "turnout {pct}%",
  },
  seatSparklineLabel: {
    nl: "Zetels per verkiezing, {from} tot {to} ({n} verkiezingen)",
    en: "Seats per election, {from} to {to} ({n} elections)",
  },
  seatSparklineTable: {
    nl: "Toon de cijfers",
    en: "Show the numbers",
  },
  seatTallyMajorityMarker: {
    nl: "Meerderheidsgrens: {n} zetels",
    en: "Majority threshold: {n} seats",
  },
  membersCountLine: {
    nl: "{n} leden met een lopend lidmaatschap in de dataset.",
    en: "{n} members with a current membership in the dataset.",
  },
  partOfTitle: { nl: "Onderdeel van", en: "Part of" },
  historyTitle: { nl: "Functiegeschiedenis", en: "Office history" },

  // Person page sections
  rolesTitle: { nl: "Functies", en: "Positions" },
  membershipMeta: { nl: "Lidmaatschap", en: "Membership" },
  membershipsTitle: { nl: "Lidmaatschappen", en: "Memberships" },
  inTheNewsTitle: { nl: "In het nieuws", en: "In the news" },
  imageCredit: { nl: "Beeld", en: "Image" },

  // Position page sections
  tenureHistoryTitle: { nl: "Bekleders door de tijd", en: "Holders over time" },
  exOfficioTitle: { nl: "Van rechtswege", en: "By virtue of office" },
  exOfficioNote: {
    nl: "De bekleder van deze positie zit of voorzit van rechtswege in de volgende organen.",
    en: "The holder of this position sits in or chairs the following bodies by virtue of office.",
  },
  holderMeta: { nl: "zetel(s)", en: "seat(s)" },

  // Connection group titles, viewpoint-aware
  electedBy: { nl: "Gekozen door", en: "Elected by" },
  appoints: { nl: "Benoemt", en: "Appoints" },
  appointedBy: { nl: "Wordt benoemd door", en: "Appointed by" },
  personChip: { nl: "Persoon", en: "Person" },
  rolesNowTitle: { nl: "Nu in functie bij", en: "Currently serving at" },
  advisesOut: { nl: "Adviseert", en: "Advises" },
  advisedBy: { nl: "Geadviseerd door", en: "Advised by" },
  overseesOut: { nl: "Houdt toezicht op", en: "Oversees" },
  overseesIn: { nl: "Onder toezicht van", en: "Overseen by" },
  electsOut: { nl: "Kiest", en: "Elects" },

  // Fallback relation group labels
  relOffice: { nl: "Positie bij", en: "Position at" },
  relDeptHead: { nl: "Hoofdpositie", en: "Head position" },
  relConfirms: { nl: "Bekrachtiging", en: "Confirmation" },
  relExOfficio: { nl: "Van rechtswege", en: "By virtue of office" },
  relAdministers: { nl: "Uitvoering", en: "Administration" },
  relSubsidises: { nl: "Subsidie", en: "Subsidy" },
  relAccountableTo: { nl: "Verantwoording", en: "Accountability" },
  relPartOf: { nl: "Onderdeel van", en: "Part of" },
  relConsistsOf: { nl: "Samenstelling", en: "Composition" },
  relSucceededBy: { nl: "Opvolging", en: "Succession" },
  relJointArrangement: { nl: "Gemeenschappelijke regeling", en: "Joint arrangement" },

  directionOutgoing: { nl: "Uitgaande relatie naar", en: "Outgoing connection to" },
  directionIncoming: { nl: "Inkomende relatie van", en: "Incoming connection from" },
  appointmentRole: { nl: "rol", en: "role" },

  // Empty states
  noConnectionsTitle: { nl: "Nog geen verbindingen", en: "No connections yet" },
  newsEmptyTitle: { nl: "Nog geen nieuws", en: "No news yet" },

  // Summaries, descriptions, facts, career and callouts
  translatedFromDutch: { nl: "Vertaald uit het Nederlands", en: "Translated from Dutch" },
  descriptionsTranslatedNote: {
    nl: "Beschrijvingen staan in het Nederlands.",
    en: "Descriptions are machine translated from Dutch where a translation exists.",
  },
  factBranchLevel: { nl: "Tak en niveau", en: "Branch and level" },
  factLinks: { nl: "Elders", en: "Elsewhere" },
  careerTitle: { nl: "Loopbaan", en: "Career" },
  actingCallout: { nl: "Waarnemend {title}", en: "Acting {title}" },
  noHolderSinceCallout: { nl: "Geen bekleder bekend sinds {date}", en: "No known holder since {date}" },
  dissolvedCallout: { nl: "Opgeheven op {date}", en: "Dissolved on {date}" },

  // Listing pages
  orgIndexTitle: { nl: "Organisaties", en: "Organizations" },
  orgIndexIntro: {
    nl: "Alle {n} organisaties, gegroepeerd naar staatsmacht.",
    en: "All {n} organisations, grouped by branch of government.",
  },
  groupNavLabel: { nl: "Groepen", en: "Groups" },
  peopleIndexTitle: { nl: "Personen", en: "People" },
  peopleIndexIntro: {
    nl: "Alle {n} personen, alfabetisch.",
    en: "All {n} people, alphabetically.",
  },
  alphabetNavLabel: { nl: "Alfabet", en: "Alphabet" },
  positionsIndexTitle: { nl: "Posities", en: "Positions" },
  positionsIndexIntro: {
    nl: "Alle {n} posities, gegroepeerd naar type.",
    en: "All {n} positions, grouped by type.",
  },

  // Badges and fallback names
  actingBadge: { nl: "Waarnemend", en: "Acting" },
  employeesShort: { nl: "{n} medewerkers", en: "{n} employees" },
  seatNumber: { nl: "Zetel {n}", en: "Seat {n}" },
  unknownOrganization: { nl: "Onbekende organisatie", en: "Unknown organization" },
  unknownPerson: { nl: "Onbekende persoon", en: "Unknown person" },
  unknownPosition: { nl: "Onbekende positie", en: "Unknown position" },
  personPortraitAlt: { nl: "Portret van {name}", en: "Portrait of {name}" },
  rolesMore: { nl: "en {n} andere posities", en: "and {n} more positions" },
  personInitialsAlt: { nl: "Initialen van {name}, geen portret beschikbaar", en: "Initials of {name}, no portrait available" },

  // Entity pages pass: counts, share, English audit
  countOnly: { nl: "{n}", en: "{n}" },
  countWithYear: { nl: "{n} ({year})", en: "{n} ({year})" },
  rolesNowLabel: { nl: "Nu in functie als", en: "Currently serving as" },
  seatOne: { nl: "{n} zetel", en: "{n} seat" },
  seatMany: { nl: "{n} zetels", en: "{n} seats" },
  seatsFilledOne: { nl: "{n} van 1 zetel bezet", en: "{n} of 1 seat filled" },
  seatsFilled: { nl: "{n} van {total} zetels bezet", en: "{n} of {total} seats filled" },
  termYearOne: { nl: "{n} jaar", en: "{n} year" },
  termYears: { nl: "{n} jaar", en: "{n} years" },
  termMonthOne: { nl: "{n} maand", en: "{n} month" },
  termMonths: { nl: "{n} maanden", en: "{n} months" },

  // Fix wave 05-10-2026: connection rows
  formerPosition: { nl: "eerder", en: "former" },

  // Fix wave 05-10-2026: organisation structure, gaps
  gapSourceLabel: { nl: "Bron:", en: "Source:" },
  childrenCountOne: { nl: "{n} organisatie onder zich", en: "{n} organization under it" },
  childrenCountMany: { nl: "{n} organisaties onder zich", en: "{n} organizations under it" },
  childrenTitle: { nl: "Organisaties onder zich", en: "Organizations under it" },
  keyHoldersLabel: { nl: "Aan het hoofd", en: "Led by" },
  holdersMore: { nl: "en {n} anderen", en: "and {n} more" },
  orgEmptyNote: {
    nl: "Voor deze organisatie zijn nog geen functionarissen, leden, verbindingen of nieuwsberichten vastgelegd. Wat de dataset wel heeft staat hierboven.",
    en: "No office holders, members, connections or news are recorded for this organization yet. What the dataset does hold is shown above.",
  },
  // Short explanations of jargon, shown under the label or the group title
  glossFillMethod: {
    nl: "Hoe de positie wordt vervuld.",
    en: "How the position is filled.",
  },
  glossEntryModes: {
    nl: "Hoe iemand de positie kan krijgen.",
    en: "How a person can get the position.",
  },
  glossDeptHead: {
    nl: "De leidende positie van het orgaan.",
    en: "The leading position of the body.",
  },
  glossExOfficio: {
    nl: "Posities die automatisch bij een andere functie horen.",
    en: "Positions that come automatically with another office.",
  },
  glossMainPosition: {
    nl: "De positie die aan het hoofd van de organisatie staat.",
    en: "The position that heads the organization.",
  },
  subtypeKoepel: { nl: "koepel", en: "umbrella body" },
  glossKoepel: {
    nl: "Overkoepelt gemeenten, provincies of waterschappen.",
    en: "Covers municipalities, provinces or water boards.",
  },

  // Party pages: the people linked to a party
  partyGroupBewind: { nl: "Bewindspersonen", en: "Cabinet members" },
  partyGroupFractie: { nl: "Fractievoorzitters", en: "Parliamentary group leaders" },
  partyGroupMayors: { nl: "Burgemeesters", en: "Mayors" },
  partyGroupBoards: { nl: "Bestuurders", en: "Regional and local officials" },
  partyGroupOthers: { nl: "Andere personen met deze partij", en: "Other people with this party" },
  partySeatsLine: {
    nl: "{tk} zetels in de Tweede Kamer, {ek} in de Eerste Kamer.",
    en: "{tk} seats in the Tweede Kamer, {ek} in the Eerste Kamer.",
  },
  partyPeopleNote: {
    nl: "Personen die de dataset aan deze partij koppelt (het veld partij van de persoon, met een bron per persoon). Voor de fractie bestaat nog geen eigen organisatiepagina.",
    en: "People the dataset links to this party (the party field of each person, with a source per person). The parliamentary group has no organization page of its own yet.",
  },
  partyNoPeople: {
    nl: "De dataset koppelt op dit snapshot geen personen aan deze partij.",
    en: "On this snapshot the dataset links no people to this party.",
  },

  // Position holders: what the data says when nobody is listed
  holdersNoneUnknown: {
    nl: "Op dit snapshot staat in de dataset geen houder van deze positie. Dat betekent niet dat de positie vacant is: de bronnen noemen er nog geen.",
    en: "On this snapshot the dataset lists no holder of this position. That does not mean the position is vacant: the sources name none yet.",
  },
  holdersNoneEnded: {
    nl: "Op dit snapshot geen huidige houder in de dataset. De laatste bekende periode eindigde op {date}.",
    en: "No current holder in the dataset on this snapshot. The last known period ended on {date}.",
  },
  holdersVacant: {
    nl: "Vacant volgens de bron:",
    en: "Vacant according to the source:",
  },
  holdersViaMembers: {
    nl: "De {n} huidige leden staan bij {body}, niet als apart ambt.",
    en: "The {n} current members are listed at {body}, not as a separate office.",
  },
  holdersViaMembersLink: { nl: "Bekijk de leden", en: "See the members" },
  descriptionDateNote: {
    nl: "Niet elke datum in deze beschrijving staat in de gegevens over functies en lidmaatschappen (bijvoorbeeld {dates}). Voor de periodes gelden de gegevens hieronder.",
    en: "Not every date in this description appears in the position and membership data (for example {dates}). The periods below are the data of record.",
  },
  personEmptyNote: {
    nl: "Voor deze persoon zijn nog geen functies of lidmaatschappen vastgelegd.",
    en: "No positions or memberships are recorded for this person yet.",
  },
  personNamedWith: {
    nl: "Dezelfde bron staat bij:",
    en: "The same source is cited for:",
  },
  moreHoldersThanSeats: {
    nl: "Meer houders dan zetels: de bron noemt meer huidige houders dan het aantal zetels dat hij opgeeft.",
    en: "More holders than seats: the source names more current holders than the number of seats it gives.",
  },

  // Portrait credit popover (the (i) on a person page)
  creditButton: { nl: "Foto-informatie: {credit}", en: "Photo information: {credit}" },
  creditHeading: { nl: "Foto-informatie", en: "Photo information" },
  creditAuthor: { nl: "Auteur", en: "Author" },
  creditAuthorUnknown: { nl: "niet vermeld", en: "not stated" },
  creditLicense: { nl: "Licentie", en: "Licence" },
  creditPublicDomain: { nl: "Publiek domein", en: "Public domain" },
  creditSource: { nl: "Bron", en: "Source" },
  creditRetrieved: { nl: "Opgehaald op", en: "Retrieved on" },
  creditChanges: { nl: "Wijzigingen", en: "Changes" },
  creditChangesText: { nl: "Verkleind en bijgesneden door Staatsgraaf", en: "Resized and cropped by Staatsgraaf" },
  creditShareAlike: {
    nl: "Deze verkleinde en bijgesneden versie wordt gedeeld onder dezelfde licentie, {license}.",
    en: "This resized and cropped version is shared under the same licence, {license}.",
  },
  creditShareAlikeLink: { nl: "Licentietekst", en: "Licence deed" },

  // Coat of arms or logo next to an organisation name (ADR 0029)
  emblemAlt: { nl: "Wapen van {name}", en: "Coat of arms of {name}" },
  emblemCreditButton: { nl: "Informatie over het wapen: {credit}", en: "Coat of arms information: {credit}" },
  emblemCreditHeading: { nl: "Informatie over het wapen", en: "Coat of arms information" },
  logoAlt: { nl: "Logo van {name}", en: "Logo of {name}" },
  logoCreditButton: { nl: "Informatie over het logo: {credit}", en: "Logo information: {credit}" },
  logoCreditHeading: { nl: "Informatie over het logo", en: "Logo information" },
  logoEmbedLicense: {
    nl: "Geen licentie: geladen van de website van de organisatie, niet door Staatsgraaf opgeslagen",
    en: "No licence: loaded from the organisation's website, not stored by Staatsgraaf",
  },
  logoReservedLicense: {
    nl: "Auteursrecht voorbehouden door de organisatie; daarom niet getoond",
    en: "Copyright reserved by the organisation, so not shown",
  },

  // Index lists (people, organisations, positions, topics): search, counts, empty states
  idxSearchPeople: { nl: "Zoek personen", en: "Search people" },
  idxSearchPeoplePlaceholder: { nl: "Naam, partij of functie", en: "Name, party or position" },
  idxSearchOrganizations: { nl: "Zoek organisaties", en: "Search organizations" },
  idxSearchOrganizationsPlaceholder: { nl: "Naam van een organisatie", en: "Name of an organization" },
  idxSearchPositions: { nl: "Zoek posities", en: "Search positions" },
  idxSearchPositionsPlaceholder: { nl: "Titel of organisatie", en: "Title or organization" },
  idxFilterLabel: { nl: "Filter op groep of partij", en: "Filter by group or party" },
  idxTypeFilterLabel: { nl: "Filter op type", en: "Filter by type" },
  idxAlphabet: { nl: "Alfabet", en: "Alphabet" },
  idxCountPeople: { nl: "{shown} van {total} personen", en: "{shown} of {total} people" },
  idxCountOrganizations: { nl: "{shown} van {total} organisaties", en: "{shown} of {total} organizations" },
  idxCountPositions: { nl: "{shown} van {total} posities", en: "{shown} of {total} positions" },
  idxNoPeople: { nl: "Geen personen gevonden", en: "No people found" },
  idxNoOrganizations: { nl: "Geen organisaties gevonden", en: "No organizations found" },
  idxNoPositions: { nl: "Geen posities gevonden", en: "No positions found" },
  idxNoResultsHelp: {
    nl: "Probeer een andere spelling, een kortere zoekterm of wis de filters.",
    en: "Try another spelling, a shorter search or clear the filters.",
  },
  idxClearFilters: { nl: "Wis filters", en: "Clear filters" },
  idxLoading: { nl: "Lijst laden", en: "Loading the list" },
  idxLoadFailed: {
    nl: "De volledige lijst kon niet worden geladen. De eerste items staan hierboven.",
    en: "The full list could not be loaded. The first items are shown above.",
  },
  idxRetry: { nl: "Opnieuw proberen", en: "Try again" },
  orgPartsCount: { nl: "{n} onderdelen", en: "{n} parts" },
  orgPartsOf: { nl: "onderdelen van {name}", en: "parts of {name}" },
  orgOverviewNational: { nl: "Landelijk", en: "National" },
  orgOverviewDecentral: { nl: "Decentraal", en: "Regional and local" },
  orgOverviewDistance: { nl: "Op afstand en Koninkrijk", en: "At arm's length and Kingdom" },
  orgLineStatenGeneraal: { nl: "Het parlement: Eerste en Tweede Kamer", en: "Parliament: the Senate and the House" },
  orgLineRegering: { nl: "Ministeries met hun diensten en inspecties", en: "Ministries with their agencies and inspectorates" },
  orgLineRechterlijkeMacht: { nl: "Rechtbanken, hoven en de Hoge Raad", en: "Courts and the Supreme Court" },
  orgLineHogeColleges: { nl: "Raad van State, Rekenkamer en ombudsman", en: "Council of State, Court of Audit and Ombudsman" },
  orgLineAdviescolleges: { nl: "Adviesraden, planbureaus en de Kiesraad", en: "Advisory councils, planning bureaus and the Electoral Council" },
  orgLineProvincies: { nl: "{n} provincies met staten en gedeputeerden", en: "{n} provinces with their councils and executives" },
  orgLineGemeenten: { nl: "{n} gemeenten met raad en college", en: "{n} municipalities with council and executive" },
  orgLineWaterschappen: { nl: "{n} waterschappen met hun bestuur", en: "{n} water authorities with their boards" },
  orgLineCaribischNederland: { nl: "Bonaire, Sint Eustatius en Saba", en: "Bonaire, Sint Eustatius and Saba" },
  orgLineZelfstandig: { nl: "Zbo's en rwt's op afstand van de ministeries", en: "Independent bodies at arm's length from the ministries" },
  orgLineKoninkrijk: { nl: "Aruba, Curaçao, Sint Maarten en het Koninkrijk", en: "Aruba, Curaçao, Sint Maarten and the Kingdom" },
  orgByProvincie: { nl: "Per provincie", en: "By province" },
  orgByMinisterie: { nl: "Per ministerie", en: "By ministry" },
  orgOtherLokaal: { nl: "Samenwerking tussen gemeenten", en: "Cooperation between municipalities" },
  orgOtherGroup: { nl: "Overige", en: "Other" },
  orgSubgroupCount: { nl: "{n} organisaties", en: "{n} organizations" },
  orgCloseSubgroup: { nl: "Sluit {name}", en: "Close {name}" },
  idxTopicsEmptyNext: { nl: "Bekijk de organisaties", en: "Browse the organizations" },
} as const satisfies Record<string, LocString>;

export type EntityDictKey = keyof typeof ENTITY_DICT;
