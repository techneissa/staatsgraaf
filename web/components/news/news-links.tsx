import Link from "next/link";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import type { NewsLanguage } from "@/lib/types";

/**
 * The quiet link row under a news page heading: the outlet list with licences, and the
 * same section in the other interface language. `route` is the language of the page it
 * sits on; Dutch pages live under /nieuws/, English pages under /news/.
 */
export function NewsPageLinks({ route }: { route: NewsLanguage }) {
  const messages = NEWS_MESSAGES[route];
  const sourcesHref = route === "nl" ? "/nieuws/bronnen/" : "/news/sources/";
  const linkClass =
    "inline-flex min-h-11 items-center text-accent-text underline-offset-2 hover:underline sm:min-h-0";
  return (
    <nav aria-label={messages.heading} className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
      <Link href={sourcesHref} className={linkClass}>
        {NEWS_DICT.newsSourcesLink[route]}
      </Link>
      <Link href={messages.otherLanguageHref} hrefLang={route === "nl" ? "en" : "nl"} className={linkClass}>
        {messages.otherLanguageLabel}
      </Link>
    </nav>
  );
}
