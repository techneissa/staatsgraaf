import { T } from "@/components/i18n/t";
import { SOURCES_SUMMARY_CLASS, SourceRow } from "@/components/source-list";
import type { SourceRef } from "@/lib/types";

/**
 * The numbered source list behind the ^1, ^2 markers on the budget page. The
 * markers open their source directly, so the list sits folded; each entry
 * keeps the anchor id `bron-N` as a fallback target.
 */
export function SourceFootnotes({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) return null;
  return (
    <section aria-labelledby="bronnen-titel" className="mt-6">
      <details className="group motion-disclosure">
        <summary className={SOURCES_SUMMARY_CLASS}>
          <svg aria-hidden="true" viewBox="0 0 12 12" width="10" height="10" className="shrink-0 transition-fast group-open:rotate-90">
            <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 id="bronnen-titel" className="text-sm font-semibold">
            <T area="news" k="budgetSourcesTitle" />{" "}
            <span className="font-normal tabular-nums text-ink-faint">({sources.length})</span>
          </h2>
        </summary>
        <ol className="mt-2 space-y-2 text-sm">
          {sources.map((ref, index) => {
            const number = index + 1;
            return (
              <li key={`${ref.source}-${ref.retrieved}`} id={`bron-${number}`}>
                <SourceRow
                  sourceRef={ref}
                  marker={<span className="w-6 shrink-0 text-xs font-medium tabular-nums text-accent-text">^{number}</span>}
                />
              </li>
            );
          })}
        </ol>
      </details>
    </section>
  );
}
