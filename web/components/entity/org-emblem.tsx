"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/use-t";
import type { MediaCreditInfo } from "@/lib/entity";
import { CreditPopover, CreditText } from "./credit-text";

export type OrgEmblemImage = {
  name: string;
  url: string;
  width: number | null;
  height: number | null;
  /** "arms": a licensed coat of arms from media.json; "logo": the official logo loaded from the body's own site. */
  kind: "arms" | "logo";
};

const SIZES = {
  arms: { large: "h-16 max-w-20", small: "h-10 max-w-12" },
  // Official logos are drawn for a white page, so they sit on a white plate (dark theme too).
  logo: { large: "h-12 max-w-40 rounded-sm bg-white p-1", small: "h-8 max-w-28 rounded-xs bg-white p-0.5" },
};

/**
 * The coat of arms or logo of an organisation, next to its name on the
 * organisation page (ADR 0029). A coat of arms is a local file with a verified
 * free licence. A logo is loaded from the body's own website, without a
 * referrer, and never copied (amendment 1); when it fails to load (hotlink
 * protection, a moved file) the image is left out and the credit line stays.
 */
export function OrgEmblem({
  name,
  url,
  width,
  height,
  kind,
  small = false,
  className = "",
}: OrgEmblemImage & {
  /** The smaller size of the phone credit line instead of the size next to the name. */
  small?: boolean;
  className?: string;
}) {
  const t = useT("entity");
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={url}
      alt={t(kind === "logo" ? "logoAlt" : "emblemAlt", { name })}
      width={width ?? undefined}
      height={height ?? undefined}
      decoding="async"
      referrerPolicy={kind === "logo" ? "no-referrer" : undefined}
      onError={() => setFailed(true)}
      className={`${SIZES[kind][small ? "small" : "large"]} w-auto shrink-0 object-contain ${className}`.trim()}
    />
  );
}

/**
 * The visible credit line of an emblem with its (i). On a phone the emblem
 * itself sits in this line, under the name, so a long name keeps whole words
 * next to the share button; from `sm` up it stands next to the name. Without
 * an image (a logo whose owner reserved copyright) the line and the (i) with
 * the link to the logo stay.
 */
export function OrgEmblemCredit({
  info,
  emblem,
  kind,
  className = "",
}: {
  info: MediaCreditInfo;
  emblem: OrgEmblemImage | null;
  kind: "arms" | "logo";
  className?: string;
}) {
  return (
    <p className={`flex min-w-0 items-center gap-1 text-xs text-ink-faint ${className}`.trim()}>
      {emblem !== null ? <OrgEmblem {...emblem} small className="mr-1.5 sm:hidden" /> : null}
      <span className="min-w-0 break-words">
        <CreditText credit={info.credit} />
      </span>
      <CreditPopover info={info} kind={kind === "logo" ? "logo" : "emblem"} />
    </p>
  );
}
