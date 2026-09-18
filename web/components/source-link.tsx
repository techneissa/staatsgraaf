import type { ReactNode } from "react";

type SourceLinkProps = {
  href: string;
  children: ReactNode;
  meta?: ReactNode;
  archiveHref?: string | null;
  className?: string;
};

export function SourceLink({
  href,
  children,
  meta,
  archiveHref,
  className = "",
}: SourceLinkProps) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`.trim()}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-accent-text underline-offset-2 hover:underline"
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
        <span className="sr-only">(opent in een nieuw tabblad)</span>
      </a>
      {meta ? <span className="text-xs text-ink-faint">{meta}</span> : null}
      {archiveHref ? (
        <a
          href={archiveHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent-text underline-offset-2 hover:underline"
        >
          <span>Archiefkopie</span>
          <span className="sr-only"> (opent in een nieuw tabblad)</span>
        </a>
      ) : null}
    </span>
  );
}
