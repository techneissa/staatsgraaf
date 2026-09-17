import type { ReactNode } from "react";

type KindBadgeProps = {
  children: ReactNode;
  tone?: "accent" | "neutral";
};

export function KindBadge({ children, tone = "neutral" }: KindBadgeProps) {
  const toneClass =
    tone === "accent"
      ? "border-accent/40 bg-accent-soft text-accent-text"
      : "border-line bg-surface-raised text-ink-muted";
  return (
    <span
      className={`inline-flex items-center rounded-pill border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${toneClass}`}
    >
      {children}
    </span>
  );
}
