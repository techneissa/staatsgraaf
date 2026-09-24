import type { ReactNode } from "react";
import { SourceLink } from "./source-link";
import { LocalDate } from "@/components/content/local-date";
import { T } from "@/components/i18n/t";
import { getSourceById } from "@/lib/data";
import type { SourceRef } from "@/lib/types";

export function SourceList({ sources, title }: { sources: SourceRef[]; title?: ReactNode }) {
  if (sources.length === 0) return null;
  return (
    <section aria-labelledby="bronnen-titel" className="mt-6">
      <h2 id="bronnen-titel" className="text-sm font-semibold text-ink">
        {title ?? <T area="common" k="sourcesTitle" />}
      </h2>
      <ul className="mt-2 space-y-2">
        {sources.map((ref) => {
          const source = getSourceById(ref.source);
          return (
            <li key={`${ref.source}-${ref.retrieved}`} className="text-sm">
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
