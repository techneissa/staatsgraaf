import { NewsItemCard } from "./news/news-item-card";
import { toNewsItemView } from "./news/news-view";
import type { NewsItem } from "@/lib/types";

/**
 * The server entry point for a news card on the home page, topic pages and
 * entity pages. It resolves the item into the same serialisable view the news
 * explorer uses and renders the one shared card, so every news card looks and
 * behaves the same. The card follows the site language, including machine
 * translations (docs/adr/0016).
 */
export function NewsCard({
  item,
  as = "article",
  headingLevel = 3,
}: {
  item: NewsItem;
  /** Kept for callers that numbered the cards; the card no longer shows a rank. */
  rank?: number;
  as?: "article" | "li" | "div";
  headingLevel?: 2 | 3 | 4;
}) {
  return (
    <NewsItemCard
      item={toNewsItemView(item, "nl")}
      as={as === "li" ? "div" : as}
      headingLevel={headingLevel}
    />
  );
}
