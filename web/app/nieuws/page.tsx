import type { Metadata } from "next";
import { NewsMainView } from "@/components/news/news-main-view";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { newsPageMetadata } from "@/lib/news-page";

export const dynamic = "force-static";

const messages = NEWS_MESSAGES.nl;

export const metadata: Metadata = newsPageMetadata({
  route: "nl",
  title: messages.metaTitle,
  description: messages.metaDescription,
  path: "/nieuws/",
});

export default function NewsPage() {
  return <NewsMainView route="nl" />;
}
