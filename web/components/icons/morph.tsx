"use client";

import { MorphIcon } from "morphicons/react";
import type { IconNode } from "lucide";

/**
 * A decorative icon that morphs when `icon` changes, for controls where one
 * state turns into another (menu to close, sun to moon, share to check).
 * Honours prefers-reduced-motion: the morph becomes an instant swap. Pass
 * `still` to swap without animating, for state that settles on page load.
 * The size is fixed, so the swap never moves the layout.
 */
export function Morph({
  icon,
  size = 16,
  strokeWidth = 2,
  still = false,
  className = "shrink-0",
}: {
  icon: IconNode;
  size?: number;
  strokeWidth?: number;
  still?: boolean;
  className?: string;
}) {
  return (
    <MorphIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      spring="snappy"
      reducedMotion={still ? "always" : "user"}
      className={className}
      aria-hidden="true"
      focusable="false"
    />
  );
}
