import type { ReactNode } from "react";

/**
 * A vertical rail that connects the rows of a list; each row hangs its mark
 * (a change glyph or a tenure dot) on the rail. Rows are separated by space
 * and a hairline, not boxes. Each rail segment runs from a row's mark to the
 * next row's mark, so the rail starts and ends on a mark. The segments draw
 * in once and each row fades and rises a few pixels once as it scrolls in;
 * both are off under prefers-reduced-motion (globals.css). Plain markup, safe
 * in server and client components.
 *
 * The mark sits on a small patch of `--rail-bg` (the canvas by default) so
 * the rail does not run through hollow marks; set the variable on a parent
 * with a different background.
 */
export function RailList({
  children,
  label,
  className = "",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <ol aria-label={label} className={`relative ${className}`.trim()}>
      {children}
    </ol>
  );
}

/** Top of the 24 px mark box inside a row, in px; the mark centre is 12 px lower. */
const MARK_TOP = 12;

export function RailItem({
  mark,
  first = false,
  last = false,
  children,
  markTop = MARK_TOP,
  patch = true,
}: {
  mark: ReactNode;
  first?: boolean;
  last?: boolean;
  children: ReactNode;
  /** Top offset of the mark box in px, to line it up with the first text line. */
  markTop?: number;
  /** Put the mark on a canvas patch so the rail does not run through a hollow mark. */
  patch?: boolean;
}) {
  const centre = markTop + 12;
  return (
    <li className="motion-rise relative pl-9" data-reveal="pending">
      {last ? null : (
        <span
          aria-hidden="true"
          className="motion-draw pointer-events-none absolute left-[11.5px] w-px bg-line-strong"
          style={{ top: centre, bottom: -centre }}
          data-reveal="pending"
        />
      )}
      <span
        aria-hidden="true"
        className="absolute left-0 flex h-6 w-6 items-center justify-center"
        style={{ top: markTop }}
      >
        {patch ? <span className="rounded-pill bg-[var(--rail-bg,var(--color-canvas))] p-0.5">{mark}</span> : mark}
      </span>
      <div className={first ? "py-3" : "border-t border-line/60 py-3"}>{children}</div>
    </li>
  );
}
