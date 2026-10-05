import type { ReactNode } from "react";

/**
 * A fact group card: one bounded, bordered block with an icon, a title and
 * a count, containing chips, seat cards, or a timeline.
 */
export function FactGroup({
  icon,
  title,
  href,
  hrefLabel,
  count,
  children,
  className = "",
  plain = false,
  id,
}: {
  icon?: ReactNode;
  title: ReactNode;
  href?: string;
  hrefLabel?: string;
  count?: number;
  children: ReactNode;
  className?: string;
  /** No card border: a titled section inside another panel. */
  plain?: boolean;
  /** Anchor id for in-page links. */
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-label={typeof title === "string" ? title : undefined}
      className={`scroll-mt-4 ${plain ? "" : "rounded-md border border-line bg-surface p-4"} ${className}`.trim()}
    >
      <h2 className="flex items-center justify-between gap-2 text-sm font-semibold tracking-tight text-ink">
        <span className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span aria-hidden="true" className="shrink-0 text-accent-text">
              {icon}
            </span>
          ) : null}
          <span className="truncate">{title}</span>
          {count !== undefined ? (
            <span className="font-normal tabular-nums text-ink-faint">({count})</span>
          ) : null}
        </span>
        {href ? (
          <a
            href={href}
            className="shrink-0 text-xs font-medium text-accent-text underline-offset-2 hover:underline"
          >
            {hrefLabel}
          </a>
        ) : null}
      </h2>
      <div className={plain ? "mt-1.5" : "mt-3"}>{children}</div>
    </section>
  );
}
