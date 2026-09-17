import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-line bg-surface-inset p-5 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-prose text-sm text-ink-faint">{description}</p>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
