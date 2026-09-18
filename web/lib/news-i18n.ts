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
      "Recente nieuwsberichten over de Nederlandse rijksoverheid, per bron en per dag, met gekoppelde organisaties, personen en posities. Nederlandstalig en Engelstalig, zonder vertaling.",
    heading: "Nieuws",
    intro:
      "Deze sectie bundelt nieuwsberichten over de rijksoverheid uit Nederlandse en Engelstalige bronnen. Elk bericht toont de uitgever, het soort bron en de gekoppelde organisaties, personen en posities. Berichten worden niet vertaald: je leest ze in de taal waarin ze zijn gepubliceerd.",
    breadcrumbHome: "Home",
    otherLanguageHref: "/news/",
    otherLanguageLabel: "Lees in het Engels",
    languageTabsLabel: "Taal van de berichten",
    languageLabels: { nl: "Nederlands", en: "English" },
    noscript:
      "Filteren en het wisselen van taal vereisen JavaScript. Het archief per dag onderaan werkt zonder.",
    emptyByLanguage: {
      nl: {
        title: "Geen Nederlandstalige berichten in de dataset",
        description: "Er zijn nog geen Nederlandstalige berichten opgenomen.",
      },
      en: {
        title: "Geen Engelstalige berichten in de dataset",
        description:
          "Geen van de opgenomen bronnen publiceert in het Engels, dus dit tabblad is leeg. Berichten worden niet vertaald. Zodra een Engelstalige bron is opgenomen, verschijnen de berichten hier in de taal van de bron.",
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
    },
    backLabel: "Terug naar nieuws",
    hourConnector: "tot",
    dayHeadingPrefix: "Nieuws op",
    dayCountWordSingular: "bericht",
    dayCountWordPlural: "berichten",
    sourcesHeading: "Bronnen",
    sourcesIntro:
      "Elke uitgever in de nieuwsdataset, met het soort bron, de talen, het aantal berichten en de licenties die op de bronrecords staan.",
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
      "Recent news about the Dutch national government, by source and by day, linked to organizations, people and positions. Dutch and English, without translation.",
    heading: "News",
    intro:
      "This section collects news items about the Dutch national government from Dutch and English-language sources. Each item shows its publisher, its source kind and the linked organizations, people and positions. Items are not translated: you read them in the language they were published in.",
    breadcrumbHome: "Home",
    otherLanguageHref: "/nieuws/",
    otherLanguageLabel: "Read in Dutch",
    languageTabsLabel: "Language of the items",
    languageLabels: { nl: "Dutch", en: "English" },
    noscript:
      "Filtering and switching language require JavaScript. The day archive below works without it.",
    emptyByLanguage: {
      nl: {
        title: "No Dutch-language items in the dataset",
        description:
          "None of the included sources publishes in Dutch, so this tab is empty. Items are not translated. As soon as a Dutch-language source is included, its items appear here in the source language.",
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
    },
    backLabel: "Back to news",
    hourConnector: "to",
    dayHeadingPrefix: "News on",
    dayCountWordSingular: "item",
    dayCountWordPlural: "items",
    sourcesHeading: "Sources",
    sourcesIntro:
      "Every publisher in the news dataset, with its source kind, languages, item count and the licences recorded on its source records.",
    sourcesEmpty: "No news sources have been included yet.",
    sourcesTablePublisher: "Publisher",
    sourcesTableKind: "Kind",
    sourcesTableLanguages: "Languages",
    sourcesTableCount: "Items",
    sourcesTableLicense: "Licence",
    licenseNone: "No licence recorded",
  },
};
