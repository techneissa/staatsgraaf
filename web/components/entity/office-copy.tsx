import type { ReactNode } from "react";
import { T } from "@/components/i18n/t";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";

const TOKEN = /<(entity|law) ([^>]+)>([^<]*)<\/\1>/g;

const LAW_LINK =
  "relative text-accent-text underline decoration-1 underline-offset-[3px] transition-fast hover:decoration-2 pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-3.5 pointer-coarse:after:content-['']";

function attrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of raw.matchAll(/(\w+)="([^"]*)"/g)) {
    out[match[1]] = match[2];
  }
  return out;
}

/**
 * Office-copy markup as running text: entities peek, law articles open the
 * wetten.overheid.nl permalink. Parsed, never injected as HTML.
 */
export function renderOfficeCopyMarkup(markup: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN.exec(markup)) !== null) {
    if (match.index > cursor) nodes.push(markup.slice(cursor, match.index));
    const fields = attrs(match[2]);
    const text = match[3];
    if (match[1] === "entity" && fields.id) {
      nodes.push(
        <EntityPeekLink key={index++} id={fields.id}>
          {text}
        </EntityPeekLink>,
      );
    } else if (match[1] === "law" && fields.href) {
      nodes.push(
        <a key={index++} href={fields.href} target="_blank" rel="noopener noreferrer" className={LAW_LINK}>
          {text}
          <span className="sr-only">
            {" "}
            <T area="common" k="opensNewTab" />
          </span>
        </a>,
      );
    } else {
      nodes.push(text);
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < markup.length) nodes.push(markup.slice(cursor));
  return nodes;
}
