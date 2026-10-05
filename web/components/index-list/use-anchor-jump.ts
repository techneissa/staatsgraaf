"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Jumps to a group heading by id. Before the whole list has arrived the
 * heading may not exist yet; the jump then waits for the next render (`deps`)
 * that has it. Headings stay in the DOM when their rows are not mounted, so
 * the jump lands even when the group sits far down the page.
 */
export function useAnchorJump(deps: unknown) {
  const pending = useRef<string | null>(null);
  const jump = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ block: "start" });
    else pending.current = id;
  }, []);
  useEffect(() => {
    if (pending.current === null) return;
    const target = document.getElementById(pending.current);
    if (!target) return;
    pending.current = null;
    target.scrollIntoView({ block: "start" });
  }, [deps]);
  return jump;
}
