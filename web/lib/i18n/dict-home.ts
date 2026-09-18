import type { LocString } from "./locales";

/** Owned by the home page area. Extend with home-specific strings only. */
export const HOME_DICT = {
  homeTitle: {
    nl: "De Nederlandse rijksoverheid in kaart",
    en: "The Dutch national government, mapped",
  },
  newsSection: { nl: "Laatste nieuws", en: "Latest news" },
  newsSectionEyebrow: { nl: "In het nieuws", en: "In the news" },
  newsReadMore: { nl: "Lees verder", en: "Read more" },
  newsMentioned: { nl: "Genoemd in dit bericht", en: "Mentioned in this item" },
  peopleSection: { nl: "Wie in het nieuws", en: "Who is in the news" },
  peopleIntro: {
    nl: "De meest genoemde personen in de nieuwsberichten van de laatste periode.",
    en: "The people most mentioned in recent news coverage.",
  },
  peopleIntroFallback: {
    nl: "Nog geen nieuwsanalyse beschikbaar. Hieronder staan mensen met een lopende functie in de dataset, op volgorde van functie.",
    en: "No news analysis yet. Shown instead are people with an active tenure in the dataset, ordered by position.",
  },
  peopleEmpty: {
    nl: "Nog geen personen met een lopende functie.",
    en: "No people with an active tenure yet.",
  },
  changesSection: { nl: "Laatste wijzigingen", en: "Latest changes" },
  changesEyebrow: { nl: "Wijzigingen", en: "Changes" },
  changesIntro: {
    nl: "De wijzigingenfeed wordt gevuld door de dagelijkse vergelijking van de dataset met de vorige versie. Aanstellingen, vertrekken en structuurwijzigingen verschijnen hier met een bron per wijziging.",
    en: "This feed is filled by the daily comparison of the dataset with the previous version. Appointments, departures and structural changes appear here with one source per change.",
  },
  windowTabsLabel: { nl: "Wijzigingsperiode", en: "Change period" },
  timelineLabel: { nl: "Tijdlijn", en: "Timeline" },
  timelineCaption: {
    nl: "Histogram met het aantal wijzigingen per dag over de laatste {days} dagen.",
    en: "Histogram of the number of changes per day over the last {days} days.",
  },
  timelineToday: { nl: "vandaag", en: "today" },
  timelineDaysAgo: { nl: "{n}d geleden", en: "{n}d ago" },
  changesInWindow: {
    nl: "{n} wijzigingen in dit venster",
    en: "{n} changes in this window",
  },
  noChangesYet: { nl: "Nog geen wijzigingen", en: "No changes yet" },
  noChangesYetBody: {
    nl: "De wijzigingenfeed is nog niet gevuld. Zodra de vergelijking met een eerdere datasetversie draait, verschijnen aanstellingen, vertrekken en structuurwijzigingen hier per dag met bron.",
    en: "The change feed is not filled yet. Once the comparison with an earlier dataset version runs, appointments, departures and structural changes appear here per day with source.",
  },
  noChangesInWindow: {
    nl: "Geen wijzigingen in dit venster",
    en: "No changes in this window",
  },
  noChangesInWindowBody: {
    nl: "In deze periode is geen aanstelling, vertrek of structuurwijziging vastgelegd.",
    en: "No appointment, departure or structural change was recorded in this period.",
  },
  statVacantLabel: { nl: "Vacante zetels", en: "Seats vacant" },
  statVacantSub: {
    nl: "geen huidige bekleder",
    en: "no current office holder",
  },
  statVacantUnknownSub: {
    nl: "nog geen vacaturegegevens",
    en: "no vacancy data yet",
  },
  statActingLabel: { nl: "Waarnemende officials", en: "Acting officials" },
  statActingSub: {
    nl: "waarnemend, niet benoemd",
    en: "acting, not appointed",
  },
  statLastChangeLabel: { nl: "Laatste wijziging", en: "Last change" },
  statLastChangeNone: { nl: "nog geen wijzigingen", en: "no changes yet" },
  statLastChangeToday: { nl: "vandaag", en: "today" },
  statLastChangeAgoSub: { nl: "d geleden, op {date}", en: "d ago, on {date}" },
  dayToday: { nl: "Vandaag", en: "Today" },
  dayYesterday: { nl: "Gisteren", en: "Yesterday" },
  outLabel: { nl: "Weg", en: "Out" },
  inLabel: { nl: "In", en: "In" },
  seatsLabel: { nl: "Zetel", en: "Seat" },
  overviewSection: { nl: "Overzicht", en: "Overview" },
  overviewIntro: {
    nl: "Tellingen op het hoogste niveau voor het Rijk.",
    en: "Top-level counts for the national government.",
  },
  overviewByType: { nl: "Naar type", en: "By type" },
  overviewByBranch: { nl: "Naar branche", en: "By branch" },
  overviewTotal: { nl: "Organisaties", en: "Organizations" },
  overviewSubtotal: {
    nl: "{n} suborganisaties",
    en: "{n} sub-organizations",
  },
  overviewTotalSub: {
    nl: "{n} suborganisaties",
    en: "including {n} sub-organizations",
  },
  aboutSection: { nl: "Over deze kaart", en: "About this map" },
  aboutIntro: {
    nl: "Deze kaart brengt de Nederlandse rijksoverheid in kaart als een open, bronvaste grafiek van organisaties, posities, personen en hun onderlinge relaties. Elk gegeven verwijst naar de bron waar het vandaan komt, met een ophaaldatum.",
    en: "This map charts the Dutch national government as an open, source-backed graph of organizations, positions, people and their relationships. Every fact points to the source it comes from, with a retrieval date.",
  },
  methodologyLink: { nl: "Methodiek en verantwoording", en: "Methodology" },
  privacyLink: { nl: "Privacy", en: "Privacy" },
  accessibilityLink: { nl: "Toegankelijkheid", en: "Accessibility" },
} as const satisfies Record<string, LocString>;

export type HomeKey = keyof typeof HOME_DICT;
