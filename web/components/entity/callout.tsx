import type { ReactNode } from "react";

/**
 * The one callout style on the entity pages: a notable status such as an
 * acting office holder, a position without a known holder, or a dissolved
 * body. Use sparingly, at most one or two per page.
 */
export function Callout({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-md border border-accent/30 bg-accent-soft px-3 py-2.5 text-sm text-ink"
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-accent-text">
        {icon ?? (
          <svg viewBox="0 0 16 16" width="16" height="16">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 7.2v4M8 4.9v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
