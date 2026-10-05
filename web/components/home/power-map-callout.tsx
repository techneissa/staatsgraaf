"use client";

import { useT } from "@/components/i18n/use-t";

/**
 * The callout button under a person bubble in the Who's in the news strip. It
 * focuses that person's constellation in the power map canvas without a page
 * load, so the strip of people feeds the connections view.
 */
export function PowerMapCallout({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const t = useT("common");
  return (
    <button
      type="button"
      className="rounded-sm border border-line bg-surface px-2 py-1 text-[11px] font-medium text-accent-text transition-fast hover:bg-surface-inset"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent("staatsgraaf:focus", {
            detail: { slug, title, view: "power" },
          }),
        );
      }}
    >
      {t("powerMapCalloutLabel")}
    </button>
  );
}
