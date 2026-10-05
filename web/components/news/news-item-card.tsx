"use client";
import { Languages } from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { useLocale } from "@/components/i18n/language-provider";
import { topicNameEn } from "@/lib/topic-names";
import { KindGlyph } from "@/components/kind-glyph";
import { PeekLink } from "@/components/peek/peek-link";
import { SourceIcon } from "@/components/source-icon";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import type { NewsLanguage } from "@/lib/types";
import { NewsLead } from "./news-lead";
import { NewsPreviewTile } from "./news-preview";
import type { NewsItemView } from "./news-view";

const DATE_TIME: Record<NewsLanguage, Intl.DateTimeFormat> = {
  nl: new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }),
  en: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }),
};

/** Mentioned people that get a micro portrait; more would crowd the line. */
const AVATARS_IN_LINE = 2;

/**
 * One news item, the same everywhere: the home page, entity and topic pages,
 * the news explorer and the day archives.
 *
 * Hierarchy: the headline (links to the article), the lead (cut at a sentence or word,
 * with a way to open the rest), one quiet "Mentioned" line that holds the keyboard link
 * for every entity, and one source line with the
 * outlet, the time and the kind. The thumbnail sits beside the headline at a
 * small fixed size on phones, so the lead gets the full width, and beside the
 * whole card from the small breakpoint up. An item without a lead is a compact card
 * (headline, mentions and source line, no empty gap), not a stub.
 *
 * Language (docs/adr/0016): the card shows the item in `displayLanguage`, or
 * in the site language when none is given. When the item was published in the
 * other language and a valid machine translation exists, the translation is
 * shown with a "Translated from ..." label and a toggle back to the original;
 * without one, the original is shown with a language tag. Every text run
 * carries its real `lang`. The source link always points at the original.
 */
