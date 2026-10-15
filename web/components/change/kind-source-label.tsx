"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { useDict, useT } from "@/components/i18n/use-t";
import { formatDateIn } from "@/lib/format";
import type { ChangeDisplayKind } from "@/lib/changes";
import { CHANGE_KIND_KEY, CHANGE_LABEL_TONE } from "./change-glyph";

/**
 * The kind word on a change row. When the change has a source, the word is
 * the source link (new tab). The chain-link icon is gone; the publisher and
 * retrieval date stay on the accessible name and the tooltip.
 */
export function KindSourceLabel({
  kind,
  href,
  publisher,
  retrieved,
}: {
  kind: ChangeDisplayKind;
  href?: string | null;
  publisher?: string | null;
  retrieved?: string | null;
}) {
  const t = useT("home");
  const common = useDict("common");
  const locale = useLocale();
  const kindText = t(CHANGE_KIND_KEY[kind]);
  const className = `relative inline-flex items-center text-xs font-semibold leading-4 ${CHANGE_LABEL_TONE[kind]} pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-3 pointer-coarse:after:content-['']`;
  if (!href) return <span className={className}>{kindText}</span>;
  const title = publisher || new URL(href).host;
  const sourceName = retrieved
    ? common("sourceIconLabelRetrieved", { title, date: formatDateIn(retrieved, locale, "long") })
    : common("sourceIconLabel", { title });
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${kindText}. ${sourceName}`}
      title={sourceName}
      className={`${className} underline-offset-2 hover:underline`}
    >
      {kindText}
    </a>
  );
}
