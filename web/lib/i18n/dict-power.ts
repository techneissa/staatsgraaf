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
} as const satisfies Record<string, LocString>;
