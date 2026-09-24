import Link from "next/link";
import { T } from "@/components/i18n/t";
import { SITE_NAME } from "@/lib/site";

export function BrandLockup() {
  return (
    <Link href="/" className="tap-row flex shrink-0 items-center gap-2 rounded-sm sm:gap-2.5">
      <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" className="shrink-0">
        <circle cx="10" cy="10" r="8.5" fill="none" stroke="var(--t-color-line-strong)" strokeWidth="1" />
        <path
          d="M10 10 L10 3.5 M10 10 L15.6 13.2 M10 10 L4.4 13.2"
          stroke="var(--t-color-accent)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="10" cy="10" r="2.2" fill="var(--t-color-accent)" />
        <circle cx="10" cy="3.5" r="1.3" fill="var(--t-color-ink-muted)" />
        <circle cx="15.6" cy="13.2" r="1.3" fill="var(--t-color-ink-muted)" />
        <circle cx="4.4" cy="13.2" r="1.3" fill="var(--t-color-ink-muted)" />
      </svg>
      <span className="text-sm font-semibold tracking-tight text-ink">{SITE_NAME}</span>
      <span className="hidden whitespace-nowrap rounded-pill border border-line px-2 py-0.5 text-xs text-ink-muted sm:inline">
        <T area="pages" k="scopeLabel" />
      </span>
    </Link>
  );
}
