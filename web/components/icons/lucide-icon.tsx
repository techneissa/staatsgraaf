import { createElement } from "react";
import type { IconNode } from "lucide";

/**
 * A static Lucide icon drawn from the `lucide` data package, the same data the
 * morphing icons use, so the site has one icon family. Decorative only: always
 * aria-hidden, stroke in the current text colour. Renders on the server and
 * ships no script.
 */
export function LucideIcon({
  icon,
  size = 18,
  strokeWidth = 1.75,
  className,
}: {
  icon: IconNode;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {icon.map(([tag, attrs], index) => createElement(tag, { key: index, ...attrs }))}
    </svg>
  );
}
