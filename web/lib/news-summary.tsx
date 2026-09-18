import Link from "next/link";
import type { ReactNode } from "react";

const ENTITY_TAG = /<entity id="([^"]+)">([^<]*)<\/entity>/g;

/**
 * Renders summary markup as text with the entity mentions as links. Pure: the
 * href for every entity id comes from a lookup the caller provides (the resolved
 * news view already carries the entity hrefs), so no data registry is needed
 * and the function is safe inside the client explorer.
 */
export function renderSummaryMarkupWithHrefs(
  markup: string,
  hrefFor: (id: string) => string | null,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  let match: RegExpExecArray | null;
  ENTITY_TAG.lastIndex = 0;
  while ((match = ENTITY_TAG.exec(markup)) !== null) {
    if (match.index > cursor) nodes.push(markup.slice(cursor, match.index));
    const href = hrefFor(match[1]);
    nodes.push(
      href ? (
        <Link
          key={index++}
          href={href}
          className="text-accent-text underline decoration-line underline-offset-2 transition-fast hover:underline"
        >
          {match[2]}
        </Link>
      ) : (
        match[2]
      ),
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < markup.length) nodes.push(markup.slice(cursor));
  return nodes;
}
