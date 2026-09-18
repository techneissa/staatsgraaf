import { SourceLink } from "./source-link";
import { getSourceById } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { SourceRef } from "@/lib/types";

export function SourceList({ sources, title = "Bronnen" }: { sources: SourceRef[]; title?: string }) {
  if (sources.length === 0) return null;
  return (
    <section aria-labelledby="bronnen-titel" className="mt-6">
      <h2 id="bronnen-titel" className="text-sm font-semibold text-ink">
        {title}
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
                      {source.publisher}, {formatDate(source.retrieved)}
                    </>
                  }
                >
                  {source.title}
                </SourceLink>
              ) : (
                <span className="text-ink-faint">Onbekende bron ({ref.source})</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
