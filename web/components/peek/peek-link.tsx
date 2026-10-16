import type { CSSProperties, ReactNode } from "react";
import { KindGlyph } from "@/components/kind-glyph";
import type { PeekKind } from "@/lib/peek";

/**
 * Underline colour per kind. Static class strings so Tailwind generates them.
 */
const DECORATION: Record<PeekKind, string> = {
  person: "decoration-[var(--kind-person)]",
  organization: "decoration-[var(--kind-organization)]",
  position: "decoration-[var(--kind-position)]",
  topic: "decoration-[var(--kind-topic)]",
  place: "decoration-[var(--kind-place)]",
};

export type PeekLinkVariant = "inline" | "quiet" | "plain" | "bare" | "tinted" | "media";

const VARIANT: Record<PeekLinkVariant, string> = {
  /** Running text: ink text, a kind-coloured underline that thickens on hover. */
  inline: "text-ink underline decoration-1 underline-offset-[3px] hover:decoration-2",
  /** Secondary lines (mentioned, meta): muted text that turns ink on hover. */
  quiet: "text-ink-muted underline decoration-1 underline-offset-[3px] hover:text-ink hover:decoration-2",
  /** Titles and list rows: no underline until hover. */
  plain: "text-ink no-underline hover:underline decoration-1 underline-offset-[3px]",
  /** Connection-tree names: clickable, never underlined. Accent on hover is the hint. */
  bare: "text-ink no-underline hover:no-underline hover:text-accent-text",
  /** Like bare, but the caller sets the colour (a branch or kind token). */
  tinted: "no-underline hover:no-underline hover:!text-accent-text",
  /** A portrait or other media: no underline, a ring on hover. */
  media:
    "relative inline-flex shrink-0 self-start rounded-pill no-underline hover:no-underline hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus pointer-coarse:after:absolute pointer-coarse:after:-inset-1.5 pointer-coarse:after:content-['']",
};

/**
 * An internal entity link that opens a peek popover on click
 * (components/peek/peek-provider.tsx) and navigates like any link when
 * JavaScript is off or the reader holds cmd, ctrl, shift or uses the middle
 * button. A plain anchor on purpose: server components can render thousands of
 * them without a client component each, and the one delegated listener in the
 * provider handles them all.
 */
export function PeekLink({
  id,
  href,
  kind,
  children,
  variant = "inline",
  glyph = false,
  className = "",
  lang,
  title,
  style,
  peek = true,
}: {
  id: string;
  href: string;
  kind: PeekKind;
  children: ReactNode;
  variant?: PeekLinkVariant;
  /** Show the kind glyph before the text. */
  glyph?: boolean;
  className?: string;
  lang?: string;
  title?: string;
  style?: CSSProperties;
  /**
   * False on an index or list whose purpose is navigation: the link then goes
   * straight to the page, with no peek (ADR 0017; index lists navigate, decision EN-15 of 05-10-2026). The peek stays for
   * entity mentions in running text, news and tables.
   */
  peek?: boolean;
}) {
  return (
    <a
      href={href}
      data-peek={peek ? id : undefined}
      data-peek-kind={peek ? kind : undefined}
      aria-haspopup={peek ? "dialog" : undefined}
      lang={lang}
      title={title}
      style={style}
      className={`${VARIANT[variant]} ${variant === "media" || variant === "tinted" ? "" : DECORATION[kind]} transition-fast ${className}`.trim()}
    >
      {glyph ? <KindGlyph kind={kind} size={7} className="mr-1 align-[0.05em]" /> : null}
      {children}
    </a>
  );
}
