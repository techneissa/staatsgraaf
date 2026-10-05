/**
 * Strings of the side panels and the workspace around the canvas
 * (components/panels). Entity names never pass through here: they are Dutch
 * and shown as they are in the data.
 */
export const PANELS_DICT = {
  // Workspace chrome.
  pageShow: { nl: "Paginakolom tonen", en: "Show the page column" },
  pageHide: { nl: "Paginakolom verbergen", en: "Hide the page column" },
  detailsShow: { nl: "Detailpaneel tonen", en: "Show the details panel" },
  detailsHide: { nl: "Detailpaneel verbergen", en: "Hide the details panel" },
  detailsResize: { nl: "Breedte van het detailpaneel", en: "Width of the details panel" },
  detailsWidthValue: { nl: "{n} pixels breed", en: "{n} pixels wide" },
  detailsLabel: { nl: "Details", en: "Details" },
  profileLabel: { nl: "Selectie", en: "Selection" },
  jumpToSelection: { nl: "Naar {name}", en: "Go to {name}" },

  // Header.
  back: { nl: "Terug naar {name}", en: "Back to {name}" },
  backPlain: { nl: "Terug", en: "Back" },
  close: { nl: "Sluiten", en: "Close" },
  openPage: { nl: "Pagina openen", en: "Open page" },
  readArticle: { nl: "Lees bij {publisher}", en: "Read at {publisher}" },
  loadError: { nl: "Deze gegevens konden niet worden geladen. Probeer het opnieuw of open de pagina.", en: "This data could not be loaded. Try again or open the page." },
  loading: { nl: "Gegevens laden", en: "Loading data" },

  // Kinds.
  kindPerson: { nl: "Persoon", en: "Person" },
  kindCluster: { nl: "Groep organen", en: "Group of bodies" },
  kindFractie: { nl: "Fractie in de {chamber}", en: "Party group in the {chamber}" },
  kindSector: { nl: "Sector", en: "Sector" },
  kindNews: { nl: "Nieuwsbericht", en: "News item" },
  kindTopic: { nl: "Onderwerp", en: "Topic" },
  kindOrganization: { nl: "Organisatie", en: "Organization" },

  // Organisation.
  parts: { nl: "Onderdelen", en: "Parts" },
  relations: { nl: "Verbindingen", en: "Connections" },
  relationIncoming: { nl: "{verb} dit orgaan", en: "{verb} this body" },
  pathToVoters: { nl: "Pad naar de kiesgerechtigden", en: "Path to the electorate" },
  keyPositions: { nl: "Sleutelposities", en: "Key positions" },
  actingRole: { nl: "waarnemend", en: "acting" },
  since: { nl: "sinds {date}", en: "since {date}" },
  factConnections: { nl: "Verbindingen", en: "Connections" },
  factParts: { nl: "Onderdelen", en: "Parts" },
  factPositions: { nl: "Posities", en: "Positions" },
  factMembers: { nl: "Leden", en: "Members" },
  factNews: { nl: "In het nieuws", en: "In the news" },
  retrieved: { nl: "opgehaald {date}", en: "retrieved {date}" },
  website: { nl: "Officiële website", en: "Official website" },
  showAll: { nl: "Alle {n} tonen", en: "Show all {n}" },
  showMore: { nl: "Meer tonen", en: "Show more" },
  showFewer: { nl: "Minder tonen", en: "Show fewer" },
  fracties: { nl: "Fracties", en: "Party groups" },
  seatsTotal: { nl: "{total} zetels, meerderheid bij {majority}", en: "{total} seats, majority at {majority}" },

  // Budget.
  budgetTitle: { nl: "Begroting {year}", en: "Budget {year}" },
  budgetSpending: { nl: "Uitgaven", en: "Spending" },
  budgetRevenue: { nl: "Ontvangsten", en: "Revenue" },
  budgetNet: { nl: "Uitgaven min ontvangsten", en: "Spending minus revenue" },
  budgetActual: { nl: "Uitgaven {year}, gerealiseerd", en: "Spending {year}, actual" },
  budgetOpen: { nl: "Hele begroting", en: "Full budget" },

  // Cluster and sector.
  groupMembers: { nl: "Organen in deze groep", en: "Bodies in this group" },
  groupUnder: { nl: "Onder {parent}", en: "Under {parent}" },
  sectorBodies: { nl: "{n} organen", en: "{n} bodies" },
  sectorLargest: { nl: "Meest verbonden organen", en: "Most connected bodies" },
  sectorGroups: { nl: "Groepen", en: "Groups" },

  // Fractie.
  seatsOf: { nl: "{n} van {total} zetels", en: "{n} of {total} seats" },
  fractieMembers: { nl: "Leden", en: "Members" },
  seatOrderNote: {
    nl: "De Kamer publiceert geen zetelindeling. De zetels van de fractie staan op achternaam.",
    en: "The chamber publishes no seating plan. The group's seats follow the members' surnames.",
  },
  otherChamber: { nl: "In de andere Kamer", en: "In the other chamber" },
  partyPage: { nl: "Partijpagina", en: "Party page" },
  partySite: { nl: "Website van de partij", en: "Party website" },
  programme: { nl: "Verkiezingsprogramma", en: "Election manifesto" },

  // Person.
  roles: { nl: "Functies", en: "Roles" },
  memberOf: { nl: "Lid van", en: "Member of" },
  seatIn: { nl: "Zetel voor {fractie} in de {chamber}", en: "Seat for {fractie} in the {chamber}" },
  party: { nl: "Partij", en: "Party" },
  namedWith: { nl: "Samen in het nieuws met", en: "In the news with" },
  mentions: { nl: "{n}× samen genoemd", en: "named together {n}×" },
  newsMentions: { nl: "{n} vermeldingen", en: "{n} mentions" },

  // News and topic.
  news: { nl: "In het nieuws", en: "In the news" },
  newsTotal: { nl: "{n} berichten", en: "{n} items" },
  named: { nl: "Genoemd", en: "Named" },
  machineTranslation: { nl: "Machinevertaling", en: "Machine translation" },
  responsible: { nl: "Verantwoordelijke organisaties", en: "Responsible organizations" },
  positions: { nl: "Posities", en: "Positions" },
  changes: { nl: "Recente wijzigingen", en: "Recent changes" },

  // Default view.
  defaultInTheNews: { nl: "Meest in het nieuws", en: "Most in the news" },
  defaultInTheNewsWindow: { nl: "Laatste {n} dagen", en: "Last {n} days" },
  defaultSectors: { nl: "Grootste sectoren", en: "Largest sectors" },
  defaultChanges: { nl: "Laatste wijzigingen", en: "Latest changes" },
} satisfies Record<string, { nl: string; en: string }>;

export type PanelsKey = keyof typeof PANELS_DICT;
