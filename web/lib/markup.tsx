import Link from "next/link";
import type { ReactNode } from "react";
import { entityHref } from "./data";

const ENTITY_TAG = /<entity id="([^"]+)">([^<]*)<\/entity>/g;

export function renderSummaryMarkup(markup: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of markup.matchAll(ENTITY_TAG)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(markup.slice(cursor, index));
    const [, id, label] = match;
    const href = entityHref(id);
    if (href !== null) {
      nodes.push(
        <Link
          key={`${id}-${index}`}
          href={href}
          className="text-accent-text underline-offset-2 hover:underline"
        >
          {label}
        </Link>,
      );
    } else {
      nodes.push(label);
    }
    cursor = index + match[0].length;
  }
  if (cursor < markup.length) nodes.push(markup.slice(cursor));
  return nodes;
}
