import type { LocString } from "./locales";

/** Owned by the power map area. Extend with power-map-specific strings only. */
export const POWER_DICT = {
  powerMapTitle: { nl: "Machtskaart: wie is in het nieuws", en: "Power map: who is in the news" },
  powerMapAria: {
    nl: "Machtskaart met de personen die het meest in het nieuws zijn, verbonden door de machtsas.",
    en: "Power map of the people most in the news, linked to the power hub.",
  },
  powerMapAriaEntity: {
    nl: "Machtskaart van de mensen rond dit onderwerp, verbonden door de machtsas.",
    en: "Power map of the people around this part of the state, linked to the power axis.",
  },
  powerMapSubtitle: {
    nl: "De {people} mensen die het meest genoemd zijn in {articles}, uit {sources} bronnen, in de laatste {days} dagen.",
    en: "The {people} people named most often in {articles} across {sources} outlets, in the last {days} days.",
  },
  powerMapSubtitleNoSources: {
    nl: "De {people} mensen die het meest genoemd zijn in {articles} in de laatste {days} dagen.",
    en: "The {people} people named most often in {articles} in the last {days} days.",
  },
  powerMapEntitySubtitle: {
    nl: "{n} mensen, op volgorde van hoe vaak ze in het nieuws zijn.",
    en: "{n} people, ordered by how often they are in the news.",
  },
  powerMapCenterLabel: { nl: "Kiesgerechtigden Nederland", en: "Dutch electorate" },
  powerMapEntityCentreLabel: { nl: "Wie is verbonden?", en: "Who is connected?" },
  powerMapOpenPerson: { nl: "Open personenpagina", en: "Open person page" },
  powerMapOpenPersonName: {
    nl: "Open de personenpagina van {name}",
    en: "Open the person page of {name}",
  },
  powerMapArticle1: { nl: "1 artikel", en: "1 article" },
  powerMapEmptyTitle: { nl: "Nog geen machtskaart", en: "No power map yet" },
  powerMapEmptyBody: {
    nl: "De machtskaart rangschikt mensen naar hoe vaak zij in het nieuws voorkomen. Er zijn nog geen nieuwsartikelen aan de dataset toegevoegd, dus er valt nog geen rangschikking te tonen. We verzinnen er geen.",
    en: "The power map ranks people by how often they appear in the news. No news articles have been added to the dataset yet, so there is no ranking to show. Nothing is invented.",
  },
  powerMapEmptyWindow: {
    nl: "Venster: {days}, {articles}{since}.",
    en: "Window: {days}, {articles}{since}.",
  },
  powerMapEmptySince: { nl: " vanaf {since}", en: " from {since}" },
  powerMapLastItem: { nl: "Laatste bericht op {date}.", en: "Last item on {date}." },
  powerMapCentreSubtitle: {
    nl: "Bron van alle openbare macht",
    en: "The source of all public power",
  },
  powerMapEntityCentreSubtitle: {
    nl: "{n} mensen in het nieuws",
    en: "{n} people in the news",
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
  powerWholeMap: { nl: "Hele kaart", en: "Whole map" },
  powerFocusAria: {
    nl: "Machtskaart rond {name}, met de verbanden uit nieuws, fracties, kabinet en functies.",
    en: "Power map around {name}, with the ties from news, fracties, cabinet and positions.",
  },
  powerFocusSubtitle: { nl: "{n} verbanden", en: "{n} ties" },
  powerFocusSubtitle1: { nl: "1 verband", en: "1 tie" },
  powerFocusEmpty: {
    nl: "Geen verbanden in de gegevens van de machtskaart.",
    en: "No ties in the power map data.",
  },
  reasonNews1: { nl: "1 bericht samen", en: "1 news item together" },
  reasonNews: { nl: "{n} berichten samen", en: "{n} news items together" },
  reasonTenure: { nl: "Functie", en: "Position" },
  reasonKabinet: { nl: "Kabinet", en: "Cabinet" },
  reasonFractie: { nl: "Fractie {fractie}", en: "Fractie {fractie}" },
  reasonOrganisation: { nl: "Zelfde orgaan", en: "Same body" },
  reasonOrganisations: { nl: "{n} gedeelde organen", en: "{n} shared bodies" },
  newsBubble: { nl: "{title}. {publisher}, {date}.", en: "{title}. {publisher}, {date}." },
  newsMentions: { nl: "Genoemd: {names}", en: "Named: {names}" },
} as const satisfies Record<string, LocString>;
