"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import { formatIsoDate } from "./local-date";

/**
 * The source of a fact as a quiet link: publisher and an outward arrow, with
 * the retrieval date in the title. Never removed; only quieted. On touch the
 * hit area grows to 44 px without moving the layout.
 */
export function QuietSource({
  href,
  publisher,
  retrieved,
  className = "",
}: {
  href: string;
  publisher: string;
  retrieved?: string | null;
  className?: string;
}) {
  const t = useT("home");
  const tc = useT("common");
  const locale = useLocale();
  const title = retrieved ? t("sourceRetrievedOn", { date: formatIsoDate(retrieved, locale) }) : undefined;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={`-my-1 inline-flex max-w-full items-center gap-1 py-1 text-xs text-ink-faint underline-offset-2 transition-fast hover:text-ink hover:underline pointer-coarse:-my-3 pointer-coarse:py-3 ${className}`.trim()}
    >
      <span className="sr-only">{t("sourcePrefix")} </span>
      <span className="truncate">{publisher}</span>
      <svg aria-hidden="true" viewBox="0 0 20 20" width="11" height="11" className="shrink-0">
        <path d="M6 14 14 6M8 6h6v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only"> {tc("opensNewTab")}</span>
    </a>
  );
}
