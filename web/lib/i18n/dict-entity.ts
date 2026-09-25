import type { LocString } from "./locales";

/** Owned by the entity pages area (organizations, people, positions). */
export const ENTITY_DICT = {
  // Tab labels
  tabNews: { nl: "Nieuws", en: "News" },
  whosConnected: { nl: "Wie is verbonden?", en: "Who is connected?" },
  panelLabel: { nl: "Panelen", en: "Panels" },
  sourceLabel: { nl: "Bron", en: "Source" },

  // Header block
  legalSourceLabel: { nl: "Wettelijke grondslag", en: "Legal basis" },
  legalBasisLabel: { nl: "Wettelijke basis", en: "Legal basis" },
  websiteLabel: { nl: "Officiële website", en: "Official website" },

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
} as const satisfies Record<string, LocString>;

export type EntityDictKey = keyof typeof ENTITY_DICT;
