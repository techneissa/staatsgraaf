"use client";

import { SourceIcon } from "@/components/source-icon";

/**
 * The source of a fact as the shared chain-link icon. The publisher and the
 * retrieval date live in the accessible name and the tooltip. Never removed;
 * only quieted.
 */
export function QuietSource({
  href,
  publisher,
  retrieved,
  className = "",
}: {
  href: string;
  publisher: string;
  retrieved?: string | null;
  className?: string;
}) {
  return <SourceIcon href={href} title={publisher || new URL(href).host} retrieved={retrieved} className={className} />;
}
