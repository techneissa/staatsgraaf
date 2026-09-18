import type { ReactNode } from "react";
import { partyByDataset } from "@/lib/parties";

type PartyBadgeProps = {
  party: string | null | undefined;
  children?: ReactNode;
};

function shade(hex: string | null): string {
  return hex ?? "var(--t-color-line-strong)";
}

/** Coloured party dot plus the party abbreviation, linked to its official site or Wikipedia entry. */
export function PartyBadge({ party, children }: PartyBadgeProps) {
  const record = partyByDataset(party);
  if (!record) return null;
  const href = record.website ?? record.wiki;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-line"
        style={{ backgroundColor: shade(record.color) }}
      />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          {children ?? record.abbrev}
        </a>
      ) : (
        <span>{children ?? record.abbrev}</span>
      )}
    </span>
  );
}
