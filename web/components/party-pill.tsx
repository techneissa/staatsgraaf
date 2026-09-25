import Link from "next/link";
import { partyByDataset, partySlug } from "@/lib/parties";

/**
 * A party or fractie name as a pill in the party's own colour: a dot, a
 * tinted fill and border, linked to the party page. Parties without a
 * recorded colour (dissolved parties, splinter groups) get a neutral pill,
 * and names that match no party record stay plain text.
 */
export function PartyPill({ party, className = "" }: { party: string | null | undefined; className?: string }) {
  if (!party) return null;
  const record = partyByDataset(party);
  const color = record?.color ?? null;
  const style = color
    ? {
        backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
        borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
      }
    : undefined;
  const body = (
    <>
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color ?? "var(--t-color-line-strong)" }}
      />
      <span className="truncate">{party}</span>
    </>
  );
  const base = `inline-flex max-w-full items-center gap-1.5 rounded-pill border border-line px-2 py-0.5 text-[11px] font-medium leading-tight text-ink ${className}`.trim();
  if (!record) return <span className={base}>{body}</span>;
  return (
    <Link
      href={`/partijen/${partySlug(record)}/`}
      className={`${base} transition-fast hover:brightness-125`}
      style={style}
    >
      {body}
    </Link>
  );
}
