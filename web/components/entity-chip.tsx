import Link from "next/link";

export function EntityChip({
  href,
  children,
  meta,
}: {
  href: string;
  children: React.ReactNode;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1 text-sm text-ink transition-fast hover:border-line-strong hover:text-accent-text"
    >
      <span>{children}</span>
      {meta ? <span className="text-xs text-ink-faint">{meta}</span> : null}
    </Link>
  );
}
