import type { ReactNode } from "react";
import { PeekLink } from "@/components/peek/peek-link";
import type { PeekKind } from "./peek";

const ENTITY_TAG = /<entity id="([^"]+)">([^<]*)<\/entity>/g;

export type SummaryEntity = { href: string; kind: PeekKind };

/**
 * Renders summary markup as text with the entity mentions as inline peek links
 * (docs/adr/0017). Pure: the href and kind for every entity id come from a
 * lookup the caller provides (the resolved news view carries them), so no data
 * registry is needed and the function is safe inside the client explorer.
 * The markup is parsed, never injected as HTML.
 */
export function renderSummaryMarkupWithHrefs(
  markup: string,
  entityFor: (id: string) => SummaryEntity | null,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  let match: RegExpExecArray | null;
  ENTITY_TAG.lastIndex = 0;
  while ((match = ENTITY_TAG.exec(markup)) !== null) {
    if (match.index > cursor) nodes.push(markup.slice(cursor, match.index));
    const entity = entityFor(match[1]);
    nodes.push(
      entity ? (
        <PeekLink key={index++} id={match[1]} href={entity.href} kind={entity.kind}>
          {match[2]}
        </PeekLink>
      ) : (
        match[2]
      ),
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < markup.length) nodes.push(markup.slice(cursor));
  return nodes;
}
