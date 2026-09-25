import type { ReactNode } from "react";
import { SourceIcon } from "@/components/source-icon";
import { LocalDate } from "@/components/content/local-date";
import { T } from "@/components/i18n/t";
import { getSourceById } from "@/lib/data";
import type { SourceRef } from "@/lib/types";

/** The disclosure chevron shared by the source lists. */
function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      width="10"
      height="10"
      className="shrink-0 transition-fast group-open:rotate-90"
    >
      <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const SOURCES_SUMMARY_CLASS =
  "inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm py-1.5 text-sm font-semibold text-ink transition-fast hover:text-accent-text pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden";

/**
 * One row of the full source list: the chain icon is the link, the title and
 * the publisher with the retrieval date stay as quiet text beside it.
 */
export function SourceRow({ sourceRef, marker }: { sourceRef: SourceRef; marker?: ReactNode }) {
  const source = getSourceById(sourceRef.source);
  if (!source) {
    return (
      <span className="text-ink-faint">
        <T area="common" k="unknownSource" vars={{ id: sourceRef.source }} />
      </span>
    );
  }
  return (
    <span className="flex min-w-0 items-start gap-2">
      {marker}
      <SourceIcon href={source.url} title={source.title} retrieved={source.retrieved} className="mt-0.5" />
      <span className="min-w-0 text-ink-muted">
        {source.title}{" "}
        <span className="text-xs text-ink-faint">
          {source.publisher}, <LocalDate iso={source.retrieved} />
        </span>
        {source.archiveUrl ? (
          <>
            {" "}
            <a
              href={source.archiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ink-faint underline decoration-line-strong underline-offset-2 hover:text-accent-text"
            >
              <T area="common" k="archiveCopy" />
            </a>
          </>
        ) : null}
      </span>
    </span>
  );
}

/**
 * The full source list of a page, for completeness. Every fact on the page
 * already carries its own source icon, so the list sits folded as
 * "Bronnen (n)" and opens to the titles.
 */
export function SourceList({ sources, title }: { sources: SourceRef[]; title?: ReactNode }) {
  if (sources.length === 0) return null;
  return (
    <section aria-labelledby="bronnen-titel" className="mt-6">
      <details className="group motion-disclosure">
        <summary className={SOURCES_SUMMARY_CLASS}>
          <Chevron />
          <h2 id="bronnen-titel" className="text-sm font-semibold">
            {title ?? <T area="common" k="sourcesTitle" />}{" "}
            <span className="font-normal tabular-nums text-ink-faint">({sources.length})</span>
          </h2>
        </summary>
        <ul className="mt-2 space-y-2 text-sm">
          {sources.map((ref) => (
            <li key={`${ref.source}-${ref.retrieved}`}>
              <SourceRow sourceRef={ref} />
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
