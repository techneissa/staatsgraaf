"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link as LinkGlyph } from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { useLocale } from "@/components/i18n/language-provider";
import { useDict } from "@/components/i18n/use-t";
import { formatDateIn } from "@/lib/format";

/** One source as the icon needs it: where it points, what it is called, when it was fetched. */
export type SourceIconItem = {
  href: string;
  /** The source title, or the publisher when no title is on record. */
  title: string;
  retrieved?: string | null;
};

/**
 * The muted chain glyph plus the invisible 44 px touch box. The glyph stays
 * small; on a coarse pointer an absolutely placed box grows the hit area
 * without moving the layout.
 */
const ICON_LINK =
  "relative -m-0.5 inline-flex shrink-0 items-center justify-center rounded-xs p-0.5 align-[-0.2em] text-ink-faint transition-fast hover:text-accent-text focus-visible:text-accent-text pointer-coarse:after:absolute pointer-coarse:after:-inset-3.5 pointer-coarse:after:content-['']";

function useSourceLabel() {
  const t = useDict("common");
  const locale = useLocale();
  return (item: SourceIconItem) =>
    item.retrieved
      ? t("sourceIconLabelRetrieved", { title: item.title, date: formatDateIn(item.retrieved, locale, "long") })
      : t("sourceIconLabel", { title: item.title });
}

/**
 * A source as a small chain-link icon that opens the source in a new tab. The
 * accessible name and the tooltip both read "Bron: <title>", with the
 * retrieval date when known. Every fact keeps its reachable source; only the
 * text is gone.
 */
export function SourceIcon({
  href,
  title,
  retrieved,
  size = 15,
  className = "",
  label: labelOverride,
}: SourceIconItem & {
  size?: number;
  className?: string;
  /** A ready accessible name, for cards that render in a fixed language other than the site's. */
  label?: string;
}) {
  const computed = useSourceLabel()({ href, title, retrieved });
  const label = labelOverride ?? computed;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`${ICON_LINK} ${className}`.trim()}
    >
      <LucideIcon icon={LinkGlyph} size={size} strokeWidth={1.9} />
    </a>
  );
}

/**
 * Several sources for one fact. Up to `max` show as icons side by side; more
 * collapse into one icon with a count badge that opens a small list.
 */
export function SourceIcons({
  sources,
  max = 3,
  className = "",
}: {
  sources: SourceIconItem[];
  max?: number;
  className?: string;
}) {
  const unique = sources.filter((item, index) => sources.findIndex((other) => other.href === item.href) === index);
  if (unique.length === 0) return null;
  if (unique.length <= max) {
    return (
      <span className={`inline-flex items-center gap-1.5 pointer-coarse:gap-4 ${className}`.trim()}>
        {unique.map((item) => (
          <SourceIcon key={item.href} {...item} />
        ))}
      </span>
    );
  }
  return <SourceIconMenu sources={unique} className={className} />;
}

function SourceIconMenu({ sources, className }: { sources: SourceIconItem[]; className: string }) {
  const t = useDict("common");
  const label = useSourceLabel();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const name = t("sourcesCountLabel", { n: sources.length });
  return (
    <span ref={root} className={`relative inline-flex ${className}`.trim()}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={name}
        title={name}
        onClick={() => setOpen((value) => !value)}
        className={`${ICON_LINK} gap-0.5`}
      >
        <LucideIcon icon={LinkGlyph} size={15} strokeWidth={1.9} />
        <span aria-hidden="true" className="text-[10px] font-semibold leading-none tabular-nums">
          {sources.length}
        </span>
      </button>
      {open ? (
        <ul
          id={listId}
          className="absolute start-0 top-full z-50 mt-1.5 w-max max-w-[18rem] space-y-0.5 rounded-md border border-line bg-surface-raised p-1.5 text-xs shadow-lg"
        >
          {sources.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                title={label(item)}
                className="flex min-h-8 items-center gap-1.5 rounded-xs px-1.5 py-1 text-ink-muted hover:bg-surface-inset hover:text-accent-text pointer-coarse:min-h-11"
              >
                <LucideIcon icon={LinkGlyph} size={13} strokeWidth={1.9} className="shrink-0 text-ink-faint" />
                <span className="min-w-0 truncate">{item.title}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </span>
  );
}
