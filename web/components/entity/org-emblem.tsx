"use client";

import { useT } from "@/components/i18n/use-t";
import type { MediaCreditInfo } from "@/lib/entity";
import { CreditPopover, CreditText } from "./credit-text";

/**
 * The coat of arms (or logo) of an organisation, next to its name on the
 * organisation page. Only files with a verified free licence are on record
 * (ADR 0029), and the credit with the licence stays visible under the name,
 * with the (i) for the author, licence and source page.
 */
export function OrgEmblem({
  name,
  url,
  width,
  height,
  className = "",
}: {
  name: string;
  url: string;
  width: number | null;
  height: number | null;
  className?: string;
}) {
  const t = useT("entity");
  return (
    <img
      src={url}
      alt={t("emblemAlt", { name })}
      width={width ?? undefined}
      height={height ?? undefined}
      decoding="async"
      className={`mt-1 h-10 w-auto max-w-12 shrink-0 object-contain sm:mt-0 sm:h-16 sm:max-w-20 ${className}`.trim()}
    />
  );
}

/** The visible credit line of an emblem with its (i). */
export function OrgEmblemCredit({ info, className = "" }: { info: MediaCreditInfo; className?: string }) {
  return (
    <p className={`flex min-w-0 items-center gap-1 text-xs text-ink-faint ${className}`.trim()}>
      <span className="min-w-0 break-words">
        <CreditText credit={info.credit} />
      </span>
      <CreditPopover info={info} kind="emblem" />
    </p>
  );
}
