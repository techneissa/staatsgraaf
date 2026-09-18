import Link from "next/link";
import type { ReactNode } from "react";
import { entityHref, getPersonById } from "./data";
import { getMediaItem, personPortraitId } from "./entity";

const ENTITY_TAG = /<entity id="([^"]+)">([^<]*)<\/entity>/g;

/** Portrait URL for a person entity id, so a mention can carry a face. */
function personPortraitUrl(id: string): string | null {
  if (!id.startsWith("person:")) return null;
  const person = getPersonById(id);
  if (!person) return null;
  return getMediaItem(personPortraitId(person))?.url ?? null;
}

export function renderSummaryMarkup(markup: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of markup.matchAll(ENTITY_TAG)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(markup.slice(cursor, index));
    const [, id, label] = match;
    const href = entityHref(id);
    if (href !== null) {
      const portraitUrl = personPortraitUrl(id);
      nodes.push(
        <Link
          key={`${id}-${index}`}
          href={href}
          className="text-accent-text underline-offset-2 hover:underline"
        >
          {portraitUrl !== null ? (
            <img
              src={portraitUrl}
              alt=""
              width={16}
              height={16}
              loading="lazy"
              className="mr-1 inline-block h-4 w-4 rounded-pill border border-line object-cover align-[-0.15em]"
            />
          ) : null}
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
