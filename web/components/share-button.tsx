"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/use-t";

type Status = "idle" | "copied" | "failed";

/**
 * Share a page link: the system share sheet where the device has one (iOS,
 * iPadOS, Android), otherwise a copy to the clipboard with a short spoken and
 * visible confirmation. Same-origin URL only; nothing is sent anywhere.
 */
export function ShareButton({
  href,
  title,
  className = "",
  compact = false,
}: {
  /** Site-relative path, for example /personen/dick-schoof/. Defaults to the current page. */
  href?: string;
  title?: string;
  className?: string;
  compact?: boolean;
}) {
  const t = useT("common");
  const [status, setStatus] = useState<Status>("idle");
  const [canShare, setCanShare] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const flash = (next: Status) => {
    setStatus(next);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus("idle"), 2200);
  };

  const onClick = async () => {
    const url = new URL(href ?? window.location.pathname, window.location.origin).toString();
    if (canShare) {
      try {
        await navigator.share({ url, title: title ?? document.title });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("copied");
    } catch {
      flash("failed");
    }
  };

  const label = canShare ? t("shareLink") : t("copyLink");
  const shown = status === "copied" ? t("linkCopied") : status === "failed" ? t("linkCopyFailed") : label;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-line bg-surface px-3 text-sm font-medium text-ink-muted transition-fast hover:border-line-strong hover:text-ink sm:min-h-9 ${className}`.trim()}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" width="15" height="15" className="shrink-0">
        {status === "copied" ? (
          <path d="m4.5 10.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        ) : canShare ? (
          <path
            d="M10 12.5V3.5M6.5 7 10 3.5 13.5 7M5 10.5v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.9-.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {compact ? null : <span>{shown}</span>}
      <span role="status" aria-live="polite" className="sr-only">
        {status === "idle" ? "" : shown}
      </span>
    </button>
  );
}
