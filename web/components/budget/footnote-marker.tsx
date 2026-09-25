"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { useDict } from "@/components/i18n/use-t";
import type { SourceIconItem } from "@/components/source-icon";
import { formatDateIn } from "@/lib/format";

/**
 * A numbered source marker, for example ^1. The marker itself opens the
 * source in a new tab; its accessible name and tooltip give the number, the
 * title and the retrieval date. Without a resolved source it falls back to
 * the numbered entry in the folded list at the bottom of the page.
 */
export function FootnoteMarker({ number, source }: { number: number; source?: SourceIconItem | null }) {
  const t = useDict("news");
  const locale = useLocale();
  const label = source
    ? source.retrieved
      ? t("budgetFootnoteSourceAriaRetrieved", {
          number,
          title: source.title,
          date: formatDateIn(source.retrieved, locale, "long"),
        })
      : t("budgetFootnoteSourceAria", { number, title: source.title })
    : t("budgetFootnoteAria", { number });
  return (
    <sup className="ms-0.5 align-super text-[10px] font-semibold leading-none text-accent-text">
      <a
        href={source ? source.href : `#bron-${number}`}
        {...(source ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="relative no-underline hover:underline pointer-coarse:after:absolute pointer-coarse:after:-inset-3.5 pointer-coarse:after:content-['']"
        aria-label={label}
        title={label}
      >
        ^{number}
      </a>
    </sup>
  );
}

/** The markers for one budget category, in source-list order. `sources[n - 1]` is the source of marker n. */
export function FootnoteMarkers({ numbers, sources }: { numbers: number[]; sources?: (SourceIconItem | null)[] }) {
  if (numbers.length === 0) return null;
  return (
    <span className="inline-flex items-baseline gap-0.5 pointer-coarse:gap-3">
      {numbers.map((number) => (
        <FootnoteMarker key={number} number={number} source={sources?.[number - 1] ?? null} />
      ))}
    </span>
  );
}
