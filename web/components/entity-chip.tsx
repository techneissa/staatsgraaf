import Link from "next/link";

export function EntityChip({
  href,
  children,
  meta,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  meta?: string;
  /** A small leading visual, for example a person's portrait. */
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface py-1 pr-3 text-sm text-ink transition-fast hover:border-line-strong hover:text-accent-text ${
        icon ? "pl-1" : "pl-3"
      }`}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
      {meta ? <span className="text-xs text-ink-faint">{meta}</span> : null}
    </Link>
  );
}
