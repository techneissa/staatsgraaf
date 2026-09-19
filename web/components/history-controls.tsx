"use client";

import { useRouter } from "next/navigation";
import { useT } from "./i18n/use-t";

export function HistoryControls() {
  const router = useRouter();
  const t = useT("common");

  return (
    <div className="hidden items-center gap-1 sm:flex">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label={t("backLabel")}
        title={t("backLabel")}
        className="rounded-sm border border-line p-2 text-ink-muted transition-fast hover:border-line-strong hover:text-ink"
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
        aria-label={t("forwardLabel")}
        title={t("forwardLabel")}
        className="rounded-sm border border-line p-2 text-ink-muted transition-fast hover:border-line-strong hover:text-ink"
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
