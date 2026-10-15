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
  variant = "icon",
}: {
  href: string;
  publisher: string;
  retrieved?: string | null;
  className?: string;
  /** Icon is the chain glyph; text is the publisher name, for rows that already name the kind. */
  variant?: "icon" | "text";
}) {
  const title = publisher || new URL(href).host;
  if (variant === "text") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        className={`text-xs text-ink-faint underline-offset-2 hover:underline ${className}`.trim()}
      >
        {title}
      </a>
    );
  }
  return <SourceIcon href={href} title={title} retrieved={retrieved} className={className} />;
}
