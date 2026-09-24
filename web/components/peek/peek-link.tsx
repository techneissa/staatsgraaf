import type { ReactNode } from "react";
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

export type PeekLinkVariant = "inline" | "quiet" | "plain";

const VARIANT: Record<PeekLinkVariant, string> = {
  /** Running text: ink text, a kind-coloured underline that thickens on hover. */
  inline: "text-ink underline decoration-1 underline-offset-[3px] hover:decoration-2",
  /** Secondary lines (mentioned, meta): muted text that turns ink on hover. */
  quiet: "text-ink-muted underline decoration-1 underline-offset-[3px] hover:text-ink hover:decoration-2",
  /** Titles and list rows: no underline until hover. */
  plain: "text-ink no-underline hover:underline decoration-1 underline-offset-[3px]",
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
}) {
  return (
    <a
      href={href}
      data-peek={id}
      data-peek-kind={kind}
      aria-haspopup="dialog"
      lang={lang}
      title={title}
      className={`${VARIANT[variant]} ${DECORATION[kind]} transition-fast ${className}`.trim()}
    >
      {glyph ? <KindGlyph kind={kind} size={7} className="mr-1 align-[0.05em]" /> : null}
      {children}
    </a>
  );
}
