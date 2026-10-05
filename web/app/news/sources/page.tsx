import type { Metadata } from "next";
import { NewsSourcesView } from "@/components/news/news-sources-view";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { newsPageMetadata } from "@/lib/news-page";

export const dynamic = "force-static";

const messages = NEWS_MESSAGES.en;

export const metadata: Metadata = newsPageMetadata({
  route: "en",
  title: messages.sourcesHeading,
  description: messages.sourcesIntro,
  path: "/news/sources/",
});

export default function NewsSourcesPage() {
  return <NewsSourcesView route="en" />;
}
