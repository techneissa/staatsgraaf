"use client";

import { useState } from "react";
import type { NewsPreview } from "./news-view";
import type { PublisherKind } from "@/lib/types";
import { newsMonogram } from "@/lib/news-preview";

/**
 * Outlet kinds that carry the accent tint on a monogram tile. Everything else
 * uses the neutral inset surface, so the tiles stay quiet in a long list.
 */
const ACCENT_KINDS: ReadonlySet<PublisherKind> = new Set(["publieke-omroep", "overheid"]);

type TileSize = "sm" | "md" | "lg";

/**
 * Responsive tile boxes: small on phones, larger on wider screens, so the
 * preview reads like the reference product instead of a stamp. The inline
 * style is only used by the fixed-size callers; responsive callers get classes.
 */
const RESPONSIVE_FRAMES: Record<TileSize, string> = {
  sm: "h-14 w-14 sm:h-20 sm:w-20",
  md: "h-16 w-16 sm:h-24 sm:w-24",
  lg: "h-20 w-20 sm:h-28 sm:w-28",
};

const RESPONSIVE_MONOGRAM: Record<TileSize, string> = {
  sm: "text-xs sm:text-base",
  md: "text-sm sm:text-xl",
  lg: "text-base sm:text-2xl",
};

/**
 * The square preview tile of a news card. A client component so a remote image
 * that fails to load (hotlink protection, expiry, ad blocker) degrades to the
 * outlet monogram on our own tokens instead of a blank frame (adr/0010:
 * "an unreadable image degrades to an empty tile" is upgraded to this
 * fallback). Credits stay with the image: a visible caption is rendered by the
 * card so it sits next to the tile as docs/12 requires.
 */
export function NewsPreviewTile({
  preview,
  size = 64,
  className = "",
  rounded = "lg",
  responsive = false,
}: {
  preview: NewsPreview;
  size?: number;
  className?: string;
  rounded?: "sm" | "md" | "lg";
  responsive?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const roundedClass = { sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg" }[rounded];
  const frame = `shrink-0 overflow-hidden ${roundedClass} border border-line ${
    responsive ? RESPONSIVE_FRAMES[rounded] : ""
  } ${className}`.trim();

  if (preview.kind === "image" && !failed) {
    const style = responsive ? undefined : { width: size, height: size };
    return (
      <span className={`${frame} bg-surface-raised`} style={style}>
        <img
          src={preview.url}
          alt=""
          title={preview.caption}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }
  if (preview.kind === "portrait" && !failed) {
    const style = responsive ? undefined : { width: size, height: size };
    return (
      <span className={`${frame} bg-surface-raised`} style={style}>
        <img
          src={preview.url}
          alt={preview.personLabel}
          title={preview.caption}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  // Monogram: either the outlet's own kind, or the fallback for a failed image.
  // A fallback tile is always neutral: it stands for the article, not the outlet.
  const isFallback = preview.kind !== "monogram";
  const publisher =
    preview.kind === "monogram"
      ? preview.publisher
      : preview.kind === "portrait"
        ? preview.personLabel
        : preview.caption;
  const tone =
    !isFallback && ACCENT_KINDS.has(preview.publisherKind)
      ? "bg-accent-soft text-accent-text"
      : "bg-surface-inset text-ink-muted";
  const style = responsive ? undefined : { width: size, height: size, fontSize: Math.max(12, Math.round(size / 3.6)) };
  const monogram = preview.kind === "monogram" ? preview.monogram : newsMonogram(publisher);
  const sizeClass = responsive ? RESPONSIVE_MONOGRAM[rounded] : "";
  return (
    <span
      aria-hidden="true"
      title={publisher || undefined}
      className={`${frame} ${tone} flex items-center justify-center font-semibold tracking-wide ${sizeClass}`}
      style={style}
    >
      {monogram}
    </span>
  );
}

