"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link as LinkIcon, Share } from "lucide";
import { Morph } from "@/components/icons/morph";
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
  /** True after the first press, so the icon morphs in answer to it and not on load. */
  const [used, setUsed] = useState(false);
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
    setUsed(true);
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
  const chrome = compact
    ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-fast hover:bg-surface-inset hover:text-ink sm:h-8 sm:w-8 pointer-coarse:sm:h-11 pointer-coarse:sm:w-11"
    : "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-line bg-surface px-3 text-sm font-medium text-ink-muted transition-fast hover:border-line-strong hover:text-ink sm:min-h-9";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      className={`${chrome} ${className}`.trim()}
    >
      <Morph icon={status === "copied" ? Check : canShare ? Share : LinkIcon} size={15} strokeWidth={2} still={!used} />
      {compact ? null : (
        <span key={status} className={status === "idle" ? undefined : "motion-swap"}>
          {shown}
        </span>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {status === "idle" ? "" : shown}
      </span>
    </button>
  );
}
