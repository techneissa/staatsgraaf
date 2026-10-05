import type { Metadata } from "next";
import { NewsSourcesView } from "@/components/news/news-sources-view";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { newsPageMetadata } from "@/lib/news-page";

export const dynamic = "force-static";

const messages = NEWS_MESSAGES.nl;

export const metadata: Metadata = newsPageMetadata({
  route: "nl",
  title: messages.sourcesHeading,
  description: messages.sourcesIntro,
  path: "/nieuws/bronnen/",
});

export default function NewsSourcesPage() {
  return <NewsSourcesView route="nl" />;
}
