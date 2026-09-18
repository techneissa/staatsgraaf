import { T } from "@/components/i18n/t";
import { getS } from "@/lib/i18n/server-strings";
import { EmptyState } from "@/components/empty-state";
import { NewsCard } from "@/components/news-card";
import type { NewsItem } from "@/lib/types";

export function TopicNews({ items, total }: { items: NewsItem[]; total?: number }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={getS("news", "topicNewsEmptyTitle")}
        description={getS("news", "topicNewsEmptyDescription")}
      />
    );
  }

  const count = total ?? items.length;

  return (
    <>
      {count > items.length ? (
        <p className="mt-3 text-xs tabular-nums text-ink-faint">
          <T area="news" k="topicNewsCount" vars={{ shown: items.length, total: count }} />
        </p>
      ) : null}
      <ol className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <NewsCard item={item} />
          </li>
        ))}
      </ol>
    </>
  );
}