export function NewsItemCard({
  item,
  displayLanguage,
  showDate = true,
  as: Tag = "article",
  headingLevel = 3,
}: {
  item: NewsItemView;
  /** Fixed interface language for the /news/ and /nieuws/ routes; otherwise the site locale. */
  displayLanguage?: NewsLanguage;
  showDate?: boolean;
  as?: "article" | "div";
  headingLevel?: 2 | 3 | 4;
}) {
  const siteLocale = useLocale();
  const target: NewsLanguage = displayLanguage ?? siteLocale;
  const messages = NEWS_MESSAGES[target];
  const [original, setOriginal] = useState(false);
  /** Set by the toggle, so only a switch the reader made fades the text in. */
  const [switched, setSwitched] = useState(false);
  const swap = switched ? "motion-swap" : "";

  const translation = item.translation !== null && item.translation.language === target ? item.translation : null;
  const translated = translation !== null && !original;
  const textLanguage: NewsLanguage = translated ? target : item.language;
  const title = translated ? translation.title : item.title;
  const lead = translated ? translation.lead : item.lead;
  const plainLead = translated ? null : item.plainLead;
  const foreign = item.language !== target;

  const entityFor = (id: string) => {
    const entry = item.entities.find((candidate) => candidate.id === id);
    return entry ? { href: entry.href, kind: entry.peekKind } : null;
  };
  const Heading = `h${headingLevel}` as "h3";
  const headingId = `${item.id}-kop`;
  const people = item.entities.filter((entry) => entry.kind === "person").slice(0, AVATARS_IN_LINE);
  const monogram = item.preview.kind === "monogram";
  const hasLead = lead !== null || plainLead !== null;
  const compact = !hasLead;

  return (
    <Tag
      aria-labelledby={headingId}
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-md border border-line bg-surface transition-fast hover:border-line-strong sm:gap-x-4 ${
        compact ? "p-3 sm:px-4" : "p-4"
      }`}
    >
      <Heading id={headingId} lang={textLanguage} className="col-start-1 row-start-1 text-[15px] font-semibold leading-snug">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink decoration-accent decoration-2 underline-offset-2 transition-fast hover:text-accent-text hover:underline"
        >
          <span key={String(translated)} className={swap || undefined}>
            {title}
          </span>
          <span lang={target} className="sr-only">
            {" "}
            {messages.card.opensNewTab}
          </span>
        </a>
      </Heading>

      <div className={`col-start-2 row-start-1 ${compact ? "sm:row-span-2" : "sm:row-span-3"} ${monogram ? "hidden sm:block" : ""}`}>
        {compact ? (
          <NewsPreviewTile preview={item.preview} size={48} rounded="sm" />
        ) : (
          <NewsPreviewTile preview={item.preview} rounded="sm" responsive />
        )}
      </div>

      {hasLead || item.entities.length > 0 ? (
        <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-1">
          {hasLead ? (
            <NewsLead
              key={String(translated)}
              markup={lead}
              plain={plainLead}
              entityFor={entityFor}
              lang={textLanguage}
              className={`mt-1.5 ${swap}`}
              moreLabel={messages.card.leadMore}
              lessLabel={messages.card.leadLess}
            />
          ) : null}

          {item.entities.length > 0 ? (
            <p
              className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs leading-relaxed text-ink-faint"
              title={item.keywords.length > 0 ? `${messages.card.linkedOnLabel} ${item.keywords.join(", ")}` : undefined}
            >
              {item.entities.map((entry, index) => (
                <span key={entry.id} className="inline-flex items-center gap-x-1.5">
                  {index === 0 ? <span lang={target}>{messages.card.mentionedShort}:</span> : null}
                  <PeekLink
                    id={entry.id}
                    href={entry.href}
                    kind={entry.peekKind}
                    variant="quiet"
                    lang="nl"
                    className="relative inline-flex items-center pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-3.5 pointer-coarse:after:content-['']"
                  >
                    {people.includes(entry) ? (
                      <Avatar
                        name={entry.label}
                        url={entry.portrait?.url ?? null}
                        color={entry.color ?? null}
                        size={16}
                        className="mr-1 align-[-0.3em]"
                      />
                    ) : (
                      <KindGlyph kind={entry.peekKind} size={7} className="mr-1 align-[0.05em]" />
                    )}
                    {entry.kind === "topic" && target === "en"
                      ? topicNameEn(entry.href.split("/").filter(Boolean).pop() ?? "", entry.label)
                      : entry.label}
                  </PeekLink>
                  {index < item.entities.length - 1 ? (
                    <span aria-hidden="true" className="text-ink-faint">
                      &middot;
                    </span>
                  ) : null}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className={`col-span-2 flex justify-between gap-x-3 gap-y-1 text-xs text-ink-faint sm:col-span-1 sm:col-start-1 ${
          compact ? "mt-1.5 items-center" : "mt-3 items-start"
        }`}
      >
        <div className={`flex min-w-0 ${compact ? "flex-wrap items-center gap-x-2 gap-y-0.5" : "flex-col gap-0.5"}`}>
          <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-ink-muted">
            <span className="min-w-0">{item.publisher}</span>
            <SourceIcon
              href={item.url}
              title={item.publisher}
              size={14}
              label={`${messages.card.sourceLabel} ${item.publisher} (${item.host})`}
            />
          </span>
          <span lang={target}>{messages.kindBadges[item.kind]}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <time dateTime={item.published} className="whitespace-nowrap tabular-nums">
            {showDate ? DATE_TIME[target].format(new Date(item.published)) : item.time}
          </time>
          {translation !== null ? (
            <button
              type="button"
              lang={target}
              aria-pressed={original}
              aria-label={original ? messages.card.showTranslation : messages.card.showOriginal}
              title={original ? messages.card.showTranslation : messages.card.showOriginal}
              onClick={() => {
                setSwitched(true);
                setOriginal((value) => !value);
              }}
              className={`tap-target -my-1.5 inline-flex h-7 w-7 items-center justify-center rounded-sm transition-fast hover:bg-surface-raised hover:text-ink ${
                original ? "text-accent-text" : "text-ink-faint"
              }`}
            >
              <LucideIcon icon={Languages} size={15} />
            </button>
          ) : foreign ? (
            <span
              lang={target}
              title={messages.card.originalLanguageTitle[item.language]}
              className="rounded-xs border border-line px-1.5 py-px text-[11px] font-medium text-ink-muted"
            >
              {messages.card.originalLanguageTag[item.language]}
            </span>
          ) : null}
        </div>
      </div>
    </Tag>
  );
}
