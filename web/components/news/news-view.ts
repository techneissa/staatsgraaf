import { formatClockTime, formatDateTimeLocal } from "@/lib/format";
import { getMediaItem, mediaCreditLine } from "@/lib/entity";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import {
  newsDayKey,
  newsKeywords,
  newsKind,
  newsLanguage,
  resolveNewsEntities,
  type NewsEntityRef,
} from "@/lib/news";
import type { NewsItem, NewsLanguage, PublisherKind } from "@/lib/types";

/**
 * A plain, serialisable projection of one news item with every link resolved.
 * Built on the server so the client explorer never touches the dataset.
 */
export type NewsItemView = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  kind: PublisherKind;
  kindLabel: string;
  language: NewsLanguage;
  /** The item's own language, named in the interface language. */
  languageLabel: string;
  published: string;
  /** Calendar day in Nederland, yyyy-mm-dd. */
  day: string;
  /** Wall-clock time in Nederland, hh:mm. */
  time: string;
  /** Full date and time in Nederland. */
  dateTime: string;
  summary: string | null;
  entities: NewsEntityRef[];
  keywords: string[];
  /**
   * A licensed preview image, when the item carries one. All current feeds are
   * all rights reserved, so this stays null today and the card draws its own
   * tile instead. The caption always names credit and license.
   */
  image: { url: string; caption: string } | null;
};

/**
 * The pipeline writes a summary of the form `Publisher bericht: "title"` when it has
 * nothing beyond the headline. That repeats the headline, so it is not shown.
 */
function usefulSummary(item: NewsItem): string | null {
  const summary = item.summary;
  if (summary === null || summary.trim().length === 0) return null;
  const trimmed = summary.trim();
  if (trimmed === item.title.trim()) return null;
  if (trimmed.includes(`"${item.title.trim()}"`)) return null;
  return trimmed;
}

export function toNewsItemView(item: NewsItem, locale: NewsLanguage = "nl"): NewsItemView {
  const kind = newsKind(item);
  const language = newsLanguage(item);
  const messages = NEWS_MESSAGES[locale];
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    publisher: item.publisher,
    kind,
    kindLabel: messages.kindBadges[kind],
    language,
    languageLabel: messages.languageLabels[language],
    published: item.published,
    day: newsDayKey(item.published),
    time: formatClockTime(item.published),
    dateTime: formatDateTimeLocal(item.published),
    summary: usefulSummary(item),
    entities: resolveNewsEntities(item),
    keywords: newsKeywords(item),
    image: resolveNewsImage(item),
  };
}

function resolveNewsImage(item: NewsItem): NewsItemView["image"] {
  if (typeof item.image !== "string" || item.image === "") return null;
  const media = getMediaItem(item.image);
  if (media === null) return null;
  return { url: media.url, caption: mediaCreditLine(media) };
}
