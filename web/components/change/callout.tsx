import type { ReactNode } from "react";

/**
 * The one callout style for a notable state, such as an empty seat: an icon,
 * then one line. Calm on purpose: a tinted inset, no alarm colour. Use it for
 * a state a reader should notice, not for explanations.
 */
export function Callout({ icon, children, className = "" }: { icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-md border border-line bg-surface-inset px-3 py-2.5 text-sm leading-snug text-ink [--color-canvas:var(--t-color-surface-inset)] ${className}`.trim()}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
