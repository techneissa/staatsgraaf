import type { NewsPreview } from "./news-view";
import type { PublisherKind } from "@/lib/types";

/**
 * Outlet kinds that carry the accent tint on a monogram tile. Everything else
 * uses the neutral inset surface, so the tiles stay quiet in a long list.
 */
const ACCENT_KINDS: ReadonlySet<PublisherKind> = new Set(["publieke-omroep", "overheid"]);

/**
 * The square preview tile of a news card. Pure: it renders the resolved
 * preview and touches no data. Credits stay with the image (a visible caption
 * is rendered by the card so it sits next to the tile as docs/12 requires).
 */
export function NewsPreviewTile({
  preview,
  size = 64,
  className = "",
  rounded = "lg",
}: {
  preview: NewsPreview;
  size?: number;
  className?: string;
  rounded?: "sm" | "md" | "lg";
}) {
  const roundedClass = { sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg" }[rounded];
  const frame = `shrink-0 overflow-hidden ${roundedClass} border border-line ${className}`.trim();
  if (preview.kind === "image" || preview.kind === "portrait") {
    return (
      <span className={`${frame} bg-surface-raised`} style={{ width: size, height: size }}>
        <img
          src={preview.url}
          alt={preview.kind === "portrait" ? preview.personLabel : ""}
          title={preview.caption}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </span>
    );
  }
  const tone = ACCENT_KINDS.has(preview.publisherKind)
    ? "bg-accent-soft text-accent-text"
    : "bg-surface-inset text-ink-muted";
  return (
    <span
      aria-hidden="true"
      title={preview.publisher}
      className={`${frame} ${tone} flex items-center justify-center font-semibold tracking-wide`}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size / 3.6)) }}
    >
      {preview.monogram}
    </span>
  );
}

/** The credit line for a preview, or null when the tile is a monogram. */
export function newsPreviewCaption(preview: NewsPreview): string | null {
  return preview.kind === "monogram" ? null : preview.caption;
}
