import { NewsList } from "./news-list";
import { getHomeNews, getNewsForEntity, getNewsForTopic } from "@/lib/news";
import type { NewsItem } from "@/lib/types";

type NewsPanelProps = {
  initialLimit?: number;
  emptyTitle?: string;
  emptyDescription?: string;
} & (
  | { scope: "home"; items?: never }
  | { scope: "entity"; id: string; items?: never }
  | { scope: "topic"; id: string; organizationIds?: string[]; items?: never }
  | { scope: "custom"; items: NewsItem[] }
);

export function NewsPanel(props: NewsPanelProps) {
  const { initialLimit = 6, emptyTitle, emptyDescription } = props;
  let list: NewsItem[];
  switch (props.scope) {
    case "home":
      list = getHomeNews(50);
      break;
    case "entity":
      list = getNewsForEntity(props.id);
      break;
    case "topic":
      list = getNewsForTopic(props.id, props.organizationIds ?? []);
      break;
    case "custom":
      list = props.items;
      break;
  }

  return (
    <NewsList
      items={list}
      initialLimit={initialLimit}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  );
}
