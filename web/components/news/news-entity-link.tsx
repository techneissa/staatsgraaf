"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/language-provider";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { interpolate } from "@/lib/i18n/locales";
import { newsEntityHref } from "@/lib/news-url-state";

/**
 * "All items about X": the news list filtered on one entity, complete (NW-9). It goes to
 * the route of the site language, so an English reader lands on /news/. Entity pages and
 * the peek's news link use it to reach the whole list, not only the few cards they show.
 */
export function NewsEntityLink({ id, name, className }: { id: string; name: string; className?: string }) {
  const locale = useLocale();
  return (
    <Link
      href={newsEntityHref(id, locale)}
      className={
        className ??
        "inline-flex items-center gap-1 text-sm font-medium text-accent-text underline-offset-2 hover:underline pointer-coarse:min-h-11"
      }
    >
      <span lang="nl">{interpolate(NEWS_DICT.newsEntityAllLink[locale], { name })}</span>
      <span aria-hidden="true">&rsaquo;</span>
    </Link>
  );
}
