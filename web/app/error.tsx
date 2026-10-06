"use client";

import { useEffect } from "react";
import { T } from "@/components/i18n/t";
import { isChunkLoadError } from "@/lib/chunk-error";

/**
 * What a page shows when it fails to render: a message and a way out, instead
 * of an empty column. A failure to load a script file (a tab left open across
 * a deploy) reloads by itself once; otherwise the reader chooses.
 */
export default function PageError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (isChunkLoadError(error.message)) {
      try {
        if (window.sessionStorage.getItem("staatsgraaf.chunk-reload-page") === null) {
          window.sessionStorage.setItem("staatsgraaf.chunk-reload-page", "1");
          window.location.reload();
        }
      } catch {
        // Storage blocked: leave the message and the button.
      }
    }
  }, [error]);
  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        <T area="common" k="errorTitle" />
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        <T area="common" k="errorBody" />
      </p>
      <p className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="tap-target inline-flex min-h-11 items-center rounded-sm bg-accent px-4 text-sm font-semibold text-accent-ink transition-fast hover:brightness-110"
        >
          <T area="common" k="errorReload" />
        </button>
        <a href="/" className="tap-target inline-flex min-h-11 items-center px-1 text-sm font-medium text-accent-text underline-offset-2 hover:underline">
          <T area="common" k="errorHome" />
        </a>
      </p>
    </>
  );
}
