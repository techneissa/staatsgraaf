import { ViewTransition, type ReactNode } from "react";

/**
 * Wraps every page. A template is created anew when the navigation changes
 * the first segment of the address (unlike the layout around it), so moving
 * to another section gives the page a new container instead of one that
 * stays while its contents change. That keeps the persistent shell out of the
 * layout-shift record when a long page, scrolled down, is replaced by
 * another. Within a section (the people index to a person) React keeps the
 * same container and swaps what is in it; code that animates the page
 * (components/swipe-back.tsx) must not assume a fresh element.
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
