"use client";

import { useEffect } from "react";
import { isChunkLoadError, shouldReloadForChunkError } from "@/lib/chunk-error";

const KEY = "staatsgraaf.chunk-reload";

/**
 * A tab left open across a deploy still points at script files that no longer
 * exist, so the next click loads nothing and the page seems to hang or comes
 * up empty. When a script file fails to load, reload once to pick up the new
 * build (and not again within 30 seconds, so a file that is truly missing
 * cannot loop). It renders nothing.
 */
export function NavRecovery() {
  useEffect(() => {
    const recover = (message: unknown) => {
      if (!isChunkLoadError(message)) return;
      let last: number | null = null;
      try {
        const stored = window.sessionStorage.getItem(KEY);
        last = stored === null ? null : Number(stored);
        if (shouldReloadForChunkError(last, Date.now())) window.sessionStorage.setItem(KEY, String(Date.now()));
        else return;
      } catch {
        // Storage blocked: reload only when nothing says we just did.
      }
      window.location.reload();
    };
    const onError = (event: ErrorEvent) => recover(event.message || (event.error as Error | undefined)?.message);
    const onRejection = (event: PromiseRejectionEvent) => recover((event.reason as Error | undefined)?.message ?? String(event.reason));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
