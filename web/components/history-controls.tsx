"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { navServerSnapshot, navSnapshot, subscribeNav } from "@/lib/nav-history";
import { useT } from "./i18n/use-t";

const BUTTON =
  "tap-target flex items-center justify-center rounded-sm border border-line p-2 text-ink-muted transition-fast hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted";

export function HistoryControls() {
  const router = useRouter();
  const t = useT("common");
  // Back and forward are offered only when the app has an entry to go to
  // (lib/nav-history.ts), so neither button is ever dead.
  const { canBack, canForward } = useSyncExternalStore(subscribeNav, navSnapshot, navServerSnapshot);

  return (
    <div className="hidden items-center gap-1 sm:flex">
      <button
        type="button"
        onClick={() => router.back()}
        disabled={!canBack}
        aria-label={t("backLabel")}
        title={t("backLabel")}
        className={BUTTON}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
          <path
            d="M12.5 4.5 7 10l5.5 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => router.forward()}
        disabled={!canForward}
        aria-label={t("forwardLabel")}
        title={t("forwardLabel")}
        className={BUTTON}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
          <path
            d="M7.5 4.5 13 10l-5.5 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
