import type { Metadata } from "next";
import { NewsMainView } from "@/components/news/news-main-view";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { newsPageMetadata } from "@/lib/news-page";

export const dynamic = "force-static";

const messages = NEWS_MESSAGES.en;

export const metadata: Metadata = newsPageMetadata({
  route: "en",
  title: messages.metaTitle,
  description: messages.metaDescription,
  path: "/news/",
});

export default function NewsPage() {
  return <NewsMainView route="en" />;
}
