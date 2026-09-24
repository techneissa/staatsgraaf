"use client";

import { useEffect, useState } from "react";

/**
 * True from just after mount. Motion that answers a change (a tab panel
 * fading in, a filtered item arriving) is gated on it through a
 * `data-settled` attribute, so the first render of a page, and a client-side
 * navigation to it, show the content at rest instead of animating it in.
 */
export function useSettled(): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return settled;
}
