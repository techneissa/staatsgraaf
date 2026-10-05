import Link from "next/link";
import { EmptyStateT } from "@/components/change/empty-state-t";
import { NewsCard } from "@/components/news-card";
import { T } from "@/components/i18n/t";
import { getHomeNewsRelevant } from "@/lib/news";
import type { NewsItem } from "@/lib/types";

/**
 * The home news band. It shows the newest items that name a person, organisation,
 * position or topic from the dataset (docs/adr/0021), and falls back to the newest
 * items of any kind only when none is relevant. `items` sets how many to show and
 * is the fallback list.
 */
export function NewsBand({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return <EmptyStateT title="newsEmptyTitle" />;
  }
  const shown = getHomeNewsRelevant(items.length);

  return (
    <div>
      <ol className="space-y-2.5">
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
