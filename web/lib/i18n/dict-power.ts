import type { LocString } from "./locales";

/**
 * Owned by the connections view (Verbanden; internal id `power`) and the
 * seat loupe. Extend with strings for those two only.
 */
export const POWER_DICT = {
  viewName: { nl: "Verbanden", en: "Connections" },
  overviewAria: {
    nl: "Verbanden: de mensen met de sterkste verbanden, per rol.",
    en: "Connections: the people with the strongest ties, by role.",
  },
  focusAria: {
    nl: "Verbanden van {name}, per soort: functie, kabinet, partij en nieuws.",
    en: "Connections of {name}, by kind: office, cabinet, party and news.",
  },
  newsFocusAria: { nl: "Wie in dit bericht genoemd wordt", en: "Who this news item names" },
  roleCabinet: { nl: "Kabinet", en: "Cabinet" },
  roleParliament: { nl: "Kamerleden", en: "Members of parliament" },
  roleOther: { nl: "Overig", en: "Other" },
  kindOffice: { nl: "Functie en organen", en: "Office and bodies" },
  kindCabinet: { nl: "Kabinet", en: "Cabinet" },
  kindParty: { nl: "Partij en fractie", en: "Party and faction" },
  kindNews: { nl: "Samen in het nieuws", en: "Together in the news" },
  tieCount: { nl: "{n} verbanden", en: "{n} ties" },
  tieCount1: { nl: "1 verband", en: "1 tie" },
  moreCount: { nl: "+{n}", en: "+{n}" },
  showAll: { nl: "Alle {n} tonen", en: "Show all {n}" },
  showFewer: { nl: "Minder tonen", en: "Show fewer" },
  strength: { nl: "Sterkte {level} van 5", en: "Strength {level} of 5" },
  noTies: { nl: "Geen verbanden in de gegevens.", en: "No ties in the data." },
  inNews: { nl: "In het nieuws", en: "In the news" },
  newsCount: { nl: "{n} berichten", en: "{n} news items" },
  openArticle: { nl: "Artikel bij {publisher}", en: "Article at {publisher}" },
  openProfile: { nl: "Profiel", en: "Profile" },
  openProfileOf: { nl: "Profiel van {name}", en: "Profile of {name}" },
  overview: { nl: "Overzicht", en: "Overview" },
  sourceNote: {
    nl: "Bronnen: {outlets} nieuwsmedia, {since} tot {until}; functies, fracties en kabinet uit de dataset.",
    en: "Sources: {outlets} news outlets, {since} to {until}; offices, factions and cabinet from the dataset.",
  },
  sourceNoteNoNews: {
    nl: "Bronnen: functies, fracties en kabinet uit de dataset.",
    en: "Sources: offices, factions and cabinet from the dataset.",
  },
  fractieSeats: { nl: "Fractie {label}, {chamber}", en: "Faction {label}, {chamber}" },
  emptyTitle: { nl: "Nog geen verbanden", en: "No connections yet" },
  emptyBody: {
    nl: "Er zijn nog geen verbanden uit functies, fracties of nieuws berekend.",
    en: "No ties from offices, factions or news have been computed yet.",
  },
  seatLoupeLabel: { nl: "Zetels van {label} in de {chamber}", en: "Seats of {label} in the {chamber}" },
  seatLoupeSeats: { nl: "{n} van {total} zetels, {chamber}", en: "{n} of {total} seats, {chamber}" },
  seatLoupeClose: { nl: "Zetels sluiten", en: "Close seats" },
  seatOrderNote: {
    nl: "Leden staan op achternaam. De Kamer publiceert geen zetel per lid.",
    en: "Members are in surname order. The chamber publishes no seat per member.",
  },
  powerBack: { nl: "Terug", en: "Back" },
  powerBackTo: { nl: "Terug naar {name}", en: "Back to {name}" },
  reasonNews1: { nl: "1 bericht samen", en: "1 news item together" },
  reasonNews: { nl: "{n} berichten samen", en: "{n} news items together" },
  reasonTenure: { nl: "Functie", en: "Position" },
  reasonKabinet: { nl: "Kabinet", en: "Cabinet" },
  reasonFractie: { nl: "Fractie {fractie}", en: "Faction {fractie}" },
  reasonOrganisation: { nl: "Zelfde orgaan", en: "Same body" },
  reasonOrganisations: { nl: "{n} gedeelde organen", en: "{n} shared bodies" },
  newsItemLabel: { nl: "{title}. {publisher}, {date}.", en: "{title}. {publisher}, {date}." },
} as const satisfies Record<string, LocString>;
