import type { ReactNode } from "react";
import { ExternalLink } from "./external-link";
import { T } from "@/components/i18n/t";
import { getSourceById } from "@/lib/data";
import type { SourceRef } from "@/lib/types";

/**
 * A named gap: what the dataset does not hold, said plainly, with the
 * sources the entity does have so the reader can check them. A gap is never
 * filled with a guess.
 */
export function GapNote({
  children,
  sources,
  max = 2,
  className = "",
}: {
  children: ReactNode;
  sources: SourceRef[];
  max?: number;
  className?: string;
}) {
  const seen = new Set<string>();
  const shown = sources
    .map((ref) => getSourceById(ref.source))
    .filter((source): source is NonNullable<typeof source> => {
      if (source === undefined || seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    })
    .slice(0, max);
  return (
    <div
      role="note"
      className={`rounded-md border border-dashed border-line-strong bg-surface px-3 py-2.5 text-sm text-ink-muted ${className}`.trim()}
    >
      <p className="max-w-prose leading-relaxed">{children}</p>
      {shown.length > 0 ? (
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
          <span className="text-ink-faint">
            <T area="entity" k="gapSourceLabel" />
          </span>
          {shown.map((source) => (
            <ExternalLink key={source.url} href={source.url} meta={source.publisher}>
              {source.title}
            </ExternalLink>
          ))}
        </p>
      ) : null}
    </div>
  );
}
