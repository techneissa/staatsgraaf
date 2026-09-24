import type { ReactNode } from "react";
import { T } from "@/components/i18n/t";

type SourceLinkProps = {
  href: string;
  children: ReactNode;
  meta?: ReactNode;
  archiveHref?: string | null;
  className?: string;
  /** "quiet" renders a muted link for secondary source lines in dense lists. */
  tone?: "accent" | "quiet";
};

export function SourceLink({
  href,
  children,
  meta,
  archiveHref,
  className = "",
  tone = "accent",
}: SourceLinkProps) {
  const toneClass = tone === "quiet" ? "text-ink-faint hover:text-accent-text" : "text-accent-text";
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`.trim()}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 underline-offset-2 hover:underline ${toneClass}`}
      >
        <span>{children}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" width="12" height="12" className="shrink-0">
          <path
            d="M6 14 14 6M8 6h6v6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr-only">
          {" "}
          <T area="common" k="opensNewTab" />
        </span>
      </a>
      {meta ? <span className="text-xs text-ink-faint">{meta}</span> : null}
      {archiveHref ? (
        <a
          href={archiveHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent-text underline-offset-2 hover:underline"
        >
          <T area="common" k="archiveCopy" />
          <span className="sr-only">
            {" "}
            <T area="common" k="opensNewTab" />
          </span>
        </a>
      ) : null}
    </span>
  );
}
