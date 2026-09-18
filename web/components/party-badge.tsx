import type { ReactNode } from "react";
import Link from "next/link";
import { partyByDataset, partySlug } from "@/lib/parties";

type PartyBadgeProps = {
  party: string | null | undefined;
  children?: ReactNode;
};

function shade(hex: string | null): string {
  return hex ?? "var(--t-color-line-strong)";
}

/**
 * Coloured party dot plus the party abbreviation, linked to the party's page
 * under /partijen/, which in turn carries the official site and Wikipedia.
 */
export function PartyBadge({ party, children }: PartyBadgeProps) {
  const record = partyByDataset(party);
  if (!record) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-line"
        style={{ backgroundColor: shade(record.color) }}
      />
      <Link
        href={`/partijen/${partySlug(record)}/`}
        className="underline-offset-2 hover:underline"
      >
        {children ?? record.abbrev}
      </Link>
    </span>
  );
}
