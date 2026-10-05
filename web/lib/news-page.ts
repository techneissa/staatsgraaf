import type { Metadata } from "next";
import { toNewsItemView, type NewsItemView } from "@/components/news/news-view";
import type { NewsExplorerGroup, NewsExplorerRow } from "@/components/news/news-explorer";
import {
  byDayGroups,
  byHour,
  byLanguage,
  getAllNews,
  getNewsDays,
  getNewsForDay,
  getNewsReference,
  isRelevantNews,
  NEWS_GROUP_INITIAL,
  NEWS_OTHER_CARD_LIMIT,
  newsDayKey,
  newsDays,
  newsKind,
  recencyGroupDetail,
  relevanceCounts,
} from "@/lib/news";
import { getDatasetDate } from "@/lib/data";
import { languageTwin } from "@/lib/language-routes";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { pageMetadata } from "@/lib/site";
import { newsTranslationFor } from "@/lib/news-translations";
import type { NewsItem, NewsLanguage } from "@/lib/types";

const dayLabelFormats: Record<NewsLanguage, Intl.DateTimeFormat> = {
  nl: new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  }),
  en: new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  }),
};

/** A calendar day (yyyy-mm-dd, Nederland) as dd-mm-yyyy in Dutch or dd/mm/yyyy in English. */
export function formatNewsDayLabel(date: string, locale: NewsLanguage): string {
  return dayLabelFormats[locale].format(new Date(`${date}T12:00:00Z`));
}

export function getNewsItemViews(items: NewsItem[], locale: NewsLanguage): NewsItemView[] {
  return items.map((item) => toNewsItemView(item, locale));
}

/**
 * One language bucket of a group. The explorer shows relevant items by default and
 * everything behind a toggle. Every relevant item is carried as a card, so filters on
 * the default view are complete. Of the other items the newest `NEWS_OTHER_CARD_LIMIT` are
 * cards and the rest are kept as compact [kind, outlet] rows, so counts and filters
 * stay complete in "show all" without shipping thousands of cards.
 */
function languageBucket(items: NewsItem[], lang: NewsLanguage, locale: NewsLanguage) {
  const forLang = byLanguage(items, lang);
  const { total, relevant } = relevanceCounts(forLang);
  const others = forLang.filter((item) => !isRelevantNews(item));
  // Items in the other interface language that have a valid machine translation (NW-12).
  const translatedItems = forLang.filter((item) => newsTranslationFor(item, locale) !== null);
  const carried = [...forLang.filter(isRelevantNews), ...others.slice(0, NEWS_OTHER_CARD_LIMIT)].sort(
    (a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id),
  );
  return {
    total,
    relevantTotal: relevant,
    translated: translatedItems.length,
    relevantTranslated: translatedItems.filter(isRelevantNews).length,
    items: getNewsItemViews(carried, locale),
    unloaded: others.slice(NEWS_OTHER_CARD_LIMIT).map((item): NewsExplorerRow => [newsKind(item), item.publisher]),
  };
}

/**
 * The recency groups for the explorer, with per-language totals and card lists. Built
 * on the server so the client never reads the dataset. Recency is measured from the
 * build clock and each relative label carries its real date or time (NW-4).
 */
export function buildNewsExplorerGroups(
  locale: NewsLanguage,
  _archiveBase: string,
): { groups: NewsExplorerGroup[]; initialVisible: number } {
  const items = getAllNews();
  const reference = getNewsReference();
  const messages = NEWS_MESSAGES[locale];

  const groups: NewsExplorerGroup[] = byDayGroups(items, reference).map((group) => ({
    key: group.key,
    label: messages.groupLabels[group.key],
    detail: recencyGroupDetail(
      group.key,
      reference,
      group.items.map((item) => item.published),
      locale,
    ),
    languages: {
      nl: languageBucket(group.items, "nl", locale),
      en: languageBucket(group.items, "en", locale),
    },
    days: newsDays(group.items).map((day) => ({
      date: day.date,
      label: formatNewsDayLabel(day.date, locale),
      count: day.count,
      relevantCount: relevanceCounts(group.items.filter((item) => newsDayKey(item.published) === day.date)).relevant,
    })),
  }));

  return { groups, initialVisible: NEWS_GROUP_INITIAL };
}

export type NewsDayArchiveHour = {
  hour: string;
  label: string;
  items: NewsItemView[];
};

export type NewsDayLink = { date: string; label: string };

export type NewsDayArchive = {
  date: string;
  /** The adjacent days that have items: `previous` is the older one, `next` the newer. */
  previous: NewsDayLink | null;
  next: NewsDayLink | null;
  set: NewsItemView[];
  /** How many items of the day name the state; the rest sit behind the toggle. */
  relevantTotal: number;
  hours: NewsDayArchiveHour[];
};

/** One day archive: every item of the day plus the same items grouped by hour. */
export function buildNewsDayArchive(date: string, locale: NewsLanguage): NewsDayArchive {
  const items = getNewsForDay(date);
  const messages = NEWS_MESSAGES[locale];
  const days = getNewsDays().map((day) => day.date);
  const at = days.indexOf(date);
  const link = (target: string | undefined): NewsDayLink | null =>
    target === undefined ? null : { date: target, label: formatNewsDayLabel(target, locale) };
  return {
    date,
    previous: link(at >= 0 ? days[at + 1] : undefined),
    next: link(at > 0 ? days[at - 1] : undefined),
    set: getNewsItemViews(items, locale),
    relevantTotal: relevanceCounts(items).relevant,
    hours: byHour(items).map((bucket) => ({
      hour: bucket.hour,
      label: `${bucket.hour}:00 ${messages.hourConnector} ${bucket.hour}:59`,
      items: getNewsItemViews(bucket.items, locale),
    })),
  };
}

const ROUTE_BASE: Record<NewsLanguage, string> = { nl: "/nieuws", en: "/news" };

/** The path prefix of a news route: "/nieuws" for Dutch, "/news" for English. */
export function newsRouteBase(route: NewsLanguage): string {
  return ROUTE_BASE[route];
}

/** The inLanguage value of a news route's JSON-LD and the hreflang of its page. */
export const NEWS_IN_LANGUAGE: Record<NewsLanguage, string> = { nl: "nl-NL", en: "en-GB" };

/**
 * Metadata of a news page in either language: title, description, canonical and the
 * hreflang pair of the two routes (NW-10). The English route says so in `og:locale`
 * and names the Dutch one as the alternate, and the other way round.
 */
export function newsPageMetadata({
  route,
  title,
  description,
  path,
}: {
  route: NewsLanguage;
  title: string;
  description: string;
  path: string;
}): Metadata {
  const twin = languageTwin(path);
  const base = pageMetadata({
    title,
    description,
    path,
    snapshotDate: getDatasetDate(),
    alternateLanguages: twin ?? undefined,
  });
  return {
    ...base,
    openGraph: {
      ...(base.openGraph ?? {}),
      locale: route === "en" ? "en_GB" : "nl_NL",
      alternateLocale: route === "en" ? ["nl_NL"] : ["en_GB"],
    },
  };
}
