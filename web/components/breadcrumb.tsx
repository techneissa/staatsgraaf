import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Kruimelpad">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-x-2">
              {item.href !== undefined && !isLast ? (
                <Link
                  href={item.href}
                  className="underline-offset-2 hover:text-ink hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
              )}
              {!isLast ? (
                <span aria-hidden="true" className="text-ink-faint">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
