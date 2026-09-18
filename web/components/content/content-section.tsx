import type { ReactNode } from "react";

type ContentSectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

export function ContentSection({ id, title, children }: ContentSectionProps) {
  return (
    <section aria-labelledby={`${id}-titel`} className="border-b border-line py-6 last:border-b-0">
      <h2 id={`${id}-titel`} className="text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

export function ContentList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 ps-5 marker:text-ink-faint">{children}</ul>;
}
