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
  noLegalSourceLabel: { nl: "Geen wettelijke grondslag opgenomen.", en: "No legal basis on record." },
  noWebsiteLabel: { nl: "Geen website opgenomen.", en: "No website on record." },
  noLegalBasisLabel: { nl: "Geen wettelijke basis opgenomen.", en: "No legal basis on record." },
  noDescriptionLabel: {
    nl: "Nog geen Nederlandse beschrijving met bron opgenomen in de dataset.",
    en: "No Dutch description with a source is in the dataset yet.",
  },

  // Fact grid labels
  factType: { nl: "Type", en: "Type" },
  factBranch: { nl: "Branche", en: "Branch" },
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
  seatTallyMajorityMarker: {
    nl: "Meerderheidsgrens: {n} zetels",
    en: "Majority threshold: {n} seats",
  },
  membersCountLine: {
    nl: "{n} leden met een lopend lidmaatschap in de dataset.",
    en: "{n} members with a current membership in the dataset.",
  },
  noOfficialsTitle: { nl: "Geen lopende functies of lidmaatschappen", en: "No current tenures or memberships" },
  noOfficialsNote: {
    nl: "Voor {name} is in de dataset nog geen lopende benoeming of lidmaatschap met bron opgenomen.",
    en: "No current appointment or membership with a source is in the dataset for {name} yet.",
  },
  partOfTitle: { nl: "Onderdeel van", en: "Part of" },
  partOfNone: {
    nl: "Geen bovenliggende organisatie met bron opgenomen.",
    en: "No parent organization with a source on record.",
  },
  historyTitle: { nl: "Functiegeschiedenis", en: "Office history" },
  historyNoneTitle: { nl: "Geen functiegeschiedenis", en: "No office history" },
  historyNoneNote: {
    nl: "Voor {name} zijn in de dataset nog geen benoemingen met datum en bron opgenomen.",
    en: "No appointments with a date and source are in the dataset for {name} yet.",
  },
  membersNoneNote: {
    nl: "Geen lopende leden met bron opgenomen in de dataset.",
    en: "No current members with a source are in the dataset.",
  },
  newsEmptyNote: {
    nl: "Er zijn nog geen nieuwsberichten met {name} opgenomen in de dataset.",
    en: "No news items mentioning {name} are in the dataset yet.",
  },

  // Person page sections
  rolesTitle: { nl: "Functies", en: "Positions" },
  personNoDescription: {
    nl: "Functies en bronnen van {name} op de kaart van de Nederlandse staat.",
    en: "Positions and sources for {name} on the map of the Dutch state.",
  },
  membershipMeta: { nl: "Lidmaatschap", en: "Membership" },
  membershipsTitle: { nl: "Lidmaatschappen", en: "Memberships" },
  noRoleTitle: { nl: "Geen gedateerde rol met bron", en: "No dated role with a source" },
  noRoleNote: {
    nl: "Voor {name} is in de dataset geen functie of lidmaatschap met een startdatum en bron opgenomen.",
    en: "No position or membership with a start date and source is in the dataset for {name}.",
  },
  inTheNewsTitle: { nl: "In het nieuws", en: "In the news" },
  imageCredit: { nl: "Beeld", en: "Image" },

  // Position page sections
  tenureHistoryTitle: { nl: "Bekleders door de tijd", en: "Holders over time" },
  exOfficioTitle: { nl: "Van rechtswege", en: "By virtue of office" },
  exOfficioNote: {
    nl: "De bekleder van deze positie zit of voorzit van rechtswege in de volgende organen.",
    en: "The holder of this position sits in or chairs the following bodies by virtue of office.",
  },
  vacanciesNote: {
    nl: "Een positie zonder bekleder is een vacature zodra de dataset dat bijhoudt.",
    en: "A position without a holder counts as a vacancy once the dataset tracks that.",
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
  noConnectionsNote: {
    nl: "In de dataset zijn voor dit onderdeel nog geen inkomende of uitgaande relaties met een bron opgenomen.",
    en: "No incoming or outgoing relations with a source are in the dataset for this entity yet.",
  },
  newsEmptyTitle: { nl: "Nog geen nieuws", en: "No news yet" },
  vacancyTitle: { nl: "Geen lopende bekleder", en: "No current holder" },
  vacancyNote: {
    nl: "Voor deze positie is in de dataset geen benoeming zonder einddatum met bron opgenomen. Een positie zonder bekleder is een vacature zodra de dataset dat bijhoudt.",
    en: "No appointment without an end date with a source is in the dataset for this position. A position without a holder counts as a vacancy once the dataset tracks that.",
  },
  noHoldersTitle: { nl: "Geen bekleders bekend", en: "No known holders" },
  noHoldersNote: {
    nl: "Voor deze positie is nog geen bekleder met bron opgenomen.",
    en: "No holder with a source is in the dataset for this position yet.",
  },

  // Listing pages
  orgIndexTitle: { nl: "Organisaties", en: "Organizations" },
  orgIndexIntro: {
    nl: "Alle {n} organisaties in de dataset, gegroepeerd naar staatsmacht. Elke organisatiepagina toont de positie in de staatsinrichting, de bijbehorende posities en de bronnen.",
    en: "All {n} organizations in the dataset, grouped by branch of state power. Each organization page shows the position in the state structure, the related positions, and the sources.",
  },
  groupNavLabel: { nl: "Groepen", en: "Groups" },
  peopleIndexTitle: { nl: "Personen", en: "People" },
  peopleIndexIntro: {
    nl: "Alle {n} personen in de dataset, alfabetisch. Van {withPortrait} personen is een gelicentieerd portret opgenomen; de overige tonen initialen. Elke functie op een persoonspagina heeft een bron.",
    en: "All {n} people in the dataset, alphabetically. {withPortrait} people have a licensed portrait on record; the others show initials. Every position on a person page has a source.",
  },
  alphabetNavLabel: { nl: "Alfabet", en: "Alphabet" },
  positionsIndexTitle: { nl: "Posities", en: "Positions" },
  positionsIndexIntro: {
    nl: "Alle {n} posities in de dataset, gegroepeerd naar type. Elke positiepagina toont de wettelijke basis, de vulwijze en de reeks bekleders met een bron.",
    en: "All {n} positions in the dataset, grouped by type. Each position page shows the legal basis, the filling method, and the list of holders with a source.",
  },

  // Badges and fallback names
  actingBadge: { nl: "Waarnemend", en: "Acting" },
  employeesShort: { nl: "{n} medewerkers", en: "{n} employees" },
  seatNumber: { nl: "Zetel {n}", en: "Seat {n}" },
  unknownOrganization: { nl: "Onbekende organisatie", en: "Unknown organization" },
  unknownPerson: { nl: "Onbekende persoon", en: "Unknown person" },
  unknownPosition: { nl: "Onbekende positie", en: "Unknown position" },
  personPortraitAlt: { nl: "Portret van {name}", en: "Portrait of {name}" },
} as const satisfies Record<string, LocString>;

export type EntityDictKey = keyof typeof ENTITY_DICT;
