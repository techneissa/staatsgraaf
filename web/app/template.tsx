import { ViewTransition, type ReactNode } from "react";

/**
 * Wraps every page. A template is created anew on each navigation (unlike the
 * layout around it), so the page's own container is a new element each time
 * instead of one that stays while its contents change. That keeps the
 * persistent shell out of the layout-shift record when a long page, scrolled
 * down, is replaced by another: only new elements arrive, none of them moves.
 * The page cross-fades on navigation and on a language switch (globals.css,
 * "Page transitions"); nothing else on the page takes part.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="sg-page" exit="sg-page" update="sg-page" default="none">
      <div id="sg-page">{children}</div>
    </ViewTransition>
  );
}
