import { toNewsItemView, type NewsItemView } from "@/components/news/news-view";
import type { NewsExplorerGroup } from "@/components/news/news-explorer";
import {
  byDayGroups,
  byHour,
  byLanguage,
  getAllNews,
  getNewsForDay,
  getNewsReference,
  NEWS_GROUP_INITIAL,
  NEWS_GROUP_LIMIT,
  newsDays,
} from "@/lib/news";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
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

function languageBucket(items: NewsItem[], lang: NewsLanguage, locale: NewsLanguage) {
  const forLang = byLanguage(items, lang);
  return {
    total: forLang.length,
    items: getNewsItemViews(forLang.slice(0, NEWS_GROUP_LIMIT), locale),
  };
}

/**
 * The recency groups for the explorer, with per-language totals and capped item
 * lists. Built on the server so the client never reads the dataset.
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
    languages: {
      nl: languageBucket(group.items, "nl", locale),
      en: languageBucket(group.items, "en", locale),
    },
    days: newsDays(group.items).map((day) => ({
      date: day.date,
      label: formatNewsDayLabel(day.date, locale),
      count: day.count,
    })),
  }));

  return { groups, initialVisible: NEWS_GROUP_INITIAL };
}

export type NewsDayArchiveHour = {
  hour: string;
  label: string;
  items: NewsItemView[];
};

export type NewsDayArchive = {
  date: string;
  set: NewsItemView[];
  hours: NewsDayArchiveHour[];
};

/** One day archive: every item of the day plus the same items grouped by hour. */
export function buildNewsDayArchive(date: string, locale: NewsLanguage): NewsDayArchive {
  const items = getNewsForDay(date);
  const messages = NEWS_MESSAGES[locale];
  return {
    date,
    set: getNewsItemViews(items, locale),
    hours: byHour(items).map((bucket) => ({
      hour: bucket.hour,
      label: `${bucket.hour}:00 ${messages.hourConnector} ${bucket.hour}:59`,
      items: getNewsItemViews(bucket.items, locale),
    })),
  };
}
