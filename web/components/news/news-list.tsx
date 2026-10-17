import { NewsEntityLink } from "./news-entity-link";
import { NEWS_GRID_CLASS } from "./news-grid";
import { NewsCard } from "@/components/news-card";
import { T } from "@/components/i18n/t";
import { DateT } from "@/components/content/local-date";
import type { NewsItem } from "@/lib/types";

export function NewsList({
  items,
  initialLimit = 6,
  emptyTitle,
  emptyDescription,
  entity,
}: {
  items: NewsItem[];
  initialLimit?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  /** The person, organisation or position the list is about: adds a link to the complete news list on it (NW-9). */
  entity?: { id: string; name: string };
}) {
  if (items.length === 0) {
    return (
      <div className="mt-3 rounded-md border border-line bg-surface-raised p-4">
        <p className="text-sm font-semibold text-ink">
          {emptyTitle ?? <T area="news" k="newsListEmptyTitle" />}
        </p>
        {emptyDescription !== undefined ? (
          <p className="mt-1 text-sm text-ink-muted">{emptyDescription}</p>
        ) : null}
      </div>
    );
  }

  const visible = items.slice(0, initialLimit);
  const hidden = items.slice(initialLimit);

  return (
    <div>
      <ol className={`mt-3 ${NEWS_GRID_CLASS}`}>
        {visible.map((item, index) => (
          <li key={item.id}>
            <NewsCard item={item} rank={index + 1} as="div" />
          </li>
        ))}
      </ol>
      {hidden.length > 0 ? (
        <details className="motion-disclosure group mt-3">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-sm border border-line bg-surface-raised px-3 text-sm font-medium text-ink transition-fast hover:border-line-strong sm:min-h-9 pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">
              <DateT area="news" k="newsListShowMore" counts={{ count: hidden.length }} />
            </span>
            <span className="hidden group-open:inline">
              <T area="news" k="newsListShowLess" />
            </span>
          </summary>
          <ol className={`mt-3 ${NEWS_GRID_CLASS}`}>
            {hidden.map((item, index) => (
              <li key={item.id}>
                <NewsCard item={item} rank={visible.length + index + 1} as="div" />
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      {entity !== undefined ? (
        <p className="mt-3">
          <NewsEntityLink id={entity.id} name={entity.name} />
        </p>
      ) : null}
    </div>
  );
}
