import Link from "next/link";
import { EmptyStateT } from "@/components/change/empty-state-t";
import { NewsCard } from "@/components/news-card";
import { NEWS_GRID_CLASS } from "@/components/news/news-grid";
import { T } from "@/components/i18n/t";
import { getHomeNewsRelevant } from "@/lib/news";
import type { NewsItem } from "@/lib/types";

/**
 * The home news band. It shows the newest relevant items across outlets, `NEWS_HOME_LIMIT`
 * of them and at most `NEWS_HOME_PER_OUTLET` from one outlet (docs/adr/0021 and its
 * amendment of 06-10-2026), and falls back to the newest items of any kind only when none
 * is relevant. `items` only tells whether the dataset has news at all.
 */
export function NewsBand({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return <EmptyStateT title="newsEmptyTitle" />;
  }
  const shown = getHomeNewsRelevant();

  return (
    <div>
      <ol className={NEWS_GRID_CLASS}>
        {shown.map((item, index) => (
          <li key={item.id}>
            <NewsCard item={item} rank={index + 1} />
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm">
        <Link
          href="/nieuws/"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-text underline-offset-2 hover:underline pointer-coarse:min-h-11"
        >
          <T area="home" k="newsAll" />
          <span aria-hidden="true">&rsaquo;</span>
        </Link>
      </p>
    </div>
  );
}
