"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/use-t";
import { useLocale } from "@/components/i18n/language-provider";
import { localizeCredit } from "@/lib/format";
import { avatarTint, initialsFor } from "@/lib/initials";
import { thumbUrl } from "@/lib/thumb";

/**
 * A round portrait, or a clean initials disc when no portrait is on record or
 * the image fails to load. The disc takes a soft tint of the party colour
 * (people) or branch colour, and neutral grey without one, so a profile
 * without a photo never looks broken. Decorative by default (`alt=""` next
 * to a visible name); pass `labelled` to give the image the translated
 * "Portrait of {name}" text.
 */
export function Avatar({
  name,
  url,
  color = null,
  size = 40,
  labelled = false,
  className = "",
  title,
}: {
  name: string;
  url?: string | null;
  color?: string | null;
  size?: number;
  labelled?: boolean;
  className?: string;
  title?: string;
}) {
  const t = useT("entity");
  const locale = useLocale();
  // Up to 96 px the small WebP copy serves; if it fails, the original, then the initials.
  const [failed, setFailed] = useState(false);
  const [original, setOriginal] = useState(false);
  const src = typeof url === "string" && size <= 96 && !original ? thumbUrl(url) : url;
  const imgRef = useRef<HTMLImageElement>(null);
  // An image that failed before hydration never fires onError in React; catch it here.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      if (src !== url) setOriginal(true);
      else setFailed(true);
    }
  }, [url, src]);
  const showImage = typeof url === "string" && url !== "" && !failed;
  const tint = avatarTint(showImage ? null : color);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill border ${className}`.trim()}
      style={{ width: size, height: size, ...tint }}
      title={title === undefined ? undefined : localizeCredit(title, locale)}
    >
      {showImage ? (
        <img
          ref={imgRef}
          src={src ?? undefined}
          alt={labelled ? t("personPortraitAlt", { name }) : ""}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => (src !== url ? setOriginal(true) : setFailed(true))}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden={labelled ? undefined : true}
          role={labelled ? "img" : undefined}
          aria-label={labelled ? t("personInitialsAlt", { name }) : undefined}
          className="select-none font-semibold leading-none tracking-wide text-ink"
          style={{ fontSize: Math.max(9, Math.round(size / 2.8)) }}
        >
          {initialsFor(name)}
        </span>
      )}
    </span>
  );
}
