import type { RecencyGroupKey } from "./news-meta";
import type { NewsLanguage, PublisherKind } from "./types";

/**
 * UI strings for the bilingual news section, one set per interface language.
 * Plain and serialisable on purpose: server components pass a whole set to the
 * client explorer, so it must contain no functions.
 */
export type NewsMessages = {
  /** The interface language this set belongs to. */
  locale: NewsLanguage;
  metaTitle: string;
  metaDescription: string;
  heading: string;
  intro: string;
  breadcrumbHome: string;
  /** Link to the same section in the other interface language. */
  otherLanguageHref: string;
  otherLanguageLabel: string;
  languageTabsLabel: string;
  /** Filter option that shows items in every original language. */
  allLanguagesLabel: string;
  /** Filter options by original language: "Dutch outlets", "English outlets". */
  languageFilterLabels: Record<NewsLanguage, string>;
  entityFilterLabel: string;
  entityFilterClear: string;
  entityFilterNote: string;
  entityFilterEmpty: string;
  filtersLabel: string;
  languageLabels: Record<NewsLanguage, string>;
  noscript: string;
  emptyByLanguage: Record<NewsLanguage, { title: string; description: string }>;
  kindFilterLabel: string;
  allKindsLabel: string;
  /** Plural labels for filters and the sources page. */
  kindLabels: Record<PublisherKind, string>;
  /** Singular labels for the badge on one item. */
  kindBadges: Record<PublisherKind, string>;
  publisherSelectLabel: string;
  allPublishersLabel: string;
  groupLabels: Record<RecencyGroupKey, string>;
  itemsWordSingular: string;
  itemsWordPlural: string;
  ofWord: string;
  truncatedIntro: string;
  allPerDay: string;
  noItemsLabel: string;
  noItemsFilterLabel: string;
  showMoreLabel: string;
  showLessLabel: string;
  card: {
    mentionedInLabel: string;
    entityKindLabels: Record<"person" | "organization" | "position" | "topic", string>;
    sourceLabel: string;
    linkedOnLabel: string;
    opensNewTab: string;
    /** Precedes the credit line of the preview image. */
    imageCreditLabel: string;
    /** Short label before the inline list of mentioned entities. */
    mentionedShort: string;
    /** Quiet label on a machine-translated card, keyed by the original language. */
    translatedFrom: Record<NewsLanguage, string>;
    translatedTitle: string;
    /** One line above the feed saying items in another language are machine translated. */
    translationNote: string;
    showOriginal: string;
    showTranslation: string;
    /** Tag on an item shown in its original language, keyed by that language. */
    originalLanguageTag: Record<NewsLanguage, string>;
    originalLanguageTitle: Record<NewsLanguage, string>;
    sourceLinkTitle: string;
  };
  backLabel: string;
  /** Sits between the start and end of an hour range, for example "09:00 tot 09:59". */
  hourConnector: string;
  dayHeadingPrefix: string;
  dayCountWordSingular: string;
  dayCountWordPlural: string;
  sourcesHeading: string;
  sourcesIntro: string;
  sourcesEmpty: string;
  sourcesTablePublisher: string;
  sourcesTableKind: string;
  sourcesTableLanguages: string;
  sourcesTableCount: string;
  sourcesTableLicense: string;
  licenseNone: string;
};

