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
  small = false,
  className = "",
}: {
  name: string;
  url: string;
  width: number | null;
  height: number | null;
  /** 40 px high (the phone credit line) instead of 64 px (next to the name). */
  small?: boolean;
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
      className={`${small ? "h-10 max-w-12" : "h-16 max-w-20"} w-auto shrink-0 object-contain ${className}`.trim()}
    />
  );
}

/**
 * The visible credit line of an emblem with its (i). On a phone the emblem
 * itself sits in this line, under the name, so a long name keeps whole words
 * next to the share button; from `sm` up it stands next to the name.
 */
export function OrgEmblemCredit({
  info,
  emblem,
  className = "",
}: {
  info: MediaCreditInfo;
  emblem: { name: string; url: string; width: number | null; height: number | null };
  className?: string;
}) {
  return (
    <p className={`flex min-w-0 items-center gap-1 text-xs text-ink-faint ${className}`.trim()}>
      <OrgEmblem {...emblem} small className="mr-1.5 sm:hidden" />
      <span className="min-w-0 break-words">
        <CreditText credit={info.credit} />
      </span>
      <CreditPopover info={info} kind="emblem" />
    </p>
  );
}
