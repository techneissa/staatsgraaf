import { formatClockTime } from "@/lib/format";
import { getMediaItem, mediaCreditLine } from "@/lib/entity";
import { newsMonogram } from "@/lib/news-preview";
import { stripPublisherPrefix, stripTitleFromMarkup } from "@/lib/news-text";
import { newsTranslationFor } from "@/lib/news-translations";
import {
  isRelevantNews,
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
 * is all rights reserved), a feed-supplied preview image loaded from the
 * outlet's own servers (adr/0008: shown remotely, credited to the outlet, no
 * license claimed), the licensed portrait of the first person the item links
 * to, or a monogram of the outlet drawn from our own tokens. Nothing is
 * copied into our dataset and no license is invented: the reader sees the
 * image as the outlet publishes it, with the outlet named.
 */
export type NewsPreview =
  | { kind: "image"; url: string; caption: string; remote: boolean }
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
  /** The outlet host, for the source pill, for example "nos.nl". */
  host: string;
  kind: PublisherKind;
  language: NewsLanguage;
  published: string;
  /** Wall-clock time in Nederland, hh:mm. */
  time: string;
  summary: string | null;
  entities: NewsEntityRef[];
  keywords: string[];
  /** True when the item names an entity or a topic from the dataset (docs/adr/0021). */
  relevant: boolean;
  /** The lead as published: summary markup with the headline prefix removed, or null. */
  lead: string | null;
  /** The plain summary without the publisher-and-headline prefix, for items without markup. */
  plainLead: string | null;
  /**
   * A machine translation into the other interface language (docs/adr/0016),
   * present only while its hash matches this item. Null when the item has no
   * valid translation yet; the card then shows the original, tagged with its language.
   */
  translation: { language: NewsLanguage; title: string; lead: string | null } | null;
  /**
   * A licensed preview image stored by the pipeline, when the item carries
   * one. All current feeds are all rights reserved, so this stays null today
   * and the preview falls back to the feed-supplied image URL. The caption
   * always names credit and license.
   */
  image: { url: string; caption: string } | null;
  preview: NewsPreview;
};

/** The bare hostname of an outlet URL, without the leading `www.`. */
export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * The pipeline writes a summary of the form `Publisher bericht: "title"` when it has
 * nothing beyond the headline. That repeats the headline, so it is not shown.
 * A feed summary that starts with the headline and continues after a dash
 * ("Title — the actual lede") is trimmed to the continuation; a very short
 * remainder is dropped, because a fragment that short reads worse than nothing.
 */
function usefulSummary(item: NewsItem): string | null {
  const summary = item.summary;
  if (summary === null || summary.trim().length === 0) return null;
  const trimmed = summary.trim();
  const title = item.title.trim();
  if (trimmed === title) return null;
  if (trimmed.includes(`"${title}"`)) return null;
  if (trimmed.startsWith(title)) {
    const rest = trimmed
      .slice(title.length)
      .trim()
      .replace(/^[—–•·:;,-]\s*/, "")
      .trim();
    if (rest.length < 24) return null;
    return rest;
  }
  return trimmed;
}

/** `_locale` is kept for callers; the view carries no interface-language strings. */
export function toNewsItemView(item: NewsItem, _locale: NewsLanguage = "nl"): NewsItemView {
  const kind = newsKind(item);
  const language = newsLanguage(item);
  const entities = resolveNewsEntities(item);
  const image = resolveNewsImage(item);
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    publisher: item.publisher,
    host: hostLabel(item.url),
    kind,
    language,
    published: item.published,
    time: formatClockTime(item.published),
    summary: usefulSummary(item),
    entities,
    keywords: newsKeywords(item),
    relevant: isRelevantNews(item),
    lead: stripTitleFromMarkup(item.summaryMarkup, item.title),
    plainLead: (() => {
      const plain = stripPublisherPrefix(item.summary, item.title);
      return plain === "" ? null : plain;
    })(),
    translation: (() => {
      const target = language === "en" ? "nl" : "en";
      const record = newsTranslationFor(item, target);
      return record === null
        ? null
        : { language: target, title: record.title, lead: record.lead };
    })(),
    image: image === null || image.remote ? null : { url: image.url, caption: image.caption },
    preview: resolveNewsPreview({ image, entities, publisher: item.publisher, publisherKind: kind }),
  };
}

export function resolveNewsPreview({
  image,
  entities,
  publisher,
  publisherKind,
}: {
  image: { url: string; caption: string; remote: boolean } | null;
  entities: NewsEntityRef[];
  publisher: string;
  publisherKind: PublisherKind;
}): NewsPreview {
  if (image !== null) {
    return { kind: "image", url: image.url, caption: image.caption, remote: image.remote };
  }
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

/**
 * The preview image of an item: a licensed media record the pipeline stored,
 * or the feed-supplied image URL as a remote preview credited to the outlet
 * (adr/0008). The remote flag records which one it is, so the interface can
 * treat a local licensed copy differently from a hotlinked feed image.
 */
function resolveNewsImage(item: NewsItem): {
  url: string;
  caption: string;
  remote: boolean;
} | null {
  if (typeof item.image === "string" && item.image !== "") {
    const media = getMediaItem(item.image);
    if (media !== null) return { url: media.url, caption: mediaCreditLine(media), remote: false };
  }
  if (typeof item.imageUrl === "string" && item.imageUrl !== "") {
    return { url: item.imageUrl, caption: item.publisher, remote: true };
  }
  return null;
}
