"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { placeAnchored } from "@/lib/place-anchored";

/**
 * A small (i) that opens a note. Native `details`: Enter, Space and a tap
 * open it, Escape and a press outside close it, and the hit area grows to
 * 44 px on touch without moving the layout. The note is portalled and
 * placed with `placeAnchored`, so a parent with overflow-x-hidden cannot
 * clip it, and it flips above the (i) when there is no room below.
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
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  const place = useCallback(() => {
    const details = ref.current;
    const panel = panelRef.current;
    const summary = details?.querySelector("summary");
    if (!details?.open || !panel || !summary) return;
    setBox(
      placeAnchored({
        anchor: summary.getBoundingClientRect(),
        width: panel.offsetWidth,
        height: panel.offsetHeight,
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: window.innerHeight,
      }),
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    place();
  }, [open, place, children]);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, place]);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !details.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    };
    const onPress = (event: PointerEvent) => {
      if (!details.open || !(event.target instanceof Node)) return;
      if (details.contains(event.target) || panelRef.current?.contains(event.target)) return;
      details.open = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPress);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPress);
    };
  }, []);

  const panel =
    open && typeof document !== "undefined" ? (
      <div
        ref={panelRef}
        data-info-tip-panel=""
        role="note"
        style={{
          top: box?.top ?? 0,
          left: box?.left ?? 0,
          maxHeight: box?.maxHeight,
          visibility: box ? "visible" : "hidden",
        }}
        className={`fixed z-50 max-w-[calc(100vw-1rem)] overflow-x-hidden overflow-y-auto break-words rounded-md border border-line bg-surface p-2.5 text-xs font-normal leading-snug tracking-normal text-ink-muted shadow-lg ${
          panelClassName ? "" : trigger ? "w-72" : "w-60"
        } ${panelClassName ?? ""}`.trim()}
      >
        {children}
      </div>
    ) : null;

  return (
    <details ref={ref} className="group relative inline-block align-middle" onToggle={(event) => setOpen(event.currentTarget.open)}>
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
      {panel ? createPortal(panel, document.body) : null}
    </details>
  );
}
