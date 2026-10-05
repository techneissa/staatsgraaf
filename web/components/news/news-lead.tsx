"use client";

import { useId, useState, type ReactNode } from "react";
import { clampLead, clampLeadMarkup, leadSegments } from "@/lib/news-text";
import type { PeekKind } from "@/lib/peek";

/** A lead is cut at a sentence or a word beyond this many characters; the reader can open the rest. */
export const LEAD_COLLAPSED_MAX = 200;
/** The most an opened lead shows, cut at a sentence, so one card never becomes a wall of text. */
export const LEAD_EXPANDED_MAX = 1500;

/** Underline colour per kind, the same palette as the peek links. Static strings so Tailwind generates them. */
const DECORATION: Record<PeekKind, string> = {
  person: "decoration-[var(--kind-person)]",
  organization: "decoration-[var(--kind-organization)]",
  position: "decoration-[var(--kind-position)]",
  topic: "decoration-[var(--kind-topic)]",
  place: "decoration-[var(--kind-place)]",
};

type EntityFor = (id: string) => { href: string; kind: PeekKind } | null;

/**
 * The lead of a card, cut at a sentence or a word and never mid-word (NW-21), with a
 * button that opens the rest. Mentions in the lead are not a second tab stop (NW-18): the
 * "Mentioned" line of the card holds the keyboard link for every entity, so the first
 * mention in the text is a pointer-only peek link (`tabIndex=-1`) and repeats are plain
 * text. The peek still opens from the text, because it listens on `a[data-peek]`.
 */
export function NewsLead({
  markup,
  plain,
  entityFor,
  lang,
  className,
  moreLabel,
  lessLabel,
}: {
  markup: string | null;
  plain: string | null;
  entityFor: EntityFor;
  lang: string;
  className?: string;
  moreLabel: string;
  lessLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const source = markup ?? plain ?? "";
  const collapsed = markup !== null ? clampLeadMarkup(markup, LEAD_COLLAPSED_MAX) : { markup: "", clamped: false };
  const collapsedPlain = markup === null ? clampLead(plain ?? "", LEAD_COLLAPSED_MAX) : { text: "", clamped: false };
  const clamped = collapsed.clamped || collapsedPlain.clamped;
  const shown = open
    ? markup !== null
      ? clampLeadMarkup(markup, LEAD_EXPANDED_MAX).markup
      : clampLead(plain ?? "", LEAD_EXPANDED_MAX).text
    : markup !== null
      ? collapsed.markup
      : collapsedPlain.text;

  const nodes: ReactNode[] =
    markup !== null
      ? leadSegments(shown).map((segment, index) => {
          if (segment.type === "text") return segment.text;
          const entity = segment.first ? entityFor(segment.id) : null;
          if (!entity) return segment.text;
          return (
            <a
              key={index}
              href={entity.href}
              tabIndex={-1}
              data-peek={segment.id}
              data-peek-kind={entity.kind}
              aria-haspopup="dialog"
              className={`text-ink underline decoration-1 underline-offset-[3px] transition-fast hover:decoration-2 ${DECORATION[entity.kind]}`}
            >
              {segment.text}
            </a>
          );
        })
      : [shown];

  if (source === "") return null;
  return (
    <div className={className}>
      <p id={bodyId} lang={lang} className="text-sm leading-normal text-ink-muted">
        {nodes}
      </p>
      {clamped ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((value) => !value)}
          className="relative -ms-1 mt-0.5 inline-flex min-h-6 items-center rounded-sm px-1 text-xs font-medium text-accent-text underline-offset-2 hover:underline pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-2.5 pointer-coarse:after:content-['']"
        >
          {open ? lessLabel : moreLabel}
        </button>
      ) : null}
    </div>
  );
}
