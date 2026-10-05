import type { ReactNode } from "react";
import { T } from "@/components/i18n/t";

/**
 * An external link in the page header or a note: the look of SourceLink with
 * a 44 px tall target on touch screens, so Wikipedia, the official website and
 * the sources are as easy to hit as any row.
 */
export function ExternalLink({ href, children, meta }: { href: string; children: ReactNode; meta?: ReactNode }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-accent-text underline-offset-2 hover:underline pointer-coarse:min-h-11"
      >
        <span>{children}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" width="12" height="12" className="shrink-0">
          <path d="M6 14 14 6M8 6h6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">
          {" "}
          <T area="common" k="opensNewTab" />
        </span>
      </a>
      {meta ? <span className="text-xs text-ink-faint">{meta}</span> : null}
    </span>
  );
}
