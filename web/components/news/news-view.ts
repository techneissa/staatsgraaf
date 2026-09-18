import { formatClockTime, formatDateTimeLocal } from "@/lib/format";
import { getMediaItem, mediaCreditLine } from "@/lib/entity";
import { newsMonogram } from "@/lib/news-preview";
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
 * What the card shows as its preview tile, in order of preference:
 * a licensed image the pipeline stored for this item (none today, every feed
 * is all rights reserved), the licensed portrait of the first person the item
 * links to, or a monogram of the outlet drawn from our own tokens. Nothing is
 * ever hotlinked from an outlet: that would republish its image and send the
 * reader's request to a third party.
 */
export type NewsPreview =
  | { kind: "image"; url: string; caption: string }
  | { kind: "portrait"; url: string; caption: string; personLabel: string; href: string }
  | { kind: "monogram"; monogram: string; publisher: string; publisherKind: PublisherKind };

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
  preview: NewsPreview;
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
  const entities = resolveNewsEntities(item);
  const image = resolveNewsImage(item);
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
    entities,
    keywords: newsKeywords(item),
    image,
    preview: resolveNewsPreview({ image, entities, publisher: item.publisher, publisherKind: kind }),
  };
}

export function resolveNewsPreview({
  image,
  entities,
  publisher,
  publisherKind,
}: {
  image: { url: string; caption: string } | null;
  entities: NewsEntityRef[];
  publisher: string;
  publisherKind: PublisherKind;
}): NewsPreview {
  if (image !== null) return { kind: "image", url: image.url, caption: image.caption };
  const person = entities.find((entry) => entry.kind === "person" && entry.portrait !== null);
  if (person && person.portrait !== null) {
    return {
      kind: "portrait",
      url: person.portrait.url,
      caption: person.portrait.caption,
      personLabel: person.label,
      href: person.href,
    };
  }
  return { kind: "monogram", monogram: newsMonogram(publisher), publisher, publisherKind };
}

function resolveNewsImage(item: NewsItem): NewsItemView["image"] {
  if (typeof item.image !== "string" || item.image === "") return null;
  const media = getMediaItem(item.image);
  if (media === null) return null;
  return { url: media.url, caption: mediaCreditLine(media) };
}
