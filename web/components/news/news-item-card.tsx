import { EntityChip } from "@/components/entity-chip";
import { KindBadge } from "@/components/kind-badge";
import type { NewsMessages } from "@/lib/news-i18n";
import type { NewsItemView } from "./news-view";

/**
 * One news item. Pure: it renders a resolved view and reads no data, so it works
 * inside the client explorer and on server-rendered archive pages alike.
 * The source link is always rendered; no filter or disclosure removes it.
 */
export function NewsItemCard({
  item,
  messages,
  showDate = true,
}: {
  item: NewsItemView;
  messages: NewsMessages;
  showDate?: boolean;
}) {
  const keywordText = item.keywords.length > 0 ? item.keywords.join(", ") : null;

  return (
    <article className="rounded-md border border-line bg-surface p-4" aria-labelledby={`${item.id}-kop`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span className="font-medium text-ink">{item.publisher}</span>
          <KindBadge>{item.kindLabel}</KindBadge>
          {item.language !== messages.locale ? (
            <KindBadge tone="accent">{messages.languageLabels[item.language]}</KindBadge>
          ) : null}
        </span>
        <time dateTime={item.published} className="text-xs tabular-nums text-ink-faint">
          {showDate ? item.dateTime : item.time}
        </time>
      </div>
      <h3 id={`${item.id}-kop`} className="mt-1.5 text-sm font-semibold leading-snug" lang={item.language}>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
        >
          {item.title}
          <span className="sr-only"> {messages.card.opensNewTab}</span>
        </a>
      </h3>
      {item.summary !== null ? (
        <p className="mt-2 text-sm leading-normal text-ink-muted" lang={item.language}>
          {item.summary}
        </p>
      ) : null}
      {item.entities.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={messages.card.mentionedInLabel}>
          {item.entities.map((entry) => (
            <li key={entry.id}>
              <EntityChip href={entry.href} meta={messages.card.entityKindLabels[entry.kind]}>
                {entry.label}
              </EntityChip>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-ink-faint">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-text underline-offset-2 hover:underline"
        >
          {messages.card.sourceLabel} {item.publisher}
          <span className="sr-only"> {messages.card.opensNewTab}</span>
        </a>
        {keywordText !== null ? (
          <span title={`${messages.card.linkedOnLabel} ${keywordText}`}>
            {messages.card.linkedOnLabel} {keywordText}
          </span>
        ) : null}
      </p>
    </article>
  );
}
