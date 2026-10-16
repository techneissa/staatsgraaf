import type { CSSProperties, ReactNode } from "react";
import { entitySummary, getOrganizationById } from "@/lib/data";
import { orgEnGloss, positionEn } from "@/lib/name-gloss";
import { peekKindFor } from "@/lib/peek";
import { LocalizedEntityLabel } from "./localized-entity-label";
import { PeekLink, type PeekLinkVariant } from "./peek-link";

/**
 * Server helper: a PeekLink for an entity id, with the href, the Dutch name
 * and the kind resolved from the dataset. In English the established gloss
 * (ADR 0012) replaces the Dutch position or organisation name when one
 * exists; person names stay Dutch. Renders the fallback (or the plain name)
 * when the id does not resolve, so a missing record never becomes a broken
 * link.
 */
export function EntityPeekLink({
  id,
  children,
  variant = "inline",
  glyph = false,
  className,
  fallback,
  style,
  peek = true,
}: {
  id: string;
  children?: ReactNode;
  variant?: PeekLinkVariant;
  glyph?: boolean;
  className?: string;
  style?: CSSProperties;
  fallback?: ReactNode;
  /** False on a list that is for navigating: a plain link, no peek (see PeekLink). */
  peek?: boolean;
}) {
  const summary = entitySummary(id);
  const subtype = id.startsWith("org:") ? (getOrganizationById(id)?.subtype ?? null) : null;
  const kind = peekKindFor(id, subtype);
  if (summary === null || kind === null) return <>{fallback ?? children ?? null}</>;
  const english =
    children === undefined && (kind === "organization" || kind === "position")
      ? kind === "organization"
        ? orgEnGloss(summary.label)
        : positionEn(summary.label)
      : null;
  return (
    <PeekLink
      id={id}
      href={summary.href}
      kind={kind}
      variant={variant}
      glyph={glyph}
      className={className}
      style={style}
      peek={peek}
      lang={english || children !== undefined ? undefined : "nl"}
      title={english ? summary.label : undefined}
    >
      {children ?? (english ? <LocalizedEntityLabel dutch={summary.label} english={english} /> : summary.label)}
    </PeekLink>
  );
}
