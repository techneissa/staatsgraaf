"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/use-t";
import type { MediaCreditInfo } from "@/lib/entity";
import { CreditPopover } from "./credit-text";

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
  logo: { large: "h-12 max-w-40 rounded-sm bg-white p-1", small: "h-9 max-w-36 rounded-xs bg-white p-1" },
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
  // Keyed by URL: after a client-side navigation a failed image of the previous page must not hide this one.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (failedUrl === url) return null;
  return (
    <img
      src={url}
      alt={t(kind === "logo" ? "logoAlt" : "emblemAlt", { name })}
      width={width ?? undefined}
      height={height ?? undefined}
      decoding="async"
      referrerPolicy={kind === "logo" ? "no-referrer" : undefined}
      onError={() => setFailedUrl(url)}
      className={`${SIZES[kind][small ? "small" : "large"]} w-auto shrink-0 object-contain ${className}`.trim()}
    />
  );
}

/**
 * Coat of arms next to the organisation name from `sm` up, with the (i) that
 * holds author, licence and source. On a phone the small emblem and (i) sit
 * in `OrgEmblemCredit` instead, so a long name keeps whole words.
 */
export function OrgEmblemTitle({ image, info }: { image: OrgEmblemImage; info: MediaCreditInfo }) {
  return (
    <span className="hidden sm:flex shrink-0 items-center gap-0.5">
      <OrgEmblem {...image} />
      <CreditPopover info={info} kind={image.kind === "logo" ? "logo" : "emblem"} />
    </span>
  );
}

/**
 * Emblem plus the (i) that holds the credit. A coat of arms sits here on a
 * phone and next to the name from `sm` up. A logo always sits here: it is a
 * wide wordmark that already carries the name, and next to the name it would
 * squeeze it. Without an image (a logo whose owner reserved copyright) the
 * (i) with the link to the logo stays. Author and licence live in the (i),
 * not as a visible line. A `div`, not a `p`: the (i) is a `details`, which
 * the HTML parser will not keep inside a paragraph.
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
    <div className={`flex min-w-0 items-center gap-1 text-xs text-ink-faint ${className}`.trim()}>
      {emblem !== null ? <OrgEmblem {...emblem} small className={kind === "logo" ? "mr-1" : "mr-1 sm:hidden"} /> : null}
      <CreditPopover info={info} kind={kind === "logo" ? "logo" : "emblem"} />
    </div>
  );
}
