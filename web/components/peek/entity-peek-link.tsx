import type { ReactNode } from "react";
import { entitySummary, getOrganizationById } from "@/lib/data";
import { peekKindFor } from "@/lib/peek";
import { PeekLink, type PeekLinkVariant } from "./peek-link";

/**
 * Server helper: a PeekLink for an entity id, with the href, the Dutch name
 * and the kind resolved from the dataset. Renders the fallback (or the plain
 * name) when the id does not resolve, so a missing record never becomes a
 * broken link.
 */
export function EntityPeekLink({
  id,
  children,
  variant = "inline",
  glyph = false,
  className,
  fallback,
}: {
  id: string;
  children?: ReactNode;
  variant?: PeekLinkVariant;
  glyph?: boolean;
  className?: string;
  fallback?: ReactNode;
}) {
  const summary = entitySummary(id);
  const subtype = id.startsWith("org:") ? (getOrganizationById(id)?.subtype ?? null) : null;
  const kind = peekKindFor(id, subtype);
  if (summary === null || kind === null) return <>{fallback ?? children ?? null}</>;
  return (
    <PeekLink id={id} href={summary.href} kind={kind} variant={variant} glyph={glyph} className={className} lang={children === undefined ? "nl" : undefined}>
      {children ?? summary.label}
    </PeekLink>
  );
}