export const NEWS_MESSAGES: Record<NewsLanguage, NewsMessages> = {
  nl: {
    locale: "nl",
    metaTitle: "Nieuws",
    metaDescription:
      "Recente nieuwsberichten over de Nederlandse overheid, per bron en per dag, met gekoppelde organisaties, personen en posities. Engelstalige berichten zijn machinaal vertaald, het origineel staat er altijd bij.",
    heading: "Nieuws",
    intro:
      "Nieuws over de overheid uit Nederlandse en Engelstalige bronnen.",
    breadcrumbHome: "Home",
    otherLanguageHref: "/news/",
    otherLanguageLabel: "Lees in het Engels",
    languageTabsLabel: "Oorspronkelijke taal",
    allLanguagesLabel: "Alle talen",
    languageFilterLabels: { nl: "Nederlandstalig", en: "Engelstalig" },
    entityFilterLabel: "Gefilterd op",
    entityFilterClear: "Filter wissen",
    entityFilterNote: "Alleen de recent geladen berichten worden doorzocht. Alle berichten staan op de pagina van",
    entityFilterEmpty: "Geen van de recent geladen berichten noemt deze vermelding.",
    filtersLabel: "Filters",
    languageLabels: { nl: "Nederlands", en: "English" },
    noscript:
      "Filteren, het wisselen van taal en het tonen van al het nieuws vereisen JavaScript. Zonder JavaScript zie je de berichten die de overheid noemen.",
    emptyByLanguage: {
      nl: {
        title: "Geen Nederlandstalige berichten in de dataset",
        description: "Er zijn nog geen Nederlandstalige berichten opgenomen.",
      },
      en: {
        title: "Geen Engelstalige berichten in de dataset",
        description:
          "Geen van de opgenomen bronnen publiceert in het Engels. Kies Alle talen om alle berichten te zien.",
      },
    },
    kindFilterLabel: "Filter op soort bron",
    allKindsLabel: "Alle soorten",
    kindLabels: {
      "publieke-omroep": "Publieke omroep",
      krant: "Kranten",
      "commerciele-omroep": "Commerciële omroepen",
      online: "Online",
      video: "Video",
      nieuwsbrief: "Nieuwsbrieven",
      blog: "Blogs",
      vakmedia: "Vakmedia",
      overheid: "Overheid",
    },
    kindBadges: {
      "publieke-omroep": "Publieke omroep",
      krant: "Krant",
      "commerciele-omroep": "Commerciële omroep",
      online: "Online",
      video: "Video",
      nieuwsbrief: "Nieuwsbrief",
      blog: "Blog",
      vakmedia: "Vakmedia",
      overheid: "Overheid",
    },
    publisherSelectLabel: "Bron",
    allPublishersLabel: "Alle bronnen",
    groupLabels: {
      hour: "Afgelopen uur",
      today: "Vandaag",
      yesterday: "Gisteren",
      week: "Deze week",
      earlier: "Eerder",
    },
    itemsWordSingular: "bericht",
    itemsWordPlural: "berichten",
    ofWord: "van",
    truncatedIntro: "Hier staan de meest recente",
    allPerDay: "Alles per dag:",
    noItemsLabel: "Geen berichten in deze periode.",
    noItemsFilterLabel: "Geen berichten met dit filter in deze periode.",
    showMoreLabel: "Toon meer",
    showLessLabel: "Toon minder",
    card: {
      mentionedInLabel: "Genoemd in dit bericht",
      entityKindLabels: {
        person: "persoon",
        organization: "organisatie",
        position: "positie",
        topic: "onderwerp",
      },
      sourceLabel: "Bron:",
      linkedOnLabel: "Gekoppeld op:",
      opensNewTab: "(opent in een nieuw tabblad)",
      imageCreditLabel: "Beeld:",
      mentionedShort: "Genoemd",
      translatedFrom: { nl: "Vertaald uit het Nederlands", en: "Vertaald uit het Engels" },
      translatedTitle: "Machinevertaling door een taalmodel. Lees hoe dit werkt op de pagina Over.",
      translationNote: "Anderstalige berichten zijn automatisch vertaald.",
      showOriginal: "Toon origineel",
      showTranslation: "Toon vertaling",
      originalLanguageTag: { nl: "Nederlands", en: "Engels" },
      originalLanguageTitle: {
        nl: "Dit bericht is in het Nederlands gepubliceerd.",
        en: "Dit bericht is in het Engels gepubliceerd en nog niet vertaald.",
      },
      sourceLinkTitle: "Lees het originele bericht bij de uitgever",
    },
    backLabel: "Terug naar nieuws",
    hourConnector: "tot",
    dayHeadingPrefix: "Nieuws op",
    dayCountWordSingular: "bericht",
    dayCountWordPlural: "berichten",
    sourcesHeading: "Bronnen",
    sourcesIntro:
      "De uitgevers in de nieuwsdataset, met hun licenties.",
    sourcesEmpty: "Er zijn nog geen nieuwsbronnen opgenomen.",
    sourcesTablePublisher: "Uitgever",
    sourcesTableKind: "Soort",
    sourcesTableLanguages: "Talen",
    sourcesTableCount: "Aantal berichten",
    sourcesTableLicense: "Licentie",
    licenseNone: "Geen licentie vastgelegd",
  },
  en: {
    locale: "en",
    metaTitle: "News",
    metaDescription:
      "Recent news about the Dutch government, by source and by day, linked to organizations, people and positions. Dutch items are machine translated into English, with the original always one click away.",
    heading: "News",
    intro:
      "News about the Dutch government from Dutch and English-language outlets.",
    breadcrumbHome: "Home",
    otherLanguageHref: "/nieuws/",
    otherLanguageLabel: "Read in Dutch",
    languageTabsLabel: "Original language",
    allLanguagesLabel: "All languages",
    languageFilterLabels: { nl: "Published in Dutch", en: "Published in English" },
    entityFilterLabel: "Filtered on",
    entityFilterClear: "Clear filter",
    entityFilterNote: "Only the recently loaded items are searched. Every item is on the page of",
    entityFilterEmpty: "None of the recently loaded items mention it.",
    filtersLabel: "Filters",
    languageLabels: { nl: "Dutch", en: "English" },
    noscript:
      "Filtering, switching language and showing all news require JavaScript. Without it you see the items that mention the government.",
    emptyByLanguage: {
      nl: {
        title: "No Dutch-language items in the dataset",
        description:
          "None of the included sources publishes in Dutch. Choose All languages to see every item.",
      },
      en: {
        title: "No English-language items in the dataset",
        description: "No English-language items have been included yet.",
      },
    },
    kindFilterLabel: "Filter by source kind",
    allKindsLabel: "All kinds",
    kindLabels: {
      "publieke-omroep": "Public broadcasters",
      krant: "Newspapers",
      "commerciele-omroep": "Commercial broadcasters",
      online: "Online",
      video: "Video",
      nieuwsbrief: "Newsletters",
      blog: "Blogs",
      vakmedia: "Trade press",
      overheid: "Government",
    },
    kindBadges: {
      "publieke-omroep": "Public broadcaster",
      krant: "Newspaper",
      "commerciele-omroep": "Commercial broadcaster",
      online: "Online",
      video: "Video",
      nieuwsbrief: "Newsletter",
      blog: "Blog",
      vakmedia: "Trade press",
      overheid: "Government",
    },
    publisherSelectLabel: "Source",
    allPublishersLabel: "All sources",
    groupLabels: {
      hour: "Last hour",
      today: "Today",
      yesterday: "Yesterday",
      week: "This week",
      earlier: "Earlier",
    },
    itemsWordSingular: "item",
    itemsWordPlural: "items",
    ofWord: "of",
    truncatedIntro: "Showing the most recent",
    allPerDay: "Everything by day:",
    noItemsLabel: "No items in this period.",
    noItemsFilterLabel: "No items match this filter in this period.",
    showMoreLabel: "Show more",
    showLessLabel: "Show less",
    card: {
      mentionedInLabel: "Mentioned in this item",
      entityKindLabels: {
        person: "person",
        organization: "organization",
        position: "position",
        topic: "topic",
      },
      sourceLabel: "Source:",
      linkedOnLabel: "Linked on:",
      opensNewTab: "(opens in a new tab)",
      imageCreditLabel: "Image:",
      mentionedShort: "Mentioned",
      translatedFrom: { nl: "Translated from Dutch", en: "Translated from English" },
      translatedTitle: "Machine translation by a language model. Read how this works on the About page.",
      translationNote: "Items in another language are machine translated.",
      showOriginal: "Show original",
      showTranslation: "Show translation",
      originalLanguageTag: { nl: "Dutch", en: "English" },
      originalLanguageTitle: {
        nl: "This item was published in Dutch and has not been translated yet.",
        en: "This item was published in English.",
      },
      sourceLinkTitle: "Read the original article at the publisher",
    },
    backLabel: "Back to news",
    hourConnector: "to",
    dayHeadingPrefix: "News on",
    dayCountWordSingular: "item",
    dayCountWordPlural: "items",
    sourcesHeading: "Sources",
    sourcesIntro:
      "The publishers in the news dataset, with their licences.",
    sourcesEmpty: "No news sources have been included yet.",
    sourcesTablePublisher: "Publisher",
    sourcesTableKind: "Kind",
    sourcesTableLanguages: "Languages",
    sourcesTableCount: "Items",
    sourcesTableLicense: "Licence",
    licenseNone: "No licence recorded",
  },
};

/**
 * Labels for the fixed licence values of the feed configuration
 * (pipelines/feeds.json). Unknown values render as recorded.
 */
const LICENSE_LABELS: Record<string, Record<NewsLanguage, string>> = {
  "all-rights-reserved": { nl: "Alle rechten voorbehouden", en: "All rights reserved" },
  "Koppen en deep links; geen overname van artikeltekst of beeld.": {
    nl: "Koppen en deep links; geen overname van artikeltekst of beeld.",
    en: "Headlines and deep links; no reuse of article text or images.",
  },
};

export function licenseLabel(value: string, locale: NewsLanguage): string {
  return LICENSE_LABELS[value]?.[locale] ?? value;
}
