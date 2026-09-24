import { SourceLink } from "@/components/source-link";
import { T } from "@/components/i18n/t";
import { getSourceById } from "@/lib/data";
import { LocalDate } from "@/components/content/local-date";
import type { SourceRef } from "@/lib/types";

/**
 * The numbered source list behind the ^1, ^2 markers on the budget page.
 * Each entry carries the anchor id `bron-N` the markers link to.
 */
export function SourceFootnotes({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) return null;
  return (
    <section aria-labelledby="bronnen-titel" className="mt-6">
      <h2 id="bronnen-titel" className="text-sm font-semibold text-ink">
        <T area="news" k="budgetSourcesTitle" />
      </h2>
      <ol className="mt-2 space-y-2">
        {sources.map((ref, index) => {
          const source = getSourceById(ref.source);
          const number = index + 1;
          return (
            <li
              key={`${ref.source}-${ref.retrieved}`}
              id={`bron-${number}`}
              className="flex gap-2 text-sm"
            >
              <span className="w-7 shrink-0 font-medium tabular-nums text-accent-text">
                ^{number}
              </span>
              <span className="min-w-0">
                {source ? (
                  <SourceLink
                    href={source.url}
                    archiveHref={source.archiveUrl}
                    meta={
                      <>
                        {source.publisher}, <LocalDate iso={source.retrieved} />
                      </>
                    }
                  >
                    {source.title}
                  </SourceLink>
                ) : (
                  <span className="text-ink-faint">
                    <T area="common" k="unknownSource" vars={{ id: ref.source }} />
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
