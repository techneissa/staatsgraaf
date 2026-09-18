import { T } from "@/components/i18n/t";

export function SkipLink() {
  return (
    <a
      href="#inhoud"
      className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-sm focus:border focus:border-line-strong focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
    >
      <T area="common" k="skipToContent" />
    </a>
  );
}
