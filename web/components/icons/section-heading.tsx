import type { ReactNode } from "react";
import type { IconNode } from "lucide";
import { LucideIcon } from "./lucide-icon";

/**
 * The h2 of a section on the About, dataset, privacy and accessibility pages,
 * with a small decorative icon in muted ink before the text.
 */
export function SectionHeading({ id, icon, children }: { id: string; icon: IconNode; children: ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
      <LucideIcon icon={icon} size={18} className="shrink-0 text-ink-muted" />
      <span className="min-w-0">{children}</span>
    </h2>
  );
}
