"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A small (i) that opens a note, for a remark that belongs to a heading but
 * should not take a line of its own. A native `details`, like the portrait
 * credit (components/entity/credit-text.tsx): Enter, Space and a tap open it,
 * Escape and a press outside close it, and the hit area grows to 44 px on
 * touch without moving the layout. The note opens below the (i) and shifts
 * left as far as needed to stay inside the column.
 */
export function InfoTip({
  label,
  children,
  trigger,
  panelClassName,
}: {
  label: string;
  children: ReactNode;
  /** Replaces the (i). The default is the small information mark. */
  trigger?: ReactNode;
  panelClassName?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  const place = () => {
    const details = ref.current;
    if (!details?.open) return;
    let left = 0;
    let right = document.documentElement.clientWidth;
    for (let node = details.parentElement; node; node = node.parentElement) {
      if (getComputedStyle(node).overflowX !== "visible") {
        const box = node.getBoundingClientRect();
        left = Math.max(left, box.left);
        right = Math.min(right, box.right);
        break;
      }
    }
    const start = details.getBoundingClientRect().left;
    const width = panelRef.current?.offsetWidth ?? 240;
    const overflow = start + width - (right - 8);
    setShift(overflow > 0 ? Math.min(overflow, start - (left + 8)) : 0);
  };

  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !details.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    };
    const onPress = (event: PointerEvent) => {
      if (details.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPress);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPress);
    };
  }, []);

  return (
    <details ref={ref} className="group relative inline-block align-middle" onToggle={place}>
      <summary
        aria-label={label}
        title={label}
        className={
          trigger
            ? "relative flex cursor-pointer list-none items-center gap-1.5 text-[13px] leading-4 text-ink-muted transition-fast hover:text-ink group-open:text-ink pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden"
            : "relative flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-pill text-ink-faint transition-fast hover:text-ink group-open:text-ink pointer-coarse:after:absolute pointer-coarse:after:-inset-3 pointer-coarse:after:content-[''] [&::-webkit-details-marker]:hidden"
        }
      >
        {trigger ?? (
          <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 7.2v4M8 4.9v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </summary>
      <div
        ref={panelRef}
        style={{ left: -shift }}
        className={`absolute z-30 max-w-[calc(100vw-2rem)] rounded-md border border-line bg-surface p-2.5 text-xs font-normal leading-snug tracking-normal text-ink-muted shadow-lg ${
          trigger ? "top-full mt-1 w-72" : "top-6 w-60"
        } ${panelClassName ?? ""}`.trim()}
      >
        {children}
      </div>
    </details>
  );
}
